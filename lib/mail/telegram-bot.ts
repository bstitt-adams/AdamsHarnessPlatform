/**
 * Telegram Bot helper for sending replies.
 */

import { createHmac } from "node:crypto";

const TELEGRAM_API = "https://api.telegram.org/bot";

export interface TelegramConfig {
  enabled?: boolean;
  botToken?: string;
  webhookSecret?: string;
  webhookUrl?: string;
  botUsername?: string;
}

export function getTelegramBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export async function resolveTelegramConfig(): Promise<TelegramConfig> {
  const envToken = getTelegramBotToken();
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    const stored = adminDb
      ? ((await adminDb.collection("platformSecrets").doc("telegram").get()).data() as TelegramConfig | undefined)
      : undefined;
    if (stored?.botToken) return stored;
  } catch {
    // Fall back to the environment token when Firestore is unavailable.
  }
  return { enabled: Boolean(envToken), botToken: envToken || undefined };
}

export async function sendTelegramMessage(chatId: string | number, text: string): Promise<void> {
  const config = await resolveTelegramConfig();
  const token = config.botToken;
  if (!token || config.enabled === false) {
    throw new Error("Telegram bot is not configured");
  }

  const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${response.status} ${error}`);
  }
}

export function verifyTelegramSignature(
  token: string,
  rawBody: string,
  signature: string
): boolean {
  const secret = token.split(":")[1];
  if (!secret) return false;

  const hmac = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return hmac === signature;
}
