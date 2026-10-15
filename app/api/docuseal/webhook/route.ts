/**
 * DocuSeal Webhook Handler
 * 
 * Handles webhook events from DocuSeal:
 * - form.viewed - When a form is viewed
 * - form.started - When signing starts
 * - form.completed - When a submitter completes signing
 * - submission.completed - When all submitters complete
 */

import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, DocuSealSubmissionDoc } from "@/lib/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, timestamp, data } = body;

    console.log(`DocuSeal webhook received: ${event_type}`, { timestamp, data });

    if (!db) {
      console.warn("Database not configured, skipping webhook processing");
      return NextResponse.json({ success: true, message: "Webhook received (no db)" });
    }

    // Find the submission in our database
    const submissionId = data.submission_id || data.id;
    if (!submissionId) {
      return NextResponse.json({ success: true, message: "No submission ID in webhook" });
    }

    const submissionQuery = query(
      collection(db, COLLECTIONS.DOCUSEAL_SUBMISSIONS),
      where('docusealSubmissionId', '==', submissionId)
    );
    const submissionSnap = await getDocs(submissionQuery);

    if (submissionSnap.empty) {
      console.warn(`Submission ${submissionId} not found in database`);
      return NextResponse.json({ success: true, message: "Submission not found" });
    }

    const submissionDoc = submissionSnap.docs[0];
    const submissionData = submissionDoc.data() as DocuSealSubmissionDoc;
    const now = Timestamp.now();

    // Handle different event types
    switch (event_type) {
      case 'form.viewed':
        // Update submitter status to 'opened'
        if (data.email) {
          const updatedSubmitters = submissionData.submitters.map((s) => {
            if (s.email === data.email) {
              return { ...s, status: 'opened' as const };
            }
            return s;
          });
          await updateDoc(doc(db, COLLECTIONS.DOCUSEAL_SUBMISSIONS, submissionDoc.id), {
            submitters: updatedSubmitters,
            status: 'viewed',
            updatedAt: now,
          });
        }
        break;

      case 'form.started':
        // Update status to indicate signing has started
        await updateDoc(doc(db, COLLECTIONS.DOCUSEAL_SUBMISSIONS, submissionDoc.id), {
          status: 'viewed',
          updatedAt: now,
        });
        break;

      case 'form.completed':
        // Update individual submitter as completed
        if (data.email) {
          const updatedSubmitters = submissionData.submitters.map((s) => {
            if (s.email === data.email) {
              return {
                ...s,
                status: 'completed' as const,
                completedAt: now,
                signedDocumentUrl: data.documents?.[0]?.url,
              };
            }
            return s;
          });

          // Check if all submitters are complete
          const allComplete = updatedSubmitters.every((s) => s.status === 'completed');

          await updateDoc(doc(db, COLLECTIONS.DOCUSEAL_SUBMISSIONS, submissionDoc.id), {
            submitters: updatedSubmitters,
            status: allComplete ? 'completed' : 'pending',
            completedAt: allComplete ? now : null,
            updatedAt: now,
          });
        }
        break;

      case 'submission.completed':
        // All submitters have completed
        await updateDoc(doc(db, COLLECTIONS.DOCUSEAL_SUBMISSIONS, submissionDoc.id), {
          status: 'completed',
          completedAt: now,
          combinedDocumentUrl: data.documents?.[0]?.url,
          auditLogUrl: data.audit_log_url,
          updatedAt: now,
        });

        // TODO: Trigger any post-completion workflows
        // - Send notification to team
        // - Update related opportunity/project status
        // - Trigger GHL workflow if configured
        break;

      case 'submission.archived':
        await updateDoc(doc(db, COLLECTIONS.DOCUSEAL_SUBMISSIONS, submissionDoc.id), {
          status: 'expired',
          updatedAt: now,
        });
        break;

      default:
        console.log(`Unhandled DocuSeal event type: ${event_type}`);
    }

    return NextResponse.json({ success: true, message: `Processed ${event_type}` });
  } catch (error) {
    console.error("Error processing DocuSeal webhook:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Allow GET for webhook verification
export async function GET() {
  return NextResponse.json({ success: true, message: "DocuSeal webhook endpoint active" });
}
