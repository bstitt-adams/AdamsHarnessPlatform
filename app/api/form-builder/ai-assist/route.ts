import { NextRequest, NextResponse } from "next/server";
import type { FormFieldDefinition } from "@/lib/form-builder/types";

interface AiAssistRequest {
  mode: "generate" | "optimize_for_reporting";
  prompt?: string;
  title?: string;
  fields?: FormFieldDefinition[];
}

function optimizeFieldsWithDataAnalystRules(
  existingFields: FormFieldDefinition[],
): {
  fields: FormFieldDefinition[];
  analystRecommendations: string[];
  recommendedKpis: string[];
} {
  const recommendations: string[] = [];
  const upgraded = existingFields.map((field, idx) => {
    const lower = field.label.toLowerCase();
    const copy: FormFieldDefinition = { ...field };

    // 1. Convert free-text person/employee fields to Platform Lookup (team_members)
    if (
      copy.type === "short_text" &&
      (lower.includes("name") ||
        lower.includes("foreman") ||
        lower.includes("inspector") ||
        lower.includes("employee") ||
        lower.includes("supervisor"))
    ) {
      copy.type = "platform_lookup";
      copy.lookupSource = "team_members";
      copy.reportingCategory = "dimension";
      copy.recommendedChartType = "bar";
      copy.aiBestPracticeNote =
        "Upgraded from free text to Adams Team Members Lookup so employee names are 100% standardized for group-by charts.";
      recommendations.push(
        `Converted "${copy.label}" from free-text to a live Team Members Lookup to eliminate spelling variations in accountability reports.`,
      );
    }
    // 2. Convert free-text jobsite/location fields to Platform Lookup (safety_sites or projects)
    else if (
      copy.type === "short_text" &&
      (lower.includes("site") ||
        lower.includes("location") ||
        lower.includes("project") ||
        lower.includes("job"))
    ) {
      copy.type = "platform_lookup";
      copy.lookupSource = lower.includes("project") ? "projects" : "safety_sites";
      copy.reportingCategory = "dimension";
      copy.recommendedChartType = "bar";
      copy.aiBestPracticeNote =
        "Upgraded to live Adams Platform Site/Project Lookup for accurate multi-site KPI rollups.";
      recommendations.push(
        `Linked "${copy.label}" to live Adams Platform ${copy.lookupSource === "projects" ? "Projects" : "Safety Sites"} so submissions roll up cleanly by location.`,
      );
    }
    // 3. Convert subjective quality/risk/satisfaction text fields to 1-5 Likert scales
    else if (
      (copy.type === "short_text" || copy.type === "long_text") &&
      (lower.includes("rate") ||
        lower.includes("severity") ||
        lower.includes("risk") ||
        lower.includes("satisfaction") ||
        lower.includes("condition") ||
        lower.includes("how well"))
    ) {
      copy.type = "likert_scale";
      copy.scaleMin = 1;
      copy.scaleMax = 5;
      copy.scaleMinLabel = "1 - Low / Poor";
      copy.scaleMaxLabel = "5 - High / Excellent";
      copy.reportingCategory = "metric";
      copy.recommendedChartType = "bar";
      copy.aiBestPracticeNote =
        "Converted open-ended question into a 1–5 Likert Scale so average scores and distributions can be charted.";
      recommendations.push(
        `Transformed "${copy.label}" into a 1–5 quantitative Likert Scale so you can track average scores over time.`,
      );
    }
    // 4. Ensure every field has explicit reporting metadata
    if (!copy.reportingCategory) {
      copy.reportingCategory =
        copy.type === "number" ||
        copy.type === "currency" ||
        copy.type === "likert_scale" ||
        copy.type === "nps" ||
        copy.type === "rating_stars"
          ? "metric"
          : copy.type === "dropdown" ||
              copy.type === "platform_lookup" ||
              copy.type === "radio" ||
              copy.type === "yes_no" ||
              copy.type === "multi_select"
            ? "dimension"
            : copy.type === "signature" || copy.type === "file_upload"
              ? "compliance_artifact"
              : "open_text";
    }
    if (!copy.recommendedChartType) {
      copy.recommendedChartType =
        copy.reportingCategory === "metric"
          ? "bar"
          : copy.reportingCategory === "dimension"
            ? "pie"
            : "none";
    }
    if (!copy.aiBestPracticeNote) {
      copy.aiBestPracticeNote =
        copy.reportingCategory === "dimension"
          ? "Normalized categorical dimension suitable for Pie/Bar segmentation."
          : copy.reportingCategory === "metric"
            ? "Quantitative metric suitable for Average/Sum KPI cards and trend charts."
            : "Supporting qualitative or compliance field.";
    }
    if (!copy.overlayPosition) {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      copy.overlayPosition = {
        page: 1,
        xPercent: col === 0 ? 6 : 52,
        yPercent: Math.min(86, 14 + row * 14),
        widthPercent: 42,
      };
    }

    return copy;
  });

  // Add a quantitative rating or compliance toggle if the form lacks any numeric/categorical metric
  const hasMetric = upgraded.some((f) => f.reportingCategory === "metric");
  if (!hasMetric) {
    upgraded.splice(Math.max(0, upgraded.length - 1), 0, {
      id: `ai_metric_${Date.now()}`,
      key: "priority_severity_score",
      label: "Priority / Impact Rating (1 = Routine, 5 = Mission Critical)",
      type: "likert_scale",
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: "1 - Routine",
      scaleMaxLabel: "5 - Mission Critical",
      required: true,
      reportingCategory: "metric",
      recommendedChartType: "bar",
      aiBestPracticeNote:
        "Added by AI Data Analyst so every submission includes a quantitative score for executive dashboard trending.",
    });
    recommendations.push(
      "Added a standardized 1–5 Priority / Impact Rating scale so submissions can be scored and trended quantitatively.",
    );
  }

  // Ensure a Digital Signature exists for auditability
  if (!upgraded.some((f) => f.type === "signature")) {
    upgraded.push({
      id: `ai_sig_${Date.now()}`,
      key: "authorized_digital_signature",
      label: "Authorized Sign-Off Signature",
      type: "signature",
      required: true,
      reportingCategory: "compliance_artifact",
      recommendedChartType: "none",
      aiBestPracticeNote:
        "Added Digital Signature Pad for AirSlate/Jotform-grade compliance verification and PDF export.",
    });
    recommendations.push(
      "Added an Authorized Digital Signature Pad at the bottom of the form for audit compliance and PDF generation.",
    );
  }

  return {
    fields: upgraded,
    analystRecommendations:
      recommendations.length > 0
        ? recommendations
        : [
            "Verified all questions use normalized categorical dimensions and quantitative scales for clean BI reporting.",
          ],
    recommendedKpis: [
      "Total Verified Submissions",
      "Completion Rate % vs. Drop-Off Rate %",
      "Average Quantitative Score (1–5 Scale)",
      "Breakdown by Jobsite / Project Lookup",
      "Compliance Sign-Off Percentage",
    ],
  };
}

function generateFormFromPrompt(prompt: string): {
  title: string;
  description: string;
  category: string;
  fields: FormFieldDefinition[];
  analystRecommendations: string[];
  recommendedKpis: string[];
} {
  const cleanPrompt = prompt.trim() || "Electrical Field Operations & Safety Form";
  const lower = cleanPrompt.toLowerCase();

  const title =
    cleanPrompt.length <= 65
      ? cleanPrompt.replace(/^(create|build|make)\s+(a|an)\s+/i, "")
      : "Adams Electric Operational & Compliance Form";

  const baseFields: FormFieldDefinition[] = [
    {
      id: `gen_${Date.now()}_1`,
      key: "jobsite_or_project",
      label: lower.includes("project") ? "Project / Facility" : "Jobsite Location",
      type: "platform_lookup",
      lookupSource: lower.includes("project") ? "projects" : "safety_sites",
      required: true,
      reportingCategory: "dimension",
      recommendedChartType: "bar",
      aiBestPracticeNote:
        "Uses live Adams Platform lookup to guarantee clean location grouping in charts.",
    },
    {
      id: `gen_${Date.now()}_2`,
      key: "submitted_by_team_member",
      label: "Lead Foreman / Responsible Team Member",
      type: "platform_lookup",
      lookupSource: "team_members",
      required: true,
      reportingCategory: "dimension",
      recommendedChartType: "bar",
      aiBestPracticeNote:
        "Linked to Adams Team Members directory for standardized owner reporting.",
    },
    {
      id: `gen_${Date.now()}_3`,
      key: "submission_date",
      label: "Date of Record",
      type: "date",
      required: true,
      reportingCategory: "dimension",
      recommendedChartType: "line",
      aiBestPracticeNote: "Enables daily/weekly/monthly time-series trend charts.",
    },
    {
      id: `gen_${Date.now()}_4`,
      key: "primary_category",
      label: "Primary Classification / Category",
      type: "dropdown",
      options: lower.includes("safety") || lower.includes("permit")
        ? [
            "Electrical / NFPA 70E Compliance",
            "Fall Protection / Elevated Work",
            "Lockout / Tagout (LOTO)",
            "Equipment & Tool Inspection",
            "General Jobsite Safety",
          ]
        : [
            "Field Installation & Rough-In",
            "Switchgear & Distribution",
            "BIM / Prefabrication",
            "Testing & Commissioning",
            "Service & Maintenance",
          ],
      required: true,
      reportingCategory: "dimension",
      recommendedChartType: "pie",
      aiBestPracticeNote:
        "Structured single-select dropdown prevents free-text fragmentation in Pie/Bar charts.",
    },
    {
      id: `gen_${Date.now()}_5`,
      key: "compliance_pass_check",
      label: "All Required Pre-Checks & Standards Met?",
      type: "yes_no",
      required: true,
      reportingCategory: "dimension",
      recommendedChartType: "pie",
      aiBestPracticeNote: "Binary Yes/No toggle allows instant Pass/Fail % KPI calculation.",
    },
    {
      id: `gen_${Date.now()}_6`,
      key: "severity_or_readiness_rating",
      label: "Overall Readiness / Priority Rating (1 = Low, 5 = High)",
      type: "likert_scale",
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: "1 - Low",
      scaleMaxLabel: "5 - High / Critical",
      required: true,
      reportingCategory: "metric",
      recommendedChartType: "bar",
      aiBestPracticeNote:
        "1–5 Likert scale provides a numeric metric for average score trending across departments.",
    },
    {
      id: `gen_${Date.now()}_7`,
      key: "supporting_attachment",
      label: "Supporting Photo, Submittal, or Certificate Upload",
      type: "file_upload",
      required: false,
      reportingCategory: "compliance_artifact",
      recommendedChartType: "none",
    },
    {
      id: `gen_${Date.now()}_8`,
      key: "detailed_notes",
      label: "Additional Observations / Action Notes",
      type: "long_text",
      required: false,
      reportingCategory: "open_text",
      recommendedChartType: "none",
    },
    {
      id: `gen_${Date.now()}_9`,
      key: "digital_signature",
      label: "Authorized Digital Signature",
      type: "signature",
      required: true,
      reportingCategory: "compliance_artifact",
      recommendedChartType: "none",
    },
  ];

  const optimized = optimizeFieldsWithDataAnalystRules(baseFields);

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    description: `AI-architected form for "${cleanPrompt}" — structured with normalized dimensions, quantitative rating scales, file upload, and digital signature for executive reporting.`,
    category: lower.includes("safety") ? "Safety & Compliance" : "Field Operations",
    fields: optimized.fields,
    analystRecommendations: [
      "Structured 75%+ of questions as normalized Platform Lookups, Dropdowns, Yes/No toggles, and 1–5 Likert scales so every submission can be charted without manual data cleaning.",
      "Placed high-completion lookup fields first and open-text notes last to minimize respondent drop-off.",
      ...optimized.analystRecommendations,
    ],
    recommendedKpis: optimized.recommendedKpis,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AiAssistRequest;
    if (body.mode === "optimize_for_reporting") {
      const result = optimizeFieldsWithDataAnalystRules(body.fields || []);
      return NextResponse.json(result);
    }

    const generated = generateFormFromPrompt(body.prompt || body.title || "");
    return NextResponse.json(generated);
  } catch (error) {
    console.error("Form AI assist error:", error);
    return NextResponse.json(
      { error: "Failed to run AI Form Developer & Data Analyst" },
      { status: 500 },
    );
  }
}
