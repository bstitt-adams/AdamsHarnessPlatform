/**
 * Traction Webhook Service
 * 
 * Provides functions to send Traction/EOS events to Mattermost
 * when actions occur in the Traction Dashboard
 */

import { sendWebhookNotification, WebhookEventType } from "./mattermost";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { COLLECTIONS } from "./schema";

// Types for Traction entities (with index signature for Record<string, unknown> compatibility)
export interface TractionRockData {
  [key: string]: unknown;
  description: string;
  owner: string;
  quarter: string;
  dueDate: string;
  status: string;
  progress: number;
  previousStatus?: string;
}

export interface TractionMetricData {
  [key: string]: unknown;
  name: string;
  owner: string;
  goal: number;
  actual: number;
  unit?: string;
  trend: string;
}

export interface TractionIssueData {
  [key: string]: unknown;
  description: string;
  owner: string;
  priority: string;
  identifiedDate: string;
  status?: string;
}

export interface TractionTodoData {
  [key: string]: unknown;
  description: string;
  owner: string;
  dueDate: string;
  status?: string;
  daysOverdue?: number;
}

export interface TractionMeetingData {
  [key: string]: unknown;
  date: string;
  rating: number;
  issuesSolved: number;
  todoCompletionRate: number;
  rocksReviewed: boolean;
  scorecardReviewed: boolean;
}

export interface TractionTeamMemberData {
  [key: string]: unknown;
  name: string;
  role: string;
  category: string;
  getsIt?: boolean | null;
  wantsIt?: boolean | null;
  capacityToDoIt?: boolean | null;
  rightSeat?: boolean | null;
}

/**
 * Get the Mattermost webhook URL from platform settings
 */
async function getWebhookUrl(): Promise<string | null> {
  if (!db) return null;
  
  try {
    const settingsRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, "default");
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      return data?.integrations?.mattermost?.webhookUrl || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching webhook URL:", error);
    return null;
  }
}

/**
 * Check if a specific event type is enabled
 */
async function isEventEnabled(eventType: WebhookEventType): Promise<boolean> {
  if (!db) return false;
  
  try {
    const settingsRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, "default");
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      const webhookEvents = data?.webhookEvents || {};
      // Default to true if not explicitly set to false
      return webhookEvents[eventType] !== false;
    }
    return true; // Default enabled
  } catch (error) {
    console.error("Error checking event enabled status:", error);
    return false;
  }
}

/**
 * Send a Traction webhook notification
 */
async function sendTractionWebhook(
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if event is enabled
    const enabled = await isEventEnabled(eventType);
    if (!enabled) {
      return { success: true }; // Silently skip disabled events
    }

    // Get webhook URL
    const webhookUrl = await getWebhookUrl();
    if (!webhookUrl) {
      return { success: false, error: "Webhook URL not configured" };
    }

    // Send the notification
    return await sendWebhookNotification(webhookUrl, eventType, data);
  } catch (error) {
    console.error(`Error sending ${eventType} webhook:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// ============================================================================
// ROCK EVENTS
// ============================================================================

/**
 * Send notification when a new Rock is created
 */
export async function notifyRockCreated(rock: TractionRockData) {
  return sendTractionWebhook("rock_created", rock);
}

/**
 * Send notification when a Rock's status changes
 */
export async function notifyRockStatusChanged(
  rock: TractionRockData,
  previousStatus: string
) {
  // Determine which specific event to send
  let eventType: WebhookEventType = "rock_status_changed";
  
  if (rock.status === "complete") {
    eventType = "rock_completed";
  } else if (rock.status === "at-risk" && previousStatus !== "at-risk") {
    eventType = "rock_at_risk";
  } else if (rock.status === "off-track" && previousStatus !== "off-track") {
    eventType = "rock_off_track";
  }

  return sendTractionWebhook(eventType, {
    ...rock,
    previousStatus,
    newStatus: rock.status,
  });
}

/**
 * Send notification when a Rock is completed
 */
export async function notifyRockCompleted(rock: TractionRockData) {
  return sendTractionWebhook("rock_completed", rock);
}

// ============================================================================
// SCORECARD EVENTS
// ============================================================================

/**
 * Send notification when a scorecard metric is updated
 */
export async function notifyMetricUpdated(metric: TractionMetricData) {
  // Determine if below or above goal
  let eventType: WebhookEventType = "scorecard_updated";
  
  if (metric.actual < metric.goal) {
    eventType = "scorecard_below_goal";
  } else if (metric.actual > metric.goal) {
    eventType = "scorecard_above_goal";
  }

  return sendTractionWebhook(eventType, metric);
}

/**
 * Send notification when a metric falls below goal
 */
export async function notifyMetricBelowGoal(metric: TractionMetricData) {
  return sendTractionWebhook("scorecard_below_goal", metric);
}

// ============================================================================
// ISSUE EVENTS
// ============================================================================

/**
 * Send notification when a new issue is created
 */
export async function notifyIssueCreated(issue: TractionIssueData) {
  return sendTractionWebhook("issue_created", issue);
}

/**
 * Send notification when an issue is solved
 */
export async function notifyIssueSolved(issue: TractionIssueData) {
  return sendTractionWebhook("issue_solved", issue);
}

// ============================================================================
// TODO EVENTS
// ============================================================================

/**
 * Send notification when a new to-do is created
 */
export async function notifyTodoCreated(todo: TractionTodoData) {
  return sendTractionWebhook("todo_created", todo);
}

/**
 * Send notification when a to-do is completed
 */
export async function notifyTodoCompleted(todo: TractionTodoData) {
  return sendTractionWebhook("todo_completed", todo);
}

/**
 * Send notification when a to-do is overdue
 */
export async function notifyTodoOverdue(todo: TractionTodoData) {
  return sendTractionWebhook("todo_overdue", todo);
}

// ============================================================================
// MEETING EVENTS
// ============================================================================

/**
 * Send notification when a Level 10 meeting is logged
 */
export async function notifyMeetingLogged(meeting: TractionMeetingData) {
  return sendTractionWebhook("level10_meeting_logged", meeting);
}

// ============================================================================
// TEAM MEMBER EVENTS
// ============================================================================

/**
 * Send notification when a team member is added
 */
export async function notifyTeamMemberAdded(member: TractionTeamMemberData) {
  return sendTractionWebhook("team_member_added", member);
}

/**
 * Send notification when a team member's GWC is updated
 */
export async function notifyGwcUpdated(member: TractionTeamMemberData) {
  return sendTractionWebhook("team_member_gwc_updated", member);
}

// ============================================================================
// BATCH/SCHEDULED NOTIFICATIONS
// ============================================================================

/**
 * Check all to-dos and send notifications for overdue items
 * This should be called by a scheduled job (e.g., daily)
 */
export async function checkOverdueTodos(todos: TractionTodoData[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = [];
  
  for (const todo of todos) {
    if (todo.status === "complete") continue;
    
    const dueDate = new Date(todo.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      results.push(await notifyTodoOverdue({ ...todo, daysOverdue }));
    }
  }
  
  return results;
}

/**
 * Check all metrics and send notifications for those below goal
 * This should be called by a scheduled job (e.g., weekly)
 */
export async function checkMetricsBelowGoal(metrics: TractionMetricData[]) {
  const results = [];
  
  for (const metric of metrics) {
    if (metric.actual < metric.goal) {
      results.push(await notifyMetricBelowGoal(metric));
    }
  }
  
  return results;
}

/**
 * Check all rocks and send notifications for at-risk or off-track items
 * This should be called by a scheduled job (e.g., weekly)
 */
export async function checkRocksAtRisk(rocks: TractionRockData[]) {
  const results = [];
  
  for (const rock of rocks) {
    if (rock.status === "at-risk") {
      results.push(await sendTractionWebhook("rock_at_risk", rock));
    } else if (rock.status === "off-track") {
      results.push(await sendTractionWebhook("rock_off_track", rock));
    }
  }
  
  return results;
}
