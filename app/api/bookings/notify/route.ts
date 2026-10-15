import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { buildGoogleCalendarLink, buildOutlookCalendarLink, encodeICSForDataUri } from "@/lib/calendar-invite";

const INTERNAL_NOTIFY_EMAIL = "info@adams-electric.com";
const FROM_EMAIL = process.env.GMAIL_SMTP_USER || "bookings@adams-electric.com";

interface BookingNotificationRequest {
  bookingId: string;
  teamMemberName: string;
  teamMemberEmail: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientCompany?: string;
  meetingType: string;
  date: string;
  time: string;
  duration: number;
  timezone?: string;
  notes?: string;
  /** Optional pre-built RFC 5545 ICS calendar content. */
  icsContent?: string;
}

/**
 * Builds an RFC 5545 compliant .ics calendar invite string.
 * dateStr format: "Monday, July 8, 2025"
 * timeStr format: "4:00 PM"
 */
function buildICS(params: {
  uid: string;
  summary: string;
  description: string;
  organizer: string;
  attendeeEmail: string;
  attendeeName: string;
  dateStr: string;
  timeStr: string;
  durationMinutes: number;
  timezone: string;
}): string {
  const { uid, summary, description, organizer, attendeeEmail, attendeeName, dateStr, timeStr, durationMinutes, timezone } = params;

  // Parse start date/time from human-readable strings
  const startDate = new Date(`${dateStr} ${timeStr}`);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const toICSDate = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  const now = toICSDate(new Date());
  const start = toICSDate(startDate);
  const end = toICSDate(endDate);

  const escapedDescription = description.replace(/\n/g, "\\n").replace(/,/g, "\\,");
  const escapedSummary = summary.replace(/,/g, "\\,");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Adams Electric//Booking System//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapedSummary}`,
    `DESCRIPTION:${escapedDescription}`,
    `ORGANIZER;CN=Adams Electric:mailto:${organizer}`,
    `ATTENDEE;CN=${attendeeName};RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${attendeeEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Meeting reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function parseBookingDate(dateStr: string, timeStr: string, durationMinutes: number): { startDate: Date; endDate: Date } {
  const startDate = new Date(`${dateStr} ${timeStr}`);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  return { startDate, endDate };
}

function buildClientHTML(params: {
  clientName: string;
  teamMemberName: string;
  meetingType: string;
  date: string;
  time: string;
  duration: number;
  notes?: string;
  calendarLinks?: {
    googleCalendar: string;
    outlookCalendar: string;
    icsDownload: string;
  };
}): string {
  const { clientName, teamMemberName, meetingType, date, time, duration, notes, calendarLinks } = params;
  const calendarButtons = calendarLinks ? `
    <div style="text-align: center; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; color: #666; font-size: 14px;">Add this meeting to your calendar:</p>
      <a href="${calendarLinks.googleCalendar}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #0072BC; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 4px; margin: 4px; font-size: 14px;">Google Calendar</a>
      <a href="${calendarLinks.outlookCalendar}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #0072BC; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 4px; margin: 4px; font-size: 14px;">Outlook</a>
      <a href="${calendarLinks.icsDownload}" download="meeting-invite.ics" style="display: inline-block; background: #0072BC; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 4px; margin: 4px; font-size: 14px;">Download iCal</a>
    </div>
  ` : "";
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0072BC; margin-bottom: 4px;">Adams Electric</h1>
        <p style="color: #666; margin: 0;">Meeting Confirmation</p>
      </div>

      ${calendarButtons}

      <div style="background: #f9f5eb; border-left: 4px solid #0072BC; padding: 20px; border-radius: 4px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; color: #1a1a1a;">Your Meeting is Confirmed! ✅</h2>
        <p style="margin: 0; color: #444;">Hi ${clientName}, your meeting has been successfully scheduled.</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #666;">Meeting With</td>
          <td style="padding: 10px 0;">${teamMemberName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; color: #666;">Meeting Type</td>
          <td style="padding: 10px 0;">${meetingType}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; color: #666;">Date</td>
          <td style="padding: 10px 0;">${date}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; color: #666;">Time</td>
          <td style="padding: 10px 0;">${time}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; color: #666;">Duration</td>
          <td style="padding: 10px 0;">${duration} minutes</td>
        </tr>
        ${notes ? `<tr><td style="padding: 10px 0; font-weight: bold; color: #666; vertical-align: top;">Your Notes</td><td style="padding: 10px 0;">${notes}</td></tr>` : ""}
      </table>

      <p style="color: #666; font-size: 14px;">
        A calendar invite is attached to this email. Please add it to your calendar.
      </p>

      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
        <p>Adams Electric &bull; <a href="mailto:info@adams-electric.com" style="color: #0072BC;">info@adams-electric.com</a></p>
      </div>
    </body>
    </html>
  `;
}

function buildInternalHTML(params: {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientCompany?: string;
  teamMemberName: string;
  meetingType: string;
  date: string;
  time: string;
  duration: number;
  bookingId: string;
  notes?: string;
  calendarLinks?: {
    googleCalendar: string;
    outlookCalendar: string;
    icsDownload: string;
  };
}): string {
  const { clientName, clientEmail, clientPhone, clientCompany, teamMemberName, meetingType, date, time, duration, bookingId, notes, calendarLinks } = params;
  const calendarButtons = calendarLinks ? `
    <div style="text-align: center; margin-bottom: 24px;">
      <p style="margin: 0 0 12px 0; color: #666; font-size: 14px;">Add this meeting to your calendar:</p>
      <a href="${calendarLinks.googleCalendar}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #0072BC; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 4px; margin: 4px; font-size: 14px;">Google Calendar</a>
      <a href="${calendarLinks.outlookCalendar}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #0072BC; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 4px; margin: 4px; font-size: 14px;">Outlook</a>
      <a href="${calendarLinks.icsDownload}" download="meeting-invite.ics" style="display: inline-block; background: #0072BC; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 4px; margin: 4px; font-size: 14px;">Download iCal</a>
    </div>
  ` : "";
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0072BC; margin-bottom: 4px;">Adams Electric</h1>
        <p style="color: #666; margin: 0;">New Booking Notification</p>
      </div>

      ${calendarButtons}

      <div style="background: #fff3cd; border-left: 4px solid #0072BC; padding: 20px; border-radius: 4px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px 0; color: #1a1a1a;">📅 New Meeting Booked</h2>
        <p style="margin: 0; color: #444;">A new meeting has been scheduled with <strong>${teamMemberName}</strong>.</p>
      </div>

      <h3 style="color: #0072BC; margin-bottom: 12px;">Client Information</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #666;">Name</td>
          <td style="padding: 10px 0;">${clientName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; color: #666;">Email</td>
          <td style="padding: 10px 0;"><a href="mailto:${clientEmail}" style="color: #0072BC;">${clientEmail}</a></td>
        </tr>
        ${clientPhone ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 0; font-weight: bold; color: #666;">Phone</td><td style="padding: 10px 0;">${clientPhone}</td></tr>` : ""}
        ${clientCompany ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 0; font-weight: bold; color: #666;">Company</td><td style="padding: 10px 0;">${clientCompany}</td></tr>` : ""}
      </table>

      <h3 style="color: #0072BC; margin-bottom: 12px;">Meeting Details</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #666;">With</td>
          <td style="padding: 10px 0;">${teamMemberName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; color: #666;">Type</td>
          <td style="padding: 10px 0;">${meetingType}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; color: #666;">Date</td>
          <td style="padding: 10px 0;">${date}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; color: #666;">Time</td>
          <td style="padding: 10px 0;">${time}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; color: #666;">Duration</td>
          <td style="padding: 10px 0;">${duration} minutes</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0; font-weight: bold; color: #666;">Booking ID</td>
          <td style="padding: 10px 0; font-family: monospace; font-size: 13px; color: #888;">${bookingId}</td>
        </tr>
        ${notes ? `<tr><td style="padding: 10px 0; font-weight: bold; color: #666; vertical-align: top;">Client Notes</td><td style="padding: 10px 0; font-style: italic;">${notes}</td></tr>` : ""}
      </table>

      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
        <p>Adams Electric Internal Notification</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body: BookingNotificationRequest = await request.json();
    const {
      bookingId,
      teamMemberName,
      teamMemberEmail,
      clientName,
      clientEmail,
      clientPhone,
      clientCompany,
      meetingType,
      date,
      time,
      duration,
      timezone = "America/New_York",
      notes,
      icsContent,
    } = body;

    const gmailUser = process.env.GMAIL_SMTP_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    if (!gmailUser || !gmailAppPassword) {
      console.error("GMAIL_SMTP_USER or GMAIL_APP_PASSWORD is not set — emails not sent");
      return NextResponse.json(
        { success: false, error: "Email service not configured" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.GMAIL_SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.GMAIL_SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    // Build .ics calendar invite content
    const uid = `booking-${bookingId}@adams-electric.com`;
    const calendarSummary = `${meetingType} with ${teamMemberName}`;
    const calendarDescription = [
      `Meeting: ${meetingType}`,
      `With: ${teamMemberName}`,
      `Client: ${clientName} <${clientEmail}>`,
      clientPhone ? `Phone: ${clientPhone}` : null,
      clientCompany ? `Company: ${clientCompany}` : null,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const generatedIcsContent = icsContent || buildICS({
      uid,
      summary: calendarSummary,
      description: calendarDescription,
      organizer: FROM_EMAIL,
      attendeeEmail: clientEmail,
      attendeeName: clientName,
      dateStr: date,
      timeStr: time,
      durationMinutes: duration,
      timezone,
    });

    const { startDate, endDate } = parseBookingDate(date, time, duration);
    const calendarLinks = {
      googleCalendar: buildGoogleCalendarLink({
        summary: calendarSummary,
        description: calendarDescription,
        startDate,
        endDate,
        timezone,
      }),
      outlookCalendar: buildOutlookCalendarLink({
        summary: calendarSummary,
        description: calendarDescription,
        startDate,
        endDate,
        timezone,
      }),
      icsDownload: encodeICSForDataUri(generatedIcsContent),
    };

    const icsAttachment = {
      filename: "meeting-invite.ics",
      content: Buffer.from(generatedIcsContent),
      contentType: "text/calendar; method=REQUEST",
    };

    const errors: string[] = [];

    // 1. Confirmation email to the requester (client)
    try {
      await transporter.sendMail({
        from: `"Adams Electric" <${FROM_EMAIL}>`,
        to: clientEmail,
        subject: `Meeting Confirmed: ${meetingType} on ${date} at ${time}`,
        html: buildClientHTML({
          clientName,
          teamMemberName,
          meetingType,
          date,
          time,
          duration,
          notes,
          calendarLinks,
        }),
        attachments: [icsAttachment],
      });
    } catch (err) {
      console.error("Failed to send client confirmation email:", err);
      errors.push("client");
    }

    // 2. Notification email to info@adams-electric.com with calendar invite
    try {
      await transporter.sendMail({
        from: `"Adams Electric Bookings" <${FROM_EMAIL}>`,
        to: INTERNAL_NOTIFY_EMAIL,
        subject: `New Booking: ${meetingType} with ${clientName} — ${date} at ${time}`,
        html: buildInternalHTML({
          clientName,
          clientEmail,
          clientPhone,
          clientCompany,
          teamMemberName,
          meetingType,
          date,
          time,
          duration,
          bookingId,
          notes,
          calendarLinks,
        }),
        attachments: [icsAttachment],
      });
    } catch (err) {
      console.error("Failed to send internal notification email:", err);
      errors.push("internal");
    }

    if (errors.length === 2) {
      return NextResponse.json(
        { success: false, error: "Failed to send all emails" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: errors.length === 0
        ? "All emails sent successfully"
        : `Emails sent with partial failure: ${errors.join(", ")} email(s) failed`,
    });
  } catch (error) {
    console.error("Booking notification error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
