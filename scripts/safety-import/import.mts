/**
 * Batch LMS import: reads the safety-import manifest and creates a draft
 * course per deck via the same code path as the admin Import PowerPoint
 * button (lib/academy/pptx-import.ts → Admin SDK).
 *
 * Resume-safe: entries already marked imported/failed are skipped.
 * Usage: npx tsx scripts/safety-import/import.mts [--limit N] [--only "topic"]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const MANIFEST = path.resolve("scripts/safety-import/data/manifest.json");
const manifest = JSON.parse(readFileSync(MANIFEST, "utf8").replace(/^\uFEFF/, ""));

const limitArg = process.argv.indexOf("--limit");
const onlyArg = process.argv.indexOf("--only");
const concArg = process.argv.indexOf("--concurrency");
const retryArg = process.argv.includes("--retry-failed");
const limit = limitArg > -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;
const only = onlyArg > -1 ? process.argv[onlyArg + 1].toLowerCase() : null;
const concurrency = Math.min(Math.max(concArg > -1 ? parseInt(process.argv[concArg + 1], 10) : 1, 1), 5);

const { parsePptx } = await import("../../lib/academy/pptx");
const { importSlidesAsCourse } = await import("../../lib/academy/pptx-import");

const save = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
if (retryArg) {
  for (const e of manifest.entries) if (e.status === "failed") { e.status = "pending"; delete e.error; }
}
const pending = manifest.entries.filter(
  (e: any) => e.status === "pending" && (!only || e.topic.includes(only) || e.title.toLowerCase().includes(only)),
);
console.log(`Pending: ${pending.length} decks (limit ${limit === Infinity ? "none" : limit}, concurrency ${concurrency})`);

let idx = 0, done = 0, failed = 0;
async function worker() {
  while (done + failed < limit && idx < pending.length) {
    const e = pending[idx++];
    const file = e.importPath || e.sourcePath;
    const t0 = Date.now();
    try {
      const slides = await parsePptx(readFileSync(file));
      if (!slides.length || slides.reduce((n, s) => n + s.bullets.length + s.title.length, 0) < 10) {
        throw new Error("deck has no usable text");
      }
      const result = await importSlidesAsCourse(slides, {
        title: e.title,
        instructorName: "Adams Electric Safety",
        isFree: true,
      });
      e.status = "imported";
      e.courseId = result.courseId;
      done++;
      console.log(`[${done + failed}] OK   ${e.title} → ${result.courseId} (${result.lessons} lessons, ${result.quizzes} quizzes, ${Math.round((Date.now() - t0) / 1000)}s)`);
    } catch (err) {
      e.status = "failed";
      e.error = (err as Error).message;
      failed++;
      console.log(`[${done + failed}] FAIL ${e.title}: ${e.error}`);
    }
    save();
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
console.log(`\nDone: ${done} imported, ${failed} failed. Manifest updated.`);
process.exit(0);
