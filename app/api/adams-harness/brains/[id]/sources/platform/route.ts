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
  isAdminActor,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { getBrainForActor } from "@/lib/adams-brain/access";
import {
  ingestSource,
  logicalKeyFor,
  findSourceByLogicalKey,
  nextSourceVersion,
  sha256Hex,
} from "@/lib/adams-brain/ingestion";
import { collectPlatformDocuments } from "@/lib/adams-brain/platform-sources";
import { COLLECTIONS } from "@/lib/schema";
import {
  brainConnectorSchema,
  type BrainSourceDoc,
} from "@/lib/adams-harness/types";

const platformSchema = z.strictObject({ connector: brainConnectorSchema });

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { id } = await params;
    const { brain, canManage } = await getBrainForActor(actor, id);
    if (!canManage) {
      throw new HttpError(403, "Not authorized to manage this brain");
    }
    const parsed = platformSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Invalid connector");
    }
    const connector = parsed.data.connector;
    if (connector === "site_calendars" && !isAdminActor(actor)) {
      throw new HttpError(
        403,
        "Company-wide calendars can only be added by an admin",
      );
    }
    const documents = await collectPlatformDocuments(
      connector,
      brain.departmentId,
    );

    const db = getDb();
    const seen = new Set<string>();
    const results: BrainSourceDoc[] = [];
    for (const doc of documents) {
      const logicalKey = logicalKeyFor(brain.id, `${connector}/${doc.logicalKey}`);
      seen.add(logicalKey);
      const checksum = sha256Hex(doc.text);
      const existing = await findSourceByLogicalKey(brain.id, logicalKey);
      const active = existing.find(
        (s) => s.status === "ready" || s.status === "processing",
      );
      if (active && active.checksum === checksum) {
        results.push(active);
        continue;
      }
      const sourceId = randomUUID();
      const version = await nextSourceVersion(brain.id, logicalKey);
      const now = new Date() as unknown as BrainSourceDoc["createdAt"];
      const source: BrainSourceDoc = {
        id: sourceId,
        brainId: brain.id,
        departmentId: brain.departmentId,
        type: "platform",
        connector,
        title: doc.title,
        logicalKey,
        version,
        status: "processing",
        checksum,
        textLength: 0,
        chunkCount: 0,
        createdByUid: actor.uid,
        createdAt: now,
        updatedAt: now,
      };
      await db.collection(COLLECTIONS.BRAIN_SOURCES).doc(sourceId).set(source);
      await ingestSource(source, doc.text);
      results.push(
        (await db
          .collection(COLLECTIONS.BRAIN_SOURCES)
          .doc(sourceId)
          .get()
          .then((s) => s.data())) as BrainSourceDoc,
      );
    }

    const staleSnap = await db
      .collection(COLLECTIONS.BRAIN_SOURCES)
      .where("brainId", "==", brain.id)
      .where("connector", "==", connector)
      .where("status", "==", "ready")
      .limit(200)
      .get();
    const retire = db.batch();
    let retiring = false;
    for (const staleDoc of staleSnap.docs) {
      const stale = staleDoc.data() as BrainSourceDoc;
      if (!seen.has(stale.logicalKey)) {
        retire.update(staleDoc.ref, {
          status: "retired",
          updatedAt: new Date() as unknown as BrainSourceDoc["updatedAt"],
        });
        retiring = true;
      }
    }
    if (retiring) await retire.commit();

    await writeAuditLog({
      entityType: "brain_source",
      entityId: brain.id,
      action: "platform_refresh",
      actorUid: actor.uid,
      actorName: actor.email,
      actorRole: actor.role,
      detail: { connector, documents: documents.length },
    });
    return Response.json({
      connector,
      count: results.length,
      sources: results.map((s) => {
        const safe: Partial<BrainSourceDoc> = { ...s };
        delete safe.storagePath;
        return serializeDoc(safe);
      }),
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Brain platform refresh error:", error);
    return Response.json({ error: "Refresh failed." }, { status: 500 });
  }
}
