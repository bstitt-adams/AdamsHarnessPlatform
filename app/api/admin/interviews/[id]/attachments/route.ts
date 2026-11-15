import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { httpErrorResponse } from "@/lib/adams-harness/server-store";
import {
  listInterviewAttachmentFiles,
  readInterviewAttachmentFile,
} from "@/lib/adams-harness/attachment-files";

/**
 * GET — list stored Base64 attachments for an interview, or with ?fileId=
 * download the reassembled original file.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const fileId = request.nextUrl.searchParams.get("fileId");

    if (!fileId) {
      const files = await listInterviewAttachmentFiles(id);
      return NextResponse.json({ files });
    }

    const file = await readInterviewAttachmentFile(fileId);
    if (!file || file.meta.interviewId !== id) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }
    return new NextResponse(Buffer.from(file.base64, "base64"), {
      headers: {
        "Content-Type": file.meta.mimeType,
        "Content-Disposition": `attachment; filename="${file.meta.fileName.replace(/["\\\r\n]/g, "_")}"`,
        "Cache-Control": "private, no-store",
        // Respondent-supplied MIME type: never let the browser sniff/render it inline.
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Interview attachment GET error:", error);
    return NextResponse.json({ error: "Failed to load attachments" }, { status: 500 });
  }
}
