/**
 * Traction Weekly Digest API
 * 
 * Generates and sends a weekly summary of Traction/EOS status to Mattermost
 * Includes:
 * - Rock progress summary
 * - Scorecard health
 * - Open issues count
 * - To-do completion rate
 * - Level 10 meeting stats
 */

import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, where, Timestamp, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";
import { sendToMattermost } from "@/lib/mattermost";
import { doc, getDoc } from "firebase/firestore";

const CRON_SECRET = process.env.CRON_SECRET;

interface DigestData {
  rocks: {
    total: number;
    onTrack: number;
    atRisk: number;
    offTrack: number;
    complete: number;
    avgProgress: number;
  };
  scorecard: {
    total: number;
    aboveGoal: number;
    belowGoal: number;
    atGoal: number;
  };
  issues: {
    total: number;
    open: number;
    inProgress: number;
    solved: number;
    highPriority: number;
  };
  todos: {
    total: number;
    complete: number;
    overdue: number;
    completionRate: number;
  };
  meetings: {
    lastMeetingDate: string | null;
    lastMeetingRating: number | null;
    avgRating: number;
    totalMeetings: number;
  };
  team: {
    total: number;
    rightSeat: number;
    needsReview: number;
  };
}

async function gatherDigestData(): Promise<DigestData> {
  const digest: DigestData = {
    rocks: { total: 0, onTrack: 0, atRisk: 0, offTrack: 0, complete: 0, avgProgress: 0 },
    scorecard: { total: 0, aboveGoal: 0, belowGoal: 0, atGoal: 0 },
    issues: { total: 0, open: 0, inProgress: 0, solved: 0, highPriority: 0 },
    todos: { total: 0, complete: 0, overdue: 0, completionRate: 0 },
    meetings: { lastMeetingDate: null, lastMeetingRating: null, avgRating: 0, totalMeetings: 0 },
    team: { total: 0, rightSeat: 0, needsReview: 0 },
  };

  if (!db) return digest;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Gather Rocks data
  const rocksSnapshot = await getDocs(collection(db, COLLECTIONS.TRACTION_ROCKS));
  let totalProgress = 0;
  rocksSnapshot.forEach((doc) => {
    const data = doc.data();
    digest.rocks.total++;
    totalProgress += data.progress || 0;
    switch (data.status) {
      case "on-track": digest.rocks.onTrack++; break;
      case "at-risk": digest.rocks.atRisk++; break;
      case "off-track": digest.rocks.offTrack++; break;
      case "complete": digest.rocks.complete++; break;
    }
  });
  digest.rocks.avgProgress = digest.rocks.total > 0 ? Math.round(totalProgress / digest.rocks.total) : 0;

  // Gather Scorecard data
  const metricsSnapshot = await getDocs(collection(db, COLLECTIONS.TRACTION_SCORECARD_METRICS));
  metricsSnapshot.forEach((doc) => {
    const data = doc.data();
    digest.scorecard.total++;
    if (data.actual > data.goal) digest.scorecard.aboveGoal++;
    else if (data.actual < data.goal) digest.scorecard.belowGoal++;
    else digest.scorecard.atGoal++;
  });

  // Gather Issues data
  const issuesSnapshot = await getDocs(collection(db, COLLECTIONS.TRACTION_ISSUES));
  issuesSnapshot.forEach((doc) => {
    const data = doc.data();
    digest.issues.total++;
    switch (data.status) {
      case "open": digest.issues.open++; break;
      case "in-progress": digest.issues.inProgress++; break;
      case "solved": digest.issues.solved++; break;
    }
    if (data.priority === "high" && data.status !== "solved") {
      digest.issues.highPriority++;
    }
  });

  // Gather Todos data
  const todosSnapshot = await getDocs(collection(db, COLLECTIONS.TRACTION_TODOS));
  todosSnapshot.forEach((doc) => {
    const data = doc.data();
    digest.todos.total++;
    if (data.status === "complete") {
      digest.todos.complete++;
    } else {
      const dueDate = (data.dueDate as Timestamp).toDate();
      if (dueDate < today) {
        digest.todos.overdue++;
      }
    }
  });
  digest.todos.completionRate = digest.todos.total > 0 
    ? Math.round((digest.todos.complete / digest.todos.total) * 100) 
    : 0;

  // Gather Meetings data
  const meetingsQuery = query(
    collection(db, COLLECTIONS.TRACTION_MEETINGS),
    orderBy("date", "desc"),
    limit(10)
  );
  const meetingsSnapshot = await getDocs(meetingsQuery);
  let totalRating = 0;
  const meetingDocs = meetingsSnapshot.docs;
  meetingDocs.forEach((docSnapshot, index) => {
    const data = docSnapshot.data();
    digest.meetings.totalMeetings++;
    totalRating += data.rating || 0;
    if (index === 0) {
      digest.meetings.lastMeetingDate = (data.date as Timestamp).toDate().toLocaleDateString();
      digest.meetings.lastMeetingRating = data.rating;
    }
  });
  digest.meetings.avgRating = digest.meetings.totalMeetings > 0 
    ? Math.round((totalRating / digest.meetings.totalMeetings) * 10) / 10 
    : 0;

  // Gather Team data
  const teamSnapshot = await getDocs(collection(db, COLLECTIONS.TRACTION_TEAM_MEMBERS));
  teamSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.category === "team") {
      digest.team.total++;
      if (data.rightSeat === true) {
        digest.team.rightSeat++;
      }
      if (data.getsIt === false || data.wantsIt === false || data.capacityToDoIt === false) {
        digest.team.needsReview++;
      }
    }
  });

  return digest;
}

function formatDigestMessage(digest: DigestData): string {
  const rockHealth = digest.rocks.total > 0 
    ? Math.round(((digest.rocks.onTrack + digest.rocks.complete) / digest.rocks.total) * 100) 
    : 0;
  const scorecardHealth = digest.scorecard.total > 0 
    ? Math.round(((digest.scorecard.aboveGoal + digest.scorecard.atGoal) / digest.scorecard.total) * 100) 
    : 0;

  const rockEmoji = rockHealth >= 80 ? "🟢" : rockHealth >= 60 ? "🟡" : "🔴";
  const scorecardEmoji = scorecardHealth >= 80 ? "🟢" : scorecardHealth >= 60 ? "🟡" : "🔴";
  const todoEmoji = digest.todos.completionRate >= 80 ? "🟢" : digest.todos.completionRate >= 60 ? "🟡" : "🔴";

  return `### 📊 Weekly Traction Digest

**Week of ${new Date().toLocaleDateString()}**

---

#### 🏔️ Rocks ${rockEmoji}
| Status | Count |
|--------|-------|
| ✅ Complete | ${digest.rocks.complete} |
| 🟢 On Track | ${digest.rocks.onTrack} |
| 🟡 At Risk | ${digest.rocks.atRisk} |
| 🔴 Off Track | ${digest.rocks.offTrack} |
| **Average Progress** | **${digest.rocks.avgProgress}%** |

---

#### 📈 Scorecard ${scorecardEmoji}
| Status | Count |
|--------|-------|
| ✅ Above Goal | ${digest.scorecard.aboveGoal} |
| ➖ At Goal | ${digest.scorecard.atGoal} |
| ❌ Below Goal | ${digest.scorecard.belowGoal} |

---

#### ❗ Issues
- **Open:** ${digest.issues.open} (${digest.issues.highPriority} high priority)
- **In Progress:** ${digest.issues.inProgress}
- **Solved:** ${digest.issues.solved}

---

#### ☑️ To-Dos ${todoEmoji}
- **Completion Rate:** ${digest.todos.completionRate}%
- **Complete:** ${digest.todos.complete} / ${digest.todos.total}
- **Overdue:** ${digest.todos.overdue}

---

#### 📅 Level 10 Meetings
- **Last Meeting:** ${digest.meetings.lastMeetingDate || "None"} (Rating: ${digest.meetings.lastMeetingRating || "N/A"}/10)
- **Average Rating:** ${digest.meetings.avgRating}/10

---

#### 👥 Team (${digest.team.total} members)
- **Right Seat:** ${digest.team.rightSeat}
- **Needs GWC Review:** ${digest.team.needsReview}

---
*Generated by Adams Platform • Traction Dashboard*`;
}

async function getWebhookUrl(): Promise<string | null> {
  if (!db) return null;
  try {
    const settingsRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, "default");
    const settingsDoc = await getDoc(settingsRef);
    if (settingsDoc.exists()) {
      return settingsDoc.data()?.integrations?.mattermost?.webhookUrl || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    
    // Gather all digest data
    const digest = await gatherDigestData();
    
    // Format the message
    const message = formatDigestMessage(digest);
    
    // Get webhook URL and send
    const webhookUrl = await getWebhookUrl();
    if (!webhookUrl) {
      return NextResponse.json({
        success: false,
        error: "Webhook URL not configured",
        digest,
      }, { status: 400 });
    }

    const result = await sendToMattermost(webhookUrl, {
      text: message,
      username: "Adams Traction",
      icon_emoji: ":chart_with_upwards_trend:",
    });

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      digest,
      error: result.error,
    });
  } catch (error) {
    console.error("Weekly digest error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
