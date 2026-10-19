"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, Timestamp, updateDoc } from "firebase/firestore";
import { Bot, CalendarClock, Loader2, Pause, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { COLLECTIONS, type PlatformAutomationDoc } from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ActionType = PlatformAutomationDoc["actions"][number]["type"];
type CalendarEvent = { id: string; title: string; startDate?: { toDate?: () => Date } | string; type?: string; description?: string };
const actionTypes: Array<{ id: ActionType; label: string }> = [{ id: "calendar", label: "Master Calendar" }, { id: "task", label: "Assigned Task" }, { id: "email", label: "Email" }, { id: "teams", label: "Microsoft Teams" }, { id: "telegram", label: "Telegram" }, { id: "gbrain", label: "GBrain" }, { id: "hermes", label: "Hermes" }, { id: "lms_reminder", label: "LMS Reminder" }, { id: "asset_event", label: "Asset Event" }];

export default function TimeAutomationsPage() {
  const { linkedTeamMember, profile } = useUserProfile();
  const [automations, setAutomations] = useState<PlatformAutomationDoc[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<PlatformAutomationDoc["triggerType"]>("scheduled");
  const [schedule, setSchedule] = useState("Every weekday at 8:00 AM");
  const [selectedActions, setSelectedActions] = useState<ActionType[]>(["calendar", "task"]);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const [automationSnap, calendarSnap] = await Promise.all([getDocs(collection(db, COLLECTIONS.PLATFORM_AUTOMATIONS)), getDocs(collection(db, COLLECTIONS.CALENDAR_EVENTS))]);
      setAutomations(automationSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as PlatformAutomationDoc));
      setEvents(calendarSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as CalendarEvent));
    } catch { toast.error("Unable to load automations and calendar"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const generate = () => {
    if (!prompt.trim()) return toast.error("Describe the automation first");
    const text = prompt.toLowerCase();
    setName(prompt.trim().split(/[.!?]/)[0].slice(0, 70));
    setTriggerType(text.includes("when ") || text.includes("whenever") ? text.includes("asset") ? "asset_event" : text.includes("cert") || text.includes("training") ? "lms_expiration" : "calendar_event" : "scheduled");
    const inferred: ActionType[] = [];
    if (text.includes("calendar") || text.includes("schedule") || text.includes("meeting")) inferred.push("calendar");
    if (text.includes("task") || text.includes("assign")) inferred.push("task");
    if (text.includes("email")) inferred.push("email");
    if (text.includes("teams")) inferred.push("teams");
    if (text.includes("telegram")) inferred.push("telegram");
    if (text.includes("gbrain")) inferred.push("gbrain");
    if (text.includes("hermes")) inferred.push("hermes");
    if (text.includes("training") || text.includes("cert")) inferred.push("lms_reminder");
    if (text.includes("asset") || text.includes("warranty")) inferred.push("asset_event");
    setSelectedActions(inferred.length ? Array.from(new Set(inferred)) : ["calendar", "task"]);
    toast.success("AI automation draft generated. Review and activate it.");
  };

  const saveAutomation = async () => {
    if (!db || !name.trim() || !prompt.trim() || selectedActions.length === 0) return toast.error("Name, prompt, and at least one action are required");
    setSaving(true);
    try {
      const now = Timestamp.now();
      await addDoc(collection(db, COLLECTIONS.PLATFORM_AUTOMATIONS), { name: name.trim(), prompt: prompt.trim(), triggerType, schedule, actions: selectedActions.map((type) => ({ type, configuration: { instruction: prompt.trim() } })), status: "draft", requiresApproval, createdByUid: auth?.currentUser?.uid || "", createdByName: linkedTeamMember ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}` : profile.email || "Administrator", createdAt: now, updatedAt: now });
      setPrompt(""); setName(""); toast.success("Automation saved as a draft"); await load();
    } catch { toast.error("Unable to save automation"); } finally { setSaving(false); }
  };

  const toggleStatus = async (automation: PlatformAutomationDoc) => {
    if (!db) return;
    const status = automation.status === "active" ? "paused" : "active";
    await updateDoc(doc(db, COLLECTIONS.PLATFORM_AUTOMATIONS, automation.id), { status, updatedAt: Timestamp.now() });
    toast.success(status === "active" ? "Automation activated" : "Automation paused"); await load();
  };

  const runNow = async (automation: PlatformAutomationDoc) => {
    if (!db) return;
    setSaving(true);
    try {
      const now = Timestamp.now();
      for (const action of automation.actions) {
        if (action.type === "calendar") await addDoc(collection(db, COLLECTIONS.CALENDAR_EVENTS), { title: automation.name, description: automation.prompt, startDate: now, endDate: Timestamp.fromMillis(now.toMillis() + 3600000), allDay: false, type: "automation", color: "#0072BC", createdAt: now, updatedAt: now });
        else if (action.type === "task") await addDoc(collection(db, COLLECTIONS.TRACTION_TODOS), { description: automation.name, notes: automation.prompt, ownerId: linkedTeamMember?.id || auth?.currentUser?.uid || "", ownerName: linkedTeamMember ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}` : profile.email || "Administrator", ownerEmail: linkedTeamMember?.emailPrimary || profile.email || "", priority: "medium", status: "in-progress", completed: false, dueDate: now, tags: ["automation"], createdAt: now, updatedAt: now });
        else await addDoc(collection(db, COLLECTIONS.AUTOMATION_RUNS), { automationId: automation.id, automationName: automation.name, action: action.type, instruction: automation.prompt, configuration: action.configuration, status: "queued", createdAt: now, runByUid: auth?.currentUser?.uid || "" });
      }
      await addDoc(collection(db, COLLECTIONS.AUTOMATION_RUNS), { automationId: automation.id, automationName: automation.name, status: "completed", actions: automation.actions.map((item) => item.type), startedAt: now, completedAt: Timestamp.now(), runByUid: auth?.currentUser?.uid || "" });
      await updateDoc(doc(db, COLLECTIONS.PLATFORM_AUTOMATIONS, automation.id), { lastRunAt: now, updatedAt: now });
      toast.success("Automation completed"); await load();
    } catch { toast.error("Automation run failed"); } finally { setSaving(false); }
  };

  const addCalendarEvent = async () => {
    if (!db || !eventTitle || !eventDate) return;
    const start = new Date(`${eventDate}T09:00:00`);
    await addDoc(collection(db, COLLECTIONS.CALENDAR_EVENTS), { title: eventTitle, description: eventDescription, startDate: Timestamp.fromDate(start), endDate: Timestamp.fromMillis(start.getTime() + 3600000), allDay: true, type: "automation", color: "#0072BC", createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    setEventTitle(""); setEventDate(""); setEventDescription(""); toast.success("Calendar event added"); await load();
  };

  const upcoming = useMemo(() => events.map((event) => ({ ...event, date: typeof event.startDate === "string" ? new Date(event.startDate) : event.startDate?.toDate?.() })).filter((event) => event.date && event.date >= new Date(Date.now() - 86400000)).sort((a, b) => a.date!.getTime() - b.date!.getTime()).slice(0, 20), [events]);

  return <div className="space-y-6 p-6"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarClock className="h-6 w-6 text-primary" />Time / Automations</h1><p className="text-sm text-muted-foreground">Create prompt-based AI workflows and administer the Adams Master Calendar.</p></div>
    <div className="grid gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />AI Automation Builder</CardTitle><CardDescription>Describe the outcome in plain language. AI identifies the trigger and actions for your review.</CardDescription></CardHeader><CardContent className="space-y-4"><div><Label>Automation prompt</Label><Textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Every weekday at 7 AM, review expiring certifications, create tasks for supervisors, add renewal deadlines to the calendar, and send Teams and email reminders." /></div><Button variant="outline" onClick={generate}><Bot className="mr-2 h-4 w-4" />Generate Draft with AI</Button><div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Trigger</Label><Select value={triggerType} onValueChange={(value) => setTriggerType(value as PlatformAutomationDoc["triggerType"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["manual", "scheduled", "calendar_event", "asset_event", "lms_expiration"].map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div><div><Label>Schedule / condition</Label><Input value={schedule} onChange={(e) => setSchedule(e.target.value)} /></div></div><div><Label>Actions</Label><div className="mt-2 grid gap-2 sm:grid-cols-2">{actionTypes.map((action) => <label key={action.id} className="flex items-center gap-2 rounded-md border p-2 text-sm"><Checkbox checked={selectedActions.includes(action.id)} onCheckedChange={(checked) => setSelectedActions(checked ? [...selectedActions, action.id] : selectedActions.filter((item) => item !== action.id))} />{action.label}</label>)}</div></div><label className="flex items-center gap-2 text-sm"><Checkbox checked={requiresApproval} onCheckedChange={(value) => setRequiresApproval(Boolean(value))} />Require admin approval before activation</label><Button disabled={saving} onClick={() => void saveAutomation()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Save Draft</Button></CardContent></Card>
    <Card><CardHeader><CardTitle>Master Calendar Manager</CardTitle><CardDescription>Create events and manage upcoming company calendar entries from Admin.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div><Label>Event title</Label><Input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} /></div><div><Label>Date</Label><Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></div><div className="sm:col-span-2"><Label>Description</Label><Textarea value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} /></div></div><Button onClick={() => void addCalendarEvent()}><Plus className="mr-2 h-4 w-4" />Add Calendar Event</Button><div className="max-h-[430px] space-y-2 overflow-y-auto">{upcoming.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 rounded-md border p-3"><div><div className="font-medium">{event.title}</div><div className="text-xs text-muted-foreground">{event.date?.toLocaleDateString()} · {event.type || "event"}</div></div><Button variant="ghost" size="icon" onClick={async () => { if (!db || !confirm(`Delete ${event.title}?`)) return; await deleteDoc(doc(db, COLLECTIONS.CALENDAR_EVENTS, event.id)); await load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}</div></CardContent></Card></div>
    <Card><CardHeader><CardTitle>Automation Library</CardTitle><CardDescription>Review, approve, activate, pause, and manually test generated workflows.</CardDescription></CardHeader><CardContent className="overflow-x-auto">{loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Trigger</TableHead><TableHead>Actions</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Controls</TableHead></TableRow></TableHeader><TableBody>{automations.map((automation) => <TableRow key={automation.id}><TableCell><div className="font-medium">{automation.name}</div><div className="max-w-md truncate text-xs text-muted-foreground">{automation.prompt}</div></TableCell><TableCell>{automation.triggerType}<div className="text-xs text-muted-foreground">{automation.schedule}</div></TableCell><TableCell><div className="flex flex-wrap gap-1">{automation.actions.map((action) => <Badge key={action.type} variant="outline">{action.type}</Badge>)}</div></TableCell><TableCell><Badge className="capitalize" variant={automation.status === "active" ? "default" : "secondary"}>{automation.status}</Badge>{automation.requiresApproval && <div className="text-[10px] text-amber-600">Approval required</div>}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="sm" variant="outline" disabled={saving} onClick={() => void runNow(automation)}><Play className="mr-1 h-3.5 w-3.5" />Run</Button><Button size="icon" variant="ghost" onClick={() => void toggleStatus(automation)}>{automation.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button></div></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
  </div>;
}
