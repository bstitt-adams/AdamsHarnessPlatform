/**
 * PowerPoint (.pptx) text extraction for LMS course imports.
 *
 * A .pptx is a zip of OOXML parts. Slides live in ppt/slides/slideN.xml and
 * speaker notes in ppt/notesSlides/notesSlideN.xml (matched by part number).
 * Text runs are <a:t> elements grouped inside <p:sp> shapes; a shape carrying
 * a <p:ph type="title"|"ctrTitle"> placeholder holds the slide title, and a
 * "body" placeholder in a notes slide holds the presenter notes.
 */

import JSZip from "jszip";

export interface ParsedSlide {
  index: number;
  title: string;
  bullets: string[];
  notes: string;
}

const SLIDE_RE = /^ppt\/slides\/slide(\d+)\.xml$/;
const NOTES_RE = /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/;
const SHAPE_RE = /<p:sp\b[\s\S]*?<\/p:sp>/g;
const TEXT_RUN_RE = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
const PH_TYPE_RE = /<p:ph\b[^>]*\btype="([^"]+)"/;

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function shapeText(shapeXml: string): string[] {
  const runs: string[] = [];
  for (const match of shapeXml.matchAll(TEXT_RUN_RE)) {
    const text = decodeEntities(match[1]).trim();
    if (text) runs.push(text);
  }
  return runs;
}

function shapePlaceholderType(shapeXml: string): string | null {
  return shapeXml.match(PH_TYPE_RE)?.[1] ?? null;
}

/** Splits a slide/notes part into { title, body } text groups by placeholder role. */
function extractPart(xml: string): { title: string[]; body: string[] } {
  const title: string[] = [];
  const body: string[] = [];
  const orphans: string[] = [];
  for (const shape of xml.matchAll(SHAPE_RE)) {
    const texts = shapeText(shape[0]);
    if (!texts.length) continue;
    const ph = shapePlaceholderType(shape[0]);
    if (ph === "title" || ph === "ctrTitle") title.push(...texts);
    else if (ph === "sldNum" || ph === "hdr" || ph === "ftr" || ph === "dt") continue;
    else if (ph === "body" || ph === "subTitle" || ph === "obj" || ph === null) body.push(...texts);
    else orphans.push(...texts);
  }
  if (!title.length && orphans.length) title.push(orphans.shift()!);
  body.push(...orphans);
  return { title, body };
}

/** Extracts slide text from a .pptx buffer. Throws on non-pptx/corrupt input. */
export async function parsePptx(buffer: Buffer | ArrayBuffer | Uint8Array): Promise<ParsedSlide[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error("Not a valid .pptx file (older .ppt format is not supported — save as .pptx)");
  }

  const slideParts = Object.keys(zip.files)
    .map((name) => ({ name, n: Number(name.match(SLIDE_RE)?.[1]) }))
    .filter((p) => Number.isInteger(p.n))
    .sort((a, b) => a.n - b.n);
  if (!slideParts.length) throw new Error("This file contains no slides");

  const notesByIndex = new Map<number, string>();
  for (const name of Object.keys(zip.files)) {
    const n = Number(name.match(NOTES_RE)?.[1]);
    if (Number.isInteger(n)) notesByIndex.set(n, name);
  }

  const slides: ParsedSlide[] = [];
  for (const part of slideParts) {
    const xml = await zip.file(part.name)!.async("string");
    const { title, body } = extractPart(xml);
    const notesName = notesByIndex.get(part.n);
    const notes = notesName ? extractPart(await zip.file(notesName)!.async("string")).body.join(" ") : "";
    slides.push({
      index: part.n,
      title: title.join(" ").slice(0, 300),
      bullets: body.map((t) => t.slice(0, 500)),
      notes: notes.slice(0, 2000),
    });
  }
  return slides;
}
