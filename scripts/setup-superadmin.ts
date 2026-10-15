/**
 * Setup SuperAdmin Script
 * 
 * This script sets up bstitt@adams-electric.com as a SuperAdmin
 * and links the Firebase Auth UID to the team member profile.
 * 
 * Run with: npx ts-node scripts/setup-superadmin.ts
 * Or use the Firebase console to run this manually.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, query, where, getDocs, updateDoc, Timestamp } from "firebase/firestore";

// Firebase config - same as in lib/firebase.ts
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const SUPERADMIN_EMAIL = "bstitt@adams-electric.com";
const SUPERADMIN_UID = "EXeWJ63xxWTxWCpeSYgBtd0a9Qy1";

async function setupSuperAdmin() {
  console.log("Initializing Firebase...");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    // 1. Create/update user document with SuperAdmin role
    console.log(`Setting up SuperAdmin for ${SUPERADMIN_EMAIL}...`);
    
    const userRef = doc(db, "users", SUPERADMIN_UID);
    await setDoc(userRef, {
      email: SUPERADMIN_EMAIL,
      role: "superadmin",
      isSuperAdmin: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    
    console.log("✓ User document created/updated with SuperAdmin role");

    // 2. Find existing team member by email
    const teamMembersRef = collection(db, "teamMembers");
    const emailQuery = query(teamMembersRef, where("emailPrimary", "==", SUPERADMIN_EMAIL));
    const snapshot = await getDocs(emailQuery);

    if (!snapshot.empty) {
      // Update existing team member with auth UID
      const teamMemberDoc = snapshot.docs[0];
      console.log(`Found existing team member: ${teamMemberDoc.id}`);
      
      await updateDoc(doc(db, "teamMembers", teamMemberDoc.id), {
        authUid: SUPERADMIN_UID,
        role: "admin",
        isSuperAdmin: true,
        updatedAt: Timestamp.now(),
      });
      
      console.log("✓ Team member linked to Firebase Auth UID");
    } else {
      // Create new team member
      console.log("No existing team member found, creating new one...");
      
      const newTeamMemberRef = doc(collection(db, "teamMembers"));
      await setDoc(newTeamMemberRef, {
        authUid: SUPERADMIN_UID,
        emailPrimary: SUPERADMIN_EMAIL,
        firstName: "Brian",
        lastName: "Stitt",
        role: "admin",
        isSuperAdmin: true,
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      console.log("✓ New team member created and linked to Firebase Auth UID");
    }

    console.log("\n✅ SuperAdmin setup complete!");
    console.log(`   Email: ${SUPERADMIN_EMAIL}`);
    console.log(`   UID: ${SUPERADMIN_UID}`);
    console.log(`   Role: SuperAdmin`);

  } catch (error) {
    console.error("Error setting up SuperAdmin:", error);
    process.exit(1);
  }
}

setupSuperAdmin();
