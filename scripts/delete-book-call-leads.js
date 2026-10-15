#!/usr/bin/env node

require("dotenv").config({ path: ".env.local" });
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!projectId || !serviceAccount) {
  console.error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_KEY.");
  process.exit(1);
}
if (!getApps().length) initializeApp({ projectId, credential: cert(JSON.parse(serviceAccount)) });

async function main() {
  const db = getFirestore();
  const snapshot = await db.collection("bookCallLeads").get();
  if (snapshot.empty) {
    console.log("No bookCallLeads documents found.");
    return;
  }
  for (let offset = 0; offset < snapshot.docs.length; offset += 500) {
    const batch = db.batch();
    snapshot.docs.slice(offset, offset + 500).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
  console.log(`Deleted ${snapshot.size} bookCallLeads documents from ${projectId}.`);
}

main().catch((error) => {
  console.error("Failed to delete bookCallLeads:", error.message);
  process.exit(1);
});
