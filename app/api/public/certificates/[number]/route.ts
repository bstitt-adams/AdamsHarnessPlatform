import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { isRateLimited } from "@/lib/adams-harness/rate-limit";

/** GET — public certificate verification. Returns only the fields needed to verify authenticity. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  if (isRateLimited(`cert-verify:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
  const { number } = await params;
  const value = decodeURIComponent(number).trim().slice(0, 100);
  if (!value) return NextResponse.json({ valid: false }, { status: 400 });

  const snap = await adminDb.collection("lms_certificates").where("certificateNumber", "==", value).limit(1).get();
  if (snap.empty) return NextResponse.json({ valid: false }, { status: 404 });
  const c = snap.docs[0].data() as { title?: string; recipientName?: string; certificateType?: string; issuedAt?: { toDate?: () => Date }; expiresAt?: { toDate?: () => Date } | null };
  return NextResponse.json({
    valid: true,
    certificate: {
      certificateNumber: value,
      title: c.title || "",
      recipientName: c.recipientName || "",
      certificateType: c.certificateType || "course",
      issuedAt: c.issuedAt?.toDate?.()?.toISOString() ?? null,
      expiresAt: c.expiresAt?.toDate?.()?.toISOString() ?? null,
    },
  });
}
