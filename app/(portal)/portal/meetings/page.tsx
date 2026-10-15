"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Video,
  Calendar,
  Clock,
  Users,
  FileText,
  Play,
  CheckSquare,
  ExternalLink,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
  CalendarPlus,
  Link as LinkIcon,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  where,
  getDocs,
} from "firebase/firestore";
import { COLLECTIONS, type CalendarEventDoc, type TeamMemberDoc } from "@/lib/schema";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isPast, addMinutes } from "date-fns";
import { syncMeetingToCalendars, updateMeetingOnCalendars, deleteMeetingFromCalendars } from "@/lib/calendar-sync-service";

interface MeetingData {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: "discovery" | "follow-up" | "project" | "internal" | "one-to-one" | "custom";
  location?: string;
  meetingUrl?: string;
  attendees?: string[];
  opportunityId?: string;
  projectId?: string;
  rockId?: string;
  notes?: string;
  transcript?: string;
  recordingUrl?: string;
  actionItemCount?: number;
  calendarEventId: string;
}

interface MeetingFormData {
  title: string;
  description: string;
  date: string;
  startTime: string;
  duration: number;
  type: string;
  location: string;
  meetingUrl: string;
  attendees: string[];
}

const MEETING_TYPES = [
  { value: "discovery", label: "Discovery Call" },
  { value: "follow-up", label: "Follow-up" },
  { value: "project", label: "Project Meeting" },
  { value: "internal", label: "Internal" },
  { value: "one-to-one", label: "One-to-One" },
  { value: "custom", label: "Custom" },
];

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

function getMeetingTypeBadge(type: string) {
  const types: Record<string, { label: string; className: string }> = {
    discovery: { label: "Discovery", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    "follow-up": { label: "Follow-up", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    project: { label: "Project", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    internal: { label: "Internal", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
    "one-to-one": { label: "1-on-1", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
    custom: { label: "Custom", className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
    meeting: { label: "Meeting", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  };
  const config = types[type] || { label: type, className: "bg-gray-100 text-gray-800" };
  return <Badge className={config.className}>{config.label}</Badge>;
}

function formatMeetingDate(date: Date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
}

function formatDuration(startDate: Date, endDate: Date) {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (mins === 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  return `${hours}h ${mins}m`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingData | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<MeetingData | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<MeetingData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<MeetingFormData>({
    title: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    duration: 30,
    type: "discovery",
    location: "",
    meetingUrl: "",
    attendees: [],
  });

  // Fetch meetings from Calendar Events collection (type: 'meeting')
  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    const eventsRef = collection(db, COLLECTIONS.CALENDAR_EVENTS);
    const eventsQuery = query(
      eventsRef,
      where("type", "==", "meeting"),
      orderBy("startDate", "desc")
    );

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const meetingsData: MeetingData[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as CalendarEventDoc;
          meetingsData.push({
            id: doc.id,
            calendarEventId: doc.id,
            title: data.title,
            description: data.description,
            startDate: data.startDate.toDate(),
            endDate: data.endDate.toDate(),
            type: (data as any).meetingType || "meeting",
            location: data.location,
            meetingUrl: (data as any).meetingUrl,
            attendees: data.attendees || [],
            opportunityId: (data as any).opportunityId,
            projectId: (data as any).projectId,
            rockId: data.rockId,
            notes: (data as any).notes,
            transcript: (data as any).transcript,
            recordingUrl: (data as any).recordingUrl,
            actionItemCount: (data as any).actionItemCount || 0,
          });
        });
        setMeetings(meetingsData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching meetings:", error);
        toast.error("Failed to load meetings");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch team members for attendee selection
  useEffect(() => {
    if (!db) return;

    const teamRef = collection(db, COLLECTIONS.TEAM_MEMBERS);
    const teamQuery = query(teamRef, where("status", "==", "active"));

    const unsubscribe = onSnapshot(teamQuery, (snapshot) => {
      const members: TeamMemberDoc[] = [];
      snapshot.forEach((doc) => {
        members.push({ id: doc.id, ...doc.data() } as TeamMemberDoc);
      });
      setTeamMembers(members);
    });

    return () => unsubscribe();
  }, []);

  const upcomingMeetings = meetings.filter((m) => !isPast(m.startDate));
  const pastMeetings = meetings.filter((m) => isPast(m.startDate));

  const openCreateDialog = () => {
    setEditingMeeting(null);
    setFormData({
      title: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      duration: 30,
      type: "discovery",
      location: "",
      meetingUrl: "",
      attendees: [],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (meeting: MeetingData) => {
    setEditingMeeting(meeting);
    const durationMins = Math.round(
      (meeting.endDate.getTime() - meeting.startDate.getTime()) / 60000
    );
    setFormData({
      title: meeting.title,
      description: meeting.description || "",
      date: format(meeting.startDate, "yyyy-MM-dd"),
      startTime: format(meeting.startDate, "HH:mm"),
      duration: durationMins,
      type: meeting.type,
      location: meeting.location || "",
      meetingUrl: meeting.meetingUrl || "",
      attendees: meeting.attendees || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!db) {
      toast.error("Database not available");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    setIsSaving(true);

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = addMinutes(startDateTime, formData.duration);

      const meetingData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        startDate: Timestamp.fromDate(startDateTime),
        endDate: Timestamp.fromDate(endDateTime),
        type: "meeting" as const,
        meetingType: formData.type,
        location: formData.location.trim() || null,
        meetingUrl: formData.meetingUrl.trim() || null,
        attendees: formData.attendees,
        updatedAt: Timestamp.now(),
      };

      if (editingMeeting) {
        // Update existing meeting
        const meetingRef = doc(db, COLLECTIONS.CALENDAR_EVENTS, editingMeeting.calendarEventId);
        await updateDoc(meetingRef, meetingData);
        
        // Sync to external calendars
        try {
          const syncResult = await updateMeetingOnCalendars(
            "system", // TODO: Replace with actual userId from auth
            {
              id: editingMeeting.calendarEventId,
              title: formData.title.trim(),
              description: formData.description.trim() || undefined,
              startTime: startDateTime,
              endTime: endDateTime,
              location: formData.location.trim() || undefined,
              attendees: formData.attendees,
              isOnlineMeeting: !!formData.meetingUrl,
            },
            {
              googleEventId: (editingMeeting as any).googleEventId,
              microsoftEventId: (editingMeeting as any).microsoftEventId,
            }
          );
          if (syncResult.errors && syncResult.errors.length > 0) {
            console.warn("Calendar sync warnings:", syncResult.errors);
          }
        } catch (syncError) {
          console.error("Calendar sync error:", syncError);
        }
        
        toast.success("Meeting updated successfully");
      } else {
        // Create new meeting
        const docRef = await addDoc(collection(db, COLLECTIONS.CALENDAR_EVENTS), {
          ...meetingData,
          createdAt: Timestamp.now(),
        });
        
        // Sync to external calendars (Google & Microsoft)
        try {
          const syncResult = await syncMeetingToCalendars(
            "system", // TODO: Replace with actual userId from auth
            {
              id: docRef.id,
              title: formData.title.trim(),
              description: formData.description.trim() || undefined,
              startTime: startDateTime,
              endTime: endDateTime,
              location: formData.location.trim() || undefined,
              attendees: formData.attendees,
              isOnlineMeeting: !!formData.meetingUrl,
            }
          );
          
          // Save external calendar event IDs back to Firestore
          if (syncResult.googleEventId || syncResult.microsoftEventId) {
            await updateDoc(doc(db, COLLECTIONS.CALENDAR_EVENTS, docRef.id), {
              googleEventId: syncResult.googleEventId || null,
              microsoftEventId: syncResult.microsoftEventId || null,
            });
          }
          
          if (syncResult.errors && syncResult.errors.length > 0) {
            console.warn("Calendar sync warnings:", syncResult.errors);
          }
        } catch (syncError) {
          console.error("Calendar sync error:", syncError);
        }
        
        toast.success("Meeting scheduled successfully");
      }

      setDialogOpen(false);
    } catch (error) {
      console.error("Error saving meeting:", error);
      toast.error("Failed to save meeting");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!db || !meetingToDelete) return;

    try {
      // Delete from external calendars first
      try {
        await deleteMeetingFromCalendars(
          "system", // TODO: Replace with actual userId from auth
          {
            googleEventId: (meetingToDelete as any).googleEventId,
            microsoftEventId: (meetingToDelete as any).microsoftEventId,
          }
        );
      } catch (syncError) {
        console.error("Calendar sync delete error:", syncError);
      }
      
      await deleteDoc(doc(db, COLLECTIONS.CALENDAR_EVENTS, meetingToDelete.calendarEventId));
      toast.success("Meeting deleted");
      setDeleteDialogOpen(false);
      setMeetingToDelete(null);
    } catch (error) {
      console.error("Error deleting meeting:", error);
      toast.error("Failed to delete meeting");
    }
  };

  const confirmDelete = (meeting: MeetingData) => {
    setMeetingToDelete(meeting);
    setDeleteDialogOpen(true);
  };

  const openViewDialog = (meeting: MeetingData) => {
    setViewingMeeting(meeting);
    setViewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
            <p className="text-muted-foreground">Loading meetings...</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">
            Schedule meetings and access AI-extracted insights
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming
            {upcomingMeetings.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {upcomingMeetings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">
            Past Meetings
            {pastMeetings.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {pastMeetings.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Meetings */}
        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {upcomingMeetings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No upcoming meetings</h3>
                <p className="text-muted-foreground mb-4">
                  Schedule a meeting to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingMeetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Video className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{meeting.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatMeetingDate(meeting.startDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(meeting.startDate, "h:mm a")} ({formatDuration(meeting.startDate, meeting.endDate)})
                          </div>
                        </div>
                        {meeting.location && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {meeting.location}
                          </p>
                        )}
                        {meeting.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {meeting.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getMeetingTypeBadge(meeting.type)}
                      <Button variant="outline" size="icon" onClick={() => openViewDialog(meeting)} title="View Details">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(meeting)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => confirmDelete(meeting)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {meeting.meetingUrl && (
                        <Button asChild>
                          <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer">
                            <Play className="mr-2 h-4 w-4" />
                            Join
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Attendees */}
                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <div className="mt-4 pt-4 border-t flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Attendees:</span>
                      <div className="flex -space-x-2">
                        {meeting.attendees.slice(0, 5).map((attendee, i) => (
                          <Avatar key={i} className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(attendee)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {meeting.attendees.length > 5 && (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                            +{meeting.attendees.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Past Meetings */}
        <TabsContent value="past" className="space-y-4 mt-6">
          {pastMeetings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No past meetings</h3>
                <p className="text-muted-foreground">
                  Your completed meetings will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            pastMeetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Video className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{meeting.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(meeting.startDate, "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(meeting.startDate, "h:mm a")} ({formatDuration(meeting.startDate, meeting.endDate)})
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getMeetingTypeBadge(meeting.type)}
                      <Button variant="outline" size="icon" onClick={() => openViewDialog(meeting)} title="View Details">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(meeting)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => confirmDelete(meeting)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Meeting Intelligence */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {meeting.transcript && (
                        <Button variant="outline" size="sm" className="justify-start" asChild>
                          <Link href={`/portal/meetings/${meeting.id}/transcript`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Transcript
                          </Link>
                        </Button>
                      )}
                      {meeting.notes && (
                        <Button variant="outline" size="sm" className="justify-start" asChild>
                          <Link href={`/portal/meetings/${meeting.id}/notes`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Notes
                          </Link>
                        </Button>
                      )}
                      {meeting.actionItemCount && meeting.actionItemCount > 0 && (
                        <Button variant="outline" size="sm" className="justify-start" asChild>
                          <Link href={`/portal/meetings/${meeting.id}/actions`}>
                            <CheckSquare className="mr-2 h-4 w-4" />
                            {meeting.actionItemCount} Action Items
                          </Link>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="justify-start" onClick={() => openViewDialog(meeting)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </div>

                  {/* Attendees */}
                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {meeting.attendees.slice(0, 5).map((attendee, i) => (
                          <Avatar key={i} className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(attendee)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Meeting Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMeeting ? "Edit Meeting" : "Create Meeting"}
            </DialogTitle>
            <DialogDescription>
              {editingMeeting
                ? "Update the meeting details below"
                : "Fill in the details to schedule a new meeting"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Discovery Call with ABC Corp"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Meeting agenda or notes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Start Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select
                  value={formData.duration.toString()}
                  onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
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
                <Label htmlFor="type">Meeting Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Conference Room A or Virtual"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingUrl">Meeting URL</Label>
              <Input
                id="meetingUrl"
                placeholder="e.g., https://zoom.us/j/..."
                value={formData.meetingUrl}
                onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingMeeting ? "Update Meeting" : "Create Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{meetingToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Meeting Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">{viewingMeeting?.title}</DialogTitle>
              {viewingMeeting && getMeetingTypeBadge(viewingMeeting.type)}
            </div>
            <DialogDescription>
              Meeting details and information
            </DialogDescription>
          </DialogHeader>

          {viewingMeeting && (
            <div className="space-y-6 py-4">
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{format(viewingMeeting.startDate, "EEEE, MMMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Time</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format(viewingMeeting.startDate, "h:mm a")} - {format(viewingMeeting.endDate, "h:mm a")}
                    </span>
                    <span className="text-muted-foreground">
                      ({formatDuration(viewingMeeting.startDate, viewingMeeting.endDate)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Location */}
              {viewingMeeting.location && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Location</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{viewingMeeting.location}</span>
                  </div>
                </div>
              )}

              {/* Meeting URL */}
              {viewingMeeting.meetingUrl && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Meeting Link</Label>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={viewingMeeting.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {viewingMeeting.meetingUrl}
                    </a>
                  </div>
                </div>
              )}

              {/* Description */}
              {viewingMeeting.description && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Description</Label>
                  <p className="text-sm whitespace-pre-wrap">{viewingMeeting.description}</p>
                </div>
              )}

              {/* Attendees */}
              {viewingMeeting.attendees && viewingMeeting.attendees.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    Attendees ({viewingMeeting.attendees.length})
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {viewingMeeting.attendees.map((attendee, i) => (
                      <div key={i} className="flex items-center gap-2 bg-muted rounded-full px-3 py-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(attendee)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{attendee}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingMeeting.notes && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Notes</Label>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm whitespace-pre-wrap">{viewingMeeting.notes}</p>
                  </div>
                </div>
              )}

              {/* Recording */}
              {viewingMeeting.recordingUrl && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">Recording</Label>
                  <Button variant="outline" size="sm" asChild>
                    <a href={viewingMeeting.recordingUrl} target="_blank" rel="noopener noreferrer">
                      <Play className="mr-2 h-4 w-4" />
                      Watch Recording
                    </a>
                  </Button>
                </div>
              )}

              {/* Action Items */}
              {viewingMeeting.actionItemCount && viewingMeeting.actionItemCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <span className="font-medium">{viewingMeeting.actionItemCount} Action Items</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setViewDialogOpen(false);
                  if (viewingMeeting) openEditDialog(viewingMeeting);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setViewDialogOpen(false);
                  if (viewingMeeting) confirmDelete(viewingMeeting);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
            <div className="flex gap-2">
              {viewingMeeting?.meetingUrl && !isPast(viewingMeeting.startDate) && (
                <Button asChild>
                  <a href={viewingMeeting.meetingUrl} target="_blank" rel="noopener noreferrer">
                    <Play className="mr-2 h-4 w-4" />
                    Join Meeting
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
