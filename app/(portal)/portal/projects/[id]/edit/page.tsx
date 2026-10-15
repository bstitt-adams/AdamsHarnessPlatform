"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  FolderKanban,
  Calendar,
  Loader2,
  Flag,
  Plus,
  X,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp, collection, getDocs, query, orderBy } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";
import { toast } from "sonner";

type MilestoneStatus = "not-started" | "in-progress" | "completed" | "blocked" | "deferred";

interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  status: MilestoneStatus;
  completedAt: string | null;
  priority: "low" | "medium" | "high";
}

interface ProjectForm {
  name: string;
  description: string;
  organizationName: string;
  status: string;
  startDate: string;
  endDate: string;
  progress: string;
}

const milestoneStatusOptions: { value: MilestoneStatus; label: string; color: string }[] = [
  { value: "not-started", label: "Not Started", color: "bg-gray-100 text-gray-800" },
  { value: "in-progress", label: "In Progress", color: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-800" },
  { value: "blocked", label: "Blocked", color: "bg-red-100 text-red-800" },
  { value: "deferred", label: "Deferred", color: "bg-sky-100 text-sky-800" },
];

const priorityOptions: { value: "low" | "medium" | "high"; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function getMilestoneStatusBadge(status: MilestoneStatus) {
  const opt = milestoneStatusOptions.find((o) => o.value === status);
  return <Badge className={opt?.color || "bg-gray-100 text-gray-800"}>{opt?.label || status}</Badge>;
}

const statusOptions = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "at-risk", label: "At Risk" },
  { value: "on-hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState<ProjectForm>({
    name: "",
    description: "",
    organizationName: "",
    status: "active",
    startDate: "",
    endDate: "",
    progress: "0",
  });
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestone, setNewMilestone] = useState({ name: "", description: "", dueDate: "", priority: "medium" as "low" | "medium" | "high" });
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!db || !projectId) return;
      
      try {
        // Fetch project
        const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
        const projectSnap = await getDoc(projectRef);
        
        if (projectSnap.exists()) {
          const data = projectSnap.data();
          
          const startDate = data.startDate instanceof Timestamp 
            ? data.startDate.toDate().toISOString().split("T")[0]
            : data.startDate || "";
          const endDate = data.endDate instanceof Timestamp 
            ? data.endDate.toDate().toISOString().split("T")[0]
            : data.endDate || "";
          
          setForm({
            name: data.name || "",
            description: data.description || "",
            organizationName: data.organizationName || data.client || "",
            status: data.status || "active",
            startDate,
            endDate,
            progress: String(data.progress || 0),
          });

          // Load milestones
          if (data.milestones && Array.isArray(data.milestones)) {
            const loadedMilestones: Milestone[] = data.milestones.map((m: any) => ({
              id: m.id || crypto.randomUUID(),
              name: m.name || "",
              description: m.description || "",
              dueDate: m.dueDate instanceof Timestamp
                ? m.dueDate.toDate().toISOString().split("T")[0]
                : m.dueDate || "",
              status: m.status || (m.completed ? "completed" : "not-started"),
              completedAt: m.completedAt instanceof Timestamp
                ? m.completedAt.toDate().toISOString()
                : m.completedAt || null,
              priority: m.priority || "medium",
            }));
            setMilestones(loadedMilestones);
          }
        } else {
          toast.error("Project not found");
          router.push("/portal/projects");
          return;
        }

        // Fetch organizations for autocomplete
        const orgsRef = collection(db, COLLECTIONS.ORGANIZATIONS);
        const orgsQuery = query(orgsRef, orderBy("name"));
        const orgsSnapshot = await getDocs(orgsQuery);
        const orgList = orgsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unnamed Organization",
        }));
        setOrganizations(orgList);
      } catch (error) {
        console.error("Error fetching project:", error);
        toast.error("Failed to load project");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [projectId, router]);

  const updateField = (field: keyof ProjectForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addMilestone = () => {
    if (!newMilestone.name.trim()) {
      toast.error("Please enter a milestone name");
      return;
    }
    const milestone: Milestone = {
      id: crypto.randomUUID(),
      name: newMilestone.name.trim(),
      description: newMilestone.description.trim(),
      dueDate: newMilestone.dueDate,
      status: "not-started",
      completedAt: null,
      priority: newMilestone.priority,
    };
    setMilestones((prev) => [...prev, milestone]);
    setNewMilestone({ name: "", description: "", dueDate: "", priority: "medium" });
  };

  const removeMilestone = (id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMilestoneStatus = (id: string, status: MilestoneStatus) => {
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const completedAt = status === "completed" ? new Date().toISOString() : null;
        return { ...m, status, completedAt };
      })
    );
  };

  const updateMilestoneField = (id: string, field: keyof Milestone, value: string) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    if (!db || !projectId) {
      toast.error("Database not initialized");
      return;
    }

    setIsSaving(true);
    try {
      const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
      const completedMilestones = milestones.filter((m) => m.status === "completed").length;
      
      const updateData: Record<string, any> = {
        name: form.name,
        description: form.description,
        organizationName: form.organizationName,
        status: form.status,
        progress: parseInt(form.progress) || 0,
        milestones: milestones.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description || "",
          dueDate: m.dueDate ? Timestamp.fromDate(new Date(m.dueDate)) : null,
          status: m.status,
          completedAt: m.completedAt ? Timestamp.fromDate(new Date(m.completedAt)) : null,
          priority: m.priority || "medium",
        })),
        milestonesCompleted: completedMilestones,
        milestonesTotal: milestones.length,
        updatedAt: Timestamp.now(),
      };

      if (form.startDate) {
        updateData.startDate = Timestamp.fromDate(new Date(form.startDate));
      }
      if (form.endDate) {
        updateData.endDate = Timestamp.fromDate(new Date(form.endDate));
      }

      await updateDoc(projectRef, updateData);
      toast.success("Project updated successfully");
      router.push(`/portal/projects/${projectId}`);
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/portal/projects/${projectId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Project</h1>
          <p className="text-muted-foreground">Update project details</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Project Details
              </CardTitle>
              <CardDescription>Basic information about the project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., ISO Implementation for ABC Corp"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the project scope and objectives..."
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="organization">Client / Organization</Label>
                  <Input
                    id="organization"
                    placeholder="Enter client name"
                    value={form.organizationName}
                    onChange={(e) => updateField("organizationName", e.target.value)}
                    list="organizations"
                  />
                  <datalist id="organizations">
                    {organizations.map((org) => (
                      <option key={org.id} value={org.name} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline & Progress
              </CardTitle>
              <CardDescription>Project schedule and completion status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateField("startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Target End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => updateField("endDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="progress">Progress (%)</Label>
                <Input
                  id="progress"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={form.progress}
                  onChange={(e) => updateField("progress", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Milestones
                {milestones.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {milestones.filter((m) => m.status === "completed").length}/{milestones.length} completed
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Track key milestones and deliverables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Milestones */}
              {milestones.length > 0 && (
                <div className="space-y-3">
                  {milestones.map((milestone, index) => (
                    <div
                      key={milestone.id}
                      className={`border rounded-lg transition-all ${
                        milestone.status === "completed" ? "bg-green-50/50 border-green-200" :
                        milestone.status === "blocked" ? "bg-red-50/50 border-red-200" :
                        milestone.status === "in-progress" ? "bg-blue-50/50 border-blue-200" :
                        "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <span className="text-xs font-mono text-muted-foreground w-6 text-center">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium truncate ${milestone.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                              {milestone.name}
                            </p>
                            {getMilestoneStatusBadge(milestone.status)}
                            {milestone.priority === "high" && <Badge variant="destructive" className="text-xs">High</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {milestone.dueDate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {new Date(milestone.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            {milestone.completedAt && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Completed: {new Date(milestone.completedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setExpandedMilestone(expandedMilestone === milestone.id ? null : milestone.id)}
                        >
                          {expandedMilestone === milestone.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMilestone(milestone.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Expanded Details */}
                      {expandedMilestone === milestone.id && (
                        <div className="px-3 pb-3 pt-1 border-t space-y-3">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Status</Label>
                              <Select
                                value={milestone.status}
                                onValueChange={(v) => updateMilestoneStatus(milestone.id, v as MilestoneStatus)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {milestoneStatusOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Priority</Label>
                              <Select
                                value={milestone.priority}
                                onValueChange={(v) => updateMilestoneField(milestone.id, "priority", v)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {priorityOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Due Date</Label>
                              <Input
                                type="date"
                                value={milestone.dueDate}
                                onChange={(e) => updateMilestoneField(milestone.id, "dueDate", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={milestone.name}
                              onChange={(e) => updateMilestoneField(milestone.id, "name", e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Description</Label>
                            <Textarea
                              placeholder="Describe this milestone..."
                              value={milestone.description}
                              onChange={(e) => updateMilestoneField(milestone.id, "description", e.target.value)}
                              rows={2}
                              className="text-xs"
                            />
                          </div>
                          {milestone.status === "completed" && milestone.completedAt && (
                            <div className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Completed on {new Date(milestone.completedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Milestone */}
              <div className="flex flex-col gap-3 p-4 border border-dashed rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Add New Milestone</div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input
                    placeholder="Milestone name..."
                    value={newMilestone.name}
                    onChange={(e) => setNewMilestone((prev) => ({ ...prev, name: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMilestone();
                      }
                    }}
                  />
                  <Button type="button" onClick={addMilestone} variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    type="date"
                    value={newMilestone.dueDate}
                    onChange={(e) => setNewMilestone((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                  <Select
                    value={newMilestone.priority}
                    onValueChange={(v) => setNewMilestone((prev) => ({ ...prev, priority: v as "low" | "medium" | "high" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label} Priority
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Description (optional)"
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone((prev) => ({ ...prev, description: e.target.value }))}
                    rows={1}
                    className="min-h-[36px]"
                  />
                </div>
              </div>

              {milestones.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No milestones yet. Add milestones to track project progress.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/portal/projects/${projectId}`}>Cancel</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{form.status.replace("-", " ")}</span>
              </div>
              {form.startDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-medium">
                    {new Date(form.startDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {form.endDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date</span>
                  <span className="font-medium">
                    {new Date(form.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{form.progress || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Milestones</span>
                <span className="font-medium">
                  {milestones.filter((m) => m.status === "completed").length} / {milestones.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
