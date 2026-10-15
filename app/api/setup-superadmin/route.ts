/**
 * API Route to set up SuperAdmin
 * POST /api/setup-superadmin
 * 
 * This is a one-time setup endpoint that should be disabled after use.
 */

import { NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  // For development, use application default credentials or service account
  try {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

const SUPERADMIN_EMAIL = "bstitt@adams-electric.com";
const SUPERADMIN_UID = "EXeWJ63xxWTxWCpeSYgBtd0a9Qy1";

export async function POST() {
  try {
    const db = getFirestore();
    const now = Timestamp.now();

    // 1. Create/update user document with SuperAdmin role
    const userRef = db.collection("users").doc(SUPERADMIN_UID);
    await userRef.set({
      email: SUPERADMIN_EMAIL,
      role: "superadmin",
      isSuperAdmin: true,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    // 2. Find existing team member by email and link
    const teamMembersRef = db.collection("teamMembers");
    const snapshot = await teamMembersRef.where("emailPrimary", "==", SUPERADMIN_EMAIL).get();

    let teamMemberId = null;

    if (!snapshot.empty) {
      // Update existing team member
      const teamMemberDoc = snapshot.docs[0];
      teamMemberId = teamMemberDoc.id;
      
      await teamMemberDoc.ref.update({
        authUid: SUPERADMIN_UID,
        role: "admin",
        isSuperAdmin: true,
        updatedAt: now,
      });
    } else {
      // Create new team member
      const newTeamMemberRef = await teamMembersRef.add({
        authUid: SUPERADMIN_UID,
        emailPrimary: SUPERADMIN_EMAIL,
        firstName: "Brian",
        lastName: "Stitt",
        role: "admin",
        isSuperAdmin: true,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      teamMemberId = newTeamMemberRef.id;
    }

    return NextResponse.json({
      success: true,
      message: "SuperAdmin setup complete",
      data: {
        email: SUPERADMIN_EMAIL,
        uid: SUPERADMIN_UID,
        teamMemberId,
        role: "superadmin",
      },
    });

  } catch (error) {
    console.error("Error setting up SuperAdmin:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to set up SuperAdmin",
    endpoint: "/api/setup-superadmin",
  });
}
