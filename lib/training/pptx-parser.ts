import { strFromU8, unzipSync } from "fflate";

export interface PptxSlide {
  slideNumber: number;
  title: string;
  bullets: string[];
  notes: string;
}

export interface PptxParseResult {
  slideCount: number;
  slides: PptxSlide[];
}

function extractTextRuns(xml: string): string[] {
  // Each <a:p> is a paragraph; text lives in <a:t> runs inside it.
  const paragraphs: string[] = [];
  const paragraphRe = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
  let match: RegExpExecArray | null;
  while ((match = paragraphRe.exec(xml))) {
    const runs: string[] = [];
    const runRe = /<a:t>([\s\S]*?)<\/a:t>/g;
    let run: RegExpExecArray | null;
    while ((run = runRe.exec(match[1]))) {
      runs.push(run[1]);
    }
    const text = runs
      .join("")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}

/** Parse a .pptx buffer into ordered slides with title, bullet text, and speaker notes. */
export function parsePptxSlides(buffer: ArrayBuffer | Uint8Array): PptxParseResult {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const files = unzipSync(bytes);

  const slideNames = Object.keys(files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const num = (name: string) => Number(name.match(/slide(\d+)\.xml$/)?.[1] || 0);
      return num(a) - num(b);
    });

  const slides: PptxSlide[] = [];
  for (const name of slideNames) {
    const slideNumber = Number(name.match(/slide(\d+)\.xml$/)?.[1] || 0);
    const xml = strFromU8(files[name]);
    const paragraphs = extractTextRuns(xml);
    const title = paragraphs.shift() || `Slide ${slideNumber}`;

    const notesName = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
    const notes = files[notesName] ? extractTextRuns(strFromU8(files[notesName])).slice(1).join("\n") : "";

    slides.push({ slideNumber, title, bullets: paragraphs, notes });
  }

  return { slideCount: slides.length, slides };
}

/** Render a slide's text content as simple HTML for a text lesson. */
export function slideToHtml(slide: PptxSlide): string {
  const parts = [`<h2>${escapeHtml(slide.title)}</h2>`];
  if (slide.bullets.length) {
    parts.push(`<ul>${slide.bullets.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`);
  }
  if (slide.notes) {
    parts.push(`<p><em>Speaker notes:</em> ${escapeHtml(slide.notes).replace(/\n/g, "<br>")}</p>`);
  }
  return parts.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
