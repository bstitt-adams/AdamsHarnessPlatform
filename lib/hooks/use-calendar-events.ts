"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";

// Calendar Event type for the built-in calendar
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  type: "meeting" | "rock" | "todo" | "issue" | "custom";
  color?: string;
  attendees?: string[];
  location?: string;
  recurring?: {
    frequency: "daily" | "weekly" | "monthly";
    until?: Date;
  };
  // Traction references
  rockId?: string;
  todoId?: string;
  issueId?: string;
  meetingId?: string;
}

// Firestore document type
interface CalendarEventDoc {
  title: string;
  description?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  allDay?: boolean;
  type: "meeting" | "rock" | "todo" | "issue" | "custom";
  color?: string;
  attendees?: string[];
  location?: string;
  recurringFrequency?: "daily" | "weekly" | "monthly";
  recurringUntil?: Timestamp;
  rockId?: string;
  todoId?: string;
  issueId?: string;
  meetingId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Add calendar events collection to schema if not exists
const CALENDAR_EVENTS_COLLECTION = "calendarEvents";

/**
 * Hook for managing built-in calendar events
 */
export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if Firebase is configured
  const isFirebaseConfigured = !!db;

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError("Firebase not configured");
      return;
    }

    try {
      const eventsQuery = query(
        collection(db, CALENDAR_EVENTS_COLLECTION),
        orderBy("startDate", "asc")
      );

      const unsubscribe = onSnapshot(
        eventsQuery,
        (snapshot) => {
          const data = snapshot.docs.map((docSnapshot) => {
            const d = docSnapshot.data() as CalendarEventDoc;
            return {
              id: docSnapshot.id,
              title: d.title,
              description: d.description,
              startDate: d.startDate.toDate(),
              endDate: d.endDate.toDate(),
              allDay: d.allDay,
              type: d.type,
              color: d.color,
              attendees: d.attendees,
              location: d.location,
              recurring: d.recurringFrequency
                ? {
                    frequency: d.recurringFrequency,
                    until: d.recurringUntil?.toDate(),
                  }
                : undefined,
              rockId: d.rockId,
              todoId: d.todoId,
              issueId: d.issueId,
              meetingId: d.meetingId,
            } as CalendarEvent;
          });
          setEvents(data);
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching calendar events:", err);
          setError("Failed to load calendar events");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up calendar listener:", err);
      setError("Failed to connect to calendar");
      setLoading(false);
    }
  }, []);

  // Add a new event
  const addEvent = useCallback(async (event: Omit<CalendarEvent, "id">) => {
    if (!db) return null;

    const now = Timestamp.now();
    const docData: Omit<CalendarEventDoc, "id"> = {
      title: event.title,
      description: event.description,
      startDate: Timestamp.fromDate(event.startDate),
      endDate: Timestamp.fromDate(event.endDate),
      allDay: event.allDay,
      type: event.type,
      color: event.color,
      attendees: event.attendees,
      location: event.location,
      recurringFrequency: event.recurring?.frequency,
      recurringUntil: event.recurring?.until
        ? Timestamp.fromDate(event.recurring.until)
        : undefined,
      rockId: event.rockId,
      todoId: event.todoId,
      issueId: event.issueId,
      meetingId: event.meetingId,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, CALENDAR_EVENTS_COLLECTION), docData);
    return docRef.id;
  }, []);

  // Update an event
  const updateEvent = useCallback(async (id: string, event: Partial<CalendarEvent>) => {
    if (!db) return;

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (event.title !== undefined) updateData.title = event.title;
    if (event.description !== undefined) updateData.description = event.description;
    if (event.startDate !== undefined) updateData.startDate = Timestamp.fromDate(event.startDate);
    if (event.endDate !== undefined) updateData.endDate = Timestamp.fromDate(event.endDate);
    if (event.allDay !== undefined) updateData.allDay = event.allDay;
    if (event.type !== undefined) updateData.type = event.type;
    if (event.color !== undefined) updateData.color = event.color;
    if (event.attendees !== undefined) updateData.attendees = event.attendees;
    if (event.location !== undefined) updateData.location = event.location;
    if (event.recurring !== undefined) {
      updateData.recurringFrequency = event.recurring.frequency;
      updateData.recurringUntil = event.recurring.until
        ? Timestamp.fromDate(event.recurring.until)
        : null;
    }

    await updateDoc(doc(db, CALENDAR_EVENTS_COLLECTION, id), updateData);
  }, []);

  // Delete an event
  const deleteEvent = useCallback(async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, CALENDAR_EVENTS_COLLECTION, id));
  }, []);

  // Get events for a specific date range
  const getEventsInRange = useCallback(
    (startDate: Date, endDate: Date): CalendarEvent[] => {
      return events.filter(
        (event) =>
          (event.startDate >= startDate && event.startDate <= endDate) ||
          (event.endDate >= startDate && event.endDate <= endDate) ||
          (event.startDate <= startDate && event.endDate >= endDate)
      );
    },
    [events]
  );

  // Get events for a specific date
  const getEventsForDate = useCallback(
    (date: Date): CalendarEvent[] => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      return getEventsInRange(startOfDay, endOfDay);
    },
    [getEventsInRange]
  );

  // Get upcoming events
  const getUpcomingEvents = useCallback(
    (limit: number = 10): CalendarEvent[] => {
      const now = new Date();
      return events
        .filter((event) => event.startDate >= now)
        .slice(0, limit);
    },
    [events]
  );

  // Create event from Traction Rock
  const createRockEvent = useCallback(
    async (rock: { id: string; description: string; owner: string; dueDate: string }) => {
      const dueDate = new Date(rock.dueDate);
      dueDate.setHours(9, 0, 0, 0);
      const endDate = new Date(dueDate);
      endDate.setHours(9, 30, 0, 0);

      return addEvent({
        title: `🏔️ Rock Due: ${rock.description.substring(0, 50)}`,
        description: `Rock: ${rock.description}\nOwner: ${rock.owner}`,
        startDate: dueDate,
        endDate,
        type: "rock",
        rockId: rock.id,
      });
    },
    [addEvent]
  );

  // Create event from Traction To-Do
  const createTodoEvent = useCallback(
    async (todo: { id: string; description: string; owner: string; dueDate: string }) => {
      const dueDate = new Date(todo.dueDate);
      dueDate.setHours(9, 0, 0, 0);
      const endDate = new Date(dueDate);
      endDate.setHours(9, 15, 0, 0);

      return addEvent({
        title: `☑️ To-Do: ${todo.description.substring(0, 50)}`,
        description: `To-Do: ${todo.description}\nOwner: ${todo.owner}`,
        startDate: dueDate,
        endDate,
        type: "todo",
        todoId: todo.id,
      });
    },
    [addEvent]
  );

  // Create Level 10 Meeting event
  const createLevel10Event = useCallback(
    async (meeting: {
      id?: string;
      date: string;
      startTime: string;
      endTime: string;
      attendees?: string[];
    }) => {
      const [startHour, startMin] = meeting.startTime.split(":").map(Number);
      const [endHour, endMin] = meeting.endTime.split(":").map(Number);

      const startDate = new Date(meeting.date);
      startDate.setHours(startHour, startMin, 0, 0);

      const endDate = new Date(meeting.date);
      endDate.setHours(endHour, endMin, 0, 0);

      return addEvent({
        title: "Level 10 Meeting",
        description: `Weekly Level 10 Meeting - EOS/Traction\n\nAgenda:\n1. Segue (5 min)\n2. Scorecard Review (5 min)\n3. Rock Review (5 min)\n4. Headlines (5 min)\n5. To-Do Review (5 min)\n6. IDS (60 min)\n7. Conclude (5 min)`,
        startDate,
        endDate,
        type: "meeting",
        attendees: meeting.attendees,
        meetingId: meeting.id,
        recurring: {
          frequency: "weekly",
        },
      });
    },
    [addEvent]
  );

  return {
    events,
    loading,
    error,
    isFirebaseConfigured,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsInRange,
    getEventsForDate,
    getUpcomingEvents,
    createRockEvent,
    createTodoEvent,
    createLevel10Event,
  };
}
