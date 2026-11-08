import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { ApiAuthError, authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { requestHermesStructured } from "@/lib/hermes/client";
import { sendEmail } from "@/lib/email-service";
import { resolveTeamsConfig } from "@/lib/mail/teams-bot";
import { COLLECTIONS, type TeamMemberDoc, type UserTrainingCertDoc } from "@/lib/schema";

const FAR_FUTURE = "9999-12-31";
const DAY_MS = 86_400_000;

const hermesReportSchema = z.strictObject({
  summary: z.string().min(1).max(4000),
  priorities: z.array(z.string().min(1).max(500)).max(15).default([]),
});

function daysUntil(value: string) {
  if (!value || value === FAR_FUTURE) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const due = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / DAY_MS);
}

function addDays(days: number) {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function authorize(request: NextRequest) {
  const cronHeader = request.headers.get("x-vercel-cron") === "1";
  const cronSecret = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization");
  const cronSecretValid = Boolean(cronSecret && bearer === `Bearer ${cronSecret}`);
  if (!cronHeader && !cronSecretValid) await requireAdmin(request);
}

async function run(request: NextRequest) {
  try {
    await authorize(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });

    const [certSnap, memberSnap] = await Promise.all([
      adminDb.collection(COLLECTIONS.USER_TRAINING_CERTS).get(),
      adminDb.collection(COLLECTIONS.TEAM_MEMBERS).get(),
    ]);
    const certs = certSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as UserTrainingCertDoc);
    const members = memberSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as TeamMemberDoc);
    const needsAttention = certs.filter((item) => {
      const days = daysUntil(item.expirationDate);
      return days !== null && days <= 60 || !item.artifactBase64 || item.followUpStatus === "open" || item.teamMemberId.startsWith("unmatched-");
    });
    const expired = needsAttention.filter((item) => (daysUntil(item.expirationDate) ?? 1) < 0);
    const dueSoon = needsAttention.filter((item) => {
      const days = daysUntil(item.expirationDate);
      return days !== null && days >= 0 && days <= 60;
    });
    const missingArtifacts = needsAttention.filter((item) => !item.artifactBase64);
    const unmatched = needsAttention.filter((item) => item.teamMemberId.startsWith("unmatched-"));
    const sample = needsAttention.slice(0, 30).map((item) => ({
      employee: item.userName,
      certification: item.certificationType || item.trainingTitle,
      expirationDate: item.expirationDate === FAR_FUTURE ? "none" : item.expirationDate,
      jobsite: item.jobsite || "",
      artifactStatus: item.artifactStatus || (item.artifactBase64 ? "received" : "missing"),
      followUp: item.followUpRequirement || "",
    }));

    let report = {
      summary: `Certification run identified ${expired.length} expired, ${dueSoon.length} due within 60 days, ${missingArtifacts.length} records without attached artifacts, and ${unmatched.length} unmatched people.`,
      priorities: [
        ...(expired.length ? [`Escalate ${expired.length} expired certifications to Safety management.`] : []),
        ...(dueSoon.length ? [`Notify employees and supervisors for ${dueSoon.length} renewals due within 60 days.`] : []),
        ...(missingArtifacts.length ? [`Request readable certificate artifacts for ${missingArtifacts.length} records.`] : []),
        ...(unmatched.length ? [`Resolve ${unmatched.length} imported names that do not match Team Members.`] : []),
      ],
    };

    try {
      const { data } = await requestHermesStructured({
        systemPrompt: "You are Hermes, the Adams Platform certification operations manager. Produce a concise management report and prioritized next actions. Do not expose personal emails or private HR details.",
        messages: [{ role: "user", content: JSON.stringify({ counts: { expired: expired.length, dueSoon: dueSoon.length, missingArtifacts: missingArtifacts.length, unmatched: unmatched.length }, sample }) }],
        schema: hermesReportSchema,
        temperature: 0.2,
      });
      report = data;
    } catch {
      // Deterministic report remains available when Hermes is not configured.
    }

    const now = Timestamp.now();
    const runRef = adminDb.collection(COLLECTIONS.AUTOMATION_RUNS).doc();
    await runRef.set({
      automationId: "certification-tracker",
      automationName: "Certification expiration and artifact management",
      action: "hermes",
      instruction: "Daily certification expiration, artifact, and escalation triage.",
      status: "completed",
      result: report,
      recordCount: needsAttention.length,
      startedAt: now,
      completedAt: now,
      createdAt: now,
      runByUid: cronOrSystemUid(request),
    });

    const queuedActions = ["hermes", "email", "teams", "telegram", "lms_reminder", "calendar", "task"];
    for (const action of queuedActions) {
      await adminDb.collection(COLLECTIONS.AUTOMATION_RUNS).add({
        automationId: runRef.id,
        automationName: "Certification notification delivery",
        action,
        instruction: report.priorities.join("\n") || report.summary,
        configuration: { recipients: "employee,supervisor,safety", channel: action },
        status: "queued",
        createdAt: now,
      });
    }

    const memberById = new Map(members.map((member) => [member.id, member]));
    const affectedSupervisorIds = new Set(
      needsAttention
        .map((item) => memberById.get(item.teamMemberId)?.supervisorId)
        .filter((value): value is string => Boolean(value)),
    );
    const recipients = Array.from(new Set(members
      .filter((member) => member.status === "active" && member.emailPrimary)
      .filter((member) => affectedSupervisorIds.has(member.id) || member.workforceDepartmentName === "Safety" || member.role === "admin" || member.role === "superadmin")
      .map((member) => member.emailPrimary)));
    const delivery: Record<string, unknown> = { recipients };

    if (recipients.length === 0) {
      delivery.email = "no_recipients";
    } else {
      try {
        const emailResult = await sendEmail("adams", {
          to: "info@adams-electric.com",
          bcc: recipients,
          subject: `Adams Certification Report — ${expired.length} expired · ${dueSoon.length} due soon`,
          text: `${report.summary}\n\n${report.priorities.join("\n")}`,
          html: `<p>${escapeHtml(report.summary)}</p><ol>${report.priorities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`,
        });
        delivery.email = emailResult.success ? "sent" : emailResult.error || "failed";
      } catch (error) {
        delivery.email = error instanceof Error ? error.message : "not_configured";
      }
    }

    try {
      const teams = await resolveTeamsConfig();
      if (teams.enabled !== false && teams.incomingWebhookUrl) {
        const response = await fetch(teams.incomingWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: `${report.summary}\n\n${report.priorities.join("\n")}` }),
          signal: AbortSignal.timeout(10_000),
        });
        delivery.teams = response.ok ? "sent" : `failed_${response.status}`;
      } else {
        delivery.teams = "not_configured";
      }
    } catch (error) {
      delivery.teams = error instanceof Error ? error.message : "failed";
    }
    delivery.telegram = "queued_no_safety_chat_configured";

    for (let index = 0; index < needsAttention.length; index += 400) {
      const batch = adminDb.batch();
      for (const item of needsAttention.slice(index, index + 400)) {
        const days = daysUntil(item.expirationDate);
        batch.update(item.id ? adminDb.collection(COLLECTIONS.USER_TRAINING_CERTS).doc(item.id) : adminDb.collection(COLLECTIONS.USER_TRAINING_CERTS).doc(), {
          notificationStatus: days !== null && days < 0 ? "escalated" : "notified",
          lastNotificationAt: now,
          nextFollowUpAt: days !== null && days < 0 ? addDays(1) : days !== null && days <= 30 ? addDays(7) : addDays(30),
          updatedAt: now,
        });
      }
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      report,
      delivery,
      counts: {
        total: certs.length,
        needsAttention: needsAttention.length,
        expired: expired.length,
        dueSoon: dueSoon.length,
        missingArtifacts: missingArtifacts.length,
        unmatched: unmatched.length,
      },
      queuedActions,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    console.error("Certification tracker run failed:", error);
    return NextResponse.json({ error: "Certification tracker run failed" }, { status: 500 });
  }
}

function cronOrSystemUid(request: NextRequest) {
  return request.headers.get("x-vercel-cron") === "1" ? "vercel-cron" : "admin";
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
