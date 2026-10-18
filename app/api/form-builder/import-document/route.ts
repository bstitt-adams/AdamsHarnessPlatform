import { NextRequest, NextResponse } from "next/server";
import type {
  FormControlType,
  FormFieldDefinition,
  ImportedDocumentTemplate,
  PlatformLookupSource,
} from "@/lib/form-builder/types";

function inferControlFromLabel(label: string): {
  type: FormControlType;
  lookupSource?: PlatformLookupSource;
  options?: string[];
  reportingCategory: FormFieldDefinition["reportingCategory"];
  recommendedChartType: FormFieldDefinition["recommendedChartType"];
  aiBestPracticeNote: string;
} {
  const lower = label.toLowerCase();

  if (lower.includes("signature") || lower.includes("sign off") || lower.includes("signed by")) {
    return {
      type: "signature",
      reportingCategory: "compliance_artifact",
      recommendedChartType: "none",
      aiBestPracticeNote: "Detected signature block — mapped to Digital Signature Pad.",
    };
  }
  if (lower.includes("date") || lower.includes("expir") || lower.includes("schedule")) {
    return {
      type: "date",
      reportingCategory: "dimension",
      recommendedChartType: "line",
      aiBestPracticeNote: "Mapped to ISO Date Picker for time-series reporting.",
    };
  }
  if (
    lower.includes("employee") ||
    lower.includes("foreman") ||
    lower.includes("supervisor") ||
    lower.includes("inspector") ||
    lower.includes("manager") ||
    lower.includes("assigned to")
  ) {
    return {
      type: "platform_lookup",
      lookupSource: "team_members",
      reportingCategory: "dimension",
      recommendedChartType: "bar",
      aiBestPracticeNote:
        "Linked to Adams Platform Team Members lookup to prevent misspelled names in reports.",
    };
  }
  if (lower.includes("department") || lower.includes("division")) {
    return {
      type: "platform_lookup",
      lookupSource: "departments",
      reportingCategory: "dimension",
      recommendedChartType: "pie",
      aiBestPracticeNote: "Linked to Adams Platform Departments lookup.",
    };
  }
  if (lower.includes("project") || lower.includes("facility") || lower.includes("customer")) {
    return {
      type: "platform_lookup",
      lookupSource: "projects",
      reportingCategory: "dimension",
      recommendedChartType: "bar",
      aiBestPracticeNote: "Linked to Active Projects lookup for project-level rollups.",
    };
  }
  if (lower.includes("jobsite") || lower.includes("site") || lower.includes("location")) {
    return {
      type: "platform_lookup",
      lookupSource: "safety_sites",
      reportingCategory: "dimension",
      recommendedChartType: "bar",
      aiBestPracticeNote: "Linked to Company Safety Calendar Sites lookup.",
    };
  }
  if (lower.includes("vehicle") || lower.includes("truck") || lower.includes("asset") || lower.includes("equipment")) {
    return {
      type: "platform_lookup",
      lookupSource: "user_assets",
      reportingCategory: "dimension",
      recommendedChartType: "bar",
      aiBestPracticeNote: "Linked to Assigned User Assets Inventory.",
    };
  }
  if (lower.includes("yes / no") || lower.includes("pass / fail") || lower.endsWith("?")) {
    return {
      type: "yes_no",
      reportingCategory: "dimension",
      recommendedChartType: "pie",
      aiBestPracticeNote: "Converted to binary Yes/No toggle for compliance rate calculation.",
    };
  }
  if (lower.includes("status") || lower.includes("priority") || lower.includes("severity") || lower.includes("category")) {
    return {
      type: "dropdown",
      options: ["Low / Routine", "Medium / Standard", "High / Urgent", "Critical / Immediate"],
      reportingCategory: "dimension",
      recommendedChartType: "pie",
      aiBestPracticeNote: "Standardized into categorical dropdown options for chart grouping.",
    };
  }
  if (lower.includes("cost") || lower.includes("amount") || lower.includes("price") || lower.includes("budget")) {
    return {
      type: "currency",
      reportingCategory: "metric",
      recommendedChartType: "kpi",
      aiBestPracticeNote: "Numeric currency field enables automatic sum/average KPI aggregation.",
    };
  }
  if (lower.includes("hours") || lower.includes("quantity") || lower.includes("count") || lower.includes("mileage")) {
    return {
      type: "number",
      reportingCategory: "metric",
      recommendedChartType: "bar",
      aiBestPracticeNote: "Numeric field enables quantitative trend reporting.",
    };
  }
  if (lower.includes("email")) {
    return {
      type: "email",
      reportingCategory: "identifier",
      recommendedChartType: "none",
      aiBestPracticeNote: "Validated email input.",
    };
  }
  if (lower.includes("phone") || lower.includes("mobile") || lower.includes("cell")) {
    return {
      type: "phone",
      reportingCategory: "identifier",
      recommendedChartType: "none",
      aiBestPracticeNote: "Formatted phone number input.",
    };
  }
  if (lower.includes("notes") || lower.includes("description") || lower.includes("comments") || lower.includes("details")) {
    return {
      type: "long_text",
      reportingCategory: "open_text",
      recommendedChartType: "none",
      aiBestPracticeNote: "Open text reserved for qualitative context alongside structured fields.",
    };
  }

  return {
    type: "short_text",
    reportingCategory: "dimension",
    recommendedChartType: "none",
    aiBestPracticeNote: "Extracted form field overlaid on document.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please attach a PDF (.pdf) or Word (.docx) document" },
        { status: 400 },
      );
    }

    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith(".pdf") || file.type === "application/pdf";
    const isWord =
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".doc") ||
      file.type.includes("word");

    if (!isPdf && !isWord) {
      return NextResponse.json(
        { error: "Only PDF (.pdf) and Word (.docx, .doc) forms are supported for document overlay import." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";
    let pageCount = 1;

    if (isPdf) {
      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        try {
          const result = await parser.getText();
          extractedText = result.text.trim();
          pageCount = Math.max(1, result.total || 1);
        } finally {
          await parser.destroy().catch(() => {});
        }
      } catch {
        extractedText = `Imported PDF Form: ${file.name}`;
      }
    } else {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value.trim();
      } catch {
        extractedText = new TextDecoder("utf-8", { fatal: false }).decode(buffer).trim();
      }
    }

    // Parse candidate form labels from lines (e.g. "Jobsite: ____", "Inspector Name:", "[ ] PPE Verified")
    const rawLines = extractedText
      .split(/\r?\n/)
      .map((l) => l.replace(/[_\u2026]{2,}/g, "").trim())
      .filter((l) => l.length >= 3 && l.length <= 95);

    const candidateLabels: string[] = [];
    for (const line of rawLines) {
      const cleaned = line.replace(/^[\d.)\-*•[\]\s]+/, "").replace(/:$/, "").trim();
      if (cleaned.length >= 3 && !candidateLabels.includes(cleaned)) {
        candidateLabels.push(cleaned);
      }
      if (candidateLabels.length >= 10) break;
    }

    if (candidateLabels.length === 0) {
      candidateLabels.push(
        "Jobsite Location",
        "Lead Foreman / Inspector",
        "Inspection Date",
        "Work Scope / Department",
        "Compliance Status",
        "Notes & Observations",
        "Authorized Signature",
      );
    }

    // Ensure there's always a Digital Signature field at the end of an imported document form
    if (!candidateLabels.some((l) => l.toLowerCase().includes("sign"))) {
      candidateLabels.push("Authorized Digital Signature");
    }

    const fields: FormFieldDefinition[] = candidateLabels.map((label, idx) => {
      const inferred = inferControlFromLabel(label);
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const key =
        label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 40) || `field_${idx + 1}`;

      return {
        id: `imp_${Date.now()}_${idx}`,
        key,
        label,
        type: inferred.type,
        lookupSource: inferred.lookupSource,
        options: inferred.options,
        required: idx < 4 || inferred.type === "signature",
        reportingCategory: inferred.reportingCategory,
        recommendedChartType: inferred.recommendedChartType,
        aiBestPracticeNote: inferred.aiBestPracticeNote,
        overlayPosition: {
          page: 1,
          xPercent: col === 0 ? 6 : 52,
          yPercent: Math.min(86, 14 + row * 14),
          widthPercent: inferred.type === "long_text" || inferred.type === "signature" ? 88 : 42,
        },
      };
    });

    const base64DataUri =
      buffer.byteLength <= 650 * 1024
        ? `data:${isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"};base64,${buffer.toString("base64")}`
        : undefined;

    const importedDocument: ImportedDocumentTemplate = {
      fileName: file.name,
      fileType: isPdf ? "pdf" : "word",
      extractedText: extractedText.slice(0, 12000) || `Imported ${file.name}`,
      base64DataUri,
      pageCount,
      importedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      title: file.name.replace(/\.(pdf|docx|doc)$/i, "").replace(/[-_]+/g, " "),
      importedDocument,
      fields,
    });
  } catch (error) {
    console.error("Error importing PDF/Word form:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import document form" },
      { status: 500 },
    );
  }
}
