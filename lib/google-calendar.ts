/**
 * Google Calendar API Integration
 * 
 * Provides integration with Google Calendar for:
 * - Creating calendar events
 * - Syncing meetings from the platform
 * - Auto-accepting meetings (no response required)
 * 
 * Uses Google Calendar API v3
 * Documentation: https://developers.google.com/calendar/api/v3/reference
 */

// Google Calendar API Types
export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleCalendarTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: {
    email: string;
    displayName?: string;
    responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
  }[];
  reminders?: {
    useDefault: boolean;
    overrides?: { method: "email" | "popup"; minutes: number }[];
  };
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: { type: "hangoutsMeet" };
    };
  };
  recurrence?: string[];
  colorId?: string;
  visibility?: "default" | "public" | "private" | "confidential";
  status?: "confirmed" | "tentative" | "cancelled";
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone: string;
  primary?: boolean;
  accessRole: "freeBusyReader" | "reader" | "writer" | "owner";
}

interface GoogleAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Google Calendar API Client
 */
export class GoogleCalendarClient {
  private accessToken: string;
  private baseUrl = "https://www.googleapis.com/calendar/v3";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    body?: unknown,
    queryParams?: Record<string, string>
  ): Promise<GoogleAPIResponse<T>> {
    try {
      let url = `${this.baseUrl}${endpoint}`;
      if (queryParams) {
        const params = new URLSearchParams(queryParams);
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
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
  // CALENDARS
  // =========================================================================

  async listCalendars(): Promise<GoogleAPIResponse<{ items: GoogleCalendar[] }>> {
    return this.request("/users/me/calendarList");
  }

  async getCalendar(calendarId: string = "primary"): Promise<GoogleAPIResponse<GoogleCalendar>> {
    return this.request(`/calendars/${encodeURIComponent(calendarId)}`);
  }

  // =========================================================================
  // EVENTS
  // =========================================================================

  async listEvents(
    calendarId: string = "primary",
    options?: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      singleEvents?: boolean;
      orderBy?: "startTime" | "updated";
    }
  ): Promise<GoogleAPIResponse<{ items: GoogleCalendarEvent[] }>> {
    const queryParams: Record<string, string> = {};
    if (options?.timeMin) queryParams.timeMin = options.timeMin;
    if (options?.timeMax) queryParams.timeMax = options.timeMax;
    if (options?.maxResults) queryParams.maxResults = options.maxResults.toString();
    if (options?.singleEvents !== undefined) queryParams.singleEvents = options.singleEvents.toString();
    if (options?.orderBy) queryParams.orderBy = options.orderBy;

    return this.request(`/calendars/${encodeURIComponent(calendarId)}/events`, "GET", undefined, queryParams);
  }

  async getEvent(
    eventId: string,
    calendarId: string = "primary"
  ): Promise<GoogleAPIResponse<GoogleCalendarEvent>> {
    return this.request(`/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`);
  }

  async createEvent(
    event: GoogleCalendarEvent,
    calendarId: string = "primary",
    options?: {
      sendUpdates?: "all" | "externalOnly" | "none";
      conferenceDataVersion?: number;
    }
  ): Promise<GoogleAPIResponse<GoogleCalendarEvent>> {
    const queryParams: Record<string, string> = {};
    if (options?.sendUpdates) queryParams.sendUpdates = options.sendUpdates;
    if (options?.conferenceDataVersion !== undefined) {
      queryParams.conferenceDataVersion = options.conferenceDataVersion.toString();
    }

    return this.request(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      "POST",
      event,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );
  }

  async updateEvent(
    eventId: string,
    event: Partial<GoogleCalendarEvent>,
    calendarId: string = "primary",
    options?: {
      sendUpdates?: "all" | "externalOnly" | "none";
    }
  ): Promise<GoogleAPIResponse<GoogleCalendarEvent>> {
    const queryParams: Record<string, string> = {};
    if (options?.sendUpdates) queryParams.sendUpdates = options.sendUpdates;

    return this.request(
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      "PATCH",
      event,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );
  }

  async deleteEvent(
    eventId: string,
    calendarId: string = "primary",
    options?: {
      sendUpdates?: "all" | "externalOnly" | "none";
    }
  ): Promise<GoogleAPIResponse<void>> {
    const queryParams: Record<string, string> = {};
    if (options?.sendUpdates) queryParams.sendUpdates = options.sendUpdates;

    return this.request(
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      "DELETE",
      undefined,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );
  }

  /**
   * Create an event with Google Meet conference
   */
  async createEventWithMeet(
    event: Omit<GoogleCalendarEvent, "conferenceData">,
    calendarId: string = "primary"
  ): Promise<GoogleAPIResponse<GoogleCalendarEvent>> {
    const eventWithMeet: GoogleCalendarEvent = {
      ...event,
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    return this.createEvent(eventWithMeet, calendarId, { conferenceDataVersion: 1 });
  }

  /**
   * Quick add event using natural language
   */
  async quickAdd(
    text: string,
    calendarId: string = "primary"
  ): Promise<GoogleAPIResponse<GoogleCalendarEvent>> {
    return this.request(
      `/calendars/${encodeURIComponent(calendarId)}/events/quickAdd`,
      "POST",
      undefined,
      { text }
    );
  }
}

// ============================================================================
// OAUTH HELPERS
// ============================================================================

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(config: GoogleCalendarConfig, state?: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: state || "",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGoogleCode(
  config: GoogleCalendarConfig,
  code: string
): Promise<GoogleAPIResponse<GoogleCalendarTokens>> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

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
export async function refreshGoogleToken(
  config: GoogleCalendarConfig,
  refreshToken: string
): Promise<GoogleAPIResponse<GoogleCalendarTokens>> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

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

// Default scopes for calendar integration
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];
