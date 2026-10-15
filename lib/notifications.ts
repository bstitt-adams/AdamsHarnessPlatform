/**
 * In-Browser Notification System
 * 
 * Mirrors Mattermost notifications to in-browser toasts when the site is open.
 * Works alongside Mattermost webhooks to provide real-time notifications.
 */

import { toast } from "sonner";
import { WEBHOOK_EVENTS, type WebhookEventType } from "./mattermost";

export interface InAppNotification {
  id: string;
  type: WebhookEventType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

// Notification styling based on event type
const getNotificationStyle = (eventType: WebhookEventType): {
  icon: string;
  variant: "default" | "success" | "warning" | "error" | "info";
} => {
  switch (eventType) {
    // Success events
    case "rock_completed":
    case "issue_solved":
    case "todo_completed":
    case "meeting_completed":
    case "scorecard_above_goal":
      return { icon: "✅", variant: "success" };
    
    // Warning events
    case "rock_at_risk":
    case "todo_overdue":
    case "scorecard_below_goal":
      return { icon: "⚠️", variant: "warning" };
    
    // Error/Critical events
    case "rock_off_track":
      return { icon: "🚨", variant: "error" };
    
    // Info events
    case "new_lead":
    case "affiliate_joined":
    case "referral_submitted":
      return { icon: "🎉", variant: "info" };
    
    // Default events
    default:
      return { icon: "📢", variant: "default" };
  }
};

// Format notification title based on event type
const getNotificationTitle = (eventType: WebhookEventType): string => {
  const event = WEBHOOK_EVENTS.find(e => e.type === eventType);
  return event?.label || "Notification";
};

// Format notification message based on event type and data
const formatNotificationMessage = (
  eventType: WebhookEventType,
  data: Record<string, unknown>
): string => {
  switch (eventType) {
    case "new_lead":
      return `New lead: ${data.name || data.company || "Unknown"}`;
    
    case "deal_status_changed":
      return `Deal "${data.dealName || "Unknown"}" moved to ${data.newStatus || "new stage"}`;
    
    case "rock_created":
      return `New Rock: "${data.title || data.name || "Untitled"}"`;
    
    case "rock_status_changed":
      return `Rock "${data.title || data.name}" is now ${data.status}`;
    
    case "rock_completed":
      return `🎯 Rock completed: "${data.title || data.name}"`;
    
    case "rock_at_risk":
      return `Rock "${data.title || data.name}" is at risk`;
    
    case "rock_off_track":
      return `Rock "${data.title || data.name}" is off track!`;
    
    case "scorecard_updated":
      return `${data.metricName}: ${data.actual} (Goal: ${data.goal})`;
    
    case "scorecard_below_goal":
      return `⚠️ ${data.metricName} is below goal: ${data.actual} vs ${data.goal}`;
    
    case "scorecard_above_goal":
      return `✨ ${data.metricName} exceeded goal: ${data.actual} vs ${data.goal}`;
    
    case "issue_created":
      return `New issue: "${data.title || data.description || "Untitled"}"`;
    
    case "issue_solved":
      return `Issue resolved: "${data.title || data.description}"`;
    
    case "todo_created":
      return `New to-do: "${data.title || data.description}"`;
    
    case "todo_completed":
      return `To-do completed: "${data.title || data.description}"`;
    
    case "todo_overdue":
      return `⏰ To-do overdue: "${data.title || data.description}"`;
    
    case "level10_meeting_logged":
      return `Level 10 meeting logged for ${data.date || "today"}`;
    
    case "team_member_added":
      return `Welcome ${data.name || "new team member"}!`;
    
    case "affiliate_joined":
      return `New affiliate: ${data.name || data.company || "Unknown"}`;
    
    case "meeting_completed":
      return `Meeting completed: ${data.title || data.type || "Meeting"}`;
    
    case "referral_submitted":
      return `New referral from ${data.referrer || "affiliate"}`;
    
    case "send_to_brian_stitt":
      return String(data.message || "Direct message");
    
    default:
      return data.message ? String(data.message) : "New notification";
  }
};

/**
 * Show an in-browser notification toast
 * This mirrors the Mattermost notification
 */
export function showInAppNotification(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
  options?: {
    duration?: number;
    action?: { label: string; onClick: () => void };
  }
): void {
  const { icon, variant } = getNotificationStyle(eventType);
  const title = getNotificationTitle(eventType);
  const message = formatNotificationMessage(eventType, data);
  
  const toastOptions: Parameters<typeof toast>[1] = {
    description: message,
    duration: options?.duration || 5000,
  };
  
  if (options?.action) {
    toastOptions.action = {
      label: options.action.label,
      onClick: options.action.onClick,
    };
  }
  
  // Use appropriate toast variant
  switch (variant) {
    case "success":
      toast.success(`${icon} ${title}`, toastOptions);
      break;
    case "warning":
      toast.warning(`${icon} ${title}`, toastOptions);
      break;
    case "error":
      toast.error(`${icon} ${title}`, toastOptions);
      break;
    case "info":
      toast.info(`${icon} ${title}`, toastOptions);
      break;
    default:
      toast(`${icon} ${title}`, toastOptions);
  }
}

/**
 * Show a browser notification (requires permission)
 */
export async function showBrowserNotification(
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<boolean> {
  if (!("Notification" in window)) {
    return false;
  }
  
  if (Notification.permission === "denied") {
    return false;
  }
  
  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return false;
    }
  }
  
  const title = getNotificationTitle(eventType);
  const message = formatNotificationMessage(eventType, data);
  const { icon } = getNotificationStyle(eventType);
  
  new Notification(`${icon} ${title}`, {
    body: message,
    icon: "/images/adamselectric_logo.png",
    tag: eventType,
  });
  
  return true;
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!("Notification" in window)) {
    return "unsupported";
  }
  
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  
  return await Notification.requestPermission();
}

/**
 * Check if browser notifications are supported and enabled
 */
export function getBrowserNotificationStatus(): "granted" | "denied" | "default" | "unsupported" {
  if (!("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}
