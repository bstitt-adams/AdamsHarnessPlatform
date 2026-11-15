import type { Timestamp } from "firebase/firestore";

/**
 * Single source of truth for certification reminder cadence.
 * Stages: heads-up at 30/14/7 days before expiry, daily once expired
 * (supervisor cc'd), escalation to the Safety department after 14 days
 * overdue.
 */
export const REMINDER_DAYS_BEFORE = [30, 14, 7] as const;
export const OVERDUE_REPEAT_DAYS = 1;
export const SUPERVISOR_ESCALATE_AFTER_DAYS = 0;
export const SAFETY_ESCALATE_AFTER_DAYS = 14;
export const TRACKING_WINDOW_DAYS = 60;

export type ReminderStage =
  | "due_30"
  | "due_14"
  | "due_7"
  | "overdue"
  | "safety_escalation";

export const REMINDER_STAGE_LABELS: Record<ReminderStage, string> = {
  due_30: "30-day notice",
  due_14: "14-day notice",
  due_7: "7-day notice",
  overdue: "Overdue (daily)",
  safety_escalation: "Safety escalation",
};

/** Which reminder stage applies to a cert right now (null = none). */
export function computeReminderStage(daysUntilExpiry: number | null): ReminderStage | null {
  if (daysUntilExpiry === null) return null;
  if (daysUntilExpiry < 0) {
    return Math.abs(daysUntilExpiry) >= SAFETY_ESCALATE_AFTER_DAYS
      ? "safety_escalation"
      : "overdue";
  }
  if (daysUntilExpiry <= 7) return "due_7";
  if (daysUntilExpiry <= 14) return "due_14";
  if (daysUntilExpiry <= 30) return "due_30";
  return null;
}

type TimestampLike = Timestamp | { toMillis(): number } | string | Date | undefined;

function stageSentMillis(value: TimestampLike): number | null {
  if (!value) return null;
  if (typeof value === "string") return Date.parse(value);
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === "function") return value.toMillis();
  return null;
}

/**
 * Whether a stage should send now. Fixed stages (30/14/7, safety_escalation)
 * send once; "overdue" repeats every OVERDUE_REPEAT_DAYS.
 */
export function shouldSendStage(
  stage: ReminderStage,
  remindersSent: Record<string, TimestampLike> | undefined,
  nowMs: number,
): boolean {
  const sentMs = stageSentMillis(remindersSent?.[stage]);
  if (stage === "overdue") {
    if (sentMs === null) return true;
    return nowMs - sentMs >= OVERDUE_REPEAT_DAYS * 24 * 60 * 60 * 1000;
  }
  // Fixed stages also re-send if an earlier stage was sent but this window's
  // stage was skipped (e.g., cert created already inside the 7-day window).
  return sentMs === null;
}
