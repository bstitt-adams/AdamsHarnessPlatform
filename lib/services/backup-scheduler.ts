/**
 * Backup Scheduler Service
 * Handles scheduled backups with cron expressions and Google Drive integration
 */

import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { COLLECTIONS, type BackupScheduleDoc } from "@/lib/schema";

// ============================================================================
// Types
// ============================================================================

export interface ScheduleConfig {
  name: string;
  description?: string;
  frequency: "hourly" | "daily" | "weekly" | "monthly" | "custom";
  cronExpression?: string;
  time?: string; // HH:MM format for daily/weekly/monthly
  dayOfWeek?: number; // 0-6 for weekly (0 = Sunday)
  dayOfMonth?: number; // 1-31 for monthly
  timezone: string;
  backupType: "full" | "incremental" | "collections";
  collections?: string[];
  storageProviders: string[];
  retentionPolicy: {
    keepLast: number;
    keepDailyFor: number;
    keepWeeklyFor: number;
    keepMonthlyFor: number;
  };
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    emails: string[];
  };
}

export interface ScheduleStatus {
  id: string;
  name: string;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastStatus?: "success" | "failed" | "partial";
  lastError?: string;
}

// ============================================================================
// Cron Expression Helpers
// ============================================================================

/**
 * Generate cron expression from schedule config
 */
export function generateCronExpression(config: ScheduleConfig): string {
  const [hours, minutes] = (config.time || "02:00").split(":").map(Number);

  switch (config.frequency) {
    case "hourly":
      return `0 * * * *`; // Every hour at minute 0
    case "daily":
      return `${minutes} ${hours} * * *`; // Every day at specified time
    case "weekly":
      return `${minutes} ${hours} * * ${config.dayOfWeek || 0}`; // Weekly on specified day
    case "monthly":
      return `${minutes} ${hours} ${config.dayOfMonth || 1} * *`; // Monthly on specified day
    case "custom":
      return config.cronExpression || "0 2 * * *"; // Default to 2 AM daily
    default:
      return "0 2 * * *";
  }
}

/**
 * Parse cron expression to human-readable format
 */
export function describeCronExpression(cron: string): string {
  const parts = cron.split(" ");
  if (parts.length !== 5) return "Invalid cron expression";

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Hourly
  if (hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every hour at minute ${minute}`;
  }

  // Daily
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Daily at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }

  // Weekly
  if (dayOfMonth === "*" && month === "*" && dayOfWeek !== "*") {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = days[parseInt(dayOfWeek)] || dayOfWeek;
    return `Weekly on ${dayName} at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }

  // Monthly
  if (dayOfMonth !== "*" && month === "*" && dayOfWeek === "*") {
    return `Monthly on day ${dayOfMonth} at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }

  return `Custom: ${cron}`;
}

/**
 * Calculate next run time from cron expression
 */
export function getNextRunTime(cronExpression: string, timezone: string = "America/New_York"): Date {
  const now = new Date();
  const parts = cronExpression.split(" ");
  if (parts.length !== 5) return now;

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;

  // Simple calculation for common patterns
  const nextRun = new Date(now);

  // Set time
  if (hour !== "*") {
    nextRun.setHours(parseInt(hour));
  }
  if (minute !== "*") {
    nextRun.setMinutes(parseInt(minute));
  }
  nextRun.setSeconds(0);
  nextRun.setMilliseconds(0);

  // If time has passed today, move to next occurrence
  if (nextRun <= now) {
    if (hour === "*") {
      // Hourly - next hour
      nextRun.setHours(nextRun.getHours() + 1);
    } else if (dayOfWeek !== "*") {
      // Weekly - next week
      nextRun.setDate(nextRun.getDate() + 7);
    } else if (dayOfMonth !== "*") {
      // Monthly - next month
      nextRun.setMonth(nextRun.getMonth() + 1);
    } else {
      // Daily - tomorrow
      nextRun.setDate(nextRun.getDate() + 1);
    }
  }

  // Adjust for day of week
  if (dayOfWeek !== "*") {
    const targetDay = parseInt(dayOfWeek);
    const currentDay = nextRun.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    if (daysUntilTarget > 0 || nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + (daysUntilTarget || 7));
    }
  }

  // Adjust for day of month
  if (dayOfMonth !== "*") {
    nextRun.setDate(parseInt(dayOfMonth));
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }
  }

  return nextRun;
}

// ============================================================================
// Backup Scheduler Class
// ============================================================================

export class BackupScheduler {
  /**
   * Create a new backup schedule
   */
  async createSchedule(config: ScheduleConfig, createdBy: string): Promise<string> {
    if (!db) throw new Error("Database not initialized");

    const scheduleId = `schedule-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const cronExpression = generateCronExpression(config);
    const nextRunAt = getNextRunTime(cronExpression, config.timezone);

    const scheduleDoc: BackupScheduleDoc = {
      id: scheduleId,
      name: config.name,
      description: config.description,
      cronExpression,
      timezone: config.timezone,
      enabled: true,
      backupType: config.backupType,
      collections: config.collections,
      storageProviders: config.storageProviders,
      compression: "gzip",
      encryption: false,
      retentionPolicy: config.retentionPolicy,
      notifications: config.notifications,
      nextRunAt: Timestamp.fromDate(nextRunAt),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy,
    };

    await setDoc(doc(db, COLLECTIONS.BACKUP_SCHEDULES, scheduleId), scheduleDoc);

    return scheduleId;
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ScheduleConfig>
  ): Promise<void> {
    if (!db) throw new Error("Database not initialized");

    const docRef = doc(db, COLLECTIONS.BACKUP_SCHEDULES, scheduleId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Schedule not found");
    }

    const existingSchedule = docSnap.data() as BackupScheduleDoc;
    const updateData: Partial<BackupScheduleDoc> = {
      updatedAt: Timestamp.now(),
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.backupType) updateData.backupType = updates.backupType;
    if (updates.collections) updateData.collections = updates.collections;
    if (updates.storageProviders) updateData.storageProviders = updates.storageProviders;
    if (updates.retentionPolicy) updateData.retentionPolicy = updates.retentionPolicy;
    if (updates.notifications) updateData.notifications = updates.notifications;

    // Recalculate cron if frequency changed
    if (updates.frequency || updates.time || updates.dayOfWeek || updates.dayOfMonth) {
      const newConfig: ScheduleConfig = {
        name: updates.name || existingSchedule.name,
        frequency: updates.frequency || "daily",
        time: updates.time,
        dayOfWeek: updates.dayOfWeek,
        dayOfMonth: updates.dayOfMonth,
        timezone: updates.timezone || existingSchedule.timezone,
        backupType: updates.backupType || existingSchedule.backupType,
        storageProviders: updates.storageProviders || existingSchedule.storageProviders,
        retentionPolicy: updates.retentionPolicy || existingSchedule.retentionPolicy,
        notifications: updates.notifications || existingSchedule.notifications,
        cronExpression: updates.cronExpression,
      };

      updateData.cronExpression = generateCronExpression(newConfig);
      updateData.timezone = newConfig.timezone;
      updateData.nextRunAt = Timestamp.fromDate(
        getNextRunTime(updateData.cronExpression, newConfig.timezone)
      );
    }

    await updateDoc(docRef, updateData);
  }

  /**
   * Enable or disable a schedule
   */
  async setScheduleEnabled(scheduleId: string, enabled: boolean): Promise<void> {
    if (!db) throw new Error("Database not initialized");

    const docRef = doc(db, COLLECTIONS.BACKUP_SCHEDULES, scheduleId);
    
    const updates: Partial<BackupScheduleDoc> = {
      enabled,
      updatedAt: Timestamp.now(),
    };

    if (enabled) {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const schedule = docSnap.data() as BackupScheduleDoc;
        updates.nextRunAt = Timestamp.fromDate(
          getNextRunTime(schedule.cronExpression, schedule.timezone)
        );
      }
    }

    await updateDoc(docRef, updates);
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    await deleteDoc(doc(db, COLLECTIONS.BACKUP_SCHEDULES, scheduleId));
  }

  /**
   * Get all schedules
   */
  async listSchedules(): Promise<BackupScheduleDoc[]> {
    if (!db) throw new Error("Database not initialized");

    const schedulesRef = collection(db, COLLECTIONS.BACKUP_SCHEDULES);
    const q = query(schedulesRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const schedules: BackupScheduleDoc[] = [];
    snapshot.forEach((doc) => {
      schedules.push(doc.data() as BackupScheduleDoc);
    });

    return schedules;
  }

  /**
   * Get a specific schedule
   */
  async getSchedule(scheduleId: string): Promise<BackupScheduleDoc | null> {
    if (!db) throw new Error("Database not initialized");

    const docRef = doc(db, COLLECTIONS.BACKUP_SCHEDULES, scheduleId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;
    return docSnap.data() as BackupScheduleDoc;
  }

  /**
   * Get schedules that are due to run
   */
  async getDueSchedules(): Promise<BackupScheduleDoc[]> {
    if (!db) throw new Error("Database not initialized");

    const now = Timestamp.now();
    const schedulesRef = collection(db, COLLECTIONS.BACKUP_SCHEDULES);
    const q = query(
      schedulesRef,
      where("enabled", "==", true),
      where("nextRunAt", "<=", now)
    );

    const snapshot = await getDocs(q);
    const schedules: BackupScheduleDoc[] = [];
    snapshot.forEach((doc) => {
      schedules.push(doc.data() as BackupScheduleDoc);
    });

    return schedules;
  }

  /**
   * Mark schedule as run and update next run time
   */
  async markScheduleRun(
    scheduleId: string,
    status: "success" | "failed" | "partial",
    error?: string
  ): Promise<void> {
    if (!db) throw new Error("Database not initialized");

    const docRef = doc(db, COLLECTIONS.BACKUP_SCHEDULES, scheduleId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return;

    const schedule = docSnap.data() as BackupScheduleDoc;
    const nextRunAt = getNextRunTime(schedule.cronExpression, schedule.timezone);

    const updates: Record<string, any> = {
      lastRunAt: Timestamp.now(),
      nextRunAt: Timestamp.fromDate(nextRunAt),
      updatedAt: Timestamp.now(),
    };

    if (error) {
      updates.lastError = error;
    }

    await updateDoc(docRef, updates);
  }
}

// Export singleton instance
export const backupScheduler = new BackupScheduler();

// Export timezone options
export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];
