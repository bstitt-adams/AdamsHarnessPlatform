/**
 * GoHighLevel Test Connection API
 * 
 * Tests the connection to GHL using the stored API credentials
 */

import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, GHLIntegrationDoc } from "@/lib/schema";
import { GoHighLevelService } from "@/lib/gohighlevel-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Create GHL service with stored credentials
    const ghlService = new GoHighLevelService({
      apiToken: data.apiToken,
      locationId: data.locationId,
      agencyId: data.agencyId,
    });

    // Test the connection
    const result = await ghlService.testConnection();

    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        message: "Connection successful",
        locationName: result.data.locationName,
        locationId: result.data.locationId,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to connect to GoHighLevel",
      });
    }
  } catch (error) {
    console.error("Error testing GHL connection:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
