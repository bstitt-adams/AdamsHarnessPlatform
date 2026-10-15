"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Phone,
  Building,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { collection, getDocs, addDoc, query, where, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberAvailabilityDoc, type BookingDoc, type CalendarEventDoc } from "@/lib/schema";
import { buildGoogleCalendarLink, buildOutlookCalendarLink, buildICSContent, encodeICSForDataUri } from "@/lib/calendar-invite";
import { logOpportunityCreated } from "@/lib/activity-logger";

// Generate time slots for a given day
const generateTimeSlots = (startTime: string, endTime: string, duration: number): string[] => {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  while (currentHour < endHour || (currentHour === endHour && currentMin + duration <= endMin)) {
    const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
    slots.push(timeStr);
    
    currentMin += duration;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
  }
  
  return slots;
};

// Format time for display
const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Get next N days
const getNextDays = (count: number): Date[] => {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 1; i <= count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }
  
  return days;
};

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<TeamMemberAvailabilityDoc | null>(null);
  const [step, setStep] = useState<'select-type' | 'select-time' | 'enter-details' | 'confirmed'>('select-type');
  const [selectedMeetingType, setSelectedMeetingType] = useState<{ id: string; name: string; duration: number; description?: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<Date[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  });
  const [confirmedBooking, setConfirmedBooking] = useState<{
    date: string;
    time: string;
    meetingType: string;
  } | null>(null);
  const [confirmedCalendarLinks, setConfirmedCalendarLinks] = useState<{
    googleCalendar: string;
    outlookCalendar: string;
    icsDownload: string;
  } | null>(null);

  // Fetch availability by slug
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!db || !slug) return;
      
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.TEAM_MEMBER_AVAILABILITY));
        let found: TeamMemberAvailabilityDoc | null = null;
        
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as TeamMemberAvailabilityDoc;
          if (data.bookingSlug === slug && data.isActive) {
            found = { ...data, id: docSnap.id };
          }
        });
        
        setAvailability(found);
        
        if (found) {
          // Calculate available days based on weekly availability
          const foundAvailability = found as TeamMemberAvailabilityDoc;
          const days = getNextDays(foundAvailability.maxAdvanceBookingDays || 60);
          const availableDays = days.filter(date => {
            const dayOfWeek = date.getDay();
            const dayAvailability = foundAvailability.weeklyAvailability.find(d => d.dayOfWeek === dayOfWeek);
            if (!dayAvailability?.isEnabled) return false;
            
            // Check blocked dates
            const dateStr = date.toISOString().split('T')[0];
            const isBlocked = foundAvailability.blockedDates?.some(b => b.date === dateStr);
            return !isBlocked;
          });
          
          setAvailableDays(availableDays);
        }
      } catch (error) {
        console.error("Error fetching availability:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailability();
  }, [slug]);

// Update available slots when date changes - check calendar appointments
  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedDate || !availability || !selectedMeetingType || !db) {
        setAvailableSlots([]);
        return;
      }
      
      const dayOfWeek = selectedDate.getDay();
      const dayAvailability = availability.weeklyAvailability.find(d => d.dayOfWeek === dayOfWeek);
      
      if (!dayAvailability?.isEnabled) {
        setAvailableSlots([]);
        return;
      }
      
      // Generate all possible slots
      const allSlots = generateTimeSlots(
        dayAvailability.startTime,
        dayAvailability.endTime,
        selectedMeetingType.duration
      );
      
      // Check existing bookings for this date
      const dateStr = selectedDate.toISOString().split('T')[0];
      try {
        const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);
        const bookingsQuery = query(
          bookingsRef,
          where("teamMemberId", "==", availability.teamMemberId),
          where("date", "==", dateStr),
          where("status", "in", ["confirmed", "pending"])
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        
        // Get booked time ranges
        const bookedRanges: { start: string; end: string }[] = [];
        bookingsSnapshot.forEach((doc) => {
          const data = doc.data();
          bookedRanges.push({ start: data.startTime, end: data.endTime });
        });
        
        // Also check calendar events
        const calendarRef = collection(db, COLLECTIONS.CALENDAR_EVENTS);
        const calendarQuery = query(
          calendarRef,
          where("type", "==", "meeting")
        );
        const calendarSnapshot = await getDocs(calendarQuery);
        
        calendarSnapshot.forEach((doc) => {
          const data = doc.data();
          const eventDate = data.startDate?.toDate?.() || new Date(data.startDate);
          const eventDateStr = eventDate.toISOString().split('T')[0];
          
          if (eventDateStr === dateStr && data.attendees?.includes(availability.teamMemberName)) {
            const startTime = eventDate.toTimeString().slice(0, 5);
            const endDate = data.endDate?.toDate?.() || new Date(data.endDate);
            const endTime = endDate.toTimeString().slice(0, 5);
            bookedRanges.push({ start: startTime, end: endTime });
          }
        });
        
        // Filter out booked slots and apply buffer
        const bufferMinutes = availability.bufferBetweenMeetings || 0;
        const availableSlots = allSlots.filter(slot => {
          const [slotHour, slotMin] = slot.split(':').map(Number);
          const slotStartMinutes = slotHour * 60 + slotMin;
          const slotEndMinutes = slotStartMinutes + selectedMeetingType.duration;
          
          // Check if slot overlaps with any booked range (including buffer)
          return !bookedRanges.some(booked => {
            const [bookedStartHour, bookedStartMin] = booked.start.split(':').map(Number);
            const [bookedEndHour, bookedEndMin] = booked.end.split(':').map(Number);
            const bookedStartMinutes = bookedStartHour * 60 + bookedStartMin - bufferMinutes;
            const bookedEndMinutes = bookedEndHour * 60 + bookedEndMin + bufferMinutes;
            
            return (
              (slotStartMinutes >= bookedStartMinutes && slotStartMinutes < bookedEndMinutes) ||
              (slotEndMinutes > bookedStartMinutes && slotEndMinutes <= bookedEndMinutes) ||
              (slotStartMinutes <= bookedStartMinutes && slotEndMinutes >= bookedEndMinutes)
            );
          });
        });
        
        setAvailableSlots(availableSlots);
      } catch (error) {
        console.error("Error checking availability:", error);
        // Fall back to showing all slots if check fails
        setAvailableSlots(allSlots);
      }
    };
    
    checkAvailability();
  }, [selectedDate, availability, selectedMeetingType]);

  // Handle booking submission
  const handleSubmitBooking = async () => {
    if (!db || !availability || !selectedMeetingType || !selectedDate || !selectedTime) return;
    if (!bookingDetails.name || !bookingDetails.email) {
      toast.error("Please fill in your name and email");
      return;
    }
    
    setSubmitting(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const endHours = hours + Math.floor((minutes + selectedMeetingType.duration) / 60);
      const endMinutes = (minutes + selectedMeetingType.duration) % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      
      // Create booking document
      const bookingData: Omit<BookingDoc, 'id'> = {
        teamMemberId: availability.teamMemberId,
        teamMemberName: availability.teamMemberName,
        teamMemberEmail: availability.teamMemberEmail,
        clientName: bookingDetails.name,
        clientEmail: bookingDetails.email,
        clientPhone: bookingDetails.phone || undefined,
        clientCompany: bookingDetails.company || undefined,
        clientNotes: bookingDetails.notes || undefined,
        meetingTypeId: selectedMeetingType.id,
        meetingTypeName: selectedMeetingType.name,
        date: dateStr,
        startTime: selectedTime,
        endTime: endTime,
        duration: selectedMeetingType.duration,
        timezone: availability.timezone,
        isVirtual: true,
        status: 'confirmed',
        confirmationEmailSent: false,
        reminderEmailSent: false,
        bookedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      const bookingRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), bookingData);

      // Create an Opportunity for this booking
      try {
        const opportunityData = {
          name: `Meeting Request - ${bookingDetails.name}`,
          organizationName: bookingDetails.company || "Unknown",
          stage: "lead",
          value: 10000,
          probability: 30,
          expectedCloseDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          description: `Meeting scheduled via /schedule-a-call.\n\nMeeting Type: ${selectedMeetingType.name}\nDate: ${dateStr}\nTime: ${selectedTime} - ${endTime}\nDuration: ${selectedMeetingType.duration} minutes\nTimezone: ${availability.timezone}\nTeam Member: ${availability.teamMemberName}`,
          notes: `Contact Info:\nEmail: ${bookingDetails.email}\nPhone: ${bookingDetails.phone || "Not provided"}\nCompany: ${bookingDetails.company || "Not provided"}\n\nBooking ID: ${bookingRef.id}\n\nClient Notes: ${bookingDetails.notes || "None"}`,
          source: "schedule-a-call",
          bookingId: bookingRef.id,
          affiliateId: null,
          affiliateName: bookingDetails.name,
          affiliateEmail: bookingDetails.email,
          affiliatePhone: bookingDetails.phone || null,
          affiliateCompany: bookingDetails.company || null,
          deliverables: [],
          isSubscription: false,
          monthlyAmount: null,
          subscriptionTermMonths: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const oppRef = await addDoc(collection(db, COLLECTIONS.OPPORTUNITIES), opportunityData);
        await logOpportunityCreated(oppRef.id, opportunityData.name);
        console.log("Opportunity created for schedule-a-call:", oppRef.id);
      } catch (oppError) {
        console.error("Error creating opportunity from schedule-a-call:", oppError);
        // Continue - don't block the booking if opportunity creation fails
      }

      // Create calendar event
      const startDateTime = new Date(`${dateStr}T${selectedTime}`);
      const endDateTime = new Date(`${dateStr}T${endTime}`);

      // Build calendar invite links and ICS content for GHL email
      const calendarSummary = `${selectedMeetingType.name} with ${availability.teamMemberName}`;
      const calendarDescription = [
        `Meeting: ${selectedMeetingType.name}`,
        `With: ${availability.teamMemberName}`,
        `Client: ${bookingDetails.name} <${bookingDetails.email}>`,
        bookingDetails.phone ? `Phone: ${bookingDetails.phone}` : null,
        bookingDetails.company ? `Company: ${bookingDetails.company}` : null,
        bookingDetails.notes ? `Notes: ${bookingDetails.notes}` : null,
      ].filter(Boolean).join("\n");

      const icsContent = buildICSContent({
        uid: `booking-${bookingRef.id}@adams-electric.com`,
        summary: calendarSummary,
        description: calendarDescription,
        organizerEmail: availability.teamMemberEmail,
        organizerName: availability.teamMemberName,
        attendeeEmail: bookingDetails.email,
        attendeeName: bookingDetails.name,
        startDate: startDateTime,
        endDate: endDateTime,
        timezone: availability.timezone,
      });

      const calendarLinks = {
        googleCalendar: buildGoogleCalendarLink({
          summary: calendarSummary,
          description: calendarDescription,
          startDate: startDateTime,
          endDate: endDateTime,
          timezone: availability.timezone,
        }),
        outlookCalendar: buildOutlookCalendarLink({
          summary: calendarSummary,
          description: calendarDescription,
          startDate: startDateTime,
          endDate: endDateTime,
          timezone: availability.timezone,
        }),
        icsDownload: encodeICSForDataUri(icsContent),
        icsContent,
      };
      
      const calendarEvent: Omit<CalendarEventDoc, 'id'> = {
        title: `Meeting with ${bookingDetails.name}`,
        description: `${selectedMeetingType.name}\n\nClient: ${bookingDetails.name}\nEmail: ${bookingDetails.email}${bookingDetails.phone ? `\nPhone: ${bookingDetails.phone}` : ''}${bookingDetails.company ? `\nCompany: ${bookingDetails.company}` : ''}${bookingDetails.notes ? `\n\nNotes: ${bookingDetails.notes}` : ''}`,
        startDate: Timestamp.fromDate(startDateTime),
        endDate: Timestamp.fromDate(endDateTime),
        type: 'meeting',
        color: '#0072BC',
        attendees: [bookingDetails.name, availability.teamMemberName],
        meetingId: bookingRef.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      try {
        await addDoc(collection(db, COLLECTIONS.CALENDAR_EVENTS), calendarEvent);
        console.log("Calendar event created for booking:", bookingRef.id);
      } catch (calendarError) {
        console.error("Error creating calendar event for booking:", calendarError);
        // Don't fail the booking if calendar event creation fails
      }

      // 2. Create the appointment in the connected GoHighLevel calendar
      try {
        const ghlResponse = await fetch('/api/gohighlevel/calendar-events/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${selectedMeetingType.name} with ${bookingDetails.name}`,
            description: calendarEvent.description,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            location: 'Virtual Meeting',
          }),
        });

        const ghlResult = await ghlResponse.json();
        if (ghlResult.success) {
          console.log("GHL calendar event created for booking:", bookingRef.id, ghlResult.event?.ghlEventId);
        } else {
          console.error("GHL calendar event creation returned error:", ghlResult.error);
        }
      } catch (ghlError) {
        console.error("Error creating GHL calendar event for booking:", ghlError);
        // Don't fail the booking if GHL calendar creation fails
      }

      // 1. Send email confirmation with iCal attachment
      let confirmationEmailSent = false;
      try {
        await fetch('/api/bookings/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: bookingRef.id,
            teamMemberName: availability.teamMemberName,
            teamMemberEmail: availability.teamMemberEmail,
            clientName: bookingDetails.name,
            clientEmail: bookingDetails.email,
            clientPhone: bookingDetails.phone || undefined,
            clientCompany: bookingDetails.company || undefined,
            meetingType: selectedMeetingType.name,
            date: selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
            time: formatTime(selectedTime),
            duration: selectedMeetingType.duration,
            timezone: availability.timezone,
            notes: bookingDetails.notes || undefined,
            icsContent: calendarLinks.icsContent,
          }),
        });
        confirmationEmailSent = true;

        // Update booking to record that the confirmation email was sent
        await updateDoc(bookingRef, { confirmationEmailSent: true });
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
        // Don't fail the booking if email fails, but still log it
      }

      // 2. Submit webhook to GHL to start appointment reminder workflow
      try {
        await fetch('https://services.leadconnectorhq.com/hooks/o1rlj177UVXuz2i8tHHJ/webhook-trigger/5d08cd4b-d5b3-4db4-9e16-26b7bb6b6fa1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: bookingRef.id,
            teamMemberName: availability.teamMemberName,
            teamMemberEmail: availability.teamMemberEmail,
            clientName: bookingDetails.name,
            clientEmail: bookingDetails.email,
            clientPhone: bookingDetails.phone || undefined,
            clientCompany: bookingDetails.company || undefined,
            clientNotes: bookingDetails.notes || undefined,
            meetingType: selectedMeetingType.name,
            date: dateStr,
            startTime: selectedTime,
            endTime: endTime,
            duration: selectedMeetingType.duration,
            timezone: availability.timezone,
            status: 'confirmed',
            bookedAt: new Date().toISOString(),
            confirmationEmailSent,
            triggerType: 'appointment_reminder',
            calendar: calendarLinks,
          }),
        });
      } catch (webhookError) {
        console.error("Error sending booking to LeadConnector webhook:", webhookError);
        // Don't fail the booking if webhook fails
      }
      
      // Set confirmed state
      setConfirmedBooking({
        date: selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        time: formatTime(selectedTime),
        meetingType: selectedMeetingType.name,
      });
      setConfirmedCalendarLinks({
        googleCalendar: calendarLinks.googleCalendar,
        outlookCalendar: calendarLinks.outlookCalendar,
        icsDownload: calendarLinks.icsDownload,
      });
      setStep('confirmed');
      
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Error creating booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading booking page...</p>
        </div>
      </div>
    );
  }

  if (!availability) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Booking Page Not Found</h2>
            <p className="text-muted-foreground">
              This booking page doesn't exist or is no longer active.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Avatar className="h-20 w-20 mx-auto mb-4">
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {availability.teamMemberName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold mb-2">{availability.bookingTitle || `Book a meeting with ${availability.teamMemberName}`}</h1>
          {availability.bookingDescription && (
            <p className="text-muted-foreground max-w-lg mx-auto">{availability.bookingDescription}</p>
          )}
        </div>

        {/* Progress Steps */}
        {step !== 'confirmed' && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'select-type' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'}`}>
                1
              </div>
              <div className={`w-16 h-1 ${step !== 'select-type' ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'select-time' ? 'bg-primary text-primary-foreground' : step === 'enter-details' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                2
              </div>
              <div className={`w-16 h-1 ${step === 'enter-details' ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'enter-details' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                3
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Select Meeting Type */}
        {step === 'select-type' && (
          <Card>
            <CardHeader>
              <CardTitle>Select a Meeting Type</CardTitle>
              <CardDescription>Choose the type of meeting you'd like to schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availability.meetingTypes.map((mt) => (
                <div
                  key={mt.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary ${selectedMeetingType?.id === mt.id ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => setSelectedMeetingType(mt)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{mt.name}</h3>
                      {mt.description && <p className="text-sm text-muted-foreground mt-1">{mt.description}</p>}
                    </div>
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {mt.duration} min
                    </Badge>
                  </div>
                </div>
              ))}
              
              <div className="pt-4">
                <Button
                  className="w-full"
                  disabled={!selectedMeetingType}
                  onClick={() => setStep('select-time')}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 'select-time' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('select-type')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle>Select Date & Time</CardTitle>
                  <CardDescription>{selectedMeetingType?.name} - {selectedMeetingType?.duration} minutes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Date Selection */}
                <div>
                  <Label className="mb-3 block">Select a Date</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableDays.slice(0, 21).map((date) => (
                      <Button
                        key={date.toISOString()}
                        variant={selectedDate?.toDateString() === date.toDateString() ? 'default' : 'outline'}
                        className="flex flex-col h-auto py-2"
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedTime(null);
                        }}
                      >
                        <span className="text-xs">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className="text-lg font-bold">{date.getDate()}</span>
                        <span className="text-xs">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div>
                  <Label className="mb-3 block">Select a Time</Label>
                  {selectedDate ? (
                    availableSlots.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {availableSlots.map((time) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? 'default' : 'outline'}
                            onClick={() => setSelectedTime(time)}
                          >
                            {formatTime(time)}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No available times for this date</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Select a date to see available times</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <Button
                  className="w-full"
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => setStep('enter-details')}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Enter Details */}
        {step === 'enter-details' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('select-time')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle>Enter Your Details</CardTitle>
                  <CardDescription>
                    {selectedMeetingType?.name} on {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTime && formatTime(selectedTime)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    <User className="h-4 w-4 inline mr-1" />
                    Your Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="John Smith"
                    value={bookingDetails.name}
                    onChange={(e) => setBookingDetails({ ...bookingDetails, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={bookingDetails.email}
                    onChange={(e) => setBookingDetails({ ...bookingDetails, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    placeholder="(555) 123-4567"
                    value={bookingDetails.phone}
                    onChange={(e) => setBookingDetails({ ...bookingDetails, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">
                    <Building className="h-4 w-4 inline mr-1" />
                    Company
                  </Label>
                  <Input
                    id="company"
                    placeholder="Acme Inc."
                    value={bookingDetails.company}
                    onChange={(e) => setBookingDetails({ ...bookingDetails, company: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">
                  <MessageSquare className="h-4 w-4 inline mr-1" />
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Anything you'd like us to know before the meeting..."
                  value={bookingDetails.notes}
                  onChange={(e) => setBookingDetails({ ...bookingDetails, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="pt-4">
                <Button
                  className="w-full"
                  disabled={!bookingDetails.name || !bookingDetails.email || submitting}
                  onClick={handleSubmitBooking}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm Booking
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation */}
        {step === 'confirmed' && confirmedBooking && (
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
              <p className="text-muted-foreground mb-6">
                Your meeting has been scheduled. A confirmation email with a calendar invite has been sent to <strong>{bookingDetails.email}</strong> and our team at <strong>info@adams-electric.com</strong>.
              </p>
              
              <div className="bg-muted rounded-lg p-4 max-w-sm mx-auto text-left space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{confirmedBooking.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{confirmedBooking.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span>{confirmedBooking.meetingType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>with {availability.teamMemberName}</span>
                </div>
              </div>

              {confirmedCalendarLinks && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <a href={confirmedCalendarLinks.googleCalendar} target="_blank" rel="noopener noreferrer">
                      Google Calendar
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={confirmedCalendarLinks.outlookCalendar} target="_blank" rel="noopener noreferrer">
                      Outlook
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={confirmedCalendarLinks.icsDownload} download="meeting-invite.ics">
                      Download iCal
                    </a>
                  </Button>
                </div>
              )}

              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('select-type');
                    setSelectedMeetingType(null);
                    setSelectedDate(null);
                    setSelectedTime(null);
                    setBookingDetails({ name: '', email: '', phone: '', company: '', notes: '' });
                    setConfirmedBooking(null);
                    setConfirmedCalendarLinks(null);
                  }}
                >
                  Book Another Meeting
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Powered by Adams Electric</p>
        </div>
      </div>
    </div>
  );
}
