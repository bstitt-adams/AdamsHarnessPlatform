/**
 * Microsoft Teams Bot helper.
 * Sends replies back to a Teams conversation using the Bot Framework REST API.
 */

export interface TeamsActivity {
  type: string;
  id?: string;
  timestamp?: string;
  serviceUrl: string;
  channelId: string;
  from: { id: string; name?: string };
  conversation: { id: string; isGroup?: boolean };
  recipient?: { id: string };
  text?: string;
  textFormat?: string;
}

export async function sendTeamsReply(activity: TeamsActivity, text: string): Promise<void> {
  if (!activity.serviceUrl || !activity.conversation?.id) {
    throw new Error("Missing serviceUrl or conversation ID");
  }

  const replyUrl = `${activity.serviceUrl}/v3/conversations/${activity.conversation.id}/activities/${activity.id || ""}`;

  const response = await fetch(replyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "message",
      from: activity.recipient ? { id: activity.recipient.id } : undefined,
      conversation: activity.conversation,
      recipient: activity.from,
      text,
      replyToId: activity.id,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Teams reply failed: ${response.status} ${error}`);
  }
}
