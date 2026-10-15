/**
 * GHL Workflows API
 * 
 * Endpoints for managing AI-generated workflows:
 * - GET: List saved workflows
 * - POST: Save new workflow
 * - DELETE: Delete workflow
 */

import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, addDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, GHLWorkflowDoc } from "@/lib/schema";

// Serialize timestamps
function serializeWorkflow(data: GHLWorkflowDoc): Record<string, unknown> {
  return {
    ...data,
    createdAt: (data.createdAt as unknown as { toDate?: () => Date })?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: (data.updatedAt as unknown as { toDate?: () => Date })?.toDate?.()?.toISOString() || data.updatedAt,
    deployedAt: (data.deployedAt as unknown as { toDate?: () => Date })?.toDate?.()?.toISOString() || data.deployedAt,
  };
}

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ success: true, workflows: [] });
    }

    const snapshot = await getDocs(collection(db, COLLECTIONS.GHL_WORKFLOWS));
    const workflows = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as GHLWorkflowDoc;
      return serializeWorkflow({ ...data, id: docSnap.id });
    });

    return NextResponse.json({ success: true, workflows });
  } catch (error) {
    console.error("Error fetching workflows:", error);
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
    const { name, description, workflow } = body;

    if (!name || !workflow) {
      return NextResponse.json(
        { success: false, error: "Name and workflow are required" },
        { status: 400 }
      );
    }

    const now = Timestamp.now();
    const workflowDoc: Omit<GHLWorkflowDoc, 'id'> = {
      name,
      description: description || '',
      workflow,
      status: 'draft',
      createdBy: 'system', // TODO: Get from auth
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.GHL_WORKFLOWS), workflowDoc);

    return NextResponse.json({
      success: true,
      workflow: {
        id: docRef.id,
        ...workflowDoc,
        createdAt: now.toDate().toISOString(),
        updatedAt: now.toDate().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error saving workflow:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Workflow ID is required" },
        { status: 400 }
      );
    }

    await deleteDoc(doc(db, COLLECTIONS.GHL_WORKFLOWS, id));

    return NextResponse.json({
      success: true,
      message: "Workflow deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
