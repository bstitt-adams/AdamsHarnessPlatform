import { NextRequest } from "next/server";
import { COLLECTIONS } from "@/lib/schema";
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
import { DepartmentDoc, ModuleBuildDoc } from "@/lib/adams-harness/types";
import { serializeModuleBuild } from "@/lib/adams-harness/module-builds";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    const db = getDb();
    const url = new URL(request.url);
    const specificationId = url.searchParams.get("specificationId");
    const buildId = url.searchParams.get("buildId");

    let docs;
    if (buildId) {
      const snap = await db
        .collection(COLLECTIONS.MODULE_BUILDS)
        .doc(buildId)
        .get();
      docs = snap.exists ? [snap] : [];
    } else if (specificationId) {
      const snap = await db
        .collection(COLLECTIONS.MODULE_BUILDS)
        .where("specificationId", "==", specificationId)
        .get();
      docs = snap.docs;
    } else {
      const snap = await db.collection(COLLECTIONS.MODULE_BUILDS).get();
      docs = snap.docs;
    }

    let builds = docs.map((d) => d.data() as ModuleBuildDoc);
    if (!isAdminActor(actor)) {
      const deptIds = [...new Set(builds.map((b) => b.departmentId))];
      const deptSnaps = await Promise.all(
        deptIds.map((id) =>
          db.collection(COLLECTIONS.DEPARTMENTS).doc(id).get(),
        ),
      );
      const departments = new Map(
        deptSnaps
          .filter((s) => s.exists)
          .map((s) => [s.id, { id: s.id, ...s.data() } as DepartmentDoc]),
      );
      builds = builds.filter((b) => {
        if (b.requestedByUid === actor.uid) return true;
        if (actor.departmentIds.includes(b.departmentId)) return true;
        const dept = departments.get(b.departmentId);
        return dept ? canAccessDepartment(actor, dept) : false;
      });
    }

    builds.sort((a, b) => {
      const at = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      const bt = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      return bt - at;
    });
    return Response.json({ builds: builds.map(serializeModuleBuild) });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    console.error("List module builds error:", error);
    return Response.json({ error: "Failed to load module builds." }, { status: 500 });
  }
}
