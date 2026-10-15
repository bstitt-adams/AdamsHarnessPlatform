import type { AuthenticatedActor } from "@/lib/auth/server-auth";
import {
  canAccessDepartment,
  getDb,
  isAdminActor,
  isDepartmentOwner,
  HttpError,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";
import type { BrainDoc, DepartmentDoc } from "@/lib/adams-harness/types";

export interface BrainAccess {
  brain: BrainDoc;
  canQuery: boolean;
  canManage: boolean;
}

function isBrainOwner(actor: AuthenticatedActor, brain: BrainDoc): boolean {
  const ids = [actor.uid, actor.teamMemberId].filter(
    (v): v is string => typeof v === "string",
  );
  return brain.ownerIds.some((id) => ids.includes(id));
}

export async function getBrainForActor(
  actor: AuthenticatedActor,
  brainId: string,
): Promise<BrainAccess> {
  const snap = await getDb()
    .collection(COLLECTIONS.ADAMS_BRAINS)
    .doc(brainId)
    .get();
  if (!snap.exists) {
    throw new HttpError(404, "Brain not found");
  }
  const brain = { id: snap.id, ...snap.data() } as BrainDoc;
  const admin = isAdminActor(actor);
  if (!brain.isActive && !admin) {
    throw new HttpError(404, "Brain not found");
  }
  const brainOwner = isBrainOwner(actor, brain);

  let department: DepartmentDoc | null = null;
  let departmentAccess = false;
  let departmentOwner = false;
  if (!admin && !brainOwner) {
    const deptSnap = await getDb()
      .collection(COLLECTIONS.DEPARTMENTS)
      .doc(brain.departmentId)
      .get();
    if (deptSnap.exists) {
      department = { id: deptSnap.id, ...deptSnap.data() } as DepartmentDoc;
      departmentAccess =
        actor.departmentIds.includes(brain.departmentId) ||
        canAccessDepartment(actor, department);
      departmentOwner = isDepartmentOwner(actor, department);
    }
  }

  const canManage = admin || brainOwner || departmentOwner;
  const canQuery =
    canManage ||
    (brain.audience === "department" && departmentAccess);

  if (!canQuery && !canManage) {
    throw new HttpError(403, "Not authorized for this brain");
  }
  return { brain, canQuery, canManage };
}
