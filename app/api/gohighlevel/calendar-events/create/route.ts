/**
 * GoHighLevel Calendar Events Create API
 * 
 * Creates a calendar event in GoHighLevel from the portal
 */

import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, GHLIntegrationDoc } from "@/lib/schema";
import { GoHighLevelService } from "@/lib/gohighlevel-service";

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      startTime,
      endTime,
      calendarId,
      contactId,
      location,
      integrationId,
    } = body;

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: "Title, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    // Get the GHL integration to use
    let integration: GHLIntegrationDoc | undefined = undefined;
    
    const integrationsSnapshot = await getDocs(collection(db, COLLECTIONS.GHL_INTEGRATIONS));
    
    if (integrationId) {
      // Use specified integration
      integrationsSnapshot.forEach((doc) => {
        if (doc.id === integrationId) {
          integration = { ...doc.data(), id: doc.id } as GHLIntegrationDoc;
        }
      });
    } else {
      // Use first active integration with calendar sync enabled
      integrationsSnapshot.forEach((doc) => {
        const data = doc.data() as GHLIntegrationDoc;
        if (data.isActive && data.syncCalendars && !integration) {
          integration = { ...data, id: doc.id } as GHLIntegrationDoc;
        }
      });
    }

    if (!integration) {
      return NextResponse.json(
        { success: false, error: "No active GHL integration with calendar sync enabled" },
        { status: 400 }
      );
    }

    // TypeScript narrowing - integration is now guaranteed to be defined
    const activeIntegration = integration as GHLIntegrationDoc;

    // Create GHL service
    const ghlService = new GoHighLevelService({
      apiToken: activeIntegration.apiToken,
      locationId: activeIntegration.locationId,
      agencyId: activeIntegration.agencyId,
    });

    // Get default calendar if not specified
    let targetCalendarId = calendarId;
    if (!targetCalendarId) {
      const calendarsResult = await ghlService.getCalendars();
      if (calendarsResult.success && calendarsResult.data?.calendars?.length) {
        // Use the first calendar as default
        targetCalendarId = calendarsResult.data.calendars[0].id;
      } else {
        return NextResponse.json(
          { success: false, error: "No calendars found in GHL" },
          { status: 400 }
        );
      }
    }

    // Create event in GHL
    const ghlEvent = {
      calendarId: targetCalendarId,
      title,
      startTime,
      endTime,
      notes: description,
      address: location,
      contactId,
    };

    const result = await ghlService.createCalendarEvent(ghlEvent);

    if (!result.success) {
      console.error("GHL create event error:", result.error);
      return NextResponse.json(
        { success: false, error: result.error || "Failed to create event in GHL" },
        { status: 500 }
      );
    }

    // Also save to local Firebase for tracking
    const ghlEventId = result.data?.event?.id;
    const localEvent = {
      title,
      description,
      startDate: Timestamp.fromDate(new Date(startTime)),
      endDate: Timestamp.fromDate(new Date(endTime)),
      type: "meeting",
      color: "#f97316", // Orange for GHL events
      location,
      ghlEventId,
      ghlCalendarId: targetCalendarId,
      ghlIntegrationId: activeIntegration.id,
      syncedToGhl: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const localEventRef = await addDoc(collection(db, COLLECTIONS.CALENDAR_EVENTS), localEvent);

    return NextResponse.json({
      success: true,
      event: {
        id: localEventRef.id,
        ghlEventId,
        title,
        description,
        startDate: startTime,
        endDate: endTime,
        location,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating GHL calendar event:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
