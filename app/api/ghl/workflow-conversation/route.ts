/**
 * GHL Workflow Conversation API
 * 
 * Conversational workflow builder using AI
 */

import { NextRequest, NextResponse } from "next/server";
import { AIWorkflowGenerator, ConversationMessage, GeneratedWorkflow } from "@/lib/ai-workflow-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, currentWorkflow } = body as {
      messages: ConversationMessage[];
      currentWorkflow?: GeneratedWorkflow;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Messages array is required" },
        { status: 400 }
      );
    }

    const generator = new AIWorkflowGenerator();
    const result = await generator.conversationalBuild(messages, currentWorkflow);

    return NextResponse.json({
      success: true,
      response: result.response,
      workflow: result.workflow,
    });
  } catch (error) {
    console.error("Error in workflow conversation:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
