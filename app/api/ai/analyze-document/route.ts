import { NextRequest, NextResponse } from "next/server";

const ANALYSIS_PROMPT = `You are an expert document analyzer for proposals, grants, RFPs, contracts, and agreements. Analyze the provided document and extract structured information.

IMPORTANT RULES:
1. Extract ONLY information that exists in the document - do not fabricate data
2. Use exact organization names as written in the document
3. Convert all dates to YYYY-MM-DD format
4. Convert all budgets to numbers (remove $ and commas)
5. If information is not found, use reasonable defaults or leave empty
6. Detect the document type based on content

Return a JSON object with this exact structure:
{
  "detectedType": "grant" | "rfp_response" | "rfi_response" | "contract" | "agreement" | "mou",
  "data": {
    "title": "Document title or project name",
    "description": "Brief description of the project/proposal",
    "fundingSource": "Name of funding organization",
    "referenceNumber": "Grant number, contract number, or reference ID",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "totalBudget": 0,
    "entities": [
      {
        "name": "Organization name",
        "role": "lead" | "partner" | "evaluator" | "stakeholder" | "funder",
        "responsibilities": "Key responsibilities",
        "contactInfo": "Contact person and email if available"
      }
    ],
    "dataCollectionMethods": [
      {
        "name": "Method name",
        "description": "Description of the method",
        "frequency": "once" | "daily" | "weekly" | "monthly" | "quarterly" | "annually",
        "responsibleEntity": "Entity name",
        "dataPoints": ["Data point 1", "Data point 2"],
        "tools": "Tools or platforms to use"
      }
    ],
    "milestones": [
      {
        "name": "Milestone name",
        "description": "Milestone description",
        "dueDate": "YYYY-MM-DD",
        "responsibleParties": ["Party 1", "Party 2"],
        "dependencies": ["Dependency 1"]
      }
    ],
    "forms": [
      {
        "name": "Form name",
        "description": "Form purpose",
        "category": "intake" | "progress" | "assessment" | "feedback" | "reporting" | "data",
        "linkedDataCollectionMethod": "Method name",
        "fields": [
          {
            "id": "field_1",
            "name": "field_name",
            "label": "Field Label",
            "type": "text" | "textarea" | "email" | "phone" | "date" | "number" | "select" | "checkbox" | "radio",
            "required": true,
            "options": ["Option 1", "Option 2"]
          }
        ],
        "datasetFields": ["field1", "field2"]
      }
    ],
    "dashboard": {
      "title": "Dashboard title",
      "description": "Dashboard purpose",
      "metrics": [
        {
          "id": "metric_1",
          "name": "Metric name",
          "description": "What this measures",
          "value": 0,
          "target": 100,
          "unit": "%",
          "visualization": "number" | "percentage" | "currency" | "ratio"
        }
      ],
      "charts": [
        {
          "id": "chart_1",
          "type": "line" | "bar" | "pie" | "area",
          "title": "Chart title",
          "dataSource": "form_name"
        }
      ],
      "kpis": [
        {
          "id": "kpi_1",
          "name": "KPI name",
          "value": "Current value",
          "target": "Target value"
        }
      ],
      "tables": []
    },
    "specialRequirements": "Any special requirements or compliance notes"
  }
}

Create 4-6 milestones spanning the project period.
Generate 2-3 forms per proposal based on data collection needs.
Link all dashboard elements to form datasets.
Identify all parties that may require signatures.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string | null;
    const textContent = formData.get("textContent") as string | null;

    let extractedText = "";

    if (file) {
      // Extract text from file
      const fileBuffer = await file.arrayBuffer();
      const fileText = new TextDecoder().decode(fileBuffer);
      
      // For PDF files, we'd need a PDF parser - for now, handle text-based files
      if (file.type === "application/pdf") {
        // In production, use pdf-parse or similar library
        extractedText = `[PDF Content - ${file.name}]\n${fileText.substring(0, 50000)}`;
      } else {
        extractedText = fileText.substring(0, 50000); // Limit to 50k chars
      }
    } else if (textContent) {
      extractedText = textContent.substring(0, 50000);
    } else {
      return NextResponse.json(
        { success: false, error: "No file or text content provided" },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      // Return mock analysis for demo purposes
      return NextResponse.json({
        success: true,
        detectedType: documentType || "grant",
        data: generateMockAnalysis(extractedText, documentType),
        extractedText: extractedText.substring(0, 1000),
        extractedTextLength: extractedText.length,
        note: "OpenAI API key not configured. Using mock analysis.",
      });
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          {
            role: "user",
            content: `Analyze this document${documentType ? ` (type hint: ${documentType})` : ""}:\n\n${extractedText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysisResult = JSON.parse(aiResponse.choices[0]?.message?.content || "{}");

    return NextResponse.json({
      success: true,
      detectedType: analysisResult.detectedType || documentType || "grant",
      data: analysisResult.data || generateMockAnalysis(extractedText, documentType),
      extractedText: extractedText.substring(0, 1000),
      extractedTextLength: extractedText.length,
    });
  } catch (error) {
    console.error("Document analysis error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyze document" },
      { status: 500 }
    );
  }
}

function generateMockAnalysis(text: string, documentType?: string | null) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() + 1);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  return {
    title: "Sample Project Proposal",
    description: "This is a sample analysis. Configure your OpenAI API key for full document analysis.",
    fundingSource: "Federal Government",
    referenceNumber: `REF-${Date.now().toString().slice(-6)}`,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    totalBudget: 250000,
    entities: [
      {
        name: "Lead Organization",
        role: "lead",
        responsibilities: "Project management and coordination",
        contactInfo: "Contact TBD",
      },
      {
        name: "Partner Organization",
        role: "partner",
        responsibilities: "Technical implementation support",
        contactInfo: "Contact TBD",
      },
    ],
    dataCollectionMethods: [
      {
        name: "Quarterly Progress Reports",
        description: "Regular progress tracking and reporting",
        frequency: "quarterly",
        responsibleEntity: "Lead Organization",
        dataPoints: ["Milestones completed", "Budget spent", "Outcomes achieved"],
        tools: "Project management system",
      },
      {
        name: "Participant Surveys",
        description: "Collect feedback from program participants",
        frequency: "monthly",
        responsibleEntity: "Partner Organization",
        dataPoints: ["Satisfaction score", "Service quality", "Recommendations"],
        tools: "Survey platform",
      },
    ],
    milestones: [
      {
        name: "Project Kickoff",
        description: "Initial project setup and team onboarding",
        dueDate: startDate.toISOString().split("T")[0],
        responsibleParties: ["Lead Organization"],
        dependencies: [],
      },
      {
        name: "Phase 1 Completion",
        description: "Complete initial implementation phase",
        dueDate: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        responsibleParties: ["Lead Organization", "Partner Organization"],
        dependencies: ["Project Kickoff"],
      },
      {
        name: "Mid-Year Review",
        description: "Comprehensive project review and assessment",
        dueDate: new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        responsibleParties: ["Lead Organization"],
        dependencies: ["Phase 1 Completion"],
      },
      {
        name: "Final Deliverables",
        description: "Complete all project deliverables",
        dueDate: endDate.toISOString().split("T")[0],
        responsibleParties: ["Lead Organization", "Partner Organization"],
        dependencies: ["Mid-Year Review"],
      },
    ],
    forms: [
      {
        name: "Progress Report Form",
        description: "Quarterly progress tracking",
        category: "reporting",
        linkedDataCollectionMethod: "Quarterly Progress Reports",
        fields: [
          { id: "f1", name: "reporting_period", label: "Reporting Period", type: "select", required: true, options: ["Q1", "Q2", "Q3", "Q4"] },
          { id: "f2", name: "milestones_completed", label: "Milestones Completed", type: "textarea", required: true },
          { id: "f3", name: "budget_spent", label: "Budget Spent", type: "number", required: true },
          { id: "f4", name: "challenges", label: "Challenges Encountered", type: "textarea", required: false },
        ],
        datasetFields: ["reporting_period", "milestones_completed", "budget_spent", "challenges"],
      },
      {
        name: "Participant Feedback Form",
        description: "Collect participant satisfaction data",
        category: "feedback",
        linkedDataCollectionMethod: "Participant Surveys",
        fields: [
          { id: "f5", name: "satisfaction", label: "Overall Satisfaction", type: "radio", required: true, options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"] },
          { id: "f6", name: "service_quality", label: "Service Quality Rating", type: "select", required: true, options: ["Excellent", "Good", "Fair", "Poor"] },
          { id: "f7", name: "comments", label: "Additional Comments", type: "textarea", required: false },
        ],
        datasetFields: ["satisfaction", "service_quality", "comments"],
      },
    ],
    dashboard: {
      title: "Project Dashboard",
      description: "Real-time project performance tracking",
      metrics: [
        { id: "m1", name: "Budget Utilization", description: "Percentage of budget spent", value: 0, target: 100, unit: "%", visualization: "percentage" },
        { id: "m2", name: "Milestones Completed", description: "Number of completed milestones", value: 0, target: 4, unit: "", visualization: "number" },
        { id: "m3", name: "Participant Satisfaction", description: "Average satisfaction score", value: 0, target: 90, unit: "%", visualization: "percentage" },
      ],
      charts: [
        { id: "c1", type: "bar", title: "Budget by Quarter", dataSource: "Progress Report Form" },
        { id: "c2", type: "line", title: "Satisfaction Trend", dataSource: "Participant Feedback Form" },
      ],
      kpis: [
        { id: "k1", name: "On-Time Delivery", value: "100%", target: "95%" },
        { id: "k2", name: "Budget Variance", value: "0%", target: "<10%" },
      ],
      tables: [],
    },
    specialRequirements: "Standard reporting requirements apply. Quarterly reports due within 30 days of quarter end.",
  };
}
