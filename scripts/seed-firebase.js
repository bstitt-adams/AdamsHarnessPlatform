#!/usr/bin/env node

require("dotenv").config({ path: ".env.local" });
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const fs = require("node:fs");

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE;

if (!projectId || (!serviceAccountJson && !serviceAccountFile)) {
  console.error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID or Firebase service account configuration.");
  process.exit(1);
}

if (!getApps().length) {
  const serviceAccount = serviceAccountJson || fs.readFileSync(serviceAccountFile, "utf8");
  initializeApp({ projectId, credential: cert(JSON.parse(serviceAccount)) });
}

const db = getFirestore();
const now = Timestamp.now();

const departments = [
  { id: "safety", name: "Safety", code: "SAF", description: "Mission Critical Safety and field safety operations" },
  { id: "preconstruction", name: "Preconstruction", code: "PRE", description: "Estimating, planning, procurement, and constructability" },
  { id: "project-delivery", name: "Project Delivery", code: "PROJ", description: "Project execution, coordination, and closeout" },
  { id: "service", name: "Service", code: "SVC", description: "Electrical service, maintenance, and response operations" },
  { id: "finance", name: "Finance", code: "FIN", description: "Accounting, billing, and financial operations" },
  { id: "people", name: "People & Culture", code: "PEO", description: "People operations, training, and workforce development" },
];

const teamMembers = [
  {
    id: "adams-admin",
    emailPrimary: process.env.SEED_ADMIN_EMAIL || "bstitt@adams-electric.com",
    firstName: "Adams",
    lastName: "Administrator",
    title: "Platform Administrator",
    expertise: "Adams Platform administration",
    role: "admin",
    status: "active",
    departmentIds: ["safety", "preconstruction", "project-delivery", "service", "finance", "people"],
  },
  {
    id: "demo-team-member",
    emailPrimary: "demo-user@adams-electric.com",
    firstName: "Demo",
    lastName: "User",
    title: "Team Member",
    expertise: "Electrical construction operations",
    role: "team",
    status: "active",
    departmentIds: ["project-delivery"],
  },
];

async function seed() {
  const batch = db.batch();
  for (const department of departments) {
    batch.set(db.collection("departments").doc(department.id), {
      ...department,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }
  for (const member of teamMembers) {
    batch.set(db.collection("teamMembers").doc(member.id), {
      ...member,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }
  batch.set(db.collection("platformSettings").doc("global"), {
    id: "global",
    hermes: { mode: "env", model: "hermes-agent", status: "disconnected" },
    updatedAt: now,
  }, { merge: true });
  await batch.commit();
  console.log(`Seeded ${departments.length} departments, ${teamMembers.length} team members, and platform settings into ${projectId}.`);
}

seed().catch((error) => {
  console.error("Firebase seed failed:", error.message);
  process.exit(1);
});
