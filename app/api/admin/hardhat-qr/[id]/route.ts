import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { ApiAuthError, authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { httpErrorResponse, serializeDoc } from "@/lib/adams-harness/server-store";
import {
  issueHardhatQrCode,
  persistQrDetailsToRecord,
  writeHardhatQrEvent,
} from "@/lib/hardhat-qr";
import {
  COLLECTIONS,
  type HardhatQrCodeDoc,
  type HardhatQrStatus,
  type TeamMemberDoc,
} from "@/lib/schema";

const actionSchema = z.strictObject({
  action: z.enum(["activate", "deactivate", "revoke", "rotate", "printed"]),
  reason: z.string().trim().max(500).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    const { id } = await params;
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid hardhat QR action" }, { status: 400 });
    }

    const ref = adminDb.collection(COLLECTIONS.HARDHAT_QR_CODES).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Hardhat QR code not found" }, { status: 404 });
    }
    const code = { id: snap.id, ...snap.data() } as HardhatQrCodeDoc;
    const now = Timestamp.now();

    if (parsed.data.action === "rotate") {
      if (code.status === "revoked") {
        return NextResponse.json({ error: "A revoked QR code cannot be rotated" }, { status: 400 });
      }
      const memberSnap = await adminDb.collection(COLLECTIONS.TEAM_MEMBERS).doc(code.teamMemberId).get();
      if (!memberSnap.exists) {
        return NextResponse.json({ error: "Team Member not found" }, { status: 404 });
      }
      const member = { id: memberSnap.id, ...memberSnap.data() } as TeamMemberDoc;
      const nextCode = await issueHardhatQrCode({
        member,
        actor,
        moduleSlug: code.moduleSlug,
        moduleRecordId: code.moduleRecordId,
        hardhatAssetId: code.hardhatAssetId,
      });
      await writeHardhatQrEvent(nextCode, "rotated", {
        actor,
        metadata: { previousCodeId: code.id },
      });
      await persistQrDetailsToRecord(nextCode);
      return NextResponse.json({ code: serializeDoc(nextCode) });
    }

    if (parsed.data.action === "printed") {
      await ref.update({
        printCount: FieldValue.increment(1),
        lastPrintedAt: now,
        lastPrintedByUid: actor.uid,
        lastPrintedByName: actor.email || "Admin",
        updatedAt: now,
      });
      await writeHardhatQrEvent(code, "printed", { actor });
      return NextResponse.json({
        code: serializeDoc({
          ...code,
          printCount: code.printCount + 1,
          lastPrintedAt: now,
          lastPrintedByUid: actor.uid,
          lastPrintedByName: actor.email || "Admin",
          updatedAt: now,
        }),
      });
    }

    const status: HardhatQrStatus =
      parsed.data.action === "activate"
        ? "active"
        : parsed.data.action === "deactivate"
          ? "inactive"
          : "revoked";
    if (code.status === status) {
      return NextResponse.json({ code: serializeDoc(code) });
    }
    if (code.status === "revoked" && status !== "revoked") {
      return NextResponse.json({ error: "Revoked QR codes cannot be reactivated; issue a new code" }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      status,
      updatedAt: now,
      ...(status === "active" ? { activatedAt: now } : {}),
      ...(status === "inactive" ? { deactivatedAt: now } : {}),
      ...(status === "revoked"
        ? {
            revokedAt: now,
            revokedByUid: actor.uid,
            revokedByName: actor.email || "Admin",
            revokeReason: parsed.data.reason || "revoked_by_admin",
          }
        : {}),
    };
    await ref.update(update);
    const nextCode = { ...code, ...update } as HardhatQrCodeDoc;
    await writeHardhatQrEvent(nextCode, parsed.data.action === "deactivate" ? "deactivated" : parsed.data.action === "activate" ? "activated" : "revoked", {
      actor,
      ...(parsed.data.reason ? { metadata: { reason: parsed.data.reason } } : {}),
    });
    await persistQrDetailsToRecord(nextCode);
    return NextResponse.json({ code: serializeDoc(nextCode) });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Hardhat QR action error:", error);
    return NextResponse.json({ error: "Unable to update hardhat QR code" }, { status: 500 });
  }
}
