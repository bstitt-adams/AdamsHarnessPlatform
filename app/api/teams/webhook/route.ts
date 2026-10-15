/**
 * Microsoft Teams Bot Webhook
 * POST /api/teams/webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";
import { handleMailCommand } from "@/lib/mail/command-handler";
import { sendTeamsReply, type TeamsActivity } from "@/lib/mail/teams-bot";

export async function POST(request: NextRequest) {
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

  const text = activity.text.trim();
  const conversationId = activity.conversation?.id;
  const fromId = activity.from?.id;

  if (!conversationId || !fromId) {
    return NextResponse.json({ success: false, error: "Missing conversation or sender" }, { status: 400 });
  }

  try {
    if (!db) {
      await sendTeamsReply(activity, "Database is not available. Please try again later.");
      return NextResponse.json({ success: false, error: "Database not initialized" }, { status: 500 });
    }

    // Try to find user by teams conversation or from id
    const channelsRef = collection(db, COLLECTIONS.USER_CHAT_CHANNELS);
    let q = query(channelsRef, where("teamsConversationId", "==", conversationId));
    let snapshot = await getDocs(q);

    if (snapshot.empty) {
      q = query(channelsRef, where("teamsUserEmail", "==", fromId));
      snapshot = await getDocs(q);
    }

    if (snapshot.empty) {
      // If user says /start <userId>, link conversation
      if (text.toLowerCase().startsWith("/start")) {
        const args = text.split(" ").slice(1);
        const userId = args[0];
        if (userId) {
          await setDoc(doc(db, COLLECTIONS.USER_CHAT_CHANNELS, userId), {
            id: userId,
            userId,
            teamsConversationId: conversationId,
            teamsUserEmail: fromId,
            preferredChannel: "both",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          }, { merge: true });
          await sendTeamsReply(activity, "Your Teams account is now linked. Try /summary today.");
          return NextResponse.json({ success: true });
        }
      }

      await sendTeamsReply(
        activity,
        "Your Teams account is not linked yet. Send /start <your-user-id> to connect, or ask your admin to link you in the Mail admin page."
      );
      return NextResponse.json({ success: true });
    }

    const channelDoc = snapshot.docs[0].data();
    const userId = channelDoc.userId as string;

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
