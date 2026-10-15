"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Plus,
  CheckSquare,
  Clock,
  AlertCircle,
  Filter,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";
import { logTaskCreated, logTaskCompleted } from "@/lib/activity-logger";

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "complete";
  completed: boolean;
}

function getRelativeDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `In ${diffDays} days`;
  return date.toLocaleDateString();
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "complete">("all");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      const todosRef = collection(db, COLLECTIONS.TRACTION_TODOS);
      const todosQuery = query(todosRef, orderBy("dueDate", "asc"));
      const snapshot = await getDocs(todosQuery);

      const tasksData: TaskItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const dueDate = data.dueDate?.toDate() || new Date();
        tasksData.push({
          id: doc.id,
          title: data.description || "Task",
          description: data.notes || "",
          dueDate: getRelativeDate(dueDate),
          priority: data.priority || "medium",
          status: data.status || "pending",
          completed: data.status === "complete",
        });
      });
      setTasks(tasksData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleTaskComplete(taskId: string, currentStatus: boolean) {
    if (!db) return;

    try {
      const taskRef = doc(db, COLLECTIONS.TRACTION_TODOS, taskId);
      const newStatus = currentStatus ? "pending" : "complete";
      await updateDoc(taskRef, { status: newStatus });

      // Update local state
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed: !currentStatus, status: newStatus } : t
        )
      );

      // Log activity if completing
      if (!currentStatus) {
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          await logTaskCompleted(taskId, task.title);
        }
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  }

  async function addNewTask() {
    if (!db || !newTaskTitle.trim()) return;

    try {
      const todosRef = collection(db, COLLECTIONS.TRACTION_TODOS);
      const newTask = {
        description: newTaskTitle,
        status: "pending",
        priority: "medium",
        dueDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 1 week from now
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(todosRef, newTask);
      await logTaskCreated(docRef.id, newTaskTitle);

      setNewTaskTitle("");
      await fetchTasks();
    } catch (error) {
      console.error("Error adding task:", error);
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "pending") return !task.completed;
    if (filter === "complete") return task.completed;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            {pendingCount} pending, {completedCount} completed
          </p>
        </div>
      </div>

      {/* Quick Add */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNewTask()}
            />
            <Button onClick={addNewTask} disabled={!newTaskTitle.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All ({tasks.length})
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          Pending ({pendingCount})
        </Button>
        <Button
          variant={filter === "complete" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("complete")}
        >
          Completed ({completedCount})
        </Button>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Task List</CardTitle>
          <CardDescription>Manage your to-dos and action items</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    task.completed ? "bg-muted/50 opacity-60" : "bg-background"
                  }`}
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTaskComplete(task.id, task.completed)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className={`text-xs ${task.dueDate.includes("overdue") ? "text-destructive" : "text-muted-foreground"}`}>
                        {task.dueDate}
                      </span>
                      {task.priority === "high" && (
                        <Badge variant="destructive" className="text-xs">
                          High Priority
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filter === "all" ? "No tasks yet" : `No ${filter} tasks`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Add a task above to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
