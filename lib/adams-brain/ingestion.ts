import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getDb, HttpError } from "@/lib/adams-harness/server-store";
import { COLLECTIONS } from "@/lib/schema";
import type { BrainSourceDoc } from "@/lib/adams-harness/types";
import type { Timestamp } from "firebase/firestore";

const ts = (date: Date = new Date()): Timestamp =>
  date as unknown as Timestamp;

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 500_000;
const CHUNK_TARGET = 2500;
const CHUNK_HARD_MAX = 3500;
const CHUNK_OVERLAP = 250;
const MAX_CHUNKS = 250;
const MAX_TERMS_PER_CHUNK = 200;

const ALLOWED_EXTENSIONS: Record<string, "text" | "pdf" | "docx" | "csv" | "json"> = {
  ".txt": "text",
  ".md": "text",
  ".csv": "csv",
  ".json": "json",
  ".pdf": "pdf",
  ".docx": "docx",
};

const ALLOWED_MIME_BY_KIND: Record<string, string[]> = {
  text: ["text/plain", "text/markdown", "application/octet-stream"],
  csv: ["text/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream"],
  json: ["application/json", "text/plain", "application/octet-stream"],
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

export function classifyUpload(
  contentType: string,
  fileName: string,
): "text" | "pdf" | "docx" | "csv" | "json" {
  const ext = fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
  const kind = ALLOWED_EXTENSIONS[ext];
  const mime = (contentType || "application/octet-stream").toLowerCase().split(";")[0].trim();
  const allowedMimes = kind ? ALLOWED_MIME_BY_KIND[kind] : undefined;
  if (!kind || !allowedMimes || !allowedMimes.includes(mime)) {
    throw new HttpError(
      400,
      "Only .txt, .md, .csv, .json, .pdf, and .docx files are supported",
    );
  }
  return kind;
}

export function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractText(
  buffer: Buffer,
  kind: "text" | "pdf" | "docx" | "csv" | "json",
): Promise<string> {
  let text: string;
  if (kind === "text" || kind === "csv") {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new HttpError(400, "File is not valid UTF-8 text");
    }
    if (kind === "csv") {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 1) {
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        const formattedRows = lines.slice(1).map((row, idx) => {
          const cols = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          const pairs = headers
            .map((h, i) => `${h || `Col${i + 1}`}: ${cols[i] ?? ""}`)
            .join(" | ");
          return `Row ${idx + 1}: ${pairs}`;
        });
        text = `CSV Dataset (${lines.length - 1} rows)\nColumns: ${headers.join(", ")}\n\n${formattedRows.join("\n\n")}`;
      }
    }
  } else if (kind === "json") {
    let rawJson: string;
    try {
      rawJson = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new HttpError(400, "File is not valid UTF-8 JSON");
    }
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        text = parsed
          .map((item, idx) => `Record ${idx + 1}:\n${JSON.stringify(item, null, 2)}`)
          .join("\n\n");
      } else {
        text = JSON.stringify(parsed, null, 2);
      }
    } catch {
      text = rawJson;
    }
  } else if (kind === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy().catch(() => {});
    }
  } else {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  }
  const normalized = normalizeText(text);
  if (!normalized) {
    throw new HttpError(400, "No readable text could be extracted");
  }
  if (normalized.length > MAX_TEXT_CHARS) {
    throw new HttpError(400, "Extracted text exceeds 500,000 characters");
  }
  return normalized;
}

export interface BrainChunk {
  ordinal: number;
  text: string;
  normalizedTerms: string[];
}

export function normalizedTerms(text: string): string[] {
  const terms = new Set<string>();
  for (const token of text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []) {
    terms.add(token);
    if (terms.size >= MAX_TERMS_PER_CHUNK) break;
  }
  return [...terms];
}

function overlapTail(text: string): string {
  const tail = text.slice(-CHUNK_OVERLAP);
  const boundary = tail.search(/[\n.!?]\s/);
  return boundary >= 0 ? tail.slice(boundary + 2).trimStart() : tail;
}

export function chunkText(text: string): BrainChunk[] {
  const normalized = normalizeText(text);
  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: { ordinal: number; text: string }[] = [];
  let current = "";
  let hasNewContent = false;

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed && hasNewContent) {
      chunks.push({ ordinal: chunks.length, text: trimmed });
    }
    current = trimmed ? overlapTail(trimmed) : "";
    hasNewContent = false;
  };

  for (const paragraph of paragraphs) {
    const para = paragraph.trim();
    if (!para) continue;
    if (current && current.length + para.length + 2 > CHUNK_TARGET) {
      flush();
    }
    if (para.length > CHUNK_HARD_MAX) {
      flush();
      let last = "";
      for (let i = 0; i < para.length && chunks.length < MAX_CHUNKS; i += CHUNK_HARD_MAX - CHUNK_OVERLAP) {
        last = para.slice(i, i + CHUNK_HARD_MAX);
        chunks.push({ ordinal: chunks.length, text: last });
      }
      current = last ? overlapTail(last) : "";
      hasNewContent = false;
      continue;
    }
    current =
      current && current.length + para.length + 2 <= CHUNK_HARD_MAX
        ? `${current}\n\n${para}`
        : para;
    hasNewContent = true;
    if (chunks.length >= MAX_CHUNKS) break;
  }
  flush();

  const limited = chunks.slice(0, MAX_CHUNKS).map((c, i) => ({
    ordinal: i,
    text: c.text.slice(0, CHUNK_HARD_MAX),
  }));
  return limited.map((c) => ({
    ...c,
    normalizedTerms: normalizedTerms(c.text),
  }));
}

export function logicalKeyFor(brainId: string, key: string): string {
  const normalized = key.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  return `${brainId}/${normalized.slice(0, 180)}`;
}

export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^\w .()-]+/g, "_").slice(0, 200);
  return cleaned || "file";
}

export async function findSourceByLogicalKey(
  brainId: string,
  logicalKey: string,
): Promise<BrainSourceDoc[]> {
  const snap = await getDb()
    .collection(COLLECTIONS.BRAIN_SOURCES)
    .where("brainId", "==", brainId)
    .where("logicalKey", "==", logicalKey)
    .orderBy("version", "desc")
    .limit(10)
    .get();
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as BrainSourceDoc,
  );
}

export async function nextSourceVersion(
  brainId: string,
  logicalKey: string,
): Promise<number> {
  const versions = await findSourceByLogicalKey(brainId, logicalKey);
  return (versions[0]?.version ?? 0) + 1;
}

export async function ingestSource(
  source: BrainSourceDoc,
  text: string,
): Promise<void> {
  const db = getDb();
  try {
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new HttpError(400, "No content chunks produced");
    }
    const oldChunks = await db
      .collection(COLLECTIONS.BRAIN_CHUNKS)
      .where("sourceId", "==", source.id)
      .limit(MAX_CHUNKS + 1)
      .get();
    if (oldChunks.docs.length > 0) {
      const deletes = db.batch();
      for (const old of oldChunks.docs) {
        deletes.delete(old.ref);
      }
      await deletes.commit();
    }
    const now = ts();
    const writes = db.batch();
    for (const chunk of chunks) {
      const chunkId = `${source.id}_${String(chunk.ordinal).padStart(4, "0")}`;
      const ref = db.collection(COLLECTIONS.BRAIN_CHUNKS).doc(chunkId);
      writes.set(ref, {
        id: chunkId,
        brainId: source.brainId,
        sourceId: source.id,
        departmentId: source.departmentId,
        ordinal: chunk.ordinal,
        sourceTitle: source.title,
        text: chunk.text.slice(0, 4000),
        normalizedTerms: chunk.normalizedTerms,
        createdAt: now,
      });
    }
    writes.update(db.collection(COLLECTIONS.BRAIN_SOURCES).doc(source.id), {
      status: "ready",
      textLength: text.length,
      chunkCount: chunks.length,
      checksum: sha256Hex(text),
      refreshedAt: now,
      updatedAt: now,
      failureReason: FieldValue.delete(),
    });
    await writes.commit();
    const prior = await db
      .collection(COLLECTIONS.BRAIN_SOURCES)
      .where("brainId", "==", source.brainId)
      .where("logicalKey", "==", source.logicalKey)
      .where("status", "==", "ready")
      .limit(50)
      .get();
    const retire = db.batch();
    let retiring = false;
    for (const doc of prior.docs) {
      const other = doc.data() as BrainSourceDoc;
      if (doc.id !== source.id && other.version < source.version) {
        retire.update(doc.ref, { status: "retired", updatedAt: ts() });
        retiring = true;
      }
    }
    if (retiring) await retire.commit();
  } catch (error) {
    await db
      .collection(COLLECTIONS.BRAIN_SOURCES)
      .doc(source.id)
      .update({
        status: "failed",
        failureReason:
          (error instanceof Error ? error.message : "ingestion failed").slice(0, 500),
        updatedAt: ts(),
      });
    throw error;
  }
}
