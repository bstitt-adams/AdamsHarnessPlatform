import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";
import type { UserRole } from "@/lib/permissions";

export type AuthenticatedActor = {
  uid: string;
  email: string;
  role: UserRole;
  teamMemberId?: string;
  departmentIds: string[];
};

export class ApiAuthError extends Error {
  constructor(
    public status: 401 | 403 | 503,
    message: string,
  ) {
    super(message);
    this.name = "ApiAuthError";
  }
}

const KNOWN_ROLES: ReadonlySet<string> = new Set([
  "superadmin",
  "admin",
  "team",
  "affiliate",
  "consultant",
  "client",
]);

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value === "string" && KNOWN_ROLES.has(value)) {
    return value as UserRole;
  }
  return null;
}

function extractBearerToken(request: NextRequest): string {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(\S+)\s*$/i);
  if (!match || !match[1]) {
    throw new ApiAuthError(401, "Missing or malformed Authorization header");
  }
  return match[1];
}

function normalizeDepartmentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}

export async function requireUser(request: NextRequest): Promise<AuthenticatedActor> {
  if (!adminAuth || !adminDb) {
    throw new ApiAuthError(503, "Authentication service unavailable");
  }

  const token = extractBearerToken(request);

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    throw new ApiAuthError(401, "Invalid or expired token");
  }

  const uid = decoded.uid;
  const email = typeof decoded.email === "string" ? decoded.email : "";

  let userData: Record<string, unknown> = {};
  try {
    const userSnap = await adminDb.collection(COLLECTIONS.USERS).doc(uid).get();
    if (userSnap.exists) {
      userData = userSnap.data() as Record<string, unknown>;
    }
  } catch {
    throw new ApiAuthError(503, "Unable to load user record");
  }

  let teamMember: TeamMemberDoc | null = null;
  try {
    const teamMembers = adminDb.collection(COLLECTIONS.TEAM_MEMBERS);
    const byUid = await teamMembers
      .where("firebaseUid", "==", uid)
      .limit(1)
      .get();
    if (!byUid.empty) {
      teamMember = { id: byUid.docs[0].id, ...byUid.docs[0].data() } as TeamMemberDoc;
    } else {
      const byAuthUid = await teamMembers
        .where("authUid", "==", uid)
        .limit(1)
        .get();
      if (!byAuthUid.empty) {
        teamMember = { id: byAuthUid.docs[0].id, ...byAuthUid.docs[0].data() } as TeamMemberDoc;
      } else if (typeof userData.teamMemberId === "string" && userData.teamMemberId) {
        const tmSnap = await teamMembers.doc(userData.teamMemberId).get();
        if (tmSnap.exists) {
          teamMember = { id: tmSnap.id, ...tmSnap.data() } as TeamMemberDoc;
        }
      }
    }
  } catch {
    throw new ApiAuthError(503, "Unable to load team member record");
  }

  const role =
    normalizeRole(teamMember?.role) ?? normalizeRole(userData.role) ?? "client";

  const departmentIds = [
    ...new Set([
      ...normalizeDepartmentIds(teamMember?.departmentIds),
      ...normalizeDepartmentIds(userData.departmentIds),
    ]),
  ];

  return {
    uid,
    email,
    role,
    teamMemberId: teamMember?.id,
    departmentIds,
  };
}

export async function requireAdmin(request: NextRequest): Promise<AuthenticatedActor> {
  const actor = await requireUser(request);
  if (actor.role !== "superadmin" && actor.role !== "admin") {
    throw new ApiAuthError(403, "Admin role required");
  }
  return actor;
}

export function authErrorResponse(error: ApiAuthError): NextResponse;
export function authErrorResponse(error: unknown): NextResponse | null;
export function authErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}
