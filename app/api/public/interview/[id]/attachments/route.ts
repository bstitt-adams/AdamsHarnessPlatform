import { NextRequest, NextResponse } from "next/server";
import type { ProcessInterviewDoc } from "@/lib/adams-harness/types";
import {
  mergeFacts,
  newMessage,
  runInterviewTurn,
} from "@/lib/adams-harness/interview";
import { analyzeInterviewAttachment } from "@/lib/adams-harness/attachment-analyzer";
import { READY_FOR_PRD_MESSAGE } from "@/lib/adams-harness/interview";
import { generatePrdOnInterviewReady } from "@/lib/adams-harness/interview-prds";
import {
  MAX_INTERVIEW_ATTACHMENT_BYTES,
  storeInterviewAttachmentBase64,
} from "@/lib/adams-harness/attachment-files";
import { isRateLimited } from "@/lib/adams-harness/rate-limit";
import {
  getDb,
  httpErrorResponse,
  HttpError,
  serializeDoc,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";

const MAX_PUBLIC_ATTACHMENTS = 15;
const MAX_PUBLIC_ATTACHMENT_TOTAL_BYTES = 50 * 1024 * 1024;

function clientKey(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "anonymous";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (isRateLimited(`pub-interview-att:${clientKey(request)}`, 20, 60_000)) {
      throw new HttpError(429, "Too many requests. Please try again shortly.");
    }
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get("file");
    const optionalNote = String(formData.get("note") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please attach a valid file" },
        { status: 400 },
      );
    }

    const db = getDb();
    const ref = db.collection(COLLECTIONS.PROCESS_INTERVIEWS).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }
    const interview = { id: snap.id, ...snap.data() } as ProcessInterviewDoc;

    if (
      interview.source !== "public" ||
      request.cookies.get(`adams-interview-${id}`)?.value !==
        interview.publicSessionToken
    ) {
      return NextResponse.json(
        { error: "Not authorized for this interview" },
        { status: 403 },
      );
    }

    if (interview.status === "completed") {
      return NextResponse.json({ error: "Interview is completed" }, { status: 400 });
    }
    if (file.size > MAX_INTERVIEW_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: "Attachment exceeds the 10 MB limit" }, { status: 413 });
    }
    // Unauthenticated endpoint: cap total storage per interview to prevent Firestore abuse.
    const priorAttachments = interview.attachments || [];
    const priorBytes = priorAttachments.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
    if (priorAttachments.length >= MAX_PUBLIC_ATTACHMENTS || priorBytes + file.size > MAX_PUBLIC_ATTACHMENT_TOTAL_BYTES) {
      return NextResponse.json(
        { error: `Attachment limit reached (${MAX_PUBLIC_ATTACHMENTS} files / ${MAX_PUBLIC_ATTACHMENT_TOTAL_BYTES / 1024 / 1024} MB per interview)` },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storedFile = await storeInterviewAttachmentBase64({
      interviewId: id,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
    });
    const analysis = await analyzeInterviewAttachment(
      buffer,
      file.name,
      file.type || "application/octet-stream",
    );

    const userContent = [
      `[Attachment Uploaded: ${analysis.fileName} (${analysis.fileType.toUpperCase()})]`,
      optionalNote ? `User Note: ${optionalNote}` : "",
      analysis.summary,
    ]
      .filter(Boolean)
      .join("\n");

    const userMessage = newMessage("user", userContent);
    const updatedAttachments = [...(interview.attachments || []), { ...analysis, fileId: storedFile.fileId }];

    const sheetColumns = (analysis.sheets || []).flatMap((s) =>
      s.columns.slice(0, 8),
    );
    const enrichedFacts = mergeFacts(interview.facts, {
      systems: [
        `${analysis.fileType.toUpperCase()}: ${analysis.fileName}`,
      ],
      ...(sheetColumns.length > 0
        ? {
            copiedData: [
              `Spreadsheet "${analysis.fileName}" columns: ${sheetColumns.join(", ")}`,
            ],
          }
        : {}),
    });

    const working: ProcessInterviewDoc = {
      ...interview,
      attachments: updatedAttachments,
      facts: enrichedFacts,
      messages: [...interview.messages, userMessage],
    };

    const turn = await runInterviewTurn(working);

    const updatedFields = {
      attachments: updatedAttachments,
      messages: [...working.messages, turn.assistantMessage],
      facts: turn.facts,
      coverage: turn.coverage,
      unresolvedQuestions: turn.unresolvedQuestions,
      readyForSpecification: turn.readyForSpecification,
      status: (turn.readyForSpecification
        ? "ready_for_review"
        : "interviewing") as ProcessInterviewDoc["status"],
      model: turn.model,
      updatedAt: new Date(),
    };

    await ref.update(updatedFields);

    let updated = (await ref.get()).data() as ProcessInterviewDoc;
    let prdError: string | null = null;
    if (updated.readyForSpecification && !interview.readyForSpecification) {
      const result = await generatePrdOnInterviewReady({ interviewId: id, departmentId: interview.departmentId });
      prdError = result.error;
      await ref.update({
        messages: [...updated.messages, newMessage("assistant", READY_FOR_PRD_MESSAGE)],
        prdGeneratedAt: result.prd ? new Date() : null,
        updatedAt: new Date(),
      });
      updated = (await ref.get()).data() as ProcessInterviewDoc;
    }
    return NextResponse.json({
      ...(prdError ? { prdError } : {}),
      interview: serializeDoc({
        ...updated,
        id: ref.id,
        publicSessionToken: undefined,
      }),
      attachment: analysis,
      assistantMessage: turn.assistantMessage,
    });
  } catch (error) {
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Failed to upload public interview attachment:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze attachment",
      },
      { status: 500 },
    );
  }
}
