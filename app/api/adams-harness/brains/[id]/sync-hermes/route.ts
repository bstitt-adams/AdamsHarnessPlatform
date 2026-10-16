import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
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
import type { Timestamp } from "firebase/firestore";

const ts = (date: Date = new Date()): Timestamp =>
  date as unknown as Timestamp;

type Ctx = { params: Promise<{ id: string }> };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const { brain, canManage } = await getBrainForActor(actor, id);
    if (!canManage) {
      throw new HttpError(403, "Only brain owners or admins can sync to Hermes");
    }

    const db = getDb();
    const [sourcesSnap, chunksSnap] = await Promise.all([
      db
        .collection(COLLECTIONS.BRAIN_SOURCES)
        .where("brainId", "==", brain.id)
        .where("status", "==", "ready")
        .limit(300)
        .get(),
      db
        .collection(COLLECTIONS.BRAIN_CHUNKS)
        .where("brainId", "==", brain.id)
        .limit(1500)
        .get(),
    ]);

    const sources = sourcesSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as BrainSourceDoc,
    );
    const chunks = chunksSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as BrainChunkDoc,
    );

    const chunksBySource = new Map<string, BrainChunkDoc[]>();
    for (const c of chunks) {
      const list = chunksBySource.get(c.sourceId) ?? [];
      list.push(c);
      chunksBySource.set(c.sourceId, list);
    }

    const repoSlug = slugify(brain.name) || brain.id;
    const basePath = (brain.gbrainRepo?.basePath || `gbrain/${repoSlug}`).replace(
      /^\/+|\/+$/g,
      "",
    );

    const compiledPages: {
      path: string;
      title: string;
      pageType: string;
      version: number;
      chunkCount: number;
      content: string;
    }[] = [];

    for (const src of sources) {
      const folder = src.pageType || src.type || "document";
      const fileSlug = src.slug || slugify(src.title) || src.id;
      const srcChunks = (chunksBySource.get(src.id) ?? []).sort(
        (a, b) => a.ordinal - b.ordinal,
      );

      const content =
        src.markdownContent ||
        [
          "---",
          `title: "${src.title.replace(/"/g, '\\"')}"`,
          `source_id: "${src.id}"`,
          `type: "${folder}"`,
          `department: "${brain.departmentId}"`,
          `version: ${src.version}`,
          "---",
          "",
          `# ${src.title}`,
          "",
          "## Compiled Truth",
          "",
          src.compiledTruth ||
            srcChunks.map((c) => c.text).join("\n\n") ||
            `Indexed source (${src.chunkCount} chunks).`,
          ...(src.timelineNotes
            ? ["", "## Timeline & Evidence", "", src.timelineNotes]
            : []),
        ].join("\n");

      compiledPages.push({
        path: `${basePath}/${folder}/${fileSlug}.md`,
        title: src.title,
        pageType: folder,
        version: src.version,
        chunkCount: src.chunkCount,
        content,
      });
    }

    const resolverMd = [
      `# RESOLVER — ${brain.name} (ABrAIn / GBrain)`,
      "",
      `> Opinionated Hermes Agent & GBrain Knowledge Index for department \`${brain.departmentId}\`.`,
      `> Total Indexed Sources: ${compiledPages.length} | Total Chunks: ${chunks.length}`,
      "",
      "## Hermes Harness Usage",
      "- Query Endpoint: `POST /api/public/gbrain`",
      `- Brain ID: \`${brain.id}\``,
      "- Channels Grounded: **Portal Chat**, **Hermes Harness**, **Telegram Bot**, **Microsoft Teams**",
      "",
      "## Indexed Knowledge Pages",
      ...compiledPages.map(
        (f) =>
          `- [${f.title}](${f.path}) — type: \`${f.pageType}\`, v${f.version} (${f.chunkCount} chunks)`,
      ),
    ].join("\n");

    let localWorkspaceSynced = false;
    let localWorkspaceTarget =
      brain.gbrainRepo?.hermesWorkspacePath?.trim() ||
      process.env.HERMES_GBRAIN_PATH?.trim() ||
      "";

    // Write directly to local Hermes workspace if running locally on a writable filesystem
    if (localWorkspaceTarget || process.platform === "win32") {
      try {
        const rootDir =
          localWorkspaceTarget ||
          path.join(
            process.env.LOCALAPPDATA || "C:\\Users\\BrianStitt\\AppData\\Local",
            "hermes",
            "memories",
            "gbrain",
            repoSlug,
          );
        await mkdir(rootDir, { recursive: true });
        await writeFile(path.join(rootDir, "RESOLVER.md"), resolverMd, "utf8");
        await writeFile(
          path.join(rootDir, "HERMES_MEMORY.json"),
          JSON.stringify(
            {
              brainId: brain.id,
              name: brain.name,
              departmentId: brain.departmentId,
              syncedAt: new Date().toISOString(),
              pagesCount: compiledPages.length,
              chunksCount: chunks.length,
              pages: compiledPages,
            },
            null,
            2,
          ),
          "utf8",
        );
        localWorkspaceTarget = rootDir;
        localWorkspaceSynced = true;
      } catch {
        // Non-blocking on serverless read-only filesystems (e.g. Vercel)
      }
    }

    const syncedAt = new Date().toISOString();
    const updatedRepoConfig = {
      ...(brain.gbrainRepo ?? {}),
      enabled: true,
      basePath,
      ...(localWorkspaceTarget
        ? { hermesWorkspacePath: localWorkspaceTarget }
        : {}),
      apiKey:
        brain.gbrainRepo?.apiKey ||
        `gbrain_${brain.id.slice(0, 8)}_${Date.now().toString(36)}`,
      lastSyncedAt: syncedAt,
      hermesSyncStatus: "synced" as const,
      hermesLastSyncedAt: syncedAt,
      hermesSyncedPagesCount: compiledPages.length,
      hermesSyncedChunksCount: chunks.length,
      telegramEnabled: true,
      teamsEnabled: true,
    };

    await db
      .collection(COLLECTIONS.ADAMS_BRAINS)
      .doc(brain.id)
      .update({
        isActive: true,
        gbrainRepo: updatedRepoConfig,
        updatedAt: ts(),
      });

    await writeAuditLog({
      entityType: "brain",
      entityId: brain.id,
      action: "sync_hermes",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: {
        pagesCount: compiledPages.length,
        chunksCount: chunks.length,
        localWorkspaceSynced,
      },
    });

    return Response.json({
      success: true,
      brainId: brain.id,
      syncedAt,
      pagesCount: compiledPages.length,
      chunksCount: chunks.length,
      localWorkspaceSynced,
      hermesWorkspacePath: localWorkspaceTarget || null,
      gbrainRepo: updatedRepoConfig,
      resolverMd,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Hermes brain sync error:", error);
    return Response.json(
      { error: "Failed to sync repository to Hermes." },
      { status: 500 },
    );
  }
}
