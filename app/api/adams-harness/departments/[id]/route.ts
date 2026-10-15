import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth/server-auth";
import {
  departmentPatchSchema,
  type DepartmentDoc,
} from "@/lib/adams-harness/types";
import {
  assertUniqueDepartmentCode,
  assertValidMemberIds,
  enqueueMemberDepartmentSync,
  getDb,
  httpErrorResponse,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin(request);
    const { id } = await params;
    const parsed = departmentPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid department input" }, { status: 400 });
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const db = getDb();
    const ref = db.collection(COLLECTIONS.DEPARTMENTS).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    const current = snap.data() as DepartmentDoc;

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      update.description = parsed.data.description;
    if (parsed.data.isActive !== undefined) update.isActive = parsed.data.isActive;

    if (parsed.data.code !== undefined) {
      const code = parsed.data.code.toUpperCase();
      await assertUniqueDepartmentCode(code, id);
      update.code = code;
    }

    let nextMemberIds = current.memberIds;
    if (parsed.data.memberIds !== undefined || parsed.data.ownerIds !== undefined) {
      const ownerIds =
        parsed.data.ownerIds !== undefined
          ? [...new Set(parsed.data.ownerIds)]
          : current.ownerIds;
      const memberBase =
        parsed.data.memberIds !== undefined
          ? parsed.data.memberIds
          : current.memberIds;
      nextMemberIds = [...new Set([...memberBase, ...ownerIds])];
      await assertValidMemberIds(nextMemberIds);
      update.ownerIds = ownerIds;
      update.memberIds = nextMemberIds;
    }

    const batch = db.batch();
    batch.update(ref, update);
    await enqueueMemberDepartmentSync(
      batch,
      id,
      current.memberIds,
      nextMemberIds,
    );
    await batch.commit();
    const updated = (await ref.get()).data() as DepartmentDoc;

    await writeAuditLog({
      entityType: "department",
      entityId: id,
      action: "update",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: Object.fromEntries(
        Object.keys(parsed.data).map((k) => [k, true]),
      ),
    });

    return NextResponse.json({ department: serializeDoc(updated) });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Department PATCH error:", error);
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}
