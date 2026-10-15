/**
 * GHL Generate Workflow API
 * 
 * AI-powered workflow generation from plain language descriptions
 */

import { NextRequest, NextResponse } from "next/server";
import { AIWorkflowGenerator, WORKFLOW_TEMPLATES } from "@/lib/ai-workflow-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, type = 'mixed', templateId, customization, industry } = body;

    // Validate input
    if (!description && !templateId) {
      return NextResponse.json(
        { success: false, error: "Either description or templateId is required" },
        { status: 400 }
      );
    }

    const generator = new AIWorkflowGenerator();

    let workflow;
    if (templateId) {
      // Generate from template
      workflow = await generator.generateFromTemplate(templateId, customization);
    } else {
      // Generate from description
      workflow = await generator.generateWorkflow({
        description,
        type,
        industry,
        customization,
      });
    }

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error("Error generating workflow:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET endpoint to list available templates
export async function GET() {
  return NextResponse.json({
    success: true,
    templates: WORKFLOW_TEMPLATES,
  });
}
