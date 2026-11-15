import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";
import type { AuthenticatedActor } from "@/lib/auth/server-auth";

/**
 * True when the actor is an admin/superadmin or a member of the Safety
 * workforce department. Central so the worker emergency endpoint and Safety
 * Request Box triage enforce the same gate.
 */
export async function isSafetyActor(actor: AuthenticatedActor): Promise<boolean> {
  if (actor.role === "admin" || actor.role === "superadmin") return true;
  if (!adminDb || !actor.teamMemberId) return false;
  const snap = await adminDb.collection(COLLECTIONS.TEAM_MEMBERS).doc(actor.teamMemberId).get();
  if (!snap.exists) return false;
  const member = snap.data() as TeamMemberDoc;
  return member.workforceDepartmentName === "Safety";
}
