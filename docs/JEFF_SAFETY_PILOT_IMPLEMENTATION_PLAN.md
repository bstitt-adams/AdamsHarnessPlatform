# Safety Pilot Implementation Plan (Jeff / Safety Department)

> Source: Brian ↔ Jeff (Safety Director) working session transcript, Nov 2026.
> Target: local Next.js app at `svp-platform/` (Next.js App Router + Firebase/Firestore + Hermes).
> Baseline: commit `f692570` ("Add QR lifecycle, certification tracker, Jamf/NinjaOne integrations…") plus uncommitted hard-hat QR work.

---

## 0. Summary of Requirements

### Priority 1 — Self-service certifications + Hard-hat QR (pilot)
- Workers maintain their own training/cert records from a phone; Jeff and Betty Jean stop chasing certificates.
- Worker sees what is expired → uploads new cert → reminders stop automatically.
- Platform is the source of truth; SiteDocs is updated downstream ("we're good, leave us alone").
- Hard-hat QR shows a worker's current certs; a **GC can scan it**. **Emergency contact visible only to safety reps.**
- Pilot scope: **mission-critical employees only** (Brittany's list).

### Priority 2 — Academy awareness training
- 10–15 annual "awareness" courses, 5–10 minutes each, sourced from J.J. Keller PowerPoints.
- Assign → track progress (enrolled / in progress / completed) → certificate auto-filed to the person's record.
- Driver: OSHA asks "what awareness training are you doing?" — currently nothing to show.

### Secondary
| # | Item | Notes |
|---|------|-------|
| 3 | Safety Request Box | Single inbox for supply requests (e.g., "ABC43 needs SRLs"); Jeff/Betty Jean check off. Prevent duplicate orders ("100 medium vests in the Connex"). |
| 4 | Vehicle inspections | Pilot: 5 people + vehicles + VINs; Betty Jean performs inspections. |
| 5 | Spanish | Per-user language preference. |
| 6 | AHA/JHA templates | Reusable Activity/Job Hazard Analysis templates; swap date/job name/number/location. South Hill (3–4 buildings now, 8–9 more planned). Later phase. |

### Inputs pending
- From Jeff: J.J. Keller PowerPoints, 4–5 vehicles/VINs, J.J. Keller login (do **not** store in platform).
- From Clay: Azure VM, subdomain (e.g., `platform.adams-electric.com`), correct email/Graph key.

---

## 1. Current State (Gap Analysis)

| Area | Existing code | Gap |
|------|---------------|-----|
| Cert upload | `app/(portal)/portal/my-training/page.tsx` — upload form, expiry date, `USER_TRAINING_CERTS` collection | Artifacts stored **Base64 in Firestore**, capped at **700 KB** (line ~298). Phone photos will fail. |
| Reminders | `app/api/admin/certification-tracker/run/route.ts` — Hermes report | Emails a **summary to supervisors/Safety/admins only** (lines ~138–150). **No per-employee reminders.** Uses 60-day window + 7/30-day follow-up; UI copy says 30/60/10 — inconsistent. |
| Hard-hat QR | `lib/hardhat-qr.ts`, `app/(marketing)/worker/[id]/page.tsx`, `app/api/public/worker/[id]/route.ts`, `app/api/admin/hardhat-qr/*` | Public view is safe (name + certs). **No emergency-contact field** and no role-gated view. `app/(portal)/portal/admin/hardhat-qr/` is **uncommitted**. |
| Mission-critical scope | `scripts/import-mission-critical-directory.ts` | No flag/filter on team members to scope pilot. |
| Academy/LMS | `lib/firebase-lms.ts`, `lib/firebase-lms-student.ts`, `app/(portal)/portal/my-courses/*`, `app/api/ai/course-generate/route.ts` | Course generator is **prompt-only** and uses **OpenAI/Ollama**, not the Claude/Hermes path. PPTX parser exists in `lib/adams-harness/attachment-analyzer.ts` (`parsePptxBuffer`) but is not wired to course building. No SCORM player. No completion → training-record linkage. |
| Safety Request Box | `app/(portal)/portal/safety-request-box/page.tsx` | "Coming Soon" stub. |
| Vehicle inspection | `app/(portal)/portal/vehicle-inspection/page.tsx` | Stub. Vehicles not yet imported into Asset Manager. |
| i18n | `language?` field in `lib/schema.ts` (~1216) | No i18n library, no per-user locale switching. |
| SiteDocs | — | Nothing. |
| Asset matching | `app/(portal)/portal/admin/asset-manager/*` | Assets matched by person name (stale names, e.g., ex-employees); merge found only ~14 matches. |

---

## 2. Phase 1 — Certification Pilot (target: Friday demo)

### 1.1 Move cert artifacts to Firebase Storage
**Why:** 700 KB Base64 cap breaks the phone-upload workflow.

- [ ] Add storage path convention: `training-certs/{teamMemberId}/{certId}/{filename}`.
- [ ] In `my-training/page.tsx`: client-side image compression (canvas resize to ~1600px, JPEG q≈0.8) before upload; PDFs uploaded as-is (limit e.g. 10 MB).
- [ ] Upload via `uploadBytes` from `lib/firebase.ts` `storage`; save `artifactPath`, `artifactContentType`, `artifactSize`, `artifactUploadedAt` on the cert doc instead of `artifactBase64`.
- [ ] Update `storage.rules`: owner can write own path; Safety/admin read all; no public read.
- [ ] Update `lib/schema.ts` `UserTrainingCertDoc` (keep `artifactBase64?` as deprecated for back-compat).
- [ ] Update cert-tracker run route: treat `artifactPath || artifactBase64` as "received".
- [ ] Mobile: `<input type="file" accept="image/*,application/pdf" capture="environment">`.

**Acceptance:** 5 MB phone photo uploads from mobile Safari/Chrome; artifact viewable by Safety admin; not viewable by another employee.

### 1.2 Per-employee reminder engine
**Why:** Jeff's core goal — "it's the system, not me."

- [ ] Create `lib/certifications/reminder-policy.ts` — single source of truth:
  ```ts
  export const REMINDER_DAYS_BEFORE = [30, 14, 7];   // confirm with Jeff
  export const OVERDUE_REPEAT_DAYS = 1;              // daily once expired
  export const SUPERVISOR_ESCALATE_AFTER_DAYS = 0;   // cc supervisor once expired
  export const SAFETY_ESCALATE_AFTER_DAYS = 14;      // escalate to Safety
  ```
- [ ] In `certification-tracker/run/route.ts`: for each cert in window, send an **individual** email (and Teams if configured via `lib/mail/teams-bot`) to the employee with a deep link to `/portal/my-training?cert={id}`.
- [ ] Idempotency: store `remindersSent: { [stage]: Timestamp }` on cert doc; skip stages already sent.
- [ ] Stop condition: new cert upload with later expiry → set `followUpStatus = "resolved"`, clear reminder stages, return to monitoring.
- [ ] Keep the existing Hermes management summary to Safety/admin as a daily digest.
- [ ] Update monitor UI copy (certification-tracker page) to read from `reminder-policy.ts` so text matches behavior.
- [ ] Schedule: run daily (existing `lib/modules/scheduler.ts` or Azure cron once hosted).
- [ ] Email template respects user language (Phase 4; English default now).

**Acceptance:** seeding a cert expiring in 7 days sends exactly one email to that employee; uploading a renewed cert stops further reminders; dry-run mode (`?dryRun=1`) lists recipients without sending.

### 1.3 Mission-critical scope flag
- [ ] Add `missionCritical: boolean` to `TeamMemberDoc` in `lib/schema.ts`.
- [ ] Update `scripts/import-mission-critical-directory.ts` to set the flag (match on email, then employee ID, then normalized name).
- [ ] Add `?scope=mission-critical` filter to certification tracker, hard-hat QR admin, and reminder run (default ON during pilot via `lib/feature-visibility.ts`).
- [ ] Add Firestore index if filtering with `status` (`firestore.indexes.json`).

### 1.4 Emergency contact + role-gated QR view
- [ ] Add to `TeamMemberDoc`:
  ```ts
  emergencyContacts?: { name: string; relationship: string; phone: string }[];
  photoPath?: string; // optional, Storage path
  ```
- [ ] Worker can edit own emergency contacts in `app/(portal)/portal/profile/page.tsx`.
- [ ] `app/api/public/worker/[id]/route.ts`: unchanged public payload (name, title, photo?, current certs with status).
- [ ] New `app/api/safety/worker/[id]/route.ts`: requires authenticated user with Safety role (`lib/permissions.ts`); returns emergency contacts. Log every access via `writeHardhatQrEvent(..., "emergency_contact_viewed")` (add action to `HardhatQrEventAction`).
- [ ] `app/(marketing)/worker/[id]/page.tsx`: if logged in as Safety, show "Emergency Contact" card; otherwise show "Safety personnel: sign in to view emergency info".
- [ ] Commit the outstanding hard-hat QR changes first.

**Acceptance:** anonymous scan (GC) sees certs only; Safety login sees emergency contact; access logged.

### 1.5 Asset matching by serial/tag
- [ ] Match/merge key in Asset Manager import: `serialNumber` → `assetTag` → (fallback) person.
- [ ] Asset description = device (e.g., "iPhone 15 – SN XXXX"), not person name.
- [ ] Flag assets assigned to inactive team members as "Attention".

---

## 3. Phase 2 — Academy Awareness Training

### 2.1 PPTX → course builder
- [ ] New route `app/api/ai/course-from-pptx/route.ts`:
  1. Accept PPTX upload (multipart).
  2. Parse with `parsePptxBuffer` from `lib/adams-harness/attachment-analyzer.ts`.
  3. Call Claude via the platform's standard LLM path (`lib/hermes/client.ts` `requestHermesStructured` or shared Anthropic config) with a zod schema: `{ title, summary, durationMinutes, lessons[{title, content, keyPoints[]}], quiz[{question, options[], answerIndex}] }`.
  4. Generate **EN + ES** versions in the same call or a follow-up translation call.
  5. Save as draft course via `lib/firebase-lms.ts`.
- [ ] Admin UI: "Build from PowerPoint" button in `app/(portal)/portal/admin/academy/courses/[id]/content/page.tsx`.
- [ ] Migrate `app/api/ai/course-generate/route.ts` from OpenAI/Ollama to the same Claude path (keep Ollama as optional fallback).
- [ ] Target 5–10 minute courses: ~5–8 lessons, 5-question quiz, pass ≥ 80%.

### 2.2 Completion → certificate → training record
- [ ] On quiz pass, create `lms_certificates` doc (already read in `my-training/page.tsx` ~240) **and** a `USER_TRAINING_CERTS` record with `source: "academy"`, `expirationDate = completion + 1 year` for annual courses.
- [ ] Generate certificate PDF (existing `html2pdf.js`) and store in Storage.
- [ ] Result: QR page, tracker, and reminder engine cover Academy courses automatically.

### 2.3 Assignments & progress
- [ ] `courseAssignments` collection: `{ courseId, assigneeType: "member"|"role"|"department"|"crew", assigneeId, dueDate, assignedBy }`.
- [ ] Admin dashboard: per-course enrolled / in-progress / completed / overdue.
- [ ] Assignment due dates feed the reminder engine (`lms_reminder` action already exists in the queued actions list).

### 2.4 SCORM (only if purchased)
- [ ] Evaluate `scorm-again` (SCORM 1.2/2004 runtime) hosting packages from Storage; map `cmi.completion_status` → course completion.
- [ ] Defer unless Jeff buys a SCORM library.

---

## 4. Phase 3 — Safety Request Box & Vehicle Inspections

### 3.1 Safety Request Box (`app/(portal)/portal/safety-request-box/page.tsx`)
- [ ] Collection `safetyRequests`:
  ```ts
  {
    id, jobSite, jobNumber, requesterId, requesterName,
    items: { item: string; size?: string; qty: number }[],
    urgency: "low" | "normal" | "urgent",
    checkedLocalInventory: boolean,   // "Did you check the Connex/trailer first?"
    photoPaths?: string[],
    status: "new" | "inventory_check" | "ordered" | "fulfilled" | "closed" | "rejected",
    assignedTo?: string, notes?: string,
    createdAt, updatedAt, closedAt?
  }
  ```
- [ ] Mobile-first submit form (requires `checkedLocalInventory` acknowledgement).
- [ ] Admin inbox (Jeff/Betty Jean): filter by status/site, one-click status change, activity log via `lib/activity-logger.ts`.
- [ ] Notify Safety on new request; notify requester on status change.
- [ ] Optional: build via Interview → PRD → module pipeline as a dogfood test.

### 3.2 Vehicle inspection (`app/(portal)/portal/vehicle-inspection/page.tsx`)
- [ ] Import Jeff's 5 vehicles into Asset Manager (type `vehicle`, VIN, plate, assigned driver, registration/insurance expiry).
- [ ] Inspection form (checklist + photos + odometer + signature) built with Form Builder.
- [ ] `nextInspectionDue` feeds compliance calendar + reminder engine.

---

## 5. Phase 4 — Spanish, SiteDocs, AHA/JHA

### 4.1 Per-user language
- [ ] Add `next-intl`; locale resolved from `TeamMemberDoc.preferredLanguage` (`"en" | "es"`), fallback to browser.
- [ ] Language toggle in profile.
- [ ] Translate worker-facing mobile flows first: My Training, cert upload, My Courses, Safety Request Box, QR worker page, reminder emails.
- [ ] Admin pages remain English.

### 4.2 SiteDocs downstream sync
- [ ] **Verify** whether Adams' SiteDocs plan exposes an API (worker/certification endpoints) before committing.
- [ ] If API: `lib/integrations/sitedocs.ts` — push cert status/artifact on upload; nightly reconciliation.
- [ ] If no API: scheduled CSV export in SiteDocs bulk-import format.
- [ ] Platform remains system of record.

### 4.3 AHA/JHA templates
- [ ] Template library via Form Builder with merge fields (`{{jobName}}`, `{{jobNumber}}`, `{{location}}`, `{{date}}`, `{{gc}}`).
- [ ] AI "draft from examples" using reference AHAs from `Z:\Shared\Safety Main\Mission Critical Safety` (ingest as reference, not public content).
- [ ] Export to PDF/DOCX per GC format (Skanska, etc.).

---

## 6. Deployment Prerequisites (blocking pilot users)
- [ ] Azure VM provisioned (Clay).
- [ ] DNS subdomain + TLS.
- [ ] Correct Entra/Graph email credentials (app `Jeff_AdamsPlatform`; confirm client secret **Value**, not Secret ID).
- [ ] Env vars: Firebase, Storage bucket, Anthropic key, Hermes URL/token, mail sender.
- [ ] Daily cron for certification run.
- [ ] Firestore/Storage rules deployed (`firebase deploy --only firestore:rules,storage`).

---

## 7. Compliance & Risk Notes
- **OSHA 10/30:** Official DOL cards are issued only via OSHA-authorized outreach trainers (in person) or OSHA-authorized online providers. The platform may track enrollment/attendance and store cards, but must **not** present self-authored content as OSHA 10/30.
- **Licensing:** Confirm J.J. Keller (and NFPA 70E) license terms permit converting materials into Academy courses. Do not store Jeff's J.J. Keller credentials in the platform.
- **PII:** Emergency contacts and photos — Safety-role access only, access logged; confirm policy with HR/Clay.
- **Data quality:** source lists contain ex-employees; reconcile against active roster before notifications go live (reminders to wrong people erode trust).

---

## 8. Friday Demo Script
1. Mission-critical worker logs in on phone → My Training shows expired cert.
2. Uploads a photo of renewed cert (> 700 KB) → status turns green → reminders stop.
3. GC scans hard hat → sees current certs; Safety rep scans → also sees emergency contact.
4. Admin uploads one J.J. Keller PPTX → EN/ES 10-minute course generated → assigned → completion creates a certificate on the worker's record.

---

## 9. Suggested Commit Order
1. Commit outstanding hard-hat QR work.
2. 1.1 Storage artifacts.
3. 1.2 Reminder engine + policy file.
4. 1.3 Mission-critical flag.
5. 1.4 Emergency contact + gated view.
6. 2.1 / 2.2 PPTX course builder + completion linkage.
7. 3.1 Safety Request Box.
8. Remaining phases.
