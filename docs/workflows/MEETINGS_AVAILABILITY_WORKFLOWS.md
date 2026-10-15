# Meetings & Availability Workflows

Complete step-by-step guides for managing meetings and the Calendly-style booking system.

---

## Table of Contents
- [Meetings Management](#meetings-management)
- [Availability System](#availability-system)
- [Booking Management](#booking-management)
- [Calendar Integration](#calendar-integration)

---

## Meetings Management

Create, manage, and track meetings with full CRUD functionality.

### Accessing Meetings

1. Click **Meetings** in the portal sidebar
2. URL: `/portal/meetings`
3. View calendar and list of meetings

### Creating a New Meeting

#### Step 1: Open Create Dialog
1. Click **+ New Meeting** button
2. Or click on a date in the calendar view

#### Step 2: Fill in Basic Information

| Field | Required | Description |
|-------|----------|-------------|
| **Title** | ✅ | Meeting name (e.g., "Q1 Planning Session") |
| **Description** | ❌ | Meeting agenda or notes |
| **Date** | ✅ | Meeting date |
| **Start Time** | ✅ | Begin time |
| **End Time** | ✅ | End time |

#### Step 3: Set Location

**In-Person Meeting:**
1. Select **In-Person** location type
2. Enter address or room name
3. Add any access instructions

**Virtual Meeting:**
1. Select **Virtual** location type
2. Enter video conference URL
3. Supported: Zoom, Google Meet, Teams, etc.

**Hybrid Meeting:**
1. Select **Hybrid**
2. Enter both physical location and video URL

#### Step 4: Add Attendees
1. Click **Add Attendee**
2. Enter name and email
3. Repeat for all attendees
4. Attendees receive calendar invites (if configured)

#### Step 5: Set Meeting Type

| Type | Description |
|------|-------------|
| **Internal** | Team meetings |
| **Client** | External client meetings |
| **Prospect** | Sales/discovery calls |
| **Training** | Educational sessions |
| **Other** | General meetings |

#### Step 6: Configure Options

| Option | Description |
|--------|-------------|
| **Send Reminders** | Email reminders before meeting |
| **Generate QR Code** | For check-in at events |
| **Recurring** | Set up recurring schedule |

#### Step 7: Save Meeting
1. Review all details
2. Click **Create Meeting**
3. Meeting appears in calendar

### Editing a Meeting

#### Step 1: Find the Meeting
1. Use calendar view to locate
2. Or search in list view
3. Click on the meeting

#### Step 2: Open Edit Mode
1. Click **Edit** button
2. Or double-click the meeting

#### Step 3: Make Changes
1. Update any fields
2. Add/remove attendees
3. Change date/time

#### Step 4: Save Changes
1. Click **Save Changes**
2. Attendees notified of updates (if configured)

### Cancelling a Meeting

#### Step 1: Open Meeting
1. Find and click on the meeting
2. Click **Cancel Meeting**

#### Step 2: Provide Reason (Optional)
1. Enter cancellation reason
2. Choose notification options

#### Step 3: Confirm Cancellation
1. Click **Confirm Cancel**
2. Status changes to "Cancelled"
3. Attendees notified

### Completing a Meeting

#### Step 1: After Meeting Ends
1. Open the meeting
2. Click **Mark Complete**

#### Step 2: Add Notes (Optional)
1. Enter meeting notes
2. Record action items
3. Attach any documents

#### Step 3: Save Completion
1. Click **Complete**
2. Status changes to "Completed"

### Meeting Statuses

| Status | Description |
|--------|-------------|
| **Scheduled** | Upcoming meeting |
| **In Progress** | Currently happening |
| **Completed** | Successfully held |
| **Cancelled** | Meeting cancelled |
| **No Show** | Attendees didn't appear |

### Using QR Code Check-In

#### Step 1: Generate QR Code
1. Open meeting details
2. Click **Generate QR Code**
3. QR code displays

#### Step 2: Share QR Code
1. Display on screen at venue
2. Print for registration desk
3. Include in reminder emails

#### Step 3: Attendee Check-In
1. Attendees scan QR code
2. Opens check-in page
3. Confirms attendance

---

## Availability System

Set up Calendly-style booking for others to schedule time with you.

### Accessing Availability

1. Click **Availability** in sidebar
2. URL: `/portal/availability`

### Setting Up Weekly Schedule

#### Step 1: Open Schedule Settings
1. Go to **Availability**
2. Click **Edit Schedule** or **Settings**

#### Step 2: Configure Daily Availability

For each day of the week:

| Setting | Description |
|---------|-------------|
| **Available** | Toggle day on/off |
| **Start Time** | When you're available from |
| **End Time** | When availability ends |
| **Breaks** | Add lunch or other breaks |

**Example Schedule:**
```
Monday:    9:00 AM - 5:00 PM (Break: 12:00 - 1:00 PM)
Tuesday:   9:00 AM - 5:00 PM (Break: 12:00 - 1:00 PM)
Wednesday: 9:00 AM - 5:00 PM (Break: 12:00 - 1:00 PM)
Thursday:  9:00 AM - 5:00 PM (Break: 12:00 - 1:00 PM)
Friday:    9:00 AM - 3:00 PM (No break)
Saturday:  Unavailable
Sunday:    Unavailable
```

#### Step 3: Save Schedule
1. Review all days
2. Click **Save Schedule**

### Creating Meeting Types

Define different types of meetings people can book.

#### Step 1: Add Meeting Type
1. Click **+ Add Meeting Type**
2. Dialog opens

#### Step 2: Configure Meeting Type

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Meeting type name | "30-Minute Consultation" |
| **Duration** | Length in minutes | 30 |
| **Description** | What the meeting is for | "Initial discovery call to discuss your needs" |
| **Color** | Calendar color coding | Blue |

#### Step 3: Set Booking Rules

| Rule | Description |
|------|-------------|
| **Buffer Before** | Minutes before meeting (prep time) |
| **Buffer After** | Minutes after meeting (wrap-up) |
| **Min Notice** | Hours/days advance booking required |
| **Max Advance** | How far ahead people can book |

**Example:**
```
Buffer Before: 15 minutes
Buffer After: 15 minutes
Min Notice: 24 hours
Max Advance: 30 days
```

#### Step 4: Set Location
1. Choose default location type
2. Enter video meeting link
3. Or specify physical location

#### Step 5: Add Questions (Optional)
Collect information when booking:
1. Click **Add Question**
2. Enter question text
3. Set as required or optional
4. Choose answer type (text, dropdown, etc.)

**Example Questions:**
- "What would you like to discuss?" (Required, Text)
- "How did you hear about us?" (Optional, Dropdown)

#### Step 6: Save Meeting Type
1. Review settings
2. Click **Create Meeting Type**

### Managing Date Overrides

Block specific dates or change hours for specific days.

#### Step 1: Access Overrides
1. Go to **Availability**
2. Click **Date Overrides** tab

#### Step 2: Add Override

**To Block a Date:**
1. Click **+ Add Override**
2. Select date
3. Choose **Unavailable**
4. Add reason (optional)
5. Save

**To Change Hours:**
1. Click **+ Add Override**
2. Select date
3. Choose **Custom Hours**
4. Set special start/end times
5. Save

**Example Overrides:**
```
Dec 25, 2025 - Unavailable (Holiday)
Dec 26, 2025 - Unavailable (Holiday)
Jan 15, 2026 - 10:00 AM - 2:00 PM (Conference)
```

### Sharing Your Booking Link

#### Step 1: Get Booking URL
1. Go to **Availability**
2. Find **Your Booking Link**
3. Copy the URL

**URL Format:**
```
https://yourdomain.com/book/[your-username]
```

#### Step 2: Share Link
- Add to email signature
- Include on website
- Share in proposals
- Add to business cards

#### Step 3: Embed on Website (Optional)
```html
<iframe 
  src="https://yourdomain.com/book/[username]/embed" 
  width="100%" 
  height="600"
  frameborder="0">
</iframe>
```

---

## Booking Management

Handle incoming bookings and manage your schedule.

### Viewing Bookings

#### Step 1: Access Bookings
1. Go to **Availability**
2. Click **Bookings** tab
3. View all bookings

#### Step 2: Filter Bookings

| Filter | Options |
|--------|---------|
| **Status** | Pending, Confirmed, Cancelled |
| **Date Range** | Today, This Week, This Month, Custom |
| **Meeting Type** | Filter by type |

### Confirming a Booking

#### Step 1: Find Pending Booking
1. Look for "Pending" status
2. Click on the booking

#### Step 2: Review Details
- Booker's name and email
- Requested date/time
- Answers to questions
- Meeting type

#### Step 3: Confirm or Decline

**To Confirm:**
1. Click **Confirm Booking**
2. Booker receives confirmation email
3. Meeting added to your calendar

**To Decline:**
1. Click **Decline**
2. Enter reason (optional)
3. Booker receives notification
4. Suggest alternative times (optional)

### Rescheduling a Booking

#### Step 1: Open Booking
1. Find the booking
2. Click to open details

#### Step 2: Initiate Reschedule
1. Click **Reschedule**
2. Select new date/time
3. Add note explaining change

#### Step 3: Notify Booker
1. Click **Send Reschedule Request**
2. Booker receives email with new time
3. They confirm or request different time

### Cancelling a Booking

#### Step 1: Open Booking
1. Find the booking
2. Click to open

#### Step 2: Cancel
1. Click **Cancel Booking**
2. Enter cancellation reason
3. Choose to offer rebooking link

#### Step 3: Confirm
1. Click **Confirm Cancellation**
2. Booker notified via email
3. Time slot reopens for others

### Booking Notifications

Configure email notifications:

| Notification | Recipient | When |
|--------------|-----------|------|
| New Booking | You | When someone books |
| Confirmation | Booker | When you confirm |
| Reminder | Both | Before meeting |
| Cancellation | Both | When cancelled |
| Reschedule | Booker | When time changes |

---

## Calendar Integration

Sync meetings with external calendars.

### Google Calendar Integration

#### Step 1: Connect Account
1. Go to **Settings → Integrations**
2. Find **Google Calendar**
3. Click **Connect**
4. Sign in to Google
5. Grant permissions

#### Step 2: Configure Sync

| Option | Description |
|--------|-------------|
| **Two-Way Sync** | Changes sync both directions |
| **One-Way (Export)** | Platform → Google only |
| **One-Way (Import)** | Google → Platform only |

#### Step 3: Select Calendars
1. Choose which Google calendars to sync
2. Set primary calendar for new events
3. Save settings

### Outlook/Microsoft 365 Integration

#### Step 1: Connect Account
1. Go to **Settings → Integrations**
2. Find **Microsoft 365**
3. Click **Connect**
4. Sign in to Microsoft
5. Grant permissions

#### Step 2: Configure
1. Select calendars to sync
2. Set sync direction
3. Save settings

### iCal Feed (Read-Only)

For calendars that support iCal:

#### Step 1: Get iCal URL
1. Go to **Settings → Calendar**
2. Find **iCal Feed URL**
3. Copy the URL

#### Step 2: Add to Calendar App
1. In your calendar app, add subscription
2. Paste the iCal URL
3. Calendar updates automatically

---

## Quick Reference

### Navigation

| Task | Path |
|------|------|
| View Meetings | `/portal/meetings` |
| Availability Settings | `/portal/availability` |
| Booking Page | `/book/[username]` |

### Meeting Shortcuts

| Action | How |
|--------|-----|
| Quick create | Click date on calendar |
| Duplicate meeting | Open → Actions → Duplicate |
| View attendees | Open meeting → Attendees tab |
| Export to PDF | Open → Actions → Export |

### Availability Tips

1. **Set realistic buffers** - Allow time between meetings
2. **Block focus time** - Use overrides for deep work
3. **Update regularly** - Keep availability current
4. **Use meeting types** - Different durations for different needs

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Booking link not working | Check availability is set up |
| Double bookings | Enable calendar sync |
| No time slots showing | Check weekly schedule and overrides |
| Notifications not sending | Verify email settings |
| Calendar not syncing | Reconnect integration |
