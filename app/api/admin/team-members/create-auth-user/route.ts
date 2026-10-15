import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/schema";
import { getDb } from "@/lib/adams-harness/server-store";
import { requireUser, authErrorResponse } from "@/lib/auth/server-auth";
import type { UserRole } from "@/lib/permissions";

const VALID_ROLES: ReadonlySet<UserRole> = new Set([
  "superadmin",
  "admin",
  "team",
  "affiliate",
  "consultant",
  "client",
]);

function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && VALID_ROLES.has(value as UserRole);
}

export async function POST(request: NextRequest) {
  try {
    if (!adminAuth) {
      return NextResponse.json(
        { error: "Authentication service unavailable" },
        { status: 503 },
      );
    }

    const actor = await requireUser(request);
    if (actor.role !== "superadmin") {
      return NextResponse.json(
        { error: "Superadmin role required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      role,
    }: {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      role?: unknown;
    } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 },
      );
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "A password with at least 6 characters is required" },
        { status: 400 },
      );
    }
    if (!firstName || typeof firstName !== "string" || firstName.trim() === "") {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 },
      );
    }
    if (!lastName || typeof lastName !== "string" || lastName.trim() === "") {
      return NextResponse.json(
        { error: "Last name is required" },
        { status: 400 },
      );
    }
    if (!isValidRole(role)) {
      return NextResponse.json(
        { error: "A valid role is required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Create the Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email: normalizedEmail,
      password,
      displayName: `${firstName.trim()} ${lastName.trim()}`,
    });

    const db = getDb();
    const now = new Date();

    // Create the matching Team Member document
    const teamMemberRef = db.collection(COLLECTIONS.TEAM_MEMBERS).doc();
    const teamMemberData = {
      id: teamMemberRef.id,
      firebaseUid: userRecord.uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailPrimary: normalizedEmail,
      role,
      status: "active" as const,
      expertise: "",
      authLinked: true,
      authLinkedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await teamMemberRef.set(teamMemberData);

    return NextResponse.json({
      success: true,
      teamMemberId: teamMemberRef.id,
      uid: userRecord.uid,
      email: normalizedEmail,
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;

    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "auth/email-already-exists") {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 },
        );
      }
      if (
        code === "auth/invalid-email" ||
        code === "auth/invalid-password" ||
        code === "auth/weak-password"
      ) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 400 },
        );
      }
    }

    console.error("Create auth user error:", error);
    return NextResponse.json(
      { error: "Failed to create auth user and team member" },
      { status: 500 },
    );
  }
}
