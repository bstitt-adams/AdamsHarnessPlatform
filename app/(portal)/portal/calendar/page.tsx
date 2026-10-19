"use client";

import { useState, useEffect } from "react";
import { BuiltInCalendar, type CalendarEventData } from "@/components/eos2/built-in-calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Plus,
  Mountain,
  ListTodo,
  Flag,
  Users,
  User,
  Filter,
  Download,
  RefreshCw,
  UserPlus,
  Clock,
  MapPin,
  Video,
  Building,
  Trash2,
  Check,
  CalendarPlus,
  X,
  GraduationCap,
} from "lucide-react";
import { collection, getDocs, updateDoc, deleteDoc, doc, Timestamp, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COLLECTIONS, type OneToOneQueueItemDoc, type CalendarEventDoc, type UserTrainingCertDoc } from "@/lib/schema";
import { showError, showSuccess } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// GoHighLevel event type
interface GHLCalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  calendarId: string;
  calendarName?: string;
  integrationId: string;
  integrationName: string;
  contactId?: string;
  contactName?: string;
  status?: string;
  appointmentStatus?: string;
  location?: string;
  source: "gohighlevel";
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [ghlEvents, setGhlEvents] = useState<GHLCalendarEvent[]>([]);
  const [loadingGhlEvents, setLoadingGhlEvents] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncType, setSyncType] = useState<"full" | "incremental">("incremental");
  const [hasCompletedInitialSync, setHasCompletedInitialSync] = useState(false);
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterTeamMember, setFilterTeamMember] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("calendar");
  
  // 1-to-1 Queue state
  const [oneToOneQueue, setOneToOneQueue] = useState<OneToOneQueueItemDoc[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState<OneToOneQueueItemDoc | null>(null);
  
  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    date: "",
    time: "10:00",
    duration: "60",
    meetingType: "virtual" as "virtual" | "in-person",
    location: "",
  });

  // Fetch GoHighLevel calendar events
  const fetchGhlCalendarEvents = async (type: "full" | "incremental" = "incremental", forceRefresh = false) => {
    setLoadingGhlEvents(true);
    setSyncType(type);
    try {
      const params = new URLSearchParams({
        syncType: type,
        forceRefresh: forceRefresh.toString(),
      });
      const response = await fetch(`/api/gohighlevel/calendar-events?${params}`);
      const data = await response.json();
      if (data.success && data.events && data.events.length > 0) {
        setGhlEvents(data.events);
        // Convert GHL events to CalendarEventData format and add to events
        const ghlCalendarEvents: CalendarEventData[] = data.events.map((event: GHLCalendarEvent) => ({
          id: `ghl-${event.id}`,
          title: event.title,
          description: event.description || `${event.calendarName || "GoHighLevel"} - ${event.integrationName}`,
          startDate: new Date(event.startTime),
          endDate: new Date(event.endTime),
          type: "meeting" as const,
          color: "#f97316", // Orange for GHL events
          location: event.location,
          attendees: event.contactName ? [event.contactName] : [],
        }));
        setEvents(prev => {
          // Remove old GHL events and add new ones
          const nonGhlEvents = prev.filter(e => !e.id.startsWith("ghl-"));
          return [...nonGhlEvents, ...ghlCalendarEvents];
        });
        setLastSyncTime(new Date());
        if (type === "full") {
          setHasCompletedInitialSync(true);
        }
      } else {
        // No events or no active integrations - clear GHL events
        setGhlEvents([]);
        setLastSyncTime(new Date());
      }
    } catch (error) {
      console.error("Error fetching GHL calendar events:", error);
      setGhlEvents([]);
    } finally {
      setLoadingGhlEvents(false);
    }
  };

  // Fetch 1-to-1 queue from Firebase
  const fetchOneToOneQueue = async () => {
    if (!db) return;
    setLoadingQueue(true);
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.ONE_TO_ONE_QUEUE));
      const queueData: OneToOneQueueItemDoc[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'queued') {
          queueData.push({ id: docSnap.id, ...data } as OneToOneQueueItemDoc);
        }
      });
      queueData.sort((a, b) => a.priority - b.priority);
      setOneToOneQueue(queueData);
    } catch (error) {
      console.error("Error fetching 1-to-1 queue:", error);
    } finally {
      setLoadingQueue(false);
    }
  };

  // Listen to built-in Firestore calendar events + training events in real time
  const loadCalendarEvents = () => {
    if (!db) return;

    let baseCalendarEvents: CalendarEventData[] = [];
    let trainingCertEvents: CalendarEventData[] = [];
    let workshopTrainingEvents: CalendarEventData[] = [];
    const syncedCertIds = new Set<string>();
    const syncedWorkshopIds = new Set<string>();

    const mergeAndDedupe = () => {
      const combined = [
        ...baseCalendarEvents,
        ...trainingCertEvents.filter((e) => {
          const certId = e.id.replace(/^cert-(comp|exp)-/, "");
          return !syncedCertIds.has(certId);
        }),
        ...workshopTrainingEvents.filter((e) => {
          const wsId = e.id.replace(/^workshop-/, "");
          return !syncedWorkshopIds.has(wsId);
        }),
      ];

      const seenIds = new Set<string>();
      const seenSignatures = new Set<string>();
      const deduped: CalendarEventData[] = [];

      for (const ev of combined) {
        if (seenIds.has(ev.id)) continue;
        const d = ev.startDate;
        const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const sig = `${ev.title.trim().toLowerCase()}|${dateKey}|${ev.type}`;
        if (seenSignatures.has(sig)) continue;
        seenIds.add(ev.id);
        seenSignatures.add(sig);
        deduped.push(ev);
      }

      setEvents((prev) => {
        const ghlOnly = prev.filter((event) => event.id.startsWith("ghl-"));
        return [...ghlOnly, ...deduped];
      });
    };

    const eventsQuery = query(
      collection(db, COLLECTIONS.CALENDAR_EVENTS),
      orderBy("startDate", "asc")
    );

    const unsubCalendar = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const firestoreEvents: CalendarEventData[] = [];
        syncedCertIds.clear();
        syncedWorkshopIds.clear();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as CalendarEventDoc;
          if (data.trainingCertId) syncedCertIds.add(data.trainingCertId);
          if (data.workshopId) syncedWorkshopIds.add(data.workshopId);

          firestoreEvents.push({
            id: docSnap.id,
            title: data.title || "Untitled Event",
            description: data.description,
            startDate: data.startDate.toDate(),
            endDate: data.endDate.toDate(),
            allDay: data.allDay,
            type: data.type === "one-to-one" ? "meeting" : data.type,
            color: data.color,
            attendees: data.attendees,
            location: data.location,
            recurringParentId: data.recurringParentId,
          });
        });

        baseCalendarEvents = firestoreEvents;
        mergeAndDedupe();
      },
      (error) => {
        console.error("Error loading calendar events:", error);
      }
    );

    const parseLocalYmd = (ymd: string, hour: number) => {
      const [y, m, d] = ymd.split("-").map(Number);
      return new Date(y, (m || 1) - 1, d || 1, hour, 0, 0, 0);
    };

    const unsubTrainingCerts = onSnapshot(
      collection(db, COLLECTIONS.USER_TRAINING_CERTS),
      (snapshot) => {
        const items: CalendarEventData[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserTrainingCertDoc;
          const userLabel = data.userName ? ` (${data.userName})` : "";
          if (data.completionDate) {
            items.push({
              id: `cert-comp-${docSnap.id}`,
              title: `Training: ${data.trainingTitle}${userLabel}`,
              description: `${data.trainingCategory} · Issued by ${data.issuingOrganization}`,
              startDate: parseLocalYmd(data.completionDate, 9),
              endDate: parseLocalYmd(data.completionDate, 10),
              allDay: true,
              type: "training",
              color: "#0ea5e9",
              attendees: data.userName ? [data.userName] : [],
              location: data.issuingOrganization,
            });
          }
          if (data.expirationDate) {
            items.push({
              id: `cert-exp-${docSnap.id}`,
              title: `Cert Expires: ${data.trainingTitle}${userLabel}`,
              description: `Expiration / Renewal required · Issued by ${data.issuingOrganization}`,
              startDate: parseLocalYmd(data.expirationDate, 9),
              endDate: parseLocalYmd(data.expirationDate, 10),
              allDay: true,
              type: "training",
              color: "#f59e0b",
              attendees: data.userName ? [data.userName] : [],
              location: data.issuingOrganization,
            });
          }
        });
        trainingCertEvents = items;
        mergeAndDedupe();
      },
      () => {}
    );

    const unsubWorkshops = onSnapshot(
      collection(db, "lms_workshops"),
      (snapshot) => {
        const items: CalendarEventData[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.scheduledStart?.toDate) {
            const start = data.scheduledStart.toDate() as Date;
            const end = data.scheduledEnd?.toDate
              ? (data.scheduledEnd.toDate() as Date)
              : new Date(start.getTime() + 60 * 60 * 1000);
            items.push({
              id: `workshop-${docSnap.id}`,
              title: `Training Workshop: ${data.title || "Workshop"}`,
              description: data.description || data.shortDescription || "",
              startDate: start,
              endDate: end,
              allDay: false,
              type: "training",
              color: "#0ea5e9",
              attendees: data.instructorName ? [String(data.instructorName)] : [],
              location: data.meetingUrl || "Adams Learning Academy",
            });
          }
        });
        workshopTrainingEvents = items;
        mergeAndDedupe();
      },
      () => {}
    );

    return () => {
      unsubCalendar();
      unsubTrainingCerts();
      unsubWorkshops();
    };
  };

  // Initial load: Do full historical sync first time, then incremental syncs
  useEffect(() => {
    fetchOneToOneQueue();
    void auth?.currentUser?.getIdToken().then((token) =>
      fetch("/api/admin/calendar/compliance-sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }),
    ).catch(() => undefined);

    const unsubscribeCalendar = loadCalendarEvents();

    // Check if we need to do a full historical sync (first time)
    const checkAndSync = async () => {
      // First try incremental (will use cache if available)
      await fetchGhlCalendarEvents("incremental", false);

      // If no events found, do a full historical sync
      if (ghlEvents.length === 0 && !hasCompletedInitialSync) {
        console.log("No cached events found, performing full historical sync...");
        await fetchGhlCalendarEvents("full", true);
      }
    };

    checkAndSync();

    // Set up auto-refresh interval (5 minutes = 300000ms) for incremental syncs
    const syncInterval = setInterval(() => {
      console.log("Auto-syncing GHL calendar events (incremental)...");
      fetchGhlCalendarEvents("incremental", true);
    }, 300000);

    return () => {
      clearInterval(syncInterval);
      unsubscribeCalendar?.();
    };
  }, []);

  // Schedule a 1-to-1 meeting
  const handleScheduleMeeting = async () => {
    if (!db || !selectedQueueItem) return;
    
    try {
      const scheduledDate = new Date(`${scheduleForm.date}T${scheduleForm.time}`);
      const endDate = new Date(scheduledDate.getTime() + parseInt(scheduleForm.duration) * 60000);
      
      // Create calendar event
      const calendarEvent: Omit<CalendarEventDoc, 'id'> = {
        title: `1-to-1 with ${selectedQueueItem.teamMemberName}`,
        description: `1-to-1 meeting with ${selectedQueueItem.teamMemberName} (${selectedQueueItem.teamMemberExpertise || ''})`,
        startDate: Timestamp.fromDate(scheduledDate),
        endDate: Timestamp.fromDate(endDate),
        type: 'one-to-one',
        color: '#f59e0b',
        attendees: [selectedQueueItem.teamMemberName],
        location: scheduleForm.location || (scheduleForm.meetingType === 'virtual' ? 'Video Call' : ''),
        oneToOneQueueItemId: selectedQueueItem.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      const eventRef = await addDoc(collection(db, COLLECTIONS.CALENDAR_EVENTS), calendarEvent);
      
      // Update queue item status
      await updateDoc(doc(db, COLLECTIONS.ONE_TO_ONE_QUEUE, selectedQueueItem.id), {
        status: 'scheduled',
        scheduledDate: Timestamp.fromDate(scheduledDate),
        scheduledTime: scheduleForm.time,
        duration: parseInt(scheduleForm.duration),
        meetingType: scheduleForm.meetingType,
        location: scheduleForm.location,
        calendarEventId: eventRef.id,
        scheduledAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      // Remove from queue (calendar event state updates automatically via onSnapshot)
      setOneToOneQueue(prev => prev.filter(item => item.id !== selectedQueueItem.id));
      
      // Reset form
      setScheduleDialogOpen(false);
      setSelectedQueueItem(null);
      setScheduleForm({
        date: "",
        time: "10:00",
        duration: "60",
        meetingType: "virtual",
        location: "",
      });
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      showError("Error scheduling meeting", { description: "Check console for details." });
    }
  };

  // Remove from queue - show confirmation dialog first
  const handleRemoveFromQueue = (queueItemId: string) => {
    setPendingRemoveId(queueItemId);
    setConfirmDialogOpen(true);
  };

  // Actually remove from queue after confirmation
  const confirmRemoveFromQueue = async () => {
    if (!db || !pendingRemoveId) return;
    
    try {
      await deleteDoc(doc(db, COLLECTIONS.ONE_TO_ONE_QUEUE, pendingRemoveId));
      setOneToOneQueue(prev => prev.filter(item => item.id !== pendingRemoveId));
      showSuccess("Removed from queue");
    } catch (error) {
      console.error("Error removing from queue:", error);
      showError("Failed to remove from queue");
    } finally {
      setPendingRemoveId(null);
    }
  };

  // Open schedule dialog
  const openScheduleDialog = (queueItem: OneToOneQueueItemDoc) => {
    setSelectedQueueItem(queueItem);
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleForm({
      ...scheduleForm,
      date: tomorrow.toISOString().split('T')[0],
    });
    setScheduleDialogOpen(true);
  };

  const handleEventCreate = async (event: Omit<CalendarEventData, "id">) => {
    if (!db) {
      showError("Database not available");
      return;
    }
    
    const parentId = `event-${Date.now()}`;
    const eventsToCreate: CalendarEventData[] = [];
    
    // Generate recurring event instances if recurring is enabled
    if (event.recurring && event.recurring.until) {
      const { frequency, until } = event.recurring;
      let currentDate = new Date(event.startDate);
      const endDate = new Date(until);
      const duration = event.endDate.getTime() - event.startDate.getTime();
      
      let instanceCount = 0;
      const maxInstances = 52; // Limit to 1 year of weekly events
      
      while (currentDate <= endDate && instanceCount < maxInstances) {
        const instanceStart = new Date(currentDate);
        const instanceEnd = new Date(currentDate.getTime() + duration);
        
        eventsToCreate.push({
          ...event,
          id: instanceCount === 0 ? parentId : `${parentId}-${instanceCount}`,
          startDate: instanceStart,
          endDate: instanceEnd,
          recurringParentId: instanceCount === 0 ? undefined : parentId,
        });
        
        // Move to next occurrence
        if (frequency === "daily") {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (frequency === "weekly") {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (frequency === "monthly") {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        instanceCount++;
      }
    } else {
      // Single event
      eventsToCreate.push({
        ...event,
        id: parentId,
      });
    }
    
    // Save each event to Firestore AND sync to GHL immediately
    const savedEvents: CalendarEventData[] = [];
    let ghlSyncCount = 0;

    const getDefaultHexColor = (type: CalendarEventData["type"]): string => {
      switch (type) {
        case "meeting":
          return "#a855f7";
        case "rock":
          return "#3b82f6";
        case "todo":
          return "#22c55e";
        case "issue":
          return "#ef4444";
        case "training":
          return "#0ea5e9";
        default:
          return "#64748b";
      }
    };
    
    for (const newEvent of eventsToCreate) {
      try {
        // 1. Save to Firestore first for persistence (onSnapshot updates state automatically without duplicates)
        const firestoreEvent: Omit<CalendarEventDoc, 'id'> = {
          title: newEvent.title,
          description: newEvent.description || '',
          startDate: Timestamp.fromDate(newEvent.startDate),
          endDate: Timestamp.fromDate(newEvent.endDate),
          type: newEvent.type,
          color: newEvent.color || getDefaultHexColor(newEvent.type),
          attendees: newEvent.attendees || [],
          location: newEvent.location || '',
          allDay: newEvent.allDay || false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          ...(newEvent.recurringParentId && { recurringParentId: newEvent.recurringParentId }),
        };
        
        const docRef = await addDoc(collection(db, COLLECTIONS.CALENDAR_EVENTS), firestoreEvent);
        const savedEvent = { ...newEvent, id: docRef.id, color: firestoreEvent.color };
        savedEvents.push(savedEvent);
        
        // 2. Sync to GoHighLevel immediately
        try {
          const response = await fetch("/api/gohighlevel/calendar-events/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: newEvent.title,
              description: newEvent.description || `${newEvent.type} event`,
              startTime: newEvent.startDate.toISOString(),
              endTime: newEvent.endDate.toISOString(),
              location: newEvent.location,
            }),
          });
          const data = await response.json();
          if (data.success) {
            console.log("Event synced to GoHighLevel:", data.event);
            ghlSyncCount++;
            // Update Firestore with GHL ID
            const ghlEventId = data.event.ghlEventId || data.event.id;
            if (ghlEventId) {
              await updateDoc(doc(db, COLLECTIONS.CALENDAR_EVENTS, docRef.id), {
                ghlEventId: ghlEventId,
                syncedToGhl: true,
                updatedAt: Timestamp.now(),
              });
            }
          } else {
            console.warn("Failed to sync event to GHL:", data.error);
          }
        } catch (ghlError) {
          console.error("Error syncing event to GHL:", ghlError);
        }
      } catch (error) {
        console.error("Error saving event to Firestore:", error);
        showError("Failed to save event");
      }
    }
    
    // Show success message (onSnapshot handles adding savedEvents to state cleanly without duplicates)
    if (event.recurring) {
      showSuccess(`Created ${savedEvents.length} recurring events`);
    } else {
      showSuccess("Event created");
    }
  };

  const handleEventUpdate = async (id: string, updates: Partial<CalendarEventData>) => {
    // Skip GHL events (they're read-only from external source)
    if (id.startsWith("ghl-")) {
      showError("Cannot edit GoHighLevel events directly");
      return;
    }
    
    try {
      // Update in Firebase
      if (db) {
        const eventRef = doc(db, COLLECTIONS.CALENDAR_EVENTS, id);
        const firestoreUpdates: Record<string, any> = {
          updatedAt: Timestamp.now(),
        };
        
        if (updates.title !== undefined) firestoreUpdates.title = updates.title;
        if (updates.description !== undefined) firestoreUpdates.description = updates.description;
        if (updates.startDate !== undefined) firestoreUpdates.startDate = Timestamp.fromDate(updates.startDate);
        if (updates.endDate !== undefined) firestoreUpdates.endDate = Timestamp.fromDate(updates.endDate);
        if (updates.type !== undefined) firestoreUpdates.type = updates.type;
        if (updates.color !== undefined) firestoreUpdates.color = updates.color;
        if (updates.location !== undefined) firestoreUpdates.location = updates.location;
        if (updates.attendees !== undefined) firestoreUpdates.attendees = updates.attendees;
        if (updates.allDay !== undefined) firestoreUpdates.allDay = updates.allDay;
        
        await updateDoc(eventRef, firestoreUpdates);
      }
      
      // Update local state
      setEvents((prev) =>
        prev.map((event) => (event.id === id ? { ...event, ...updates } : event))
      );
      
      showSuccess("Event updated");
    } catch (error) {
      console.error("Error updating event:", error);
      showError("Failed to update event");
    }
  };

  const handleEventDelete = async (id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
    if (
      db &&
      !id.startsWith("ghl-") &&
      !id.startsWith("cert-") &&
      !id.startsWith("workshop-")
    ) {
      try {
        await deleteDoc(doc(db, COLLECTIONS.CALENDAR_EVENTS, id));
        showSuccess("Event deleted");
      } catch (err) {
        console.error("Error deleting calendar event:", err);
        showError("Failed to delete event");
      }
    }
  };

  // Get unique team members from events (attendees)
  const teamMembers = Array.from(
    new Set(
      events
        .flatMap((e) => e.attendees || [])
        .filter((name) => name && name.trim() !== "")
    )
  ).sort();

  // Filter events by type and team member
  const filteredEvents = events.filter((e) => {
    const matchesType = !filterType || e.type === filterType;
    const matchesTeamMember = !filterTeamMember || 
      (e.attendees && e.attendees.includes(filterTeamMember));
    return matchesType && matchesTeamMember;
  });

  // Stats
  const meetingCount = events.filter((e) => e.type === "meeting").length;
  const trainingCount = events.filter((e) => e.type === "training").length;
  const rockCount = events.filter((e) => e.type === "rock").length;
  const todoCount = events.filter((e) => e.type === "todo").length;
  const issueCount = events.filter((e) => e.type === "issue").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-8 w-8" />
            Calendar
          </h1>
          <p className="text-muted-foreground">
            View and manage all your meetings, rocks, to-dos, and issues in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastSyncTime && (
            <span className="text-xs text-muted-foreground">
              Last sync: {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchGhlCalendarEvents("incremental", true)}
            disabled={loadingGhlEvents}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingGhlEvents ? "animate-spin" : ""}`} />
            {loadingGhlEvents ? "Syncing..." : "Sync"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchGhlCalendarEvents("full", true)}
            disabled={loadingGhlEvents}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingGhlEvents ? "animate-spin" : ""}`} />
            {loadingGhlEvents ? "Syncing..." : "Full Sync"}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
                  </div>
      </div>

      {/* Tabs for Calendar and 1-to-1 Queue */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="one-to-one" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            1-to-1 Queue
            {oneToOneQueue.length > 0 && (
              <Badge variant="secondary" className="ml-1">{oneToOneQueue.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Card
              className={`cursor-pointer transition-all ${filterType === "meeting" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setFilterType(filterType === "meeting" ? null : "meeting")}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Meetings</p>
                    <p className="text-2xl font-bold text-blue-600">{meetingCount}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${filterType === "training" ? "ring-2 ring-sky-500" : ""}`}
              onClick={() => setFilterType(filterType === "training" ? null : "training")}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Training</p>
                    <p className="text-2xl font-bold text-sky-600">{trainingCount}</p>
                  </div>
                  <GraduationCap className="h-8 w-8 text-sky-200" />
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${filterType === "rock" ? "ring-2 ring-purple-500" : ""}`}
              onClick={() => setFilterType(filterType === "rock" ? null : "rock")}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Rocks</p>
                    <p className="text-2xl font-bold text-purple-600">{rockCount}</p>
                  </div>
                  <Mountain className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${filterType === "todo" ? "ring-2 ring-green-500" : ""}`}
              onClick={() => setFilterType(filterType === "todo" ? null : "todo")}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">To-Dos</p>
                    <p className="text-2xl font-bold text-green-600">{todoCount}</p>
                  </div>
                  <ListTodo className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${filterType === "issue" ? "ring-2 ring-red-500" : ""}`}
              onClick={() => setFilterType(filterType === "issue" ? null : "issue")}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Issues</p>
                    <p className="text-2xl font-bold text-red-600">{issueCount}</p>
                  </div>
                  <Flag className="h-8 w-8 text-red-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Event Type Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Event Type:</span>
              <Select
                value={filterType || "all"}
                onValueChange={(value) => setFilterType(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="meeting">Meetings</SelectItem>
                  <SelectItem value="training">Training &amp; Certs</SelectItem>
                  <SelectItem value="rock">Rocks</SelectItem>
                  <SelectItem value="todo">To-Dos</SelectItem>
                  <SelectItem value="issue">Issues</SelectItem>
                  <SelectItem value="one-to-one">1-to-1 Meetings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Team Member Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Team Member:</span>
              <Select
                value={filterTeamMember || "all"}
                onValueChange={(value) => setFilterTeamMember(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member} value={member}>
                      {member}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {(filterType || filterTeamMember) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setFilterType(null);
                  setFilterTeamMember(null);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}

            {/* Active filter badges */}
            {(filterType || filterTeamMember) && (
              <div className="flex items-center gap-2">
                {filterType && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    Type: {filterType}
                  </Badge>
                )}
                {filterTeamMember && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {filterTeamMember}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Calendar */}
          <BuiltInCalendar
            events={filteredEvents}
            onEventCreate={handleEventCreate}
            onEventUpdate={handleEventUpdate}
            onEventDelete={handleEventDelete}
            showHeader={true}
            defaultView={view}
            className="min-h-[600px]"
          />

          {/* Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Event Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Meetings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-sky-500" />
                  <span className="text-sm">Training &amp; Certs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm">Rocks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">To-Dos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">Issues</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">1-to-1 Meetings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm">GoHighLevel Events</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  <span className="text-sm">Custom Events</span>
                </div>
              </div>
              {ghlEvents.length > 0 ? (
                <p className="text-xs text-muted-foreground mt-2">
                  {ghlEvents.length} GoHighLevel event{ghlEvents.length !== 1 ? "s" : ""} synced
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  No GoHighLevel events synced. Ensure you have an active integration with calendar sync enabled.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 1-to-1 Queue Tab */}
        <TabsContent value="one-to-one" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    1-to-1 Scheduling Queue
                  </CardTitle>
                  <CardDescription>
                    Team members queued for 1-to-1 meetings. Click "Schedule" to book a meeting.
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={fetchOneToOneQueue} disabled={loadingQueue}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingQueue ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingQueue ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : oneToOneQueue.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No 1-to-1s Queued</h3>
                  <p className="text-sm mb-4">
                    Add team members to your 1-to-1 queue from the Team Members page.
                  </p>
                  <Button variant="outline" asChild>
                    <a href="/portal/admin/team-members">
                      <Users className="mr-2 h-4 w-4" />
                      Go to Team Members
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {oneToOneQueue.map((queueItem, index) => (
                    <div
                      key={queueItem.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-medium">
                          {index + 1}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={queueItem.teamMemberAvatar} />
                          <AvatarFallback>
                            {queueItem.teamMemberName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{queueItem.teamMemberName}</p>
                          <p className="text-sm text-muted-foreground">{queueItem.teamMemberExpertise}</p>
                          <p className="text-xs text-muted-foreground">{queueItem.teamMemberEmail}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFromQueue(queueItem.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Add team members to your queue from the <strong>Team Members</strong> page</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Click <strong>Schedule</strong> to book a 1-to-1 meeting on your calendar</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Scheduled meetings appear in the <strong>Calendar</strong> tab with an blue color</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Meeting Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule 1-to-1 Meeting</DialogTitle>
            <DialogDescription>
              {selectedQueueItem && (
                <span>Schedule a meeting with <strong>{selectedQueueItem.teamMemberName}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select
                  value={scheduleForm.duration}
                  onValueChange={(value) => setScheduleForm({ ...scheduleForm, duration: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetingType">Meeting Type</Label>
                <Select
                  value={scheduleForm.meetingType}
                  onValueChange={(value: "virtual" | "in-person") => setScheduleForm({ ...scheduleForm, meetingType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="virtual">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Virtual
                      </div>
                    </SelectItem>
                    <SelectItem value="in-person">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        In-Person
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">
                {scheduleForm.meetingType === "virtual" ? "Video Link (optional)" : "Location"}
              </Label>
              <Input
                id="location"
                placeholder={scheduleForm.meetingType === "virtual" ? "https://zoom.us/..." : "Office, Coffee Shop, etc."}
                value={scheduleForm.location}
                onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleMeeting} disabled={!scheduleForm.date}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for removing from queue */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Remove from Queue"
        description="Are you sure you want to remove this person from the 1-to-1 queue?"
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmRemoveFromQueue}
      />
    </div>
  );
}
