/**
 * Microsoft Graph API Integration
 * 
 * Provides integration with Microsoft 365 services:
 * - Outlook Email
 * - Outlook Calendar
 * - SharePoint
 * - OneDrive
 * 
 * Uses Microsoft Graph API v1.0
 * Documentation: https://learn.microsoft.com/en-us/graph/overview
 */

// Microsoft Graph API Types
export interface MSGraphConfig {
  clientId: string;
  clientSecret?: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
}

export interface MSGraphTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

// Email Types
export interface MSEmail {
  id?: string;
  subject: string;
  body?: {
    contentType: "text" | "html";
    content: string;
  };
  bodyPreview?: string;
  from?: { emailAddress: { address: string; name?: string } };
  toRecipients: { emailAddress: { address: string; name?: string } }[];
  ccRecipients?: { emailAddress: { address: string; name?: string } }[];
  bccRecipients?: { emailAddress: { address: string; name?: string } }[];
  importance?: "low" | "normal" | "high";
  attachments?: MSAttachment[];
  receivedDateTime?: string;
}

export interface MSAttachment {
  "@odata.type": "#microsoft.graph.fileAttachment";
  name: string;
  contentType: string;
  contentBytes: string; // Base64 encoded
}

// Calendar Types
export interface MSCalendarEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: "text" | "html";
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: {
    emailAddress: { address: string; name?: string };
    type: "required" | "optional";
  }[];
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: "teamsForBusiness" | "skypeForBusiness" | "skypeForConsumer";
  recurrence?: MSRecurrence;
  reminderMinutesBeforeStart?: number;
}

export interface MSRecurrence {
  pattern: {
    type: "daily" | "weekly" | "absoluteMonthly" | "relativeMonthly" | "absoluteYearly" | "relativeYearly";
    interval: number;
    daysOfWeek?: ("sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday")[];
    dayOfMonth?: number;
    month?: number;
  };
  range: {
    type: "endDate" | "noEnd" | "numbered";
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
  };
}

// SharePoint Types
export interface SPSite {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

export interface SPList {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

export interface SPListItem {
  id?: string;
  fields: Record<string, unknown>;
}

export interface SPDriveItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
}

// OneDrive Types
export interface ODFile {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  downloadUrl?: string;
  mimeType?: string;
  parentReference?: {
    driveId: string;
    id: string;
    path: string;
  };
}

export interface ODFolder {
  id: string;
  name: string;
  webUrl: string;
  childCount: number;
}

// API Response types
interface MSGraphResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Microsoft Graph API Client
 */
export class MicrosoftGraphClient {
  private accessToken: string;
  private baseUrl = "https://graph.microsoft.com/v1.0";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    body?: unknown
  ): Promise<MSGraphResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `API Error: ${response.status} - ${errorData.error?.message || response.statusText}`,
        };
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // =========================================================================
  // USER INFO
  // =========================================================================

  async getMe(): Promise<MSGraphResponse<{ displayName: string; mail: string; id: string; userPrincipalName?: string }>> {
    return this.request("/me");
  }

  // =========================================================================
  // EMAIL (OUTLOOK)
  // =========================================================================

  async sendEmail(email: MSEmail): Promise<MSGraphResponse<void>> {
    return this.request("/me/sendMail", "POST", { message: email });
  }

  async getEmails(
    folder: string = "inbox",
    top: number = 10,
    filter?: string
  ): Promise<MSGraphResponse<{ value: MSEmail[] }>> {
    let endpoint = `/me/mailFolders/${folder}/messages?$top=${top}&$orderby=receivedDateTime desc`;
    if (filter) {
      endpoint += `&$filter=${encodeURIComponent(filter)}`;
    }
    return this.request(endpoint);
  }

  async getEmail(messageId: string): Promise<MSGraphResponse<MSEmail>> {
    return this.request(`/me/messages/${messageId}`);
  }

  async createDraft(email: MSEmail): Promise<MSGraphResponse<MSEmail>> {
    return this.request("/me/messages", "POST", email);
  }

  async replyToEmail(messageId: string, comment: string): Promise<MSGraphResponse<void>> {
    return this.request(`/me/messages/${messageId}/reply`, "POST", { comment });
  }

  // =========================================================================
  // CALENDAR (OUTLOOK)
  // =========================================================================

  async getCalendars(): Promise<MSGraphResponse<{ value: { id: string; name: string }[] }>> {
    return this.request("/me/calendars");
  }

  async getCalendarEvents(
    calendarId?: string,
    startDateTime?: string,
    endDateTime?: string,
    top: number = 50
  ): Promise<MSGraphResponse<{ value: MSCalendarEvent[] }>> {
    const calendar = calendarId ? `/calendars/${calendarId}` : "";
    let endpoint = `/me${calendar}/events?$top=${top}&$orderby=start/dateTime`;
    
    if (startDateTime && endDateTime) {
      endpoint = `/me${calendar}/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$top=${top}`;
    }
    
    return this.request(endpoint);
  }

  async createCalendarEvent(
    event: MSCalendarEvent,
    calendarId?: string
  ): Promise<MSGraphResponse<MSCalendarEvent>> {
    const calendar = calendarId ? `/calendars/${calendarId}` : "";
    return this.request(`/me${calendar}/events`, "POST", event);
  }

  async updateCalendarEvent(
    eventId: string,
    event: Partial<MSCalendarEvent>,
    calendarId?: string
  ): Promise<MSGraphResponse<MSCalendarEvent>> {
    const calendar = calendarId ? `/calendars/${calendarId}` : "";
    return this.request(`/me${calendar}/events/${eventId}`, "PATCH", event);
  }

  async deleteCalendarEvent(eventId: string, calendarId?: string): Promise<MSGraphResponse<void>> {
    const calendar = calendarId ? `/calendars/${calendarId}` : "";
    return this.request(`/me${calendar}/events/${eventId}`, "DELETE");
  }

  async createOnlineMeeting(
    subject: string,
    startDateTime: string,
    endDateTime: string,
    attendees?: string[]
  ): Promise<MSGraphResponse<MSCalendarEvent>> {
    const event: MSCalendarEvent = {
      subject,
      start: { dateTime: startDateTime, timeZone: "UTC" },
      end: { dateTime: endDateTime, timeZone: "UTC" },
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
      attendees: attendees?.map((email) => ({
        emailAddress: { address: email },
        type: "required",
      })),
    };
    return this.createCalendarEvent(event);
  }

  // =========================================================================
  // SHAREPOINT
  // =========================================================================

  async getSites(search?: string): Promise<MSGraphResponse<{ value: SPSite[] }>> {
    const endpoint = search
      ? `/sites?search=${encodeURIComponent(search)}`
      : "/sites?search=*";
    return this.request(endpoint);
  }

  async getSite(siteId: string): Promise<MSGraphResponse<SPSite>> {
    return this.request(`/sites/${siteId}`);
  }

  async getSiteLists(siteId: string): Promise<MSGraphResponse<{ value: SPList[] }>> {
    return this.request(`/sites/${siteId}/lists`);
  }

  async getListItems(
    siteId: string,
    listId: string,
    expand: boolean = true
  ): Promise<MSGraphResponse<{ value: SPListItem[] }>> {
    const expandParam = expand ? "?$expand=fields" : "";
    return this.request(`/sites/${siteId}/lists/${listId}/items${expandParam}`);
  }

  async createListItem(
    siteId: string,
    listId: string,
    fields: Record<string, unknown>
  ): Promise<MSGraphResponse<SPListItem>> {
    return this.request(`/sites/${siteId}/lists/${listId}/items`, "POST", { fields });
  }

  async updateListItem(
    siteId: string,
    listId: string,
    itemId: string,
    fields: Record<string, unknown>
  ): Promise<MSGraphResponse<SPListItem>> {
    return this.request(`/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, "PATCH", fields);
  }

  async getSiteDrive(siteId: string): Promise<MSGraphResponse<{ id: string; name: string; webUrl: string }>> {
    return this.request(`/sites/${siteId}/drive`);
  }

  async getSiteDriveItems(
    siteId: string,
    folderId?: string
  ): Promise<MSGraphResponse<{ value: SPDriveItem[] }>> {
    const path = folderId ? `/items/${folderId}/children` : "/root/children";
    return this.request(`/sites/${siteId}/drive${path}`);
  }

  // =========================================================================
  // ONEDRIVE
  // =========================================================================

  async getMyDrive(): Promise<MSGraphResponse<{ id: string; name: string; webUrl: string }>> {
    return this.request("/me/drive");
  }

  async getDriveItems(folderId?: string): Promise<MSGraphResponse<{ value: ODFile[] }>> {
    const path = folderId ? `/items/${folderId}/children` : "/root/children";
    return this.request(`/me/drive${path}`);
  }

  async getDriveItem(itemId: string): Promise<MSGraphResponse<ODFile>> {
    return this.request(`/me/drive/items/${itemId}`);
  }

  async searchDrive(query: string): Promise<MSGraphResponse<{ value: ODFile[] }>> {
    return this.request(`/me/drive/root/search(q='${encodeURIComponent(query)}')`);
  }

  async createFolder(
    name: string,
    parentFolderId?: string
  ): Promise<MSGraphResponse<ODFolder>> {
    const parent = parentFolderId ? `/items/${parentFolderId}` : "/root";
    return this.request(`/me/drive${parent}/children`, "POST", {
      name,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    });
  }

  async uploadFile(
    fileName: string,
    content: ArrayBuffer | Blob,
    parentFolderId?: string
  ): Promise<MSGraphResponse<ODFile>> {
    const parent = parentFolderId ? `/items/${parentFolderId}` : "/root";
    
    // For small files (< 4MB), use simple upload
    const response = await fetch(
      `${this.baseUrl}/me/drive${parent}:/${encodeURIComponent(fileName)}:/content`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: content,
      }
    );

    if (!response.ok) {
      return { success: false, error: `Upload failed: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  }

  async getDownloadUrl(itemId: string): Promise<MSGraphResponse<string>> {
    const result = await this.request<ODFile>(`/me/drive/items/${itemId}`);
    if (result.success && result.data) {
      return { success: true, data: result.data.downloadUrl };
    }
    return { success: false, error: result.error };
  }

  async deleteItem(itemId: string): Promise<MSGraphResponse<void>> {
    return this.request(`/me/drive/items/${itemId}`, "DELETE");
  }

  async copyItem(
    itemId: string,
    destinationFolderId: string,
    newName?: string
  ): Promise<MSGraphResponse<void>> {
    return this.request(`/me/drive/items/${itemId}/copy`, "POST", {
      parentReference: { id: destinationFolderId },
      name: newName,
    });
  }

  async moveItem(
    itemId: string,
    destinationFolderId: string,
    newName?: string
  ): Promise<MSGraphResponse<ODFile>> {
    return this.request(`/me/drive/items/${itemId}`, "PATCH", {
      parentReference: { id: destinationFolderId },
      name: newName,
    });
  }

  async shareItem(
    itemId: string,
    type: "view" | "edit" = "view",
    scope: "anonymous" | "organization" = "organization"
  ): Promise<MSGraphResponse<{ link: { webUrl: string } }>> {
    return this.request(`/me/drive/items/${itemId}/createLink`, "POST", {
      type,
      scope,
    });
  }
}

// ============================================================================
// OAUTH HELPERS
// ============================================================================

/**
 * Generate Microsoft OAuth authorization URL
 */
export function getMicrosoftAuthUrl(config: MSGraphConfig, state?: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(" "),
    response_mode: "query",
    state: state || "",
  });

  return `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeMicrosoftCode(
  config: MSGraphConfig,
  code: string
): Promise<MSGraphResponse<MSGraphTokens>> {
  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret || "",
          code,
          redirect_uri: config.redirectUri,
          grant_type: "authorization_code",
          scope: config.scopes.join(" "),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error_description || "Token exchange failed" };
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Refresh access token
 */
export async function refreshMicrosoftToken(
  config: MSGraphConfig,
  refreshToken: string
): Promise<MSGraphResponse<MSGraphTokens>> {
  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret || "",
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: config.scopes.join(" "),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error_description || "Token refresh failed" };
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================================================
// TRACTION INTEGRATION HELPERS
// ============================================================================

/**
 * Create a Level 10 Meeting in Outlook Calendar with Teams
 */
export async function createLevel10MeetingInOutlook(
  client: MicrosoftGraphClient,
  date: string,
  startTime: string,
  endTime: string,
  attendees: string[],
  timeZone: string = "America/New_York"
): Promise<MSGraphResponse<MSCalendarEvent>> {
  const event: MSCalendarEvent = {
    subject: "Level 10 Meeting",
    body: {
      contentType: "html",
      content: `
        <h2>Weekly Level 10 Meeting - EOS/Traction</h2>
        <h3>Agenda:</h3>
        <ol>
          <li><strong>Segue</strong> (5 min) - Good news, personal & professional</li>
          <li><strong>Scorecard Review</strong> (5 min)</li>
          <li><strong>Rock Review</strong> (5 min)</li>
          <li><strong>Customer/Employee Headlines</strong> (5 min)</li>
          <li><strong>To-Do List Review</strong> (5 min)</li>
          <li><strong>IDS</strong> (60 min) - Identify, Discuss, Solve</li>
          <li><strong>Conclude</strong> (5 min) - Recap, rate meeting, cascading messages</li>
        </ol>
        <p><em>Generated by Adams Platform</em></p>
      `,
    },
    start: { dateTime: `${date}T${startTime}:00`, timeZone },
    end: { dateTime: `${date}T${endTime}:00`, timeZone },
    attendees: attendees.map((email) => ({
      emailAddress: { address: email },
      type: "required",
    })),
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
    reminderMinutesBeforeStart: 15,
    recurrence: {
      pattern: {
        type: "weekly",
        interval: 1,
        daysOfWeek: [getDayOfWeek(date)],
      },
      range: {
        type: "noEnd",
        startDate: date,
      },
    },
  };

  return client.createCalendarEvent(event);
}

/**
 * Send a Traction notification email
 */
export async function sendTractionNotificationEmail(
  client: MicrosoftGraphClient,
  to: string[],
  subject: string,
  htmlContent: string
): Promise<MSGraphResponse<void>> {
  const email: MSEmail = {
    subject: `[Adams Traction] ${subject}`,
    body: {
      contentType: "html",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          ${htmlContent}
          <hr style="margin-top: 20px; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Sent from Adams Platform - Traction Dashboard
          </p>
        </div>
      `,
    },
    toRecipients: to.map((address) => ({ emailAddress: { address } })),
    importance: "normal",
  };

  return client.sendEmail(email);
}

/**
 * Create a Traction folder in OneDrive
 */
export async function createTractionFolderStructure(
  client: MicrosoftGraphClient
): Promise<MSGraphResponse<{ rootId: string; folders: Record<string, string> }>> {
  // Create main Traction folder
  const rootResult = await client.createFolder("Adams Traction");
  if (!rootResult.success || !rootResult.data) {
    return { success: false, error: rootResult.error };
  }

  const rootId = rootResult.data.id;
  const folders: Record<string, string> = { root: rootId };

  // Create subfolders
  const subfolders = ["Rocks", "Meetings", "Issues", "Documents", "Reports"];
  for (const name of subfolders) {
    const result = await client.createFolder(name, rootId);
    if (result.success && result.data) {
      folders[name.toLowerCase()] = result.data.id;
    }
  }

  return { success: true, data: { rootId, folders } };
}

// Helper function
function getDayOfWeek(dateString: string): "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" {
  const days: ("sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday")[] = 
    ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const date = new Date(dateString);
  return days[date.getDay()];
}

// Default scopes for Traction integration
export const TRACTION_MS_SCOPES = [
  "User.Read",
  "Mail.Send",
  "Mail.Read",
  "Calendars.ReadWrite",
  "Sites.Read.All",
  "Sites.ReadWrite.All",
  "Files.ReadWrite.All",
  "OnlineMeetings.ReadWrite",
];
