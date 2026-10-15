/**
 * GoHighLevel Integration by ID API
 * 
 * Endpoints for managing a specific GHL integration:
 * - GET: Get integration details
 * - PUT: Update integration
 * - DELETE: Delete integration
 */

import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, GHLIntegrationDoc } from "@/lib/schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const docRef = doc(db, COLLECTIONS.GHL_INTEGRATIONS, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Integration not found" },
        { status: 404 }
      );
    }

    const data = docSnap.data() as GHLIntegrationDoc;
    
    return NextResponse.json({
      success: true,
      integration: {
        ...data,
        id: docSnap.id,
        apiToken: data.apiToken ? `****${data.apiToken.slice(-4)}` : undefined,
        lastSyncAt: (data.lastSyncAt as unknown as { toDate?: () => Date })?.toDate?.()?.toISOString(),
        createdAt: (data.createdAt as unknown as { toDate?: () => Date })?.toDate?.()?.toISOString(),
        updatedAt: (data.updatedAt as unknown as { toDate?: () => Date })?.toDate?.()?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching GHL integration:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const docRef = doc(db, COLLECTIONS.GHL_INTEGRATIONS, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Integration not found" },
        { status: 404 }
      );
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      lastModifiedBy: "system", // TODO: Get from auth
    };

    const allowedFields = [
      "name", "description", "isActive", "apiToken", "locationId", "agencyId",
      "syncContacts", "syncOpportunities", "syncCalendars", "syncPipelines", "syncCampaigns",
      "contactMapping", "defaultPipelineId", "defaultStageId", "enableWebhooks",
      "webhookUrl", "webhookSecret"
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    await updateDoc(docRef, updateData);

    return NextResponse.json({
      success: true,
      message: "Integration updated successfully",
    });
  } catch (error) {
    console.error("Error updating GHL integration:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const docRef = doc(db, COLLECTIONS.GHL_INTEGRATIONS, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Integration not found" },
        { status: 404 }
      );
    }

    await deleteDoc(docRef);

    return NextResponse.json({
      success: true,
      message: "Integration deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting GHL integration:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
