import { NextRequest, NextResponse } from "next/server";
import type { ProcessInterviewDoc } from "@/lib/adams-harness/types";
import {
  mergeFacts,
  newMessage,
  runInterviewTurn,
} from "@/lib/adams-harness/interview";
import { analyzeInterviewAttachment } from "@/lib/adams-harness/attachment-analyzer";
import { isRateLimited } from "@/lib/adams-harness/rate-limit";
import {
  getDb,
  httpErrorResponse,
  HttpError,
  serializeDoc,
} from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";

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

    const updated = (await ref.get()).data() as ProcessInterviewDoc;
    return NextResponse.json({
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
