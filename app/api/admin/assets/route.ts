import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS, type TeamMemberDoc, type UserAssetDoc } from "@/lib/schema";
import { resolveAssetIntegrationConfig } from "@/lib/asset-integrations/config";
import { pushAssetToProvider } from "@/lib/asset-integrations/sync";

const assetSchema = z.object({
  assetTag: z.string().trim().max(200).optional().default(""),
  assetType: z.string().trim().max(100).default("other"),
  assetName: z.string().trim().min(1).max(300),
  manufacturer: z.string().trim().max(200).optional().default(""),
  model: z.string().trim().max(200).optional().default(""),
  serialNumber: z.string().trim().max(200).optional().default(""),
  identifier: z.string().trim().max(200).optional().default(""),
  status: z.enum(["available", "active", "maintenance", "returned", "retired", "lost"]).default("available"),
  condition: z.enum(["new", "good", "fair", "damaged"]).optional().default("good"),
  assignedToTeamMemberId: z.string().trim().optional().default(""),
  phoneNumber: z.string().trim().max(100).optional().default(""),
  carrier: z.string().trim().max(200).optional().default(""),
  plan: z.string().trim().max(200).optional().default(""),
  imei: z.string().trim().max(100).optional().default(""),
  purchaseDate: z.string().trim().max(50).optional().default(""),
  purchaseCost: z.coerce.number().optional().default(0),
  warrantyExpiration: z.string().trim().max(50).optional().default(""),
  nextInspectionDate: z.string().trim().max(50).optional().default(""),
  notes: z.string().trim().max(10000).optional().default(""),
  syncProviders: z.boolean().optional().default(true),
});

function clean<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    const parsed = assetSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid asset payload", issues: parsed.error.issues }, { status: 400 });
    const input = parsed.data;
    const memberSnap = input.assignedToTeamMemberId ? await adminDb.collection(COLLECTIONS.TEAM_MEMBERS).doc(input.assignedToTeamMemberId).get() : null;
    const member = memberSnap?.exists ? ({ id: memberSnap.id, ...memberSnap.data() } as TeamMemberDoc) : null;
    const now = Timestamp.now();
    const ref = adminDb.collection(COLLECTIONS.USER_ASSETS).doc();
    const asset = clean({
      id: ref.id,
      ...input,
      identifier: input.identifier || input.serialNumber || input.assetTag,
      assignedToTeamMemberId: member?.id || "",
      assignedToName: member ? `${member.firstName} ${member.lastName}`.trim() : "Unassigned",
      assignedToEmail: member?.emailPrimary || "",
      assignedToUid: member?.firebaseUid || "",
      assignmentMatchStatus: member ? "matched" : "not_applicable",
      assignedByUid: actor.uid,
      assignedByName: actor.email,
      assignedAt: now,
      createdAt: now,
      updatedAt: now,
    }) as unknown as UserAssetDoc;
    await ref.set(asset);
    await adminDb.collection(COLLECTIONS.ASSET_HISTORY).add({
      assetId: ref.id,
      action: member ? "assigned" : "created",
      teamMemberId: member?.id || "",
      teamMemberName: member ? `${member.firstName} ${member.lastName}`.trim() : "Unassigned",
      toTeamMemberId: member?.id || "",
      toTeamMemberName: member ? `${member.firstName} ${member.lastName}`.trim() : "Unassigned",
      performedByUid: actor.uid,
      performedByName: actor.email,
      createdAt: now,
    });

    const providerResults = [];
    if (input.syncProviders) {
      const config = await resolveAssetIntegrationConfig();
      for (const provider of ["jamf", "ninjaOne"] as const) {
        if ((provider === "jamf" && config.jamf.enabled) || (provider === "ninjaOne" && config.ninjaOne.enabled)) {
          providerResults.push(await pushAssetToProvider(asset, provider, config, { uid: actor.uid, name: actor.email }, true));
        }
      }
    }
    return NextResponse.json({ ok: true, asset, providerResults }, { status: 201 });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Asset create error:", error);
    return NextResponse.json({ error: "Unable to create asset" }, { status: 500 });
  }
}
