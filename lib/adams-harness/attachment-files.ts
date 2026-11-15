import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";

/** Firestore documents cap at 1 MiB, so Base64 payloads are split into chunks well under that. */
const CHUNK_CHARS = 700_000;
export const MAX_INTERVIEW_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export interface InterviewAttachmentFileMeta {
  fileId: string;
  interviewId: string;
  fileName: string;
  mimeType: string;
  size: number;
  chunkCount: number;
  createdAt: Date;
}

/**
 * Persist an interview attachment as Base64 in Firestore. Each chunk is its own
 * document in `interviewAttachmentFiles` keyed `${fileId}_${index}`; chunk 0 carries the metadata.
 */
export async function storeInterviewAttachmentBase64(input: {
  interviewId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<InterviewAttachmentFileMeta> {
  if (input.buffer.length > MAX_INTERVIEW_ATTACHMENT_BYTES) {
    throw new Error(`Attachment exceeds ${MAX_INTERVIEW_ATTACHMENT_BYTES / 1024 / 1024} MB limit`);
  }
  const db = getDb();
  const base64 = input.buffer.toString("base64");
  const chunkCount = Math.max(1, Math.ceil(base64.length / CHUNK_CHARS));
  const fileId = randomUUID();
  const meta: InterviewAttachmentFileMeta = {
    fileId,
    interviewId: input.interviewId,
    fileName: input.fileName,
    mimeType: input.mimeType || "application/octet-stream",
    size: input.buffer.length,
    chunkCount,
    createdAt: new Date(),
  };

  const collection = db.collection(COLLECTIONS.INTERVIEW_ATTACHMENT_FILES);
  for (let start = 0; start < chunkCount; start += 10) {
    const batch = db.batch();
    for (let index = start; index < Math.min(chunkCount, start + 10); index++) {
      batch.set(collection.doc(`${fileId}_${index}`), {
        ...meta,
        chunkIndex: index,
        data: base64.slice(index * CHUNK_CHARS, (index + 1) * CHUNK_CHARS),
      });
    }
    await batch.commit();
  }
  return meta;
}

export async function listInterviewAttachmentFiles(interviewId: string): Promise<InterviewAttachmentFileMeta[]> {
  const snap = await getDb()
    .collection(COLLECTIONS.INTERVIEW_ATTACHMENT_FILES)
    .where("interviewId", "==", interviewId)
    .where("chunkIndex", "==", 0)
    .select("fileId", "interviewId", "fileName", "mimeType", "size", "chunkCount", "createdAt")
    .get();
  return snap.docs.map((d) => d.data() as InterviewAttachmentFileMeta);
}

export async function readInterviewAttachmentFile(fileId: string) {
  const db = getDb();
  const first = await db.collection(COLLECTIONS.INTERVIEW_ATTACHMENT_FILES).doc(`${fileId}_0`).get();
  if (!first.exists) return null;
  const meta = first.data() as InterviewAttachmentFileMeta & { data: string };
  const refs = Array.from({ length: meta.chunkCount - 1 }, (_, i) =>
    db.collection(COLLECTIONS.INTERVIEW_ATTACHMENT_FILES).doc(`${fileId}_${i + 1}`),
  );
  const rest = refs.length ? await db.getAll(...refs) : [];
  const base64 = meta.data + rest.map((snap) => (snap.data()?.data as string) || "").join("");
  return { meta, base64 };
}
