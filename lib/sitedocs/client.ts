import { adminDb } from "@/lib/firebase-admin";

export const SITEDOCS_DEFAULT_BASE_URL = "https://api-1.sitedocs.com";

export interface SiteDocsConfig {
  apiKey: string;
  baseUrl: string;
}

/** Resolve SiteDocs credentials from stored secrets/settings, falling back to env. */
export async function resolveSiteDocsConfig(): Promise<SiteDocsConfig | null> {
  const envKey = process.env.SITEDOCS_API_KEY;
  let apiKey = envKey || "";
  let baseUrl = process.env.SITEDOCS_BASE_URL || SITEDOCS_DEFAULT_BASE_URL;

  if (adminDb) {
    try {
      const secretSnap = await adminDb.collection("platformSecrets").doc("sitedocs").get();
      if (secretSnap.exists) {
        const secret = secretSnap.data() as { apiKey?: string };
        if (secret.apiKey) apiKey = secret.apiKey;
      }
      const settingsSnap = await adminDb.collection("platformSettings").doc("global").get();
      if (settingsSnap.exists) {
        const settings = settingsSnap.data() as { sitedocs?: { baseUrl?: string } };
        if (settings.sitedocs?.baseUrl) baseUrl = settings.sitedocs.baseUrl;
      }
    } catch (error) {
      console.error("Failed to resolve SiteDocs config:", error);
    }
  }

  if (!apiKey) return null;
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, "") };
}

async function sitedocsFetch<T>(config: SiteDocsConfig, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: config.apiKey,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`SiteDocs ${path} failed (${response.status}): ${text.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

export interface SiteDocsWorker {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  employeeNumber?: string;
  status?: string;
  [key: string]: unknown;
}

export interface SiteDocsCertification {
  id: string;
  workerId?: string;
  certificationTypeId?: string;
  certificationTypeName?: string;
  name?: string;
  issuedOn?: string;
  expiryOn?: string;
  status?: string;
  [key: string]: unknown;
}

export interface SiteDocsListResponse<T> {
  items?: T[];
  totalCount?: number;
}

function asArray<T>(value: T[] | SiteDocsListResponse<T>): T[] {
  return Array.isArray(value) ? value : value.items || [];
}

export const sitedocsClient = {
  account: (config: SiteDocsConfig) => sitedocsFetch<Record<string, unknown>>(config, "/api/v1/users/account"),
  workers: async (config: SiteDocsConfig, page = 0, count = 100) =>
    asArray(await sitedocsFetch<SiteDocsWorker[] | SiteDocsListResponse<SiteDocsWorker>>(config, `/api/v1/workers?page=${page}&count=${count}`)),
  certifications: async (config: SiteDocsConfig, page = 0, count = 100) =>
    asArray(await sitedocsFetch<SiteDocsCertification[] | SiteDocsListResponse<SiteDocsCertification>>(config, `/api/v1/certifications?page=${page}&count=${count}`)),
  locations: async (config: SiteDocsConfig) =>
    asArray(await sitedocsFetch<Record<string, unknown>[] | SiteDocsListResponse<Record<string, unknown>>>(config, "/api/v1/locations")),
  formTypes: async (config: SiteDocsConfig) =>
    asArray(await sitedocsFetch<Record<string, unknown>[] | SiteDocsListResponse<Record<string, unknown>>>(config, "/api/v1/formtypes")),
};
