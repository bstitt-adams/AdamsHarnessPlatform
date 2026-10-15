"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { useUserProfile } from "@/contexts/user-profile-context";
import { isSuperAdmin } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus,
  Wrench,
  FileText,
  Loader2,
  Copy,
  Trash2,
  Pencil,
  RefreshCw,
  Calendar,
  Download,
  Link as LinkIcon,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  where,
} from "firebase/firestore";
import { COLLECTIONS, type PlatformDevTaskDoc, type PlatformDevReportDoc } from "@/lib/schema";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";

const CATEGORIES = [
  "Firebase",
  "Vercel",
  "Portal UI",
  "LMS",
  "Safety Calendar",
  "Hermes",
  "Integrations",
  "Other",
] as const;

const STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "blocked", label: "Blocked" },
] as const;

function formatDate(ts?: Timestamp): string {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts as unknown as number);
  return d.toLocaleDateString("en-US");
}

export default function PlatformDevelopmentPage() {
  const router = useRouter();
  const { linkedTeamMember } = useUserProfile();
  const currentUserRole = linkedTeamMember?.role || "affiliate";
  const currentUserName = linkedTeamMember
    ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}`
    : auth?.currentUser?.displayName || "Unknown";
  const currentUserUid = auth?.currentUser?.uid || "";

  const [tasks, setTasks] = useState<PlatformDevTaskDoc[]>([]);
  const [reports, setReports] = useState<PlatformDevReportDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlatformDevTaskDoc | null>(null);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Other" as (typeof CATEGORIES)[number],
    systemsAffected: "",
    aiCapability: "",
    status: "planned" as PlatformDevTaskDoc["status"],
    hoursSpent: "0",
    taskDate: new Date().toISOString().split("T")[0],
  });

  if (!isSuperAdmin(currentUserRole)) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Platform Development</CardTitle>
            <CardDescription>This module is only available to superadmins.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const fetchData = async () => {
    if (!db) {
      toast.error("Firebase not initialized");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const tasksQuery = query(collection(db, COLLECTIONS.PLATFORM_DEV_TASKS), orderBy("taskDate", "desc"));
      const tasksSnap = await getDocs(tasksQuery);
      const tasksData: PlatformDevTaskDoc[] = [];
      tasksSnap.forEach((docSnap) => {
        tasksData.push({ id: docSnap.id, ...docSnap.data() } as PlatformDevTaskDoc);
      });
      setTasks(tasksData);

      const reportsQuery = query(
        collection(db, COLLECTIONS.PLATFORM_DEV_REPORTS),
        orderBy("reportDate", "desc"),
      );
      const reportsSnap = await getDocs(reportsQuery);
      const reportsData: PlatformDevReportDoc[] = [];
      reportsSnap.forEach((docSnap) => {
        reportsData.push({ id: docSnap.id, ...docSnap.data() } as PlatformDevReportDoc);
      });
      setReports(reportsData);
    } catch (error) {
      console.error("Error fetching platform development data:", error);
      toast.error("Failed to load platform development data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "Other",
      systemsAffected: "",
      aiCapability: "",
      status: "planned",
      hoursSpent: "0",
      taskDate: new Date().toISOString().split("T")[0],
    });
    setEditingTask(null);
  };

  const handleSaveTask = async () => {
    if (!db || !auth?.currentUser) {
      toast.error("Firebase not initialized");
      return;
    }
    const hours = parseFloat(formData.hoursSpent);
    if (isNaN(hours) || hours < 0) {
      toast.error("Hours spent must be a non-negative number");
      return;
    }
    const data = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      systemsAffected: formData.systemsAffected.split(",").map((s) => s.trim()).filter(Boolean),
      aiCapability: formData.aiCapability,
      status: formData.status,
      hoursSpent: hours,
      taskDate: Timestamp.fromDate(new Date(formData.taskDate)),
      createdByUid: auth.currentUser.uid,
      createdByName: currentUserName,
      updatedAt: Timestamp.now(),
    };
    try {
      if (editingTask) {
        await updateDoc(doc(db, COLLECTIONS.PLATFORM_DEV_TASKS, editingTask.id), data);
        toast.success("Task updated");
      } else {
        await addDoc(collection(db, COLLECTIONS.PLATFORM_DEV_TASKS), {
          ...data,
          createdAt: Timestamp.now(),
        });
        toast.success("Task added");
      }
      setDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task");
    }
  };

  const handleEditTask = (task: PlatformDevTaskDoc) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      category: task.category,
      systemsAffected: task.systemsAffected.join(", "),
      aiCapability: task.aiCapability || "",
      status: task.status,
      hoursSpent: String(task.hoursSpent),
      taskDate: task.taskDate.toDate().toISOString().split("T")[0],
    });
    setDialogOpen(true);
  };

  const handleDeleteTask = async (id: string) => {
    if (!db) return;
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.PLATFORM_DEV_TASKS, id));
      toast.success("Task deleted");
      await fetchData();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const getPeriodBounds = () => {
    const now = new Date();
    const day = now.getDay();
    const daysSinceFriday = (day + 7 - 5) % 7;
    const friday = new Date(now);
    friday.setDate(now.getDate() - daysSinceFriday);
    friday.setHours(0, 0, 0, 0);
    const previousFriday = new Date(friday);
    previousFriday.setDate(friday.getDate() - 7);
    return { start: previousFriday, end: friday };
  };

  const generateReport = async () => {
    if (!db || !auth?.currentUser) {
      toast.error("You must be signed in");
      return;
    }
    setGenerating(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const { start, end } = getPeriodBounds();
      const response = await fetch("/api/admin/platform-development/generate-report", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate report");
      }
      toast.success("Report generated and saved");
      await fetchData();
    } catch (error) {
      console.error("Generate report error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case "blocked":
        return <Badge className="bg-red-100 text-red-800">Blocked</Badge>;
      default:
        return <Badge variant="secondary">Planned</Badge>;
    }
  };

  const totalHours = tasks.reduce((sum, t) => sum + (t.hoursSpent || 0), 0);

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>Admin</span>
            <span>/</span>
            <span>Platform Development</span>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Wrench className="h-8 w-8 text-primary" />
            Platform Development
          </h1>
          <p className="text-muted-foreground">
            Track time and activities for building and connecting Adams Platform systems.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={generateReport} disabled={generating || tasks.length === 0}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Generate Weekly Report
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTask ? "Edit Task" : "Add Development Task"}</DialogTitle>
                <DialogDescription>Record time spent on Adams Platform systems and capabilities.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Connected Firebase Auth to Team Members" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as (typeof CATEGORIES)[number] })}>
                      <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as PlatformDevTaskDoc["status"] })}>
                      <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hoursSpent">Hours Spent *</Label>
                    <Input id="hoursSpent" type="number" min="0" step="0.25" value={formData.hoursSpent} onChange={(e) => setFormData({ ...formData, hoursSpent: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taskDate">Date *</Label>
                    <Input id="taskDate" type="date" value={formData.taskDate} onChange={(e) => setFormData({ ...formData, taskDate: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systemsAffected">Systems / Processes Affected</Label>
                  <Input id="systemsAffected" value={formData.systemsAffected} onChange={(e) => setFormData({ ...formData, systemsAffected: e.target.value })} placeholder="Comma-separated, e.g., Authentication, Team Members, Firestore" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aiCapability">AI Capability Introduced</Label>
                  <Input id="aiCapability" value={formData.aiCapability} onChange={(e) => setFormData({ ...formData, aiCapability: e.target.value })} placeholder="e.g., AI-generated weekly summary of development activities" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What was done and why it matters" rows={4} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveTask} disabled={!formData.title || !formData.hoursSpent}>Save Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{tasks.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{totalHours.toFixed(1)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{tasks.filter((t) => t.status === "completed").length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Reports</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{reports.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Development Tasks</CardTitle>
          <CardDescription>Time and activities tracked for Adams Platform work.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No tasks yet. Add the first development task above.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>AI Capability</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-muted-foreground max-w-xs truncate">{task.description}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{task.category}</Badge></TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>{task.hoursSpent.toFixed(1)}</TableCell>
                      <TableCell>{formatDate(task.taskDate)}</TableCell>
                      <TableCell>{task.aiCapability || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Reports</CardTitle>
          <CardDescription>AI-generated summaries stored as base64 PDFs. Copy the link to share with Jeff Allen.</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No reports generated yet.</div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Report for week ending {formatDate(report.periodEnd)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(report.reportDate)} · {report.tasks.length} tasks · {report.recipientEmail}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `${window.location.origin}/portal/admin/platform-development/reports/${report.id}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Report link copied");
                      }}
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Copy Link
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/portal/admin/platform-development/reports/${report.id}`)}>
                      <FileText className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
