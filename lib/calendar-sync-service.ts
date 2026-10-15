/**
 * Calendar Sync Service
 * 
 * Syncs meetings from the Adams Platform to multiple external calendars:
 * - Google Calendar
 * - Microsoft Office 365 Calendar
 * 
 * Meetings are created in the platform first, then pushed to both calendars.
 * Events are created with auto-accept (no response required from attendees).
 */

import { GoogleCalendarClient, GoogleCalendarEvent, GoogleCalendarTokens } from "./google-calendar";
import { MicrosoftGraphClient, MSCalendarEvent, MSGraphTokens } from "./microsoft-graph";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "./schema";

// Calendar integration configuration stored in Firestore
export interface CalendarIntegration {
  id: string;
  userId: string;
  provider: "google" | "microsoft";
  email: string;
  calendarId?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Meeting data from the platform
export interface PlatformMeeting {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  isOnlineMeeting?: boolean;
  timeZone?: string;
}

// Sync result
export interface CalendarSyncResult {
  success: boolean;
  googleEventId?: string;
  microsoftEventId?: string;
  errors?: string[];
}

/**
 * Get calendar integrations for a user
 */
export async function getCalendarIntegrations(userId: string): Promise<CalendarIntegration[]> {
  if (!db) return [];
  
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const userData = docSnap.data();
      return userData.calendarIntegrations || [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching calendar integrations:", error);
    return [];
  }
}

/**
 * Save calendar integration
 */
export async function saveCalendarIntegration(
  userId: string,
  integration: Omit<CalendarIntegration, "id" | "createdAt" | "updatedAt">
): Promise<boolean> {
  if (!db) return false;
  
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    
    const newIntegration: CalendarIntegration = {
      ...integration,
      id: `${integration.provider}-${Date.now()}`,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const integrations = userData.calendarIntegrations || [];
      
      // Check if integration already exists for this provider
      const existingIndex = integrations.findIndex(
        (i: CalendarIntegration) => i.provider === integration.provider && i.email === integration.email
      );
      
      if (existingIndex >= 0) {
        integrations[existingIndex] = {
          ...integrations[existingIndex],
          ...integration,
          updatedAt: Timestamp.now(),
        };
      } else {
        integrations.push(newIntegration);
      }
      
      await updateDoc(userRef, { calendarIntegrations: integrations });
    } else {
      await setDoc(userRef, { calendarIntegrations: [newIntegration] }, { merge: true });
    }
    
    return true;
  } catch (error) {
    console.error("Error saving calendar integration:", error);
    return false;
  }
}

/**
 * Convert platform meeting to Google Calendar event
 */
function toGoogleEvent(meeting: PlatformMeeting): GoogleCalendarEvent {
  return {
    summary: meeting.title,
    description: meeting.description,
    location: meeting.location,
    start: {
      dateTime: meeting.startTime.toISOString(),
      timeZone: meeting.timeZone || "America/New_York",
    },
    end: {
      dateTime: meeting.endTime.toISOString(),
      timeZone: meeting.timeZone || "America/New_York",
    },
    attendees: meeting.attendees?.map((email) => ({
      email,
      responseStatus: "accepted", // Auto-accept
    })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 15 },
        { method: "email", minutes: 60 },
      ],
    },
    status: "confirmed",
  };
}

/**
 * Convert platform meeting to Microsoft Calendar event
 */
function toMicrosoftEvent(meeting: PlatformMeeting): MSCalendarEvent {
  return {
    subject: meeting.title,
    body: meeting.description
      ? {
          contentType: "html",
          content: meeting.description,
        }
      : undefined,
    location: meeting.location
      ? {
          displayName: meeting.location,
        }
      : undefined,
    start: {
      dateTime: meeting.startTime.toISOString().replace("Z", ""),
      timeZone: meeting.timeZone || "America/New_York",
    },
    end: {
      dateTime: meeting.endTime.toISOString().replace("Z", ""),
      timeZone: meeting.timeZone || "America/New_York",
    },
    attendees: meeting.attendees?.map((email) => ({
      emailAddress: { address: email },
      type: "required",
    })),
    isOnlineMeeting: meeting.isOnlineMeeting,
    onlineMeetingProvider: meeting.isOnlineMeeting ? "teamsForBusiness" : undefined,
    reminderMinutesBeforeStart: 15,
  };
}

/**
 * Sync a meeting to all connected calendars
 */
export async function syncMeetingToCalendars(
  userId: string,
  meeting: PlatformMeeting
): Promise<CalendarSyncResult> {
  const result: CalendarSyncResult = {
    success: true,
    errors: [],
  };

  try {
    const integrations = await getCalendarIntegrations(userId);
    const activeIntegrations = integrations.filter((i) => i.isActive);

    if (activeIntegrations.length === 0) {
      return { success: true, errors: ["No active calendar integrations found"] };
    }

    for (const integration of activeIntegrations) {
      try {
        if (integration.provider === "google") {
          const client = new GoogleCalendarClient(integration.accessToken);
          const googleEvent = toGoogleEvent(meeting);
          
          const response = await client.createEvent(googleEvent, integration.calendarId || "primary", {
            sendUpdates: "none", // Don't send invites - auto-add to calendar
          });
          
          if (response.success && response.data) {
            result.googleEventId = response.data.id;
          } else {
            result.errors?.push(`Google Calendar: ${response.error}`);
          }
        } else if (integration.provider === "microsoft") {
          const client = new MicrosoftGraphClient(integration.accessToken);
          const msEvent = toMicrosoftEvent(meeting);
          
          const response = await client.createCalendarEvent(msEvent, integration.calendarId);
          
          if (response.success && response.data) {
            result.microsoftEventId = response.data.id;
          } else {
            result.errors?.push(`Microsoft Calendar: ${response.error}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        result.errors?.push(`${integration.provider}: ${errorMessage}`);
      }
    }

    result.success = result.errors?.length === 0;
    return result;
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Update a meeting on all connected calendars
 */
export async function updateMeetingOnCalendars(
  userId: string,
  meeting: PlatformMeeting,
  externalIds: { googleEventId?: string; microsoftEventId?: string }
): Promise<CalendarSyncResult> {
  const result: CalendarSyncResult = {
    success: true,
    errors: [],
  };

  try {
    const integrations = await getCalendarIntegrations(userId);
    const activeIntegrations = integrations.filter((i) => i.isActive);

    for (const integration of activeIntegrations) {
      try {
        if (integration.provider === "google" && externalIds.googleEventId) {
          const client = new GoogleCalendarClient(integration.accessToken);
          const googleEvent = toGoogleEvent(meeting);
          
          const response = await client.updateEvent(
            externalIds.googleEventId,
            googleEvent,
            integration.calendarId || "primary",
            { sendUpdates: "none" }
          );
          
          if (!response.success) {
            result.errors?.push(`Google Calendar: ${response.error}`);
          }
        } else if (integration.provider === "microsoft" && externalIds.microsoftEventId) {
          const client = new MicrosoftGraphClient(integration.accessToken);
          const msEvent = toMicrosoftEvent(meeting);
          
          const response = await client.updateCalendarEvent(
            externalIds.microsoftEventId,
            msEvent,
            integration.calendarId
          );
          
          if (!response.success) {
            result.errors?.push(`Microsoft Calendar: ${response.error}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        result.errors?.push(`${integration.provider}: ${errorMessage}`);
      }
    }

    result.success = result.errors?.length === 0;
    return result;
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Delete a meeting from all connected calendars
 */
export async function deleteMeetingFromCalendars(
  userId: string,
  externalIds: { googleEventId?: string; microsoftEventId?: string }
): Promise<CalendarSyncResult> {
  const result: CalendarSyncResult = {
    success: true,
    errors: [],
  };

  try {
    const integrations = await getCalendarIntegrations(userId);
    const activeIntegrations = integrations.filter((i) => i.isActive);

    for (const integration of activeIntegrations) {
      try {
        if (integration.provider === "google" && externalIds.googleEventId) {
          const client = new GoogleCalendarClient(integration.accessToken);
          
          const response = await client.deleteEvent(
            externalIds.googleEventId,
            integration.calendarId || "primary",
            { sendUpdates: "none" }
          );
          
          if (!response.success) {
            result.errors?.push(`Google Calendar: ${response.error}`);
          }
        } else if (integration.provider === "microsoft" && externalIds.microsoftEventId) {
          const client = new MicrosoftGraphClient(integration.accessToken);
          
          const response = await client.deleteCalendarEvent(
            externalIds.microsoftEventId,
            integration.calendarId
          );
          
          if (!response.success) {
            result.errors?.push(`Microsoft Calendar: ${response.error}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        result.errors?.push(`${integration.provider}: ${errorMessage}`);
      }
    }

    result.success = result.errors?.length === 0;
    return result;
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}
