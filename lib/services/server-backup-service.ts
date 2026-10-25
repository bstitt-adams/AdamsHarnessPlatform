import { createHash } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS, type BackupMetadataDoc } from "@/lib/schema";
import { googleDriveProvider } from "@/lib/services/storage-providers/google-drive-provider";

const BACKUP_VERSION = "1.0.0";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

const BACKUPABLE_COLLECTIONS = [
  COLLECTIONS.USERS,
  COLLECTIONS.ORGANIZATIONS,
  COLLECTIONS.OPPORTUNITIES,
  COLLECTIONS.PROJECTS,
  COLLECTIONS.MEETINGS,
  COLLECTIONS.ACTION_ITEMS,
  COLLECTIONS.ROCKS,
  COLLECTIONS.DOCUMENTS,
  COLLECTIONS.PLATFORM_DOCUMENTS,
  COLLECTIONS.SERVICES,
  COLLECTIONS.CERTIFICATIONS,
  COLLECTIONS.ACTIVITIES,
  COLLECTIONS.NOTES,
  COLLECTIONS.MILESTONES,
  COLLECTIONS.AFFILIATE_BIOGRAPHIES,
  COLLECTIONS.GAINS_PROFILES,
  COLLECTIONS.CONTACT_SPHERES,
  COLLECTIONS.PREVIOUS_CUSTOMERS,
  COLLECTIONS.ONE_TO_ONE_MEETINGS,
  COLLECTIONS.REFERRALS,
  COLLECTIONS.AFFILIATE_STATS,
  COLLECTIONS.AI_MATCH_SUGGESTIONS,
  COLLECTIONS.STRATEGIC_PARTNERS,
  COLLECTIONS.TEAM_MEMBERS,
  COLLECTIONS.PLATFORM_SETTINGS,
  COLLECTIONS.APOLLO_PURCHASED_CONTACTS,
  COLLECTIONS.APOLLO_SAVED_LISTS,
  COLLECTIONS.THOMASNET_SAVED_SUPPLIERS,
  COLLECTIONS.THOMASNET_SAVED_LISTS,
  COLLECTIONS.TRACTION_ROCKS,
  COLLECTIONS.TRACTION_SCORECARD_METRICS,
  COLLECTIONS.TRACTION_ISSUES,
  COLLECTIONS.TRACTION_TODOS,
  COLLECTIONS.TRACTION_MEETINGS,
  COLLECTIONS.CALENDAR_EVENTS,
  COLLECTIONS.ONE_TO_ONE_QUEUE,
  COLLECTIONS.TEAM_MEMBER_AVAILABILITY,
  COLLECTIONS.BOOKINGS,
  COLLECTIONS.EVENTS,
  COLLECTIONS.EVENT_REGISTRATIONS,
  COLLECTIONS.AI_EMPLOYEES,
  COLLECTIONS.AI_EMPLOYEE_CHATS,
  COLLECTIONS.BUG_TRACKER_ITEMS,
];

export interface ServerBackupConfig {
  type: "full" | "incremental" | "collections";
  collections?: string[];
  compression: "gzip" | "zip" | "none";
  encryption: boolean;
  storageProviders?: string[];
  triggeredBy?: "manual" | "scheduled";
}

function generateBackupId() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `backup-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
}

function serializeValue(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (value instanceof Timestamp || typeof (value as { toDate?: unknown }).toDate === "function") {
    const timestamp = value as { seconds: number; nanoseconds: number };
    return { _type: "Timestamp", seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds };
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof (value as { path?: unknown }).path === "string") return { _type: "DocumentReference", path: (value as { path: string }).path };
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeValue(item)]));
}

export async function createServerBackup(config: ServerBackupConfig) {
  if (!adminDb) throw new Error("Firebase Admin is not configured");
  const backupId = generateBackupId();
  const startedAt = Date.now();
  const collections = config.collections?.length ? config.collections : BACKUPABLE_COLLECTIONS;
  const backupData = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    collections: {} as Record<string, unknown[]>,
    metadata: { totalDocuments: 0, collectionCounts: {} as Record<string, number> },
  };
  const errors: string[] = [];

  for (const collectionName of collections) {
    try {
      const snapshot = await adminDb.collection(collectionName).get();
      const documents = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(serializeValue(docSnap.data()) as Record<string, unknown>),
      }));
      backupData.collections[collectionName] = documents;
      backupData.metadata.collectionCounts[collectionName] = documents.length;
      backupData.metadata.totalDocuments += documents.length;
    } catch (error) {
      errors.push(`Failed to export ${collectionName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const backupJson = JSON.stringify(backupData, null, 2);
  const size = Buffer.byteLength(backupJson);
  const checksum = createHash("sha256").update(backupJson).digest("hex");
  const storageLocations: BackupMetadataDoc["storageLocations"] = [];
  const shouldUseGoogleDrive = config.storageProviders?.includes("google-drive") !== false;

  if (shouldUseGoogleDrive) {
    try {
      const driveConfig = await googleDriveProvider.loadConfig();
      if (!driveConfig?.connected || !driveConfig.credentials) {
        errors.push("Google Drive is not connected; backup metadata was saved without backup data");
      } else if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        errors.push("Google OAuth is not configured; backup metadata was saved without backup data");
      } else {
        const accessToken = await googleDriveProvider.getAccessToken(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
        const driveFile = await googleDriveProvider.uploadFile(
          accessToken,
          `${backupId}.json`,
          backupJson,
          "application/json",
        );
        storageLocations.push({ provider: "google-drive", path: driveFile.id, url: driveFile.webViewLink });
      }
    } catch (error) {
      errors.push(`Google Drive upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const status = errors.length === 0 ? "success" : backupData.metadata.totalDocuments > 0 ? "partial" : "failed";
  const metadataDoc: Omit<BackupMetadataDoc, "createdAt" | "completedAt"> & {
    createdAt: Timestamp;
    completedAt: Timestamp;
  } = {
    id: backupId,
    createdAt: Timestamp.now(),
    completedAt: Timestamp.now(),
    type: config.type,
    status,
    size,
    compressedSize: size,
    duration: Date.now() - startedAt,
    collections,
    documentCounts: backupData.metadata.collectionCounts,
    storageLocations,
    checksum,
    encryptionEnabled: config.encryption,
    triggeredBy: config.triggeredBy || "manual",
    metadata: {
      version: BACKUP_VERSION,
      totalDocuments: backupData.metadata.totalDocuments,
      cloudStorage: shouldUseGoogleDrive ? "google-drive" : "metadata-only",
    },
    ...(errors.length ? { error: errors.join("; ") } : {}),
  };

  await adminDb.collection(COLLECTIONS.BACKUP_METADATA).doc(backupId).set(metadataDoc);
  return metadataDoc;
}
