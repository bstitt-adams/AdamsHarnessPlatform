/**
 * Microsoft Teams Bot Webhook
 * POST /api/teams/webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/schema";
import { handleMailCommand } from "@/lib/mail/command-handler";
import { sendTeamsReply, resolveTeamsConfig, type TeamsActivity } from "@/lib/mail/teams-bot";
import { requestHermesStructured } from "@/lib/hermes/client";
import { queryAnyActiveBrain } from "@/lib/adams-brain/retrieval";

const hermesReplySchema = z.object({
  reply: z.string(),
});

export async function POST(request: NextRequest) {
  const teamsConfig = await resolveTeamsConfig();
  if (teamsConfig.enabled === false) {
    return NextResponse.json({ success: false, error: "Microsoft Teams bot is disabled" }, { status: 503 });
  }

  let activity: TeamsActivity;
  try {
    activity = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Ignore non-message activities (e.g., conversationUpdate, ping)
  if (activity.type !== "message" || !activity.text) {
    return NextResponse.json({ success: true, type: "ok" });
  }

  const text = activity.text.replace(/<at>.*?<\/at>/gi, "").trim();
  const conversationId = activity.conversation?.id;
  const fromId = activity.from?.id;
  const aadObjectId = activity.from?.aadObjectId || "";
  const fromName = (activity.from?.name || "").trim().toLowerCase();

  if (!conversationId || !fromId) {
    return NextResponse.json({ success: false, error: "Missing conversation or sender" }, { status: 400 });
  }

  try {
    if (!adminDb) {
      await sendTeamsReply(activity, "Database is not available. Please try again later.");
      return NextResponse.json({ success: false, error: "Database not initialized" }, { status: 500 });
    }

    const channelsRef = adminDb.collection(COLLECTIONS.USER_CHAT_CHANNELS);
    const allChannelsSnap = await channelsRef.get();

    let matchedDoc: FirebaseFirestore.DocumentSnapshot | undefined = allChannelsSnap.docs.find((docSnap) => {
      const data = docSnap.data();
      if (data.teamsIsActive === false || data.isActive === false) return false;
      if (data.teamsConversationId && String(data.teamsConversationId) === conversationId) return true;
      if (data.teamsUserId && (String(data.teamsUserId) === fromId || (aadObjectId && String(data.teamsUserId) === aadObjectId))) {
        return true;
      }
      if (data.teamsUserEmail && String(data.teamsUserEmail).toLowerCase() === fromId.toLowerCase()) {
        return true;
      }
      if (fromName && data.displayName && String(data.displayName).toLowerCase() === fromName) {
        return true;
      }
      return false;
    });

    if (!matchedDoc && text.toLowerCase().startsWith("/start")) {
      const args = text.split(/\s+/).slice(1);
      const linkKey = args[0]?.trim();
      if (linkKey) {
        const directSnap = await channelsRef.doc(linkKey).get();
        if (directSnap.exists) {
          matchedDoc = directSnap;
        }
      }
    }

    if (!matchedDoc) {
      await sendTeamsReply(
        activity,
        `Your Microsoft Teams account (ID: ${aadObjectId || fromId}) is not linked yet. Send "/start <your-user-id>" or ask an Adams Electric administrator to add your Teams user under Settings → Microsoft Teams.`
      );
      return NextResponse.json({ success: true });
    }

    await matchedDoc.ref.set(
      {
        teamsConversationId: conversationId,
        teamsUserId: aadObjectId || fromId,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    const channelData = matchedDoc.data() || {};
    const userId = (channelData.userId as string) || matchedDoc.id;

    if (text.toLowerCase().startsWith("/start")) {
      await sendTeamsReply(
        activity,
        `Connected to Adams Platform via Hermes as ${channelData.displayName || channelData.teamsUserEmail || userId}. Send any message to chat with Hermes, or use /summary, /search, /send, or /help.`
      );
      return NextResponse.json({ success: true });
    }

    const isMailSlashCommand = /^\/?(summary|search|send|help)\b/i.test(text);
    const hermesAllowed =
      channelData.teamsHermesEnabled !== undefined
        ? channelData.teamsHermesEnabled !== false
        : channelData.hermesEnabled !== false;

    if (!isMailSlashCommand && hermesAllowed) {
      const gbrainHit = await queryAnyActiveBrain(text);
      if (gbrainHit && !gbrainHit.insufficientEvidence) {
        await sendTeamsReply(activity, gbrainHit.answer);
        return NextResponse.json({ success: true });
      }
      try {
        const { data } = await requestHermesStructured({
          systemPrompt:
            `You are Hermes, the Adams Electric AI assistant talking to ${channelData.displayName || "an Adams Electric team member"} (${channelData.role || "team"}) over Microsoft Teams. Return JSON: {"reply": "<concise helpful response>"}.`,
          messages: [{ role: "user", content: text }],
          schema: hermesReplySchema,
        });
        await sendTeamsReply(activity, data.reply);
        return NextResponse.json({ success: true });
      } catch {
        // Fall back to mail command handler if Hermes is not reachable
      }
    }

    const reply = await handleMailCommand({ userId, channel: "teams", rawText: text });
    await sendTeamsReply(activity, reply);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Teams webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    try {
      await sendTeamsReply(activity, `Sorry, something went wrong: ${message}`);
    } catch {
      // ignore reply errors
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
