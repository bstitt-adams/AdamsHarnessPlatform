/**
 * GoHighLevel Sync API
 * 
 * Triggers data synchronization between the platform and GHL
 */

import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, GHLIntegrationDoc, GHLSyncLogDoc } from "@/lib/schema";
import { GoHighLevelService } from "@/lib/gohighlevel-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const syncType = (body.syncType || 'full') as GHLSyncLogDoc['syncType'];
    
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

    const integration = docSnap.data() as GHLIntegrationDoc;

    if (!integration.isActive) {
      return NextResponse.json(
        { success: false, error: "Integration is not active" },
        { status: 400 }
      );
    }

    // Create sync log entry
    const now = Timestamp.now();
    const syncLog: Omit<GHLSyncLogDoc, 'id'> = {
      integrationId: id,
      syncType,
      status: 'started',
      recordsProcessed: 0,
      recordsSuccessful: 0,
      recordsFailed: 0,
      startedAt: now,
      errors: [],
      triggeredBy: 'system', // TODO: Get from auth
      triggerType: 'manual',
      createdAt: now,
      updatedAt: now,
    };

    const syncLogRef = await addDoc(collection(db, COLLECTIONS.GHL_SYNC_LOGS), syncLog);

    // Create GHL service
    const ghlService = new GoHighLevelService({
      apiToken: integration.apiToken,
      locationId: integration.locationId,
      agencyId: integration.agencyId,
    });

    // Update sync log to in_progress
    await updateDoc(doc(db, COLLECTIONS.GHL_SYNC_LOGS, syncLogRef.id), {
      status: 'in_progress',
      updatedAt: Timestamp.now(),
    });

    // Perform sync based on type
    const errors: GHLSyncLogDoc['errors'] = [];
    let contactsCreated = 0;
    let contactsUpdated = 0;
    let opportunitiesCreated = 0;
    let opportunitiesUpdated = 0;
    let recordsProcessed = 0;
    let recordsSuccessful = 0;
    let recordsFailed = 0;

    try {
      // Sync contacts if enabled
      if ((syncType === 'full' || syncType === 'contacts') && integration.syncContacts) {
        const contactsResult = await ghlService.getContacts(100);
        if (contactsResult.success && contactsResult.data?.contacts) {
          recordsProcessed += contactsResult.data.contacts.length;
          recordsSuccessful += contactsResult.data.contacts.length;
          contactsUpdated = contactsResult.data.contacts.length;
        } else if (contactsResult.error) {
          errors.push({ error: `Contacts sync failed: ${contactsResult.error}` });
          recordsFailed++;
        }
      }

      // Sync opportunities if enabled
      if ((syncType === 'full' || syncType === 'opportunities') && integration.syncOpportunities) {
        const oppsResult = await ghlService.getOpportunities();
        if (oppsResult.success && oppsResult.data?.opportunities) {
          recordsProcessed += oppsResult.data.opportunities.length;
          recordsSuccessful += oppsResult.data.opportunities.length;
          opportunitiesUpdated = oppsResult.data.opportunities.length;
        } else if (oppsResult.error) {
          errors.push({ error: `Opportunities sync failed: ${oppsResult.error}` });
          recordsFailed++;
        }
      }

      // Sync calendars if enabled
      if ((syncType === 'full' || syncType === 'calendars') && integration.syncCalendars) {
        const calendarsResult = await ghlService.getCalendars();
        if (calendarsResult.success && calendarsResult.data?.calendars) {
          recordsProcessed += calendarsResult.data.calendars.length;
          recordsSuccessful += calendarsResult.data.calendars.length;
        } else if (calendarsResult.error) {
          errors.push({ error: `Calendars sync failed: ${calendarsResult.error}` });
          recordsFailed++;
        }
      }

      // Sync pipelines if enabled
      if ((syncType === 'full' || syncType === 'pipelines') && integration.syncPipelines) {
        const pipelinesResult = await ghlService.getPipelines();
        if (pipelinesResult.success && pipelinesResult.data?.pipelines) {
          recordsProcessed += pipelinesResult.data.pipelines.length;
          recordsSuccessful += pipelinesResult.data.pipelines.length;
        } else if (pipelinesResult.error) {
          errors.push({ error: `Pipelines sync failed: ${pipelinesResult.error}` });
          recordsFailed++;
        }
      }

      // Update sync log with results
      const completedAt = Timestamp.now();
      const duration = completedAt.toMillis() - now.toMillis();

      await updateDoc(doc(db, COLLECTIONS.GHL_SYNC_LOGS, syncLogRef.id), {
        status: errors.length > 0 ? 'completed' : 'completed',
        recordsProcessed,
        recordsSuccessful,
        recordsFailed,
        completedAt,
        duration,
        errors,
        summary: {
          contactsCreated,
          contactsUpdated,
          opportunitiesCreated,
          opportunitiesUpdated,
        },
        updatedAt: completedAt,
      });

      // Update integration with last sync info
      await updateDoc(docRef, {
        lastSyncAt: completedAt,
        lastSyncStatus: errors.length > 0 ? 'error' : 'success',
        lastSyncError: errors.length > 0 ? errors[0].error : null,
        totalContactsSynced: integration.totalContactsSynced + contactsCreated + contactsUpdated,
        totalOpportunitiesSynced: integration.totalOpportunitiesSynced + opportunitiesCreated + opportunitiesUpdated,
        rateLimitRemaining: ghlService.getRateLimitInfo().remaining,
        updatedAt: completedAt,
      });

      return NextResponse.json({
        success: true,
        syncLogId: syncLogRef.id,
        summary: {
          recordsProcessed,
          recordsSuccessful,
          recordsFailed,
          contactsCreated,
          contactsUpdated,
          opportunitiesCreated,
          opportunitiesUpdated,
          duration,
          errors: errors.length,
        },
      });
    } catch (syncError) {
      // Update sync log with failure
      await updateDoc(doc(db, COLLECTIONS.GHL_SYNC_LOGS, syncLogRef.id), {
        status: 'failed',
        errors: [{ error: syncError instanceof Error ? syncError.message : 'Unknown sync error' }],
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update integration with failure
      await updateDoc(docRef, {
        lastSyncAt: Timestamp.now(),
        lastSyncStatus: 'error',
        lastSyncError: syncError instanceof Error ? syncError.message : 'Unknown sync error',
        updatedAt: Timestamp.now(),
      });

      throw syncError;
    }
  } catch (error) {
    console.error("Error syncing with GHL:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
