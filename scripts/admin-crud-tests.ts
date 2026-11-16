/**
 * Admin module CRUD test harness.
 *
 *   npx tsx scripts/admin-crud-tests.ts setup     # create the test admin account
 *   npx tsx scripts/admin-crud-tests.ts run       # run CRUD tests (dev server must be on BASE_URL)
 *   npx tsx scripts/admin-crud-tests.ts teardown  # delete test records + test admin account
 *
 * Client-side writes use the Firebase client SDK signed in as the test admin, so
 * Firestore security rules are exercised exactly as the admin UI does. API routes
 * are called with the same admin's ID token. Every record is tagged __crudTest so
 * teardown only ever deletes test data. External integrations are not exercised.
 */
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { cert, getApps as getAdminApps, initializeApp as initAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminDb } from "firebase-admin/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  addDoc, collection, deleteDoc, deleteField, doc, getDoc, getDocs, getFirestore, limit, query, serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";

config({ path: ".env.local", quiet: true });

const BASE_URL = process.env.CRUD_BASE_URL || "http://localhost:3000";
const OUT_DIR = "test-results";
const CREDS_FILE = `${OUT_DIR}/.crud-admin.json`;
const TEST_EMAIL = "crud-test-admin@adams-electric.com";
const TEST_MEMBER_ID = "crudtest-admin";
const TAG_FIELD = "__crudTest";

type Status = "pass" | "fail" | "skip";
interface Result { module: string; op: string; status: Status; detail: string }
const results: Result[] = [];
const record = (module: string, op: string, status: Status, detail = "") => {
  results.push({ module, op, status, detail: detail.slice(0, 300) });
  const icon = status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "SKIP";
  console.log(`${icon}  ${module.padEnd(22)} ${op.padEnd(28)} ${detail.slice(0, 120)}`);
};

function adminApp() {
  if (getAdminApps().length) return getAdminApps()[0];
  return initAdmin({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

const clientApp = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(clientApp);

// ---------------------------------------------------------------- setup / teardown

async function setup() {
  const auth = getAdminAuth(adminApp());
  const adb = getAdminDb(adminApp());
  const password = `Crud!${randomBytes(12).toString("base64url")}`;
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(TEST_EMAIL);
    uid = existing.uid;
    await auth.updateUser(uid, { password, disabled: false });
  } catch {
    uid = (await auth.createUser({ email: TEST_EMAIL, password, displayName: "CRUD Test Admin", emailVerified: true })).uid;
  }
  await adb.collection("users").doc(uid).set({
    uid, email: TEST_EMAIL, role: "admin", teamMemberId: TEST_MEMBER_ID, displayName: "CRUD Test Admin", [TAG_FIELD]: "account",
  }, { merge: true });
  await adb.collection("teamMembers").doc(TEST_MEMBER_ID).set({
    id: TEST_MEMBER_ID, firstName: "CRUD", lastName: "Test Admin", emailPrimary: TEST_EMAIL, firebaseUid: uid, authUid: uid,
    role: "admin", status: "active", [TAG_FIELD]: "account", createdAt: new Date(), updatedAt: new Date(),
  }, { merge: true });
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(CREDS_FILE, JSON.stringify({ email: TEST_EMAIL, password, uid }, null, 2));
  console.log(`Test admin ready (uid ${uid}); credentials in ${CREDS_FILE}`);
}

const TOUCHED_COLLECTIONS = new Set<string>();

async function teardown() {
  const adb = getAdminDb(adminApp());
  const auth = getAdminAuth(adminApp());
  const extra = ["hardhatQrCodes", "hardhatQrEvents", "departments", "lms_enrollments", "lms_assignments", "interviewAttachmentFiles", "processInterviews", "interviewPrds", "assetHistory", "auditLogs", "adamsAuditLogs"];
  const fromRun = existsSync(`${OUT_DIR}/admin-crud-results.json`)
    ? (JSON.parse(readFileSync(`${OUT_DIR}/admin-crud-results.json`, "utf8")).collections as string[]) : [];
  let deleted = 0;
  for (const name of new Set([...fromRun, ...extra, ...TOUCHED_COLLECTIONS])) {
    for (const field of [TAG_FIELD]) {
      const snap = await adb.collection(name).where(field, "!=", null).get().catch(() => null);
      for (const d of snap?.docs || []) { if (d.data()[TAG_FIELD] !== "account") { await d.ref.delete(); deleted++; } }
    }
    // Records created by APIs reference the test member rather than carrying the tag.
    for (const field of ["teamMemberId", "assignedToTeamMemberId", "actorUid"]) {
      const snap = await adb.collection(name).where(field, "==", TEST_MEMBER_ID).get().catch(() => null);
      for (const d of snap?.docs || []) { await d.ref.delete(); deleted++; }
    }
  }
  const user = await auth.getUserByEmail(TEST_EMAIL).catch(() => null);
  if (user) {
    for (const name of ["auditLogs", "adamsAuditLogs", "hardhatQrEvents", "assetHistory"]) {
      const snap = await adb.collection(name).where("actorUid", "==", user.uid).get().catch(() => null);
      for (const d of snap?.docs || []) { await d.ref.delete(); deleted++; }
    }
    await adb.collection("users").doc(user.uid).delete();
    await auth.deleteUser(user.uid);
  }
  await adb.collection("teamMembers").doc(TEST_MEMBER_ID).delete();
  const { FieldValue } = await import("firebase-admin/firestore");
  await adb.collection("platformSettings").doc("global").update({ __crudTestPing: FieldValue.delete() }).catch(() => undefined);
  console.log(`Teardown complete: ${deleted} test records removed, test admin deleted`);
}

// ---------------------------------------------------------------- helpers

let idToken = "";
const runId = `run-${Date.now()}`;
const tag = () => ({ [TAG_FIELD]: runId });

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${idToken}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: res.status, ok: res.ok, json, text };
}

async function step(module: string, op: string, fn: () => Promise<string | void>) {
  try {
    const detail = await fn();
    record(module, op, "pass", detail || "");
    return true;
  } catch (error) {
    record(module, op, "fail", error instanceof Error ? error.message : String(error));
    return false;
  }
}

function expect(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

/** Full create/read/update/delete cycle on a collection via the client SDK (rules enforced). */
async function firestoreCrud(module: string, name: string, data: Record<string, unknown>, update: Record<string, unknown>) {
  TOUCHED_COLLECTIONS.add(name);
  let id = "";
  const created = await step(module, `create ${name}`, async () => {
    const ref = await addDoc(collection(db, name), { ...data, ...tag(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    id = ref.id;
    return id;
  });
  if (!created) {
    for (const op of ["read", "update", "delete"]) record(module, `${op} ${name}`, "skip", "create failed");
    return;
  }
  await step(module, `read ${name}`, async () => {
    const snap = await getDoc(doc(db, name, id));
    expect(snap.exists(), "created doc not readable");
    const listed = await getDocs(query(collection(db, name), limit(5)));
    return `get ok, list returned ${listed.size}`;
  });
  await step(module, `update ${name}`, async () => {
    await updateDoc(doc(db, name, id), { ...update, updatedAt: serverTimestamp() });
    const snap = await getDoc(doc(db, name, id));
    const [k, v] = Object.entries(update)[0];
    expect(JSON.stringify(snap.data()?.[k]) === JSON.stringify(v), `field ${k} not updated`);
  });
  await step(module, `delete ${name}`, async () => {
    await deleteDoc(doc(db, name, id));
    expect(!(await getDoc(doc(db, name, id))).exists(), "doc still exists after delete");
  });
}

async function readOnly(module: string, name: string) {
  await step(module, `read ${name}`, async () => `list returned ${(await getDocs(query(collection(db, name), limit(5)))).size}`);
}

const skip = (module: string, reason: string) => record(module, "all", "skip", reason);

// ---------------------------------------------------------------- module tests

async function run() {
  const creds = JSON.parse(readFileSync(CREDS_FILE, "utf8"));
  const cred = await signInWithEmailAndPassword(getAuth(clientApp), creds.email, creds.password);
  idToken = await cred.user.getIdToken();
  const ping = await fetch(BASE_URL).catch(() => null);
  if (!ping) throw new Error(`Dev server not reachable at ${BASE_URL}`);

  // 1. Academy (LMS)
  {
    const m = "academy";
    await firestoreCrud(m, "lms_courses", { title: "CRUD Test Course", slug: `crud-test-${runId}`, isPublished: false, enrollmentCount: 0 }, { title: "CRUD Test Course (edited)" });
    let courseId = "";
    await step(m, "create course+module+lesson", async () => {
      courseId = (await addDoc(collection(db, "lms_courses"), { title: "CRUD Course 2", slug: `crud-2-${runId}`, isPublished: false, enrollmentCount: 0, ...tag() })).id;
      const mod = await addDoc(collection(db, "lms_course_modules"), { courseId, title: "Section 1", sortOrder: 0, ...tag() });
      await addDoc(collection(db, "lms_lessons"), { courseId, moduleId: mod.id, title: "Lesson 1", contentType: "text", sortOrder: 0, isPreview: false, ...tag() });
      TOUCHED_COLLECTIONS.add("lms_course_modules"); TOUCHED_COLLECTIONS.add("lms_lessons");
    });
    await step(m, "assign course (API)", async () => {
      const r = await api("POST", "/api/admin/academy/assignments", { courseId, teamMemberIds: [TEST_MEMBER_ID] });
      expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
      const status = r.json.results?.[0]?.status;
      expect(status === "assigned" || status === "already_enrolled", `unexpected result ${status}`);
      return status;
    });
    await step(m, "list assignments (API)", async () => {
      const r = await api("GET", `/api/admin/academy/assignments?courseId=${courseId}`);
      expect(r.ok, `HTTP ${r.status}`);
      expect(r.json.assignments?.length >= 1, "assignment not listed");
    });
    await readOnly(m, "lms_certificates");
  }

  // 2. AdamsBrain (API — adamsBrains is server-only in rules, like the UI)
  {
    const m = "adams-brain";
    const adb = getAdminDb(adminApp());
    let deptId = "";
    let brainId = "";
    await step(m, "create brain (API)", async () => {
      const d = await api("POST", "/api/adams-harness/departments", { name: `CRUD Brain Dept ${runId}`, code: `CB${Date.now().toString().slice(-6)}`, ownerIds: [TEST_MEMBER_ID], memberIds: [TEST_MEMBER_ID] });
      expect(d.ok, `dept HTTP ${d.status} ${d.text.slice(0, 120)}`);
      deptId = d.json.department?.id || d.json.id;
      const r = await api("POST", "/api/adams-harness/brains", { name: `CRUD Test Brain ${runId}`, departmentId: deptId, ownerIds: [TEST_MEMBER_ID], audience: "admins", isActive: false, gbrainRepo: { enabled: false } });
      expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
      brainId = r.json.brain?.id || r.json.id;
      expect(brainId, "no brain id returned");
      return brainId;
    });
    if (brainId) {
      await step(m, "read brain (API)", async () => { const r = await api("GET", `/api/adams-harness/brains/${brainId}`); expect(r.ok, `HTTP ${r.status}`); });
      await step(m, "list brains (API)", async () => { const r = await api("GET", "/api/adams-harness/brains"); expect(r.ok && JSON.stringify(r.json).includes(brainId), `HTTP ${r.status}`); });
      await step(m, "update brain (API)", async () => {
        const r = await api("PATCH", `/api/adams-harness/brains/${brainId}`, { description: "edited by CRUD test" });
        expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
      });
      record(m, "delete brain", "skip", "no DELETE API — brains can only be deactivated (finding)");
      await adb.collection("adamsBrains").doc(brainId).delete();
    }
    if (deptId) await adb.collection("departments").doc(deptId).delete();
  }

  // 3. Alignable
  skip("alignable", "external integration (Alignable API)");

  // 4. Asset Manager (API + history)
  {
    const m = "asset-manager";
    let assetId = "";
    await step(m, "create asset (API)", async () => {
      const r = await api("POST", "/api/admin/assets", { assetName: `CRUD Test Laptop ${runId}`, assetType: "laptop", serialNumber: `CRUD-${runId}`, syncProviders: false });
      expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
      assetId = r.json.asset?.id || r.json.id || r.json.assetId;
      expect(assetId, `no id in response: ${r.text.slice(0, 120)}`);
      return assetId;
    });
    if (assetId) {
      await step(m, "read asset (API)", async () => {
        const r = await api("GET", `/api/admin/assets/${assetId}`);
        expect(r.ok, `HTTP ${r.status}`);
      });
      await step(m, "assign asset (API)", async () => {
        const r = await api("PATCH", `/api/admin/assets/${assetId}`, { assignedToTeamMemberId: TEST_MEMBER_ID, status: "active", syncProviders: false });
        expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
        const snap = await getDoc(doc(db, "userAssets", assetId));
        expect(snap.data()?.assignedToTeamMemberId === TEST_MEMBER_ID, "assignment not persisted");
      });
      await step(m, "assignment history written", async () => {
        const snap = await getDocs(query(collection(db, "assetHistory"), limit(200)));
        expect(snap.docs.some((d) => d.data().assetId === assetId), "no assetHistory entry for asset");
      });
      await step(m, "delete asset (API)", async () => {
        const r = await api("DELETE", `/api/admin/assets/${assetId}`, { mode: "delete" });
        expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
        expect(!(await getDoc(doc(db, "userAssets", assetId))).exists(), "asset still exists");
      });
    }
    await firestoreCrud(m, "userAssets", { assetName: "CRUD client-side asset", assetType: "phone", status: "available" }, { status: "maintenance" });
  }

  // 5. Backups
  {
    const m = "backups";
    await step(m, "list backups (API)", async () => { const r = await api("GET", "/api/admin/backups"); expect(r.ok, `HTTP ${r.status}`); });
    await step(m, "backup stats (API)", async () => { const r = await api("GET", "/api/admin/backups/stats"); expect(r.ok, `HTTP ${r.status}`); });
    await step(m, "list schedules (API)", async () => { const r = await api("GET", "/api/admin/backups/schedules"); expect(r.ok, `HTTP ${r.status}`); });
    record(m, "create/delete backup", "skip", "writes to Google Drive (external)");
  }

  // 6. Book-a-Call meeting types
  await firestoreCrud("book-a-call", "meetingTypes", { name: "CRUD Test Meeting", durationMinutes: 30, isActive: false }, { durationMinutes: 45 });

  // 7. Book-call leads (page-only; see UI smoke)
  record("book-call-leads", "all", "skip", "no data layer in page; covered by UI smoke");

  // 8. Certification Tracker
  await firestoreCrud("certification-tracker", "userTrainingCerts", {
    userId: "crud-test", teamMemberId: TEST_MEMBER_ID, userName: "CRUD Test Admin", userEmail: TEST_EMAIL,
    trainingTitle: "CRUD Test OSHA 10", trainingCategory: "osha", issuingOrganization: "OSHA",
    completionDate: "2026-01-01", expirationDate: "2031-01-01",
  }, { expirationDate: "2032-01-01" });
  await readOnly("certification-tracker", "platformAutomations");
  record("certification-tracker", "run tracker", "skip", "sends Hermes/email/Teams (external)");

  // 9. Departments (API)
  {
    const m = "departments";
    let deptId = "";
    const code = `CT${Date.now().toString().slice(-6)}`;
    await step(m, "create department (API)", async () => {
      const r = await api("POST", "/api/adams-harness/departments", { name: `CRUD Test Dept ${runId}`, code, ownerIds: [TEST_MEMBER_ID], memberIds: [TEST_MEMBER_ID] });
      expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
      deptId = r.json.department?.id || r.json.id;
      expect(deptId, "no department id returned");
      return deptId;
    });
    await step(m, "list departments (API)", async () => {
      const r = await api("GET", "/api/adams-harness/departments");
      expect(r.ok, `HTTP ${r.status}`);
      expect(JSON.stringify(r.json).includes(code), "created department not listed");
    });
    if (deptId) {
      await step(m, "update department (API)", async () => {
        const r = await api("PATCH", `/api/adams-harness/departments/${deptId}`, { description: "edited by CRUD test" });
        expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
      });
      await step(m, "deactivate department (API)", async () => {
        const r = await api("PATCH", `/api/adams-harness/departments/${deptId}`, { isActive: false });
        expect(r.ok, `HTTP ${r.status}`);
      });
      record(m, "delete department", "skip", "no DELETE API — departments can only be deactivated (finding)");
      const adb = getAdminDb(adminApp());
      await adb.collection("departments").doc(deptId).delete();
    }
  }

  // 10. Events
  await firestoreCrud("events", "events", { title: "CRUD Test Event", slug: `crud-event-${runId}`, isPublished: false, startDate: "2027-01-01" }, { title: "CRUD Test Event (edited)" });

  // 11. GHL migration
  skip("ghl-migration", "external integration (GoHighLevel)");

  // 12. Hardhat QR (API lifecycle)
  {
    const m = "hardhat-qr";
    let codeId = "";
    await step(m, "issue code (API)", async () => {
      const r = await api("POST", "/api/admin/hardhat-qr", { teamMemberId: TEST_MEMBER_ID });
      expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
      codeId = r.json.code?.id || r.json.id;
      expect(codeId, "no code id returned");
    });
    await step(m, "list codes (API)", async () => {
      const r = await api("GET", "/api/admin/hardhat-qr");
      expect(r.ok, `HTTP ${r.status}`);
      expect(JSON.stringify(r.json).includes(TEST_MEMBER_ID), "issued code not listed");
    });
    for (const action of ["deactivate", "activate", "printed", "rotate"] as const) {
      await step(m, `${action} (API)`, async () => {
        const r = await api("PATCH", `/api/admin/hardhat-qr/${codeId}`, { action });
        expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
        if (action === "rotate") codeId = r.json.code?.id || codeId;
      });
    }
    await step(m, "public scan resolves", async () => {
      const r = await fetch(`${BASE_URL}/api/public/worker/${codeId}`);
      expect(r.ok, `HTTP ${r.status}`);
    });
    await step(m, "revoke (API)", async () => {
      const r = await api("PATCH", `/api/admin/hardhat-qr/${codeId}`, { action: "revoke" });
      expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
      const scan = await fetch(`${BASE_URL}/api/public/worker/${codeId}`);
      expect(!scan.ok, "revoked code still resolves publicly");
    });
  }

  // 13. Hero slides
  await firestoreCrud("hero", "heroSlides", { title: "CRUD Test Slide", subtitle: "test", isActive: false, order: 999 }, { title: "CRUD Test Slide (edited)" });

  // 14. Images (metadata only — Storage not provisioned)
  await firestoreCrud("images", "images", { name: "crud-test.png", url: "https://example.invalid/crud.png", category: "test" }, { name: "crud-test-renamed.png" });

  // 15. Initiatives
  record("initiatives", "all", "skip", "static content page; covered by UI smoke");

  // 16. Interviews / PRDs (seeded interview, no AI)
  {
    const m = "interviews";
    const adb = getAdminDb(adminApp());
    const interviewRef = adb.collection("processInterviews").doc();
    const prdRef = adb.collection("interviewPrds").doc();
    await interviewRef.set({
      id: interviewRef.id, title: "CRUD Test Interview", departmentId: "crud", source: "public", status: "ready_for_review",
      messages: [], facts: {}, coverage: {}, unresolvedQuestions: [], readyForSpecification: true, respondentName: "CRUD Tester",
      createdByUid: "crud", ...tag(), createdAt: new Date(), updatedAt: new Date(),
    });
    await prdRef.set({
      id: prdRef.id, interviewId: interviewRef.id, departmentId: "crud", title: "CRUD Test PRD", version: 1, status: "draft",
      requestKind: "new_app", classificationReason: "test", executiveSummary: "test", content: "# CRUD Test PRD\n\nOriginal.",
      sections: {}, specificationSections: {}, dataSharingOpportunities: [], integrationRecommendations: [],
      canonicalHash: "crud", createdByUid: "crud", ...tag(), createdAt: new Date(), updatedAt: new Date(),
    });
    await adb.collection("interviewAttachmentFiles").doc("crudfile_0").set({
      fileId: "crudfile", interviewId: interviewRef.id, fileName: "crud.txt", mimeType: "text/plain", size: 5, chunkCount: 1,
      chunkIndex: 0, data: Buffer.from("hello").toString("base64"), ...tag(), createdAt: new Date(),
    });
    await step(m, "list interviews+PRDs (API)", async () => {
      const r = await api("GET", "/api/admin/interview-prds");
      expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
      expect(JSON.stringify(r.json).includes(interviewRef.id), "seeded interview not listed");
    });
    await step(m, "read PRD (API)", async () => {
      const r = await api("GET", `/api/admin/interview-prds/${prdRef.id}`);
      expect(r.ok && r.json.prd?.title === "CRUD Test PRD", `HTTP ${r.status}`);
    });
    await step(m, "edit PRD (API)", async () => {
      const r = await api("PATCH", `/api/admin/interview-prds/${prdRef.id}`, { content: "# CRUD Test PRD\n\nEdited.", title: "CRUD Test PRD (edited)" });
      expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
      expect(r.json.prd?.content?.includes("Edited."), "content not updated");
    });
    await step(m, "stage blocked after manual edit", async () => {
      // Business rule: manual edits require AI regeneration before staging.
      const r = await api("PATCH", `/api/admin/interview-prds/${prdRef.id}`, { status: "staged" });
      expect(r.status === 409, `expected 409, got ${r.status}`);
      return "409 — regeneration required (by design)";
    });
    await step(m, "stage unedited PRD (API)", async () => {
      await prdRef.update({ requiresRegeneration: false });
      const r = await api("PATCH", `/api/admin/interview-prds/${prdRef.id}`, { status: "staged" });
      expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
    });
    await step(m, "list attachments (API)", async () => {
      const r = await api("GET", `/api/admin/interviews/${interviewRef.id}/attachments`);
      expect(r.ok && r.json.files?.length === 1, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
    });
    await step(m, "download attachment (API)", async () => {
      const res = await fetch(`${BASE_URL}/api/admin/interviews/${interviewRef.id}/attachments?fileId=crudfile`, { headers: { Authorization: `Bearer ${idToken}` } });
      expect(res.ok && (await res.text()) === "hello", `HTTP ${res.status}`);
    });
    await step(m, "archive PRD (API)", async () => {
      const r = await api("PATCH", `/api/admin/interview-prds/${prdRef.id}`, { status: "archived" });
      expect(r.ok, `HTTP ${r.status}`);
    });
    record(m, "AI chat / diagram / generate", "skip", "Hermes AI (external)");
    await Promise.all([interviewRef.delete(), prdRef.delete(), adb.collection("interviewAttachmentFiles").doc("crudfile_0").delete()]);
  }

  // 17. Mail
  skip("mail", "external integration (Microsoft Graph mail)");

  // 18. Migrate auth
  await readOnly("migrate-auth", "teamMembers");
  record("migrate-auth", "run migration", "skip", "mutates production auth users");

  // 19. Modules
  {
    const m = "modules";
    await step(m, "list modules (API)", async () => { const r = await api("GET", "/api/adams-harness/modules"); expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 120)}`); return `${r.json.modules?.length ?? "?"} modules`; });
    await step(m, "list module builds (API)", async () => { const r = await api("GET", "/api/adams-harness/module-builds"); expect(r.ok, `HTTP ${r.status}`); });
    await step(m, "platform health (API)", async () => { const r = await api("GET", "/api/adams-harness/health"); expect(r.ok, `HTTP ${r.status}`); });
    record(m, "build/deploy module", "skip", "Hermes + GitHub (external)");
  }

  // 20. Navigation
  await firestoreCrud("navigation", "navigation_header", { label: "CRUD Test Link", href: "/crud-test", type: "header", order: 999, isVisible: false }, { label: "CRUD Test Link (edited)" });
  await firestoreCrud("navigation", "navigation_footer", { label: "CRUD Footer", href: "/crud-footer", type: "footer", order: 999, isVisible: false }, { label: "CRUD Footer (edited)" });

  // 21. Page designer
  await firestoreCrud("page-designer", "page_layout_templates", { name: "CRUD Test Layout", sections: [] }, { name: "CRUD Test Layout (edited)" });
  await firestoreCrud("page-designer", "page_designs", { pageId: "crud-test", name: "CRUD Design", sections: [] }, { name: "CRUD Design (edited)" });

  // 22. Platform development
  await firestoreCrud("platform-development", "platformDevTasks", { title: "CRUD Test Task", status: "todo", priority: "low" }, { status: "done" });
  await readOnly("platform-development", "platformDevReports");
  record("platform-development", "generate report", "skip", "Hermes AI (external)");

  // 23. Popup
  record("popup", "all", "skip", "preview-only page; covered by UI smoke");

  // 24. Quiz
  await firestoreCrud("quiz", "quizQuestions", { question: "CRUD test question?", options: ["a", "b"], order: 999, isActive: false }, { question: "CRUD test question (edited)?" });
  await firestoreCrud("quiz", "quizReportTemplates", { name: "CRUD Report Template", sections: [] }, { name: "CRUD Report Template (edited)" });
  await readOnly("quiz", "quizSubmissions");

  // 25. Revenue (read-only reporting)
  await readOnly("revenue", "lms_course_purchases");

  // 26. Setup user
  await firestoreCrud("setup-user", "teamMembers", { firstName: "CRUD", lastName: "Setup Test", emailPrimary: `crud-setup-${runId}@example.invalid`, role: "team", status: "inactive" }, { lastName: "Setup Test (edited)" });

  // 27-29. Simple content collections
  await firestoreCrud("software-keys", "softwareKeys", { name: "CRUD Test Key", vendor: "Test", licenseKey: "XXXX-CRUD", seats: 1 }, { seats: 2 });
  await firestoreCrud("strategic-partners", "strategicPartners", { name: "CRUD Test Partner", isActive: false }, { name: "CRUD Test Partner (edited)" });
  await firestoreCrud("success-stories", "successStories", { title: "CRUD Test Story", isPublished: false }, { title: "CRUD Test Story (edited)" });

  // 30. Superadmin (platform settings)
  {
    const m = "superadmin";
    await step(m, "read platformSettings/global", async () => { expect((await getDoc(doc(db, "platformSettings", "global"))).exists(), "settings doc missing"); });
    await step(m, "write/remove test field", async () => {
      await setDoc(doc(db, "platformSettings", "global"), { __crudTestPing: runId }, { merge: true });
      expect((await getDoc(doc(db, "platformSettings", "global"))).data()?.__crudTestPing === runId, "write not persisted");
      await updateDoc(doc(db, "platformSettings", "global"), { __crudTestPing: deleteField() });
    });
  }

  // 31. Team members
  await firestoreCrud("team-members", "teamMembers", { firstName: "CRUD", lastName: "Member Test", emailPrimary: `crud-member-${runId}@example.invalid`, role: "team", status: "active" }, { status: "inactive" });
  await step("team-members", "sync auth (API)", async () => {
    const r = await api("POST", "/api/admin/team-members/sync-auth", {});
    expect(r.status !== 404 && r.status < 500, `HTTP ${r.status} ${r.text.slice(0, 150)}`);
    return `HTTP ${r.status}`;
  });

  // 32. Time automations
  await firestoreCrud("time-automations", "platformAutomations", { name: "CRUD Test Automation", enabled: false, schedule: "0 0 1 1 *" }, { enabled: false, name: "CRUD Test Automation (edited)" });

  // 33. White label
  await firestoreCrud("white-label", "whiteLabelDeployments", { name: "CRUD Test Deployment", status: "draft" }, { status: "archived" });

  // Safety pilot modules (portal, admin-triaged)
  {
    const m = "safety-request-box";
    let id = "";
    await step(m, "create request (API)", async () => {
      const r = await api("POST", "/api/safety/requests", { type: "observation", title: "CRUD test observation", description: "automated test" });
      expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`); id = r.json.id;
    });
    await step(m, "list requests (API)", async () => { const r = await api("GET", "/api/safety/requests"); expect(r.ok && JSON.stringify(r.json).includes(id), `HTTP ${r.status}`); });
    await step(m, "triage request (API)", async () => { const r = await api("PATCH", `/api/safety/requests/${id}`, { status: "resolved", priority: "high" }); expect(r.ok, `HTTP ${r.status} ${r.text.slice(0, 150)}`); });
    if (id) await getAdminDb(adminApp()).collection("safetyRequests").doc(id).delete();
  }
  {
    const m = "vehicle-inspection";
    const checklist = Object.fromEntries(["lights", "tires", "brakes", "mirrors", "horn", "wipers", "fluids", "seatbelts", "extinguisher", "first_aid", "load"].map((k) => [k, "pass"]));
    let id = "";
    await step(m, "submit inspection (API)", async () => {
      const r = await api("POST", "/api/vehicle-inspections", { vehicleNumber: "CRUD-1", checklist: { ...checklist, tires: "fail" }, defectNotes: "test" });
      expect(r.ok && r.json.outcome === "defects", `HTTP ${r.status} ${r.text.slice(0, 150)}`); id = r.json.id;
    });
    await step(m, "reject incomplete checklist", async () => {
      const r = await api("POST", "/api/vehicle-inspections", { vehicleNumber: "CRUD-1", checklist: { lights: "pass" } });
      expect(r.status === 400, `expected 400, got ${r.status}`);
    });
    await step(m, "list inspections (API)", async () => { const r = await api("GET", "/api/vehicle-inspections"); expect(r.ok && JSON.stringify(r.json).includes(id), `HTTP ${r.status}`); });
    if (id) await getAdminDb(adminApp()).collection("vehicleInspections").doc(id).delete();
  }

  // Report
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/admin-crud-results.json`, JSON.stringify({ runId, baseUrl: BASE_URL, results, collections: [...TOUCHED_COLLECTIONS] }, null, 2));
  const count = (s: Status) => results.filter((r) => r.status === s).length;
  console.log(`\n${count("pass")} passed, ${count("fail")} failed, ${count("skip")} skipped`);
}

const mode = process.argv[2];
(mode === "setup" ? setup() : mode === "teardown" ? teardown() : mode === "run" ? run() : Promise.reject(new Error("usage: setup|run|teardown")))
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });
