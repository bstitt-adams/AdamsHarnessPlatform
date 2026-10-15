import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth/server-auth";
import { COLLECTIONS } from "@/lib/schema";

/**
 * POST /api/admin/team-members/sync-auth
 *
 * Links Firebase Authentication users to Team Member documents by matching email.
 * Only admins can run this.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);

    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin not initialized" },
        { status: 503 },
      );
    }

    const teamMembersSnap = await adminDb.collection(COLLECTIONS.TEAM_MEMBERS).get();
    const membersByEmail: Record<string, { id: string; email: string; firebaseUid?: string }> = {};
    teamMembersSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const email = (data.emailPrimary || "").trim().toLowerCase();
      if (email) {
        membersByEmail[email] = { id: docSnap.id, email, firebaseUid: data.firebaseUid };
      }
    });

    let matched = 0;
    let alreadyLinked = 0;
    let unmatched = 0;
    const unmatchedEmails: string[] = [];

    const listUsers = async (nextPageToken?: string) => {
      const result = await adminAuth!.listUsers(1000, nextPageToken);
      for (const user of result.users) {
        const email = (user.email || "").trim().toLowerCase();
        if (!email || !membersByEmail[email]) {
          if (email) unmatchedEmails.push(email);
          unmatched++;
          continue;
        }
        const member = membersByEmail[email];
        if (member.firebaseUid === user.uid) {
          alreadyLinked++;
          continue;
        }
        await adminDb!
          .collection(COLLECTIONS.TEAM_MEMBERS)
          .doc(member.id)
          .update({
            firebaseUid: user.uid,
            authLinked: true,
            authLinkedAt: new Date(),
            updatedAt: new Date(),
          });
        matched++;
      }
      if (result.pageToken) {
        await listUsers(result.pageToken);
      }
    };

    await listUsers();

    return NextResponse.json({
      success: true,
      matched,
      alreadyLinked,
      unmatched,
      unmatchedEmails: unmatchedEmails.slice(0, 50),
      actor: { uid: actor.uid, email: actor.email, role: actor.role },
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Sync auth users error:", error);
    return NextResponse.json(
      { error: "Failed to sync auth users" },
      { status: 500 },
    );
  }
}
