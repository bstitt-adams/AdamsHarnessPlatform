/**
 * Telegram Bot Webhook
 * POST /api/telegram/webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/schema";
import { handleMailCommand } from "@/lib/mail/command-handler";
import { sendTelegramMessage, resolveTelegramConfig } from "@/lib/mail/telegram-bot";
import { requestHermesStructured } from "@/lib/hermes/client";
import { queryAnyActiveBrain } from "@/lib/adams-brain/retrieval";
import { handleTelegramPlatformMessage } from "@/lib/telegram-platform";
import { telegramUpdateSchema, validWebhookSecret } from "@/lib/telegram-platform-policy";
import { isRateLimited } from "@/lib/adams-harness/rate-limit";

interface TelegramUpdate {
  update_id?: number;
  message?: {
    from?: { id: number; username?: string; first_name?: string; last_name?: string };
    chat: { id: number; username?: string; type?: string };
    text?: string;
  };
}

const hermesReplySchema = z.object({
  reply: z.string(),
});

export async function POST(request: NextRequest) {
  const telegramConfig = await resolveTelegramConfig();
  const token = telegramConfig.botToken;
  if (!token || telegramConfig.enabled === false) {
    return NextResponse.json({ success: false, error: "Telegram bot is not configured" }, { status: 500 });
  }

  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!validWebhookSecret(telegramConfig.webhookSecret, secretHeader)) {
    return NextResponse.json({ success: false, error: "Invalid webhook secret" }, { status: 401 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 32000) {
    return NextResponse.json({ success: false, error: "Update too large" }, { status: 413 });
  }
  let update: TelegramUpdate;
  try {
    update = telegramUpdateSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const message = update.message;
  if (!message || !message.text) {
    return NextResponse.json({ success: true });
  }

  if (!Number.isSafeInteger(message.chat?.id) || !Number.isSafeInteger(message.from?.id)) {
    return NextResponse.json({ success: false, error: "Invalid sender" }, { status: 400 });
  }
  const chatId = message.chat.id.toString();
  const fromUserId = message.from!.id.toString();
  const fromUsername = (message.from?.username || message.chat.username || "").replace(/^@/, "").toLowerCase();
  const text = message.text.trim();
  if (isRateLimited(`telegram-message:${fromUserId}`, 20, 60_000)) {
    return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
  }
  if (telegramConfig.platformDataEnabled) {
    if (message.chat.type !== "private" || chatId !== fromUserId || fromUserId !== telegramConfig.platformAdminTelegramUserId) {
      return NextResponse.json({ success: true });
    }
    if (!Number.isSafeInteger(update.update_id) || update.update_id! < 0) {
      return NextResponse.json({ success: false, error: "Invalid update ID" }, { status: 400 });
    }
    try {
      const reply = await handleTelegramPlatformMessage(telegramConfig, { updateId: update.update_id!, userId: fromUserId, chatId, text });
      for (let offset = 0; offset < reply.length; offset += 3500) {
        await sendTelegramMessage(chatId, reply.slice(offset, offset + 3500), { plainText: true });
      }
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ success: false, error: "Platform account authorization failed" }, { status: 403 });
    }
  }

  try {
    if (!adminDb) {
      await sendTelegramMessage(chatId, "Database is not available. Please try again later.");
      return NextResponse.json({ success: false, error: "Database not initialized" }, { status: 500 });
    }

    const channelsRef = adminDb.collection(COLLECTIONS.USER_CHAT_CHANNELS);
    const allChannelsSnap = await channelsRef.get();

    const matchedDoc = allChannelsSnap.docs.find((docSnap) => {
      const data = docSnap.data();
      return data.isActive !== false && message.chat.type === "private" && chatId === fromUserId &&
        String(data.telegramUserId || "") === fromUserId;
    });

    if (!matchedDoc) {
      await sendTelegramMessage(
        chatId,
        `Your Telegram account (User ID: ${fromUserId}${fromUsername ? `, @${fromUsername}` : ""}) is not authorized yet. Ask an Adams Electric administrator to add your Telegram user under Settings → Telegram.`
      );
      return NextResponse.json({ success: true });
    }

    // Persist discovered chatId / userId / username on the user record
    await matchedDoc.ref.set(
      {
        telegramChatId: chatId,
        telegramUserId: fromUserId,
        ...(fromUsername ? { telegramUsername: fromUsername } : {}),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    const channelData = matchedDoc.data() || {};
    const userId = (channelData.userId as string) || matchedDoc.id;

    if (text.toLowerCase().startsWith("/start")) {
      await sendTelegramMessage(
        chatId,
        `Connected to Adams Platform via Hermes as ${channelData.displayName || channelData.email || userId}. Send any message to chat with Hermes, or use /summary, /search, /send, or /help.`
      );
      return NextResponse.json({ success: true });
    }

    const isMailSlashCommand = /^\/?(summary|search|send|help)\b/i.test(text);
    if (!isMailSlashCommand && channelData.hermesEnabled !== false) {
      const gbrainHit = await queryAnyActiveBrain(text);
      if (gbrainHit && !gbrainHit.insufficientEvidence) {
        await sendTelegramMessage(chatId, gbrainHit.answer);
        return NextResponse.json({ success: true });
      }
      try {
        const { data } = await requestHermesStructured({
          systemPrompt:
            `You are Hermes, the Adams Electric AI assistant talking to ${channelData.displayName || "an Adams Electric team member"} (${channelData.role || "team"}) over Telegram. Return JSON: {"reply": "<concise helpful response>"}.`,
          messages: [{ role: "user", content: text }],
          schema: hermesReplySchema,
        });
        await sendTelegramMessage(chatId, data.reply);
        return NextResponse.json({ success: true });
      } catch {
        // Fall back to mail command handler if Hermes is not reachable
      }
    }

    const reply = await handleMailCommand({ userId, channel: "telegram", rawText: text });
    await sendTelegramMessage(chatId, reply);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    try {
      await sendTelegramMessage(chatId, `Sorry, something went wrong: ${errMsg}`);
    } catch {
      // ignore reply errors
    }
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
