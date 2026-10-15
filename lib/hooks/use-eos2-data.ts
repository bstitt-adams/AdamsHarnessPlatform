"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  COLLECTIONS,
  TractionRockDoc,
  TractionScorecardMetricDoc,
  TractionIssueDoc,
  TractionTodoDoc,
  TractionMeetingDoc,
  TractionTeamMemberDoc,
} from "@/lib/schema";
import {
  notifyRockCreated,
  notifyRockStatusChanged,
  notifyMetricUpdated,
  notifyIssueCreated,
  notifyIssueSolved,
  notifyTodoCreated,
  notifyTodoCompleted,
  notifyMeetingLogged,
  notifyTeamMemberAdded,
} from "@/lib/eos2-webhooks";

// Milestone type for Rocks
export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

// Client-side types (with Date instead of Timestamp)
export interface Rock {
  id: string;
  title: string;
  description: string;
  owner: string;
  ownerId: string;
  dueDate: string;
  status: "on-track" | "at-risk" | "off-track" | "complete";
  progress: number;
  quarter: string;
  milestones?: Milestone[];
  linkedIssueIds?: string[];
  linkedTodoIds?: string[];
  linkedMetricIds?: string[];
  notes?: string;
}

export interface ScorecardMetric {
  id: string;
  name: string;
  goal: number;
  actual: number;
  owner: string;
  ownerId: string;
  trend: "up" | "down" | "flat";
  unit?: string;
  linkedRockIds?: string[];
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  identifiedDate: string;
  owner: string;
  ownerId: string;
  status: "open" | "in-progress" | "solved";
  linkedRockId?: string;
  linkedTodoIds?: string[];
  meetingId?: string;
  notes?: string;
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  owner: string;
  ownerId: string;
  dueDate: string;
  status: "not-started" | "in-progress" | "complete";
  createdDate: string;
  linkedRockId?: string;
  linkedIssueId?: string;
  meetingId?: string;
}

export interface Meeting {
  id: string;
  title?: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  rating: number;
  issuesSolved: number;
  rocksReviewed: boolean;
  scorecardReviewed: boolean;
  todoCompletionRate: number;
  reviewedRockIds?: string[];
  solvedIssueIds?: string[];
  createdTodoIds?: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  category: "team" | "contractor" | "advisor" | "other";
  getsIt: boolean | null;
  wantsIt: boolean | null;
  capacityToDoIt: boolean | null;
  rightSeat: boolean | null;
}

// Convert Firestore Timestamp to date string
const timestampToDateString = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return new Date().toISOString().split("T")[0];
  return timestamp.toDate().toISOString().split("T")[0];
};

// Convert date string to Firestore Timestamp
const dateStringToTimestamp = (dateStr: string): Timestamp => {
  return Timestamp.fromDate(new Date(dateStr));
};

export function useTractionData() {
  const [rocks, setRocks] = useState<Rock[]>([]);
  const [metrics, setMetrics] = useState<ScorecardMetric[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if Firebase is configured
  const isFirebaseConfigured = !!db;

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError("Firebase not configured. Please add Firebase credentials in Settings.");
      return;
    }

    const unsubscribers: (() => void)[] = [];

    try {
      // Subscribe to Rocks
      const rocksQuery = query(
        collection(db, COLLECTIONS.TRACTION_ROCKS),
        orderBy("createdAt", "desc")
      );
      unsubscribers.push(
        onSnapshot(rocksQuery, (snapshot) => {
          const data = snapshot.docs.map((doc) => {
            const d = doc.data() as TractionRockDoc;
            return {
              id: doc.id,
              title: d.title || d.description?.substring(0, 50) || "Untitled Rock",
              description: d.description,
              owner: d.ownerName,
              ownerId: d.ownerId,
              dueDate: timestampToDateString(d.dueDate),
              status: d.status,
              progress: d.progress,
              quarter: d.quarter,
              milestones: d.milestones?.map(m => ({
                id: m.id,
                title: m.title,
                completed: m.completed,
                completedAt: m.completedAt ? timestampToDateString(m.completedAt) : undefined,
              })),
              linkedIssueIds: d.linkedIssueIds,
              linkedTodoIds: d.linkedTodoIds,
              linkedMetricIds: d.linkedMetricIds,
              notes: d.notes,
            } as Rock;
          });
          setRocks(data);
        }, (err) => {
          console.error("Error fetching rocks:", err);
        })
      );

      // Subscribe to Scorecard Metrics
      const metricsQuery = query(
        collection(db, COLLECTIONS.TRACTION_SCORECARD_METRICS),
        orderBy("createdAt", "desc")
      );
      unsubscribers.push(
        onSnapshot(metricsQuery, (snapshot) => {
          const data = snapshot.docs.map((doc) => {
            const d = doc.data() as TractionScorecardMetricDoc;
            return {
              id: doc.id,
              name: d.name,
              goal: d.goal,
              actual: d.actual,
              owner: d.ownerName,
              ownerId: d.ownerId,
              trend: d.trend,
              unit: d.unit,
              linkedRockIds: d.linkedRockIds,
            } as ScorecardMetric;
          });
          setMetrics(data);
        }, (err) => {
          console.error("Error fetching metrics:", err);
        })
      );

      // Subscribe to Issues
      const issuesQuery = query(
        collection(db, COLLECTIONS.TRACTION_ISSUES),
        orderBy("createdAt", "desc")
      );
      unsubscribers.push(
        onSnapshot(issuesQuery, (snapshot) => {
          const data = snapshot.docs.map((doc) => {
            const d = doc.data() as TractionIssueDoc;
            return {
              id: doc.id,
              title: d.title || d.description?.substring(0, 50) || "Untitled Issue",
              description: d.description,
              priority: d.priority,
              identifiedDate: timestampToDateString(d.identifiedDate),
              owner: d.ownerName,
              ownerId: d.ownerId,
              status: d.status,
              linkedRockId: d.linkedRockId,
              linkedTodoIds: d.linkedTodoIds,
              meetingId: d.meetingId,
              notes: d.notes,
            } as Issue;
          });
          setIssues(data);
        }, (err) => {
          console.error("Error fetching issues:", err);
        })
      );

      // Subscribe to Todos
      const todosQuery = query(
        collection(db, COLLECTIONS.TRACTION_TODOS),
        orderBy("createdAt", "desc")
      );
      unsubscribers.push(
        onSnapshot(todosQuery, (snapshot) => {
          const data = snapshot.docs.map((doc) => {
            const d = doc.data() as TractionTodoDoc;
            return {
              id: doc.id,
              title: d.title || d.description?.substring(0, 50) || "Untitled Todo",
              description: d.description,
              owner: d.ownerName,
              ownerId: d.ownerId,
              dueDate: timestampToDateString(d.dueDate),
              status: d.status,
              createdDate: timestampToDateString(d.createdAt),
              linkedRockId: d.linkedRockId,
              linkedIssueId: d.linkedIssueId,
              meetingId: d.meetingId,
            } as Todo;
          });
          setTodos(data);
        }, (err) => {
          console.error("Error fetching todos:", err);
        })
      );

      // Subscribe to Meetings
      const meetingsQuery = query(
        collection(db, COLLECTIONS.TRACTION_MEETINGS),
        orderBy("date", "desc")
      );
      unsubscribers.push(
        onSnapshot(meetingsQuery, (snapshot) => {
          const data = snapshot.docs.map((doc) => {
            const d = doc.data() as TractionMeetingDoc;
            return {
              id: doc.id,
              title: d.title,
              date: timestampToDateString(d.date),
              startTime: d.startTime,
              endTime: d.endTime,
              attendees: d.attendeeNames,
              rating: d.rating,
              issuesSolved: d.issuesSolved,
              rocksReviewed: d.rocksReviewed,
              scorecardReviewed: d.scorecardReviewed,
              todoCompletionRate: d.todoCompletionRate,
              reviewedRockIds: d.reviewedRockIds,
              solvedIssueIds: d.solvedIssueIds,
              createdTodoIds: d.createdTodoIds,
            } as Meeting;
          });
          setMeetings(data);
        }, (err) => {
          console.error("Error fetching meetings:", err);
        })
      );

      // Subscribe to Team Members
      const teamQuery = query(
        collection(db, COLLECTIONS.TRACTION_TEAM_MEMBERS),
        orderBy("name", "asc")
      );
      unsubscribers.push(
        onSnapshot(teamQuery, (snapshot) => {
          const data = snapshot.docs.map((doc) => {
            const d = doc.data() as TractionTeamMemberDoc;
            return {
              id: doc.id,
              name: d.name,
              role: d.role,
              category: d.category,
              getsIt: d.getsIt,
              wantsIt: d.wantsIt,
              capacityToDoIt: d.capacityToDoIt,
              rightSeat: d.rightSeat,
            } as TeamMember;
          });
          setTeam(data);
          setLoading(false);
        }, (err) => {
          console.error("Error fetching team:", err);
          setLoading(false);
        })
      );
    } catch (err) {
      console.error("Error setting up listeners:", err);
      setError("Failed to connect to database");
      setLoading(false);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  // CRUD Operations for Rocks
  const addRock = useCallback(async (rock: Omit<Rock, "id">) => {
    if (!db) return;
    const now = Timestamp.now();
    await addDoc(collection(db, COLLECTIONS.TRACTION_ROCKS), {
      title: rock.title,
      description: rock.description,
      ownerId: rock.ownerId || "",
      ownerName: rock.owner,
      dueDate: rock.dueDate ? dateStringToTimestamp(rock.dueDate) : now,
      status: rock.status,
      progress: rock.progress,
      quarter: rock.quarter,
      milestones: rock.milestones?.map(m => ({
        id: m.id,
        title: m.title,
        completed: m.completed,
        completedAt: m.completedAt ? dateStringToTimestamp(m.completedAt) : undefined,
      })),
      linkedIssueIds: rock.linkedIssueIds,
      linkedTodoIds: rock.linkedTodoIds,
      linkedMetricIds: rock.linkedMetricIds,
      notes: rock.notes,
      createdAt: now,
      updatedAt: now,
    } as Omit<TractionRockDoc, "id">);
    
    // Send webhook notification
    notifyRockCreated({
      description: rock.title || rock.description,
      owner: rock.owner,
      quarter: rock.quarter,
      dueDate: rock.dueDate,
      status: rock.status,
      progress: rock.progress,
    });
  }, []);

  const updateRock = useCallback(async (id: string, rock: Partial<Rock>, previousStatus?: string) => {
    if (!db) return;
    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (rock.title !== undefined) updateData.title = rock.title;
    if (rock.description !== undefined) updateData.description = rock.description;
    if (rock.owner !== undefined) updateData.ownerName = rock.owner;
    if (rock.ownerId !== undefined) updateData.ownerId = rock.ownerId;
    if (rock.dueDate !== undefined) updateData.dueDate = dateStringToTimestamp(rock.dueDate);
    if (rock.status !== undefined) updateData.status = rock.status;
    if (rock.progress !== undefined) updateData.progress = rock.progress;
    if (rock.quarter !== undefined) updateData.quarter = rock.quarter;
    if (rock.milestones !== undefined) {
      updateData.milestones = rock.milestones.map(m => ({
        id: m.id,
        title: m.title,
        completed: m.completed,
        completedAt: m.completedAt ? dateStringToTimestamp(m.completedAt) : undefined,
      }));
    }
    if (rock.linkedIssueIds !== undefined) updateData.linkedIssueIds = rock.linkedIssueIds;
    if (rock.linkedTodoIds !== undefined) updateData.linkedTodoIds = rock.linkedTodoIds;
    if (rock.linkedMetricIds !== undefined) updateData.linkedMetricIds = rock.linkedMetricIds;
    if (rock.notes !== undefined) updateData.notes = rock.notes;
    await updateDoc(doc(db, COLLECTIONS.TRACTION_ROCKS, id), updateData);
    
    // Send webhook notification if status changed
    if (rock.status && previousStatus && rock.status !== previousStatus) {
      const existingRock = rocks.find(r => r.id === id);
      if (existingRock) {
        notifyRockStatusChanged({
          description: rock.title || rock.description || existingRock.description,
          owner: rock.owner || existingRock.owner,
          quarter: rock.quarter || existingRock.quarter,
          dueDate: rock.dueDate || existingRock.dueDate,
          status: rock.status,
          progress: rock.progress ?? existingRock.progress,
        }, previousStatus);
      }
    }
  }, [rocks]);

  const deleteRock = useCallback(async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.TRACTION_ROCKS, id));
  }, []);

  // CRUD Operations for Metrics
  const addMetric = useCallback(async (metric: Omit<ScorecardMetric, "id">) => {
    if (!db) return;
    const now = Timestamp.now();
    await addDoc(collection(db, COLLECTIONS.TRACTION_SCORECARD_METRICS), {
      name: metric.name,
      goal: metric.goal,
      actual: metric.actual,
      ownerId: metric.ownerId || "",
      ownerName: metric.owner,
      trend: metric.trend,
      unit: metric.unit || "",
      createdAt: now,
      updatedAt: now,
    } as Omit<TractionScorecardMetricDoc, "id">);
    
    // Send webhook notification if below goal
    if (metric.actual < metric.goal) {
      notifyMetricUpdated({
        name: metric.name,
        owner: metric.owner,
        goal: metric.goal,
        actual: metric.actual,
        unit: metric.unit,
        trend: metric.trend,
      });
    }
  }, []);

  const updateMetric = useCallback(async (id: string, metric: Partial<ScorecardMetric>) => {
    if (!db) return;
    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (metric.name !== undefined) updateData.name = metric.name;
    if (metric.goal !== undefined) updateData.goal = metric.goal;
    if (metric.actual !== undefined) updateData.actual = metric.actual;
    if (metric.owner !== undefined) updateData.ownerName = metric.owner;
    if (metric.ownerId !== undefined) updateData.ownerId = metric.ownerId;
    if (metric.trend !== undefined) updateData.trend = metric.trend;
    if (metric.unit !== undefined) updateData.unit = metric.unit;
    await updateDoc(doc(db, COLLECTIONS.TRACTION_SCORECARD_METRICS, id), updateData);
    
    // Send webhook notification if actual value changed
    if (metric.actual !== undefined) {
      const existingMetric = metrics.find(m => m.id === id);
      if (existingMetric) {
        const goal = metric.goal ?? existingMetric.goal;
        const actual = metric.actual;
        if (actual < goal) {
          notifyMetricUpdated({
            name: metric.name || existingMetric.name,
            owner: metric.owner || existingMetric.owner,
            goal,
            actual,
            unit: metric.unit || existingMetric.unit,
            trend: metric.trend || existingMetric.trend,
          });
        }
      }
    }
  }, [metrics]);

  const deleteMetric = useCallback(async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.TRACTION_SCORECARD_METRICS, id));
  }, []);

  // CRUD Operations for Issues
  const addIssue = useCallback(async (issue: Omit<Issue, "id">) => {
    if (!db) return;
    const now = Timestamp.now();
    await addDoc(collection(db, COLLECTIONS.TRACTION_ISSUES), {
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      identifiedDate: dateStringToTimestamp(issue.identifiedDate),
      ownerId: issue.ownerId || "",
      ownerName: issue.owner,
      status: issue.status,
      linkedRockId: issue.linkedRockId,
      linkedTodoIds: issue.linkedTodoIds,
      meetingId: issue.meetingId,
      notes: issue.notes,
      createdAt: now,
      updatedAt: now,
    } as Omit<TractionIssueDoc, "id">);
    
    // Send webhook notification
    notifyIssueCreated({
      description: issue.title || issue.description,
      owner: issue.owner,
      priority: issue.priority,
      identifiedDate: issue.identifiedDate,
    });
  }, []);

  const updateIssue = useCallback(async (id: string, issue: Partial<Issue>) => {
    if (!db) return;
    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (issue.title !== undefined) updateData.title = issue.title;
    if (issue.description !== undefined) updateData.description = issue.description;
    if (issue.priority !== undefined) updateData.priority = issue.priority;
    if (issue.identifiedDate !== undefined) updateData.identifiedDate = dateStringToTimestamp(issue.identifiedDate);
    if (issue.owner !== undefined) updateData.ownerName = issue.owner;
    if (issue.ownerId !== undefined) updateData.ownerId = issue.ownerId;
    if (issue.linkedRockId !== undefined) updateData.linkedRockId = issue.linkedRockId;
    if (issue.linkedTodoIds !== undefined) updateData.linkedTodoIds = issue.linkedTodoIds;
    if (issue.meetingId !== undefined) updateData.meetingId = issue.meetingId;
    if (issue.notes !== undefined) updateData.notes = issue.notes;
    if (issue.status !== undefined) {
      updateData.status = issue.status;
      if (issue.status === "solved") {
        updateData.solvedDate = Timestamp.now();
        // Send webhook notification for solved issue
        const existingIssue = issues.find(i => i.id === id);
        if (existingIssue) {
          notifyIssueSolved({
            description: issue.title || issue.description || existingIssue.description,
            owner: issue.owner || existingIssue.owner,
            priority: issue.priority || existingIssue.priority,
            identifiedDate: issue.identifiedDate || existingIssue.identifiedDate,
          });
        }
      }
    }
    await updateDoc(doc(db, COLLECTIONS.TRACTION_ISSUES, id), updateData);
  }, [issues]);

  const deleteIssue = useCallback(async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.TRACTION_ISSUES, id));
  }, []);

  // CRUD Operations for Todos
  const addTodo = useCallback(async (todo: Omit<Todo, "id">) => {
    if (!db) return;
    const now = Timestamp.now();
    await addDoc(collection(db, COLLECTIONS.TRACTION_TODOS), {
      title: todo.title,
      description: todo.description,
      ownerId: todo.ownerId || "",
      ownerName: todo.owner,
      dueDate: todo.dueDate ? dateStringToTimestamp(todo.dueDate) : now,
      status: todo.status,
      linkedRockId: todo.linkedRockId,
      linkedIssueId: todo.linkedIssueId,
      meetingId: todo.meetingId,
      createdAt: now,
      updatedAt: now,
    } as Omit<TractionTodoDoc, "id">);
    
    // Send webhook notification
    notifyTodoCreated({
      description: todo.title || todo.description,
      owner: todo.owner,
      dueDate: todo.dueDate,
    });
  }, []);

  const updateTodo = useCallback(async (id: string, todo: Partial<Todo>) => {
    if (!db) return;
    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (todo.title !== undefined) updateData.title = todo.title;
    if (todo.description !== undefined) updateData.description = todo.description;
    if (todo.owner !== undefined) updateData.ownerName = todo.owner;
    if (todo.ownerId !== undefined) updateData.ownerId = todo.ownerId;
    if (todo.dueDate !== undefined) updateData.dueDate = dateStringToTimestamp(todo.dueDate);
    if (todo.linkedRockId !== undefined) updateData.linkedRockId = todo.linkedRockId;
    if (todo.linkedIssueId !== undefined) updateData.linkedIssueId = todo.linkedIssueId;
    if (todo.meetingId !== undefined) updateData.meetingId = todo.meetingId;
    if (todo.status !== undefined) {
      updateData.status = todo.status;
      if (todo.status === "complete") {
        updateData.completedDate = Timestamp.now();
        // Send webhook notification for completed todo
        const existingTodo = todos.find(t => t.id === id);
        if (existingTodo) {
          notifyTodoCompleted({
            description: todo.title || todo.description || existingTodo.description,
            owner: todo.owner || existingTodo.owner,
            dueDate: todo.dueDate || existingTodo.dueDate,
          });
        }
      }
    }
    await updateDoc(doc(db, COLLECTIONS.TRACTION_TODOS, id), updateData);
  }, [todos]);

  const deleteTodo = useCallback(async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.TRACTION_TODOS, id));
  }, []);

  // CRUD Operations for Meetings
  const addMeeting = useCallback(async (meeting: Omit<Meeting, "id">) => {
    if (!db) return;
    const now = Timestamp.now();
    await addDoc(collection(db, COLLECTIONS.TRACTION_MEETINGS), {
      date: dateStringToTimestamp(meeting.date),
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      attendeeIds: [],
      attendeeNames: meeting.attendees,
      rating: meeting.rating,
      issuesSolved: meeting.issuesSolved,
      rocksReviewed: meeting.rocksReviewed,
      scorecardReviewed: meeting.scorecardReviewed,
      todoCompletionRate: meeting.todoCompletionRate,
      createdAt: now,
      updatedAt: now,
    } as Omit<TractionMeetingDoc, "id">);
    
    // Send webhook notification
    notifyMeetingLogged({
      date: meeting.date,
      rating: meeting.rating,
      issuesSolved: meeting.issuesSolved,
      todoCompletionRate: meeting.todoCompletionRate,
      rocksReviewed: meeting.rocksReviewed,
      scorecardReviewed: meeting.scorecardReviewed,
    });
  }, []);

  const updateMeeting = useCallback(async (id: string, meeting: Partial<Meeting>) => {
    if (!db) return;
    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (meeting.date !== undefined) updateData.date = dateStringToTimestamp(meeting.date);
    if (meeting.startTime !== undefined) updateData.startTime = meeting.startTime;
    if (meeting.endTime !== undefined) updateData.endTime = meeting.endTime;
    if (meeting.attendees !== undefined) updateData.attendeeNames = meeting.attendees;
    if (meeting.rating !== undefined) updateData.rating = meeting.rating;
    if (meeting.issuesSolved !== undefined) updateData.issuesSolved = meeting.issuesSolved;
    if (meeting.rocksReviewed !== undefined) updateData.rocksReviewed = meeting.rocksReviewed;
    if (meeting.scorecardReviewed !== undefined) updateData.scorecardReviewed = meeting.scorecardReviewed;
    if (meeting.todoCompletionRate !== undefined) updateData.todoCompletionRate = meeting.todoCompletionRate;
    await updateDoc(doc(db, COLLECTIONS.TRACTION_MEETINGS, id), updateData);
  }, []);

  const deleteMeeting = useCallback(async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.TRACTION_MEETINGS, id));
  }, []);

  // CRUD Operations for Team Members
  const addTeamMember = useCallback(async (member: Omit<TeamMember, "id">) => {
    if (!db) return;
    const now = Timestamp.now();
    await addDoc(collection(db, COLLECTIONS.TRACTION_TEAM_MEMBERS), {
      name: member.name,
      role: member.role,
      category: member.category,
      getsIt: member.getsIt,
      wantsIt: member.wantsIt,
      capacityToDoIt: member.capacityToDoIt,
      rightSeat: member.rightSeat,
      createdAt: now,
      updatedAt: now,
    } as Omit<TractionTeamMemberDoc, "id">);
    
    // Send webhook notification
    notifyTeamMemberAdded({
      name: member.name,
      role: member.role,
      category: member.category,
    });
  }, []);

  const updateTeamMember = useCallback(async (id: string, member: Partial<TeamMember>) => {
    if (!db) return;
    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (member.name !== undefined) updateData.name = member.name;
    if (member.role !== undefined) updateData.role = member.role;
    if (member.category !== undefined) updateData.category = member.category;
    if (member.getsIt !== undefined) updateData.getsIt = member.getsIt;
    if (member.wantsIt !== undefined) updateData.wantsIt = member.wantsIt;
    if (member.capacityToDoIt !== undefined) updateData.capacityToDoIt = member.capacityToDoIt;
    if (member.rightSeat !== undefined) updateData.rightSeat = member.rightSeat;
    await updateDoc(doc(db, COLLECTIONS.TRACTION_TEAM_MEMBERS, id), updateData);
  }, []);

  const deleteTeamMember = useCallback(async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.TRACTION_TEAM_MEMBERS, id));
  }, []);

  return {
    // Data
    rocks,
    metrics,
    issues,
    todos,
    meetings,
    team,
    loading,
    error,
    isFirebaseConfigured,
    // Rock operations
    addRock,
    updateRock,
    deleteRock,
    // Metric operations
    addMetric,
    updateMetric,
    deleteMetric,
    // Issue operations
    addIssue,
    updateIssue,
    deleteIssue,
    // Todo operations
    addTodo,
    updateTodo,
    deleteTodo,
    // Meeting operations
    addMeeting,
    updateMeeting,
    deleteMeeting,
    // Team member operations
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
  };
}
