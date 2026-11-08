/**
 * Imports the OSHA Certification Tracker workbook into `userTrainingCerts`.
 *
 * Run:
 *   npm run import:osha-cert-tracker -- --dry-run
 *   npm run import:osha-cert-tracker
 */

import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { strFromU8, unzipSync } from "fflate";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const WORKBOOK_PATH = "docs/adams_data/OSHA_Certification_Tracker_1.xlsx";
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_ID = `osha-tracker-${new Date().toISOString().slice(0, 10)}`;
const FAR_FUTURE = "9999-12-31";

type Row = Record<string, string> & { __row: number };
type TeamMember = {
  id: string;
  firstName?: string;
  lastName?: string;
  emailPrimary?: string;
  firebaseUid?: string;
  supervisorId?: string;
};

type SheetConfig = {
  file: string;
  sheet: string;
  title: string;
  category: string;
  columns: "extended" | "standard";
};

const SHEETS: SheetConfig[] = [
  { file: "xl/worksheets/sheet2.xml", sheet: "OSHA 30", title: "OSHA 30-Hour Construction", category: "OSHA / Safety Compliance", columns: "extended" },
  { file: "xl/worksheets/sheet3.xml", sheet: "OSHA 10", title: "OSHA 10-Hour Construction", category: "OSHA / Safety Compliance", columns: "extended" },
  { file: "xl/worksheets/sheet4.xml", sheet: "OSHA 510", title: "OSHA 510 Occupational Safety and Health Standards for Construction", category: "OSHA / Safety Compliance", columns: "standard" },
  { file: "xl/worksheets/sheet5.xml", sheet: "NFPA 70E", title: "NFPA 70E Electrical Safety", category: "Electrical Safety", columns: "standard" },
  { file: "xl/worksheets/sheet6.xml", sheet: "CPR AED First Aid", title: "CPR / AED / First Aid", category: "CPR / First Aid", columns: "standard" },
];

function decodeXml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function readSheet(fileName: string): Row[] {
  const files = unzipSync(new Uint8Array(readFileSync(WORKBOOK_PATH)));
  const sharedXml = files["xl/sharedStrings.xml"] ? strFromU8(files["xl/sharedStrings.xml"]) : "";
  const shared = Array.from(sharedXml.matchAll(/<si[\s>][\s\S]*?<\/si>/g)).map((match) =>
    decodeXml(Array.from(match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((part) => part[1]).join("")),
  );
  const xml = strFromU8(files[fileName]);
  return Array.from(xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)).map((rowMatch) => {
    const row = { __row: Number(rowMatch[1].match(/\br="(\d+)"/)?.[1] || 0) } as Row;
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2] || "";
      const column = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!column) continue;
      const raw = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] || body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] || "";
      row[column] = attrs.includes('t="s"') ? shared[Number(raw)] || "" : decodeXml(raw).trim();
    }
    return row;
  });
}

function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, " ").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).sort().join(" ");
}

const NAME_ALIASES = new Map([
  ["alex", "alexander"], ["andy", "andrew"], ["bill", "william"], ["billy", "william"], ["bob", "robert"], ["bobby", "robert"], ["chris", "christopher"], ["dave", "david"], ["dan", "daniel"], ["danny", "daniel"], ["dick", "richard"], ["ed", "edward"], ["eddie", "edward"], ["frank", "francis"], ["fred", "frederick"], ["hank", "henry"], ["jack", "john"], ["jim", "james"], ["jimmy", "james"], ["joe", "joseph"], ["joey", "joseph"], ["josh", "joshua"], ["larry", "lawrence"], ["matt", "matthew"], ["mike", "michael"], ["pat", "patrick"], ["rob", "robert"], ["sam", "samuel"], ["steve", "stephen"], ["ted", "theodore"], ["teddy", "theodore"], ["tom", "thomas"], ["tommy", "thomas"], ["tony", "anthony"], ["zach", "zachary"],
]);

function aliasName(value: string) {
  return normalizeName(value).split(" ").map((token) => NAME_ALIASES.get(token) || token).sort().join(" ");
}

function bigramScore(a: string, b: string) {
  if (!a || !b) return 0;
  const grams = (value: string) => new Map([...Array(Math.max(value.length - 1, 0)).keys()].map((index) => [value.slice(index, index + 2), index]));
  const aGrams = grams(a), bGrams = grams(b);
  let overlap = 0;
  for (const gram of aGrams.keys()) if (bGrams.has(gram)) overlap++;
  return (2 * overlap) / Math.max(aGrams.size + bGrams.size, 1);
}

function nameScore(candidate: string, memberName: string) {
  const normalizedCandidate = normalizeName(candidate);
  const normalizedMember = normalizeName(memberName);
  const aliasedCandidate = aliasName(candidate);
  const aliasedMember = aliasName(memberName);
  const phraseScore = Math.max(bigramScore(normalizedCandidate, normalizedMember), bigramScore(aliasedCandidate, aliasedMember));
  const candidateTokens = normalizedCandidate.split(" ");
  const memberTokens = normalizedMember.split(" ");
  const sharedTokens = candidateTokens.filter((token) => memberTokens.includes(token)).length;
  const tokenScore = sharedTokens / Math.max(candidateTokens.length, memberTokens.length, 1);
  const aliasedCandidateTokens = aliasedCandidate.split(" ");
  const aliasedMemberTokens = aliasedMember.split(" ");
  const candidateContained = aliasedCandidateTokens.length > 0 && aliasedCandidateTokens.every((token) => aliasedMemberTokens.includes(token));
  const memberContained = aliasedMemberTokens.length > 0 && aliasedMemberTokens.every((token) => aliasedCandidateTokens.includes(token));
  const containmentScore = candidateContained ? 0.9 : memberContained ? 0.86 : 0;
  return Math.round(Math.max(phraseScore, tokenScore * 0.92, containmentScore) * 100);
}

function excelDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /no expiry|does not expire/i.test(trimmed)) return FAR_FUTURE;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const serial = Number(trimmed);
  if (!Number.isFinite(serial) || serial <= 0) return "";
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function artifactStatus(certificateFile: string, source: string) {
  if (/no file|not recorded|protected|too large/i.test(certificateFile)) return "missing" as const;
  if (certificateFile || /certificate on file/i.test(source)) return "needs_review" as const;
  return "missing" as const;
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
  return getFirestore(initializeApp({ credential: cert(credentials), projectId }));
}

async function main() {
  const db = initializeDb();
  const members = (await db.collection("teamMembers").get()).docs.map((item) => ({ id: item.id, ...item.data() }) as TeamMember);
  const membersByName = new Map<string, TeamMember[]>();
  for (const member of members) {
    const key = normalizeName(`${member.firstName || ""} ${member.lastName || ""}`);
    if (key) membersByName.set(key, [...(membersByName.get(key) || []), member]);
  }

  const findMember = (employeeName: string) => {
    const exact = membersByName.get(normalizeName(employeeName)) || [];
    if (exact.length === 1) return { member: exact[0], score: 100, status: "matched" as const };
    let best = { member: undefined as TeamMember | undefined, score: 0 };
    for (const member of members) {
      const score = nameScore(employeeName, `${member.firstName || ""} ${member.lastName || ""}`.trim());
      if (score > best.score) best = { member, score };
    }
    return best.score >= 86 ? { ...best, status: "fuzzy" as const } : { member: undefined, score: best.score, status: "unmatched" as const };
  };

  const followUps = new Map<string, { status: string; requirement: string; jobsite: string }>();
  for (const row of readSheet("xl/worksheets/sheet7.xml")) {
    const name = (row.A || "").trim();
    if (!name || /name/i.test(name)) continue;
    followUps.set(normalizeName(name), {
      status: (row.C || "open").trim().toLowerCase() || "open",
      requirement: (row.D || "").trim(),
      jobsite: (row.B || "").trim(),
    });
  }

  const now = Timestamp.now();
  const stats = { records: 0, matched: 0, fuzzy: 0, unmatched: 0, written: 0, missingArtifacts: 0, needsReview: 0, followUps: followUps.size };
  const unmatchedNames = new Map<string, number>();
  const writes: Array<{ id: string; data: Record<string, unknown> }> = [];

  for (const config of SHEETS) {
    for (const row of readSheet(config.file)) {
      const employeeName = (row.A || "").trim();
      if (!employeeName || /employee name/i.test(employeeName) || row.__row < 5) continue;
      const extended = config.columns === "extended";
      const jobsite = (row.B || "").trim();
      const industry = extended ? (row.C || "").trim() : "";
      const language = extended ? (row.D || "").trim() : "";
      const completionDate = excelDate(extended ? row.E || "" : row.C || "");
      const expirationDate = excelDate(extended ? row.F || "" : row.D || "") || FAR_FUTURE;
      const status = (extended ? row.G : row.E || "").trim();
      const source = (extended ? row.H : row.F || "").trim();
      const provider = (extended ? row.I : row.G || "").trim();
      const trainer = (extended ? row.J : row.H || "").trim();
      const trainerOsha = extended ? (row.K || "").trim() : "";
      const certificateNumber = (extended ? row.L : row.I || "").trim();
      const dolReceived = extended ? (row.M || "").trim() : "";
      const cardReceivedDate = excelDate(extended ? row.N || "" : "");
      const certificateFile = (extended ? row.O : row.J || "").trim();
      const notes = (extended ? row.P : row.K || "").trim();
      const sourceEmail = (extended ? row.Q : row.L || "").trim();
      const match = findMember(employeeName);
      if (match.status === "matched") stats.matched++;
      else if (match.status === "fuzzy") stats.fuzzy++;
      else { stats.unmatched++; unmatchedNames.set(employeeName, match.score); }
      const followUp = followUps.get(normalizeName(employeeName));
      const artifact = artifactStatus(certificateFile, source);
      if (artifact === "missing") stats.missingArtifacts++;
      if (artifact === "needs_review") stats.needsReview++;
      const isExpired = /expired|past due/i.test(status) || (expirationDate !== FAR_FUTURE && expirationDate < new Date().toISOString().slice(0, 10));
      const id = `cert-${slug(config.sheet)}-${slug(employeeName)}`;
      writes.push({
        id,
        data: {
          id,
          userId: match.member?.firebaseUid || match.member?.id || `unmatched-${slug(employeeName)}`,
          teamMemberId: match.member?.id || `unmatched-${slug(employeeName)}`,
          userName: match.member ? `${match.member.firstName || ""} ${match.member.lastName || ""}`.trim() : employeeName,
          userEmail: match.member?.emailPrimary || "",
          trainingTitle: config.title,
          trainingCategory: config.category,
          certificationType: config.sheet,
          issuingOrganization: provider || "Not recorded",
          credentialId: certificateNumber,
          completionDate,
          expirationDate,
          jobsite: jobsite || followUp?.jobsite || "",
          industry,
          language,
          source,
          authorizedTrainer: trainer,
          trainerOshaNumber: trainerOsha,
          dolCardReceived: /yes/i.test(dolReceived) ? "yes" : /no/i.test(dolReceived) ? "no" : "unknown",
          cardReceivedDate,
          certificateFile,
          sourceEmail,
          artifactStatus: artifact,
          followUpStatus: followUp?.status === "received" ? "received" : artifact === "missing" || artifact === "needs_review" ? "open" : "not_required",
          followUpRequirement: followUp?.requirement || (artifact === "missing" ? "Upload readable certification artifact." : artifact === "needs_review" ? "Verify and attach the referenced certification file." : ""),
          governingCertification: /osha 510/i.test(notes) ? "OSHA 510" : "",
          notificationStatus: isExpired || artifact === "missing" ? "queued" : "monitoring",
          nextFollowUpAt: isExpired ? addDays(new Date().toISOString().slice(0, 10), 1) : addDays(expirationDate, -60),
          notes,
          sourceWorkbook: WORKBOOK_PATH,
          sourceSheet: config.sheet,
          sourceRow: row.__row,
          importBatchId: BATCH_ID,
          matchStatus: match.status,
          matchScore: match.score,
          createdAt: now,
          updatedAt: now,
        },
      });
      stats.records++;
    }
  }

  if (!DRY_RUN) {
    for (let index = 0; index < writes.length; index += 400) {
      const batch = db.batch();
      for (const item of writes.slice(index, index + 400)) {
        batch.set(db.collection("userTrainingCerts").doc(item.id), item.data, { merge: true });
      }
      await batch.commit();
      stats.written += Math.min(400, writes.length - index);
    }
    await db.collection("adamsAuditLogs").doc(randomUUID()).set({
      action: "import_osha_certification_tracker",
      actorUid: "script",
      actorName: "OSHA Certification Tracker Importer",
      details: { workbook: WORKBOOK_PATH, importBatchId: BATCH_ID, ...stats, unmatchedNames: Object.fromEntries(unmatchedNames) },
      createdAt: Timestamp.now(),
    });
  }

  console.log(JSON.stringify({ dryRun: DRY_RUN, importBatchId: BATCH_ID, ...stats, unmatchedNames: Object.fromEntries(unmatchedNames) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
