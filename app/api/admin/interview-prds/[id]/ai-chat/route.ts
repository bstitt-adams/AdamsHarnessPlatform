import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { getDb, httpErrorResponse } from "@/lib/adams-harness/server-store";
import { chatMessage, runPrdChatTurn } from "@/lib/adams-harness/prd-collaboration";
import type { InterviewPrdDoc } from "@/lib/adams-harness/types";
import { HermesError } from "@/lib/hermes/client";
import { COLLECTIONS } from "@/lib/schema";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(8_000),
  /** Unsaved editor content, so the AI rewrites what the admin is looking at. */
  currentContent: z.string().max(50_000).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

/** POST — one turn of the collaborative PRD chat. Proposed rewrites are returned, not auto-applied. */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireAdmin(request);
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid chat message" }, { status: 400 });

    const ref = getDb().collection(COLLECTIONS.INTERVIEW_PRDS).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "PRD not found" }, { status: 404 });
    const prd = { id: snap.id, ...snap.data() } as InterviewPrdDoc;
    if (prd.status === "deployed") {
      return NextResponse.json({ error: "Deployed PRDs are locked; regenerate a new version to change them" }, { status: 409 });
    }

    let turn;
    try {
      turn = await runPrdChatTurn({
        prd,
        currentContent: parsed.data.currentContent ?? prd.content,
        message: parsed.data.message,
      });
    } catch (error) {
      if (error instanceof HermesError) {
        return NextResponse.json({ error: `AI assistant unavailable: ${error.message}` }, { status: 502 });
      }
      throw error;
    }

    const userMsg = chatMessage({ role: "user", content: parsed.data.message, authorEmail: actor.email });
    const assistantMsg = chatMessage({
      role: "assistant",
      content: turn.reply,
      ...(turn.revisedContent ? { proposedContent: turn.revisedContent, changeSummary: turn.changeSummary } : {}),
    });
    const aiChat = [...(prd.aiChat || []), userMsg, assistantMsg].slice(-100);
    await ref.update({ aiChat, updatedAt: new Date() });

    return NextResponse.json({ aiChat, message: assistantMsg, model: turn.model });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("PRD AI chat error:", error);
    return NextResponse.json({ error: "PRD AI chat failed" }, { status: 500 });
  }
}

/** DELETE — clear the chat history for this PRD. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    await getDb().collection(COLLECTIONS.INTERVIEW_PRDS).doc(id).update({ aiChat: [], updatedAt: new Date() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("PRD AI chat clear error:", error);
    return NextResponse.json({ error: "Failed to clear chat" }, { status: 500 });
  }
}
