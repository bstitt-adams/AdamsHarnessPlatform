/**
 * Firebase Migration Utility
 * 
 * Migrates localStorage data to Firebase Firestore
 * Handles AI Workforce employees, chats, and notification settings
 */

import { db } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  writeBatch,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import type { AIEmployee } from "./ai-workforce";

// LocalStorage keys used in the application
const LOCAL_STORAGE_KEYS = {
  AI_EMPLOYEES: "adams_ai_employees",
  AI_CHATS: "adams_ai_chats",
  NOTIFICATION_SETTINGS: "adams_notification_settings",
  REMEMBERED_EMAIL: "adams_remembered_email",
  REMEMBER_ME: "adams_remember_me",
} as const;

// Firestore collection names
const COLLECTIONS = {
  AI_EMPLOYEES: "aiEmployees",
  AI_CHATS: "aiChats",
  USER_SETTINGS: "userSettings",
} as const;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  meetingReminders: boolean;
  taskReminders: boolean;
  referralAlerts: boolean;
  systemUpdates: boolean;
}

interface MigrationResult {
  success: boolean;
  migratedItems: {
    aiEmployees: number;
    aiChats: number;
    notificationSettings: boolean;
  };
  errors: string[];
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const test = "__storage_test__";
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get data from localStorage safely
 */
function getLocalStorageData<T>(key: string): T | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading localStorage key ${key}:`, error);
    return null;
  }
}

/**
 * Migrate AI Employees to Firestore
 */
async function migrateAIEmployees(userId: string): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  if (!db) {
    errors.push("Firebase not initialized");
    return { count, errors };
  }

  const employees = getLocalStorageData<AIEmployee[]>(LOCAL_STORAGE_KEYS.AI_EMPLOYEES);
  if (!employees || employees.length === 0) {
    return { count: 0, errors: [] };
  }

  try {
    const batch = writeBatch(db);
    
    for (const employee of employees) {
      const docRef = doc(db, COLLECTIONS.AI_EMPLOYEES, `${userId}_${employee.id}`);
      batch.set(docRef, {
        ...employee,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        migratedFromLocalStorage: true,
      });
      count++;
    }

    await batch.commit();
    console.log(`Migrated ${count} AI employees to Firestore`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    errors.push(`Failed to migrate AI employees: ${errorMsg}`);
    console.error("Error migrating AI employees:", error);
  }

  return { count, errors };
}

/**
 * Migrate AI Chats to Firestore
 */
async function migrateAIChats(userId: string): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  if (!db) {
    errors.push("Firebase not initialized");
    return { count, errors };
  }

  const chats = getLocalStorageData<Record<string, ChatMessage[]>>(LOCAL_STORAGE_KEYS.AI_CHATS);
  if (!chats || Object.keys(chats).length === 0) {
    return { count: 0, errors: [] };
  }

  try {
    const batch = writeBatch(db);

    for (const [employeeId, messages] of Object.entries(chats)) {
      const docRef = doc(db, COLLECTIONS.AI_CHATS, `${userId}_${employeeId}`);
      
      // Convert timestamps to Firestore format
      const formattedMessages = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date 
          ? Timestamp.fromDate(msg.timestamp)
          : Timestamp.fromDate(new Date(msg.timestamp)),
      }));

      batch.set(docRef, {
        userId,
        employeeId,
        messages: formattedMessages,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        migratedFromLocalStorage: true,
      });
      count++;
    }

    await batch.commit();
    console.log(`Migrated ${count} AI chat histories to Firestore`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    errors.push(`Failed to migrate AI chats: ${errorMsg}`);
    console.error("Error migrating AI chats:", error);
  }

  return { count, errors };
}

/**
 * Migrate Notification Settings to Firestore
 */
async function migrateNotificationSettings(userId: string): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!db) {
    errors.push("Firebase not initialized");
    return { success: false, errors };
  }

  const settings = getLocalStorageData<NotificationSettings>(LOCAL_STORAGE_KEYS.NOTIFICATION_SETTINGS);
  if (!settings) {
    return { success: false, errors: [] };
  }

  try {
    const docRef = doc(db, COLLECTIONS.USER_SETTINGS, `${userId}_notifications`);
    await setDoc(docRef, {
      userId,
      type: "notifications",
      settings,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      migratedFromLocalStorage: true,
    });
    console.log("Migrated notification settings to Firestore");
    return { success: true, errors: [] };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    errors.push(`Failed to migrate notification settings: ${errorMsg}`);
    console.error("Error migrating notification settings:", error);
    return { success: false, errors };
  }
}

/**
 * Main migration function - migrates all localStorage data to Firebase
 */
export async function migrateLocalStorageToFirebase(userId: string): Promise<MigrationResult> {
  console.log("Starting localStorage to Firebase migration...");
  
  const result: MigrationResult = {
    success: true,
    migratedItems: {
      aiEmployees: 0,
      aiChats: 0,
      notificationSettings: false,
    },
    errors: [],
  };

  if (!userId) {
    result.success = false;
    result.errors.push("User ID is required for migration");
    return result;
  }

  if (!db) {
    result.success = false;
    result.errors.push("Firebase Firestore is not initialized");
    return result;
  }

  // Migrate AI Employees
  const employeesResult = await migrateAIEmployees(userId);
  result.migratedItems.aiEmployees = employeesResult.count;
  result.errors.push(...employeesResult.errors);

  // Migrate AI Chats
  const chatsResult = await migrateAIChats(userId);
  result.migratedItems.aiChats = chatsResult.count;
  result.errors.push(...chatsResult.errors);

  // Migrate Notification Settings
  const settingsResult = await migrateNotificationSettings(userId);
  result.migratedItems.notificationSettings = settingsResult.success;
  result.errors.push(...settingsResult.errors);

  // Set overall success based on errors
  result.success = result.errors.length === 0;

  console.log("Migration complete:", result);
  return result;
}

/**
 * Clear localStorage after successful migration
 */
export function clearMigratedLocalStorage(): void {
  if (!isLocalStorageAvailable()) return;

  const keysToRemove = [
    LOCAL_STORAGE_KEYS.AI_EMPLOYEES,
    LOCAL_STORAGE_KEYS.AI_CHATS,
    LOCAL_STORAGE_KEYS.NOTIFICATION_SETTINGS,
  ];

  for (const key of keysToRemove) {
    try {
      localStorage.removeItem(key);
      console.log(`Cleared localStorage key: ${key}`);
    } catch (error) {
      console.error(`Error clearing localStorage key ${key}:`, error);
    }
  }
}

/**
 * Check if there is data in localStorage that needs migration
 */
export function hasLocalStorageData(): boolean {
  if (!isLocalStorageAvailable()) return false;

  return !!(
    localStorage.getItem(LOCAL_STORAGE_KEYS.AI_EMPLOYEES) ||
    localStorage.getItem(LOCAL_STORAGE_KEYS.AI_CHATS) ||
    localStorage.getItem(LOCAL_STORAGE_KEYS.NOTIFICATION_SETTINGS)
  );
}

/**
 * Get summary of localStorage data available for migration
 */
export function getLocalStorageSummary(): {
  aiEmployees: number;
  aiChats: number;
  hasNotificationSettings: boolean;
} {
  const employees = getLocalStorageData<AIEmployee[]>(LOCAL_STORAGE_KEYS.AI_EMPLOYEES);
  const chats = getLocalStorageData<Record<string, ChatMessage[]>>(LOCAL_STORAGE_KEYS.AI_CHATS);
  const settings = getLocalStorageData<NotificationSettings>(LOCAL_STORAGE_KEYS.NOTIFICATION_SETTINGS);

  return {
    aiEmployees: employees?.length || 0,
    aiChats: chats ? Object.keys(chats).length : 0,
    hasNotificationSettings: !!settings,
  };
}
