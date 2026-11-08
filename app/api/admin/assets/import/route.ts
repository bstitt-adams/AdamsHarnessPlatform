import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS, type TeamMemberDoc, type UserAssetDoc } from "@/lib/schema";
import { normalizeKey } from "@/lib/asset-integrations/mapper";

const rowSchema = z.object({
  assetTag: z.string().optional().default(""),
  assetType: z.string().optional().default("other"),
  assetName: z.string().min(1),
  manufacturer: z.string().optional().default(""),
  model: z.string().optional().default(""),
  serialNumber: z.string().optional().default(""),
  identifier: z.string().optional().default(""),
  status: z.enum(["available", "active", "maintenance", "returned", "retired", "lost"]).optional().default("available"),
  condition: z.string().optional().default("good"),
  assignedToEmail: z.string().optional().default(""),
  phoneNumber: z.string().optional().default(""),
  carrier: z.string().optional().default(""),
  plan: z.string().optional().default(""),
  imei: z.string().optional().default(""),
  purchaseDate: z.string().optional().default(""),
  purchaseCost: z.coerce.number().optional().default(0),
  warrantyExpiration: z.string().optional().default(""),
  nextInspectionDate: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

const importSchema = z.object({ rows: z.array(rowSchema).min(1).max(1000), syncProviders: z.boolean().default(false) });

function clean<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    const parsed = importSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid asset import payload" }, { status: 400 });
    const [assetsSnap, membersSnap] = await Promise.all([
      adminDb.collection(COLLECTIONS.USER_ASSETS).get(),
      adminDb.collection(COLLECTIONS.TEAM_MEMBERS).get(),
    ]);
    const existing = new Map<string, string>();
    for (const snap of assetsSnap.docs) {
      const asset = snap.data() as UserAssetDoc;
      for (const key of [asset.assetTag, asset.serialNumber, asset.identifier]) {
        const normalized = normalizeKey(key);
        if (normalized) existing.set(normalized, snap.id);
      }
    }
    const members = membersSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as TeamMemberDoc);
    let imported = 0;
    let created = 0;
    let updated = 0;
    for (const row of parsed.data.rows) {
      const member = members.find((item) => normalizeKey(item.emailPrimary) === normalizeKey(row.assignedToEmail));
      const keys = [row.assetTag, row.serialNumber, row.identifier].map(normalizeKey).filter(Boolean);
      const existingId = keys.map((key) => existing.get(key)).find(Boolean);
      const ref = existingId ? adminDb.collection(COLLECTIONS.USER_ASSETS).doc(existingId) : adminDb.collection(COLLECTIONS.USER_ASSETS).doc();
      const now = Timestamp.now();
      await ref.set(clean({
        id: ref.id,
        assetTag: row.assetTag,
        assetType: row.assetType || "other",
        assetName: row.assetName,
        manufacturer: row.manufacturer,
        model: row.model,
        serialNumber: row.serialNumber,
        identifier: row.identifier || row.serialNumber || row.assetTag,
        status: member ? "active" : row.status,
        condition: row.condition,
        assignedToTeamMemberId: member?.id || "",
        assignedToName: member ? `${member.firstName} ${member.lastName}`.trim() : "Unassigned",
        assignedToEmail: member?.emailPrimary || row.assignedToEmail,
        assignedToUid: member?.firebaseUid || "",
        phoneNumber: row.phoneNumber,
        carrier: row.carrier,
        plan: row.plan,
        imei: row.imei,
        purchaseDate: row.purchaseDate,
        purchaseCost: row.purchaseCost,
        warrantyExpiration: row.warrantyExpiration,
        nextInspectionDate: row.nextInspectionDate,
        notes: row.notes,
        assignedByUid: actor.uid,
        assignedByName: actor.email,
        assignedAt: now,
        ...(existingId ? {} : { createdAt: now }),
        updatedAt: now,
      }), { merge: true });
      imported++;
      existingId ? updated++ : created++;
      keys.forEach((key) => existing.set(key, ref.id));
    }
    return NextResponse.json({ ok: true, imported, created, updated });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Asset import error:", error);
    return NextResponse.json({ error: "Unable to import assets" }, { status: 500 });
  }
}
