/**
 * Script to update Adams Electric team member record
 * Run with: npx ts-node scripts/update-adams-admin.ts
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function updateAdams() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  const ADMIN_EMAIL = "info@adams-electric.com";
  const now = Timestamp.now();

  console.log("Looking for team member with email:", ADMIN_EMAIL);

  const teamMembersRef = collection(db, "teamMembers");
  const q = query(teamMembersRef, where("emailPrimary", "==", ADMIN_EMAIL));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log("No team member found with email:", ADMIN_EMAIL);
    return;
  }

  const teamMemberDoc = snapshot.docs[0];
  console.log("Found team member:", teamMemberDoc.id);
  console.log("Current data:", teamMemberDoc.data());

  await updateDoc(teamMemberDoc.ref, {
    firstName: "Adams",
    lastName: "Electric",
    role: "superadmin",
    updatedAt: now,
  });

  console.log("Updated team member with firstName: Adams, lastName: Electric, role: superadmin");
}

updateAdams().catch(console.error);
