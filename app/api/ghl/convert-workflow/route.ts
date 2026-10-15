/**
 * GHL Convert Workflow API
 * 
 * Converts GHL workflow JSON to plain language description
 */

import { NextRequest, NextResponse } from "next/server";
import { AIWorkflowGenerator } from "@/lib/ai-workflow-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflow } = body;

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: "Workflow JSON is required" },
        { status: 400 }
      );
    }

    const generator = new AIWorkflowGenerator();
    const plainLanguage = await generator.convertToPlainLanguage(workflow);

    return NextResponse.json({
      success: true,
      plainLanguage,
    });
  } catch (error) {
    console.error("Error converting workflow:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
