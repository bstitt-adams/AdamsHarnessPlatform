import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  getDb,
  isAdminActor,
  serializeDoc,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";
import type { ModuleNotificationDoc } from "@/lib/adams-harness/types";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    const db = getDb();
    const url = new URL(request.url);
    const departmentId = url.searchParams.get("departmentId");

    const collected = new Map<string, ModuleNotificationDoc>();
    if (isAdminActor(actor) && departmentId) {
      const snap = await db
        .collection(COLLECTIONS.MODULE_NOTIFICATIONS)
        .where("departmentId", "==", departmentId)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      for (const doc of snap.docs) {
        collected.set(doc.id, { id: doc.id, ...doc.data() } as ModuleNotificationDoc);
      }
    } else {
      const byUid = await db
        .collection(COLLECTIONS.MODULE_NOTIFICATIONS)
        .where("recipientUid", "==", actor.uid)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      for (const doc of byUid.docs) {
        collected.set(doc.id, { id: doc.id, ...doc.data() } as ModuleNotificationDoc);
      }
      if (actor.teamMemberId) {
        const byMember = await db
          .collection(COLLECTIONS.MODULE_NOTIFICATIONS)
          .where("recipientTeamMemberId", "==", actor.teamMemberId)
          .orderBy("createdAt", "desc")
          .limit(100)
          .get();
        for (const doc of byMember.docs) {
          collected.set(doc.id, { id: doc.id, ...doc.data() } as ModuleNotificationDoc);
        }
      }
    }

    const notifications = [...collected.values()]
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      .slice(0, 100)
      .map((n) => serializeDoc(n));
    return Response.json({ notifications });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    console.error("Module notifications error:", error);
    return Response.json(
      { error: "Failed to load notifications." },
      { status: 500 },
    );
  }
}
