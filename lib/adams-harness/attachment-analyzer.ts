import { randomUUID } from "crypto";
import * as fflate from "fflate";
import { HttpError } from "./server-store";

export type InterviewAttachmentFileType =
  | "excel"
  | "powerpoint"
  | "word"
  | "pdf"
  | "markdown"
  | "text";

export interface ExcelSheetAnalysis {
  name: string;
  rowCount: number;
  columns: string[];
  formulas: string[];
  sampleRows: string[][];
}

export interface InterviewAttachmentAnalysis {
  id: string;
  fileName: string;
  fileType: InterviewAttachmentFileType;
  sizeBytes: number;
  uploadedAt: string;
  summary: string;
  extractedText: string;
  sheets?: ExcelSheetAnalysis[];
  slideCount?: number;
  suggestedQuestions: string[];
}

export const MAX_INTERVIEW_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15 MB

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

export function detectAttachmentType(
  fileName: string,
  contentType: string,
): InterviewAttachmentFileType {
  const lower = fileName.toLowerCase().trim();
  const mime = (contentType || "").toLowerCase();

  if (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv") ||
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime === "text/csv"
  ) {
    return "excel";
  }

  if (
    lower.endsWith(".pptx") ||
    lower.endsWith(".ppt") ||
    mime.includes("presentation") ||
    mime.includes("powerpoint")
  ) {
    return "powerpoint";
  }

  if (
    lower.endsWith(".docx") ||
    lower.endsWith(".doc") ||
    mime.includes("wordprocessingml") ||
    mime === "application/msword"
  ) {
    return "word";
  }

  if (lower.endsWith(".pdf") || mime === "application/pdf") {
    return "pdf";
  }

  if (lower.endsWith(".md") || lower.endsWith(".markdown") || mime === "text/markdown") {
    return "markdown";
  }

  if (lower.endsWith(".txt") || mime.startsWith("text/")) {
    return "text";
  }

  throw new HttpError(
    400,
    "Unsupported attachment type. Supported formats: Excel (.xlsx, .xls, .csv), PowerPoint (.pptx, .ppt), Word (.docx, .doc), Adobe PDF (.pdf), Markdown (.md), and Text (.txt).",
  );
}

function colLettersToIndex(colLetters: string): number {
  let idx = 0;
  for (let i = 0; i < colLetters.length; i++) {
    idx = idx * 26 + (colLetters.charCodeAt(i) - 64);
  }
  return Math.max(0, idx - 1);
}

function parseXlsxBuffer(buffer: Buffer, fileName: string): {
  summary: string;
  extractedText: string;
  sheets: ExcelSheetAnalysis[];
  suggestedQuestions: string[];
} {
  const unzipped = fflate.unzipSync(new Uint8Array(buffer));
  const dec = new TextDecoder("utf-8");

  // 1. Shared strings table
  const sharedStrings: string[] = [];
  if (unzipped["xl/sharedStrings.xml"]) {
    const ssXml = dec.decode(unzipped["xl/sharedStrings.xml"]);
    const siMatches = ssXml.match(/<si[\s>][\s\S]*?<\/si>/g) || [];
    for (const si of siMatches) {
      const tParts = [...si.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(
        (m) => decodeXmlEntities(m[1]),
      );
      sharedStrings.push(tParts.join(""));
    }
  }

  // 2. Sheet names from xl/workbook.xml
  const sheetNames: string[] = [];
  if (unzipped["xl/workbook.xml"]) {
    const wbXml = dec.decode(unzipped["xl/workbook.xml"]);
    for (const m of wbXml.matchAll(/<sheet\b[^>]*?\bname="([^"]+)"/g)) {
      sheetNames.push(decodeXmlEntities(m[1]));
    }
  }

  // 3. Parse each worksheet xl/worksheets/sheetN.xml
  const sheetKeys = Object.keys(unzipped)
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const na = parseInt(a.match(/sheet(\d+)\.xml/i)?.[1] || "0", 10);
      const nb = parseInt(b.match(/sheet(\d+)\.xml/i)?.[1] || "0", 10);
      return na - nb;
    });

  const sheets: ExcelSheetAnalysis[] = [];

  sheetKeys.forEach((sheetKey, sheetIdx) => {
    const xml = dec.decode(unzipped[sheetKey]);
    const sheetName = sheetNames[sheetIdx] || `Sheet${sheetIdx + 1}`;
    const rowMatches = xml.match(/<row\b[\s\S]*?<\/row>/g) || [];
    const parsedRows: string[][] = [];
    const formulas: string[] = [];

    for (const rowXml of rowMatches) {
      const rowCells: string[] = [];
      const cellMatches = rowXml.match(/<c\b[\s\S]*?(?:\/>|<\/c>)/g) || [];
      for (const cellXml of cellMatches) {
        const refMatch = cellXml.match(/\br="([A-Z]+)(\d+)"/);
        const typeMatch = cellXml.match(/\bt="([^"]+)"/);
        const colIdx = refMatch ? colLettersToIndex(refMatch[1]) : rowCells.length;
        const cellType = typeMatch ? typeMatch[1] : "";

        const formulaMatch = cellXml.match(/<f(?:\s[^>]*)?>([\s\S]*?)<\/f>/);
        if (formulaMatch && formulaMatch[1].trim() && formulas.length < 15) {
          const refLabel = refMatch ? `${refMatch[1]}${refMatch[2]}` : "Cell";
          formulas.push(`${refLabel}: =${decodeXmlEntities(formulaMatch[1].trim())}`);
        }

        let val = "";
        if (cellType === "inlineStr") {
          const tMatch = cellXml.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/);
          val = tMatch ? decodeXmlEntities(tMatch[1]) : "";
        } else {
          const vMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
          const rawV = vMatch ? vMatch[1].trim() : "";
          if (cellType === "s") {
            const sIdx = parseInt(rawV, 10);
            val = Number.isFinite(sIdx) ? sharedStrings[sIdx] ?? rawV : rawV;
          } else {
            val = decodeXmlEntities(rawV);
          }
        }
        rowCells[colIdx] = val.trim();
      }
      if (rowCells.some((c) => c && c.length > 0)) {
        parsedRows.push(rowCells.map((c) => c ?? ""));
      }
    }

    // Identify header row (first row with >= 2 non-empty cells, or first row)
    let headerIdx = parsedRows.findIndex(
      (r) => r.filter((c) => c.trim().length > 0).length >= 2,
    );
    if (headerIdx < 0) headerIdx = 0;

    const headerRow = parsedRows[headerIdx] || [];
    const columns = headerRow
      .map((c, i) => c.trim() || `Column_${i + 1}`)
      .filter((_, i) => i < 30);

    const sampleRows = parsedRows
      .slice(headerIdx + 1, headerIdx + 6)
      .map((r) => r.slice(0, columns.length));

    sheets.push({
      name: sheetName,
      rowCount: Math.max(0, parsedRows.length - (headerIdx + 1)),
      columns,
      formulas,
      sampleRows,
    });
  });

  const summaryLines = [
    `Excel Workbook "${fileName}" — ${sheets.length} worksheet(s):`,
    ...sheets.map((s) => {
      const colPreview = s.columns.slice(0, 12).join(", ");
      const formulaNote =
        s.formulas.length > 0
          ? ` | Formulas: ${s.formulas.slice(0, 4).join("; ")}`
          : "";
      return `• Sheet "${s.name}" (${s.rowCount} data rows) — Columns: [${colPreview}]${formulaNote}`;
    }),
  ];

  const detailedTextLines = [
    ...summaryLines,
    "",
    ...sheets.map((s) => {
      const sampleText = s.sampleRows
        .map(
          (row, idx) =>
            `  Row ${idx + 1}: ` +
            s.columns
              .map((col, cIdx) => `${col}="${row[cIdx] ?? ""}"`)
              .filter((pair) => !pair.endsWith('=""'))
              .join(", "),
        )
        .join("\n");
      return `Worksheet "${s.name}":\nColumns: ${s.columns.join(" | ")}\n${
        s.formulas.length > 0 ? `Formulas: ${s.formulas.join(", ")}\n` : ""
      }Sample Rows:\n${sampleText || "  (No data rows)"}`;
    }),
  ];

  const primarySheet = sheets[0];
  const primaryCols = primarySheet?.columns.slice(0, 6).join(", ") || "the columns";
  const suggestedQuestions: string[] = [
    `In "${fileName}"${primarySheet ? ` (sheet "${primarySheet.name}")` : ""}, how does your team currently use the columns (${primaryCols}), and what triggers someone to add or update a row?`,
    primarySheet?.formulas && primarySheet.formulas.length > 0
      ? `I noticed formulas in "${fileName}" (${primarySheet.formulas.slice(0, 2).join(", ")}). What calculations or business rules should the new Adams Platform module automate?`
      : `Which columns in "${fileName}" are entered manually today versus copied from another system or email, and where do errors or delays usually happen?`,
    sheets.length > 1
      ? `This workbook has ${sheets.length} tabs (${sheets.map((s) => s.name).join(", ")}). How do these sheets relate to each other in your workflow?`
      : `Who needs visibility or notifications when records in "${fileName}" are created, updated, or overdue?`,
  ];

  return {
    summary: summaryLines.join("\n"),
    extractedText: detailedTextLines.join("\n\n").slice(0, 15000),
    sheets,
    suggestedQuestions,
  };
}

function parseCsvBuffer(buffer: Buffer, fileName: string): {
  summary: string;
  extractedText: string;
  sheets: ExcelSheetAnalysis[];
  suggestedQuestions: string[];
} {
  const text = new TextDecoder("utf-8").decode(buffer);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const parseLine = (line: string) =>
    line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

  const columns = lines[0] ? parseLine(lines[0]) : [];
  const sampleRows = lines.slice(1, 6).map(parseLine);
  const sheet: ExcelSheetAnalysis = {
    name: fileName.replace(/\.csv$/i, ""),
    rowCount: Math.max(0, lines.length - 1),
    columns,
    formulas: [],
    sampleRows,
  };

  const summary = `CSV Spreadsheet "${fileName}" (${sheet.rowCount} rows) — Columns: [${columns.slice(0, 12).join(", ")}]`;
  const extractedText = [
    summary,
    ...sampleRows.map(
      (r, idx) =>
        `Row ${idx + 1}: ` +
        columns.map((col, i) => `${col}="${r[i] ?? ""}"`).join(", "),
    ),
  ].join("\n");

  const suggestedQuestions = [
    `Looking at "${fileName}" with columns (${columns.slice(0, 6).join(", ")}), how does a new row get added today and who owns updating each field?`,
    `Are any of the fields in "${fileName}" copied from another spreadsheet or system, and what notifications or approvals should trigger when a row changes?`,
  ];

  return {
    summary,
    extractedText: extractedText.slice(0, 15000),
    sheets: [sheet],
    suggestedQuestions,
  };
}

function parsePptxBuffer(buffer: Buffer, fileName: string): {
  summary: string;
  extractedText: string;
  slideCount: number;
  suggestedQuestions: string[];
} {
  try {
    const unzipped = fflate.unzipSync(new Uint8Array(buffer));
    const dec = new TextDecoder("utf-8");
    const slideKeys = Object.keys(unzipped)
      .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
      .sort((a, b) => {
        const na = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
        const nb = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
        return na - nb;
      });

    const slideSummaries: string[] = [];
    slideKeys.forEach((key, idx) => {
      const xml = dec.decode(unzipped[key]);
      const texts = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
        .map((m) => decodeXmlEntities(m[1].trim()))
        .filter(Boolean);
      if (texts.length > 0) {
        slideSummaries.push(`Slide ${idx + 1}: ${texts.join(" | ")}`);
      }
    });

    const summary = `PowerPoint Presentation "${fileName}" (${slideKeys.length} slides): ${slideSummaries
      .slice(0, 4)
      .join(" // ")
      .slice(0, 500)}`;

    const suggestedQuestions = [
      `Based on the "${fileName}" presentation (${slideKeys.length} slides), which slide or workflow step represents the biggest bottleneck today?`,
      `Are there specific roles, approvals, or reporting metrics shown in "${fileName}" that must be built into the live Adams Platform solution?`,
    ];

    return {
      summary,
      extractedText: slideSummaries.join("\n\n").slice(0, 15000),
      slideCount: slideKeys.length,
      suggestedQuestions,
    };
  } catch {
    const raw = new TextDecoder("utf-8", { fatal: false })
      .decode(buffer)
      .replace(/[^\x20-\x7E\n]+/g, " ")
      .trim()
      .slice(0, 4000);
    return {
      summary: `PowerPoint Presentation "${fileName}" uploaded.`,
      extractedText: raw || `Presentation: ${fileName}`,
      slideCount: 1,
      suggestedQuestions: [
        `Could you walk me through how the workflow or process in "${fileName}" works day-to-day and what parts you want automated?`,
      ],
    };
  }
}

export async function analyzeInterviewAttachment(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<InterviewAttachmentAnalysis> {
  if (buffer.byteLength > MAX_INTERVIEW_ATTACHMENT_BYTES) {
    throw new HttpError(400, "Attachment exceeds 15 MB limit");
  }

  const fileType = detectAttachmentType(fileName, contentType);
  const id = `att_${randomUUID().slice(0, 10)}`;
  const uploadedAt = new Date().toISOString();

  if (fileType === "excel") {
    if (fileName.toLowerCase().endsWith(".csv")) {
      const csv = parseCsvBuffer(buffer, fileName);
      return {
        id,
        fileName,
        fileType,
        sizeBytes: buffer.byteLength,
        uploadedAt,
        summary: csv.summary,
        extractedText: csv.extractedText,
        sheets: csv.sheets,
        suggestedQuestions: csv.suggestedQuestions,
      };
    }
    try {
      const xlsx = parseXlsxBuffer(buffer, fileName);
      return {
        id,
        fileName,
        fileType,
        sizeBytes: buffer.byteLength,
        uploadedAt,
        summary: xlsx.summary,
        extractedText: xlsx.extractedText,
        sheets: xlsx.sheets,
        suggestedQuestions: xlsx.suggestedQuestions,
      };
    } catch {
      const fallback = parseCsvBuffer(buffer, fileName);
      return {
        id,
        fileName,
        fileType,
        sizeBytes: buffer.byteLength,
        uploadedAt,
        summary: fallback.summary,
        extractedText: fallback.extractedText,
        sheets: fallback.sheets,
        suggestedQuestions: fallback.suggestedQuestions,
      };
    }
  }

  if (fileType === "powerpoint") {
    const ppt = parsePptxBuffer(buffer, fileName);
    return {
      id,
      fileName,
      fileType,
      sizeBytes: buffer.byteLength,
      uploadedAt,
      summary: ppt.summary,
      extractedText: ppt.extractedText,
      slideCount: ppt.slideCount,
      suggestedQuestions: ppt.suggestedQuestions,
    };
  }

  if (fileType === "word") {
    let text = "";
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value.trim();
    } catch {
      text = new TextDecoder("utf-8", { fatal: false }).decode(buffer).trim();
    }
    const cleanText = text.slice(0, 15000) || `Word Document: ${fileName}`;
    const preview = cleanText.split(/\r?\n/).filter(Boolean).slice(0, 4).join(" | ");
    return {
      id,
      fileName,
      fileType,
      sizeBytes: buffer.byteLength,
      uploadedAt,
      summary: `Word Document "${fileName}" (${cleanText.length} chars): ${preview.slice(0, 350)}`,
      extractedText: cleanText,
      suggestedQuestions: [
        `I analyzed the Word document "${fileName}". Which steps or forms in this document are currently manual or prone to delays?`,
        `Are there any approval sign-offs or compliance rules in "${fileName}" that the new solution needs to enforce automatically?`,
      ],
    };
  }

  if (fileType === "pdf") {
    let text = "";
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        text = result.text.trim();
      } finally {
        await parser.destroy().catch(() => {});
      }
    } catch {
      text = `PDF Document: ${fileName}`;
    }
    const cleanText = text.slice(0, 15000) || `PDF Document: ${fileName}`;
    const preview = cleanText.split(/\r?\n/).filter(Boolean).slice(0, 4).join(" | ");
    return {
      id,
      fileName,
      fileType,
      sizeBytes: buffer.byteLength,
      uploadedAt,
      summary: `Adobe PDF "${fileName}" (${cleanText.length} chars): ${preview.slice(0, 350)}`,
      extractedText: cleanText,
      suggestedQuestions: [
        `I reviewed the PDF "${fileName}". How is this document or form filled out and routed today, and what fields should be captured digitally?`,
        `Who reviews or approves the information shown in "${fileName}", and what happens when an item is incomplete or overdue?`,
      ],
    };
  }

  // Markdown (.md) or Text (.txt)
  const rawText = new TextDecoder("utf-8", { fatal: false })
    .decode(buffer)
    .trim()
    .slice(0, 15000);
  const preview = rawText.split(/\r?\n/).filter(Boolean).slice(0, 4).join(" | ");
  return {
    id,
    fileName,
    fileType,
    sizeBytes: buffer.byteLength,
    uploadedAt,
    summary: `${fileType === "markdown" ? "Markdown" : "Text"} File "${fileName}" (${rawText.length} chars): ${preview.slice(0, 350)}`,
    extractedText: rawText || fileName,
    suggestedQuestions: [
      `Based on the notes in "${fileName}", can you clarify how this workflow starts and who owns each step?`,
      `Are there additional data fields or notifications beyond what is listed in "${fileName}" that we should include?`,
    ],
  };
}
