/**
 * Normalizes Team Member first, middle, and last names to proper case.
 *
 * Dry run: node --experimental-strip-types scripts/normalize-team-member-names.ts --dry-run
 * Apply:   node --experimental-strip-types scripts/normalize-team-member-names.ts
 */

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const DRY_RUN = process.argv.includes("--dry-run");

function properCaseName(value: unknown) {
  const input = typeof value === "string" ? value.trim() : "";
  if (!input) return "";
  const particles = new Set(["de", "del", "der", "di", "du", "la", "le", "van", "von"]);
  const romanNumerals = new Set(["ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]);
  return input
    .toLowerCase()
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      return part
        .split(/([-'])/)
        .map((segment) => {
          if (!segment || segment === "-" || segment === "'") return segment;
          if (particles.has(segment)) return segment;
          if (romanNumerals.has(segment)) return segment.toUpperCase();
          if (/^mc[a-z]/.test(segment)) return `Mc${segment.charAt(2).toUpperCase()}${segment.slice(3)}`;
          return segment.charAt(0).toUpperCase() + segment.slice(1);
        })
        .join("");
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function initializeDb() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim().replace(/,\s*$/, "").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
  if (!projectId || (!serviceAccountJson && !serviceAccountFile && !(clientEmail && privateKey))) {
    throw new Error("Missing Firebase Admin credentials");
  }
  const credentials = serviceAccountJson || serviceAccountFile
    ? JSON.parse(serviceAccountJson || readFileSync(serviceAccountFile!, "utf8"))
    : { projectId, clientEmail, privateKey };
  const app = initializeApp({ credential: cert(credentials), projectId });
  return { db: getFirestore(app), auth: getAuth(app) };
}

async function main() {
  const { db, auth } = initializeDb();
  const [memberSnap, assetSnap, historySnap] = await Promise.all([
    db.collection("teamMembers").get(),
    db.collection("userAssets").get(),
    db.collection("assetHistory").get(),
  ]);

  const displayNames = new Map<string, string>();
  let membersUpdated = 0;
  let assetsUpdated = 0;
  let historyUpdated = 0;
  let authUpdated = 0;
  const errors: string[] = [];

  for (const docSnap of memberSnap.docs) {
    const member = docSnap.data();
    const next = {
      firstName: properCaseName(member.firstName),
      middleName: properCaseName(member.middleName),
      lastName: properCaseName(member.lastName),
    };
    const displayName = `${next.firstName} ${next.lastName}`.trim();
    displayNames.set(docSnap.id, displayName);

    if (member.firstName !== next.firstName || member.middleName !== next.middleName || member.lastName !== next.lastName) {
      membersUpdated++;
      if (!DRY_RUN) await docSnap.ref.set(next, { merge: true });
    }

    if (member.firebaseUid && displayName && member.firebaseUid !== "workbook-import") {
      try {
        const authUser = await auth.getUser(member.firebaseUid);
        if (authUser.displayName !== displayName) {
          authUpdated++;
          if (!DRY_RUN) await auth.updateUser(member.firebaseUid, { displayName });
        }
      } catch (error) {
        errors.push(`Auth ${member.firebaseUid}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  for (const docSnap of assetSnap.docs) {
    const asset = docSnap.data();
    const displayName = displayNames.get(asset.assignedToTeamMemberId);
    if (displayName && asset.assignedToName !== displayName) {
      assetsUpdated++;
      if (!DRY_RUN) await docSnap.ref.set({ assignedToName: displayName }, { merge: true });
    }
  }

  for (const docSnap of historySnap.docs) {
    const history = docSnap.data();
    const displayName = displayNames.get(history.teamMemberId);
    if (displayName && history.teamMemberName !== displayName) {
      historyUpdated++;
      if (!DRY_RUN) await docSnap.ref.set({ teamMemberName: displayName }, { merge: true });
    }
  }

  console.log(JSON.stringify({
    dryRun: DRY_RUN,
    teamMembersScanned: memberSnap.size,
    membersUpdated,
    authUpdated,
    assetsScanned: assetSnap.size,
    assetsUpdated,
    historyScanned: historySnap.size,
    historyUpdated,
    errors,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
