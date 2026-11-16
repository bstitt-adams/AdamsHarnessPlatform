/**
 * One-off migration: LMS student records that stored a Team Member id as the
 * student id are rewritten to the Firebase Auth uid (canonical LMS identity),
 * keeping the Team Member id in `teamMemberId`.
 *
 *   npx tsx scripts/migrate-lms-student-ids.ts          # dry run
 *   npx tsx scripts/migrate-lms-student-ids.ts --apply  # write changes
 */
import { config } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local", quiet: true });
const APPLY = process.argv.includes("--apply");

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);

const TARGETS: [collection: string, field: string][] = [
  ["lms_enrollments", "userId"],
  ["lms_lesson_progress", "odUserId"],
  ["lms_quiz_attempts", "odUserId"],
  ["lms_certificates", "odUserId"],
  ["lms_course_purchases", "odUserId"],
];

async function main() {
  const members = await db.collection("teamMembers").get();
  const uidByMemberId = new Map<string, string>();
  for (const d of members.docs) {
    const uid = d.data().firebaseUid as string | undefined;
    if (uid) uidByMemberId.set(d.id, uid);
  }

  let changed = 0;
  let unresolved = 0;
  for (const [name, field] of TARGETS) {
    const snap = await db.collection(name).get();
    for (const d of snap.docs) {
      const current = d.data()[field] as string | undefined;
      if (!current) continue;
      const uid = uidByMemberId.get(current);
      if (!uid) {
        if (members.docs.some((m) => m.id === current)) {
          unresolved++;
          console.log(`UNRESOLVED ${name}/${d.id}: team member ${current} has no portal account`);
        }
        continue;
      }
      console.log(`${APPLY ? "UPDATE" : "WOULD UPDATE"} ${name}/${d.id}: ${field} ${current} -> ${uid}`);
      if (APPLY) await d.ref.update({ [field]: uid, teamMemberId: current });
      changed++;
    }
  }
  console.log(`\n${APPLY ? "Updated" : "Would update"} ${changed} records; ${unresolved} unresolved (no portal account).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
