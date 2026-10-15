import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireUser, authErrorResponse } from "@/lib/auth/server-auth";
import {
  departmentInputSchema,
  type DepartmentDoc,
} from "@/lib/adams-harness/types";
import {
  assertUniqueDepartmentCode,
  assertValidMemberIds,
  canAccessDepartment,
  enqueueMemberDepartmentSync,
  getDb,
  httpErrorResponse,
  isAdminActor,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    const db = getDb();
    const snapshot = await db.collection(COLLECTIONS.DEPARTMENTS).get();
    let departments = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as DepartmentDoc,
    );

    if (!isAdminActor(actor)) {
      departments = departments.filter(
        (d) => d.isActive && canAccessDepartment(actor, d),
      );
    }

    departments.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ departments: departments.map(serializeDoc) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Departments GET error:", error);
    return NextResponse.json({ error: "Failed to load departments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    const parsed = departmentInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid department input" }, { status: 400 });
    }

    const code = parsed.data.code.toUpperCase();
    const memberIds = [...new Set([...parsed.data.memberIds, ...parsed.data.ownerIds])];
    const ownerIds = [...new Set(parsed.data.ownerIds)];
    await assertUniqueDepartmentCode(code);
    await assertValidMemberIds(memberIds);

    const db = getDb();
    const ref = db.collection(COLLECTIONS.DEPARTMENTS).doc();
    const now = new Date();
    const doc = {
      id: ref.id,
      name: parsed.data.name,
      code,
      description: parsed.data.description,
      ownerIds,
      memberIds,
      isActive: parsed.data.isActive,
      createdByUid: actor.uid,
      createdAt: now,
      updatedAt: now,
    };
    const batch = db.batch();
    batch.set(ref, doc);
    await enqueueMemberDepartmentSync(batch, ref.id, [], memberIds);
    await batch.commit();

    await writeAuditLog({
      entityType: "department",
      entityId: ref.id,
      action: "create",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: { name: doc.name, code },
    });

    return NextResponse.json({ department: serializeDoc(doc) }, { status: 201 });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Departments POST error:", error);
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}
