import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/adams-harness/rate-limit";
import { getDb, httpErrorResponse, HttpError } from "@/lib/adams-harness/server-store";
import { hashScanIp, incrementQrScan, writeHardhatQrEvent } from "@/lib/hardhat-qr";
import {
  COLLECTIONS,
  type HardhatQrCodeDoc,
  type TeamMemberDoc,
  type UserTrainingCertDoc,
} from "@/lib/schema";

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "anonymous";
}

function formatDate(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * GET /api/public/worker/[id]
 * Public, rate-limited hardhat QR scan payload. This intentionally returns only
 * non-sensitive identification and certification fields; no HR/contact data or
 * certification artifacts are exposed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (isRateLimited(`public-worker:${clientKey(request)}`, 60, 60_000)) {
      throw new HttpError(429, "Too many requests. Please try again shortly.");
    }

    const { id } = await params;
    const codeId = id.trim();
    if (!codeId || codeId.length > 200) {
      return NextResponse.json({ error: "Invalid worker code" }, { status: 400 });
    }

    const db = getDb();
    const codeSnap = await db.collection(COLLECTIONS.HARDHAT_QR_CODES).doc(codeId).get();
    if (!codeSnap.exists) {
      return NextResponse.json({ error: "QR code is invalid or no longer active" }, { status: 404 });
    }
    const code = { id: codeSnap.id, ...codeSnap.data() } as HardhatQrCodeDoc;
    if (code.status !== "active") {
      return NextResponse.json({ error: "QR code is inactive or has been revoked" }, { status: 410 });
    }

    const memberSnap = await db.collection(COLLECTIONS.TEAM_MEMBERS).doc(code.teamMemberId).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const member = { id: memberSnap.id, ...memberSnap.data() } as TeamMemberDoc;
    const forwarded = request.headers.get("x-forwarded-for") || "";
    const ipHash = hashScanIp(forwarded.split(",")[0]?.trim() || "");
    const userAgent = request.headers.get("user-agent") || "";
    try {
      await Promise.all([
        incrementQrScan(code.id),
        writeHardhatQrEvent(code, "scanned", {
          actorType: "public_scan",
          ipHash,
          userAgent,
        }),
      ]);
    } catch (scanError) {
      console.error("Hardhat QR scan audit failed:", scanError);
    }
    const certificationsSnap = await db
      .collection(COLLECTIONS.USER_TRAINING_CERTS)
      .where("teamMemberId", "==", member.id)
      .get();

    const certifications = certificationsSnap.docs
      .map((certDoc) => ({ id: certDoc.id, ...certDoc.data() }) as UserTrainingCertDoc)
      .map((cert) => ({
        id: cert.id,
        title: cert.trainingTitle,
        category: cert.trainingCategory,
        issuingOrganization: cert.issuingOrganization,
        completionDate: formatDate(cert.completionDate),
        expirationDate: formatDate(cert.expirationDate),
        trainingHours: cert.trainingHours || 0,
      }))
      .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));

    return NextResponse.json({
      worker: {
        id: member.id,
        name: [member.firstName, member.middleName, member.lastName].filter(Boolean).join(" "),
        title: member.title || member.jobTitleRaw || "Team Member",
        status: member.status,
        company: member.company || "Adams Electric",
        workforceDepartment: member.workforceDepartmentName || "",
        businessUnits: member.businessUnitNames || [],
        avatar: member.avatar || "",
      },
      certifications,
    });
  } catch (error) {
    const response = httpErrorResponse(error);
    if (response) return response;
    console.error("Public worker scan error:", error);
    return NextResponse.json({ error: "Unable to load worker" }, { status: 500 });
  }
}
