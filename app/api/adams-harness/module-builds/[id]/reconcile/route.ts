import { NextRequest } from "next/server";
import { COLLECTIONS } from "@/lib/schema";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  getDb,
  HttpError,
  isAdminActor,
  isDepartmentOwner,
} from "@/lib/adams-harness/server-store";
import { DepartmentDoc } from "@/lib/adams-harness/types";
import {
  buildErrorResponse,
  loadModuleBuild,
  reconcileModuleBuild,
  serializeModuleBuild,
} from "@/lib/adams-harness/module-builds";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const db = getDb();
    const build = await loadModuleBuild(id);
    if (!build) throw new HttpError(404, "Module build not found.");

    const deptSnap = await db
      .collection(COLLECTIONS.DEPARTMENTS)
      .doc(build.departmentId)
      .get();
    const department = deptSnap.exists
      ? ({ id: deptSnap.id, ...deptSnap.data() } as DepartmentDoc)
      : null;
    const canReconcile = department
      ? isDepartmentOwner(actor, department)
      : isAdminActor(actor);
    if (!canReconcile) throw new ApiAuthError(403, "Not authorized.");

    const result = await reconcileModuleBuild(id);
    return Response.json({ build: serializeModuleBuild(result) });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const response = buildErrorResponse(error);
    if (response) return response;
    console.error("Reconcile module build error:", error);
    return Response.json({ error: "Reconcile failed." }, { status: 500 });
  }
}
