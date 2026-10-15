/**
 * Calendar Integration Service
 * 
 * Provides calendar event generation for Traction/EOS entities:
 * - Level 10 Meeting scheduling
 * - Rock milestone reminders
 * - To-Do due date reminders
 * - Quarterly planning sessions
 * 
 * Supports:
 * - Google Calendar (via URL scheme)
 * - Outlook Calendar (via URL scheme)
 * - ICS file generation
 */

// Calendar event types
export type CalendarEventType = 
  | "level10_meeting"
  | "rock_milestone"
  | "rock_due"
  | "todo_reminder"
  | "quarterly_planning"
  | "annual_planning";

export interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  attendees?: string[];
  recurrence?: RecurrenceRule;
  reminders?: number[]; // minutes before event
}

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number;
  count?: number;
  until?: Date;
  byDay?: ("MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU")[];
}

/**
 * Format date for calendar URLs (YYYYMMDDTHHMMSS)
 */
function formatCalendarDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Format date for ICS files
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Generate a unique UID for ICS events
 */
function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@adams-platform`;
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatCalendarDate(event.startDate)}/${formatCalendarDate(event.endDate)}`,
    details: event.description,
  });

  if (event.location) {
    params.set("location", event.location);
  }

  if (event.attendees && event.attendees.length > 0) {
    params.set("add", event.attendees.join(","));
  }

  if (event.recurrence) {
    const rrule = generateRRuleString(event.recurrence);
    params.set("recur", rrule);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    body: event.description,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
  });

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Office 365 Calendar URL
 */
export function generateOffice365CalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    body: event.description,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
  });

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate RRULE string for recurrence
 */
function generateRRuleString(rule: RecurrenceRule): string {
  let rrule = `RRULE:FREQ=${rule.frequency.toUpperCase()}`;
  
  if (rule.interval && rule.interval > 1) {
    rrule += `;INTERVAL=${rule.interval}`;
  }
  
  if (rule.count) {
    rrule += `;COUNT=${rule.count}`;
  }
  
  if (rule.until) {
    rrule += `;UNTIL=${formatICSDate(rule.until)}`;
  }
  
  if (rule.byDay && rule.byDay.length > 0) {
    rrule += `;BYDAY=${rule.byDay.join(",")}`;
  }
  
  return rrule;
}

/**
 * Generate ICS file content
 */
export function generateICSContent(event: CalendarEvent): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Adams Platform//Traction Dashboard//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${generateUID()}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(event.startDate)}`,
    `DTEND:${formatICSDate(event.endDate)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }

  if (event.attendees) {
    event.attendees.forEach((attendee) => {
      lines.push(`ATTENDEE:mailto:${attendee}`);
    });
  }

  if (event.recurrence) {
    lines.push(generateRRuleString(event.recurrence));
  }

  if (event.reminders) {
    event.reminders.forEach((minutes) => {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeICS(event.title)}`);
      lines.push(`TRIGGER:-PT${minutes}M`);
      lines.push("END:VALARM");
    });
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Download ICS file
 */
export function downloadICSFile(event: CalendarEvent, filename?: string): void {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// TRACTION-SPECIFIC EVENT GENERATORS
// ============================================================================

/**
 * Create a Level 10 Meeting calendar event
 */
export function createLevel10MeetingEvent(
  date: Date,
  startTime: string,
  endTime: string,
  attendees?: string[]
): CalendarEvent {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  const startDate = new Date(date);
  startDate.setHours(startHour, startMin, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(endHour, endMin, 0, 0);

  return {
    title: "Level 10 Meeting",
    description: `Weekly Level 10 Meeting - EOS/Traction

Agenda:
1. Segue (5 min) - Good news, personal & professional
2. Scorecard Review (5 min)
3. Rock Review (5 min)
4. Customer/Employee Headlines (5 min)
5. To-Do List Review (5 min)
6. IDS (60 min) - Identify, Discuss, Solve
7. Conclude (5 min) - Recap, rate meeting, cascading messages

Generated by Adams Platform`,
    startDate,
    endDate,
    attendees,
    recurrence: {
      frequency: "weekly",
      byDay: [getDayAbbreviation(date)],
    },
    reminders: [60, 15], // 1 hour and 15 minutes before
  };
}

/**
 * Create a Rock milestone reminder event
 */
export function createRockMilestoneEvent(
  rockDescription: string,
  owner: string,
  dueDate: Date,
  progress: number
): CalendarEvent {
  const startDate = new Date(dueDate);
  startDate.setHours(9, 0, 0, 0);
  
  const endDate = new Date(dueDate);
  endDate.setHours(9, 30, 0, 0);

  return {
    title: `🏔️ Rock Due: ${rockDescription.substring(0, 50)}`,
    description: `Rock Due Date Reminder

Rock: ${rockDescription}
Owner: ${owner}
Current Progress: ${progress}%

Review this Rock and update status in the Traction Dashboard.

Generated by Adams Platform`,
    startDate,
    endDate,
    reminders: [1440, 60], // 1 day and 1 hour before
  };
}

/**
 * Create a To-Do reminder event
 */
export function createTodoReminderEvent(
  todoDescription: string,
  owner: string,
  dueDate: Date
): CalendarEvent {
  const startDate = new Date(dueDate);
  startDate.setHours(9, 0, 0, 0);
  
  const endDate = new Date(dueDate);
  endDate.setHours(9, 15, 0, 0);

  return {
    title: `☑️ To-Do Due: ${todoDescription.substring(0, 50)}`,
    description: `To-Do Due Date Reminder

To-Do: ${todoDescription}
Owner: ${owner}

Complete this item and mark as done in the Traction Dashboard.

Generated by Adams Platform`,
    startDate,
    endDate,
    reminders: [60], // 1 hour before
  };
}

/**
 * Create a Quarterly Planning session event
 */
export function createQuarterlyPlanningEvent(
  quarter: string,
  date: Date,
  attendees?: string[]
): CalendarEvent {
  const startDate = new Date(date);
  startDate.setHours(8, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(17, 0, 0, 0);

  return {
    title: `📅 ${quarter} Quarterly Planning Session`,
    description: `Quarterly Planning Session - EOS/Traction

Agenda:
1. Review previous quarter Rocks (complete/incomplete)
2. Review Scorecard metrics and trends
3. Identify key issues for next quarter
4. Set new Rocks for ${quarter}
5. Update V/TO if needed
6. Assign Rock owners
7. Set quarterly goals and metrics

Preparation:
- Review current Rock status
- Prepare scorecard data
- List potential issues
- Draft Rock ideas

Generated by Adams Platform`,
    startDate,
    endDate,
    attendees,
    reminders: [10080, 1440, 60], // 1 week, 1 day, 1 hour before
  };
}

/**
 * Create an Annual Planning session event
 */
export function createAnnualPlanningEvent(
  year: number,
  date: Date,
  attendees?: string[]
): CalendarEvent {
  const startDate = new Date(date);
  startDate.setHours(8, 0, 0, 0);
  
  // 2-day event
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);
  endDate.setHours(17, 0, 0, 0);

  return {
    title: `📅 ${year} Annual Planning Session`,
    description: `Annual Planning Session - EOS/Traction

Day 1 Agenda:
1. Review previous year accomplishments
2. Review V/TO - Vision, Core Values, Core Focus
3. 10-Year Target review
4. 3-Year Picture review
5. 1-Year Plan development

Day 2 Agenda:
1. Set annual goals and metrics
2. Identify Q1 Rocks
3. Organizational structure review
4. People Analyzer (GWC) review
5. Issues list for the year

Preparation:
- Review all quarterly data from previous year
- Prepare financial summaries
- Draft vision updates
- List strategic opportunities

Generated by Adams Platform`,
    startDate,
    endDate,
    attendees,
    reminders: [20160, 10080, 1440], // 2 weeks, 1 week, 1 day before
  };
}

/**
 * Get day abbreviation for RRULE
 */
function getDayAbbreviation(date: Date): "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU" {
  const days: ("SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA")[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  return days[date.getDay()];
}

/**
 * Get all calendar links for an event
 */
export function getCalendarLinks(event: CalendarEvent): {
  google: string;
  outlook: string;
  office365: string;
  ics: string;
} {
  return {
    google: generateGoogleCalendarUrl(event),
    outlook: generateOutlookCalendarUrl(event),
    office365: generateOffice365CalendarUrl(event),
    ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(generateICSContent(event))}`,
  };
}
