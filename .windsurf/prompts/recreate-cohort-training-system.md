# Prompt: Recreate LMS Academy System as Cohort Training Platform

## Overview
Create a complete Cohort Training Platform that rebrands the LMS Academy System for cohort-based learning. Instead of "Courses," the system uses "Cohorts" to represent group-based training programs. This system stores all data in Firebase Firestore and follows the same architecture as the existing adams-platform Academy implementation.

## Key Terminology Changes
- **Course** → **Cohort**
- **Enrollment** → **Cohort Membership**
- **Course Module** → **Cohort Module** (or Training Module)
- **Lesson** → **Session** (or Training Session)
- **Workshop** → **Live Training** (or Group Session)
- **Learning Path** → **Training Track**
- **Certificate** → **Completion Certificate**
- **Instructor** → **Facilitator** (or Coach)

## Prerequisites
- Next.js application with App Router
- Firebase/Firestore configured
- TypeScript
- shadcn/ui components installed
- Lucide React icons
- Sonner for toast notifications
- Stripe integration (optional, for paid cohorts)

---

## Step 1: Create Firebase Collections Library

Create `lib/firebase-cohorts.ts` with the following structure:

### Collection Names
```typescript
export const COHORT_COLLECTIONS = {
  COHORTS: "cohorts",
  COHORT_MODULES: "cohort_modules",
  SESSIONS: "cohort_sessions",
  MEMBERSHIPS: "cohort_memberships",
  SESSION_PROGRESS: "cohort_session_progress",
  LIVE_TRAININGS: "cohort_live_trainings",
  TRAINING_REGISTRATIONS: "cohort_training_registrations",
  CERTIFICATES: "cohort_certificates",
  CATEGORIES: "cohort_categories",
  COHORT_PURCHASES: "cohort_purchases",
  TRAINING_TRACKS: "cohort_training_tracks",
  USER_BADGES: "cohort_user_badges",
  USER_POINTS: "cohort_user_points",
  BADGES: "cohort_badges",
} as const;
```

### Core Document Types

Reference the existing `lib/firebase-lms.ts` structure but rename:
- `CourseDoc` → `CohortDoc`
- `CourseModuleDoc` → `CohortModuleDoc`
- `LessonDoc` → `SessionDoc`
- `EnrollmentDoc` → `MembershipDoc`
- `LessonProgressDoc` → `SessionProgressDoc`
- `WorkshopDoc` → `LiveTrainingDoc`

### Additional Fields for CohortDoc
```typescript
cohortStartDate: Timestamp | null;
cohortEndDate: Timestamp | null;
maxParticipants: number | null;
currentParticipants: number;
estimatedDurationWeeks: number | null; // Instead of minutes
facilitatorName: string; // Instead of instructorName
```

### Additional Fields for CohortModuleDoc
```typescript
weekNumber: number; // Which week of the cohort
```

### Additional Fields for SessionDoc
```typescript
scheduledDate: Timestamp | null; // When this session is scheduled
```

### Additional Fields for MembershipDoc
```typescript
cohortRole: "participant" | "facilitator" | "observer";
```

---

## Step 2: Implement Core Functions

Based on `lib/firebase-lms.ts`, implement these functions in `lib/firebase-cohorts.ts`:

### Cohort Operations
1. `createCohort(data)` - Create new cohort
2. `getCohort(cohortId)` - Get cohort by ID
3. `getCohortBySlug(slug)` - Get cohort by slug
4. `getCohorts(options)` - List cohorts with filters
5. `updateCohort(cohortId, updates)` - Update cohort
6. `publishCohort(cohortId)` - Publish cohort
7. `deleteCohort(cohortId)` - Delete cohort
8. `getCohortWithModulesAndSessions(cohortId)` - Get full structure

### Module & Session Operations
1. `createModule(data)` - Create cohort module
2. `getModules(cohortId)` - Get modules for cohort
3. `updateModule(moduleId, updates)` - Update module
4. `deleteModule(moduleId)` - Delete module and sessions
5. `reorderModules(cohortId, moduleIds)` - Reorder modules
6. `createSession(data)` - Create training session
7. `getSessions(moduleId)` - Get sessions for module
8. `getCohortSessions(cohortId)` - Get all sessions
9. `updateSession(sessionId, updates)` - Update session
10. `deleteSession(sessionId)` - Delete session
11. `reorderSessions(moduleId, sessionIds)` - Reorder sessions

### Membership & Progress
1. `joinCohort(userId, cohortId)` - Join cohort
2. `getMembership(userId, cohortId)` - Get membership
3. `getUserMemberships(userId)` - Get user memberships
4. `updateSessionProgress(data)` - Track progress
5. `updateMembershipProgress(membershipId, cohortId)` - Calculate progress

### Live Training Operations
1. `createLiveTraining(data)` - Create live training
2. `getLiveTrainings(options)` - List live trainings
3. `updateLiveTraining(liveTrainingId, updates)` - Update
4. `deleteLiveTraining(liveTrainingId)` - Delete
5. `registerForLiveTraining(userId, liveTrainingId)` - Register

### Certificate & Gamification
1. `issueCertificate(data)` - Issue certificate
2. `getUserCertificates(userId)` - Get certificates
3. `verifyCertificate(certificateNumber)` - Verify
4. `awardPoints(userId, points, reason)` - Award points
5. `getUserPoints(userId)` - Get points
6. `awardBadge(userId, badgeId)` - Award badge
7. `getUserBadges(userId)` - Get badges

### Stats & Purchases
1. `getCohortStats()` - Platform statistics
2. `getUserPurchases(userId)` - User purchases
3. `hasUserPurchasedCohort(userId, cohortId)` - Check purchase
4. `getPurchaseStats()` - Revenue stats

---

## Step 3: Create TypeScript Types

Create `types/cohorts.ts` with types similar to `types/academy.ts`:

```typescript
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type ContentType = 'video' | 'text' | 'quiz' | 'assignment' | 'download' | 'live';
export type TrainingType = 'live' | 'recorded' | 'hybrid';
export type CohortRole = 'participant' | 'facilitator' | 'observer';

export interface Cohort {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  facilitatorName: string;
  cohortStartDate: string | null;
  cohortEndDate: string | null;
  maxParticipants: number | null;
  currentParticipants: number;
  estimatedDurationWeeks: number | null;
  membershipCount: number;
  // ... other fields
}

export interface CohortModule {
  id: string;
  cohortId: string;
  title: string;
  weekNumber: number;
  sortOrder: number;
  sessions?: TrainingSession[];
}

export interface TrainingSession {
  id: string;
  moduleId: string;
  cohortId: string;
  title: string;
  contentType: ContentType;
  scheduledDate: string | null;
  // ... other fields
}

export interface CohortMembership {
  id: string;
  userId: string;
  cohortId: string;
  cohortRole: CohortRole;
  progressPercentage: number;
  // ... other fields
}
```

---

## Step 4: Create Admin Pages

### Main Dashboard
`app/(portal)/portal/admin/cohorts/page.tsx`

Based on `app/(portal)/portal/admin/academy/page.tsx`:
- Stats cards: Total Cohorts, Total Sessions, Live Trainings, Memberships, Certificates
- Tabs: Cohorts, Live Trainings, Categories, Certificates, Gamification
- Cohort grid with cards showing thumbnail, status, participant count
- Actions: Edit, Manage Content, Preview, Delete
- Mock data toggle for testing

### Cohort Editor
`app/(portal)/portal/admin/cohorts/[id]/edit/page.tsx`

Form fields:
- Title, slug, description
- Facilitator info (name, bio, image)
- Cohort dates (start/end)
- Max participants
- Duration in weeks
- Difficulty level
- Pricing (priceInCents, compareAtPriceInCents, isFree)
- Tags, learning outcomes, prerequisites
- Thumbnail upload
- Publish toggle

### Content Manager
`app/(portal)/portal/admin/cohorts/[id]/content/page.tsx`

Based on Academy content manager:
- List modules with week numbers
- Drag-and-drop reordering
- Add/edit/delete modules
- Expand module to show sessions
- Add/edit/delete sessions
- Session editor with content type selector
- Schedule sessions with dates

### Purchases Page
`app/(portal)/portal/admin/cohorts/purchases/page.tsx`

- List all cohort purchases
- Filter by status
- Revenue statistics
- Export functionality

---

## Step 5: Create Student Pages

### Cohort Catalog
`app/cohorts/page.tsx`

- Grid of published cohorts
- Filter by category, difficulty, price
- Search functionality
- Featured cohorts section
- Show cohort dates and availability
- Join/Purchase buttons

### Cohort Detail
`app/cohorts/[slug]/page.tsx`

- Cohort overview
- Facilitator card
- Cohort timeline (start/end dates)
- Module/session outline
- Learning outcomes
- Prerequisites
- Participant count and spots remaining
- Join/Purchase button
- Preview sessions

### My Cohorts
`app/(portal)/portal/my-cohorts/page.tsx`

- List user's cohort memberships
- Progress indicators
- Continue learning buttons
- Upcoming sessions
- Completed cohorts with certificates
- Filter by active/completed

### Learning Interface
`app/(portal)/portal/cohorts/[cohortId]/learn/page.tsx`

- Sidebar with module/session navigation
- Current session content viewer
- Progress tracking
- Mark session complete
- Session notes
- Next session button

---

## Step 6: Create Components

### Admin Components
- `components/admin/cohort-form.tsx` - Cohort create/edit form
- `components/admin/module-manager.tsx` - Module management
- `components/admin/session-editor.tsx` - Session editor

### Student Components
- `components/cohorts/cohort-card.tsx` - Cohort display card
- `components/cohorts/cohort-progress.tsx` - Progress indicator
- `components/cohorts/session-viewer.tsx` - Session content viewer
- `components/cohorts/facilitator-card.tsx` - Facilitator info

---

## Step 7: Add to Feature Visibility

In `lib/feature-visibility.ts`:
```typescript
cohortAdmin: { 
  label: "Cohort Admin", 
  section: "admin", 
  href: "/portal/admin/cohorts" 
},
```

---

## Step 8: Add to Sidebar

In `components/portal/portal-sidebar.tsx`:
```typescript
{
  title: "Cohort Admin",
  href: "/portal/admin/cohorts",
  icon: Users,
  featureKey: "cohortAdmin",
},
```

---

## Step 9: Stripe Integration

### Checkout Route
`app/api/stripe/cohort-checkout/route.ts`

Based on `app/api/stripe/course-checkout/route.ts`:
- Create checkout session for cohort purchase
- Handle free cohorts (auto-create membership)
- Store pending purchase records

### Webhook
Update `app/api/stripe/webhook/route.ts`:
- Handle cohort purchase completion
- Create membership on payment
- Increment participant count

---

## Step 10: Firestore Security Rules

```javascript
match /cohorts/{cohortId} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}

match /cohort_memberships/{membershipId} {
  allow read: if request.auth != null && 
    (resource.data.userId == request.auth.uid || isAdmin());
  allow create: if request.auth != null;
  allow update: if request.auth != null && resource.data.userId == request.auth.uid;
}

match /cohort_session_progress/{progressId} {
  allow read: if request.auth != null && 
    (resource.data.userId == request.auth.uid || isAdmin());
  allow write: if request.auth != null && request.resource.data.userId == request.auth.uid;
}

function isAdmin() {
  return request.auth != null && 
    get(/databases/$(database)/documents/team_members/$(request.auth.uid)).data.role in ['admin', 'superadmin'];
}
```

---

## Key Differences from Course-Based LMS

1. **Time-Bound**: Cohorts have start/end dates
2. **Participant Limits**: Max participants per cohort
3. **Scheduled Sessions**: Sessions scheduled for specific dates
4. **Week-Based**: Modules organized by week number
5. **Roles**: Participants, facilitators, observers
6. **Community Focus**: Group learning emphasis
7. **Availability**: Show spots remaining
8. **Timeline**: Display cohort schedule prominently

---

## Testing Checklist

- [ ] Create cohort with dates and participant limit
- [ ] Add modules with week numbers
- [ ] Add sessions with scheduled dates
- [ ] Publish cohort
- [ ] Join free cohort
- [ ] Purchase paid cohort
- [ ] Track session progress
- [ ] Complete cohort and receive certificate
- [ ] Create live training
- [ ] Register for live training
- [ ] View cohort catalog with filters
- [ ] View my cohorts dashboard
- [ ] Admin: manage content
- [ ] Admin: view purchases

---

## File Structure

```
lib/
  firebase-cohorts.ts
types/
  cohorts.ts
app/
  cohorts/
    page.tsx
    [slug]/page.tsx
  (portal)/portal/
    admin/cohorts/
      page.tsx
      [id]/edit/page.tsx
      [id]/content/page.tsx
      purchases/page.tsx
    my-cohorts/page.tsx
    cohorts/[cohortId]/learn/page.tsx
  api/stripe/
    cohort-checkout/route.ts
    webhook/route.ts
components/
  admin/
    cohort-form.tsx
    module-manager.tsx
    session-editor.tsx
  cohorts/
    cohort-card.tsx
    cohort-progress.tsx
    session-viewer.tsx
    facilitator-card.tsx
```

---

## Dependencies

```bash
npm install firebase stripe sonner lucide-react next date-fns
```

---

## Branding Guide

Replace all instances:
- "Course" → "Cohort"
- "Lesson" → "Session"
- "Instructor" → "Facilitator"
- "Enrollment" → "Membership"
- "Workshop" → "Live Training"
- "Learning Path" → "Training Track"
- "Academy" → "Training Platform" (or your brand name)

Update all UI text, labels, and documentation accordingly.
