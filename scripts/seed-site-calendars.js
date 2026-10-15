#!/usr/bin/env node

/**
 * Seed Site Calendars Demo Data
 *
 * Creates 5 demo safety-office calendars and a handful of sample items
 * for the current rolling week.
 *
 * Run with: node scripts/seed-site-calendars.js
 */

require("dotenv").config({ path: ".env.local" });
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const fs = require("node:fs");

if (!getApps().length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE;
  if (!projectId || (!serviceAccountJson && !serviceAccountFile)) {
    console.error("Missing Firebase project or service account configuration");
    process.exit(1);
  }
  const serviceAccount = serviceAccountJson || fs.readFileSync(serviceAccountFile, "utf8");
  initializeApp({ projectId, credential: cert(JSON.parse(serviceAccount)) });
}

const db = getFirestore();

const COLLECTION_SITE_CALENDARS = "siteCalendars";
const COLLECTION_SITE_CALENDAR_ITEMS = "siteCalendarItems";

const demoSites = [
  { name: "Conover NC", slug: "conover-nc" },
  { name: "Charlotte NC", slug: "charlotte-nc" },
  { name: "Southern Virginia", slug: "southern-virginia" },
  { name: "Charleston SC", slug: "charleston-sc" },
  { name: "Greenville SC", slug: "greenville-sc" },
];

const sampleEntries = [
  { title: "Safety Stand-Down", titleEs: "Reunión de Seguridad", description: "Morning safety briefing and PPE check", descriptionEs: "Charla matutina de seguridad y revisión de EPP", time: "06:00" },
  { title: "Fall Protection Delivery", titleEs: "Entrega de Protección contra Caídas", description: "$25k of fall protection gear arriving — check mailbox", descriptionEs: "Llega equipo de protección contra caídas por valor de $25,000 — revisar buzón", time: "08:00" },
  { title: "Foreman Meeting", titleEs: "Reunión de Capataces", description: "Review weekly schedule and manpower", descriptionEs: "Revisar la programación semanal y la mano de obra", time: "10:00" },
  { title: "Tool Box Talk", titleEs: "Charla de Caja de Herramientas", description: "Lockout/tagout refresher with crew", descriptionEs: "Recordatorio de bloqueo/etiquetado con la cuadrilla", time: "13:00" },
  { title: "Site Inspection", titleEs: "Inspección del Sitio", description: "Superintendent walk-through with safety lead", descriptionEs: "Recorrido del superintendente con el líder de seguridad", time: "15:00" },
];

function midnightTimestamp(dateString) {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(date);
}

function getRollingWeekDates() {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

async function seedSiteCalendars() {
  console.log("🌱 Seeding site calendars...\n");
  const batch = db.batch();
  const now = Timestamp.now();

  for (const site of demoSites) {
    const slug = site.slug;
    const siteRef = db.collection(COLLECTION_SITE_CALENDARS).doc(slug);
    const existing = await siteRef.get();

    if (existing.exists) {
      console.log(`  ℹ️  Site "${site.name}" already exists, skipping.`);
      continue;
    }

    batch.set(siteRef, {
      name: site.name,
      slug,
      pin: "1234",
      logoUrl: "/images/adamselectric_logo.png",
      primaryColor: "#005A9C",
      defaultLayout: "vertical",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✓ Queued site "${site.name}" (PIN: 1234)`);
  }

  await batch.commit();
  console.log("\n✅ Site calendars seeded.");
}

async function seedCalendarItems() {
  console.log("\n🌱 Seeding sample calendar items...\n");
  const now = Timestamp.now();
  const dates = getRollingWeekDates();

  for (const site of demoSites) {
    const siteRef = db.collection(COLLECTION_SITE_CALENDARS).doc(site.slug);
    const siteSnap = await siteRef.get();
    if (!siteSnap.exists) {
      console.log(`  ⚠️  Site "${site.name}" not found, skipping items.`);
      continue;
    }

    const siteId = siteSnap.id;

    // Distribute sample entries across the rolling week
    for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
      const dateString = dates[dayIndex];
      const entry = sampleEntries[dayIndex % sampleEntries.length];
      const itemRef = db.collection(COLLECTION_SITE_CALENDAR_ITEMS).doc(`${site.slug}-${dateString}`);

      await itemRef.set({
        siteId,
        title: entry.title,
        titleEs: entry.titleEs || "",
        description: entry.description,
        descriptionEs: entry.descriptionEs || "",
        date: midnightTimestamp(dateString),
        time: entry.time,
        location: site.name,
        assignee: "Crew Lead",
        order: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(`  ✓ Seeded ${dates.length} items for "${site.name}"`);
  }

  console.log("\n✅ Sample calendar items seeded.");
}

async function main() {
  try {
    await seedSiteCalendars();
    await seedCalendarItems();
    console.log("\n🎉 Done!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
