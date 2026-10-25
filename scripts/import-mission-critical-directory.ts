/**
 * Imports the Mission Critical workforce directory from
 * docs/adams_data/10.23.2026 MC Email and Phone List.xlsx.
 *
 * Dry run:  node --experimental-strip-types scripts/import-mission-critical-directory.ts --dry-run --skip-auth
 * Import:   node --experimental-strip-types scripts/import-mission-critical-directory.ts
 */

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { strFromU8, unzipSync } from "fflate";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const WORKBOOK_PATH = "docs/adams_data/10.23.2026 MC Email and Phone List.xlsx";
const WORKBOOK_NAME = "10.23.2026 MC Email and Phone List.xlsx";
const TEMPORARY_PASSWORD = "adams123";
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_AUTH = DRY_RUN || process.argv.includes("--skip-auth");
const IMPORT_BATCH_ID = `mission-critical-directory-${new Date().toISOString().slice(0, 10)}`;

type Row = Record<string, string> & { __row: number };
type ExistingMember = {
  id: string;
  firstName?: string;
  lastName?: string;
  emailPrimary?: string;
  emailSecondary?: string;
  firebaseUid?: string;
  role?: string;
  createdAt?: Timestamp;
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

function readRows(): Row[] {
  const files = unzipSync(new Uint8Array(readFileSync(WORKBOOK_PATH)));
  const sharedXml = files["xl/sharedStrings.xml"] ? strFromU8(files["xl/sharedStrings.xml"]) : "";
  const shared = Array.from(sharedXml.matchAll(/<si[\s>][\s\S]*?<\/si>/g)).map((match) =>
    decodeXml(Array.from(match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((part) => part[1]).join("")),
  );
  const xml = strFromU8(files["xl/worksheets/sheet1.xml"]);

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
  }).filter((row) => row.__row > 1 && (row.A || row.B));
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function emailLocal(value: string) {
  return slug(value).replace(/-/g, "");
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");
}

function digits(value: string) {
  const cleaned = value.replace(/\D/g, "");
  return cleaned.length === 11 && cleaned.startsWith("1") ? cleaned.slice(1) : cleaned;
}

function formatPhone(value: string) {
  const phone = digits(value);
  return phone.length === 10 ? `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}` : value.trim();
}

function excelDate(value: string) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial <= 0) return null;
  return Timestamp.fromMillis(Date.UTC(1899, 11, 30) + serial * 86_400_000);
}

function displayTitle(value: string) {
  return value
    .replace(/APPRENICE/gi, "APPRENTICE")
    .toLowerCase()
    .split(/\s+/)
    .map((part) => (part.includes("/") || /^[a-z]-\d$/.test(part) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

function titleId(value: string) {
  return slug(displayTitle(value));
}

function levelCode(value: string) {
  const match = displayTitle(value).match(/\b(A|E|F|GF|GS|S)-(\d)\b/i);
  return match ? `${match[1].toUpperCase()}-${match[2]}` : "";
}

function platformDepartmentIds(workforceDepartment: string) {
  const normalized = workforceDepartment.toLowerCase();
  if (normalized === "safety") return ["safety"];
  if (normalized === "admin - bim") return ["preconstruction"];
  return ["project-delivery"];
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
  const rows = readRows();
  const { db, auth } = initializeDb();
  const now = Timestamp.now();

  const workforceDepartments = new Map<string, { id: string; name: string; count: number }>();
  const titles = new Map<string, { id: string; display: string; sources: Set<string>; departmentId: string }>();
  const parsedMembers = rows.map((row) => {
    const firstName = (row.B || "").trim();
    const lastName = (row.A || "").trim();
    const middleName = (row.C || "").trim();
    const homeEmail = (row.D || "").trim().toLowerCase();
    const workPhone = formatPhone(row.E || "");
    const homePhone = formatPhone(row.F || "");
    const workforceDepartmentName = (row.I || "Unassigned").trim();
    const workforceDepartmentId = slug(workforceDepartmentName) || "unassigned";
    const rawTitle = (row.H || "Team Member").trim();
    const canonicalTitle = displayTitle(rawTitle);
    const businessUnitName = (row.J || "Mission Critical").trim();
    const memberId = `tm-${slug([firstName, middleName, lastName].filter(Boolean).join("-"))}`;

    const dept = workforceDepartments.get(workforceDepartmentId) || { id: workforceDepartmentId, name: workforceDepartmentName, count: 0 };
    dept.count++;
    workforceDepartments.set(workforceDepartmentId, dept);

    const jobTitleId = titleId(rawTitle);
    const title = titles.get(jobTitleId) || { id: jobTitleId, display: canonicalTitle, sources: new Set<string>(), departmentId: workforceDepartmentId };
    title.sources.add(rawTitle);
    titles.set(jobTitleId, title);

    return {
      row,
      memberId,
      firstName,
      middleName,
      lastName,
      homeEmail,
      workPhone,
      homePhone,
      hireDate: excelDate(row.G || ""),
      rawTitle,
      canonicalTitle,
      jobTitleId,
      workforceDepartmentId,
      workforceDepartmentName,
      businessUnitName,
      businessUnitId: slug(businessUnitName) || "mission-critical",
      emailPrimary: "",
      firebaseUid: "",
      platformDepartmentIds: platformDepartmentIds(workforceDepartmentName),
      nameKey: normalizeName(`${firstName} ${middleName} ${lastName}`),
      shortNameKey: normalizeName(`${firstName} ${lastName}`),
      phoneKeys: [digits(workPhone), digits(homePhone)].filter((item) => item.length >= 7),
    };
  });

  const existingMembers = (await db.collection("teamMembers").get()).docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }) as ExistingMember);
  const importedMemberIds = new Set(parsedMembers.map((member) => member.memberId));
  const usedEmails = new Set(
    existingMembers
      .filter((member) => !importedMemberIds.has(member.id))
      .flatMap((member) => [member.emailPrimary, member.emailSecondary].filter(Boolean).map((email) => email!.toLowerCase())),
  );
  const emailsInImport = new Map<string, number>();

  for (const member of parsedMembers) {
    const preferred = member.homeEmail.endsWith("@adams-electric.com")
      ? member.homeEmail
      : `${emailLocal(`${member.firstName} ${member.lastName}`)}@adams-electric.com`;
    const alternates = [
      preferred,
      `${emailLocal(`${member.firstName} ${member.middleName} ${member.lastName}`)}@adams-electric.com`,
    ];
    let email = alternates.find((candidate) => !usedEmails.has(candidate) && !emailsInImport.has(candidate));
    let suffix = 2;
    while (!email) {
      const candidate = `${emailLocal(`${member.firstName} ${member.lastName}`)}${suffix}@adams-electric.com`;
      if (!usedEmails.has(candidate) && !emailsInImport.has(candidate)) email = candidate;
      suffix++;
    }
    member.emailPrimary = email;
    emailsInImport.set(email, member.row.__row);
    usedEmails.add(email);
  }

  const stats = {
    rows: parsedMembers.length,
    workforceDepartments: workforceDepartments.size,
    jobTitles: titles.size,
    authUsersCreated: 0,
    authUsersLinked: 0,
    membersWritten: 0,
    assetsMatched: 0,
    assetsAlreadyLinked: 0,
    errors: [] as string[],
  };

  if (!DRY_RUN) {
    for (const [id, dept] of workforceDepartments) {
      await db.collection("workforceDepartments").doc(id).set({
        id,
        name: dept.name,
        code: dept.name.split(/[^A-Za-z0-9]+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 8).toUpperCase(),
        sourceName: dept.name,
        memberCount: dept.count,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    }

    for (const [id, title] of titles) {
      await db.collection("jobTitles").doc(id).set({
        id,
        displayTitle: title.display,
        normalizedTitle: title.display.toLowerCase(),
        sourceTitles: Array.from(title.sources).sort(),
        jobFamily: workforceDepartments.get(title.departmentId)?.name || "",
        levelCode: levelCode(title.display),
        workforceDepartmentId: title.departmentId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    }

    await db.collection("businessUnits").doc("mission-critical").set({
      id: "mission-critical",
      name: "Mission Critical",
      code: "MC",
      unitType: "business_unit",
      memberCount: parsedMembers.length,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  const membersByName = new Map<string, typeof parsedMembers>();
  const membersByPhone = new Map<string, typeof parsedMembers[number]>();
  for (const member of parsedMembers) {
    for (const key of new Set([member.nameKey, member.shortNameKey])) {
      membersByName.set(key, [...(membersByName.get(key) || []), member]);
    }
    for (const phone of member.phoneKeys) {
      if (!membersByPhone.has(phone)) membersByPhone.set(phone, member);
    }
  }
  const memberByName = (key: string) => {
    const matches = membersByName.get(key) || [];
    return matches.length === 1 ? matches[0] : undefined;
  };

  for (const member of parsedMembers) {
    const existingMember = existingMembers.find((item) =>
      item.id === member.memberId || item.emailPrimary?.toLowerCase() === member.emailPrimary,
    );
    let firebaseUid = existingMember?.firebaseUid || "";
    if (!SKIP_AUTH) {
      try {
        const authUser = await auth.getUserByEmail(member.emailPrimary).catch(async (error) => {
          if (error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found") {
            stats.authUsersCreated++;
            return auth.createUser({
              email: member.emailPrimary,
              password: TEMPORARY_PASSWORD,
              displayName: `${member.firstName} ${member.lastName}`.trim(),
              emailVerified: false,
              disabled: false,
            });
          }
          throw error;
        });
        firebaseUid = authUser.uid;
        member.firebaseUid = firebaseUid;
        stats.authUsersLinked++;
      } catch (error) {
        stats.errors.push(`Auth ${member.emailPrimary}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    member.firebaseUid = firebaseUid;

    const fullName = `${member.firstName} ${member.middleName ? `${member.middleName} ` : ""}${member.lastName}`.replace(/\s+/g, " ").trim();
    const doc = {
      id: member.memberId,
      firebaseUid,
      firstName: member.firstName,
      lastName: member.lastName,
      middleName: member.middleName,
      emailPrimary: member.emailPrimary,
      ...(!member.homeEmail.endsWith("@adams-electric.com") && member.homeEmail ? { emailSecondary: member.homeEmail } : {}),
      mobile: member.workPhone,
      workPhone: member.workPhone,
      homePhone: member.homePhone,
      hireDate: member.hireDate,
      expertise: member.workforceDepartmentName,
      title: member.canonicalTitle,
      jobTitleId: member.jobTitleId,
      jobTitleRaw: member.rawTitle,
      workforceDepartmentId: member.workforceDepartmentId,
      workforceDepartmentName: member.workforceDepartmentName,
      departmentIds: member.platformDepartmentIds,
      businessUnitIds: [member.businessUnitId],
      businessUnitNames: [member.businessUnitName],
      primaryBusinessUnitId: member.businessUnitId,
      company: "Adams Electric",
      role: existingMember?.role || "team",
      status: "active",
      authProvisioned: Boolean(firebaseUid),
      mustChangePassword: Boolean(firebaseUid),
      temporaryPasswordSetAt: firebaseUid ? now : null,
      sourceWorkbook: WORKBOOK_NAME,
      sourceSheet: "Sheet1",
      sourceRow: member.row.__row,
      importBatchId: IMPORT_BATCH_ID,
      searchKeywords: [fullName, member.emailPrimary, member.homeEmail, member.workPhone, member.homePhone, member.canonicalTitle, member.workforceDepartmentName, member.businessUnitName].filter(Boolean).map((value) => value.toLowerCase()),
      createdAt: existingMember?.createdAt || now,
      updatedAt: now,
    };
    if (!DRY_RUN) await db.collection("teamMembers").doc(member.memberId).set(doc, { merge: true });
    stats.membersWritten++;
  }

  const assets = await db.collection("userAssets").get();
  for (const assetSnap of assets.docs) {
    const asset = assetSnap.data();
    const sourceLabel = String(asset.sourceLabel || asset.assignedToName || "");
    const nameKey = normalizeName(sourceLabel.replace(/\(.*?\)/g, " ").replace(/\b(was|new|personal cell|personal|ipad|tablet|jetpack|mifi device|mifi|aircard|floater|cell phone|cell)\b/ig, " "));
    const phones = [asset.phoneNumber, asset.identifier, asset.rawPhoneNumber].map((value) => digits(String(value || ""))).filter((value) => value.length >= 7);
    const member = memberByName(nameKey) || phones.map((phone) => membersByPhone.get(phone)).find(Boolean);
    if (!member) continue;

    const next = {
      assignedToTeamMemberId: member.memberId,
      assignedToName: `${member.firstName} ${member.lastName}`.trim(),
      assignedToEmail: member.emailPrimary,
      assignedToUid: member.firebaseUid,
      assignmentMatchStatus: "matched",
      updatedAt: now,
    };
    if (!DRY_RUN) {
      await assetSnap.ref.set(next, { merge: true });
    }
    if (asset.assignedToTeamMemberId === member.memberId) stats.assetsAlreadyLinked++;
    else stats.assetsMatched++;
  }

  if (!DRY_RUN) {
    await db.collection("adamsAuditLogs").add({
      entityType: "data_import",
      entityId: IMPORT_BATCH_ID,
      action: "import",
      actorUid: "workbook-import",
      actorName: "Mission Critical Directory Import",
      detail: {
        workbook: WORKBOOK_NAME,
        rows: stats.rows,
        workforceDepartments: stats.workforceDepartments,
        jobTitles: stats.jobTitles,
        authUsersCreated: stats.authUsersCreated,
        authUsersLinked: stats.authUsersLinked,
        assetsMatched: stats.assetsMatched,
        assetsAlreadyLinked: stats.assetsAlreadyLinked,
        errors: stats.errors.slice(0, 50),
      },
      createdAt: now,
    });
  }

  console.log(JSON.stringify({ dryRun: DRY_RUN, skipAuth: SKIP_AUTH, ...stats }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
