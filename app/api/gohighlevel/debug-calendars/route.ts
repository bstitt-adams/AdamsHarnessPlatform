/**
 * Debug endpoint to test GHL calendar API directly
 */

import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, GHLIntegrationDoc } from "@/lib/schema";

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not configured" });
    }

    // Get first active integration
    const integrationsSnapshot = await getDocs(collection(db, COLLECTIONS.GHL_INTEGRATIONS));
    let integration: GHLIntegrationDoc | null = null;
    
    integrationsSnapshot.forEach((doc) => {
      const data = doc.data() as GHLIntegrationDoc;
      if (data.isActive && !integration) {
        integration = { ...data, id: doc.id };
      }
    });

    if (!integration) {
      return NextResponse.json({ error: "No active integration found" });
    }

    const apiToken = (integration as GHLIntegrationDoc).apiToken;
    const locationId = (integration as GHLIntegrationDoc).locationId;

    // Test calendars endpoint directly
    const calendarsUrl = `https://services.leadconnectorhq.com/calendars/?locationId=${locationId}`;
    console.log("Testing calendars URL:", calendarsUrl);
    
    const calendarsResponse = await fetch(calendarsUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
    });

    const calendarsData = await calendarsResponse.json();
    console.log("Calendars response:", JSON.stringify(calendarsData, null, 2));

    // If we have calendars, try to get events from the first one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let eventsData: any = null;
    if (calendarsData.calendars && calendarsData.calendars.length > 0) {
      const calendarId = calendarsData.calendars[0].id;
      const now = new Date();
      const startTime = new Date(now.getFullYear() - 1, 0, 1).toISOString();
      const endTime = new Date(now.getFullYear() + 1, 11, 31).toISOString();
      
      // Try appointments endpoint
      const appointmentsUrl = `https://services.leadconnectorhq.com/calendars/events/appointments?locationId=${locationId}&calendarId=${calendarId}&startTime=${startTime}&endTime=${endTime}`;
      console.log("Testing appointments URL:", appointmentsUrl);
      
      const appointmentsResponse = await fetch(appointmentsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
      });
      
      eventsData = {
        appointmentsEndpoint: {
          status: appointmentsResponse.status,
          statusText: appointmentsResponse.statusText,
          data: await appointmentsResponse.json().catch(() => null),
        },
        eventsEndpoint: null,
      };
      
      // Also try events endpoint
      const eventsUrl = `https://services.leadconnectorhq.com/calendars/events?locationId=${locationId}&calendarId=${calendarId}&startTime=${startTime}&endTime=${endTime}`;
      console.log("Testing events URL:", eventsUrl);
      
      const eventsResponse = await fetch(eventsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
      });
      
      eventsData.eventsEndpoint = {
        status: eventsResponse.status,
        statusText: eventsResponse.statusText,
        data: await eventsResponse.json().catch(() => null),
      };
      
      // Try different appointment endpoints
      // 1. Try /calendars/{calendarId}/appointments
      const calendarAppointmentsUrl = `https://services.leadconnectorhq.com/calendars/${calendarId}/appointments?locationId=${locationId}&startTime=${startTime}&endTime=${endTime}`;
      const calendarAppointmentsResponse = await fetch(calendarAppointmentsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
      });
      
      eventsData.calendarAppointmentsEndpoint = {
        url: calendarAppointmentsUrl,
        status: calendarAppointmentsResponse.status,
        statusText: calendarAppointmentsResponse.statusText,
        data: await calendarAppointmentsResponse.json().catch(() => null),
      };

      // 2. Try /calendars/groups/appointments (group appointments)
      const groupAppointmentsUrl = `https://services.leadconnectorhq.com/calendars/groups/appointments?locationId=${locationId}&startTime=${startTime}&endTime=${endTime}`;
      const groupAppointmentsResponse = await fetch(groupAppointmentsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
      });
      
      eventsData.groupAppointmentsEndpoint = {
        url: groupAppointmentsUrl,
        status: groupAppointmentsResponse.status,
        statusText: groupAppointmentsResponse.statusText,
        data: await groupAppointmentsResponse.json().catch(() => null),
      };

      // 3. Try contacts endpoint to get appointments from contacts
      const contactsUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`;
      const contactsResponse = await fetch(contactsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
      });
      
      const contactsData = await contactsResponse.json().catch(() => null);
      eventsData.contactsEndpoint = {
        url: contactsUrl,
        status: contactsResponse.status,
        statusText: contactsResponse.statusText,
        contactCount: contactsData?.contacts?.length || 0,
      };

      // 4. If we have contacts, try to get appointments for first contact
      if (contactsData?.contacts?.length > 0) {
        const firstContactId = contactsData.contacts[0].id;
        const contactAppointmentsUrl = `https://services.leadconnectorhq.com/contacts/${firstContactId}/appointments`;
        const contactAppointmentsResponse = await fetch(contactAppointmentsUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28",
          },
        });
        
        eventsData.contactAppointmentsEndpoint = {
          url: contactAppointmentsUrl,
          status: contactAppointmentsResponse.status,
          statusText: contactAppointmentsResponse.statusText,
          data: await contactAppointmentsResponse.json().catch(() => null),
        };
      }

      // 5. Get users first to find userId for appointments
      const usersUrl = `https://services.leadconnectorhq.com/users/?locationId=${locationId}`;
      const usersResponse = await fetch(usersUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
      });
      
      const usersData = await usersResponse.json().catch(() => null);
      eventsData.usersEndpoint = {
        url: usersUrl,
        status: usersResponse.status,
        statusText: usersResponse.statusText,
        userCount: usersData?.users?.length || 0,
        users: usersData?.users?.map((u: { id: string; name: string; email: string }) => ({ id: u.id, name: u.name, email: u.email })),
      };

      // 6. If we have users, try to get appointments by userId
      if (usersData?.users?.length > 0) {
        const firstUserId = usersData.users[0].id;
        const userAppointmentsUrl = `https://services.leadconnectorhq.com/calendars/events?locationId=${locationId}&userId=${firstUserId}&startTime=${startTime}&endTime=${endTime}`;
        const userAppointmentsResponse = await fetch(userAppointmentsUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28",
          },
        });
        
        eventsData.userAppointmentsEndpoint = {
          url: userAppointmentsUrl,
          status: userAppointmentsResponse.status,
          statusText: userAppointmentsResponse.statusText,
          data: await userAppointmentsResponse.json().catch(() => null),
        };
      }

      // 7. Try with groupId (calendar groups)
      const groupsUrl = `https://services.leadconnectorhq.com/calendars/groups?locationId=${locationId}`;
      const groupsResponse = await fetch(groupsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
      });
      
      const groupsData = await groupsResponse.json().catch(() => null);
      eventsData.groupsEndpoint = {
        url: groupsUrl,
        status: groupsResponse.status,
        statusText: groupsResponse.statusText,
        data: groupsData,
      };

      // 8. If we have groups, try to get appointments by groupId
      if (groupsData?.groups?.length > 0) {
        const firstGroupId = groupsData.groups[0].id;
        const groupAppointmentsUrl = `https://services.leadconnectorhq.com/calendars/events?locationId=${locationId}&groupId=${firstGroupId}&startTime=${startTime}&endTime=${endTime}`;
        const groupAppointmentsResponse = await fetch(groupAppointmentsUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28",
          },
        });
        
        eventsData.groupAppointmentsByIdEndpoint = {
          url: groupAppointmentsUrl,
          status: groupAppointmentsResponse.status,
          statusText: groupAppointmentsResponse.statusText,
          data: await groupAppointmentsResponse.json().catch(() => null),
        };
      }

      // 9. Search for contact "Nelinia" (from screenshot) and get their appointments
      const searchUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=Nelinia&limit=10`;
      const searchResponse = await fetch(searchUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
      });
      
      const searchData = await searchResponse.json().catch(() => null);
      eventsData.searchNeliniaEndpoint = {
        url: searchUrl,
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        contactCount: searchData?.contacts?.length || 0,
        contacts: searchData?.contacts?.slice(0, 3),
      };

      // 10. If found, get appointments for that contact
      if (searchData?.contacts?.length > 0) {
        const neliniaId = searchData.contacts[0].id;
        const neliniaAppointmentsUrl = `https://services.leadconnectorhq.com/contacts/${neliniaId}/appointments`;
        const neliniaAppointmentsResponse = await fetch(neliniaAppointmentsUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
            "Version": "2021-07-28",
          },
        });
        
        eventsData.neliniaAppointmentsEndpoint = {
          url: neliniaAppointmentsUrl,
          status: neliniaAppointmentsResponse.status,
          statusText: neliniaAppointmentsResponse.statusText,
          data: await neliniaAppointmentsResponse.json().catch(() => null),
        };
      }
    }

    const integrationData = integration as GHLIntegrationDoc;
    return NextResponse.json({
      integration: {
        id: integrationData.id,
        name: integrationData.name,
        locationId,
        syncCalendars: (integration as GHLIntegrationDoc).syncCalendars,
      },
      calendars: {
        status: calendarsResponse.status,
        statusText: calendarsResponse.statusText,
        data: calendarsData,
      },
      events: eventsData,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
