/**
 * Microsoft Teams Bot helper.
 * Sends replies back to a Teams conversation using the Bot Framework REST API
 * or an Incoming Webhook URL.
 */

export interface TeamsActivity {
  type: string;
  id?: string;
  timestamp?: string;
  serviceUrl: string;
  channelId: string;
  from: { id: string; name?: string; aadObjectId?: string };
  conversation: { id: string; isGroup?: boolean; tenantId?: string };
  recipient?: { id: string };
  text?: string;
  textFormat?: string;
}

export interface TeamsConfig {
  enabled?: boolean;
  appId?: string;
  appPassword?: string;
  tenantId?: string;
  incomingWebhookUrl?: string;
  webhookSecret?: string;
  webhookUrl?: string;
}

export async function resolveTeamsConfig(): Promise<TeamsConfig> {
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    if (adminDb) {
      const snap = await adminDb.collection("platformSecrets").doc("teams").get();
      if (snap.exists) {
        return snap.data() as TeamsConfig;
      }
    }
  } catch {
    // Fall back to env vars
  }
  return {
    enabled: Boolean(process.env.TEAMS_APP_ID || process.env.TEAMS_WEBHOOK_URL),
    appId: process.env.TEAMS_APP_ID,
    appPassword: process.env.TEAMS_APP_PASSWORD,
    tenantId: process.env.TEAMS_TENANT_ID,
    incomingWebhookUrl: process.env.TEAMS_WEBHOOK_URL,
  };
}

async function getBotFrameworkToken(config: TeamsConfig): Promise<string | null> {
  if (!config.appId || !config.appPassword) return null;
  try {
    const tenant = config.tenantId || "botframework.com";
    const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.appId,
      client_secret: config.appPassword,
      scope: "https://api.botframework.com/.default",
    });
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string };
    return json.access_token || null;
  } catch {
    return null;
  }
}

export async function sendTeamsReply(activity: TeamsActivity, text: string): Promise<void> {
  const config = await resolveTeamsConfig();

  if (!activity.serviceUrl || !activity.conversation?.id) {
    if (config.incomingWebhookUrl) {
      await fetch(config.incomingWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return;
    }
    throw new Error("Missing serviceUrl or conversation ID");
  }

  const cleanServiceUrl = activity.serviceUrl.replace(/\/+$/, "");
  const replyUrl = `${cleanServiceUrl}/v3/conversations/${activity.conversation.id}/activities/${activity.id || ""}`;
  const bearerToken = await getBotFrameworkToken(config);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const response = await fetch(replyUrl, {
    method: "POST",
    headers,
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
