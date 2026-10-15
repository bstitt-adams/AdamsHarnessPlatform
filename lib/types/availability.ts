// Availability Management Types

export interface TimeSlot {
  start: string; // HH:mm format (e.g., "09:00")
  end: string;   // HH:mm format (e.g., "17:00")
}

export interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface WeeklySchedule {
  sunday: DayAvailability;
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
}

export interface DateOverride {
  id: string;
  date: string; // YYYY-MM-DD format
  type: "unavailable" | "custom";
  slots?: TimeSlot[]; // Only if type is "custom"
  reason?: string;
}

export interface MeetingType {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  color: string;
  bufferBefore: number; // minutes before meeting
  bufferAfter: number;  // minutes after meeting
  isActive: boolean;
  maxBookingsPerDay?: number;
  requiresApproval: boolean;
  questions?: BookingQuestion[];
}

export interface BookingQuestion {
  id: string;
  question: string;
  type: "text" | "textarea" | "select" | "checkbox";
  required: boolean;
  options?: string[]; // For select type
}

export interface OwnerAvailability {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  timezone: string;
  weeklySchedule: WeeklySchedule;
  dateOverrides: DateOverride[];
  meetingTypes: MeetingType[];
  bookingLink?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  meetingTypeId: string;
  meetingTypeName: string;
  ownerId: string;
  ownerName: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes?: string;
  answers?: Record<string, string>; // Question ID -> Answer
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

// Default weekly schedule (Mon-Fri 9am-5pm)
export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  sunday: { enabled: false, slots: [] },
  monday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  tuesday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  wednesday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  thursday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  friday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  saturday: { enabled: false, slots: [] },
};

// Common timezones
export const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Asia/Shanghai", label: "China Standard Time (CST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

// Duration options for meetings
export const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "2 hours" },
];

// Time slot options (15-minute increments)
export const TIME_SLOTS: string[] = [];
for (let hour = 0; hour < 24; hour++) {
  for (let minute = 0; minute < 60; minute += 15) {
    const h = hour.toString().padStart(2, "0");
    const m = minute.toString().padStart(2, "0");
    TIME_SLOTS.push(`${h}:${m}`);
  }
}

// Helper function to format time for display
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Helper function to get available time slots for a date
export function getAvailableSlots(
  schedule: WeeklySchedule,
  dateOverrides: DateOverride[],
  date: Date,
  duration: number,
  existingBookings: Booking[]
): string[] {
  const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as keyof WeeklySchedule;
  const dateStr = date.toISOString().split("T")[0];
  
  // Check for date override
  const override = dateOverrides.find((o) => o.date === dateStr);
  if (override?.type === "unavailable") {
    return [];
  }
  
  // Get base slots from override or weekly schedule
  const daySchedule = override?.type === "custom" && override.slots 
    ? { enabled: true, slots: override.slots }
    : schedule[dayOfWeek];
  
  if (!daySchedule.enabled || daySchedule.slots.length === 0) {
    return [];
  }
  
  // Generate all possible slots
  const availableSlots: string[] = [];
  
  for (const slot of daySchedule.slots) {
    const [startHour, startMin] = slot.start.split(":").map(Number);
    const [endHour, endMin] = slot.end.split(":").map(Number);
    
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    while (currentMinutes + duration <= endMinutes) {
      const slotStart = `${Math.floor(currentMinutes / 60).toString().padStart(2, "0")}:${(currentMinutes % 60).toString().padStart(2, "0")}`;
      const slotEnd = `${Math.floor((currentMinutes + duration) / 60).toString().padStart(2, "0")}:${((currentMinutes + duration) % 60).toString().padStart(2, "0")}`;
      
      // Check if slot conflicts with existing bookings
      const hasConflict = existingBookings.some((booking) => {
        if (booking.date !== dateStr || booking.status === "cancelled") return false;
        const bookingStart = booking.startTime;
        const bookingEnd = booking.endTime;
        return (slotStart < bookingEnd && slotEnd > bookingStart);
      });
      
      if (!hasConflict) {
        availableSlots.push(slotStart);
      }
      
      currentMinutes += 15; // 15-minute increments
    }
  }
  
  return availableSlots;
}
