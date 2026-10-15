/**
 * Shared command handler for Mail chat channels (Telegram + Teams).
 * Parses a user's message and executes it against Microsoft Graph.
 */

import { getUserGraphClient } from "./get-user-graph-client";

export type ChatChannel = "telegram" | "teams";

export interface CommandContext {
  userId: string;
  channel: ChatChannel;
  rawText: string;
}

function stripCommand(text: string, command: string): string {
  // Remove both `/command` and command keyword at start
  const lower = text.toLowerCase().trim();
  if (lower.startsWith(`/${command}`)) {
    return text.slice(command.length + 1).trim();
  }
  if (lower.startsWith(command)) {
    return text.slice(command.length).trim();
  }
  return text.trim();
}

export async function handleMailCommand(ctx: CommandContext): Promise<string> {
  const { rawText } = ctx;
  const lower = rawText.toLowerCase().trim();

  try {
    if (lower.startsWith("/summary") || lower.startsWith("summary")) {
      return await handleSummary(ctx, stripCommand(rawText, "summary"));
    }

    if (lower.startsWith("/search") || lower.startsWith("search")) {
      const query = stripCommand(rawText, "search");
      return await handleSearch(ctx, query);
    }

    if (lower.startsWith("/send") || lower.startsWith("send")) {
      const rest = stripCommand(rawText, "send");
      return await handleSend(ctx, rest);
    }

    if (lower.startsWith("/help")) {
      return getHelpText();
    }

    return "I didn't understand that. Try: /summary, /search, /send, or /help.";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return `Sorry, something went wrong: ${message}`;
  }
}

function getHelpText(): string {
  return [
    "Adams Electric Mail Bot commands:",
    "• /summary today — summarize today's unread emails",
    "• /summary from skanska — summarize emails from a sender",
    "• /search safety — search emails containing a word",
    "• /send to brian@adamselectric.com subject Toolbox Talk body Please review... — send an email",
    "• /help — show this message",
  ].join("\n");
}

async function handleSummary(ctx: CommandContext, args: string): Promise<string> {
  const { client } = await getUserGraphClient(ctx.userId);

  let filter = "";
  const lowerArgs = args.toLowerCase();

  if (lowerArgs.includes("today")) {
    const today = new Date().toISOString().split("T")[0];
    filter = `receivedDateTime ge ${today}T00:00:00Z`;
  }

  const result = await client.getEmails("inbox", 10, filter || undefined);

  if (!result.success) {
    return `Could not fetch emails: ${result.error}`;
  }

  const emails = result.data?.value || [];
  if (emails.length === 0) {
    return "No emails found.";
  }

  const summary = emails
    .slice(0, 5)
    .map((email, idx) => {
      const from = email.from?.emailAddress?.address || "unknown";
      return `${idx + 1}. ${email.subject}\n   From: ${from}`;
    })
    .join("\n");

  return `Recent emails:\n${summary}`;
}

async function handleSearch(ctx: CommandContext, query: string): Promise<string> {
  if (!query) return "Please provide a search word. Example: /search safety";

  const { client } = await getUserGraphClient(ctx.userId);
  const filter = `contains(subject,'${query.replace(/'/g, "''")}') or contains(bodyPreview,'${query.replace(/'/g, "''")}')`;
  const result = await client.getEmails("inbox", 10, filter);

  if (!result.success) {
    return `Search failed: ${result.error}`;
  }

  const emails = result.data?.value || [];
  if (emails.length === 0) {
    return `No emails found for "${query}".`;
  }

  return emails
    .slice(0, 5)
    .map((email, idx) => {
      const from = email.from?.emailAddress?.address || "unknown";
      return `${idx + 1}. ${email.subject}\n   From: ${from}\n   ${email.bodyPreview || ""}`.trim();
    })
    .join("\n\n");
}

async function handleSend(ctx: CommandContext, rest: string): Promise<string> {
  // Expected: to <email> subject <subject> body <body>
  const toMatch = rest.match(/to\s+(\S+)\s+subject\s+(.+?)\s+body\s+(.+)/i);
  if (!toMatch) {
    return 'Send format: /send to user@email.com subject Hello body This is the message.';
  }

  const [, to, subject, body] = toMatch;
  const { client } = await getUserGraphClient(ctx.userId);

  const result = await client.sendEmail({
    subject: subject.trim(),
    body: { contentType: "text", content: body.trim() },
    toRecipients: [{ emailAddress: { address: to.trim() } }],
  });

  if (!result.success) {
    return `Could not send email: ${result.error}`;
  }

  return `Email sent to ${to.trim()}: ${subject.trim()}`;
}

/**
 * Map a Telegram chat or Teams conversation to a userId by looking up userChatChannels.
 * Returns null if not found.
 */
export async function resolveUserFromChannel(
  channel: ChatChannel,
  chatId?: string,
  conversationId?: string
): Promise<string | null> {
  // This is a placeholder; the webhook routes will implement the actual lookup
  // using Firestore queries to keep dependencies clean.
  return null;
}
