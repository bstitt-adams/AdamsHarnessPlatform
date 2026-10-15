"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Plus,
  Target,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Loader2,
  Trash2,
  Edit,
  Link as LinkIcon,
  XCircle,
} from "lucide-react";
import { useTractionData, Rock, Milestone } from "@/lib/hooks/use-eos2-data";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { COLLECTIONS, type TeamMemberDoc, type UserDoc } from "@/lib/schema";
import { toast } from "sonner";

// Helper to get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function getStatusBadge(status: string) {
  switch (status) {
    case "on-track":
      return (
        <Badge className="bg-green-100 text-green-800">
          <TrendingUp className="h-3 w-3 mr-1" />
          On Track
        </Badge>
      );
    case "at-risk":
      return (
        <Badge className="bg-orange-100 text-orange-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          At Risk
        </Badge>
      );
    case "off-track":
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Off Track
        </Badge>
      );
    case "complete":
      return (
        <Badge className="bg-blue-100 text-blue-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// Get current quarter
function getCurrentQuarter(): string {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return `Q${quarter} ${now.getFullYear()}`;
}

// Get days remaining in quarter
function getDaysRemainingInQuarter(): number {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
  const diff = quarterEnd.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Empty action item form
interface ActionItemForm {
  title: string;
  description: string;
  owner: string;
  dueDate: string;
  status: Rock["status"];
  progress: number;
  quarter: string;
  milestones: Milestone[];
}

const emptyActionItemForm: ActionItemForm = {
  title: "",
  description: "",
  owner: "",
  dueDate: "",
  status: "on-track",
  progress: 0,
  quarter: getCurrentQuarter(),
  milestones: [],
};

export default function ActionItemsPage() {
  const {
    rocks,
    issues,
    todos,
    metrics,
    loading,
    addRock,
    updateRock,
    deleteRock,
  } = useTractionData();

  const [showActionItemForm, setShowActionItemForm] = useState(false);
  const [editingActionItem, setEditingActionItem] = useState<Rock | null>(null);
  const [actionItemForm, setActionItemForm] = useState<ActionItemForm>(emptyActionItemForm);
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [newMilestone, setNewMilestone] = useState("");

  const currentQuarter = getCurrentQuarter();
  const daysRemaining = getDaysRemainingInQuarter();

  // Load team members and users
  useEffect(() => {
    const loadPeople = async () => {
      if (!db) return;
      try {
        const members: { id: string; name: string }[] = [];
        
        // First try to load team members
        const teamRef = collection(db, COLLECTIONS.TEAM_MEMBERS);
        const teamQuery = query(teamRef, orderBy("firstName"));
        const teamSnapshot = await getDocs(teamQuery);
        
        teamSnapshot.docs.forEach((doc) => {
          const data = doc.data() as TeamMemberDoc;
          const name = `${data.firstName || ""} ${data.lastName || ""}`.trim();
          if (name && !members.find(m => m.id === doc.id)) {
            members.push({ id: doc.id, name });
          }
        });
        
        // Also load users as fallback/additional options
        const usersRef = collection(db, COLLECTIONS.USERS);
        const usersSnapshot = await getDocs(usersRef);
        
        usersSnapshot.docs.forEach((doc) => {
          const data = doc.data() as UserDoc;
          const name = data.name || data.email || "Unknown User";
          if (name && !members.find(m => m.id === doc.id)) {
            members.push({ id: doc.id, name });
          }
        });
        
        setTeamMembers(members);
      } catch (error) {
        console.error("Error loading people:", error);
      }
    };
    loadPeople();
  }, []);

  // Stats
  const totalActionItems = rocks.length;
  const completedActionItems = rocks.filter((r) => r.status === "complete").length;
  const atRiskActionItems = rocks.filter((r) => r.status === "at-risk" || r.status === "off-track").length;
  const avgProgress = totalActionItems > 0 ? Math.round(rocks.reduce((sum, r) => sum + r.progress, 0) / totalActionItems) : 0;

  // Open add action item dialog
  const openAddActionItem = () => {
    setEditingActionItem(null);
    setActionItemForm({ ...emptyActionItemForm, quarter: currentQuarter });
    setShowActionItemForm(true);
  };

  // Open edit action item dialog
  const openEditActionItem = (rock: Rock) => {
    setEditingActionItem(rock);
    setActionItemForm({
      title: rock.title,
      description: rock.description,
      owner: rock.owner,
      dueDate: rock.dueDate,
      status: rock.status,
      progress: rock.progress,
      quarter: rock.quarter,
      milestones: rock.milestones || [],
    });
    setShowActionItemForm(true);
  };

  // Add milestone
  const addMilestone = () => {
    if (!newMilestone.trim()) return;
    setActionItemForm({
      ...actionItemForm,
      milestones: [
        ...actionItemForm.milestones,
        { id: `m-${Date.now()}`, title: newMilestone.trim(), completed: false },
      ],
    });
    setNewMilestone("");
  };

  // Remove milestone
  const removeMilestone = (id: string) => {
    setActionItemForm({
      ...actionItemForm,
      milestones: actionItemForm.milestones.filter((m) => m.id !== id),
    });
  };

  // Toggle milestone completion
  const toggleMilestone = (id: string) => {
    setActionItemForm({
      ...actionItemForm,
      milestones: actionItemForm.milestones.map((m) =>
        m.id === id ? { ...m, completed: !m.completed } : m
      ),
    });
  };

  // Calculate progress from milestones
  const calculateProgress = () => {
    if (actionItemForm.milestones.length === 0) return 0;
    const completed = actionItemForm.milestones.filter((m) => m.completed).length;
    return Math.round((completed / actionItemForm.milestones.length) * 100);
  };

  // Handle save action item
  const handleSaveActionItem = async () => {
    if (!actionItemForm.title.trim() || !actionItemForm.owner) {
      toast.error("Please fill in title and owner");
      return;
    }

    setSaving(true);
    try {
      const progress = calculateProgress();
      const actionItemData = {
        title: actionItemForm.title,
        description: actionItemForm.description,
        owner: actionItemForm.owner,
        ownerId: teamMembers.find((m) => m.name === actionItemForm.owner)?.id || "",
        dueDate: actionItemForm.dueDate,
        status: progress === 100 ? "complete" as const : actionItemForm.status,
        progress,
        quarter: actionItemForm.quarter,
        milestones: actionItemForm.milestones,
      };

      if (editingActionItem) {
        await updateRock(editingActionItem.id, actionItemData);
        toast.success("Action item updated successfully");
      } else {
        await addRock(actionItemData);
        toast.success("Action item created successfully");
      }

      setShowActionItemForm(false);
      setActionItemForm(emptyActionItemForm);
      setEditingActionItem(null);
    } catch (error) {
      toast.error("Failed to save action item");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Delete action item
  const handleDeleteActionItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this action item?")) return;
    try {
      await deleteRock(id);
      toast.success("Action item deleted");
    } catch (error) {
      toast.error("Failed to delete action item");
    }
  };

  // Get linked items for an action item
  const getLinkedIssues = (rock: Rock) => {
    return issues.filter((i) => rock.linkedIssueIds?.includes(i.id));
  };

  const getLinkedTodos = (rock: Rock) => {
    return todos.filter((t) => rock.linkedTodoIds?.includes(t.id));
  };

  const getLinkedMetrics = (rock: Rock) => {
    return metrics.filter((m) => rock.linkedMetricIds?.includes(m.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Action Items</h1>
          <p className="text-muted-foreground">
            {currentQuarter} quarterly goals • {daysRemaining} days remaining
          </p>
        </div>
        <Dialog open={showActionItemForm} onOpenChange={setShowActionItemForm}>
          <DialogTrigger asChild>
            <Button onClick={openAddActionItem}>
              <Plus className="mr-2 h-4 w-4" />
              New Action Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingActionItem ? "Edit Action Item" : "Create New Action Item"}</DialogTitle>
              <DialogDescription>
                Action items are 90-day priorities that move your business forward
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="action-item-title">Title *</Label>
                <Input
                  id="action-item-title"
                  placeholder="e.g., Launch new product line"
                  value={actionItemForm.title}
                  onChange={(e) => setActionItemForm({ ...actionItemForm, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="action-item-description">Description</Label>
                <Textarea
                  id="action-item-description"
                  placeholder="Detailed description of what needs to be accomplished"
                  value={actionItemForm.description}
                  onChange={(e) => setActionItemForm({ ...actionItemForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action-item-owner">Owner *</Label>
                  <Select
                    value={actionItemForm.owner}
                    onValueChange={(v) => setActionItemForm({ ...actionItemForm, owner: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.name}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action-item-quarter">Quarter</Label>
                  <Select
                    value={actionItemForm.quarter}
                    onValueChange={(v) => setActionItemForm({ ...actionItemForm, quarter: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                      <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                      <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                      <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action-item-due">Due Date</Label>
                  <Input
                    id="action-item-due"
                    type="date"
                    value={actionItemForm.dueDate}
                    onChange={(e) => setActionItemForm({ ...actionItemForm, dueDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action-item-status">Status</Label>
                  <Select
                    value={actionItemForm.status}
                    onValueChange={(v: Rock["status"]) => setActionItemForm({ ...actionItemForm, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on-track">On Track</SelectItem>
                      <SelectItem value="at-risk">At Risk</SelectItem>
                      <SelectItem value="off-track">Off Track</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2">
                <Label>Milestones</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a milestone..."
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMilestone())}
                  />
                  <Button type="button" variant="outline" onClick={addMilestone}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 mt-2">
                  {actionItemForm.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-center gap-2 p-2 border rounded-md"
                    >
                      <Checkbox
                        checked={milestone.completed}
                        onCheckedChange={() => toggleMilestone(milestone.id)}
                      />
                      <span
                        className={`flex-1 text-sm ${
                          milestone.completed ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {milestone.title}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMilestone(milestone.id)}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                {actionItemForm.milestones.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Progress: {calculateProgress()}% ({actionItemForm.milestones.filter((m) => m.completed).length}/{actionItemForm.milestones.length} completed)
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowActionItemForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveActionItem} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : editingActionItem ? (
                  <Edit className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {editingActionItem ? "Update Action Item" : "Create Action Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActionItems}</div>
            <p className="text-xs text-muted-foreground">This quarter</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedActionItems}</div>
            <p className="text-xs text-muted-foreground">
              {totalActionItems > 0 ? Math.round((completedActionItems / totalActionItems) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{atRiskActionItems}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProgress}%</div>
            <Progress value={avgProgress} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Action Items List */}
      {rocks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Action Items Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Action items are your 90-day priorities. Create your first action item to start tracking quarterly goals.
            </p>
            <Button onClick={openAddActionItem}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Action Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rocks.map((rock) => {
            const linkedIssues = getLinkedIssues(rock);
            const linkedTodos = getLinkedTodos(rock);
            const linkedMetrics = getLinkedMetrics(rock);
            const milestones = rock.milestones || [];

            return (
              <Card key={rock.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Target className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{rock.title}</CardTitle>
                        <CardDescription className="mt-1">{rock.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(rock.status)}
                      <Button variant="ghost" size="sm" onClick={() => openEditActionItem(rock)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteActionItem(rock.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{rock.progress}%</span>
                      </div>
                      <Progress value={rock.progress} />
                    </div>

                    {/* Owner */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(rock.owner)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{rock.owner}</p>
                        <p className="text-xs text-muted-foreground">Owner</p>
                      </div>
                    </div>

                    {/* Milestones Summary */}
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {milestones.filter((m) => m.completed).length} of {milestones.length} milestones
                      </span>
                    </div>
                  </div>

                  {/* Milestones */}
                  {milestones.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <p className="text-sm font-medium mb-3">Milestones</p>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {milestones.map((milestone) => (
                          <div
                            key={milestone.id}
                            className={`flex items-center gap-2 p-2 rounded-md ${
                              milestone.completed ? "bg-green-50" : "bg-muted/50"
                            }`}
                          >
                            <Checkbox checked={milestone.completed} disabled />
                            <span
                              className={`text-sm ${
                                milestone.completed ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {milestone.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linked Items */}
                  {(linkedIssues.length > 0 || linkedTodos.length > 0 || linkedMetrics.length > 0) && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-3 flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Linked Items
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {linkedIssues.map((issue) => (
                          <Badge key={issue.id} variant="outline" className="text-xs">
                            Issue: {issue.title}
                          </Badge>
                        ))}
                        {linkedTodos.map((todo) => (
                          <Badge key={todo.id} variant="outline" className="text-xs">
                            Todo: {todo.title}
                          </Badge>
                        ))}
                        {linkedMetrics.map((metric) => (
                          <Badge key={metric.id} variant="outline" className="text-xs">
                            Metric: {metric.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
