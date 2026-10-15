import { adminDb } from "@/lib/firebase-admin";
import { ApiAuthError, type AuthenticatedActor } from "@/lib/auth/server-auth";
import type {
  AdamsAuditLogDoc,
  DepartmentDoc,
  ProcessInterviewDoc,
} from "./types";
import { COLLECTIONS } from "@/lib/schema";

export function getDb() {
  if (!adminDb) {
    throw new ApiAuthError(503, "Database service unavailable");
  }
  return adminDb;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function httpErrorResponse(error: unknown): Response | null {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return null;
}

function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const maybeTs = value as { toDate?: () => Date };
    if (typeof maybeTs.toDate === "function") {
      return maybeTs.toDate().toISOString();
    }
    if (Array.isArray(value)) {
      return value.map(serializeValue);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeValue(v);
    }
    return out;
  }
  return value;
}

export function serializeDoc<T extends object>(doc: T): T {
  return serializeValue(doc) as T;
}

export function isAdminActor(actor: AuthenticatedActor): boolean {
  return actor.role === "superadmin" || actor.role === "admin";
}

function actorIds(actor: AuthenticatedActor): string[] {
  return [actor.uid, actor.teamMemberId].filter(
    (v): v is string => typeof v === "string",
  );
}

export function canAccessDepartment(
  actor: AuthenticatedActor,
  department: DepartmentDoc,
): boolean {
  if (isAdminActor(actor)) return true;
  if (actor.departmentIds.includes(department.id)) return true;
  const ids = actorIds(actor);
  return (
    department.ownerIds.some((id) => ids.includes(id)) ||
    department.memberIds.some((id) => ids.includes(id))
  );
}

export function isDepartmentOwner(
  actor: AuthenticatedActor,
  department: DepartmentDoc,
): boolean {
  if (isAdminActor(actor)) return true;
  const ids = actorIds(actor);
  return department.ownerIds.some((id) => ids.includes(id));
}

export function canAccessInterview(
  actor: AuthenticatedActor,
  interview: ProcessInterviewDoc,
  department?: DepartmentDoc | null,
): boolean {
  if (isAdminActor(actor)) return true;
  if (interview.createdByUid === actor.uid) return true;
  if (actor.departmentIds.includes(interview.departmentId)) return true;
  if (department && isDepartmentOwner(actor, department)) return true;
  return false;
}

export type InterviewCapabilities = {
  isOwner: boolean;
  canApprove: boolean;
  canRevise: boolean;
};

export function interviewCapabilities(
  actor: AuthenticatedActor,
  interview: ProcessInterviewDoc,
  department: DepartmentDoc | null,
): InterviewCapabilities {
  const isOwner = interview.createdByUid === actor.uid;
  const canApprove = department
    ? isDepartmentOwner(actor, department)
    : isAdminActor(actor);
  return { isOwner, canApprove, canRevise: isOwner || canApprove };
}

export async function assertValidMemberIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = getDb();
  const refs = ids.map((id) => db.collection(COLLECTIONS.TEAM_MEMBERS).doc(id));
  const snaps = await db.getAll(...refs);
  for (const snap of snaps) {
    if (!snap.exists || snap.data()?.status !== "active") {
      throw new HttpError(400, "Owner/member IDs must reference active team members");
    }
  }
}

export async function assertUniqueDepartmentCode(
  code: string,
  excludeId?: string,
): Promise<void> {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTIONS.DEPARTMENTS)
    .where("code", "==", code)
    .get();
  const conflict = snapshot.docs.find((d) => d.id !== excludeId);
  if (conflict) {
    throw new HttpError(409, "Department code already in use");
  }
}

export async function enqueueMemberDepartmentSync(
  batch: FirebaseFirestore.WriteBatch,
  departmentId: string,
  previousMemberIds: string[],
  nextMemberIds: string[],
): Promise<void> {
  const added = nextMemberIds.filter((id) => !previousMemberIds.includes(id));
  const removed = previousMemberIds.filter((id) => !nextMemberIds.includes(id));
  if (added.length === 0 && removed.length === 0) return;

  const db = getDb();
  for (const memberId of added) {
    const ref = db.collection(COLLECTIONS.TEAM_MEMBERS).doc(memberId);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const existing = Array.isArray(snap.data()?.departmentIds)
      ? (snap.data()!.departmentIds as string[])
      : [];
    if (!existing.includes(departmentId)) {
      batch.update(ref, { departmentIds: [...existing, departmentId] });
    }
  }
  for (const memberId of removed) {
    const ref = db.collection(COLLECTIONS.TEAM_MEMBERS).doc(memberId);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const existing = Array.isArray(snap.data()?.departmentIds)
      ? (snap.data()!.departmentIds as string[])
      : [];
    if (existing.includes(departmentId)) {
      batch.update(ref, {
        departmentIds: existing.filter((d) => d !== departmentId),
      });
    }
  }
}

export async function writeAuditLog(entry: {
  entityType: AdamsAuditLogDoc["entityType"];
  entityId: string;
  action: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  detail?: AdamsAuditLogDoc["detail"];
}): Promise<void> {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.ADAMS_AUDIT_LOGS).doc();
  await ref.set({
    ...entry,
    id: ref.id,
    createdAt: new Date(),
  });
}
