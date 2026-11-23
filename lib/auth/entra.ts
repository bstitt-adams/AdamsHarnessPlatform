/**
 * Microsoft Entra ID token verification — Phase 1 dual-auth.
 * Active only when ENTRA_CLIENT_ID + ENTRA_TENANT_ID are set; server-auth
 * tries Firebase verifyIdToken first, then falls back here.
 * Roles come from the app-role `roles` claim (mirrors users/{uid}.role).
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { UserRole } from "@/lib/permissions";

const TENANT = process.env.ENTRA_TENANT_ID;
const CLIENT_ID = process.env.ENTRA_CLIENT_ID;

const jwks = TENANT
  ? createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${TENANT}/discovery/v2.0/keys`),
    )
  : null;

export type EntraIdentity = {
  oid: string;
  email: string;
  roles: UserRole[];
  name?: string;
};

const KNOWN: ReadonlySet<string> = new Set([
  "superadmin",
  "admin",
  "team",
  "affiliate",
  "consultant",
  "client",
  "safety",
]);

export function entraEnabled(): boolean {
  return Boolean(jwks && CLIENT_ID);
}

export async function verifyEntraToken(token: string): Promise<EntraIdentity> {
  if (!jwks || !CLIENT_ID || !TENANT) throw new Error("Entra auth not configured");
  const { payload } = await jwtVerify(token, jwks, {
    audience: [CLIENT_ID, `api://${CLIENT_ID}`],
    issuer: [
      `https://login.microsoftonline.com/${TENANT}/v2.0`,
      `https://sts.windows.net/${TENANT}/`,
    ],
  });
  const oid = typeof payload.oid === "string" ? payload.oid : payload.sub;
  if (!oid) throw new Error("Entra token missing oid");
  const email =
    (typeof payload.preferred_username === "string" && payload.preferred_username) ||
    (typeof payload.email === "string" && payload.email) ||
    (typeof payload.upn === "string" && payload.upn) ||
    "";
  const roles = (Array.isArray(payload.roles) ? payload.roles : []).filter(
    (r): r is UserRole => typeof r === "string" && KNOWN.has(r),
  );
  return {
    oid,
    email,
    roles,
    name: typeof payload.name === "string" ? payload.name : undefined,
  };
}
