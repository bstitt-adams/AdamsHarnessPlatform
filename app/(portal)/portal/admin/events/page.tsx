"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  MapPin,
  Video,
  Users,
  ExternalLink,
  MoreVertical,
  Star,
  StarOff,
  Loader2,
  Clock,
  Globe,
} from "lucide-react";
import { format, parseISO, startOfMonth, isSameMonth } from "date-fns";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { COLLECTIONS, type EventDoc, type EventTicketType } from "@/lib/schema";
import { toast } from "sonner";
import { TicketTypeManager } from "@/components/events/ticket-type-manager";

type EventCategory = "webinar" | "workshop" | "conference" | "networking" | "training" | "other";
type EventStatus = "draft" | "published" | "cancelled" | "completed";
type LocationType = "virtual" | "in-person" | "hybrid";

interface EventFormData {
  title: string;
  description: string;
  shortDescription: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isAllDay: boolean;
  locationType: LocationType;
  location: string;
  virtualLink: string;
  registrationUrl: string;
  registrationDeadline: string;
  maxAttendees: string;
  imageUrl: string;
  category: EventCategory;
  tags: string;
  status: EventStatus;
  isFeatured: boolean;
  slug: string;
  ticketTypes: EventTicketType[];
  isFreeEvent: boolean;
}

const emptyFormData: EventFormData = {
  title: "",
  description: "",
  shortDescription: "",
  startDate: "",
  startTime: "09:00",
  endDate: "",
  endTime: "17:00",
  slug: "",
  ticketTypes: [],
  isFreeEvent: false,
  isAllDay: false,
  locationType: "virtual",
  location: "",
  virtualLink: "",
  registrationUrl: "",
  registrationDeadline: "",
  maxAttendees: "",
  imageUrl: "",
  category: "webinar",
  tags: "",
  status: "draft",
  isFeatured: false,
};

const categoryColors: Record<EventCategory, string> = {
  webinar: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  workshop: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  conference: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  networking: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  training: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const statusColors: Record<EventStatus, string> = {
  draft: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
  published: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export default function EventsAdminPage() {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventDoc | null>(null);
  const [eventToDelete, setEventToDelete] = useState<EventDoc | null>(null);
  const [formData, setFormData] = useState<EventFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<EventStatus | "all">("all");

  // Fetch events from Firestore
  useEffect(() => {
    const fetchEvents = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, COLLECTIONS.EVENTS),
          orderBy("startDate", "asc")
        );
        const snapshot = await getDocs(q);
        const eventsList: EventDoc[] = [];
        snapshot.forEach((doc) => {
          eventsList.push({ id: doc.id, ...doc.data() } as EventDoc);
        });
        setEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events:", error);
        toast.error("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Group events by month
  const eventsByMonth = useMemo(() => {
    const filtered = filterStatus === "all" 
      ? events 
      : events.filter(e => e.status === filterStatus);

    const grouped: Record<string, EventDoc[]> = {};
    
    filtered.forEach((event) => {
      const date = event.startDate instanceof Timestamp 
        ? event.startDate.toDate() 
        : new Date(event.startDate);
      const monthKey = format(startOfMonth(date), "yyyy-MM");
      const monthLabel = format(date, "MMMM yyyy");
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(event);
    });

    // Sort by month key and return as array
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, events]) => ({
        key,
        label: format(parseISO(key + "-01"), "MMMM yyyy"),
        events,
      }));
  }, [events, filterStatus]);

  const openDialog = (event?: EventDoc) => {
    if (event) {
      setEditingEvent(event);
      const startDate = event.startDate instanceof Timestamp 
        ? event.startDate.toDate() 
        : new Date(event.startDate);
      const endDate = event.endDate instanceof Timestamp 
        ? event.endDate.toDate() 
        : event.endDate ? new Date(event.endDate) : null;
      const regDeadline = event.registrationDeadline instanceof Timestamp 
        ? event.registrationDeadline.toDate() 
        : event.registrationDeadline ? new Date(event.registrationDeadline) : null;

      setFormData({
        title: event.title,
        description: event.description || "",
        shortDescription: event.shortDescription || "",
        startDate: format(startDate, "yyyy-MM-dd"),
        startTime: format(startDate, "HH:mm"),
        endDate: endDate ? format(endDate, "yyyy-MM-dd") : "",
        endTime: endDate ? format(endDate, "HH:mm") : "17:00",
        isAllDay: event.isAllDay || false,
        locationType: event.locationType,
        location: event.location || "",
        virtualLink: event.virtualLink || "",
        registrationUrl: event.registrationUrl || "",
        registrationDeadline: regDeadline ? format(regDeadline, "yyyy-MM-dd") : "",
        maxAttendees: event.maxAttendees?.toString() || "",
        imageUrl: event.imageUrl || "",
        category: event.category || "other",
        tags: event.tags?.join(", ") || "",
        status: event.status,
        isFeatured: event.isFeatured || false,
        slug: event.slug || "",
        ticketTypes: event.ticketTypes || [],
        isFreeEvent: event.isFreeEvent || false,
      });
    } else {
      setEditingEvent(null);
      setFormData(emptyFormData);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!db) {
      toast.error("Database not configured");
      return;
    }

    if (!formData.title || !formData.startDate) {
      toast.error("Title and start date are required");
      return;
    }

    setSaving(true);

    try {
      const startDateTime = formData.isAllDay 
        ? new Date(formData.startDate + "T00:00:00")
        : new Date(formData.startDate + "T" + formData.startTime);
      
      const endDateTime = formData.endDate 
        ? (formData.isAllDay 
            ? new Date(formData.endDate + "T23:59:59")
            : new Date(formData.endDate + "T" + formData.endTime))
        : null;

      const regDeadline = formData.registrationDeadline 
        ? new Date(formData.registrationDeadline + "T23:59:59")
        : null;

      // Generate slug from title if not provided
      const slug = formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const eventData: Partial<EventDoc> = {
        title: formData.title,
        description: formData.description || undefined,
        shortDescription: formData.shortDescription || undefined,
        startDate: Timestamp.fromDate(startDateTime),
        endDate: endDateTime ? Timestamp.fromDate(endDateTime) : undefined,
        isAllDay: formData.isAllDay,
        locationType: formData.locationType,
        location: formData.location || undefined,
        virtualLink: formData.virtualLink || undefined,
        registrationUrl: formData.registrationUrl || undefined,
        registrationDeadline: regDeadline ? Timestamp.fromDate(regDeadline) : undefined,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
        imageUrl: formData.imageUrl || undefined,
        category: formData.category,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
        status: formData.status,
        isFeatured: formData.isFeatured,
        slug,
        ticketTypes: formData.ticketTypes,
        isFreeEvent: formData.isFreeEvent,
        updatedAt: Timestamp.now(),
      };

      if (editingEvent) {
        await updateDoc(doc(db, COLLECTIONS.EVENTS, editingEvent.id), eventData);
        setEvents(events.map(e => e.id === editingEvent.id ? { ...e, ...eventData, id: editingEvent.id } as EventDoc : e));
        toast.success("Event updated successfully");
      } else {
        const docRef = await addDoc(collection(db, COLLECTIONS.EVENTS), {
          ...eventData,
          createdAt: Timestamp.now(),
          currentAttendees: 0,
        });
        setEvents([...events, { ...eventData, id: docRef.id, createdAt: Timestamp.now() } as EventDoc]);
        toast.success("Event created successfully");
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!db || !eventToDelete) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.EVENTS, eventToDelete.id));
      setEvents(events.filter(e => e.id !== eventToDelete.id));
      toast.success("Event deleted successfully");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    } finally {
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  const toggleStatus = async (event: EventDoc, newStatus: EventStatus) => {
    if (!db) return;

    try {
      await updateDoc(doc(db, COLLECTIONS.EVENTS, event.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      setEvents(events.map(e => e.id === event.id ? { ...e, status: newStatus } : e));
      toast.success(`Event ${newStatus === "published" ? "published" : "updated"}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const toggleFeatured = async (event: EventDoc) => {
    if (!db) return;

    try {
      await updateDoc(doc(db, COLLECTIONS.EVENTS, event.id), {
        isFeatured: !event.isFeatured,
        updatedAt: Timestamp.now(),
      });
      setEvents(events.map(e => e.id === event.id ? { ...e, isFeatured: !e.isFeatured } : e));
      toast.success(event.isFeatured ? "Removed from featured" : "Added to featured");
    } catch (error) {
      console.error("Error toggling featured:", error);
      toast.error("Failed to update");
    }
  };

  const resetForm = () => {
    setEditingEvent(null);
    setFormData(emptyFormData);
  };

  const formatEventDate = (event: EventDoc) => {
    const start = event.startDate instanceof Timestamp 
      ? event.startDate.toDate() 
      : new Date(event.startDate);
    
    if (event.isAllDay) {
      return format(start, "MMM d, yyyy");
    }
    return format(start, "MMM d, yyyy 'at' h:mm a");
  };

  const getLocationIcon = (type: LocationType) => {
    switch (type) {
      case "virtual": return <Video className="h-4 w-4" />;
      case "in-person": return <MapPin className="h-4 w-4" />;
      case "hybrid": return <Globe className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events Management</h1>
          <p className="text-muted-foreground">
            Manage upcoming events, webinars, and workshops
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as EventStatus | "all")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Events by Month */}
      {eventsByMonth.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {filterStatus === "all" 
                ? "Get started by creating your first event."
                : `No ${filterStatus} events found.`}
            </p>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        eventsByMonth.map(({ key, label, events: monthEvents }) => (
          <div key={key} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{label}</h2>
              <Badge variant="secondary">{monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {monthEvents.map((event) => (
                <Card key={event.id} className="relative overflow-hidden">
                  {event.isFeatured && (
                    <div className="absolute top-0 right-0 bg-sky-500 text-white px-2 py-1 text-xs font-medium">
                      Featured
                    </div>
                  )}
                  {event.imageUrl && (
                    <div className="h-32 bg-muted overflow-hidden">
                      <img 
                        src={event.imageUrl} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={categoryColors[event.category || "other"]}>
                            {event.category || "other"}
                          </Badge>
                          <Badge className={statusColors[event.status]}>
                            {event.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDialog(event)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleFeatured(event)}>
                            {event.isFeatured ? (
                              <>
                                <StarOff className="h-4 w-4 mr-2" />
                                Remove Featured
                              </>
                            ) : (
                              <>
                                <Star className="h-4 w-4 mr-2" />
                                Make Featured
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {event.status === "draft" && (
                            <DropdownMenuItem onClick={() => toggleStatus(event, "published")}>
                              <Eye className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {event.status === "published" && (
                            <DropdownMenuItem onClick={() => toggleStatus(event, "draft")}>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Unpublish
                            </DropdownMenuItem>
                          )}
                          {event.status !== "completed" && (
                            <DropdownMenuItem onClick={() => toggleStatus(event, "completed")}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Mark Completed
                            </DropdownMenuItem>
                          )}
                          {event.status !== "cancelled" && (
                            <DropdownMenuItem onClick={() => toggleStatus(event, "cancelled")}>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Cancel Event
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              setEventToDelete(event);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {event.shortDescription && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.shortDescription}
                      </p>
                    )}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{formatEventDate(event)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {getLocationIcon(event.locationType)}
                        <span className="capitalize">{event.locationType}</span>
                        {event.location && <span>• {event.location}</span>}
                      </div>
                      {event.maxAttendees && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{event.currentAttendees || 0} / {event.maxAttendees} attendees</span>
                        </div>
                      )}
                    </div>
                    {event.registrationUrl && (
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Registration Link
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add/Edit Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
            <DialogDescription>
              {editingEvent ? "Update the event details below." : "Fill in the details for your new event."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Basic Information</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., ISO 9001 Implementation Workshop"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shortDescription">Short Description</Label>
                  <Input
                    id="shortDescription"
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    placeholder="Brief summary for event cards"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed event description..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(v) => setFormData({ ...formData, category: v as EventCategory })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webinar">Webinar</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="networking">Networking</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="iso, quality, manufacturing"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Date & Time</h3>
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="isAllDay"
                  checked={formData.isAllDay}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAllDay: checked })}
                />
                <Label htmlFor="isAllDay">All-day event</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                {!formData.isAllDay && (
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
                {!formData.isAllDay && (
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Location</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="locationType">Location Type</Label>
                  <Select 
                    value={formData.locationType} 
                    onValueChange={(v) => setFormData({ ...formData, locationType: v as LocationType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="virtual">Virtual</SelectItem>
                      <SelectItem value="in-person">In-Person</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(formData.locationType === "in-person" || formData.locationType === "hybrid") && (
                  <div className="space-y-2">
                    <Label htmlFor="location">Physical Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Address or venue name"
                    />
                  </div>
                )}
                {(formData.locationType === "virtual" || formData.locationType === "hybrid") && (
                  <div className="space-y-2">
                    <Label htmlFor="virtualLink">Virtual Meeting Link</Label>
                    <Input
                      id="virtualLink"
                      value={formData.virtualLink}
                      onChange={(e) => setFormData({ ...formData, virtualLink: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Registration */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Registration</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationUrl">Registration URL</Label>
                  <Input
                    id="registrationUrl"
                    value={formData.registrationUrl}
                    onChange={(e) => setFormData({ ...formData, registrationUrl: e.target.value })}
                    placeholder="https://eventbrite.com/..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registrationDeadline">Registration Deadline</Label>
                    <Input
                      id="registrationDeadline"
                      type="date"
                      value={formData.registrationDeadline}
                      onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAttendees">Max Attendees</Label>
                    <Input
                      id="maxAttendees"
                      type="number"
                      value={formData.maxAttendees}
                      onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ticketing */}
            <TicketTypeManager
              ticketTypes={formData.ticketTypes}
              onChange={(ticketTypes) => setFormData({ ...formData, ticketTypes })}
              isFreeEvent={formData.isFreeEvent}
              onFreeEventChange={(isFreeEvent) => setFormData({ ...formData, isFreeEvent })}
            />

            {/* Display Options */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Display Options</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="auto-generated-from-title"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to auto-generate from title. Used in event URL: /events/[slug]
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Cover Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(v) => setFormData({ ...formData, status: v as EventStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Switch
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                    />
                    <Label htmlFor="isFeatured">Featured Event</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEvent ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{eventToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
