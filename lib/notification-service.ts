/**
 * Comprehensive Notification Service
 * 
 * Provides centralized notification management for all platform features.
 * Supports in-app toasts, browser notifications, and calendar event alerts.
 */

import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { COLLECTIONS, type CalendarEventDoc } from "@/lib/schema";
import { toast } from "sonner";

// Notification Types
export type NotificationType =
  | "calendar_reminder"
  | "calendar_event_start"
  | "meeting_reminder"
  | "rock_due"
  | "rock_status"
  | "todo_due"
  | "todo_overdue"
  | "issue_created"
  | "issue_resolved"
  | "opportunity_update"
  | "project_update"
  | "deal_update"
  | "event_registration"
  | "event_reminder"
  | "team_update"
  | "system_alert"
  | "custom";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface PlatformNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  dismissed: boolean;
  // Timing
  createdAt: Timestamp;
  scheduledFor?: Timestamp; // For scheduled notifications
  expiresAt?: Timestamp;
  // Source reference
  sourceType?: string; // e.g., "calendar", "rock", "meeting"
  sourceId?: string;
  sourceUrl?: string; // Link to navigate to
  // User targeting
  userId?: string;
  teamId?: string;
  // Actions
  actions?: {
    label: string;
    action: string; // Action identifier
    url?: string;
  }[];
  // Metadata
  metadata?: Record<string, unknown>;
}

// Notification styling
const NOTIFICATION_STYLES: Record<NotificationType, { icon: string; color: string }> = {
  calendar_reminder: { icon: "📅", color: "blue" },
  calendar_event_start: { icon: "🔔", color: "green" },
  meeting_reminder: { icon: "👥", color: "purple" },
  rock_due: { icon: "🎯", color: "orange" },
  rock_status: { icon: "📊", color: "blue" },
  todo_due: { icon: "✅", color: "yellow" },
  todo_overdue: { icon: "⚠️", color: "red" },
  issue_created: { icon: "🐛", color: "red" },
  issue_resolved: { icon: "✨", color: "green" },
  opportunity_update: { icon: "💼", color: "blue" },
  project_update: { icon: "📁", color: "purple" },
  deal_update: { icon: "💰", color: "green" },
  event_registration: { icon: "🎟️", color: "purple" },
  event_reminder: { icon: "📣", color: "orange" },
  team_update: { icon: "👤", color: "blue" },
  system_alert: { icon: "⚙️", color: "gray" },
  custom: { icon: "📢", color: "blue" },
};

/**
 * Create a new notification
 */
export async function createNotification(
  notification: Omit<PlatformNotification, "id" | "createdAt" | "read" | "dismissed">
): Promise<string | null> {
  if (!db) return null;

  try {
    const notificationData = {
      ...notification,
      read: false,
      dismissed: false,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(db, COLLECTIONS.PLATFORM_SETTINGS, "global", "notifications"),
      notificationData
    );

    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

/**
 * Show an immediate popup notification (toast)
 */
export function showPopupNotification(
  type: NotificationType,
  title: string,
  message: string,
  options?: {
    duration?: number;
    action?: { label: string; onClick: () => void };
    priority?: NotificationPriority;
  }
): void {
  const style = NOTIFICATION_STYLES[type];
  const { duration = 5000, action, priority = "medium" } = options || {};

  const toastOptions: Parameters<typeof toast>[1] = {
    description: message,
    duration: priority === "urgent" ? 10000 : duration,
  };

  if (action) {
    toastOptions.action = {
      label: action.label,
      onClick: action.onClick,
    };
  }

  // Choose toast variant based on priority
  switch (priority) {
    case "urgent":
      toast.error(`${style.icon} ${title}`, toastOptions);
      break;
    case "high":
      toast.warning(`${style.icon} ${title}`, toastOptions);
      break;
    case "low":
      toast.info(`${style.icon} ${title}`, toastOptions);
      break;
    default:
      toast(`${style.icon} ${title}`, toastOptions);
  }
}

/**
 * Show browser notification (requires permission)
 */
export async function showBrowserNotification(
  title: string,
  message: string,
  options?: {
    icon?: string;
    tag?: string;
    onClick?: () => void;
  }
): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  const notification = new Notification(title, {
    body: message,
    icon: options?.icon || "/images/adamselectric_logo.png",
    tag: options?.tag,
  });

  if (options?.onClick) {
    notification.onclick = () => {
      window.focus();
      options.onClick?.();
      notification.close();
    };
  }

  return true;
}

/**
 * Calendar Event Reminder Service
 * Monitors upcoming calendar events and triggers reminders
 */
export class CalendarReminderService {
  private checkInterval: NodeJS.Timeout | null = null;
  private notifiedEvents: Set<string> = new Set();
  private reminderMinutes: number[] = [15, 5, 0]; // Remind at 15 min, 5 min, and at start

  constructor() {
    // Load notified events from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notified_calendar_events");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          this.notifiedEvents = new Set(parsed);
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  /**
   * Start monitoring calendar events
   */
  start(intervalMs: number = 60000): void {
    if (this.checkInterval) return;

    // Check immediately
    this.checkUpcomingEvents();

    // Then check periodically
    this.checkInterval = setInterval(() => {
      this.checkUpcomingEvents();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check for upcoming events and trigger reminders
   */
  private async checkUpcomingEvents(): Promise<void> {
    if (!db) return;

    const now = new Date();
    const maxLookahead = new Date(now.getTime() + 20 * 60 * 1000); // 20 minutes ahead

    try {
      const eventsRef = collection(db, COLLECTIONS.CALENDAR_EVENTS);
      const q = query(
        eventsRef,
        where("startDate", ">=", Timestamp.fromDate(now)),
        where("startDate", "<=", Timestamp.fromDate(maxLookahead)),
        orderBy("startDate", "asc")
      );

      const snapshot = await getDocs(q);

      snapshot.forEach((docSnap) => {
        const event = { id: docSnap.id, ...docSnap.data() } as CalendarEventDoc;
        this.processEventReminder(event, now);
      });
    } catch (error) {
      console.error("Error checking calendar events:", error);
    }
  }

  /**
   * Process a single event for reminders
   */
  private processEventReminder(event: CalendarEventDoc, now: Date): void {
    const eventStart = event.startDate.toDate();
    const minutesUntil = Math.floor((eventStart.getTime() - now.getTime()) / 60000);

    for (const reminderMinute of this.reminderMinutes) {
      const notificationKey = `${event.id}-${reminderMinute}`;

      // Skip if already notified
      if (this.notifiedEvents.has(notificationKey)) continue;

      // Check if we should notify
      if (minutesUntil <= reminderMinute && minutesUntil >= reminderMinute - 1) {
        this.triggerEventReminder(event, reminderMinute);
        this.notifiedEvents.add(notificationKey);
        this.saveNotifiedEvents();
      }
    }
  }

  /**
   * Trigger a reminder notification for an event
   */
  private triggerEventReminder(event: CalendarEventDoc, minutesBefore: number): void {
    const isStarting = minutesBefore === 0;
    const title = isStarting ? "Event Starting Now" : `Event in ${minutesBefore} minutes`;
    const message = event.title;

    // Show popup notification
    showPopupNotification(
      isStarting ? "calendar_event_start" : "calendar_reminder",
      title,
      message,
      {
        priority: isStarting ? "high" : "medium",
        duration: isStarting ? 10000 : 7000,
        action: event.location
          ? {
              label: "View Details",
              onClick: () => {
                window.location.href = "/portal/calendar";
              },
            }
          : undefined,
      }
    );

    // Also show browser notification
    showBrowserNotification(title, message, {
      tag: `calendar-${event.id}`,
      onClick: () => {
        window.location.href = "/portal/calendar";
      },
    });
  }

  /**
   * Save notified events to localStorage
   */
  private saveNotifiedEvents(): void {
    if (typeof window !== "undefined") {
      // Keep only recent entries (last 24 hours worth)
      const entries = Array.from(this.notifiedEvents).slice(-1000);
      localStorage.setItem("notified_calendar_events", JSON.stringify(entries));
    }
  }

  /**
   * Clear old notification records
   */
  clearOldRecords(): void {
    this.notifiedEvents.clear();
    if (typeof window !== "undefined") {
      localStorage.removeItem("notified_calendar_events");
    }
  }
}

// Singleton instance
let calendarReminderService: CalendarReminderService | null = null;

export function getCalendarReminderService(): CalendarReminderService {
  if (!calendarReminderService) {
    calendarReminderService = new CalendarReminderService();
  }
  return calendarReminderService;
}

/**
 * Feature-specific notification helpers
 */
export const NotificationHelpers = {
  // Calendar
  calendarEventReminder: (event: { title: string; startTime: Date; location?: string }) => {
    showPopupNotification("calendar_reminder", "Upcoming Event", event.title, {
      priority: "medium",
      action: {
        label: "View",
        onClick: () => (window.location.href = "/portal/calendar"),
      },
    });
  },

  // Meetings
  meetingReminder: (meeting: { title: string; startTime: Date; attendees?: string[] }) => {
    showPopupNotification("meeting_reminder", "Meeting Reminder", meeting.title, {
      priority: "high",
      action: {
        label: "Join",
        onClick: () => (window.location.href = "/portal/meetings"),
      },
    });
  },

  // Rocks
  rockDue: (rock: { title: string; dueDate: Date }) => {
    showPopupNotification("rock_due", "Rock Due Soon", rock.title, {
      priority: "high",
      action: {
        label: "View",
        onClick: () => (window.location.href = "/portal/rocks"),
      },
    });
  },

  rockStatusChange: (rock: { title: string; status: string }) => {
    showPopupNotification("rock_status", "Rock Status Updated", `${rock.title} is now ${rock.status}`, {
      priority: "medium",
    });
  },

  // Todos
  todoOverdue: (todo: { title: string }) => {
    showPopupNotification("todo_overdue", "Overdue Todo", todo.title, {
      priority: "urgent",
      action: {
        label: "Complete",
        onClick: () => (window.location.href = "/portal/rocks"),
      },
    });
  },

  // Issues
  issueCreated: (issue: { title: string; priority: string }) => {
    showPopupNotification("issue_created", "New Issue", issue.title, {
      priority: issue.priority === "high" ? "high" : "medium",
    });
  },

  issueResolved: (issue: { title: string }) => {
    showPopupNotification("issue_resolved", "Issue Resolved", issue.title, {
      priority: "low",
    });
  },

  // Opportunities
  opportunityUpdate: (opp: { title: string; stage: string }) => {
    showPopupNotification("opportunity_update", "Opportunity Update", `${opp.title} moved to ${opp.stage}`, {
      priority: "medium",
      action: {
        label: "View",
        onClick: () => (window.location.href = "/portal/opportunities"),
      },
    });
  },

  // Projects
  projectUpdate: (project: { title: string; update: string }) => {
    showPopupNotification("project_update", "Project Update", `${project.title}: ${project.update}`, {
      priority: "medium",
      action: {
        label: "View",
        onClick: () => (window.location.href = "/portal/projects"),
      },
    });
  },

  // Deals
  dealUpdate: (deal: { title: string; status: string }) => {
    showPopupNotification("deal_update", "Deal Update", `${deal.title} - ${deal.status}`, {
      priority: "medium",
      action: {
        label: "View",
        onClick: () => (window.location.href = "/portal/deals"),
      },
    });
  },

  // Events
  eventRegistration: (event: { title: string; attendeeName: string }) => {
    showPopupNotification("event_registration", "New Registration", `${event.attendeeName} registered for ${event.title}`, {
      priority: "medium",
      action: {
        label: "View",
        onClick: () => (window.location.href = "/portal/admin/events"),
      },
    });
  },

  eventReminder: (event: { title: string; startTime: Date }) => {
    showPopupNotification("event_reminder", "Event Reminder", event.title, {
      priority: "high",
      action: {
        label: "View",
        onClick: () => (window.location.href = "/portal/admin/events"),
      },
    });
  },

  // Team
  teamMemberUpdate: (update: { memberName: string; action: string }) => {
    showPopupNotification("team_update", "Team Update", `${update.memberName} ${update.action}`, {
      priority: "low",
    });
  },

  // System
  systemAlert: (alert: { title: string; message: string; priority?: NotificationPriority }) => {
    showPopupNotification("system_alert", alert.title, alert.message, {
      priority: alert.priority || "medium",
    });
  },
};
