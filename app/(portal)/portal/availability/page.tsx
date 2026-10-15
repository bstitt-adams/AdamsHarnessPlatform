"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Settings,
  Users,
  CalendarDays,
  CalendarX,
  Save,
  Eye,
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Pencil,
  QrCode,
  Download,
  RefreshCw,
  Share2,
} from "lucide-react";
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, Timestamp, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberAvailabilityDoc, type BookingDoc, type TeamMemberDoc, type CalendarEventDoc } from "@/lib/schema";
import { cn } from "@/lib/utils";
import {
  type WeeklySchedule,
  type MeetingType,
  type DateOverride,
  type TimeSlot,
  type Booking,
  DEFAULT_WEEKLY_SCHEDULE,
  TIMEZONES,
  DURATION_OPTIONS,
  TIME_SLOTS,
  formatTime,
} from "@/lib/types/availability";

const DAYS_OF_WEEK = [
  { key: "sunday", label: "Sunday", short: "Sun" },
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
] as const;

// Default meeting types for new users
const DEFAULT_MEETING_TYPES: MeetingType[] = [
  {
    id: "default-discovery",
    name: "Discovery/Scoping Session",
    description: "60-minute complimentary session to explore your goals",
    duration: 60,
    color: "#0072BC",
    bufferBefore: 0,
    bufferAfter: 15,
    isActive: true,
    requiresApproval: false,
  },
  {
    id: "default-quick",
    name: "Quick Consultation",
    description: "30-minute focused discussion on a specific topic",
    duration: 30,
    color: "#3b82f6",
    bufferBefore: 0,
    bufferAfter: 10,
    isActive: true,
    requiresApproval: false,
  },
];

export default function AvailabilityPage() {
  const [timezone, setTimezone] = useState("America/New_York");
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isAddMeetingTypeOpen, setIsAddMeetingTypeOpen] = useState(false);
  const [isAddOverrideOpen, setIsAddOverrideOpen] = useState(false);
  const [editingMeetingType, setEditingMeetingType] = useState<MeetingType | null>(null);
  const [newMeetingType, setNewMeetingType] = useState<Partial<MeetingType>>({
    name: "",
    description: "",
    duration: 60,
    color: "#0072BC",
    bufferBefore: 0,
    bufferAfter: 15,
    isActive: true,
    requiresApproval: false,
  });
  const [newOverride, setNewOverride] = useState<Partial<DateOverride>>({
    date: "",
    type: "unavailable",
    reason: "",
    slots: [{ start: "09:00", end: "17:00" }],
  });

  // Firebase & Team Member state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTeamMember, setCurrentTeamMember] = useState<TeamMemberDoc | null>(null);
  const [availabilityDoc, setAvailabilityDoc] = useState<TeamMemberAvailabilityDoc | null>(null);
  const [bookingSlug, setBookingSlug] = useState("");
  const [bookingTitle, setBookingTitle] = useState("");
  const [bookingDescription, setBookingDescription] = useState("");
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberDoc[]>([]);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string>("");

  // Get booking URL
  const getBookingUrl = (slug?: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/book/${slug || bookingSlug}`;
  };

  // Fetch team members with role "team"
  const fetchTeamMembers = async () => {
    if (!db) return;
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.TEAM_MEMBERS));
      const members: TeamMemberDoc[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as TeamMemberDoc;
        if (data.role === 'team' || data.role === 'admin') {
          members.push({ ...data, id: docSnap.id });
        }
      });
      setTeamMembers(members);
      // Auto-select first team member if available
      if (members.length > 0 && !selectedTeamMemberId) {
        setSelectedTeamMemberId(members[0].id);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  // Fetch availability for selected team member
  const fetchAvailability = async (teamMemberId: string) => {
    if (!db || !teamMemberId) return;
    setLoading(true);
    try {
      const docRef = doc(db, COLLECTIONS.TEAM_MEMBER_AVAILABILITY, teamMemberId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as TeamMemberAvailabilityDoc;
        setAvailabilityDoc(data);
        setBookingSlug(data.bookingSlug || '');
        setBookingTitle(data.bookingTitle || '');
        setBookingDescription(data.bookingDescription || '');
        setTimezone(data.timezone || 'America/New_York');
        
        // Load weekly schedule from saved data
        if (data.weeklyAvailability && data.weeklyAvailability.length > 0) {
          const loadedSchedule: WeeklySchedule = { ...DEFAULT_WEEKLY_SCHEDULE };
          const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
          data.weeklyAvailability.forEach((slot) => {
            const dayKey = dayKeys[slot.dayOfWeek];
            if (dayKey) {
              loadedSchedule[dayKey] = {
                enabled: slot.isEnabled,
                slots: [{ start: slot.startTime, end: slot.endTime }],
              };
            }
          });
          setWeeklySchedule(loadedSchedule);
        } else {
          setWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE);
        }
        
        // Load meeting types from saved data
        if (data.meetingTypes && data.meetingTypes.length > 0) {
          const loadedMeetingTypes: MeetingType[] = data.meetingTypes.map((mt, index) => ({
            id: mt.id,
            name: mt.name,
            description: mt.description || '',
            duration: mt.duration,
            color: ['#0072BC', '#3b82f6', '#8b5cf6', '#22c55e', '#f97316'][index % 5],
            bufferBefore: 0,
            bufferAfter: data.bufferBetweenMeetings || 15,
            isActive: true,
            requiresApproval: false,
          }));
          setMeetingTypes(loadedMeetingTypes);
        } else {
          setMeetingTypes(DEFAULT_MEETING_TYPES);
        }
        
        // Load blocked dates as date overrides
        if (data.blockedDates && data.blockedDates.length > 0) {
          const loadedOverrides: DateOverride[] = data.blockedDates.map((bd, index) => ({
            id: `override-${index}`,
            date: bd.date,
            type: 'unavailable' as const,
            reason: bd.reason,
          }));
          setDateOverrides(loadedOverrides);
        } else {
          setDateOverrides([]);
        }
      } else {
        // Create default availability for this team member
        const member = teamMembers.find(m => m.id === teamMemberId);
        if (member) {
          const slug = `${member.firstName.toLowerCase()}-${member.lastName.toLowerCase()}`.replace(/\s+/g, '-');
          setBookingSlug(slug);
          setBookingTitle(`Book a meeting with ${member.firstName} ${member.lastName}`);
          setBookingDescription(member.expertise || '');
        }
        setAvailabilityDoc(null);
        setWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE);
        setMeetingTypes(DEFAULT_MEETING_TYPES);
        setDateOverrides([]);
      }

      // Fetch bookings for this team member
      const bookingsQuery = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where('teamMemberId', '==', teamMemberId)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData: Booking[] = [];
      bookingsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        bookingsData.push({
          id: docSnap.id,
          meetingTypeId: data.meetingTypeId,
          meetingTypeName: data.meetingTypeName,
          ownerId: data.teamMemberId,
          ownerName: data.teamMemberName,
          guestName: data.clientName,
          guestEmail: data.clientEmail,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          timezone: data.timezone,
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });
      setBookings(bookingsData);

      // Set current team member
      const member = teamMembers.find(m => m.id === teamMemberId);
      setCurrentTeamMember(member || null);
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error("Failed to load availability settings");
    } finally {
      setLoading(false);
    }
  };

  // Save availability to Firebase
  const saveAvailability = async () => {
    if (!db || !selectedTeamMemberId || !currentTeamMember) {
      toast.error("Please select a team member first");
      return;
    }
    
    setSaving(true);
    try {
      const availabilityData: TeamMemberAvailabilityDoc = {
        id: selectedTeamMemberId,
        teamMemberId: selectedTeamMemberId,
        teamMemberName: `${currentTeamMember.firstName} ${currentTeamMember.lastName}`,
        teamMemberEmail: currentTeamMember.emailPrimary,
        bookingSlug: bookingSlug,
        bookingTitle: bookingTitle,
        bookingDescription: bookingDescription,
        timezone: timezone,
        weeklyAvailability: Object.entries(weeklySchedule).map(([day, schedule], index) => ({
          dayOfWeek: index as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          startTime: schedule.slots[0]?.start || '09:00',
          endTime: schedule.slots[0]?.end || '17:00',
          isEnabled: schedule.enabled,
        })),
        defaultMeetingDuration: 60,
        allowedDurations: [30, 45, 60, 90],
        bufferBetweenMeetings: 15,
        maxAdvanceBookingDays: 60,
        minAdvanceBookingHours: 24,
        meetingTypes: meetingTypes.map(mt => ({
          id: mt.id,
          name: mt.name,
          duration: mt.duration,
          description: mt.description,
          isVirtual: true,
        })),
        blockedDates: dateOverrides.filter(o => o.type === 'unavailable').map(o => ({
          date: o.date,
          reason: o.reason,
        })),
        isActive: true,
        createdAt: availabilityDoc?.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, COLLECTIONS.TEAM_MEMBER_AVAILABILITY, selectedTeamMemberId), availabilityData);
      setAvailabilityDoc(availabilityData);
      toast.success("Availability saved successfully!");
    } catch (error) {
      console.error("Error saving availability:", error);
      toast.error("Error saving availability. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  // Download QR code
  const downloadQrCode = () => {
    const svg = document.getElementById('booking-qr-code');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `booking-qr-${bookingSlug}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedTeamMemberId && teamMembers.length > 0) {
      fetchAvailability(selectedTeamMemberId);
    }
  }, [selectedTeamMemberId, teamMembers]);

  const toggleDayEnabled = (day: keyof WeeklySchedule) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const updateDaySlot = (day: keyof WeeklySchedule, slotIndex: number, field: "start" | "end", value: string) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, i) =>
          i === slotIndex ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  const addSlotToDay = (day: keyof WeeklySchedule) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, { start: "09:00", end: "17:00" }],
      },
    }));
  };

  const removeSlotFromDay = (day: keyof WeeklySchedule, slotIndex: number) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, i) => i !== slotIndex),
      },
    }));
  };

  const saveMeetingType = () => {
    if (!newMeetingType.name) return;
    
    if (editingMeetingType) {
      setMeetingTypes((prev) =>
        prev.map((mt) =>
          mt.id === editingMeetingType.id ? { ...mt, ...newMeetingType } as MeetingType : mt
        )
      );
    } else {
      const newType: MeetingType = {
        ...newMeetingType,
        id: `mt-${Date.now()}`,
      } as MeetingType;
      setMeetingTypes((prev) => [...prev, newType]);
    }
    
    setIsAddMeetingTypeOpen(false);
    setEditingMeetingType(null);
    setNewMeetingType({
      name: "",
      description: "",
      duration: 60,
      color: "#0072BC",
      bufferBefore: 0,
      bufferAfter: 15,
      isActive: true,
      requiresApproval: false,
    });
  };

  const deleteMeetingType = (id: string) => {
    setMeetingTypes((prev) => prev.filter((mt) => mt.id !== id));
  };

  const addDateOverride = () => {
    if (!newOverride.date) return;
    
    const override: DateOverride = {
      id: `override-${Date.now()}`,
      date: newOverride.date,
      type: newOverride.type || "unavailable",
      reason: newOverride.reason,
      slots: newOverride.type === "custom" ? (newOverride.slots || [{ start: "09:00", end: "17:00" }]) : undefined,
    };
    
    setDateOverrides((prev) => [...prev, override]);
    setIsAddOverrideOpen(false);
    setNewOverride({ date: "", type: "unavailable", reason: "", slots: [{ start: "09:00", end: "17:00" }] });
  };

  const removeDateOverride = (id: string) => {
    setDateOverrides((prev) => prev.filter((o) => o.id !== id));
  };

  const copyBookingLink = (meetingTypeId: string) => {
    const link = `${window.location.origin}/book/${meetingTypeId}`;
    navigator.clipboard.writeText(link);
    toast.success("Booking link copied to clipboard!");
  };

  const updateBookingStatus = async (bookingId: string, status: Booking["status"]) => {
    if (!db) return;
    
    try {
      const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
      const updateData: Record<string, any> = {
        status,
        updatedAt: Timestamp.now(),
      };
      
      if (status === 'confirmed') {
        updateData.confirmedAt = Timestamp.now();
      } else if (status === 'cancelled') {
        updateData.cancelledAt = Timestamp.now();
      }
      
      await updateDoc(bookingRef, updateData);
      
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
      
      toast.success(`Booking ${status === 'confirmed' ? 'confirmed' : status === 'cancelled' ? 'cancelled' : 'updated'}`);
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast.error("Failed to update booking status");
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!db) return;
    
    try {
      await deleteDoc(doc(db, COLLECTIONS.BOOKINGS, bookingId));
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      toast.success("Booking deleted");
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("Failed to delete booking");
    }
  };

  // Stats
  const activeMeetingTypes = meetingTypes.filter((mt) => mt.isActive).length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-8 w-8" />
            Availability Management
          </h1>
          <p className="text-muted-foreground">
            Set your availability and manage meeting types for scheduling
          </p>
        </div>
        <div className="flex gap-2">
          {teamMembers.length > 0 && (
            <Select value={selectedTeamMemberId} onValueChange={setSelectedTeamMemberId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={() => setIsQrDialogOpen(true)} disabled={!bookingSlug}>
            <QrCode className="mr-2 h-4 w-4" />
            QR Code
          </Button>
          <Button variant="outline" asChild>
            <a href={getBookingUrl()} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </a>
          </Button>
          <Button onClick={saveAvailability} disabled={saving || !selectedTeamMemberId}>
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Meeting Types</p>
                <p className="text-2xl font-bold">{activeMeetingTypes}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-sky-600">{pendingBookings}</p>
              </div>
              <Clock className="h-8 w-8 text-sky-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{confirmedBookings}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Date Overrides</p>
                <p className="text-2xl font-bold">{dateOverrides.length}</p>
              </div>
              <CalendarX className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList>
          <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
          <TabsTrigger value="meeting-types">Meeting Types</TabsTrigger>
          <TabsTrigger value="overrides">Date Overrides</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="share">Share & QR Code</TabsTrigger>
        </TabsList>

        {/* Weekly Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Weekly Availability</CardTitle>
                  <CardDescription>Set your regular working hours for each day of the week</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Timezone:</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DAYS_OF_WEEK.map(({ key, label }) => {
                  const day = weeklySchedule[key as keyof WeeklySchedule];
                  return (
                    <div key={key} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-3 w-32">
                        <Switch
                          checked={day.enabled}
                          onCheckedChange={() => toggleDayEnabled(key as keyof WeeklySchedule)}
                        />
                        <span className={cn("font-medium", !day.enabled && "text-muted-foreground")}>
                          {label}
                        </span>
                      </div>
                      
                      {day.enabled ? (
                        <div className="flex-1 space-y-2">
                          {day.slots.map((slot, slotIndex) => (
                            <div key={slotIndex} className="flex items-center gap-2">
                              <Select
                                value={slot.start}
                                onValueChange={(v) => updateDaySlot(key as keyof WeeklySchedule, slotIndex, "start", v)}
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIME_SLOTS.map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {formatTime(time)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-muted-foreground">to</span>
                              <Select
                                value={slot.end}
                                onValueChange={(v) => updateDaySlot(key as keyof WeeklySchedule, slotIndex, "end", v)}
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIME_SLOTS.map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {formatTime(time)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {day.slots.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeSlotFromDay(key as keyof WeeklySchedule, slotIndex)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addSlotToDay(key as keyof WeeklySchedule)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add time slot
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unavailable</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meeting Types Tab */}
        <TabsContent value="meeting-types" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Meeting Types</h3>
              <p className="text-sm text-muted-foreground">Create different types of meetings with custom durations</p>
            </div>
            <Button onClick={() => setIsAddMeetingTypeOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Meeting Type
            </Button>
          </div>

          <div className="grid gap-4">
            {meetingTypes.map((mt) => (
              <Card key={mt.id} className={cn(!mt.isActive && "opacity-60")}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-4 h-full min-h-[60px] rounded"
                        style={{ backgroundColor: mt.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{mt.name}</h4>
                          {!mt.isActive && <Badge variant="secondary">Inactive</Badge>}
                          {mt.requiresApproval && <Badge variant="outline">Requires Approval</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{mt.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {mt.duration} minutes
                          </span>
                          {(mt.bufferBefore > 0 || mt.bufferAfter > 0) && (
                            <span>
                              Buffer: {mt.bufferBefore}m before, {mt.bufferAfter}m after
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyBookingLink(mt.id)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingMeetingType(mt);
                          setNewMeetingType(mt);
                          setIsAddMeetingTypeOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMeetingType(mt.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Date Overrides Tab */}
        <TabsContent value="overrides" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Date Overrides</h3>
              <p className="text-sm text-muted-foreground">Block specific dates or set custom hours</p>
            </div>
            <Button onClick={() => setIsAddOverrideOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Override
            </Button>
          </div>

          {dateOverrides.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CalendarX className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No date overrides set</p>
                <p className="text-sm text-muted-foreground">Add overrides for holidays, vacations, or special hours</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dateOverrides.map((override) => (
                      <TableRow key={override.id}>
                        <TableCell className="font-medium">
                          {new Date(override.date + "T00:00:00").toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={override.type === "unavailable" ? "destructive" : "secondary"}>
                            {override.type === "unavailable" ? "Unavailable" : "Custom Hours"}
                          </Badge>
                          {override.type === "custom" && override.slots && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {override.slots.map((slot, i) => (
                                <span key={i}>
                                  {formatTime(slot.start)} - {formatTime(slot.end)}
                                  {i < override.slots!.length - 1 && <br />}
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {override.reason || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDateOverride(override.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Upcoming Bookings</h3>
              <p className="text-sm text-muted-foreground">Manage your scheduled meetings</p>
            </div>
          </div>

          {bookings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No bookings yet</p>
                <p className="text-sm text-muted-foreground">Share your booking link to start receiving appointments</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Meeting Type</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{booking.guestName}</p>
                            <p className="text-sm text-muted-foreground">{booking.guestEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>{booking.meetingTypeName}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {new Date(booking.date + "T00:00:00").toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              booking.status === "confirmed"
                                ? "default"
                                : booking.status === "pending"
                                ? "secondary"
                                : booking.status === "cancelled"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {booking.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateBookingStatus(booking.id, "confirmed")}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateBookingStatus(booking.id, "cancelled")}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            {booking.status === "confirmed" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateBookingStatus(booking.id, "cancelled")}
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteBooking(booking.id)}
                              title="Delete booking"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Share & QR Code Tab */}
        <TabsContent value="share" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Booking Page Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Booking Page Settings
                </CardTitle>
                <CardDescription>
                  Customize your public booking page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Booking URL Slug</Label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 bg-muted rounded-l-md border border-r-0 text-sm text-muted-foreground">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/book/
                    </span>
                    <Input
                      value={bookingSlug}
                      onChange={(e) => setBookingSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="your-name"
                      className="rounded-l-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Page Title</Label>
                  <Input
                    value={bookingTitle}
                    onChange={(e) => setBookingTitle(e.target.value)}
                    placeholder="Book a meeting with..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={bookingDescription}
                    onChange={(e) => setBookingDescription(e.target.value)}
                    placeholder="Describe what you do and what meetings are about..."
                    rows={3}
                  />
                </div>
                <div className="pt-4 space-y-2">
                  <Label>Your Booking Link</Label>
                  <div className="flex gap-2">
                    <Input value={getBookingUrl()} readOnly className="bg-muted" />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(getBookingUrl());
                        toast.success("Link copied to clipboard!");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={getBookingUrl()} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code
                </CardTitle>
                <CardDescription>
                  Scan to open your booking page
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                {bookingSlug ? (
                  <>
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                      <QRCodeSVG
                        id="booking-qr-code-main"
                        value={getBookingUrl()}
                        size={200}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      {currentTeamMember ? `${currentTeamMember.firstName} ${currentTeamMember.lastName}` : 'Team Member'}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={downloadQrCode}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PNG
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(getBookingUrl());
                          toast.success("Link copied!");
                        }}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share Link
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Set a booking slug to generate QR code</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team Members with Booking Pages */}
          {teamMembers.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Team Booking Pages
                </CardTitle>
                <CardDescription>
                  Quick access to all team member booking pages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamMembers.map((member) => {
                    const memberSlug = `${member.firstName.toLowerCase()}-${member.lastName.toLowerCase()}`.replace(/\s+/g, '-');
                    const memberUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${memberSlug}`;
                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{member.firstName} {member.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{member.expertise}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(memberUrl);
                              toast.success(`Link copied for ${member.firstName}!`);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={memberUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Booking QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to open the booking page
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <QRCodeSVG
                id="booking-qr-code"
                value={getBookingUrl()}
                size={250}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-sm font-medium">
              {currentTeamMember ? `${currentTeamMember.firstName} ${currentTeamMember.lastName}` : 'Team Member'}
            </p>
            <p className="text-xs text-muted-foreground break-all text-center">
              {getBookingUrl()}
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={downloadQrCode}>
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(getBookingUrl());
                toast.success("Link copied to clipboard!");
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Meeting Type Dialog */}
      <Dialog open={isAddMeetingTypeOpen} onOpenChange={setIsAddMeetingTypeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMeetingType ? "Edit Meeting Type" : "Add Meeting Type"}</DialogTitle>
            <DialogDescription>
              Create a new type of meeting that guests can book
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="e.g., Discovery Call"
                value={newMeetingType.name || ""}
                onChange={(e) => setNewMeetingType({ ...newMeetingType, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this meeting is about..."
                value={newMeetingType.description || ""}
                onChange={(e) => setNewMeetingType({ ...newMeetingType, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={newMeetingType.duration?.toString()}
                  onValueChange={(v) => setNewMeetingType({ ...newMeetingType, duration: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={newMeetingType.color || "#0072BC"}
                    onChange={(e) => setNewMeetingType({ ...newMeetingType, color: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={newMeetingType.color || "#0072BC"}
                    onChange={(e) => setNewMeetingType({ ...newMeetingType, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buffer Before (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  value={newMeetingType.bufferBefore || 0}
                  onChange={(e) => setNewMeetingType({ ...newMeetingType, bufferBefore: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Buffer After (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  value={newMeetingType.bufferAfter || 0}
                  onChange={(e) => setNewMeetingType({ ...newMeetingType, bufferAfter: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newMeetingType.isActive}
                  onCheckedChange={(v) => setNewMeetingType({ ...newMeetingType, isActive: v })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newMeetingType.requiresApproval}
                  onCheckedChange={(v) => setNewMeetingType({ ...newMeetingType, requiresApproval: v })}
                />
                <Label>Requires Approval</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddMeetingTypeOpen(false);
              setEditingMeetingType(null);
            }}>
              Cancel
            </Button>
            <Button onClick={saveMeetingType} disabled={!newMeetingType.name}>
              {editingMeetingType ? "Save Changes" : "Add Meeting Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Date Override Dialog */}
      <Dialog open={isAddOverrideOpen} onOpenChange={setIsAddOverrideOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Date Override</DialogTitle>
            <DialogDescription>
              Block a specific date or set custom hours
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={newOverride.date || ""}
                onChange={(e) => setNewOverride({ ...newOverride, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newOverride.type}
                onValueChange={(v) => setNewOverride({ ...newOverride, type: v as "unavailable" | "custom" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unavailable">Unavailable (entire day)</SelectItem>
                  <SelectItem value="custom">Custom Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Custom Time Slots */}
            {newOverride.type === "custom" && (
              <div className="space-y-3">
                <Label>Custom Hours</Label>
                {newOverride.slots?.map((slot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={slot.start}
                      onValueChange={(v) => {
                        const newSlots = [...(newOverride.slots || [])];
                        newSlots[index] = { ...slot, start: v };
                        setNewOverride({ ...newOverride, slots: newSlots });
                      }}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Start" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {formatTime(time)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">to</span>
                    <Select
                      value={slot.end}
                      onValueChange={(v) => {
                        const newSlots = [...(newOverride.slots || [])];
                        newSlots[index] = { ...slot, end: v };
                        setNewOverride({ ...newOverride, slots: newSlots });
                      }}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="End" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {formatTime(time)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {newOverride.slots && newOverride.slots.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newSlots = newOverride.slots?.filter((_, i) => i !== index) || [];
                          setNewOverride({ ...newOverride, slots: newSlots });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newSlots = [...(newOverride.slots || []), { start: "09:00", end: "17:00" }];
                    setNewOverride({ ...newOverride, slots: newSlots });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add time slot
                </Button>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g., Holiday, Vacation, etc."
                value={newOverride.reason || ""}
                onChange={(e) => setNewOverride({ ...newOverride, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOverrideOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addDateOverride} disabled={!newOverride.date}>
              Add Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
