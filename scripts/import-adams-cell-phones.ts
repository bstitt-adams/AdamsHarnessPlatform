/**
 * Imports Adams Electric communication assets and office resources from
 * docs/adams_data/ADAMS CELL PHONES.xlsx.
 *
 * Run with: node --experimental-strip-types scripts/import-adams-cell-phones.ts
 * Dry run:  node --experimental-strip-types scripts/import-adams-cell-phones.ts --dry-run
 */

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { strFromU8, unzipSync } from "fflate";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const WORKBOOK_PATH = "docs/adams_data/ADAMS CELL PHONES.xlsx";
const DRY_RUN = process.argv.includes("--dry-run");

type Row = Record<string, string> & { __row: number };
type TeamMember = {
  id: string;
  firstName?: string;
  lastName?: string;
  emailPrimary?: string;
  firebaseUid?: string;
  mobile?: string;
  workPhone?: string;
  homePhone?: string;
};

function decodeXml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function readSheet(sheetName: string): Row[] {
  const files = unzipSync(new Uint8Array(readFileSync(WORKBOOK_PATH)));
  const sharedXml = files["xl/sharedStrings.xml"] ? strFromU8(files["xl/sharedStrings.xml"]) : "";
  const shared = Array.from(sharedXml.matchAll(/<si[\s>][\s\S]*?<\/si>/g)).map((match) =>
    decodeXml(Array.from(match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((part) => part[1]).join("")),
  );
  const fileName = sheetName === "Devices" ? "xl/worksheets/sheet1.xml" : "xl/worksheets/sheet2.xml";
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

function digits(value: string) {
  const cleaned = value.replace(/\D/g, "");
  return cleaned.length === 11 && cleaned.startsWith("1") ? cleaned.slice(1) : cleaned;
}

function formatPhone(value: string) {
  const phone = digits(value);
  return phone.length === 10 ? `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}` : value.trim();
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");
}

function personCandidate(label: string) {
  const sharedAsset = /\b(apprenticeship|jobsite|job site|site|office|warehouse|prefab|hilti|router|hotspot|jetpack|mifi|aircard|line|duke|wake forest|atrium|mercy)\b/i;
  if (sharedAsset.test(label)) return "";
  return label
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(was|new|personal cell|personal|ipad|tablet|jetpack|mifi device|mifi|aircard|floater|cell phone|cell|\d{4})\b/ig, " ")
    .replace(/[?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function assetType(label: string, column: string) {
  const text = label.toLowerCase();
  if (/hotspot|jetpack|mifi|aircard|router/.test(text)) return "hotspot";
  if (/ipad|tablet/.test(text) || column === "C") return "ipad";
  return "cell phone";
}

function ownership(label: string, matched: boolean) {
  const text = label.toLowerCase();
  if (/personal/.test(text)) return "personal";
  if (/apprenticeship|jobsite|job site|site|office|warehouse|prefab|hilti|router|duke|wake forest|atrium|mercy/.test(text)) return "shared";
  return matched ? "company" : "company";
}

function addressParts(line: string) {
  const match = line.trim().match(/^(.+?)\s+([A-Z]{2})\s+(\d{5})(?:-\d{4})?$/);
  return match ? { city: match[1], state: match[2], postalCode: match[3] } : {};
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
  const devices = readSheet("Devices");
  const locations = readSheet("Office Locations");
  const db = initializeDb();
  const members = (await db.collection("teamMembers").get()).docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TeamMember);
  const membersByName = new Map<string, TeamMember[]>();
  const membersById = new Map<string, TeamMember>();
  const membersByPhone = new Map<string, TeamMember>();
  for (const member of members) {
    membersById.set(member.id, member);
    const key = normalizeName(`${member.firstName || ""} ${member.lastName || ""}`);
    if (key) membersByName.set(key, [...(membersByName.get(key) || []), member]);
    for (const value of [member.mobile, member.workPhone, member.homePhone]) {
      const phone = digits(value || "");
      if (phone.length >= 7 && !membersByPhone.has(phone)) membersByPhone.set(phone, member);
    }
  }

  const now = Timestamp.now();
  const stats = { teamMembers: members.length, assets: 0, matched: 0, unmatched: 0, personal: 0, locations: 0, conferenceLines: 0, skipped: 0 };
  const unmatchedNames = new Set<string>();

  for (const row of devices) {
    const label = (row.A || "").trim();
    if (!label || /^cell phone$/i.test(label)) continue;
    for (const column of ["B", "C", "D"]) {
      const rawPhone = (row[column] || "").trim();
      const phone = formatPhone(rawPhone);
      if (!rawPhone || digits(rawPhone).length < 7) continue;
      const candidate = personCandidate(label);
      const matches = candidate ? membersByName.get(normalizeName(candidate)) || [] : [];
      const id = `adams-device-r${String(row.__row).padStart(3, "0")}-${column.toLowerCase()}`;
      const ref = db.collection("userAssets").doc(id);
      const existing = await ref.get();
      const existingMember = membersById.get(String(existing.data()?.assignedToTeamMemberId || ""));
      const member = (matches.length === 1 ? matches[0] : undefined) || membersByPhone.get(digits(rawPhone)) || existingMember;
      const type = assetType(label, column);
      const ownerType = ownership(`${label} ${rawPhone}`, Boolean(member));
      const descriptor = column === "C" ? "secondary device" : column === "D" ? "additional device" : type;
      const doc = {
        id,
        assetTag: `AE-WB-${String(row.__row).padStart(3, "0")}${column}`,
        assetType: type,
        assetName: `${candidate || label} - ${descriptor}`,
        identifier: phone,
        status: "active",
        condition: "good",
        assignedToTeamMemberId: member?.id || "",
        assignedToName: member ? `${member.firstName || ""} ${member.lastName || ""}`.trim() : "Unassigned",
        assignedToEmail: member?.emailPrimary || "",
        assignedToUid: member?.firebaseUid || "",
        phoneNumber: phone,
        rawPhoneNumber: rawPhone,
        ownershipType: ownerType,
        sourceWorkbook: "ADAMS CELL PHONES.xlsx",
        sourceSheet: "Devices",
        sourceRow: row.__row,
        sourceColumn: column,
        sourceLabel: label,
        assignmentMatchStatus: member ? "matched" : candidate ? "unmatched" : "not_applicable",
        notes: `Imported from workbook Devices row ${row.__row}, column ${column}.${rawPhone !== phone ? ` Raw value: ${rawPhone}.` : ""}`,
        assignedByUid: "workbook-import",
        assignedByName: "Adams Data Import",
        assignedAt: now,
        updatedAt: now,
        ...(existing.exists ? {} : { createdAt: now }),
      };
      if (!DRY_RUN) await ref.set(doc, { merge: true });
      stats.assets++;
      if (member) stats.matched++;
      else if (candidate) { stats.unmatched++; unmatchedNames.add(candidate); }
      if (ownerType === "personal") stats.personal++;
    }
  }

  const cell = (row: number, column: string) => locations.find((item) => item.__row === row)?.[column] || "";
  const officeSpecs = [
    { id: "corporate-greensboro", name: "Corporate Office - Greensboro", type: "office", status: "active", r1: 3, r2: 4, phone: cell(3, "B"), alternatePhone: cell(4, "B"), methods: [{ type: "phone", label: "Greensboro Office", value: cell(36, "B") }, { type: "fax", label: "HR Secure E Fax", value: cell(38, "B") }] },
    { id: "charlotte-current", name: "Charlotte Office - Current", type: "office", status: "active", r1: 7, r2: 8, phone: cell(6, "B"), methods: [{ type: "phone", label: "Charlotte Office", value: cell(37, "B") }] },
    { id: "charlotte-new", name: "Charlotte Office - New", type: "office", status: "planned", r1: 11, r2: 12, phone: cell(10, "B"), notes: "New Charlotte office listed in workbook." },
    { id: "highway-29-warehouse", name: "Highway 29 Warehouse", type: "warehouse", status: "active", r1: 15, r2: 16, contactName: "Shawn Pleasant", contactPhone: "336-698-6913", notes: cell(17, "A") },
    { id: "duke-jobsite", name: "Duke Jobsite", type: "jobsite", status: "active", r1: 20, r2: 21, phone: cell(20, "B"), contactName: "Anna Phinney", contactPhone: "336-693-2321" },
    { id: "raleigh-office", name: "Raleigh Office", type: "office", status: "active", r1: 24, r2: 25, phone: cell(24, "B") },
    { id: "prefab-browns-summit", name: "PreFab Browns Summit Warehouse", type: "prefab", status: "active", r1: 28, r2: 29 },
    { id: "healthcare-office", name: "Healthcare Office", type: "healthcare", status: "active", r1: 32, r2: 33 },
  ];

  for (const spec of officeSpecs) {
    const ref = db.collection("officeLocations").doc(spec.id);
    const existing = await ref.get();
    const doc = {
      id: spec.id,
      name: spec.name,
      locationType: spec.type,
      addressLine1: cell(spec.r1, "A"),
      ...addressParts(cell(spec.r2, "A")),
      phone: formatPhone(spec.phone || ""),
      alternatePhone: spec.alternatePhone ? formatPhone(spec.alternatePhone) : "",
      contactName: spec.contactName || "",
      contactPhone: spec.contactPhone || "",
      contactMethods: (spec.methods || []).filter((method) => method.value).map((method) => ({ ...method, value: formatPhone(method.value) })),
      status: spec.status,
      notes: spec.notes || "",
      sourceWorkbook: "ADAMS CELL PHONES.xlsx",
      sourceSheet: "Office Locations",
      sourceRow: spec.r1,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now }),
    };
    if (!DRY_RUN) await ref.set(doc, { merge: true });
    stats.locations++;
  }

  const accessNumber = formatPhone(cell(41, "A").split("/")[0] || "");
  const chairCode = cell(41, "A").match(/chair code\s*(\d+)/i)?.[1] || "";
  for (const row of locations.filter((item) => item.__row >= 42 && item.__row <= 47)) {
    const label = row.A || "Conference Line";
    const code = row.B || "";
    if (!code) { stats.skipped++; continue; }
    const id = `adams-conf-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${code}`;
    const ref = db.collection("conferenceLines").doc(id);
    const existing = await ref.get();
    const doc = {
      id,
      name: `${label} Conference Line ${code}`,
      locationLabel: label,
      accessNumber,
      chairCode,
      participantCode: code,
      status: "active",
      sourceWorkbook: "ADAMS CELL PHONES.xlsx",
      sourceSheet: "Office Locations",
      sourceRow: row.__row,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now }),
    };
    if (!DRY_RUN) await ref.set(doc, { merge: true });
    stats.conferenceLines++;
  }

  console.log(JSON.stringify({ dryRun: DRY_RUN, ...stats, unmatchedPeople: unmatchedNames.size }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
