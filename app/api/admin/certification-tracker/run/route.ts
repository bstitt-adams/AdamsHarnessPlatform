import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { ApiAuthError, authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { requestHermesStructured } from "@/lib/hermes/client";
import { sendEmail } from "@/lib/email-service";
import { resolveTeamsConfig } from "@/lib/mail/teams-bot";
import { COLLECTIONS, type TeamMemberDoc, type UserTrainingCertDoc } from "@/lib/schema";
import {
  computeReminderStage,
  shouldSendStage,
  type ReminderStage,
} from "@/lib/certifications/reminder-policy";

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
  // Vercel Cron automatically sends `Authorization: Bearer ${CRON_SECRET}` when
  // the CRON_SECRET env var is set. The x-vercel-cron header is client-spoofable
  // and must NOT grant access on its own.
  const cronSecret = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization");
  const cronSecretValid = Boolean(cronSecret && bearer === `Bearer ${cronSecret}`);
  if (!cronSecretValid) await requireAdmin(request);
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
    const hasArtifact = (item: UserTrainingCertDoc) => Boolean(item.artifactBase64 || item.artifactPath);
    const needsAttention = certs.filter((item) => {
      const days = daysUntil(item.expirationDate);
      return days !== null && days <= 60 || !hasArtifact(item) || item.followUpStatus === "open" || item.teamMemberId.startsWith("unmatched-");
    });
    const expired = needsAttention.filter((item) => (daysUntil(item.expirationDate) ?? 1) < 0);
    const dueSoon = needsAttention.filter((item) => {
      const days = daysUntil(item.expirationDate);
      return days !== null && days >= 0 && days <= 60;
    });
    const missingArtifacts = needsAttention.filter((item) => !hasArtifact(item));
    const unmatched = needsAttention.filter((item) => item.teamMemberId.startsWith("unmatched-"));
    const sample = needsAttention.slice(0, 30).map((item) => ({
      employee: item.userName,
      certification: item.certificationType || item.trainingTitle,
      expirationDate: item.expirationDate === FAR_FUTURE ? "none" : item.expirationDate,
      jobsite: item.jobsite || "",
      artifactStatus: item.artifactStatus || (hasArtifact(item) ? "received" : "missing"),
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

    // ---- Per-employee reminder engine (email only) ----
    const dryRun = ["1", "true"].includes(request.nextUrl.searchParams.get("dryRun") || "");
    const scope = request.nextUrl.searchParams.get("scope");
    const missionCriticalOnly = scope === "mission-critical";
    const origin = request.nextUrl.origin;
    const nowMs = Date.now();
    const safetyEscalationRecipients = Array.from(new Set(members
      .filter((m) => m.status === "active" && m.emailPrimary)
      .filter((m) => m.workforceDepartmentName === "Safety" || m.role === "admin" || m.role === "superadmin")
      .map((m) => m.emailPrimary)));

    type ReminderResult = {
      certId: string;
      memberId: string;
      memberName: string;
      stage: ReminderStage;
      to: string;
      cc: string[];
      status: "sent" | "dry_run" | "failed" | "skipped";
      detail?: string;
    };
    const reminders: ReminderResult[] = [];
    const reminderWrites: { certId: string; stage: ReminderStage | "cleared" }[] = [];

    const emailFor = (stage: ReminderStage, cert: UserTrainingCertDoc, memberName: string, lang: string | undefined) => {
      const days = daysUntil(cert.expirationDate);
      const certName = cert.certificationType || cert.trainingTitle || "certification";
      const link = `${origin}/portal/my-training?cert=${cert.id}`;
      const es = lang === "es";
      const subject = es
        ? `Acción requerida: su certificación ${certName} ${days !== null && days < 0 ? "venció" : `vence en ${days} días`}`
        : `Action required: your ${certName} certification ${days !== null && days < 0 ? "has expired" : `expires in ${days} days`}`;
      const body = es
        ? `Hola ${memberName},\n\nSu certificación "${certName}" ${days !== null && days < 0 ? `venció hace ${Math.abs(days)} días` : `vence el ${cert.expirationDate}`}.\n\nSuba su certificado renovado aquí para detener los recordatorios: ${link}\n\n— Adams Platform (Departamento de Seguridad)`
        : `Hi ${memberName},\n\nYour "${certName}" certification ${days !== null && days < 0 ? `expired ${Math.abs(days)} days ago` : `expires on ${cert.expirationDate}`}.\n\nUpload your renewed certificate here to stop reminders: ${link}\n\n— Adams Platform (Safety Department)`;
      return { subject, body };
    };

    for (const cert of certs) {
      const member = memberById.get(cert.teamMemberId);
      const days = daysUntil(cert.expirationDate);
      const stage = computeReminderStage(days);

      // Stop condition: renewed expiration pushed out of the window → clear sent stages
      if (stage === null) {
        if (cert.remindersSent && Object.keys(cert.remindersSent).length > 0 && !dryRun) {
          reminderWrites.push({ certId: cert.id, stage: "cleared" });
        }
        continue;
      }
      if (!member || member.status !== "active" || !member.emailPrimary) continue;
      if (missionCriticalOnly && !member.missionCritical) continue;
      if (!shouldSendStage(stage, cert.remindersSent, nowMs)) continue;

      const memberName = `${member.firstName} ${member.lastName}`.trim() || member.emailPrimary;
      const supervisor = member.supervisorId ? memberById.get(member.supervisorId) : undefined;
      const cc: string[] = [];
      if (days !== null && days < 0 && supervisor?.emailPrimary) cc.push(supervisor.emailPrimary);
      const to = member.emailPrimary;
      const extraCc = stage === "safety_escalation" ? safetyEscalationRecipients : cc;
      const msg = emailFor(stage, cert, memberName, member.preferredLanguage);

      if (dryRun) {
        reminders.push({ certId: cert.id, memberId: member.id, memberName, stage, to, cc: extraCc, status: "dry_run" });
        continue;
      }
      try {
        const result = await sendEmail("adams", {
          to,
          ...(extraCc.length ? { cc: extraCc } : {}),
          subject: msg.subject,
          text: msg.body,
          html: `<p>${escapeHtml(msg.body).replaceAll("\n", "<br>")}</p>`,
        });
        reminders.push({ certId: cert.id, memberId: member.id, memberName, stage, to, cc: extraCc, status: result.success ? "sent" : "failed", detail: result.success ? undefined : result.error });
        if (result.success) reminderWrites.push({ certId: cert.id, stage });
      } catch (error) {
        reminders.push({ certId: cert.id, memberId: member.id, memberName, stage, to, cc: extraCc, status: "failed", detail: error instanceof Error ? error.message : "send_failed" });
      }
    }

    if (!dryRun && reminderWrites.length > 0) {
      const batch = adminDb.batch();
      for (const write of reminderWrites.slice(0, 400)) {
        const ref = adminDb.collection(COLLECTIONS.USER_TRAINING_CERTS).doc(write.certId);
        if (write.stage === "cleared") {
          batch.update(ref, { remindersSent: {}, notificationStatus: "monitoring", updatedAt: now });
        } else {
          batch.update(ref, {
            [`remindersSent.${write.stage}`]: now,
            notificationStatus: write.stage === "safety_escalation" ? "escalated" : "notified",
            lastNotificationAt: now,
            updatedAt: now,
          });
        }
      }
      await batch.commit();
    }
    // ---- End per-employee reminder engine ----

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

    if (!dryRun) {
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
      dryRun,
      scope: scope || "all",
      reminders: {
        sent: reminders.filter((r) => r.status === "sent").length,
        failed: reminders.filter((r) => r.status === "failed").length,
        dryRun: dryRun ? reminders : undefined,
        detail: dryRun ? undefined : reminders,
      },
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
