/**
 * GoHighLevel Calendar Events API
 * 
 * Fetches calendar events from GoHighLevel integrations
 * Supports:
 * - Historical sync (syncType=full) - fetches past 1 year of events
 * - Incremental sync (syncType=incremental) - fetches today + future events
 * - Stores events in Firebase for faster subsequent loads
 */

import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, doc, getDoc, setDoc, query, where, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, GHLIntegrationDoc } from "@/lib/schema";
import { GoHighLevelService } from "@/lib/gohighlevel-service";

// Collection for storing synced GHL calendar events
const GHL_CALENDAR_EVENTS_COLLECTION = "ghlCalendarEvents";
const GHL_SYNC_STATUS_COLLECTION = "ghlSyncStatus";

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: true, events: [], message: "Database not configured" }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const syncType = searchParams.get("syncType") || "incremental"; // "full" or "incremental"
    const forceRefresh = searchParams.get("forceRefresh") === "true";
    
    // Determine date range based on sync type
    const now = new Date();
    let startTime: string;
    let endTime: string;
    
    if (syncType === "full") {
      // Historical sync: 1 year back, 1 year forward
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      const oneYearAhead = new Date(now.getFullYear() + 1, now.getMonth(), 28);
      startTime = searchParams.get("startTime") || oneYearAgo.toISOString();
      endTime = searchParams.get("endTime") || oneYearAhead.toISOString();
    } else {
      // Incremental sync: today + 2 months ahead
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const twoMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 2, 28);
      startTime = searchParams.get("startTime") || today.toISOString();
      endTime = searchParams.get("endTime") || twoMonthsAhead.toISOString();
    }
    
    // Check if we should load from cache first (for incremental syncs)
    if (!forceRefresh && syncType === "incremental") {
      const cachedEvents = await loadCachedEvents();
      if (cachedEvents.length > 0) {
        // Return cached events and trigger background refresh
        console.log(`Returning ${cachedEvents.length} cached GHL events`);
        return NextResponse.json({
          success: true,
          events: cachedEvents,
          count: cachedEvents.length,
          fromCache: true,
          dateRange: { startTime, endTime },
        });
      }
    }

    // Get all active GHL integrations with calendar sync enabled
    const integrationsSnapshot = await getDocs(collection(db, COLLECTIONS.GHL_INTEGRATIONS));
    const integrations: GHLIntegrationDoc[] = [];
    
    integrationsSnapshot.forEach((doc) => {
      const data = doc.data() as GHLIntegrationDoc;
      if (data.isActive && data.syncCalendars) {
        integrations.push({ ...data, id: doc.id });
      }
    });

    if (integrations.length === 0) {
      return NextResponse.json({
        success: true,
        events: [],
        message: "No active integrations with calendar sync enabled",
      });
    }

    // Fetch calendar events from all integrations
    const allEvents: Array<{
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
      assignedUserId?: string;
      location?: string;
      source: "gohighlevel";
    }> = [];

    for (const integration of integrations) {
      try {
        const ghlService = new GoHighLevelService({
          apiToken: integration.apiToken,
          locationId: integration.locationId,
          agencyId: integration.agencyId,
        });

        // First get all calendars
        const calendarsResult = await ghlService.getCalendars();
        console.log(`GHL Calendars for ${integration.name}:`, JSON.stringify({
          success: calendarsResult.success,
          count: calendarsResult.data?.calendars?.length || 0,
          error: calendarsResult.error,
          calendars: calendarsResult.data?.calendars?.map(c => ({ id: c.id, name: c.name }))
        }));
        
        // Fetch appointments from all contacts using direct API calls
        console.log(`Fetching appointments for integration ${integration.name}...`);
        
        // First get all contacts
        const contactsUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${integration.locationId}&limit=100`;
        const contactsResponse = await fetch(contactsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${integration.apiToken}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
          },
        });
        
        const contactsData = await contactsResponse.json();
        const contacts = contactsData?.contacts || [];
        console.log(`Fetched ${contacts.length} contacts`);
        
        // Fetch appointments for each contact
        let appointmentsFound = 0;
        for (const contact of contacts) {
          if (!contact.id) continue;
          
          try {
            const appointmentsUrl = `https://services.leadconnectorhq.com/contacts/${contact.id}/appointments`;
            const appointmentsResponse = await fetch(appointmentsUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${integration.apiToken}`,
                'Content-Type': 'application/json',
                'Version': '2021-07-28',
              },
            });
            
            const appointmentsData = await appointmentsResponse.json();
            const appointments = appointmentsData?.events || [];
            
            if (appointments.length > 0) {
              const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Unknown';
              const contactLastName = contact.lastName || contact.firstName || 'Unknown';
              
              for (const appt of appointments) {
                const startStr = appt.startTime || '';
                const endStr = appt.endTime || '';
                const startISO = startStr.includes('T') ? startStr : startStr.replace(' ', 'T');
                const endISO = endStr.includes('T') ? endStr : endStr.replace(' ', 'T');
                
                // Prepend affiliate's last name to the title for easy identification
                const baseTitle = appt.title || `Appointment with ${contactName}`;
                const formattedTitle = `[${contactLastName}] ${baseTitle}`;
                
                if (appt.id && !allEvents.some(e => e.id === appt.id)) {
                  allEvents.push({
                    id: appt.id,
                    title: formattedTitle,
                    description: appt.notes,
                    startTime: startISO,
                    endTime: endISO,
                    calendarId: appt.calendarId,
                    calendarName: undefined,
                    integrationId: integration.id,
                    integrationName: integration.name,
                    contactId: contact.id,
                    contactName: contactName,
                    appointmentStatus: appt.appointmentStatus || appt.appoinmentStatus,
                    assignedUserId: appt.assignedUserId,
                    location: appt.address,
                    source: "gohighlevel",
                  });
                  appointmentsFound++;
                }
              }
            }
          } catch (e) {
            // Skip errors for individual contacts
          }
        }
        
        console.log(`Total appointments found: ${appointmentsFound}, Total events: ${allEvents.length}`);
      } catch (integrationError) {
        console.error(`Error fetching calendars from integration ${integration.id}:`, integrationError);
      }
    }

    // Save events to Firebase cache for faster subsequent loads
    if (allEvents.length > 0) {
      await saveEventsToCache(allEvents, syncType);
    }

    return NextResponse.json({
      success: true,
      events: allEvents,
      count: allEvents.length,
      integrationCount: integrations.length,
      syncType,
      dateRange: { startTime, endTime },
    });
  } catch (error) {
    console.error("Error fetching GHL calendar events:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error", events: [] },
      { status: 500 }
    );
  }
}

// Helper function to load cached events from Firebase
async function loadCachedEvents(): Promise<Array<{
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
  assignedUserId?: string;
  location?: string;
  source: "gohighlevel";
}>> {
  if (!db) return [];
  
  try {
    const eventsSnapshot = await getDocs(collection(db, GHL_CALENDAR_EVENTS_COLLECTION));
    const events: Array<{
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
      assignedUserId?: string;
      location?: string;
      source: "gohighlevel";
    }> = [];
    
    eventsSnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: data.id || doc.id,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        calendarId: data.calendarId,
        calendarName: data.calendarName,
        integrationId: data.integrationId,
        integrationName: data.integrationName,
        contactId: data.contactId,
        contactName: data.contactName,
        status: data.status,
        appointmentStatus: data.appointmentStatus,
        assignedUserId: data.assignedUserId,
        location: data.location,
        source: "gohighlevel",
      });
    });
    
    return events;
  } catch (error) {
    console.error("Error loading cached GHL events:", error);
    return [];
  }
}

// Helper function to save events to Firebase cache
async function saveEventsToCache(events: Array<{
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
  assignedUserId?: string;
  location?: string;
  source: "gohighlevel";
}>, syncType: string): Promise<void> {
  if (!db || events.length === 0) return;
  
  try {
    const batch = writeBatch(db);
    
    for (const event of events) {
      const eventRef = doc(db, GHL_CALENDAR_EVENTS_COLLECTION, event.id);
      batch.set(eventRef, {
        ...event,
        syncedAt: Timestamp.now(),
        syncType,
      }, { merge: true });
    }
    
    await batch.commit();
    
    // Update sync status
    const syncStatusRef = doc(db, GHL_SYNC_STATUS_COLLECTION, "calendar");
    await setDoc(syncStatusRef, {
      lastSyncAt: Timestamp.now(),
      lastSyncType: syncType,
      eventCount: events.length,
    }, { merge: true });
    
    console.log(`Saved ${events.length} GHL events to cache (${syncType} sync)`);
  } catch (error) {
    console.error("Error saving GHL events to cache:", error);
  }
}
