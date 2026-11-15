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
      // No filter → list every QR code with its Team Member for the admin console.
      const [codesSnap, membersSnap] = await Promise.all([
        adminDb.collection(COLLECTIONS.HARDHAT_QR_CODES).orderBy("updatedAt", "desc").limit(500).get(),
        adminDb.collection(COLLECTIONS.TEAM_MEMBERS).get(),
      ]);
      const memberName = (m: TeamMemberDoc) => [m.firstName, m.lastName].filter(Boolean).join(" ") || m.emailPrimary || m.id;
      const members = new Map(membersSnap.docs.map((d) => [d.id, d.data() as TeamMemberDoc]));
      const codes = codesSnap.docs.map((d) => {
        const code = { id: d.id, ...d.data() } as HardhatQrCodeDoc;
        const member = members.get(code.teamMemberId);
        return {
          ...serializeDoc(code),
          teamMemberName: member ? memberName(member) : code.teamMemberName || "Unknown member",
          teamMemberEmail: member?.emailPrimary || "",
        };
      });
      const memberList = membersSnap.docs
        .map((d) => {
          const m = d.data() as TeamMemberDoc;
          return { id: d.id, name: memberName(m), email: m.emailPrimary, missionCritical: m.missionCritical === true };
        })
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      return NextResponse.json({ codes, members: memberList });
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
