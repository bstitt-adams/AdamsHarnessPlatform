/**
 * React hook for Firebase migration
 * 
 * Provides easy access to migration utilities from React components
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  migrateLocalStorageToFirebase,
  clearMigratedLocalStorage,
  hasLocalStorageData,
  getLocalStorageSummary,
} from "../firebase-migration";

interface MigrationState {
  isLoading: boolean;
  hasPendingData: boolean;
  summary: {
    aiEmployees: number;
    aiChats: number;
    hasNotificationSettings: boolean;
  };
  lastMigrationResult: {
    success: boolean;
    migratedItems: {
      aiEmployees: number;
      aiChats: number;
      notificationSettings: boolean;
    };
    errors: string[];
  } | null;
}

export function useFirebaseMigration() {
  const [state, setState] = useState<MigrationState>({
    isLoading: false,
    hasPendingData: false,
    summary: {
      aiEmployees: 0,
      aiChats: 0,
      hasNotificationSettings: false,
    },
    lastMigrationResult: null,
  });

  // Check for pending data on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasPending = hasLocalStorageData();
      const summary = getLocalStorageSummary();
      setState(prev => ({
        ...prev,
        hasPendingData: hasPending,
        summary,
      }));
    }
  }, []);

  // Migrate data to Firebase
  const migrate = useCallback(async (userId: string, clearAfterMigration = false) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await migrateLocalStorageToFirebase(userId);
      
      if (result.success && clearAfterMigration) {
        clearMigratedLocalStorage();
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        lastMigrationResult: result,
        hasPendingData: clearAfterMigration ? false : hasLocalStorageData(),
        summary: getLocalStorageSummary(),
      }));

      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        migratedItems: {
          aiEmployees: 0,
          aiChats: 0,
          notificationSettings: false,
        },
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        lastMigrationResult: errorResult,
      }));

      return errorResult;
    }
  }, []);

  // Clear migrated data from localStorage
  const clearLocalData = useCallback(() => {
    clearMigratedLocalStorage();
    setState(prev => ({
      ...prev,
      hasPendingData: false,
      summary: {
        aiEmployees: 0,
        aiChats: 0,
        hasNotificationSettings: false,
      },
    }));
  }, []);

  // Refresh the summary
  const refreshSummary = useCallback(() => {
    if (typeof window !== "undefined") {
      const hasPending = hasLocalStorageData();
      const summary = getLocalStorageSummary();
      setState(prev => ({
        ...prev,
        hasPendingData: hasPending,
        summary,
      }));
    }
  }, []);

  return {
    ...state,
    migrate,
    clearLocalData,
    refreshSummary,
  };
}
