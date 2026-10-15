import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  canAccessDepartment,
  getDb,
  isAdminActor,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";
import type { DepartmentDoc } from "@/lib/adams-harness/types";
import { GENERATED_MODULES } from "@/modules/generated/registry";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    let modules = GENERATED_MODULES;
    if (!isAdminActor(actor)) {
      const visible = new Set(actor.departmentIds);
      const missing = modules
        .map((m) => m.departmentId)
        .filter((id) => !visible.has(id));
      if (missing.length > 0) {
        const db = getDb();
        const snaps = await db.getAll(
          ...missing.map((id) => db.collection(COLLECTIONS.DEPARTMENTS).doc(id)),
        );
        for (const snap of snaps) {
          if (!snap.exists) continue;
          const department = { id: snap.id, ...snap.data() } as DepartmentDoc;
          if (canAccessDepartment(actor, department)) {
            visible.add(department.id);
          }
        }
      }
      modules = modules.filter((m) => visible.has(m.departmentId));
    }
    return Response.json({ modules });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    console.error("List modules error:", error);
    return Response.json({ error: "Failed to load modules." }, { status: 500 });
  }
}
