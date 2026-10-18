import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  authErrorResponse,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import type {
  DepartmentDoc,
  ProcessInterviewDoc,
} from "@/lib/adams-harness/types";
import {
  mergeFacts,
  newMessage,
  runInterviewTurn,
} from "@/lib/adams-harness/interview";
import { analyzeInterviewAttachment } from "@/lib/adams-harness/attachment-analyzer";
import {
  canAccessInterview,
  getDb,
  httpErrorResponse,
  interviewCapabilities,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser(request);
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

    const deptSnap = await db
      .collection(COLLECTIONS.DEPARTMENTS)
      .doc(interview.departmentId)
      .get();
    const department = deptSnap.exists
      ? ({ id: deptSnap.id, ...deptSnap.data() } as DepartmentDoc)
      : null;

    if (!canAccessInterview(actor, interview, department)) {
      throw new ApiAuthError(403, "Not authorized for this interview");
    }
    if (!interviewCapabilities(actor, interview, department).canRevise) {
      throw new ApiAuthError(
        403,
        "Only the interview owner or a department owner can upload attachments",
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
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
    const updatedAttachments = [...(interview.attachments || []), analysis];

    // Pre-populate discovered systems / copiedData from the attachment
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

    await writeAuditLog({
      entityType: "interview",
      entityId: interview.id,
      action: "upload_attachment",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: {
        fileName: analysis.fileName,
        fileType: analysis.fileType,
        sizeBytes: analysis.sizeBytes,
      },
    });

    const updated = (await ref.get()).data() as ProcessInterviewDoc;
    return NextResponse.json({
      interview: serializeDoc({ ...updated, id: ref.id }),
      attachment: analysis,
      assistantMessage: turn.assistantMessage,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Failed to upload/analyze interview attachment:", error);
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
