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
} from "lucide-react";

interface UserTaskItem {
  id: string;
  source: "todo" | "rock" | "action";
  title: string;
  status: "open" | "completed";
  priority: string;
  dueDate?: string;
  ownerId?: string;
  ownerName?: string;
}

export default function MyTasksPage() {
  const { linkedTeamMember, profile, isMasqueradingUser } = useUserProfile();
  const [tasks, setTasks] = useState<UserTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [creating, setCreating] = useState(false);

  const viewedName = linkedTeamMember
    ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}`.trim()
    : profile.firstName
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : profile.email || "Current User";

  const currentMemberId = linkedTeamMember?.id || "";
  const currentUid = linkedTeamMember?.firebaseUid || auth?.currentUser?.uid || "";
  const currentEmail = (linkedTeamMember?.emailPrimary || profile.email || "").toLowerCase();

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
        const ownerId = String(data.ownerId || data.assigneeId || data.assignedTo || "");
        const ownerName = String(data.ownerName || data.assigneeName || "").toLowerCase();
        const ownerEmail = String(data.ownerEmail || "").toLowerCase();

        if (currentMemberId && ownerId === currentMemberId) return true;
        if (currentUid && ownerId === currentUid) return true;
        if (currentEmail && ownerEmail === currentEmail) return true;
        if (viewedName && ownerName && ownerName === viewedName.toLowerCase()) return true;
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
        collected.push({
          id: d.id,
          source: "todo",
          title: String(data.description || data.title || "Task"),
          status: data.status === "complete" || data.completed ? "completed" : "open",
          priority: String(data.priority || "medium"),
          dueDate: due,
          ownerName: String(data.ownerName || viewedName),
        });
      });

      rocksSnap?.forEach((d) => {
        const data = d.data();
        if (!matchesUser(data)) return;
        collected.push({
          id: d.id,
          source: "rock",
          title: String(data.title || data.description || "Quarterly Rock"),
          status: data.status === "complete" ? "completed" : "open",
          priority: "high",
          dueDate: String(data.quarter || ""),
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
        collected.push({
          id: d.id,
          source: "action",
          title: String(data.title || data.description || "Action Item"),
          status: data.status === "completed" || data.completed ? "completed" : "open",
          priority: String(data.priority || "medium"),
          dueDate: due,
          ownerName: String(data.assigneeName || viewedName),
        });
      });

      setTasks(collected);
    } catch (err) {
      console.error("Failed to load user tasks:", err);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [currentMemberId, currentUid, currentEmail, viewedName]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const handleAddTask = async () => {
    if (!db || !newTaskTitle.trim()) return;
    setCreating(true);
    try {
      await addDoc(collection(db, COLLECTIONS.TRACTION_TODOS), {
        description: newTaskTitle.trim(),
        ownerId: currentMemberId || currentUid,
        ownerName: viewedName,
        ownerEmail: currentEmail,
        priority: newTaskPriority,
        status: "in-progress",
        dueDate: newTaskDueDate
          ? Timestamp.fromDate(new Date(newTaskDueDate))
          : Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      setNewTaskTitle("");
      setNewTaskDueDate("");
      toast.success("Task added to My Tasks");
      await loadTasks();
    } catch {
      toast.error("Failed to add task");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleComplete = async (item: UserTaskItem) => {
    if (!db) return;
    const nextCompleted = item.status !== "completed";
    try {
      const colName =
        item.source === "todo"
          ? COLLECTIONS.TRACTION_TODOS
          : item.source === "rock"
            ? COLLECTIONS.TRACTION_ROCKS
            : COLLECTIONS.ACTION_ITEMS;

      await updateDoc(doc(db, colName, item.id), {
        status: nextCompleted
          ? item.source === "action"
            ? "completed"
            : "complete"
          : "in-progress",
        completed: nextCompleted,
        updatedAt: Timestamp.now(),
      });
      toast.success(nextCompleted ? "Task marked done" : "Task reopened");
      await loadTasks();
    } catch {
      toast.error("Failed to update task status");
    }
  };

  const handleDeleteTask = async (item: UserTaskItem) => {
    if (!db) return;
    if (!confirm(`Delete task "${item.title}"?`)) return;
    try {
      const colName =
        item.source === "todo"
          ? COLLECTIONS.TRACTION_TODOS
          : item.source === "rock"
            ? COLLECTIONS.TRACTION_ROCKS
            : COLLECTIONS.ACTION_ITEMS;

      await deleteDoc(doc(db, colName, item.id));
      toast.success("Task deleted");
      await loadTasks();
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.priority.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
    );
  }, [tasks, search]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>My Mission Critical</span>
            <span>/</span>
            <span>My Tasks</span>
            {isMasqueradingUser && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                Viewing as {viewedName}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            My Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            Action items, To-Dos, and priorities assigned to {viewedName}.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Total Assigned
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
            <div className="text-3xl font-bold">
              {tasks.filter((t) => t.status === "completed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Add Task */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Task for {viewedName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4 items-end">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Task Description</Label>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter a task or action item..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAddTask();
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Due Date</Label>
              <Input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => void handleAddTask()}
                disabled={creating || !newTaskTitle.trim()}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Tasks ({filteredTasks.length})</CardTitle>
            <CardDescription>Click status to mark a task complete or reopen it.</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search my tasks..."
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No tasks assigned to {viewedName} yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Done</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={`${task.source}-${task.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={task.status === "completed"}
                        onCheckedChange={() => void handleToggleComplete(task)}
                        aria-label={`Mark ${task.title} as done`}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={task.status === "completed" ? "default" : "outline"}
                        className="gap-1.5 capitalize"
                      >
                        {task.status === "completed" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
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
                      <Badge variant="outline" className="capitalize">
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {task.dueDate || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="uppercase text-[10px]">
                        {task.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Button
                          variant={task.status === "completed" ? "outline" : "default"}
                          size="sm"
                          onClick={() => void handleToggleComplete(task)}
                        >
                          {task.status === "completed" ? (
                            <>
                              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                              Reopen
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              Mark Done
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Task"
                          onClick={() => void handleDeleteTask(task)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
