import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiAuthError, authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { httpErrorResponse, serializeDoc } from "@/lib/adams-harness/server-store";
import { getCodeForRecord, issueHardhatQrCode, persistQrDetailsToRecord } from "@/lib/hardhat-qr";
import { COLLECTIONS, type HardhatQrCodeDoc, type TeamMemberDoc } from "@/lib/schema";

const issueSchema = z.strictObject({
  teamMemberId: z.string().trim().min(1).max(200),
  moduleSlug: z.string().trim().max(200).optional(),
  moduleRecordId: z.string().trim().max(200).optional(),
  hardhatAssetId: z.string().trim().max(200).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    const recordId = request.nextUrl.searchParams.get("recordId")?.trim();
    const teamMemberId = request.nextUrl.searchParams.get("teamMemberId")?.trim();
    if (!recordId && !teamMemberId) {
      return NextResponse.json({ error: "recordId or teamMemberId is required" }, { status: 400 });
    }

    let code: HardhatQrCodeDoc | null = null;
    if (recordId) {
      code = await getCodeForRecord(recordId);
    } else if (teamMemberId) {
      const snap = await adminDb
        .collection(COLLECTIONS.HARDHAT_QR_CODES)
        .where("teamMemberId", "==", teamMemberId)
        .get();
      code = snap.docs
        .map((item) => ({ id: item.id, ...item.data() }) as HardhatQrCodeDoc)
        .sort((a, b) => b.tokenVersion - a.tokenVersion)[0] || null;
    }
    return NextResponse.json({ code: code ? serializeDoc(code) : null });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Hardhat QR lookup error:", error);
    return NextResponse.json({ error: "Unable to load hardhat QR code" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    const parsed = issueSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid hardhat QR request" }, { status: 400 });
    }

    const memberSnap = await adminDb.collection(COLLECTIONS.TEAM_MEMBERS).doc(parsed.data.teamMemberId).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Team Member not found" }, { status: 404 });
    }
    const member = { id: memberSnap.id, ...memberSnap.data() } as TeamMemberDoc;
    const code = await issueHardhatQrCode({
      member,
      actor,
      moduleSlug: parsed.data.moduleSlug,
      moduleRecordId: parsed.data.moduleRecordId,
      hardhatAssetId: parsed.data.hardhatAssetId,
    });
    await persistQrDetailsToRecord(code);
    return NextResponse.json({ code: serializeDoc(code) });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Hardhat QR issue error:", error);
    return NextResponse.json({ error: "Unable to issue hardhat QR code" }, { status: 500 });
  }
}
