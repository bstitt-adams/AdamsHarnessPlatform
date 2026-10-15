#!/usr/bin/env node

/**
 * Backfill Spanish translations for existing siteCalendarItems.
 *
 * Run with: node scripts/backfill-calendar-translations.js
 */

require("dotenv").config({ path: ".env.local" });
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

if (!getApps().length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable");
    process.exit(1);
  }
  initializeApp({ projectId });
}

const db = getFirestore();

const COLLECTION_SITE_CALENDAR_ITEMS = "siteCalendarItems";

const TITLE_TRANSLATIONS = {
  "Safety Stand-Down": "Reunión de Seguridad",
  "Fall Protection Delivery": "Entrega de Protección contra Caídas",
  "Foreman Meeting": "Reunión de Capataces",
  "Tool Box Talk": "Charla de Caja de Herramientas",
  "Site Inspection": "Inspección del Sitio",
};

const DESCRIPTION_TRANSLATIONS = {
  "Morning safety briefing and PPE check": "Charla matutina de seguridad y revisión de EPP",
  "$25k of fall protection gear arriving — check mailbox": "Llega equipo de protección contra caídas por valor de $25,000 — revisar buzón",
  "Review weekly schedule and manpower": "Revisar la programación semanal y la mano de obra",
  "Lockout/tagout refresher with crew": "Recordatorio de bloqueo/etiquetado con la cuadrilla",
  "Superintendent walk-through with safety lead": "Recorrido del superintendente con el líder de seguridad",
};

async function main() {
  console.log("🔄 Backfilling Spanish translations...\n");
  const snapshot = await db.collection(COLLECTION_SITE_CALENDAR_ITEMS).get();

  if (snapshot.empty) {
    console.log("No calendar items found.");
    return;
  }

  let updated = 0;
  const batch = db.batch();
  const now = Timestamp.now();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const titleEs = TITLE_TRANSLATIONS[data.title];
    const descriptionEs = DESCRIPTION_TRANSLATIONS[data.description];

    if (!titleEs && !descriptionEs) continue;

    const updates = { updatedAt: now };
    if (titleEs && !data.titleEs) updates.titleEs = titleEs;
    if (descriptionEs && !data.descriptionEs) updates.descriptionEs = descriptionEs;

    if (Object.keys(updates).length > 1) {
      batch.update(doc.ref, updates);
      updated++;
      console.log(`  ✓ Queued translation for "${data.title}"`);
    }
  }

  if (updated === 0) {
    console.log("No items needed translation backfill.");
    return;
  }

  await batch.commit();
  console.log(`\n✅ Updated ${updated} item(s) with Spanish translations.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Backfill failed:", error);
    process.exit(1);
  });
