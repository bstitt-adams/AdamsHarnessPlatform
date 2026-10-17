"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  CheckSquare,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  Search,
  Trash2,
  RotateCcw,
  Pin,
  Hash,
  Link2,
  Image as ImageIcon,
  Bell,
  Lightbulb,
  StickyNote,
  LayoutList,
  Table as TableIcon,
  Sparkles,
  ExternalLink,
  X,
} from "lucide-react";

export type MindChukItemKind =
  | "task"
  | "note"
  | "idea"
  | "link"
  | "photo"
  | "reminder";

export interface UserTaskItem {
  id: string;
  source: "todo" | "rock" | "action";
  kind: MindChukItemKind;
  title: string;
  body?: string;
  status: "open" | "completed";
  priority: string;
  dueDate?: string;
  reminderAt?: string;
  tags: string[];
  url?: string;
  attachmentBase64?: string;
  attachmentName?: string;
  pinned?: boolean;
  createdAtMs: number;
  createdAtLabel?: string;
  ownerId?: string;
  ownerName?: string;
}

const MAX_IMAGE_BYTES = 650 * 1024;

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_-]+/g) || [];
  return Array.from(
    new Set(matches.map((m) => m.slice(1).toLowerCase())),
  );
}

function extractFirstUrl(text: string): string | undefined {
  const match = text.match(/https?:\/\/[^\s)]+/i);
  return match ? match[0] : undefined;
}

function getKindMeta(kind: MindChukItemKind) {
  switch (kind) {
    case "note":
      return { label: "Note / Thought", icon: StickyNote, color: "text-amber-500" };
    case "idea":
      return { label: "Idea", icon: Lightbulb, color: "text-yellow-500" };
    case "link":
      return { label: "Saved Link", icon: Link2, color: "text-sky-500" };
    case "photo":
      return { label: "Photo / Artifact", icon: ImageIcon, color: "text-purple-500" };
    case "reminder":
      return { label: "Reminder", icon: Bell, color: "text-rose-500" };
    default:
      return { label: "Task", icon: CheckSquare, color: "text-primary" };
  }
}

export function MindChukTasksWorkspace({
  pageTitle = "My Tasks & MindChuk Feed",
  breadcrumbLabel = "My Tasks",
}: {
  pageTitle?: string;
  breadcrumbLabel?: string;
}) {
  const { linkedTeamMember, profile, isMasqueradingUser } = useUserProfile();
  const [tasks, setTasks] = useState<UserTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedKindFilter, setSelectedKindFilter] = useState<
    "all" | MindChukItemKind | "pinned"
  >("all");
  const [viewMode, setViewMode] = useState<"feed" | "table">("feed");

  // MindChuk Instant Capture State
  const [captureText, setCaptureText] = useState("");
  const [captureKind, setCaptureKind] = useState<MindChukItemKind>("task");
  const [captureTagsInput, setCaptureTagsInput] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [attachmentBase64, setAttachmentBase64] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [creating, setCreating] = useState(false);

  // Inline quick-tag input per item
  const [addingTagForId, setAddingTagForId] = useState<string | null>(null);
  const [inlineTagValue, setInlineTagValue] = useState("");

  const viewedName = linkedTeamMember
    ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}`.trim()
    : profile.firstName
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : profile.email || "Current User";

  const currentMemberId = linkedTeamMember?.id || "";
  const currentUid = linkedTeamMember?.firebaseUid || auth?.currentUser?.uid || "";
  const currentEmail = (
    linkedTeamMember?.emailPrimary ||
    profile.email ||
    ""
  ).toLowerCase();

  const loadTasks = useCallback(async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [todosSnap, rocksSnap, actionsSnap] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.TRACTION_TODOS)).catch(() => null),
        getDocs(collection(db, COLLECTIONS.TRACTION_ROCKS)).catch(() => null),
        getDocs(collection(db, COLLECTIONS.ACTION_ITEMS)).catch(() => null),
      ]);

      const matchesUser = (data: Record<string, unknown>) => {
        const ownerId = String(
          data.ownerId || data.assigneeId || data.assignedTo || "",
        );
        const ownerName = String(
          data.ownerName || data.assigneeName || "",
        ).toLowerCase();
        const ownerEmail = String(data.ownerEmail || "").toLowerCase();

        if (currentMemberId && ownerId === currentMemberId) return true;
        if (currentUid && ownerId === currentUid) return true;
        if (currentEmail && ownerEmail === currentEmail) return true;
        if (viewedName && ownerName && ownerName === viewedName.toLowerCase())
          return true;
        return false;
      };

      const collected: UserTaskItem[] = [];

      todosSnap?.forEach((d) => {
        const data = d.data();
        if (!matchesUser(data)) return;
        const due = data.dueDate?.toDate
          ? data.dueDate.toDate().toISOString().split("T")[0]
          : typeof data.dueDate === "string"
            ? data.dueDate
            : undefined;
        const createdDate: Date | undefined = data.createdAt?.toDate
          ? data.createdAt.toDate()
          : undefined;
        const rawTitle = String(data.description || data.title || "Task");
        const storedTags = Array.isArray(data.tags)
          ? data.tags.map((t: unknown) => String(t).toLowerCase())
          : extractHashtags(rawTitle);

        collected.push({
          id: d.id,
          source: "todo",
          kind: (data.mindchukKind as MindChukItemKind) || "task",
          title: rawTitle,
          body: typeof data.notes === "string" ? data.notes : undefined,
          status:
            data.status === "complete" || data.completed ? "completed" : "open",
          priority: String(data.priority || "medium"),
          dueDate: due,
          reminderAt:
            typeof data.reminderAt === "string" ? data.reminderAt : undefined,
          tags: storedTags,
          url:
            typeof data.url === "string"
              ? data.url
              : extractFirstUrl(rawTitle),
          attachmentBase64:
            typeof data.attachmentBase64 === "string"
              ? data.attachmentBase64
              : undefined,
          attachmentName:
            typeof data.attachmentName === "string"
              ? data.attachmentName
              : undefined,
          pinned: Boolean(data.pinned),
          createdAtMs: createdDate ? createdDate.getTime() : 0,
          createdAtLabel: createdDate
            ? createdDate.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : undefined,
          ownerName: String(data.ownerName || viewedName),
        });
      });

      rocksSnap?.forEach((d) => {
        const data = d.data();
        if (!matchesUser(data)) return;
        const rawTitle = String(data.title || data.description || "Quarterly Rock");
        collected.push({
          id: d.id,
          source: "rock",
          kind: "task",
          title: rawTitle,
          status: data.status === "complete" ? "completed" : "open",
          priority: "high",
          dueDate: String(data.quarter || ""),
          tags: ["rock", ...extractHashtags(rawTitle)],
          pinned: Boolean(data.pinned),
          createdAtMs: data.createdAt?.toDate
            ? data.createdAt.toDate().getTime()
            : 0,
          ownerName: String(data.ownerName || viewedName),
        });
      });

      actionsSnap?.forEach((d) => {
        const data = d.data();
        if (!matchesUser(data)) return;
        const due = data.dueDate?.toDate
          ? data.dueDate.toDate().toISOString().split("T")[0]
          : typeof data.dueDate === "string"
            ? data.dueDate
            : undefined;
        const rawTitle = String(data.title || data.description || "Action Item");
        collected.push({
          id: d.id,
          source: "action",
          kind: "task",
          title: rawTitle,
          status:
            data.status === "completed" || data.completed ? "completed" : "open",
          priority: String(data.priority || "medium"),
          dueDate: due,
          tags: ["action", ...extractHashtags(rawTitle)],
          pinned: Boolean(data.pinned),
          createdAtMs: data.createdAt?.toDate
            ? data.createdAt.toDate().getTime()
            : 0,
          ownerName: String(data.assigneeName || viewedName),
        });
      });

      // Sort pinned first, then newest first
      collected.sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) {
          return a.pinned ? -1 : 1;
        }
        return b.createdAtMs - a.createdAtMs;
      });

      setTasks(collected);
    } catch (err) {
      console.error("Failed to load user tasks:", err);
      toast.error("Failed to load tasks & feed");
    } finally {
      setLoading(false);
    }
  }, [currentMemberId, currentUid, currentEmail, viewedName]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const handleAttachmentSelect = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Attachment must be under 650 KB for instant Base64 feed storage.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAttachmentBase64(reader.result);
        setAttachmentName(file.name);
        if (captureKind === "task") setCaptureKind("photo");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureSubmit = async () => {
    if (!db || (!captureText.trim() && !attachmentBase64)) return;
    setCreating(true);
    try {
      const rawText = captureText.trim() || attachmentName || "Captured Item";
      const detectedUrl = extractFirstUrl(rawText);
      const inlineTags = extractHashtags(rawText);
      const manualTags = captureTagsInput
        .split(/[,\s]+/)
        .map((t) => t.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean);
      const combinedTags = Array.from(new Set([...inlineTags, ...manualTags]));

      let effectiveKind: MindChukItemKind = captureKind;
      if (effectiveKind === "task") {
        if (attachmentBase64) effectiveKind = "photo";
        else if (detectedUrl && rawText === detectedUrl) effectiveKind = "link";
      }

      const parseLocalYmd = (ymd: string) => {
        const [y, m, d] = ymd.split("-").map(Number);
        return new Date(y, (m || 1) - 1, d || 1, 9, 0, 0, 0);
      };

      const dueTimestamp = newTaskDueDate
        ? Timestamp.fromDate(parseLocalYmd(newTaskDueDate))
        : Timestamp.now();

      await addDoc(collection(db, COLLECTIONS.TRACTION_TODOS), {
        description: rawText,
        mindchukKind: effectiveKind,
        ownerId: currentMemberId || currentUid,
        ownerName: viewedName,
        ownerEmail: currentEmail,
        priority: newTaskPriority,
        status: "in-progress",
        completed: false,
        pinned: false,
        tags: combinedTags,
        ...(detectedUrl ? { url: detectedUrl } : {}),
        ...(attachmentBase64
          ? { attachmentBase64, attachmentName }
          : {}),
        dueDate: dueTimestamp,
        ...(newTaskDueDate ? { reminderAt: newTaskDueDate } : {}),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // If a reminder/due date was specified, also sync to the Adams Master Calendar
      if (newTaskDueDate) {
        try {
          const start = parseLocalYmd(newTaskDueDate);
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          await addDoc(collection(db, COLLECTIONS.CALENDAR_EVENTS), {
            title: `${effectiveKind === "reminder" ? "Reminder" : "Task"}: ${rawText.slice(0, 80)}`,
            description: `MindChuk capture for ${viewedName}${combinedTags.length ? ` · Tags: #${combinedTags.join(" #")}` : ""}`,
            startDate: Timestamp.fromDate(start),
            endDate: Timestamp.fromDate(end),
            allDay: true,
            type: "todo",
            color: "#22c55e",
            attendees: [viewedName],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        } catch {
          // non-blocking
        }
      }

      setCaptureText("");
      setCaptureTagsInput("");
      setNewTaskDueDate("");
      setAttachmentBase64("");
      setAttachmentName("");
      setCaptureKind("task");
      toast.success("Saved to your MindChuk feed & tasks");
      await loadTasks();
    } catch {
      toast.error("Failed to save item");
    } finally {
      setCreating(false);
    }
  };

  const getCollectionForSource = (source: UserTaskItem["source"]) =>
    source === "todo"
      ? COLLECTIONS.TRACTION_TODOS
      : source === "rock"
        ? COLLECTIONS.TRACTION_ROCKS
        : COLLECTIONS.ACTION_ITEMS;

  const handleToggleComplete = async (item: UserTaskItem) => {
    if (!db) return;
    const nextCompleted = item.status !== "completed";
    try {
      const colName = getCollectionForSource(item.source);
      await updateDoc(doc(db, colName, item.id), {
        status: nextCompleted
          ? item.source === "action"
            ? "completed"
            : "complete"
          : "in-progress",
        completed: nextCompleted,
        updatedAt: Timestamp.now(),
      });
      toast.success(nextCompleted ? "Marked done" : "Reopened");
      await loadTasks();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleTogglePin = async (item: UserTaskItem) => {
    if (!db) return;
    try {
      const colName = getCollectionForSource(item.source);
      await updateDoc(doc(db, colName, item.id), {
        pinned: !item.pinned,
        updatedAt: Timestamp.now(),
      });
      toast.success(!item.pinned ? "Pinned to top of feed" : "Unpinned");
      await loadTasks();
    } catch {
      toast.error("Failed to pin item");
    }
  };

  const handleConvertKind = async (
    item: UserTaskItem,
    nextKind: MindChukItemKind,
  ) => {
    if (!db) return;
    try {
      const colName = getCollectionForSource(item.source);
      await updateDoc(doc(db, colName, item.id), {
        mindchukKind: nextKind,
        updatedAt: Timestamp.now(),
      });
      toast.success(`Converted to ${getKindMeta(nextKind).label}`);
      await loadTasks();
    } catch {
      toast.error("Failed to update item type");
    }
  };

  const handleAddInlineTag = async (item: UserTaskItem) => {
    if (!db || !inlineTagValue.trim()) return;
    const clean = inlineTagValue.replace(/^#/, "").trim().toLowerCase();
    if (!clean) return;
    const nextTags = Array.from(new Set([...item.tags, clean]));
    try {
      const colName = getCollectionForSource(item.source);
      await updateDoc(doc(db, colName, item.id), {
        tags: nextTags,
        updatedAt: Timestamp.now(),
      });
      setAddingTagForId(null);
      setInlineTagValue("");
      await loadTasks();
    } catch {
      toast.error("Failed to add tag");
    }
  };

  const handleRemoveTag = async (item: UserTaskItem, tagToRemove: string) => {
    if (!db) return;
    const nextTags = item.tags.filter((t) => t !== tagToRemove);
    try {
      const colName = getCollectionForSource(item.source);
      await updateDoc(doc(db, colName, item.id), {
        tags: nextTags,
        updatedAt: Timestamp.now(),
      });
      await loadTasks();
    } catch {
      toast.error("Failed to remove tag");
    }
  };

  const handleDeleteTask = async (item: UserTaskItem) => {
    if (!db) return;
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      const colName = getCollectionForSource(item.source);
      await deleteDoc(doc(db, colName, item.id));
      toast.success("Item deleted");
      await loadTasks();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  // Aggregate all #tags with counts
  const allTagsWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tasks) {
      for (const tag of t.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (selectedKindFilter === "pinned" && !t.pinned) return false;
      if (
        selectedKindFilter !== "all" &&
        selectedKindFilter !== "pinned" &&
        t.kind !== selectedKindFilter
      ) {
        return false;
      }
      if (selectedTag && !t.tags.includes(selectedTag)) {
        return false;
      }
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.priority.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q)) ||
        (t.url && t.url.toLowerCase().includes(q))
      );
    });
  }, [tasks, search, selectedKindFilter, selectedTag]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>My Mission Critical</span>
            <span>/</span>
            <span>{breadcrumbLabel}</span>
            {isMasqueradingUser && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                Viewing as {viewedName}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            {pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            MindChuk — For Minds That Never Turn Off. Save tasks, thoughts, notes, links, photos, and reminders into your private searchable feed for {viewedName}.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-1 self-start">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "feed" ? "default" : "ghost"}
            className="h-8 text-xs"
            onClick={() => setViewMode("feed")}
          >
            <LayoutList className="mr-1.5 h-3.5 w-3.5" />
            MindChuk Feed
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "table" ? "default" : "ghost"}
            className="h-8 text-xs"
            onClick={() => setViewMode("table")}
          >
            <TableIcon className="mr-1.5 h-3.5 w-3.5" />
            Tasks Table
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Total Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Open Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {tasks.filter((t) => t.status === "open").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {tasks.filter((t) => t.status === "completed").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Notes, Links &amp; Ideas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-sky-600">
              {tasks.filter((t) => t.kind !== "task").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Active #Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {allTagsWithCounts.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MindChuk Instant Brain-Dump Capture Box */}
      <Card className="border-primary/40 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Save Anything Worth Remembering ({viewedName})
              </CardTitle>
              <CardDescription className="text-xs">
                Drop a task, thought, link, photo, or reminder. Use <code className="text-primary">#hashtags</code> anywhere in your text to auto-tag.
              </CardDescription>
            </div>
            {/* Capture Kind Pills */}
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: "task", label: "Task", icon: CheckSquare },
                  { id: "note", label: "Note", icon: StickyNote },
                  { id: "idea", label: "Idea", icon: Lightbulb },
                  { id: "link", label: "Link", icon: Link2 },
                  { id: "photo", label: "Photo", icon: ImageIcon },
                  { id: "reminder", label: "Reminder", icon: Bell },
                ] as const
              ).map((k) => {
                const Icon = k.icon;
                return (
                  <Button
                    key={k.id}
                    type="button"
                    size="sm"
                    variant={captureKind === k.id ? "default" : "outline"}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setCaptureKind(k.id)}
                  >
                    <Icon className="mr-1 h-3 w-3" />
                    {k.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={2}
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
            placeholder="Type anything — a task, field note, https:// link, or #safety #jobsite reminder... (Press Ctrl+Enter to save instantly)"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                void handleCaptureSubmit();
              }
            }}
          />

          <div className="grid gap-3 sm:grid-cols-12 items-end">
            <div className="sm:col-span-4 space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Hash className="h-3 w-3" />
                Keywords / #Tags (optional)
              </Label>
              <Input
                value={captureTagsInput}
                onChange={(e) => setCaptureTagsInput(e.target.value)}
                placeholder="e.g. safety, panel-b, urgent"
                className="h-9 text-xs"
              />
            </div>

            <div className="sm:col-span-3 space-y-1">
              <Label className="text-xs">Due / Reminder Date</Label>
              <Input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Priority</Label>
              <Select
                value={newTaskPriority}
                onValueChange={setNewTaskPriority}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3 flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center justify-center rounded-md border px-2.5 h-9 text-xs hover:bg-muted shrink-0">
                <ImageIcon className="mr-1.5 h-3.5 w-3.5 text-primary" />
                {attachmentName ? "Attached" : "Photo"}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleAttachmentSelect(e.target.files?.[0])}
                />
              </label>

              <Button
                className="flex-1 h-9"
                onClick={() => void handleCaptureSubmit()}
                disabled={
                  creating || (!captureText.trim() && !attachmentBase64)
                }
              >
                {creating ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          </div>

          {attachmentName && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <span>Attached artifact: {attachmentName}</span>
              <button
                type="button"
                className="text-destructive underline"
                onClick={() => {
                  setAttachmentBase64("");
                  setAttachmentName("");
                }}
              >
                Remove
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instant Search, Type Filter Pills & #Tag Cloud ("No folders. No digging. Just find it.") */}
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Kind Filter Bar */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: `All (${tasks.length})` },
                  {
                    id: "pinned",
                    label: `Pinned (${tasks.filter((t) => t.pinned).length})`,
                  },
                  {
                    id: "task",
                    label: `Tasks (${tasks.filter((t) => t.kind === "task").length})`,
                  },
                  {
                    id: "note",
                    label: `Notes (${tasks.filter((t) => t.kind === "note").length})`,
                  },
                  {
                    id: "idea",
                    label: `Ideas (${tasks.filter((t) => t.kind === "idea").length})`,
                  },
                  {
                    id: "link",
                    label: `Links (${tasks.filter((t) => t.kind === "link").length})`,
                  },
                  {
                    id: "photo",
                    label: `Photos (${tasks.filter((t) => t.kind === "photo").length})`,
                  },
                  {
                    id: "reminder",
                    label: `Reminders (${tasks.filter((t) => t.kind === "reminder").length})`,
                  },
                ] as const
              ).map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  size="sm"
                  variant={selectedKindFilter === tab.id ? "default" : "outline"}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setSelectedKindFilter(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Instant Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type anything you remember..."
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* #Tag Filter Bar */}
          {allTagsWithCounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t">
              <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
                <Hash className="h-3 w-3" /> Filter by tag:
              </span>
              {selectedTag && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSelectedTag(null)}
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear #{selectedTag}
                </Button>
              )}
              {allTagsWithCounts.map(([tag, count]) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "secondary"}
                  className="cursor-pointer text-xs"
                  onClick={() =>
                    setSelectedTag(selectedTag === tag ? null : tag)
                  }
                >
                  #{tag} ({count})
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No matching items in your MindChuk feed or tasks yet.
            </p>
          ) : viewMode === "feed" ? (
            /* MINDCHUK STREAM / FEED CARDS VIEW */
            <div className="space-y-3">
              {filteredTasks.map((item) => {
                const kindMeta = getKindMeta(item.kind);
                const KindIcon = kindMeta.icon;
                return (
                  <div
                    key={`${item.source}-${item.id}`}
                    className={`rounded-lg border p-4 transition-colors ${
                      item.pinned
                        ? "border-primary/60 bg-primary/5"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={item.status === "completed"}
                          onCheckedChange={() => void handleToggleComplete(item)}
                          className="mt-1"
                          aria-label={`Mark ${item.title} as done`}
                        />
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[11px] gap-1"
                            >
                              <KindIcon
                                className={`h-3 w-3 ${kindMeta.color}`}
                              />
                              {kindMeta.label}
                            </Badge>
                            {item.pinned && (
                              <Badge className="text-[10px] gap-1 bg-amber-500 text-white">
                                <Pin className="h-2.5 w-2.5" /> Pinned
                              </Badge>
                            )}
                            <Badge
                              variant={
                                item.status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {item.status === "completed" ? "Done" : "Open"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="capitalize text-[10px]"
                            >
                              {item.priority}
                            </Badge>
                            {item.dueDate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Due: {item.dueDate}
                              </span>
                            )}
                            {item.createdAtLabel && (
                              <span className="text-[11px] text-muted-foreground">
                                • Saved {item.createdAtLabel}
                              </span>
                            )}
                          </div>

                          <p
                            className={`text-sm whitespace-pre-wrap ${
                              item.status === "completed"
                                ? "line-through text-muted-foreground"
                                : "font-medium"
                            }`}
                          >
                            {item.title}
                          </p>

                          {/* Clickable Extracted URL Preview */}
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary underline break-all"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              {item.url}
                            </a>
                          )}

                          {/* Attached Photo / Artifact Preview */}
                          {item.attachmentBase64 && (
                            <div className="pt-1">
                              {item.attachmentBase64.startsWith("data:image/") ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={item.attachmentBase64}
                                  alt={item.attachmentName || item.title}
                                  className="max-h-48 rounded-md border object-contain"
                                />
                              ) : (
                                <a
                                  href={item.attachmentBase64}
                                  download={item.attachmentName || "artifact"}
                                  className="text-xs text-primary underline"
                                >
                                  Download Attachment ({item.attachmentName})
                                </a>
                              )}
                            </div>
                          )}

                          {/* #Tags Row + Inline Add Tag */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {item.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[11px] gap-1"
                              >
                                <span
                                  className="cursor-pointer"
                                  onClick={() => setSelectedTag(tag)}
                                >
                                  #{tag}
                                </span>
                                <button
                                  type="button"
                                  className="hover:text-destructive"
                                  onClick={() => void handleRemoveTag(item, tag)}
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}

                            {addingTagForId === item.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={inlineTagValue}
                                  onChange={(e) =>
                                    setInlineTagValue(e.target.value)
                                  }
                                  placeholder="tag..."
                                  className="h-6 w-24 text-xs px-2"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      void handleAddInlineTag(item);
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => void handleAddInlineTag(item)}
                                >
                                  Add
                                </Button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingTagForId(item.id);
                                  setInlineTagValue("");
                                }}
                                className="text-[11px] text-muted-foreground hover:text-primary"
                              >
                                + #tag
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={item.pinned ? "Unpin" : "Pin to top"}
                          onClick={() => void handleTogglePin(item)}
                        >
                          <Pin
                            className={`h-4 w-4 ${
                              item.pinned
                                ? "text-amber-500 fill-amber-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </Button>

                        {item.kind !== "task" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => void handleConvertKind(item, "task")}
                          >
                            Convert to Task
                          </Button>
                        )}

                        <Button
                          variant={
                            item.status === "completed" ? "outline" : "default"
                          }
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => void handleToggleComplete(item)}
                        >
                          {item.status === "completed" ? (
                            <>
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              Reopen
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Mark Done
                            </>
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Delete"
                          onClick={() => void handleDeleteTask(item)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* STRUCTURED TASKS TABLE VIEW */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Done</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Task / Thought</TableHead>
                  <TableHead>#Tags</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  const kindMeta = getKindMeta(task.kind);
                  return (
                    <TableRow key={`${task.source}-${task.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={task.status === "completed"}
                          onCheckedChange={() => void handleToggleComplete(task)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {kindMeta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            task.status === "completed" ? "default" : "outline"
                          }
                          className="gap-1 capitalize"
                        >
                          {task.status === "completed" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3 text-amber-500" />
                          )}
                          {task.status === "completed" ? "Done" : "Open"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={
                          task.status === "completed"
                            ? "line-through text-muted-foreground"
                            : "font-medium"
                        }
                      >
                        {task.title}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {task.tags.map((t) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className="text-[10px] cursor-pointer"
                              onClick={() => setSelectedTag(t)}
                            >
                              #{t}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {task.dueDate || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => void handleTogglePin(task)}
                          >
                            <Pin
                              className={`h-3.5 w-3.5 ${
                                task.pinned
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </Button>
                          <Button
                            variant={
                              task.status === "completed" ? "outline" : "default"
                            }
                            size="sm"
                            onClick={() => void handleToggleComplete(task)}
                          >
                            {task.status === "completed" ? (
                              <>
                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                Reopen
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Mark Done
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDeleteTask(task)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
