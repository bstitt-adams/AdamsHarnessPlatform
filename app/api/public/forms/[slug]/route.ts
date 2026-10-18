import { NextRequest, NextResponse } from "next/server";
import { getDb, serializeDoc } from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";
import type { PlatformFormDoc } from "@/lib/form-builder/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const db = getDb();
    const snap = await db
      .collection(COLLECTIONS.PLATFORM_FORMS)
      .where("slug", "==", slug)
      .limit(1)
      .get();

    let formDoc: PlatformFormDoc | null = null;
    if (!snap.empty) {
      const d = snap.docs[0];
      formDoc = { id: d.id, ...d.data() } as PlatformFormDoc;
    } else {
      const byId = await db.collection(COLLECTIONS.PLATFORM_FORMS).doc(slug).get();
      if (byId.exists) {
        formDoc = { id: byId.id, ...byId.data() } as PlatformFormDoc;
      }
    }

    if (!formDoc) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json({
      form: serializeDoc({
        ...formDoc,
        apiKey: undefined,
      }),
    });
  } catch (error) {
    console.error("GET public form error:", error);
    return NextResponse.json({ error: "Failed to load form" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const db = getDb();
    const snap = await db
      .collection(COLLECTIONS.PLATFORM_FORMS)
      .where("slug", "==", slug)
      .limit(1)
      .get();

    let formRef = snap.empty ? null : snap.docs[0].ref;
    let formDoc: PlatformFormDoc | null = snap.empty
      ? null
      : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as PlatformFormDoc);

    if (!formDoc) {
      const byId = await db.collection(COLLECTIONS.PLATFORM_FORMS).doc(slug).get();
      if (byId.exists) {
        formRef = byId.ref;
        formDoc = { id: byId.id, ...byId.data() } as PlatformFormDoc;
      }
    }

    if (!formDoc || !formRef) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const body = await request.json();
    const values = (body.values || body.data || {}) as Record<string, unknown>;
    const submittedByName = String(body.submittedByName || values.submitted_by_team_member || "Respondent");
    const submittedByEmail = String(body.submittedByEmail || "");
    const signatureDataUri = typeof body.signatureDataUri === "string" ? body.signatureDataUri : undefined;
    const completionSeconds = Number(body.completionSeconds || 45);
    const source = body.source === "api" ? "api" : body.source === "public_link" ? "public_link" : "portal";

    // 1. Save submission
    const subRef = db.collection(COLLECTIONS.PLATFORM_FORM_SUBMISSIONS).doc();
    const now = new Date();
    const submissionData = {
      id: subRef.id,
      formId: formDoc.id,
      formSlug: formDoc.slug,
      formTitle: formDoc.title,
      submittedByName,
      submittedByEmail,
      values,
      ...(signatureDataUri
        ? {
            signatureDataUri,
            signatureSignedBy: submittedByName,
            signatureSignedAt: now.toISOString(),
          }
        : {}),
      completionSeconds,
      source,
      createdAt: now,
    };
    await subRef.set(submissionData);

    // 2. Update form analytics
    const prevAnalytics = formDoc.analytics || {
      totalViews: 1,
      totalStarts: 1,
      totalSubmissions: 0,
      completionRatePct: 100,
      avgCompletionSeconds: 45,
      stepStats: [],
    };
    const nextSubs = (prevAnalytics.totalSubmissions || 0) + 1;
    const nextStarts = Math.max(nextSubs, (prevAnalytics.totalStarts || 0) + 1);
    const nextViews = Math.max(nextStarts, (prevAnalytics.totalViews || 0) + 1);
    const nextAvgTime = Math.round(
      ((prevAnalytics.avgCompletionSeconds || 45) * (nextSubs - 1) + completionSeconds) /
        nextSubs,
    );

    await formRef.update({
      "analytics.totalViews": nextViews,
      "analytics.totalStarts": nextStarts,
      "analytics.totalSubmissions": nextSubs,
      "analytics.completionRatePct": Math.round((nextSubs / nextStarts) * 100),
      "analytics.avgCompletionSeconds": nextAvgTime,
      updatedAt: now,
    });

    // 3. Execute enabled Adams Platform integrations
    for (const integration of formDoc.integrations || []) {
      if (!integration.enabled) continue;
      try {
        if (integration.type === "platform_module_records") {
          const targetModuleSlug = integration.targetSlugOrUrl || formDoc.slug;
          await db.collection(COLLECTIONS.MODULE_RECORDS).add({
            moduleSlug: targetModuleSlug,
            departmentId: formDoc.departmentId || "safety",
            recordTypeId: "default",
            status: "open",
            data: {
              title: `${formDoc.title} — ${submittedByName}`,
              ...values,
            },
            extendedData: {
              formId: formDoc.id,
              submissionId: subRef.id,
            },
            createdByUid: "form-integration",
            createdByName: submittedByName,
            createdAt: now,
            updatedAt: now,
          });
        } else if (integration.type === "platform_my_tasks") {
          await db.collection(COLLECTIONS.TRACTION_TODOS).add({
            description: `[Form: ${formDoc.title}] Follow-up for ${submittedByName}`,
            mindchukKind: "task",
            ownerName: submittedByName,
            ownerEmail: submittedByEmail,
            priority: "medium",
            status: "in-progress",
            completed: false,
            tags: ["form-submission", formDoc.slug],
            dueDate: now,
            createdAt: now,
            updatedAt: now,
          });
        } else if (integration.type === "platform_master_calendar") {
          await db.collection(COLLECTIONS.CALENDAR_EVENTS).add({
            title: `Form Submitted: ${formDoc.title} (${submittedByName})`,
            description: `Submitted via Adams Form Studio`,
            startDate: now,
            endDate: new Date(now.getTime() + 3600000),
            allDay: true,
            type: "custom",
            color: "#0ea5e9",
            attendees: [submittedByName],
            createdAt: now,
            updatedAt: now,
          });
        } else if (
          integration.type === "outbound_webhook" &&
          integration.targetSlugOrUrl?.startsWith("http")
        ) {
          await fetch(integration.targetSlugOrUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(submissionData),
          }).catch(() => {});
        }
      } catch (intErr) {
        console.warn(`Integration ${integration.type} warning:`, intErr);
      }
    }

    return NextResponse.json({
      success: true,
      submissionId: subRef.id,
      submission: submissionData,
    });
  } catch (error) {
    console.error("POST public form submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit form response" },
      { status: 500 },
    );
  }
}
