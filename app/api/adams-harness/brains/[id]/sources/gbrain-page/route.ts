import { NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  getDb,
  HttpError,
  httpErrorResponse,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { getBrainForActor } from "@/lib/adams-brain/access";
import {
  ingestSource,
  logicalKeyFor,
  nextSourceVersion,
  sha256Hex,
} from "@/lib/adams-brain/ingestion";
import { COLLECTIONS } from "@/lib/schema";
import {
  gbrainPageTypeSchema,
  type BrainSourceDoc,
} from "@/lib/adams-harness/types";

const pageInputSchema = z.strictObject({
  title: z.string().trim().min(2).max(240),
  slug: z.string().trim().max(120).optional(),
  pageType: gbrainPageTypeSchema.default("sop"),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  compiledTruth: z.string().trim().min(5).max(50_000),
  timelineNotes: z.string().trim().max(50_000).default(""),
});

type Ctx = { params: Promise<{ id: string }> };

function buildGBrainMarkdown(input: z.infer<typeof pageInputSchema>, slug: string, departmentId: string): string {
  const tagsList = input.tags.length ? `[${input.tags.map((t) => `"${t}"`).join(", ")}]` : "[]";
  const frontmatter = [
    "---",
    `title: "${input.title.replace(/"/g, '\\"')}"`,
    `slug: "${slug}"`,
    `type: "${input.pageType}"`,
    `department: "${departmentId}"`,
    `tags: ${tagsList}`,
    `updated_at: "${new Date().toISOString()}"`,
    "---",
  ].join("\n");

  const body = [
    frontmatter,
    "",
    `# ${input.title}`,
    "",
    "## Compiled Truth",
    input.compiledTruth,
    ...(input.timelineNotes
      ? [
          "",
          "## Timeline & Evidence",
          `- **${new Date().toISOString().slice(0, 10)}**: ${input.timelineNotes}`,
        ]
      : []),
  ].join("\n");

  return body;
}

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const { brain, canManage } = await getBrainForActor(actor, id);
    if (!canManage) {
      throw new HttpError(403, "Not authorized to manage this brain");
    }

    const parsed = pageInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Invalid GBrain page payload");
    }

    const slug = (
      parsed.data.slug?.trim() ||
      parsed.data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    ).slice(0, 80) || "page";

    const markdown = buildGBrainMarkdown(parsed.data, slug, brain.departmentId);
    const logicalKey = logicalKeyFor(brain.id, `gbrain/${parsed.data.pageType}/${slug}`);
    const version = await nextSourceVersion(brain.id, logicalKey);
    const sourceId = randomUUID();
    const now = new Date() as unknown as BrainSourceDoc["createdAt"];

    const source: BrainSourceDoc = {
      id: sourceId,
      brainId: brain.id,
      departmentId: brain.departmentId,
      type: "gbrain_page",
      pageType: parsed.data.pageType,
      slug,
      tags: parsed.data.tags,
      compiledTruth: parsed.data.compiledTruth,
      timelineNotes: parsed.data.timelineNotes,
      markdownContent: markdown,
      title: parsed.data.title,
      logicalKey,
      version,
      status: "processing",
      checksum: sha256Hex(markdown),
      contentType: "text/markdown",
      originalName: `${slug}.md`,
      textLength: markdown.length,
      chunkCount: 0,
      createdByUid: actor.uid,
      createdAt: now,
      updatedAt: now,
    };

    const db = getDb();
    await db.collection(COLLECTIONS.BRAIN_SOURCES).doc(sourceId).set(source);
    await ingestSource(source, markdown);

    const updatedSnap = await db.collection(COLLECTIONS.BRAIN_SOURCES).doc(sourceId).get();
    const finalSource = { id: updatedSnap.id, ...updatedSnap.data() } as BrainSourceDoc;

    await writeAuditLog({
      entityType: "brain_source",
      entityId: sourceId,
      action: "create_gbrain_page",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: { brainId: brain.id, pageType: parsed.data.pageType, slug },
    });

    return Response.json({ source: serializeDoc(finalSource) }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Create GBrain page error:", error);
    return Response.json({ error: "Failed to save GBrain page." }, { status: 500 });
  }
}
