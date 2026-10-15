/**
 * Telegram Bot Webhook
 * POST /api/telegram/webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";
import { handleMailCommand } from "@/lib/mail/command-handler";
import { sendTelegramMessage, resolveTelegramConfig, verifyTelegramSignature } from "@/lib/mail/telegram-bot";

interface TelegramUpdate {
  message?: {
    chat: { id: number; username?: string };
    text?: string;
  };
}

export async function POST(request: NextRequest) {
  const telegramConfig = await resolveTelegramConfig();
  const token = telegramConfig.botToken;
  if (!token || telegramConfig.enabled === false) {
    return NextResponse.json({ success: false, error: "Telegram bot is not configured" }, { status: 500 });
  }

  // Optional signature verification
  const signature = request.headers.get("x-telegram-bot-api-secret-token") || "";
  const rawBody = await request.text();

  if (signature && !verifyTelegramSignature(token, rawBody, signature)) {
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const message = update.message;
  if (!message || !message.text) {
    return NextResponse.json({ success: true });
  }

  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  try {
    if (!db) {
      await sendTelegramMessage(chatId, "Database is not available. Please try again later.");
      return NextResponse.json({ success: false, error: "Database not initialized" }, { status: 500 });
    }

    // Find user by telegram chat id
    const channelsRef = collection(db, COLLECTIONS.USER_CHAT_CHANNELS);
    const q = query(channelsRef, where("telegramChatId", "==", chatId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // If user sends a start command with a userId argument, link this chat
      if (text.toLowerCase().startsWith("/start")) {
        const args = text.split(" ").slice(1);
        const userId = args[0];
        if (userId) {
          await setDoc(doc(db, COLLECTIONS.USER_CHAT_CHANNELS, userId), {
            id: userId,
            userId,
            telegramChatId: chatId,
            telegramUsername: message.chat.username || "",
            preferredChannel: "both",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          }, { merge: true });
          await sendTelegramMessage(chatId, "Your Telegram account is now linked. Try /summary today.");
          return NextResponse.json({ success: true });
        }
      }

      await sendTelegramMessage(
        chatId,
        "Your Telegram account is not linked yet. Send /start <your-user-id> to connect, or ask your admin to link you in the Mail admin page."
      );
      return NextResponse.json({ success: true });
    }

    const channelDoc = snapshot.docs[0].data();
    const userId = channelDoc.userId as string;

    const reply = await handleMailCommand({ userId, channel: "telegram", rawText: text });
    await sendTelegramMessage(chatId, reply);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    try {
      await sendTelegramMessage(chatId, `Sorry, something went wrong: ${message}`);
    } catch {
      // ignore reply errors
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
