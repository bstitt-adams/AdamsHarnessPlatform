/**
 * Scans Z:\Shared\Safety (Main Folder) for PowerPoint decks and builds a
 * deduplicated import manifest for the LMS batch importer.
 *
 * Usage: npx tsx scripts/safety-import/scan.mts
 * Output: scripts/safety-import/data/manifest.json
 */
import { writeFileSync, mkdirSync, readFileSync, statSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = "Z:\\Shared\\Safety (Main Folder)";
const OUT_DIR = path.resolve("scripts/safety-import/data");
const MANIFEST = path.join(OUT_DIR, "manifest.json");

// Folder path segments that hold non-source material.
const EXCLUDED_DIRS = /do not use|old safety|archive|certificates?|cert templates|completed sssp/i;
// Dated per-employee signed copies: "2026-05-13 - Fire Safety - John Smith.pptx"
const EMPLOYEE_COPY = /^\d{4}-\d{2}-\d{2}\s*-\s*.+\s*-\s*.+\.(pptx?)$/i;
const TEMPLATE = /template/i;
// Decks that are answer keys, question banks, or reference handouts — not courses.
const NON_COURSE = /answer|question|reference materials|print friendly|\(old\)|\(delete\)|handout/i;

/** Repairs latin1→utf8 mojibake baked into some filenames (Ã±→ñ, Ã³→ó). */
function fixMojibake(s: string): string {
  if (!/[ÃÂâ]/.test(s)) return s;
  try {
    const fixed = Buffer.from(s, "latin1").toString("utf8");
    return fixed.includes("\uFFFD") ? s : fixed;
  } catch {
    return s;
  }
}

const isSpanish = (name: string) => /spanish|espa[ñn]ol|[-_ ]sp[-_.]/i.test(name);

/** Strips revision/language/noise suffixes so variants group as one topic. */
function topicKey(file: string): string {
  return fixMojibake(path.basename(file))
    .replace(/\.pptx?$/i, "")
    .toLowerCase()
    .replace(/\(?(spanish|espa[ñn]ol)\)?/g, " ")
    .replace(/\bhazrec\b/g, "hazard recognition")
    .replace(/\bedited for \d+ ?mins?\b/g, " ")
    .replace(/\brev(?:ision|amp)?\s*\d*(\.\d+)?\b/g, " ")
    .replace(/\bv\.?\d+(\.\d+){0,2}\b/g, " ")
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, " ") // dates like 10.13.25, 05.18.15
    .replace(/\b\d{6}\b/g, " ") // compact dates like 100625
    .replace(/\b(ci|final|copy|updated|new|draft|edit|edited|master|version|english|iorb|jared|delete|old)\b/g, " ")
    .replace(/^\(\w?\d+\)\s*/g, " ")
    .replace(/\(\d+\)/g, " ")
    .replace(/adams( electric)?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function prettyTitle(file: string): string {
  return fixMojibake(path.basename(file))
    .replace(/\.pptx?$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\bjared edit\b/gi, " ")
    .replace(/\bedited for \d+ ?mins?\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[-–—]\s*|\s*[-–—]\s*$/g, "")
    .trim();
}

interface ManifestEntry {
  topic: string;
  title: string;
  lang: "en" | "es";
  sourcePath: string;
  importPath?: string; // set after .ppt conversion
  format: "pptx" | "ppt";
  mtime: string;
  sizeBytes: number;
  slideCount?: number;
  textChars?: number;
  lowText?: boolean;
  status: "pending" | "needs-conversion" | "imported" | "failed" | "skipped";
  courseId?: string;
  error?: string;
  variants: string[]; // all file paths collapsed into this topic
}

function walk(dir: string, out: string[] = []): string[] {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, out);
    else if (d.isFile()) out.push(p);
  }
  return out;
}

const allFiles = walk(ROOT);
const pptFiles = allFiles.filter((f) => /\.pptx?$/i.test(f));
console.log(`Found ${pptFiles.length} PowerPoint files`);

const excludedDir = pptFiles.filter((f) => EXCLUDED_DIRS.test(f));
const employeeCopies = pptFiles.filter((f) => EMPLOYEE_COPY.test(path.basename(f)));
const templates = pptFiles.filter((f) => TEMPLATE.test(path.basename(f)));
const nonCourse = pptFiles.filter((f) => NON_COURSE.test(path.basename(f)));
const excludedSet = new Set([...excludedDir, ...employeeCopies, ...templates, ...nonCourse]);
const candidates = pptFiles.filter((f) => !excludedSet.has(f));
console.log(`Excluded: ${excludedDir.length} archive/old, ${employeeCopies.length} employee copies, ${templates.length} templates, ${nonCourse.length} answer/question/reference decks`);
console.log(`Candidates: ${candidates.length}`);

// Group by topic+language, prefer .pptx over .ppt, then highest Rev, then newest mtime.
const groups = new Map<string, typeof candidates>();
for (const f of candidates) {
  const key = `${topicKey(f)}|${isSpanish(path.basename(f)) ? "es" : "en"}`;
  groups.set(key, [...(groups.get(key) || []), f]);
}

const revOf = (f: string) => {
  const m = path.basename(f).match(/\brev(?:ision)?\s*(\d+(?:\.\d+)?)/i) || path.basename(f).match(/\bv(\d+(?:\.\d+)?)\b/i);
  return m ? parseFloat(m[1]) : 0;
};

let priorEntries: Record<string, any> = {};
try {
  for (const e of JSON.parse(readFileSync(MANIFEST, "utf8").replace(/^FEFF/, "")).entries || []) priorEntries[e.sourcePath] = e;
} catch {}

const entries: ManifestEntry[] = [];
for (const [, files] of groups) {
  const sorted = files.sort((a, b) => {
    const aPptx = /\.pptx$/i.test(a) ? 1 : 0;
    const bPptx = /\.pptx$/i.test(b) ? 1 : 0;
    if (aPptx !== bPptx) return bPptx - aPptx;
    const rev = revOf(b) - revOf(a);
    if (rev !== 0) return rev;
    return statSync(b).mtimeMs - statSync(a).mtimeMs;
  });
  const best = sorted[0];
  const base = path.basename(best);
  const es = isSpanish(base);
  const isPpt = /\.ppt$/i.test(best);
  const prior = priorEntries[best];
  const converted = prior?.importPath;
  entries.push({
    topic: topicKey(best),
    title: prettyTitle(best) + (es ? " (Español)" : ""),
    lang: es ? "es" : "en",
    sourcePath: best,
    importPath: converted,
    format: converted ? "pptx" : isPpt ? "ppt" : "pptx",
    mtime: statSync(best).mtime.toISOString(),
    sizeBytes: statSync(best).size,
    status: converted ? "pending" : isPpt ? "needs-conversion" : "pending",
    variants: sorted,
  });
}

entries.sort((a, b) => a.title.localeCompare(b.title));
console.log(`Unique topics: ${entries.length} (${entries.filter((e) => e.format === "ppt").length} legacy .ppt, ${entries.filter((e) => e.lang === "es").length} Spanish)`);

// Pre-parse .pptx files to measure usable text. Cached by sourcePath from any
// prior manifest so re-scans after rule changes stay fast.
let prior: Record<string, { slideCount?: number; textChars?: number; lowText?: boolean }> = {};
try {
  for (const e of JSON.parse(readFileSync(MANIFEST, "utf8").replace(/^FEFF/, "")).entries || []) prior[e.sourcePath] = e;
} catch {}

const { parsePptx } = await import("../../lib/academy/pptx");
let i = 0;
for (const e of entries) {
  if (e.format !== "pptx") continue;
  const cached = prior[e.sourcePath];
  if (cached?.slideCount !== undefined) {
    e.slideCount = cached.slideCount;
    e.textChars = cached.textChars;
    e.lowText = cached.lowText;
    if (cached.textChars === 0) e.status = "skipped", (e.error = "no extractable text (image-only slides)");
    continue;
  }
  i++;
  process.stdout.write(`\rparsing ${i}/${entries.filter((x) => x.format === "pptx").length}: ${e.title.slice(0, 50).padEnd(50)}`);
  try {
    const slides = await parsePptx(readFileSync(e.sourcePath));
    e.slideCount = slides.length;
    e.textChars = slides.reduce((n, s) => n + s.title.length + s.bullets.join(" ").length + (s.notes?.length || 0), 0);
    e.lowText = e.textChars < 200;
    if (e.textChars === 0) e.status = "skipped", (e.error = "no extractable text (image-only slides)");
  } catch (err) {
    const msg = (err as Error).message;
    if (/older \.ppt format/.test(msg)) {
      // Mislabeled file: .pptx extension but binary .ppt content — route to conversion.
      e.format = "ppt";
      e.status = "needs-conversion";
    } else {
      e.status = "skipped";
      e.error = `parse failed: ${msg}`;
    }
  }
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(MANIFEST, JSON.stringify({ generated: new Date().toISOString(), root: ROOT, stats: { totalFiles: pptFiles.length, candidates: candidates.length, uniqueTopics: entries.length }, entries }, null, 2));
const skipped = entries.filter((e) => e.status === "skipped");
const low = entries.filter((e) => e.lowText);
console.log(`Manifest → ${MANIFEST}`);
console.log(`Low-text: ${low.length}, unparseable/skipped: ${skipped.length}`);
if (skipped.length) skipped.forEach((e) => console.log(`  SKIP ${e.title}: ${e.error}`));
