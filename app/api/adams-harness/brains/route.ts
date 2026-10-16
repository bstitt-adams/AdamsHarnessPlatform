import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireAdmin,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  getDb,
  HttpError,
  httpErrorResponse,
  isAdminActor,
  serializeDoc,
  canAccessDepartment,
  writeAuditLog,
  assertValidMemberIds,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";
import {
  brainInputSchema,
  type BrainDoc,
  type DepartmentDoc,
} from "@/lib/adams-harness/types";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    const db = getDb();
    const snap = await db
      .collection(COLLECTIONS.ADAMS_BRAINS)
      .limit(200)
      .get();
    const brains = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as BrainDoc,
    );
    if (isAdminActor(actor)) {
      return Response.json({ brains: brains.map(serializeDoc) });
    }
    const activeBrains = brains.filter((b) => b.isActive);
    const ids = [actor.uid, actor.teamMemberId].filter(
      (v): v is string => typeof v === "string",
    );
    const departmentIds = [
      ...new Set(activeBrains.map((b) => b.departmentId)),
    ];
    const deptSnaps = departmentIds.length
      ? await db.getAll(
          ...departmentIds.map((id) =>
            db.collection(COLLECTIONS.DEPARTMENTS).doc(id),
          ),
        )
      : [];
    const departments = new Map<string, DepartmentDoc>();
    for (const s of deptSnaps) {
      if (s.exists) {
        departments.set(s.id, { id: s.id, ...s.data() } as DepartmentDoc);
      }
    }
    const visible = activeBrains.filter((b) => {
      if (b.ownerIds.some((id) => ids.includes(id))) return true;
      const dept = departments.get(b.departmentId);
      const inDepartment =
        actor.departmentIds.includes(b.departmentId) ||
        (dept ? canAccessDepartment(actor, dept) : false);
      if (!inDepartment) return false;
      return b.audience === "department";
    });
    return Response.json({ brains: visible.map(serializeDoc) });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Brains list error:", error);
    return Response.json({ error: "Failed to load brains." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    const parsed = brainInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Invalid brain input");
    }
    const db = getDb();
    const deptSnap = await db
      .collection(COLLECTIONS.DEPARTMENTS)
      .doc(parsed.data.departmentId)
      .get();
    if (!deptSnap.exists) {
      throw new HttpError(400, "Unknown department");
    }
    const department = { id: deptSnap.id, ...deptSnap.data() } as DepartmentDoc;
    await assertValidMemberIds(parsed.data.ownerIds);
    const deptMembers = new Set([
      ...department.ownerIds,
      ...department.memberIds,
    ]);
    if (parsed.data.ownerIds.some((id) => !deptMembers.has(id))) {
      throw new HttpError(400, "Brain owners must belong to the department");
    }

    const ref = db.collection(COLLECTIONS.ADAMS_BRAINS).doc();
    const now = new Date() as unknown as BrainDoc["createdAt"];
    const defaultApiKey =
      parsed.data.gbrainRepo?.apiKey ||
      `gbrain_${ref.id.slice(0, 8)}_${Math.random().toString(36).slice(2, 18)}`;
    const brain: BrainDoc = {
      id: ref.id,
      name: parsed.data.name,
      description: parsed.data.description,
      departmentId: parsed.data.departmentId,
      ownerIds: parsed.data.ownerIds,
      audience: parsed.data.audience,
      isActive: parsed.data.isActive,
      gbrainRepo: {
        enabled: parsed.data.gbrainRepo?.enabled ?? true,
        githubRepo: parsed.data.gbrainRepo?.githubRepo ?? "bstitt-adams/AdamsHarnessPlatform",
        branch: parsed.data.gbrainRepo?.branch ?? "main",
        basePath: parsed.data.gbrainRepo?.basePath ?? `gbrain/${parsed.data.departmentId}`,
        hermesWorkspacePath: parsed.data.gbrainRepo?.hermesWorkspacePath ?? "",
        apiKey: defaultApiKey,
      },
      createdByUid: actor.uid,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(brain);
    await writeAuditLog({
      entityType: "brain",
      entityId: brain.id,
      action: "create",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: { departmentId: brain.departmentId, audience: brain.audience },
    });
    return Response.json({ brain: serializeDoc(brain) }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Brain create error:", error);
    return Response.json({ error: "Failed to create brain." }, { status: 500 });
  }
}
