import { NextRequest, NextResponse } from "next/server";
import { getDb, serializeDoc } from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";
import { answerBrainQuestion } from "@/lib/adams-brain/retrieval";
import {
  ingestSource,
  logicalKeyFor,
  nextSourceVersion,
  sha256Hex,
} from "@/lib/adams-brain/ingestion";
import type { BrainDoc, BrainSourceDoc, GBrainPageType } from "@/lib/adams-harness/types";
import { randomUUID } from "crypto";

function extractApiKey(request: NextRequest): string | null {
  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey) return headerKey;
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (bearer) return bearer;
  return new URL(request.url).searchParams.get("apiKey")?.trim() || null;
}

async function resolveBrainByApiKey(apiKey: string | null, brainIdParam?: string | null): Promise<BrainDoc | null> {
  if (!apiKey) return null;
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.ADAMS_BRAINS).limit(200).get();
  for (const docSnap of snap.docs) {
    const brain = { id: docSnap.id, ...docSnap.data() } as BrainDoc;
    if (!brain.isActive) continue;
    if (brainIdParam && brain.id !== brainIdParam) continue;
    if (brain.gbrainRepo?.apiKey && brain.gbrainRepo.apiKey === apiKey) {
      return brain;
    }
  }
  return null;
}

/**
 * GET /api/public/gbrain?q=...&brainId=...
 * Allows Hermes Agent / GBrain skills to search or list pages in an AdamsBrain repository.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const apiKey = extractApiKey(request);
    const brainIdParam = url.searchParams.get("brainId");
    const queryText = url.searchParams.get("q")?.trim();

    const brain = await resolveBrainByApiKey(apiKey, brainIdParam);
    if (!brain) {
      return NextResponse.json(
        { error: "Unauthorized or invalid GBrain API key" },
        { status: 401 },
      );
    }

    if (queryText) {
      const answer = await answerBrainQuestion(brain.id, brain.departmentId, queryText);
      return NextResponse.json({
        brainId: brain.id,
        brainName: brain.name,
        question: queryText,
        ...answer,
      });
    }

    const db = getDb();
    const sourcesSnap = await db
      .collection(COLLECTIONS.BRAIN_SOURCES)
      .where("brainId", "==", brain.id)
      .where("status", "==", "ready")
      .limit(200)
      .get();

    const pages = sourcesSnap.docs.map((d) => {
      const s = serializeDoc({ id: d.id, ...d.data() } as BrainSourceDoc);
      return {
        id: s.id,
        title: s.title,
        slug: s.slug,
        pageType: s.pageType || s.type,
        tags: s.tags || [],
        version: s.version,
        compiledTruth: s.compiledTruth,
        markdownContent: s.markdownContent,
        updatedAt: s.updatedAt,
      };
    });

    return NextResponse.json({
      brainId: brain.id,
      brainName: brain.name,
      departmentId: brain.departmentId,
      count: pages.length,
      pages,
    });
  } catch (error) {
    console.error("Public GBrain GET error:", error);
    return NextResponse.json({ error: "Failed to query GBrain" }, { status: 500 });
  }
}

/**
 * POST /api/public/gbrain
 * Allows Hermes Agent / GBrain skills to query or write/update a GBrain Markdown page.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = extractApiKey(request);
    const body = (await request.json().catch(() => ({}))) as {
      brainId?: string;
      action?: "query" | "put_page";
      question?: string;
      title?: string;
      slug?: string;
      pageType?: GBrainPageType;
      tags?: string[];
      compiledTruth?: string;
      timelineNotes?: string;
    };

    const brain = await resolveBrainByApiKey(apiKey, body.brainId);
    if (!brain) {
      return NextResponse.json(
        { error: "Unauthorized or invalid GBrain API key" },
        { status: 401 },
      );
    }

    if (body.action === "query" || body.question) {
      const q = (body.question || "").trim();
      if (!q) {
        return NextResponse.json({ error: "Missing question" }, { status: 400 });
      }
      const answer = await answerBrainQuestion(brain.id, brain.departmentId, q);
      return NextResponse.json({
        brainId: brain.id,
        brainName: brain.name,
        question: q,
        ...answer,
      });
    }

    // Default: put_page (create/update GBrain page from Hermes)
    const title = (body.title || "").trim();
    const compiledTruth = (body.compiledTruth || "").trim();
    if (!title || !compiledTruth) {
      return NextResponse.json(
        { error: "title and compiledTruth are required to write a GBrain page" },
        { status: 400 },
      );
    }

    const pageType: GBrainPageType = body.pageType || "sop";
    const slug =
      (
        body.slug?.trim() ||
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      ).slice(0, 80) || "page";

    const markdown = [
      "---",
      `title: "${title.replace(/"/g, '\\"')}"`,
      `slug: "${slug}"`,
      `type: "${pageType}"`,
      `department: "${brain.departmentId}"`,
      "---",
      "",
      `# ${title}`,
      "",
      "## Compiled Truth",
      compiledTruth,
      ...(body.timelineNotes
        ? ["", "## Timeline & Evidence", `- ${body.timelineNotes}`]
        : []),
    ].join("\n");

    const logicalKey = logicalKeyFor(brain.id, `gbrain/${pageType}/${slug}`);
    const version = await nextSourceVersion(brain.id, logicalKey);
    const sourceId = randomUUID();
    const now = new Date() as unknown as BrainSourceDoc["createdAt"];

    const source: BrainSourceDoc = {
      id: sourceId,
      brainId: brain.id,
      departmentId: brain.departmentId,
      type: "gbrain_page",
      pageType,
      slug,
      tags: body.tags || [],
      compiledTruth,
      timelineNotes: body.timelineNotes || "",
      markdownContent: markdown,
      title,
      logicalKey,
      version,
      status: "processing",
      checksum: sha256Hex(markdown),
      contentType: "text/markdown",
      originalName: `${slug}.md`,
      textLength: markdown.length,
      chunkCount: 0,
      createdByUid: "hermes-gbrain-api",
      createdAt: now,
      updatedAt: now,
    };

    const db = getDb();
    await db.collection(COLLECTIONS.BRAIN_SOURCES).doc(sourceId).set(source);
    await ingestSource(source, markdown);

    return NextResponse.json(
      { ok: true, brainId: brain.id, sourceId, slug, version },
      { status: 201 },
    );
  } catch (error) {
    console.error("Public GBrain POST error:", error);
    return NextResponse.json({ error: "Failed to process GBrain request" }, { status: 500 });
  }
}
