import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  getDb,
  HttpError,
  httpErrorResponse,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { getBrainForActor } from "@/lib/adams-brain/access";
import { COLLECTIONS } from "@/lib/schema";
import type { BrainChunkDoc, BrainSourceDoc } from "@/lib/adams-harness/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const { brain, canManage } = await getBrainForActor(actor, id);
    if (!canManage) {
      throw new HttpError(403, "Not authorized to manage this brain");
    }

    const db = getDb();
    const [sourcesSnap, chunksSnap] = await Promise.all([
      db
        .collection(COLLECTIONS.BRAIN_SOURCES)
        .where("brainId", "==", brain.id)
        .where("status", "==", "ready")
        .limit(200)
        .get(),
      db
        .collection(COLLECTIONS.BRAIN_CHUNKS)
        .where("brainId", "==", brain.id)
        .limit(1000)
        .get(),
    ]);

    const chunksBySource = new Map<string, BrainChunkDoc[]>();
    for (const cDoc of chunksSnap.docs) {
      const c = { id: cDoc.id, ...cDoc.data() } as BrainChunkDoc;
      const list = chunksBySource.get(c.sourceId) ?? [];
      list.push(c);
      chunksBySource.set(c.sourceId, list);
    }

    const basePath = (brain.gbrainRepo?.basePath || `gbrain/${brain.departmentId}`).replace(
      /^\/+|\/+$/g,
      "",
    );

    const exportedPages: { path: string; title: string; content: string }[] = [];

    for (const sDoc of sourcesSnap.docs) {
      const s = { id: sDoc.id, ...sDoc.data() } as BrainSourceDoc;
      const slug =
        s.slug ||
        s.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60) ||
        s.id;
      const folder = s.pageType || s.connector || s.type || "docs";
      const filePath = `${basePath}/${folder}/${slug}.md`;

      let content = s.markdownContent;
      if (!content) {
        const sChunks = (chunksBySource.get(s.id) ?? []).sort(
          (a, b) => a.ordinal - b.ordinal,
        );
        const bodyText = sChunks.map((c) => c.text).join("\n\n");
        content = [
          "---",
          `title: "${s.title.replace(/"/g, '\\"')}"`,
          `slug: "${slug}"`,
          `type: "${folder}"`,
          `version: ${s.version}`,
          `department: "${brain.departmentId}"`,
          "---",
          "",
          `# ${s.title}`,
          "",
          "## Compiled Truth",
          bodyText,
        ].join("\n");
      }

      exportedPages.push({ path: filePath, title: s.title, content });
    }

    // Also build a RESOLVER.md index file matching garrytan/gbrain convention
    const resolverContent = [
      `# ${brain.name} — GBrain Resolver Index`,
      "",
      `> ${brain.description || `Adams Electric GBrain repository for department ${brain.departmentId}`}`,
      "",
      "## Pages",
      ...exportedPages.map((p) => `- [${p.title}](${p.path})`),
    ].join("\n");

    exportedPages.unshift({
      path: `${basePath}/RESOLVER.md`,
      title: "RESOLVER.md",
      content: resolverContent,
    });

    const githubToken = process.env.GITHUB_TOKEN?.trim();
    const repo = brain.gbrainRepo?.githubRepo?.trim();
    const branch = brain.gbrainRepo?.branch?.trim() || "main";
    let githubSyncedCount = 0;

    if (githubToken && repo && repo.includes("/")) {
      for (const page of exportedPages.slice(0, 25)) {
        const apiUrl = `https://api.github.com/repos/${repo}/contents/${page.path}`;
        const existingRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
          },
        }).catch(() => null);
        let sha: string | undefined;
        if (existingRes && existingRes.ok) {
          const existingJson = (await existingRes.json().catch(() => ({}))) as { sha?: string };
          sha = existingJson.sha;
        }
        const putRes = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Sync GBrain page ${page.path} from Adams Platform`,
            content: Buffer.from(page.content, "utf-8").toString("base64"),
            branch,
            ...(sha ? { sha } : {}),
          }),
        }).catch(() => null);
        if (putRes && putRes.ok) {
          githubSyncedCount++;
        }
      }
    }

    const syncedAt = new Date().toISOString();
    await db
      .collection(COLLECTIONS.ADAMS_BRAINS)
      .doc(brain.id)
      .update({
        "gbrainRepo.lastSyncedAt": syncedAt,
        updatedAt: new Date(),
      });

    await writeAuditLog({
      entityType: "brain",
      entityId: brain.id,
      action: "sync_gbrain",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: { pages: exportedPages.length, githubSyncedCount },
    });

    return Response.json({
      ok: true,
      syncedAt,
      githubSyncedCount,
      pages: exportedPages,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Sync GBrain error:", error);
    return Response.json({ error: "Failed to sync GBrain repository." }, { status: 500 });
  }
}
