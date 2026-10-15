/**
 * Backup Service for Adams Electric Platform
 * Handles Firestore data export, backup creation, and restore operations
 */

import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import {
  COLLECTIONS,
  type BackupMetadataDoc,
  type BackupScheduleDoc,
  type BackupStorageProviderDoc,
} from "@/lib/schema";

// ============================================================================
// Types
// ============================================================================

export interface BackupConfig {
  type: "full" | "incremental" | "collections";
  collections?: string[];
  compression: "gzip" | "zip" | "none";
  encryption: boolean;
  encryptionKey?: string;
  storageProviders?: string[];
}

export interface BackupResult {
  id: string;
  timestamp: Date;
  type: string;
  size: number;
  compressedSize: number;
  duration: number;
  collections: string[];
  documentCounts: Record<string, number>;
  storageLocations: { provider: string; path: string; url?: string }[];
  checksum: string;
  status: "success" | "failed" | "partial";
  error?: string;
}

export interface RestoreOptions {
  collections?: string[];
  overwrite: boolean;
  dryRun?: boolean;
}

export interface RestoreResult {
  success: boolean;
  collectionsRestored: string[];
  documentsRestored: number;
  errors: string[];
  duration: number;
}

export interface BackupData {
  version: string;
  createdAt: string;
  collections: Record<string, any[]>;
  metadata: {
    totalDocuments: number;
    collectionCounts: Record<string, number>;
  };
}

// ============================================================================
// Constants
// ============================================================================

const BACKUP_VERSION = "1.0.0";

// Collections to backup (all main collections)
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

// ============================================================================
// Utility Functions
// ============================================================================

function generateBackupId(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const random = Math.random().toString(36).substring(2, 8);
  return `backup-${timestamp}-${random}`;
}

function calculateChecksum(data: string): string {
  // Simple hash for checksum (in production, use crypto)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Convert Firestore Timestamps to serializable format
function serializeDocument(doc: any): any {
  const serialized: any = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value instanceof Timestamp) {
      serialized[key] = {
        _type: "Timestamp",
        seconds: value.seconds,
        nanoseconds: value.nanoseconds,
      };
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      serialized[key] = serializeDocument(value);
    } else if (Array.isArray(value)) {
      serialized[key] = value.map((item) =>
        typeof item === "object" && item !== null ? serializeDocument(item) : item
      );
    } else {
      serialized[key] = value;
    }
  }
  return serialized;
}

// Convert serialized format back to Firestore Timestamps
function deserializeDocument(doc: any): any {
  const deserialized: any = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value && typeof value === "object" && (value as any)._type === "Timestamp") {
      deserialized[key] = new Timestamp(
        (value as any).seconds,
        (value as any).nanoseconds
      );
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      deserialized[key] = deserializeDocument(value);
    } else if (Array.isArray(value)) {
      deserialized[key] = value.map((item) =>
        typeof item === "object" && item !== null ? deserializeDocument(item) : item
      );
    } else {
      deserialized[key] = value;
    }
  }
  return deserialized;
}

// ============================================================================
// Backup Service Class
// ============================================================================

export class BackupService {
  // Export a single collection
  async exportCollection(collectionName: string): Promise<any[]> {
    if (!db) throw new Error("Database not initialized");

    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    const documents: any[] = [];
    snapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...serializeDocument(doc.data()),
      });
    });

    return documents;
  }

  // Import documents to a collection
  async importCollection(
    collectionName: string,
    documents: any[],
    overwrite: boolean = false
  ): Promise<number> {
    if (!db) throw new Error("Database not initialized");

    let imported = 0;
    const batchSize = 500;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = documents.slice(i, i + batchSize);

      for (const docData of chunk) {
        const { id, ...data } = docData;
        const docRef = doc(db, collectionName, id);
        const deserializedData = deserializeDocument(data);
        
        if (overwrite) {
          batch.set(docRef, deserializedData);
        } else {
          batch.set(docRef, deserializedData, { merge: true });
        }
        imported++;
      }

      await batch.commit();
    }

    return imported;
  }

  // Create a full backup
  async createBackup(config: BackupConfig): Promise<BackupResult> {
    if (!db) throw new Error("Database not initialized");

    const backupId = generateBackupId();
    const startTime = Date.now();
    const collectionsToBackup = config.collections || BACKUPABLE_COLLECTIONS;
    
    const backupData: BackupData = {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      collections: {},
      metadata: {
        totalDocuments: 0,
        collectionCounts: {},
      },
    };

    const documentCounts: Record<string, number> = {};
    const errors: string[] = [];

    // Export each collection
    for (const collectionName of collectionsToBackup) {
      try {
        const documents = await this.exportCollection(collectionName);
        backupData.collections[collectionName] = documents;
        documentCounts[collectionName] = documents.length;
        backupData.metadata.totalDocuments += documents.length;
        backupData.metadata.collectionCounts[collectionName] = documents.length;
      } catch (error) {
        console.error(`Error exporting collection ${collectionName}:`, error);
        errors.push(`Failed to export ${collectionName}: ${(error as Error).message}`);
      }
    }

    // Serialize backup data
    const backupJson = JSON.stringify(backupData, null, 2);
    const size = new Blob([backupJson]).size;
    const checksum = calculateChecksum(backupJson);

    const duration = Date.now() - startTime;
    const status = errors.length === 0 ? "success" : errors.length < collectionsToBackup.length ? "partial" : "failed";

    // Create backup metadata record - exclude undefined fields for Firestore
    const metadataDoc: Record<string, any> = {
      id: backupId,
      createdAt: Timestamp.now(),
      completedAt: Timestamp.now(),
      type: config.type,
      status,
      size,
      compressedSize: size, // No compression in Phase 1
      duration,
      collections: collectionsToBackup,
      documentCounts,
      storageLocations: [],
      checksum,
      encryptionEnabled: config.encryption,
      triggeredBy: "manual",
      metadata: {
        version: BACKUP_VERSION,
        totalDocuments: backupData.metadata.totalDocuments,
      },
    };

    // Only add error field if there are errors
    if (errors.length > 0) {
      metadataDoc.error = errors.join("; ");
    }

    // Save metadata to Firestore
    await setDoc(doc(db, COLLECTIONS.BACKUP_METADATA, backupId), metadataDoc);

    return {
      id: backupId,
      timestamp: new Date(),
      type: config.type,
      size,
      compressedSize: size,
      duration,
      collections: collectionsToBackup,
      documentCounts,
      storageLocations: [],
      checksum,
      status,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    };
  }

  // Restore from backup data
  async restoreBackup(
    backupData: BackupData,
    options: RestoreOptions
  ): Promise<RestoreResult> {
    if (!db) throw new Error("Database not initialized");

    const startTime = Date.now();
    const collectionsToRestore = options.collections || Object.keys(backupData.collections);
    const errors: string[] = [];
    let totalDocuments = 0;
    const restoredCollections: string[] = [];

    if (options.dryRun) {
      return {
        success: true,
        collectionsRestored: collectionsToRestore,
        documentsRestored: Object.values(backupData.metadata.collectionCounts).reduce((a, b) => a + b, 0),
        errors: [],
        duration: Date.now() - startTime,
      };
    }

    for (const collectionName of collectionsToRestore) {
      const documents = backupData.collections[collectionName];
      if (!documents) {
        errors.push(`Collection ${collectionName} not found in backup`);
        continue;
      }

      try {
        const imported = await this.importCollection(collectionName, documents, options.overwrite);
        totalDocuments += imported;
        restoredCollections.push(collectionName);
      } catch (error) {
        errors.push(`Failed to restore ${collectionName}: ${(error as Error).message}`);
      }
    }

    return {
      success: errors.length === 0,
      collectionsRestored: restoredCollections,
      documentsRestored: totalDocuments,
      errors,
      duration: Date.now() - startTime,
    };
  }

  // List all backups
  async listBackups(limitCount: number = 50): Promise<BackupMetadataDoc[]> {
    if (!db) throw new Error("Database not initialized");

    const backupsRef = collection(db, COLLECTIONS.BACKUP_METADATA);
    const q = query(backupsRef, orderBy("createdAt", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);

    const backups: BackupMetadataDoc[] = [];
    snapshot.forEach((doc) => {
      backups.push(doc.data() as BackupMetadataDoc);
    });

    return backups;
  }

  // Get a specific backup
  async getBackup(backupId: string): Promise<BackupMetadataDoc | null> {
    if (!db) throw new Error("Database not initialized");

    const backupsRef = collection(db, COLLECTIONS.BACKUP_METADATA);
    const q = query(backupsRef, where("id", "==", backupId), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as BackupMetadataDoc;
  }

  // Delete a backup
  async deleteBackup(backupId: string): Promise<void> {
    if (!db) throw new Error("Database not initialized");

    await deleteDoc(doc(db, COLLECTIONS.BACKUP_METADATA, backupId));
  }

  // Get backup statistics
  async getBackupStats(): Promise<{
    totalBackups: number;
    lastBackup: BackupMetadataDoc | null;
    totalSize: number;
    successRate: number;
  }> {
    const backups = await this.listBackups(100);
    
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    const successCount = backups.filter((b) => b.status === "success").length;
    const successRate = backups.length > 0 ? (successCount / backups.length) * 100 : 0;

    return {
      totalBackups: backups.length,
      lastBackup: backups[0] || null,
      totalSize,
      successRate,
    };
  }

  // Get available collections for backup
  getAvailableCollections(): string[] {
    return [...BACKUPABLE_COLLECTIONS];
  }
}

// Export singleton instance
export const backupService = new BackupService();

// Export utility functions
export { formatBytes, generateBackupId };
