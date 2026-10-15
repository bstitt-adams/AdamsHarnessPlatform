export interface CalendarInviteParams {
  uid: string;
  summary: string;
  description: string;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail: string;
  attendeeName: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  location?: string;
}

function formatICSDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

export function buildICSContent(params: CalendarInviteParams): string {
  const {
    uid,
    summary,
    description,
    organizerEmail,
    organizerName,
    attendeeEmail,
    attendeeName,
    startDate,
    endDate,
    timezone,
    location,
  } = params;

  const now = formatICSDate(new Date());
  const start = formatICSDate(startDate);
  const end = formatICSDate(endDate);

  const escapedDescription = description.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
  const escapedSummary = summary.replace(/\\/g, "\\\\").replace(/,/g, "\\,");
  const escapedLocation = location ? location.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/\n/g, "\\n") : "";

  const lines = [
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
    `ORGANIZER;CN=${organizerName}:mailto:${organizerEmail}`,
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
  ];

  if (location) {
    lines.splice(lines.indexOf(`DESCRIPTION:${escapedDescription}`) + 1, 0, `LOCATION:${escapedLocation}`);
  }

  return lines.join("\r\n");
}

export function buildGoogleCalendarLink(params: {
  summary: string;
  description: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  location?: string;
}): string {
  const { summary, description, startDate, endDate, timezone, location } = params;

  const format = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: summary,
    dates: `${format(startDate)}/${format(endDate)}`,
    details: description,
    ctz: timezone,
  });

  if (location) query.set("location", location);

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

export function buildOutlookCalendarLink(params: {
  summary: string;
  description: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  location?: string;
}): string {
  const { summary, description, startDate, endDate, timezone, location } = params;

  const query = new URLSearchParams({
    subject: summary,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    body: description,
    location: location || "",
    allday: "false",
    uid: `adams-${Date.now()}`,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${query.toString()}`;
}

export function encodeICSForDataUri(icsContent: string): string {
  const base64 = Buffer.from(icsContent).toString("base64");
  return `data:text/calendar;base64,${base64}`;
}
