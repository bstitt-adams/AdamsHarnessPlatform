/**
 * Traction Embed API
 * 
 * Public API endpoint for embeddable Traction widgets
 * Provides read-only access to Traction data for external embedding
 * 
 * Supports:
 * - Scorecard widget data
 * - Rocks progress widget data
 * - Overall health widget data
 * - Combined dashboard data
 */

import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";

// CORS headers for embed access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Widget types
type WidgetType = "scorecard" | "rocks" | "health" | "issues" | "todos" | "dashboard";

interface ScorecardWidgetData {
  metrics: {
    name: string;
    goal: number;
    actual: number;
    unit?: string;
    trend: string;
    status: "above" | "at" | "below";
  }[];
  summary: {
    total: number;
    aboveGoal: number;
    atGoal: number;
    belowGoal: number;
    healthPercent: number;
  };
}

interface RocksWidgetData {
  rocks: {
    description: string;
    owner: string;
    status: string;
    progress: number;
    quarter: string;
  }[];
  summary: {
    total: number;
    onTrack: number;
    atRisk: number;
    offTrack: number;
    complete: number;
    avgProgress: number;
    healthPercent: number;
  };
}

interface HealthWidgetData {
  overall: number;
  rocks: number;
  scorecard: number;
  issues: number;
  todos: number;
  trend: "up" | "down" | "flat";
}

interface IssuesWidgetData {
  issues: {
    description: string;
    owner: string;
    priority: string;
    status: string;
    daysOpen: number;
  }[];
  summary: {
    total: number;
    open: number;
    inProgress: number;
    solved: number;
    highPriority: number;
  };
}

interface TodosWidgetData {
  todos: {
    description: string;
    owner: string;
    dueDate: string;
    status: string;
    isOverdue: boolean;
  }[];
  summary: {
    total: number;
    complete: number;
    pending: number;
    overdue: number;
    completionRate: number;
  };
}

interface DashboardWidgetData {
  health: HealthWidgetData;
  rocks: RocksWidgetData["summary"];
  scorecard: ScorecardWidgetData["summary"];
  issues: IssuesWidgetData["summary"];
  todos: TodosWidgetData["summary"];
  lastUpdated: string;
}

async function getScorecardData(): Promise<ScorecardWidgetData> {
  const data: ScorecardWidgetData = {
    metrics: [],
    summary: { total: 0, aboveGoal: 0, atGoal: 0, belowGoal: 0, healthPercent: 0 },
  };

  if (!db) return data;

  const snapshot = await getDocs(collection(db, COLLECTIONS.TRACTION_SCORECARD_METRICS));
  
  snapshot.forEach((doc) => {
    const d = doc.data();
    const status = d.actual > d.goal ? "above" : d.actual === d.goal ? "at" : "below";
    
    data.metrics.push({
      name: d.name,
      goal: d.goal,
      actual: d.actual,
      unit: d.unit,
      trend: d.trend,
      status,
    });

    data.summary.total++;
    if (status === "above") data.summary.aboveGoal++;
    else if (status === "at") data.summary.atGoal++;
    else data.summary.belowGoal++;
  });

  data.summary.healthPercent = data.summary.total > 0
    ? Math.round(((data.summary.aboveGoal + data.summary.atGoal) / data.summary.total) * 100)
    : 0;

  return data;
}

async function getRocksData(): Promise<RocksWidgetData> {
  const data: RocksWidgetData = {
    rocks: [],
    summary: { total: 0, onTrack: 0, atRisk: 0, offTrack: 0, complete: 0, avgProgress: 0, healthPercent: 0 },
  };

  if (!db) return data;

  const snapshot = await getDocs(collection(db, COLLECTIONS.TRACTION_ROCKS));
  let totalProgress = 0;

  snapshot.forEach((doc) => {
    const d = doc.data();
    
    data.rocks.push({
      description: d.description,
      owner: d.ownerName,
      status: d.status,
      progress: d.progress,
      quarter: d.quarter,
    });

    data.summary.total++;
    totalProgress += d.progress || 0;
    
    switch (d.status) {
      case "on-track": data.summary.onTrack++; break;
      case "at-risk": data.summary.atRisk++; break;
      case "off-track": data.summary.offTrack++; break;
      case "complete": data.summary.complete++; break;
    }
  });

  data.summary.avgProgress = data.summary.total > 0
    ? Math.round(totalProgress / data.summary.total)
    : 0;

  data.summary.healthPercent = data.summary.total > 0
    ? Math.round(((data.summary.onTrack + data.summary.complete) / data.summary.total) * 100)
    : 0;

  return data;
}

async function getIssuesData(): Promise<IssuesWidgetData> {
  const data: IssuesWidgetData = {
    issues: [],
    summary: { total: 0, open: 0, inProgress: 0, solved: 0, highPriority: 0 },
  };

  if (!db) return data;

  const today = new Date();
  const snapshot = await getDocs(collection(db, COLLECTIONS.TRACTION_ISSUES));

  snapshot.forEach((doc) => {
    const d = doc.data();
    const identifiedDate = (d.identifiedDate as Timestamp).toDate();
    const daysOpen = Math.floor((today.getTime() - identifiedDate.getTime()) / (1000 * 60 * 60 * 24));

    data.issues.push({
      description: d.description,
      owner: d.ownerName,
      priority: d.priority,
      status: d.status,
      daysOpen,
    });

    data.summary.total++;
    switch (d.status) {
      case "open": data.summary.open++; break;
      case "in-progress": data.summary.inProgress++; break;
      case "solved": data.summary.solved++; break;
    }
    if (d.priority === "high" && d.status !== "solved") {
      data.summary.highPriority++;
    }
  });

  return data;
}

async function getTodosData(): Promise<TodosWidgetData> {
  const data: TodosWidgetData = {
    todos: [],
    summary: { total: 0, complete: 0, pending: 0, overdue: 0, completionRate: 0 },
  };

  if (!db) return data;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const snapshot = await getDocs(collection(db, COLLECTIONS.TRACTION_TODOS));

  snapshot.forEach((doc) => {
    const d = doc.data();
    const dueDate = (d.dueDate as Timestamp).toDate();
    const isOverdue = d.status !== "complete" && dueDate < today;

    data.todos.push({
      description: d.description,
      owner: d.ownerName,
      dueDate: dueDate.toISOString().split("T")[0],
      status: d.status,
      isOverdue,
    });

    data.summary.total++;
    if (d.status === "complete") {
      data.summary.complete++;
    } else {
      data.summary.pending++;
      if (isOverdue) data.summary.overdue++;
    }
  });

  data.summary.completionRate = data.summary.total > 0
    ? Math.round((data.summary.complete / data.summary.total) * 100)
    : 0;

  return data;
}

async function getHealthData(): Promise<HealthWidgetData> {
  const [rocks, scorecard, issues, todos] = await Promise.all([
    getRocksData(),
    getScorecardData(),
    getIssuesData(),
    getTodosData(),
  ]);

  const rocksHealth = rocks.summary.healthPercent;
  const scorecardHealth = scorecard.summary.healthPercent;
  const issuesHealth = issues.summary.total > 0
    ? Math.round((issues.summary.solved / issues.summary.total) * 100)
    : 100;
  const todosHealth = todos.summary.completionRate;

  const overall = Math.round((rocksHealth + scorecardHealth + issuesHealth + todosHealth) / 4);

  return {
    overall,
    rocks: rocksHealth,
    scorecard: scorecardHealth,
    issues: issuesHealth,
    todos: todosHealth,
    trend: overall >= 70 ? "up" : overall >= 50 ? "flat" : "down",
  };
}

async function getDashboardData(): Promise<DashboardWidgetData> {
  const [health, rocks, scorecard, issues, todos] = await Promise.all([
    getHealthData(),
    getRocksData(),
    getScorecardData(),
    getIssuesData(),
    getTodosData(),
  ]);

  return {
    health,
    rocks: rocks.summary,
    scorecard: scorecard.summary,
    issues: issues.summary,
    todos: todos.summary,
    lastUpdated: new Date().toISOString(),
  };
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const widget = (searchParams.get("widget") || "dashboard") as WidgetType;
  const format = searchParams.get("format") || "json";

  try {
    let data: unknown;

    switch (widget) {
      case "scorecard":
        data = await getScorecardData();
        break;
      case "rocks":
        data = await getRocksData();
        break;
      case "health":
        data = await getHealthData();
        break;
      case "issues":
        data = await getIssuesData();
        break;
      case "todos":
        data = await getTodosData();
        break;
      case "dashboard":
      default:
        data = await getDashboardData();
        break;
    }

    // Return as JSONP if callback specified
    const callback = searchParams.get("callback");
    if (callback && format === "jsonp") {
      const jsonpResponse = `${callback}(${JSON.stringify(data)})`;
      return new NextResponse(jsonpResponse, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/javascript",
        },
      });
    }

    return NextResponse.json(
      { success: true, widget, data, timestamp: new Date().toISOString() },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Embed API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
