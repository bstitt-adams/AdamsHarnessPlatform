"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  Target,
  Calendar,
  FileText,
  FolderKanban,
  Users,
  CheckSquare,
  Settings,
  Trash2,
  Clock,
  Volume2,
  VolumeX,
  Monitor,
  Smartphone,
  AlertCircle,
  Ticket,
  DollarSign,
  Bug,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore";
import { COLLECTIONS, type ActivityDoc, type CalendarEventDoc } from "@/lib/schema";
import { format, formatDistanceToNow, isToday, isTomorrow, addMinutes } from "date-fns";
import { toast } from "sonner";
import {
  getCalendarReminderService,
  showPopupNotification,
  type NotificationType,
} from "@/lib/notification-service";
import {
  requestNotificationPermission,
  getBrowserNotificationStatus,
} from "@/lib/notifications";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  timestamp: Date;
  read: boolean;
  priority?: "low" | "medium" | "high" | "urgent";
  sourceUrl?: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  type: string;
  location?: string;
  reminderSet: boolean;
}

interface NotificationSettings {
  inAppEnabled: boolean;
  browserEnabled: boolean;
  soundEnabled: boolean;
  calendarReminders: boolean;
  reminderMinutes: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  inAppEnabled: true,
  browserEnabled: false,
  soundEnabled: false,
  calendarReminders: true,
  reminderMinutes: 15,
};

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function getActivityIcon(type: string) {
  switch (type) {
    case "opportunity":
      return <Target className="h-4 w-4" />;
    case "meeting":
    case "calendar":
    case "calendar_reminder":
      return <Calendar className="h-4 w-4" />;
    case "document":
    case "proposal":
      return <FileText className="h-4 w-4" />;
    case "project":
      return <FolderKanban className="h-4 w-4" />;
    case "team-member":
    case "affiliate":
      return <Users className="h-4 w-4" />;
    case "task":
    case "rock":
      return <CheckSquare className="h-4 w-4" />;
    case "event":
    case "event_registration":
      return <Ticket className="h-4 w-4" />;
    case "deal":
      return <DollarSign className="h-4 w-4" />;
    case "bug":
    case "issue":
      return <Bug className="h-4 w-4" />;
    case "settings":
      return <Settings className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getPriorityColor(priority?: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-sky-500";
    case "low":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [browserPermission, setBrowserPermission] = useState<string>("default");
  const [activeTab, setActiveTab] = useState("notifications");

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("adams_notification_settings");
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch {
        // Use defaults
      }
    }
    setBrowserPermission(getBrowserNotificationStatus());
  }, []);

  // Save settings to localStorage
  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem("adams_notification_settings", JSON.stringify(updated));
      return updated;
    });
  };

  // Start calendar reminder service
  useEffect(() => {
    if (settings.calendarReminders) {
      const service = getCalendarReminderService();
      service.start(60000); // Check every minute
      return () => service.stop();
    }
  }, [settings.calendarReminders]);

  // Fetch notifications from activities
  useEffect(() => {
    async function fetchNotifications() {
      if (!db) {
        setIsLoading(false);
        return;
      }

      try {
        const activitiesRef = collection(db, COLLECTIONS.ACTIVITIES);
        const activitiesQuery = query(activitiesRef, orderBy("createdAt", "desc"), limit(50));
        const snapshot = await getDocs(activitiesQuery);

        const notificationsData: NotificationItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as ActivityDoc;
          const createdAt = data.createdAt?.toDate() || new Date();
          notificationsData.push({
            id: doc.id,
            type: data.entityType || "project",
            title: (data as ActivityDoc & { action?: string }).action || "Activity",
            message: data.description || "Activity",
            time: getRelativeTime(createdAt),
            timestamp: createdAt,
            read: false,
            sourceUrl: data.entityId ? `/portal/${data.entityType}s/${data.entityId}` : undefined,
          });
        });
        setNotifications(notificationsData);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNotifications();
  }, []);

  // Fetch upcoming calendar events
  useEffect(() => {
    async function fetchUpcomingEvents() {
      if (!db) {
        setLoadingEvents(false);
        return;
      }

      try {
        const now = new Date();
        const endOfTomorrow = new Date(now);
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
        endOfTomorrow.setHours(23, 59, 59, 999);

        const eventsRef = collection(db, COLLECTIONS.CALENDAR_EVENTS);
        const eventsQuery = query(
          eventsRef,
          where("startDate", ">=", Timestamp.fromDate(now)),
          where("startDate", "<=", Timestamp.fromDate(endOfTomorrow)),
          orderBy("startDate", "asc"),
          limit(10)
        );

        const snapshot = await getDocs(eventsQuery);
        const eventsData: UpcomingEvent[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data() as CalendarEventDoc;
          eventsData.push({
            id: doc.id,
            title: data.title,
            startDate: data.startDate.toDate(),
            endDate: data.endDate.toDate(),
            type: data.type,
            location: data.location,
            reminderSet: true,
          });
        });

        setUpcomingEvents(eventsData);
      } catch (error) {
        console.error("Error fetching upcoming events:", error);
      } finally {
        setLoadingEvents(false);
      }
    }

    fetchUpcomingEvents();
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const requestBrowserPermission = async () => {
    const permission = await requestNotificationPermission();
    setBrowserPermission(permission);
    if (permission === "granted") {
      toast.success("Browser notifications enabled!");
      updateSettings({ browserEnabled: true });
    } else if (permission === "denied") {
      toast.error("Browser notifications were denied. Please enable them in your browser settings.");
    }
  };

  const testNotification = () => {
    showPopupNotification(
      "calendar_reminder",
      "Test Notification",
      "This is a test notification to verify your settings are working correctly.",
      { priority: "medium" }
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={testNotification}>
            <BellRing className="mr-2 h-4 w-4" />
            Test
          </Button>
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll} disabled={notifications.length === 0}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="notifications">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming Events
            {upcomingEvents.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {upcomingEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>All platform activity and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/30 ${
                        notification.read ? "bg-background" : "bg-muted/50"
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {getActivityIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${notification.read ? "text-muted-foreground" : "font-medium"}`}>
                            {notification.message}
                          </p>
                          {notification.priority && (
                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`} />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                      </div>
                      {!notification.read && (
                        <Badge variant="secondary" className="shrink-0">
                          New
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No notifications yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Activity from across the platform will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Events Tab */}
        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
              <CardDescription>
                Events scheduled for today and tomorrow. You'll receive popup reminders before each event.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const isEventToday = isToday(event.startDate);
                    const isEventTomorrow = isTomorrow(event.startDate);
                    const timeUntil = formatDistanceToNow(event.startDate, { addSuffix: true });

                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30"
                      >
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-primary">
                            {format(event.startDate, "MMM")}
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {format(event.startDate, "d")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{event.title}</p>
                            {isEventToday && (
                              <Badge variant="default" className="bg-green-600">Today</Badge>
                            )}
                            {isEventTomorrow && (
                              <Badge variant="secondary">Tomorrow</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(event.startDate, "h:mm a")} - {format(event.endDate, "h:mm a")}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Starts {timeUntil}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.reminderSet && settings.calendarReminders && (
                            <Badge variant="outline" className="text-xs">
                              <BellRing className="h-3 w-3 mr-1" />
                              Reminder set
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming events</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Events scheduled for today and tomorrow will appear here
                  </p>
                  <Button variant="outline" className="mt-4" asChild>
                    <a href="/portal/calendar">Go to Calendar</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications across the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* In-App Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="inApp">In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show popup notifications within the app
                    </p>
                  </div>
                </div>
                <Switch
                  id="inApp"
                  checked={settings.inAppEnabled}
                  onCheckedChange={(checked) => updateSettings({ inAppEnabled: checked })}
                />
              </div>

              <Separator />

              {/* Browser Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="browser">Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications even when the tab is in background
                    </p>
                    {browserPermission === "denied" && (
                      <p className="text-xs text-destructive mt-1">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        Notifications blocked. Enable in browser settings.
                      </p>
                    )}
                  </div>
                </div>
                {browserPermission === "granted" ? (
                  <Switch
                    id="browser"
                    checked={settings.browserEnabled}
                    onCheckedChange={(checked) => updateSettings({ browserEnabled: checked })}
                  />
                ) : (
                  <Button variant="outline" size="sm" onClick={requestBrowserPermission}>
                    Enable
                  </Button>
                )}
              </div>

              <Separator />

              {/* Sound */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.soundEnabled ? (
                    <Volume2 className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <Label htmlFor="sound">Notification Sound</Label>
                    <p className="text-sm text-muted-foreground">
                      Play a sound when notifications arrive
                    </p>
                  </div>
                </div>
                <Switch
                  id="sound"
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
                />
              </div>

              <Separator />

              {/* Calendar Reminders */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="calendar">Calendar Event Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get popup alerts before calendar events start
                    </p>
                  </div>
                </div>
                <Switch
                  id="calendar"
                  checked={settings.calendarReminders}
                  onCheckedChange={(checked) => updateSettings({ calendarReminders: checked })}
                />
              </div>

              {settings.calendarReminders && (
                <div className="ml-8 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Reminder Times</p>
                  <p className="text-xs text-muted-foreground">
                    You'll receive reminders at:
                  </p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• 15 minutes before the event</li>
                    <li>• 5 minutes before the event</li>
                    <li>• When the event starts</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>
                Choose which types of notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Calendar, label: "Calendar Events", description: "Meeting and event reminders" },
                  { icon: CheckSquare, label: "Rocks & Todos", description: "Task deadlines and updates" },
                  { icon: Target, label: "Opportunities", description: "Pipeline and deal updates" },
                  { icon: FolderKanban, label: "Projects", description: "Project status changes" },
                  { icon: Ticket, label: "Events", description: "Event registrations and updates" },
                  { icon: Users, label: "Team Updates", description: "Team member activity" },
                  { icon: Bug, label: "Issues", description: "Bug and issue tracking" },
                  { icon: DollarSign, label: "Deals", description: "Deal progress and closures" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
