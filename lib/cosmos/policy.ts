/**
 * Coarse port of firestore.rules for the Cosmos façade.
 * Phase 4 of the Azure migration ports the full rule matrix (per-field checks,
 * owner scoping, harness-admin collections); until then these buckets keep the
 * same coarse guarantees: deny / auth / admin-read / admin-write.
 * Keys are FLATTENED collection names (projects/{id}/items → projects__items).
 */
import type { AuthenticatedActor } from "@/lib/auth/server-auth";

export type Policy = { read?: "auth" | "admin" | "deny"; write?: "auth" | "admin" | "deny" };

const ADMIN = "admin" as const;
const AUTH = "auth" as const;
const DENY = "deny" as const;

/** Collections the façade may never serve (server-internal / harness-admin only). */
const DENIED = new Set([
  "adamsBrains", "brainSources", "brainChunks", "brainQueries",
  "moduleRecords", "moduleNotifications", "moduleUploads",
  "telegramPlatformEvents", "telegramPlatformUpdates",
  "keyActivations", "userMicrosoftTokens", "adamsAuditLogs",
  "deploymentAuditLogs", "deploymentAnalytics", "backupMetadata",
  "backupSchedules", "backupStorageProviders", "sitedocsSyncRuns",
]);

/** Writes require admin; reads stay authenticated. */
const ADMIN_WRITE = new Set([
  "users", "teamMembers", "organizations", "platformSettings",
  "platformSettings__notifications", "platformAutomations", "automationRuns",
  "docusealSubmissions", "docusealTemplates", "gohighlevelIntegrations",
  "gohighlevelSyncLogs", "ghlImportedWorkflows", "ghlWorkflows",
  "apolloPurchasedContacts", "apolloSavedLists",
  "thomasnetSavedLists", "thomasnetSavedSuppliers",
  "moduleSettings", "moduleScheduleRuns", "assetSyncRuns",
  "officeLocations", "conferenceLines", "workforceDepartments",
  "jobTitles", "businessUnits", "softwareKeys",
  "backupMetadata", "backupSchedules", "backupStorageProviders",
]);

export function policyFor(collection: string): Required<Policy> {
  const flat = collection.replace(/\//g, "__");
  if (DENIED.has(flat) || DENIED.has(collection)) return { read: DENY, write: DENY };
  if (ADMIN_WRITE.has(flat) || ADMIN_WRITE.has(collection)) return { read: AUTH, write: ADMIN };
  return { read: AUTH, write: AUTH };
}

const isAdmin = (a: AuthenticatedActor) => a.role === "admin" || a.role === "superadmin";

export function canRead(actor: AuthenticatedActor, collection: string): boolean {
  const p = policyFor(collection).read;
  if (p === DENY) return false;
  if (p === ADMIN) return isAdmin(actor);
  return true; // 'auth' — requireUser already proved authentication
}

export function canWrite(actor: AuthenticatedActor, collection: string, docId?: string, data?: Record<string, unknown>): boolean {
  const p = policyFor(collection).write;
  if (p === DENY) return false;
  if (p === ADMIN) {
    // users: self-update allowed if role/isSuperAdmin unchanged (mirrors rules)
    if (collection === "users" && docId === actor.uid && data) {
      return data.role === undefined && data.isSuperAdmin === undefined;
    }
    return isAdmin(actor);
  }
  return true;
}
