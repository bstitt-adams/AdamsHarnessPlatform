/**
 * GHL Import Workflows API
 * 
 * Imports workflows from GoHighLevel and stores them locally
 */

import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, GHLImportedWorkflowDoc } from "@/lib/schema";
import { GoHighLevelService } from "@/lib/gohighlevel-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiToken = searchParams.get('apiToken') || process.env.GOHIGHLEVEL_API_KEY;
    const locationId = searchParams.get('locationId') || process.env.GOHIGHLEVEL_LOCATION_ID;

    if (!apiToken || !locationId) {
      // Return empty array instead of error when credentials not configured
      return NextResponse.json({ success: true, workflows: [] });
    }

    const ghlService = new GoHighLevelService({ apiToken, locationId });
    const result = await ghlService.getWorkflows();

    if (!result.success) {
      // Return empty array instead of error to prevent UI crashes
      return NextResponse.json({ success: true, workflows: [] });
    }

    return NextResponse.json({
      success: true,
      workflows: result.data?.workflows || [],
    });
  } catch (error) {
    console.error("Error importing workflows:", error);
    // Return empty array instead of error to prevent UI crashes
    return NextResponse.json({ success: true, workflows: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { workflow, locationId } = body;

    if (!workflow || !workflow.id) {
      return NextResponse.json(
        { success: false, error: "Workflow data is required" },
        { status: 400 }
      );
    }

    const now = Timestamp.now();
    const importedWorkflow: Omit<GHLImportedWorkflowDoc, 'id'> = {
      ghlWorkflowId: workflow.id,
      name: workflow.name || 'Unnamed Workflow',
      description: workflow.description || '',
      status: workflow.status || 'unknown',
      originalFormat: workflow,
      trigger: workflow.trigger || {},
      actions: workflow.actions || [],
      importedAt: now,
      locationId: locationId || process.env.GOHIGHLEVEL_LOCATION_ID || '',
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.GHL_IMPORTED_WORKFLOWS), importedWorkflow);

    return NextResponse.json({
      success: true,
      importedWorkflow: {
        id: docRef.id,
        ...importedWorkflow,
        importedAt: now.toDate().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error saving imported workflow:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
