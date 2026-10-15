"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, collection, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";
import { showInAppNotification, showBrowserNotification, getBrowserNotificationStatus } from "@/lib/notifications";
import type { WebhookEventType } from "@/lib/mattermost";

export interface NotificationRecord {
  id: string;
  type: WebhookEventType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Timestamp;
}

export interface NotificationSettings {
  inAppEnabled: boolean;
  browserEnabled: boolean;
  soundEnabled: boolean;
  enabledEvents: Record<WebhookEventType, boolean>;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  inAppEnabled: true,
  browserEnabled: false,
  soundEnabled: false,
  enabledEvents: {} as Record<WebhookEventType, boolean>,
};

/**
 * Hook to manage in-app notifications that mirror Mattermost
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [browserPermission, setBrowserPermission] = useState<string>("default");
  const [loading, setLoading] = useState(true);

  // Load notification settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("adams_notification_settings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch {
        // Use defaults if parsing fails
      }
    }
    
    // Check browser notification permission
    setBrowserPermission(getBrowserNotificationStatus());
    setLoading(false);
  }, []);

  // Save settings to localStorage when they change
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem("adams_notification_settings", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Listen to notification collection in Firestore
  useEffect(() => {
    if (!db) return;

    const notificationsRef = collection(db, COLLECTIONS.PLATFORM_SETTINGS, "global", "notifications");
    const q = query(notificationsRef, orderBy("createdAt", "desc"), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications: NotificationRecord[] = [];
      let unread = 0;

      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<NotificationRecord, "id">;
        newNotifications.push({ id: doc.id, ...data });
        if (!data.read) unread++;
      });

      // Check for new notifications and show toasts
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data() as NotificationRecord;
          const eventType = data.type;
          
          // Check if this event type is enabled
          const isEventEnabled = settings.enabledEvents[eventType] !== false;
          
          if (settings.inAppEnabled && isEventEnabled) {
            showInAppNotification(eventType, data.data || {});
          }
          
          if (settings.browserEnabled && isEventEnabled && browserPermission === "granted") {
            showBrowserNotification(eventType, data.data || {});
          }
          
          if (settings.soundEnabled && isEventEnabled) {
            playNotificationSound();
          }
        }
      });

      setNotifications(newNotifications);
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [settings, browserPermission]);

  // Request browser notification permission
  const requestBrowserPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      return "unsupported";
    }
    
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    return permission;
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    settings,
    updateSettings,
    browserPermission,
    requestBrowserPermission,
    markAsRead,
    markAllAsRead,
    clearAll,
    loading,
  };
}

/**
 * Play a notification sound
 */
function playNotificationSound() {
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  } catch {
    // Ignore audio errors
  }
}

/**
 * Trigger a notification from anywhere in the app
 * This will show in-app toast and optionally browser notification
 */
export function triggerNotification(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
  options?: {
    showToast?: boolean;
    showBrowser?: boolean;
    playSound?: boolean;
  }
) {
  const { showToast = true, showBrowser = false, playSound = false } = options || {};
  
  if (showToast) {
    showInAppNotification(eventType, data);
  }
  
  if (showBrowser) {
    showBrowserNotification(eventType, data);
  }
  
  if (playSound) {
    playNotificationSound();
  }
}
