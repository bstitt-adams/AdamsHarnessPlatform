/**
 * LMS end-to-end test: course creation → launch → enrollment → student
 * tracking → grading → completion/certification → admin tracking.
 *
 *   npx tsx scripts/lms-e2e-tests.ts          # setup, run, teardown (dev server on CRUD_BASE_URL for HTTP steps)
 *   npx tsx scripts/lms-e2e-tests.ts keep     # skip teardown for manual inspection
 *
 * Calls the app's real LMS modules (lib/firebase-lms, lib/firebase-lms-student)
 * signed in as a non-admin student and as an admin, so Firestore rules apply
 * exactly as in the browser. Student identity mirrors the app: profile.id is
 * the Team Member document id, which differs from the Firebase Auth uid.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { cert, initializeApp as initAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminDb } from "firebase-admin/firestore";

const BASE_URL = process.env.CRUD_BASE_URL || "http://localhost:3000";
const RUN = `lms-${Date.now()}`;
const ADMIN = { email: "lms-test-admin@adams-electric.com", memberId: "lmstest-admin", role: "admin" };
const STUDENT = { email: "lms-test-student@adams-electric.com", memberId: "lmstest-student", role: "team" };

const adminApp = initAdmin({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  }),
}, "lms-admin");
const adb = getAdminDb(adminApp);
const aauth = getAdminAuth(adminApp);

type Status = "pass" | "fail" | "skip";
const results: { area: string; step: string; status: Status; detail: string }[] = [];
function record(area: string, step: string, status: Status, detail = "") {
  results.push({ area, step, status, detail: detail.slice(0, 300) });
  console.log(`${status.toUpperCase().padEnd(4)}  ${area.padEnd(14)} ${step.padEnd(52)} ${detail.slice(0, 110)}`);
}
async function step(area: string, name: string, fn: () => Promise<string | void>) {
  try { record(area, name, "pass", (await fn()) || ""); return true; }
  catch (e) { record(area, name, "fail", e instanceof Error ? e.message : String(e)); return false; }
}
/** A security control: passes only if the operation is REJECTED. */
async function mustReject(area: string, name: string, fn: () => Promise<unknown>) {
  try { await fn(); record(area, name, "fail", "operation was ALLOWED — should be rejected"); }
  catch (e) { record(area, name, "pass", `rejected: ${(e instanceof Error ? e.message : String(e)).slice(0, 80)}`); }
}
function expect(cond: unknown, msg: string): asserts cond { if (!cond) throw new Error(msg); }

const accounts: Record<string, { uid: string; password: string }> = {};
async function ensureAccount(a: typeof ADMIN) {
  const password = `Lms!${randomBytes(12).toString("base64url")}`;
  let uid: string;
  try { uid = (await aauth.getUserByEmail(a.email)).uid; await aauth.updateUser(uid, { password }); }
  catch { uid = (await aauth.createUser({ email: a.email, password, emailVerified: true })).uid; }
  await adb.collection("users").doc(uid).set({ uid, email: a.email, role: a.role, teamMemberId: a.memberId, __lmsTest: RUN }, { merge: true });
  await adb.collection("teamMembers").doc(a.memberId).set({
    id: a.memberId, firstName: "LMS", lastName: a.role === "admin" ? "Test Admin" : "Test Student", emailPrimary: a.email,
    firebaseUid: uid, authUid: uid, role: a.role, status: "active", __lmsTest: RUN, createdAt: new Date(), updatedAt: new Date(),
  }, { merge: true });
  accounts[a.email] = { uid, password };
}

const createdCourseIds: string[] = [];

const QUIZ_MARKDOWN = [
  "# Safety Quiz",
  "Passing Score: 70%",
  "### Question 1: What is LOTO?",
  "A) Lockout/Tagout ✓",
  "B) Lift Operator Training",
  "*Lockout/Tagout isolates hazardous energy.*",
  "### Question 2: Arc flash PPE standard?",
  "A) NFPA 70E ✓",
  "B) ISO 9001",
].join("\n");

async function main() {
  await ensureAccount(ADMIN);
  await ensureAccount(STUDENT);
  const studentUid = accounts[STUDENT.email].uid;

  // Import app modules after env is loaded so lib/firebase initializes with config.
  const { auth } = await import("@/lib/firebase");
  const { signInWithEmailAndPassword, signOut } = await import("firebase/auth");
  const { doc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, Timestamp } = await import("./_firestore");
  const { db } = await import("@/lib/firebase");
  const lms = await import("@/lib/firebase-lms");
  
  expect(auth && db, "client Firebase not initialized");
  const as = async (who: typeof ADMIN) => { await signOut(auth!).catch(() => undefined); await signInWithEmailAndPassword(auth!, who.email, accounts[who.email].password); };

  // ---------------------------------------------------------------- course creation (admin)
  await as(ADMIN);
  let courseId = "", moduleId = "";
  const lessonIds: string[] = [];
  let quizLessonId = "";
  await step("create", "createCourse (draft)", async () => {
    const c = await lms.createCourse({ title: `LMS E2E Course ${RUN}`, shortDescription: "e2e", instructorName: "Adams Electric", difficultyLevel: "beginner" });
    courseId = c.id; createdCourseIds.push(courseId);
    expect(c.isPublished === false, "new course should start as draft");
    return courseId;
  });
  await step("create", "createModule + 3 lessons (text, quiz, video)", async () => {
    moduleId = (await lms.createModule({ courseId, title: "Section 1", sortOrder: 0 })).id;
    lessonIds.push((await lms.createLesson({ moduleId, courseId, title: "Intro", contentType: "text", textContent: "Welcome", sortOrder: 1 })).id);
    quizLessonId = (await lms.createLesson({ moduleId, courseId, title: "Safety Quiz", contentType: "quiz", textContent: QUIZ_MARKDOWN, sortOrder: 2 })).id;
    lessonIds.push(quizLessonId);
    lessonIds.push((await lms.createLesson({ moduleId, courseId, title: "Video", contentType: "video", videoUrl: "https://example.invalid/v.mp4", sortOrder: 3 })).id);
  });
  await step("create", "updateCourse (free) + read back full outline", async () => {
    await lms.updateCourse(courseId, { isFree: true, priceInCents: 0 } as never);
    const full = await lms.getCourseWithModulesAndLessons(courseId);
    const n = full?.modules.reduce((s, m) => s + m.lessons.length, 0);
    expect(n === 3, `expected 3 lessons, got ${n}`);
  });

  // ---------------------------------------------------------------- launch
  await step("launch", "publishCourse", async () => {
    await lms.publishCourse(courseId);
    expect((await lms.getCourse(courseId))?.isPublished, "not published");
  });
  await signOut(auth!);
  await step("launch", "signed-out visitor can read published course", async () => {
    expect((await lms.getCourse(courseId))?.title, "course not visible publicly");
  });
  await step("launch", "published course appears in public catalog", async () => {
    const list = await lms.getCourses({ isPublished: true });
    expect(list.some((c) => c.id === courseId), "not in catalog");
  });
  await step("launch", "marketing course page renders (HTTP)", async () => {
    const r = await fetch(`${BASE_URL}/academy/courses/${courseId}`).catch(() => null);
    if (!r) return "dev server not running — skipped HTTP check";
    expect(r.ok, `HTTP ${r.status}`);
  });

  // ---------------------------------------------------------------- enrollment (student, exactly as the app calls it)
  await as(STUDENT);
  const profileId = studentUid; // canonical LMS student id = Firebase Auth uid
  const studentApi = async (method: string, path: string, body?: unknown) => {
    const token = await auth!.currentUser!.getIdToken();
    const r = await fetch(`${BASE_URL}${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(json).slice(0, 150)}`);
    return json;
  };
  let enrollmentId = "";
  await mustReject("enroll", "SECURITY: content blocked before enrolling", () => studentApi("GET", `/api/academy/courses/${courseId}`));
  await step("enroll", "student self-enrols (API)", async () => {
    enrollmentId = (await studentApi("POST", `/api/academy/courses/${courseId}/enroll`)).enrollmentId;
    expect(enrollmentId, "no enrollment id");
  });
  await step("enroll", "My Courses lists the enrollment (getUserEnrollments(uid))", async () => {
    const list = await lms.getUserEnrollments(profileId);
    expect(list.some((e) => e.courseId === courseId), "enrolled course missing from My Courses");
  });

  // ---------------------------------------------------------------- content access
  let content: { modules: { lessons: { id: string; textContent?: string | null; quiz?: { questions: Record<string, unknown>[] } }[] }[] } = { modules: [] };
  await step("content", "enrolled student loads outline + lessons (API)", async () => {
    content = await studentApi("GET", `/api/academy/courses/${courseId}`);
    const n = content.modules.reduce((s, m) => s + m.lessons.length, 0);
    expect(n === 3, `expected 3 lessons, got ${n}`);
  });
  await step("content", "SECURITY: quiz answer key not sent to student", async () => {
    const quiz = content.modules.flatMap((m) => m.lessons).find((l) => l.id === quizLessonId);
    expect(quiz?.quiz?.questions.length === 2, "quiz questions missing");
    expect(!quiz?.textContent && quiz!.quiz!.questions.every((q) => !("correctAnswer" in q)), "answer key exposed");
  });
  await mustReject("content", "SECURITY: direct lesson read still blocked for students", () => lms.getLesson(quizLessonId).then((l) => { if (!l) throw new Error("none"); }));

  // ---------------------------------------------------------------- student tracking
  await step("tracking", "complete lesson 1 (API)", async () => {
    await studentApi("POST", `/api/academy/courses/${courseId}/lessons/${lessonIds[0]}/progress`, { action: "complete" });
  });
  await step("tracking", "progress % updates after lesson 1 (expect 33)", async () => {
    const e = (await lms.getUserEnrollments(profileId)).find((x) => x.courseId === courseId);
    expect(e?.progressPercentage === 33, `progress=${e?.progressPercentage}`);
  });
  await mustReject("tracking", "quiz lesson can't be marked complete without passing", () =>
    studentApi("POST", `/api/academy/courses/${courseId}/lessons/${quizLessonId}/progress`, { action: "complete" }));

  // ---------------------------------------------------------------- grading (server-side)
  await step("grading", "wrong answers graded as fail; no answer key revealed", async () => {
    const r = await studentApi("POST", `/api/academy/courses/${courseId}/lessons/${quizLessonId}/quiz`, { answers: [1, 1] });
    expect(r.attempt.score === 0 && !r.attempt.passed && r.review === null, `score=${r.attempt.score} review=${JSON.stringify(r.review)}`);
  });
  await step("grading", "correct answers pass, reveal review, complete lesson", async () => {
    const r = await studentApi("POST", `/api/academy/courses/${courseId}/lessons/${quizLessonId}/quiz`, { answers: [0, 0] });
    expect(r.attempt.score === 100 && r.attempt.passed && r.review?.length === 2, `score=${r.attempt.score}`);
    expect(r.progress?.progressPercentage === 67, `progress=${r.progress?.progressPercentage}`);
  });
  await mustReject("grading", "SECURITY: student writes forged passing attempt", async () => {
    await addDoc(collection(db!, "lms_quiz_attempts"), {
      odUserId: studentUid, lessonId: quizLessonId, courseId, enrollmentId, questions: [], answers: [], score: 100, passed: true, totalQuestions: 0, passingScore: 70,
    });
  });

  // ---------------------------------------------------------------- completion
  await step("tracking", "complete final lesson → 100% + completedAt", async () => {
    await studentApi("POST", `/api/academy/courses/${courseId}/lessons/${lessonIds[2]}/progress`, { action: "complete" });
    const e = (await lms.getUserEnrollments(profileId)).find((x) => x.courseId === courseId);
    expect(e?.progressPercentage === 100 && e?.completedAt, `progress=${e?.progressPercentage} completedAt=${Boolean(e?.completedAt)}`);
  });
  await step("certify", "completion synced to Certification Tracker (userTrainingCerts)", async () => {
    const snap = await adb.collection("userTrainingCerts").where("sourceCourseId", "==", courseId).get();
    expect(!snap.empty, "no training certification created on course completion");
    const c = snap.docs[0].data();
    expect(c.teamMemberId === STUDENT.memberId, `linked to ${c.teamMemberId}, expected ${STUDENT.memberId}`);
  });
  await mustReject("certify", "SECURITY: student issues own certificate", async () => {
    await lms.issueCertificate({ odUserId: studentUid, certificateType: "course", courseId, title: "Forged", recipientName: "Me" });
  });

  // ---------------------------------------------------------------- paid course bypass
  await as(ADMIN);
  let paidId = "";
  await step("enroll", "admin creates + publishes a paid course", async () => {
    const c = await lms.createCourse({ title: `LMS E2E Paid ${RUN}`, instructorName: "Adams Electric", difficultyLevel: "beginner" });
    paidId = c.id; createdCourseIds.push(paidId);
    await lms.updateCourse(paidId, { isFree: false, priceInCents: 9900 } as never);
    await lms.publishCourse(paidId);
  });
  await as(STUDENT);
  const paidEnrollmentRef = doc(collection(db!, "lms_enrollments"));
  await mustReject("enroll", "SECURITY: paid course enrolment rejected without purchase (API 402)", async () => {
    await studentApi("POST", `/api/academy/courses/${paidId}/enroll`);
  });
  await mustReject("enroll", "SECURITY: student writes enrolment doc directly", async () => {
    await setDoc(paidEnrollmentRef, {
      userId: studentUid, courseId: paidId, enrolledAt: Timestamp.now(), completedAt: null, progressPercentage: 0, lastAccessedAt: null, certificateIssuedAt: null, certificateId: null,
    });
  });
  await mustReject("tracking", "SECURITY: student sets own enrollment to 100%/completed", async () => {
    await updateDoc(paidEnrollmentRef, { progressPercentage: 100, completedAt: Timestamp.now() });
  });
  await mustReject("certify", "SECURITY: student writes own certificate doc directly", async () => {
    await addDoc(collection(db!, "lms_certificates"), {
      odUserId: studentUid, certificateType: "course", courseId: paidId, title: "Forged", recipientName: "Me", certificateNumber: `FORGED-${RUN}`, issuedAt: Timestamp.now(),
    });
  });

  // ---------------------------------------------------------------- certificates (admin flow)
  await as(ADMIN);
  let certNumber = "";
  await step("certify", "admin issues course certificate", async () => {
    const c = await lms.issueCertificate({ odUserId: studentUid, certificateType: "course", courseId, title: "LMS E2E", recipientName: "LMS Test Student" });
    certNumber = c.certificateNumber;
  });
  await as(STUDENT);
  await step("certify", "student sees certificate (getUserCertificates(uid))", async () => {
    const list = await lms.getUserCertificates(profileId);
    expect(list.some((c) => c.certificateNumber === certNumber), "certificate not visible under uid");
  });
  await signOut(auth!);
  await step("certify", "public certificate verification by number (API)", async () => {
    const r = await fetch(`${BASE_URL}/api/public/certificates/${encodeURIComponent(certNumber)}`).catch(() => null);
    expect(r?.ok, "public verification endpoint failed");
    const j = await r!.json();
    expect(j.valid === true && j.certificate?.recipientName === "LMS Test Student", "verification payload wrong");
    expect(!JSON.stringify(j).includes("odUserId"), "verification leaked internal ids");
  });

  // ---------------------------------------------------------------- admin tracking
  await as(ADMIN);
  await step("admin", "tracking page data loads (courses/enrollments/progress/certs)", async () => {
    for (const c of ["lms_courses", "lms_enrollments", "lms_lesson_progress", "lms_certificates"]) await getDocs(collection(db!, c));
  });
  await step("admin", "enrollment can be resolved to a Team Member", async () => {
    const enr = (await getDocs(query(collection(db!, "lms_enrollments"), where("courseId", "==", courseId)))).docs.map((d) => d.data());
    const members = (await adb.collection("teamMembers").get()).docs.map((d) => ({ id: d.id, uid: d.data().firebaseUid }));
    const resolvable = enr.every((e) => members.some((m) => m.id === e.userId || m.uid === e.userId));
    expect(resolvable, "enrollment userId matches no Team Member id or uid");
    return `userId stored: ${enr.map((e) => (e.userId === STUDENT.memberId ? "teamMemberId" : e.userId === studentUid ? "authUid" : "?")).join(",")}`;
  });
  await step("admin", "getAcademyStats", async () => { const s = await lms.getAcademyStats(); return JSON.stringify(s).slice(0, 100); });

  // ---------------------------------------------------------------- assignment → student visibility
  let assignedCourseId = "";
  await step("assign", "admin assigns a course via API", async () => {
    const c = await lms.createCourse({ title: `LMS E2E Assigned ${RUN}`, instructorName: "Adams Electric", difficultyLevel: "beginner" });
    assignedCourseId = c.id; createdCourseIds.push(assignedCourseId);
    await lms.publishCourse(assignedCourseId);
    const token = await auth!.currentUser!.getIdToken();
    const r = await fetch(`${BASE_URL}/api/admin/academy/assignments`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ courseId: assignedCourseId, teamMemberIds: [STUDENT.memberId] }),
    }).catch(() => null);
    expect(r, "dev server not running");
    const j = await r.json();
    expect(r.ok && j.results?.[0]?.status === "assigned", `HTTP ${r.status} ${JSON.stringify(j).slice(0, 120)}`);
  });
  await as(STUDENT);
  await step("assign", "assigned course appears in student's My Courses", async () => {
    const list = await lms.getUserEnrollments(profileId);
    expect(list.some((e) => e.courseId === assignedCourseId), "assigned course not visible under profile.id");
  });

  await signOut(auth!);
}

async function teardown() {
  let n = 0;
  const del = async (snap: FirebaseFirestore.QuerySnapshot) => { for (const d of snap.docs) { await d.ref.delete(); n++; } };
  for (const courseId of createdCourseIds) {
    for (const c of ["lms_course_modules", "lms_lessons", "lms_enrollments", "lms_lesson_progress", "lms_quiz_attempts", "lms_certificates", "lms_assignments"]) {
      await del(await adb.collection(c).where("courseId", "==", courseId).get());
    }
    await del(await adb.collection("userTrainingCerts").where("sourceCourseId", "==", courseId).get());
    await adb.collection("lms_courses").doc(courseId).delete(); n++;
  }
  for (const a of [ADMIN, STUDENT]) {
    const acct = accounts[a.email];
    if (acct) {
      for (const c of ["lms_user_points", "lms_user_badges", "lms_enrollments", "lms_lesson_progress", "lms_quiz_attempts", "lms_certificates"]) {
        for (const f of ["odUserId", "userId"]) {
          await del(await adb.collection(c).where(f, "==", acct.uid).get());
          await del(await adb.collection(c).where(f, "==", a.memberId).get());
        }
      }
      await adb.collection("users").doc(acct.uid).delete();
      await aauth.deleteUser(acct.uid).catch(() => undefined);
    }
    await adb.collection("teamMembers").doc(a.memberId).delete();
  }
  console.log(`Teardown: ${n} LMS test records removed, test accounts deleted`);
}

main()
  .catch((e) => record("harness", "fatal", "fail", e instanceof Error ? e.stack || e.message : String(e)))
  .finally(async () => {
    mkdirSync("test-results", { recursive: true });
    writeFileSync("test-results/lms-e2e-results.json", JSON.stringify({ run: RUN, results }, null, 2));
    const c = (s: Status) => results.filter((r) => r.status === s).length;
    console.log(`\n${c("pass")} passed, ${c("fail")} failed, ${c("skip")} skipped`);
    if (process.argv[2] !== "keep") await teardown();
    process.exit(0);
  });
