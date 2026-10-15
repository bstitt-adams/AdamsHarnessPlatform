import { NextRequest, NextResponse } from "next/server";
import { syncMeetingToCalendars, updateMeetingOnCalendars, deleteMeetingFromCalendars, PlatformMeeting } from "@/lib/calendar-sync-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, meeting, action, externalIds } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!meeting && action !== "delete") {
      return NextResponse.json({ error: "meeting data is required" }, { status: 400 });
    }

    // Convert date strings to Date objects
    const platformMeeting: PlatformMeeting | undefined = meeting ? {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      startTime: new Date(meeting.startTime),
      endTime: new Date(meeting.endTime),
      location: meeting.location,
      attendees: meeting.attendees,
      isOnlineMeeting: meeting.isOnlineMeeting,
      timeZone: meeting.timeZone || "America/New_York",
    } : undefined;

    let result;

    switch (action) {
      case "create":
        if (!platformMeeting) {
          return NextResponse.json({ error: "meeting data is required for create" }, { status: 400 });
        }
        result = await syncMeetingToCalendars(userId, platformMeeting);
        break;

      case "update":
        if (!platformMeeting || !externalIds) {
          return NextResponse.json({ error: "meeting data and externalIds are required for update" }, { status: 400 });
        }
        result = await updateMeetingOnCalendars(userId, platformMeeting, externalIds);
        break;

      case "delete":
        if (!externalIds) {
          return NextResponse.json({ error: "externalIds are required for delete" }, { status: 400 });
        }
        result = await deleteMeetingFromCalendars(userId, externalIds);
        break;

      default:
        return NextResponse.json({ error: "Invalid action. Must be 'create', 'update', or 'delete'" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
