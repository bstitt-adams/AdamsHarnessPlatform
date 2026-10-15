/**
 * Traction Scheduled Checks API
 * 
 * This endpoint runs scheduled checks for Traction entities and sends
 * notifications for:
 * - Overdue To-Dos
 * - At-Risk/Off-Track Rocks
 * - Metrics Below Goal
 * 
 * Can be triggered by:
 * - Vercel Cron Jobs
 * - External scheduler (e.g., GitHub Actions)
 * - Manual trigger from admin panel
 */

import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";
import {
  notifyTodoOverdue,
  notifyRockStatusChanged,
  notifyMetricBelowGoal,
  TractionTodoData,
  TractionRockData,
  TractionMetricData,
} from "@/lib/eos2-webhooks";

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

interface CheckResult {
  type: string;
  count: number;
  items: string[];
}

/**
 * Check for overdue to-dos and send notifications
 */
async function checkOverdueTodos(): Promise<CheckResult> {
  if (!db) return { type: "overdue_todos", count: 0, items: [] };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todosQuery = query(
    collection(db, COLLECTIONS.TRACTION_TODOS),
    where("status", "!=", "complete")
  );

  const snapshot = await getDocs(todosQuery);
  const overdueTodos: string[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const dueDate = (data.dueDate as Timestamp).toDate();
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      const daysOverdue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const todoData: TractionTodoData = {
        description: data.description,
        owner: data.ownerName,
        dueDate: dueDate.toISOString().split("T")[0],
        status: data.status,
        daysOverdue,
      };

      await notifyTodoOverdue(todoData);
      overdueTodos.push(`${data.description} (${daysOverdue} days overdue)`);
    }
  }

  return {
    type: "overdue_todos",
    count: overdueTodos.length,
    items: overdueTodos,
  };
}

/**
 * Check for at-risk and off-track rocks and send notifications
 */
async function checkAtRiskRocks(): Promise<CheckResult> {
  if (!db) return { type: "at_risk_rocks", count: 0, items: [] };

  const rocksQuery = query(
    collection(db, COLLECTIONS.TRACTION_ROCKS),
    where("status", "in", ["at-risk", "off-track"])
  );

  const snapshot = await getDocs(rocksQuery);
  const atRiskRocks: string[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const dueDate = (data.dueDate as Timestamp).toDate();

    const rockData: TractionRockData = {
      description: data.description,
      owner: data.ownerName,
      quarter: data.quarter,
      dueDate: dueDate.toISOString().split("T")[0],
      status: data.status,
      progress: data.progress,
    };

    // Send notification (the function will determine the right event type)
    await notifyRockStatusChanged(rockData, data.status);
    atRiskRocks.push(`${data.description} (${data.status}, ${data.progress}%)`);
  }

  return {
    type: "at_risk_rocks",
    count: atRiskRocks.length,
    items: atRiskRocks,
  };
}

/**
 * Check for metrics below goal and send notifications
 */
async function checkMetricsBelowGoal(): Promise<CheckResult> {
  if (!db) return { type: "metrics_below_goal", count: 0, items: [] };

  const metricsQuery = query(collection(db, COLLECTIONS.TRACTION_SCORECARD_METRICS));
  const snapshot = await getDocs(metricsQuery);
  const belowGoalMetrics: string[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.actual < data.goal) {
      const metricData: TractionMetricData = {
        name: data.name,
        owner: data.ownerName,
        goal: data.goal,
        actual: data.actual,
        unit: data.unit,
        trend: data.trend,
      };

      await notifyMetricBelowGoal(metricData);
      const gap = data.goal - data.actual;
      belowGoalMetrics.push(
        `${data.name}: ${data.unit || ""}${data.actual} / ${data.unit || ""}${data.goal} (gap: ${data.unit || ""}${gap})`
      );
    }
  }

  return {
    type: "metrics_below_goal",
    count: belowGoalMetrics.length,
    items: belowGoalMetrics,
  };
}

/**
 * GET handler for scheduled checks
 * Supports query params:
 * - check: "all" | "todos" | "rocks" | "metrics"
 */
export async function GET(request: NextRequest) {
  // Verify authorization for cron jobs
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const checkType = searchParams.get("check") || "all";

  try {
    const results: CheckResult[] = [];
    const startTime = Date.now();

    if (checkType === "all" || checkType === "todos") {
      results.push(await checkOverdueTodos());
    }

    if (checkType === "all" || checkType === "rocks") {
      results.push(await checkAtRiskRocks());
    }

    if (checkType === "all" || checkType === "metrics") {
      results.push(await checkMetricsBelowGoal());
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results,
      summary: {
        totalNotifications: results.reduce((sum, r) => sum + r.count, 0),
        checks: results.map((r) => ({ type: r.type, count: r.count })),
      },
    });
  } catch (error) {
    console.error("Scheduled check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for manual trigger with specific options
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { checks = ["all"] } = body;

    const results: CheckResult[] = [];
    const startTime = Date.now();

    if (checks.includes("all") || checks.includes("todos")) {
      results.push(await checkOverdueTodos());
    }

    if (checks.includes("all") || checks.includes("rocks")) {
      results.push(await checkAtRiskRocks());
    }

    if (checks.includes("all") || checks.includes("metrics")) {
      results.push(await checkMetricsBelowGoal());
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results,
      summary: {
        totalNotifications: results.reduce((sum, r) => sum + r.count, 0),
        checks: results.map((r) => ({ type: r.type, count: r.count })),
      },
    });
  } catch (error) {
    console.error("Scheduled check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
