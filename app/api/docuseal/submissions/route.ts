/**
 * DocuSeal Submissions API
 * 
 * Endpoints for managing document submissions:
 * - GET: List submissions
 * - POST: Create new submission
 */

import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, addDoc, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, DocuSealSubmissionDoc } from "@/lib/schema";
import { getDefaultDocuSealService, CreateSubmissionRequest } from "@/lib/docuseal";

// Serialize timestamps
function serializeSubmission(data: DocuSealSubmissionDoc): Record<string, unknown> {
  return {
    ...data,
    sentAt: (data.sentAt as unknown as { toDate?: () => Date })?.toDate?.()?.toISOString() || data.sentAt,
    completedAt: (data.completedAt as unknown as { toDate?: () => Date })?.toDate?.()?.toISOString() || data.completedAt,
    expiresAt: (data.expiresAt as unknown as { toDate?: () => Date })?.toDate?.()?.toISOString() || data.expiresAt,
    createdAt: (data.createdAt as unknown as { toDate?: () => Date })?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: (data.updatedAt as unknown as { toDate?: () => Date })?.toDate?.()?.toISOString() || data.updatedAt,
    submitters: data.submitters?.map((s) => ({
      ...s,
      completedAt: (s.completedAt as unknown as { toDate?: () => Date })?.toDate?.()?.toISOString() || s.completedAt,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const organizationId = searchParams.get('organizationId');
    const source = searchParams.get('source') || 'local';

    // Fetch from DocuSeal API
    if (source === 'docuseal') {
      const service = getDefaultDocuSealService();
      if (!service) {
        return NextResponse.json(
          { success: false, error: "DocuSeal not configured" },
          { status: 503 }
        );
      }

      const result = await service.getSubmissions({
        limit: 50,
        status: status as 'pending' | 'completed' | 'expired' | 'archived' | undefined,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        submissions: result.data?.data || [],
        source: 'docuseal',
      });
    }

    // Fetch from local cache
    if (!db) {
      return NextResponse.json({ success: true, submissions: [], source: 'local' });
    }

    let q = query(
      collection(db, COLLECTIONS.DOCUSEAL_SUBMISSIONS),
      orderBy('createdAt', 'desc')
    );

    if (status) {
      q = query(
        collection(db, COLLECTIONS.DOCUSEAL_SUBMISSIONS),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    if (organizationId) {
      q = query(
        collection(db, COLLECTIONS.DOCUSEAL_SUBMISSIONS),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const submissions = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as DocuSealSubmissionDoc;
      return serializeSubmission({ ...data, id: docSnap.id });
    });

    return NextResponse.json({ success: true, submissions, source: 'local' });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const service = getDefaultDocuSealService();
    if (!service) {
      return NextResponse.json(
        { success: false, error: "DocuSeal not configured" },
        { status: 503 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      templateId,
      templateName,
      submitters,
      organizationId,
      organizationName,
      opportunityId,
      projectId,
      sendEmail = true,
      message,
    } = body;

    if (!templateId || !submitters || submitters.length === 0) {
      return NextResponse.json(
        { success: false, error: "Template ID and submitters are required" },
        { status: 400 }
      );
    }

    // Create submission in DocuSeal
    const submissionRequest: CreateSubmissionRequest = {
      template_id: templateId,
      send_email: sendEmail,
      order: 'preserved',
      message: message ? {
        subject: message.subject,
        body: message.body,
      } : undefined,
      submitters: submitters.map((s: { role?: string; email: string; name?: string; phone?: string; fields?: Array<{ name: string; default_value?: string }> }) => ({
        role: s.role,
        email: s.email,
        name: s.name,
        phone: s.phone,
        fields: s.fields,
      })),
    };

    const result = await service.createSubmission(submissionRequest);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to create submission" },
        { status: 500 }
      );
    }

    // Get the first submitter to extract submission ID
    const firstSubmitter = result.data[0];
    const submissionId = firstSubmitter?.submission_id;

    // Store submission in Firestore
    const now = Timestamp.now();
    const submissionDoc: Omit<DocuSealSubmissionDoc, 'id'> = {
      docusealSubmissionId: submissionId,
      templateId: templateId.toString(),
      templateName: templateName || 'Unknown Template',
      status: 'pending',
      organizationId,
      organizationName,
      opportunityId,
      projectId,
      submitters: result.data.map((s) => ({
        email: s.email,
        name: s.name || '',
        role: s.role,
        status: s.status,
      })),
      sentAt: sendEmail ? now : undefined,
      createdBy: 'system', // TODO: Get from auth
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.DOCUSEAL_SUBMISSIONS), submissionDoc);

    return NextResponse.json({
      success: true,
      submission: {
        id: docRef.id,
        docusealSubmissionId: submissionId,
        submitters: result.data.map((s) => ({
          id: s.id,
          email: s.email,
          name: s.name,
          role: s.role,
          status: s.status,
          embedSrc: s.embed_src,
          signingLink: `https://docuseal.co/s/${s.slug}`,
        })),
      },
    });
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
