import { NextRequest, NextResponse } from "next/server";
import { ApiAuthError, authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { httpErrorResponse } from "@/lib/adams-harness/server-store";
import { resolveSiteDocsConfig, sitedocsClient } from "@/lib/sitedocs/client";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

function toIsoDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/**
 * Pull SiteDocs workers and certifications into the platform.
 * Workers are matched to teamMembers by email only — never auto-created.
 * Certifications create userTrainingCerts for matched members only.
 * A run summary is written to sitedocsSyncRuns and mirrored on
 * platformSettings/global.sitedocs.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    const config = await resolveSiteDocsConfig();
    if (!config) {
      return NextResponse.json({ error: "SiteDocs is not configured — set the API key in Settings → Integrations" }, { status: 400 });
    }

    const runRef = adminDb.collection("sitedocsSyncRuns").doc();
    const stats = {
      workersFound: 0,
      workersMatched: 0,
      workersUnmatched: 0,
      certsFound: 0,
      certsCreated: 0,
      certsSkipped: 0,
      errors: [] as string[],
    };

    // Match workers to members by email
    const [workers, membersSnap] = await Promise.all([
      sitedocsClient.workers(config),
      adminDb.collection(COLLECTIONS.TEAM_MEMBERS).get(),
    ]);
    stats.workersFound = workers.length;

    const memberByEmail = new Map<string, TeamMemberDoc & { id: string }>();
    for (const doc of membersSnap.docs) {
      const member = { id: doc.id, ...doc.data() } as TeamMemberDoc & { id: string };
      if (member.emailPrimary) memberByEmail.set(member.emailPrimary.toLowerCase(), member);
    }

    const memberByWorkerId = new Map<string, TeamMemberDoc & { id: string }>();
    for (const worker of workers) {
      const email = (worker.email || "").toLowerCase();
      const member = email ? memberByEmail.get(email) : undefined;
      if (member) {
        stats.workersMatched++;
        memberByWorkerId.set(worker.id, member);
      } else {
        stats.workersUnmatched++;
      }
    }

    // Pull certifications and upsert per (member, sitedocs cert id)
    let certs: Awaited<ReturnType<typeof sitedocsClient.certifications>> = [];
    try {
      certs = await sitedocsClient.certifications(config);
    } catch (error) {
      stats.errors.push(`certifications: ${error instanceof Error ? error.message : String(error)}`);
    }
    stats.certsFound = certs.length;

    const db = adminDb;
    const existingCerts = await db.collection(COLLECTIONS.USER_TRAINING_CERTS)
      .where("source", "==", "sitedocs")
      .get();
    const existingBySiteDocsId = new Map(
      existingCerts.docs.map((d) => [String(d.data().sitedocsCertificationId || ""), d.id]),
    );

    const now = Timestamp.now();
    let batch = db.batch();
    let batchCount = 0;
    const flush = async () => {
      if (batchCount === 0) return;
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    };

    for (const cert of certs) {
      const member = cert.workerId ? memberByWorkerId.get(cert.workerId) : undefined;
      if (!member) {
        stats.certsSkipped++;
        continue;
      }
      const title = cert.certificationTypeName || cert.name || "SiteDocs certification";
      const completionDate = toIsoDate(cert.issuedOn) || "1970-01-01";
      const expirationDate = toIsoDate(cert.expiryOn) || "9999-12-31";

      const existingId = existingBySiteDocsId.get(cert.id);
      const ref = existingId
        ? db.collection(COLLECTIONS.USER_TRAINING_CERTS).doc(existingId)
        : db.collection(COLLECTIONS.USER_TRAINING_CERTS).doc();

      const docData: Record<string, unknown> = {
        id: ref.id,
        teamMemberId: member.id,
        userName: `${member.firstName} ${member.lastName}`.trim(),
        userEmail: member.emailPrimary || "",
        trainingTitle: title,
        trainingCategory: "sitedocs",
        issuingOrganization: "SiteDocs",
        completionDate,
        expirationDate,
        source: "sitedocs",
        sitedocsCertificationId: cert.id,
        sitedocsWorkerId: cert.workerId || "",
        artifactStatus: "missing",
        followUpStatus: "open",
        notificationStatus: "monitoring",
        updatedAt: now,
      };
      if (!existingId) {
        docData.createdAt = now;
        batch.set(ref, docData);
        stats.certsCreated++;
      } else {
        batch.set(ref, docData, { merge: true });
        stats.certsCreated++;
      }
      batchCount++;
      if (batchCount >= 400) await flush();
    }
    await flush();

    await runRef.set({
      id: runRef.id,
      startedByUid: actor.uid,
      startedByEmail: actor.email,
      ...stats,
      errors: stats.errors.slice(0, 50),
      createdAt: FieldValue.serverTimestamp(),
    });
    await adminDb.collection("platformSettings").doc("global").set(
      {
        sitedocs: {
          lastSyncAt: FieldValue.serverTimestamp(),
          lastSyncStats: { ...stats, errors: stats.errors.slice(0, 10) },
        },
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true, runId: runRef.id, stats });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("SiteDocs sync failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "SiteDocs sync failed" }, { status: 500 });
  }
}
