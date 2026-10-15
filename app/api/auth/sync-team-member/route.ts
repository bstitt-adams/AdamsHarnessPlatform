import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/schema";

function bearerToken(request: NextRequest): string | null {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] || null;
}

export async function POST(request: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
    }
    const token = bearerToken(request);
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const email = typeof decoded.email === "string" ? decoded.email.toLowerCase() : "";
    const teamMembers = adminDb.collection(COLLECTIONS.TEAM_MEMBERS);

    let snapshot = await teamMembers.where("firebaseUid", "==", uid).limit(1).get();
    if (snapshot.empty) snapshot = await teamMembers.where("authUid", "==", uid).limit(1).get();
    if (snapshot.empty && email) snapshot = await teamMembers.where("emailPrimary", "==", email).limit(1).get();
    if (snapshot.empty) {
      return NextResponse.json({ linked: false, role: "client" });
    }

    const teamMemberDoc = snapshot.docs[0];
    const teamMember = teamMemberDoc.data();
    const role = typeof teamMember.role === "string" ? teamMember.role : "client";
    await Promise.all([
      teamMemberDoc.ref.set({ firebaseUid: uid, updatedAt: new Date() }, { merge: true }),
      adminDb.collection(COLLECTIONS.USERS).doc(uid).set({
        id: uid,
        email,
        role,
        teamMemberId: teamMemberDoc.id,
        isSuperAdmin: role === "superadmin",
        updatedAt: new Date(),
      }, { merge: true }),
    ]);

    return NextResponse.json({ linked: true, role, teamMemberId: teamMemberDoc.id });
  } catch (error) {
    console.error("Team Member role sync error:", error);
    return NextResponse.json({ error: "Unable to synchronize Team Member role" }, { status: 500 });
  }
}
