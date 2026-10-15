import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  getDb,
  HttpError,
  httpErrorResponse,
  isAdminActor,
  serializeDoc,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";
import type { ModuleNotificationDoc } from "@/lib/adams-harness/types";

const patchSchema = z.strictObject({ read: z.boolean() });

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Invalid patch");
    }
    const ref = getDb().collection(COLLECTIONS.MODULE_NOTIFICATIONS).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpError(404, "Notification not found");
    }
    const notification = snap.data() as ModuleNotificationDoc;
    const isRecipient =
      notification.recipientUid === actor.uid ||
      (!!actor.teamMemberId &&
        notification.recipientTeamMemberId === actor.teamMemberId);
    if (!isRecipient && !isAdminActor(actor)) {
      throw new HttpError(403, "Not authorized");
    }
    await ref.update({ read: parsed.data.read });
    return Response.json({
      notification: serializeDoc({ ...notification, id: snap.id, read: parsed.data.read }),
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Module notification update error:", error);
    return Response.json({ error: "Failed to update." }, { status: 500 });
  }
}
