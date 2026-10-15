# Prompt: Repurpose Affiliate, Networking, and Deals Components

Use this prompt to guide an AI assistant in recreating the Affiliate, Networking, and Deals system on a new platform.

---

## System Overview

Build a **member networking and referral management system** with the following core capabilities:

1. **Member Onboarding** - Multi-step wizard to collect member profiles and networking preferences
2. **Networking Hub** - AI-powered partner matching, one-to-one meeting scheduling, and leaderboards
3. **Referral Tracking** - Track referrals given/received between members with pipeline status
4. **Deal Management** - Track deals/commissions from referrals with tiered commission structure
5. **Metrics Dashboard** - Engagement scores, leaderboards, and performance analytics

---

## Tech Stack Requirements

```
Framework: Next.js 14+ (App Router)
UI Library: React 18+
Styling: Tailwind CSS
Components: shadcn/ui (Card, Button, Dialog, Tabs, Table, Badge, Avatar, Progress, etc.)
Icons: Lucide React
Database: Firebase Firestore
Authentication: Firebase Auth
State Management: React Context API
Notifications: Sonner (toast)
```

---

## Database Schema

### Collections Required

```typescript
// 1. TEAM_MEMBERS - Core user/member data
interface TeamMemberDoc {
  id: string;
  firebaseUid?: string;           // Links to Firebase Auth
  firstName: string;
  lastName: string;
  emailPrimary: string;
  emailSecondary?: string;
  mobile?: string;
  expertise: string;
  title?: string;
  company?: string;
  location?: string;
  bio?: string;
  avatar?: string;
  linkedIn?: string;
  website?: string;
  role: "admin" | "team" | "affiliate" | "consultant";
  status: "active" | "inactive" | "pending";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 2. NETWORKING_PROFILES - Extended networking preferences
interface NetworkingProfileDoc {
  id: string;                     // Same as TeamMember ID
  affiliateId: string;
  
  // Expertise & Categories
  expertise: string[];            // Areas of expertise
  categories: string[];           // Business categories
  
  // Referral Preferences
  idealReferralPartner: string;   // Description of ideal partner
  topReferralSources: string;     // Where referrals come from
  
  // Goals
  goalsThisQuarter: string;
  networkingGoals: string[];
  meetingFrequency: string;       // "weekly" | "biweekly" | "monthly"
  
  // Business Info
  businessType: string;
  industry: string[];
  targetCustomers: string;
  servicesOffered: string;
  geographicFocus: string[];
  
  // Value Proposition
  uniqueValueProposition: string;
  targetClientProfile: string;
  problemsYouSolve: string;
  successStory: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 3. ONE_TO_ONE_MEETINGS - Meeting records
interface OneToOneMeetingDoc {
  id: string;
  
  // Participants
  initiatorId: string;            // Member who scheduled
  partnerId: string;              // Partner member
  
  // Scheduling
  scheduledDate: Timestamp;
  scheduledTime: string;          // "10:00 AM"
  duration: number;               // Minutes (60)
  
  // Location
  meetingType: "virtual" | "in-person";
  location?: string;
  virtualPlatform?: "zoom" | "teams" | "google-meet" | "other";
  
  // Status
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show";
  
  // Pre-meeting
  agendaItems?: string[];
  worksheetsShared: boolean;
  
  // Post-meeting outcomes
  meetingNotes?: string;
  shortTermReferralCommitment?: string;
  longTermReferralCommitment?: string;
  
  // Follow-up
  followUpDate?: Timestamp;
  followUpCompleted: boolean;
  followUpNotes?: string;
  nextMeetingScheduled: boolean;
  nextMeetingDate?: Timestamp;
  
  // AI matching data
  matchScore?: number;            // 0-100 compatibility
  matchReasons?: string[];
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 4. REFERRALS - Referral tracking
interface ReferralDoc {
  id: string;
  
  // Who gave and received
  referrerId: string;             // Member who gave referral
  recipientId: string;            // Member who received referral
  
  // Source
  oneToOneMeetingId?: string;     // If from a meeting
  
  // Referral details
  referralType: "short-term" | "long-term";
  prospectName: string;
  prospectCompany?: string;
  prospectEmail?: string;
  prospectPhone?: string;
  prospectTitle?: string;
  description: string;
  whyGoodFit?: string;
  
  // Organization referral flag (optional)
  isOrgReferral: boolean;         // Referral to the organization itself
  orgServiceInterest?: string;
  
  // Commission tracking
  commissionTier?: "referral" | "assist" | "co-sell";
  
  // Pipeline status
  status: "submitted" | "contacted" | "meeting-scheduled" | "proposal" | "negotiation" | "won" | "lost";
  
  // Outcome
  dealValue?: number;
  dealClosedDate?: Timestamp;
  lostReason?: string;
  
  // Activity
  lastContactDate?: Timestamp;
  contactAttempts: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 5. AFFILIATE_STATS - Aggregated metrics
interface AffiliateStatsDoc {
  id: string;
  affiliateId: string;
  
  // Profile completion
  profileCompletionPercent: number;
  
  // One-to-one activity
  totalOneToOnesScheduled: number;
  totalOneToOnesCompleted: number;
  oneToOnesThisMonth: number;
  oneToOnesThisQuarter: number;
  lastOneToOneDate?: Timestamp;
  
  // Referral activity
  referralsGiven: number;
  referralsReceived: number;
  referralsGivenThisMonth: number;
  referralsReceivedThisMonth: number;
  
  // Deal outcomes
  dealsClosedFromReferralsGiven: number;
  dealsClosedFromReferralsReceived: number;
  totalRevenueGenerated: number;
  totalRevenueReceived: number;
  
  // Engagement
  engagementScore: number;        // 0-100
  currentOneToOneStreak: number;
  longestOneToOneStreak: number;
  
  updatedAt: Timestamp;
}

// 6. AI_MATCH_SUGGESTIONS - AI partner recommendations
interface AiMatchSuggestionDoc {
  id: string;
  affiliateId: string;
  suggestedPartnerId: string;
  
  matchScore: number;             // 0-100
  
  reasons: {
    category: "contact-sphere" | "interests" | "skills" | "geography" | "complementary" | "rotation";
    description: string;
    weight: number;
  }[];
  
  talkingPoints: string[];
  status: "pending" | "accepted" | "declined" | "expired";
  
  lastMeetingDate?: Timestamp;
  daysSinceLastMeeting?: number;
  
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
```

---

## Components to Build

### 1. Onboarding Components

#### `affiliate-onboarding-wizard.tsx`
Multi-step form wizard collecting:
- **Step 1**: Personal profile (name, email, phone, company, title)
- **Step 2**: Business information (industry, services, target customers)
- **Step 3**: Expertise & categories (multi-select)
- **Step 4**: Networking preferences (ideal partners, goals, meeting frequency)
- **Step 5**: Value proposition (what you offer, problems you solve)

Features:
- Progress indicator
- AI-enhanced text areas (button to improve text with AI)
- Save progress to Firebase on each step
- Completion percentage tracking

#### `affiliate-onboarding-progress.tsx`
Checklist component showing:
- Required steps with completion status
- Optional/bonus steps with point values
- Visual progress bar
- Action buttons to complete pending steps

### 2. Networking Components

#### `networking-wizard.tsx`
Extended networking profile setup:
- Expertise selection
- Ideal referral partner description
- Networking goals
- Geographic focus
- AI enhancement for text fields

#### `ai-networking-recommendations.tsx`
AI-powered partner suggestions:
- Match score (0-100)
- Reasons for match
- Suggested talking points
- Accept/decline actions
- Activity alerts (new members, upcoming meetings)

#### `networking-leaderboard.tsx`
Gamified leaderboard showing:
- Top performers by referrals given
- Top by meetings completed
- Top by engagement score
- Rank badges (Crown, Medal icons)
- Current user highlight

#### `post-meeting-form.tsx`
Post-meeting summary form:
- Meeting outcome (completed, cancelled, no-show)
- Meeting notes with AI enhancement
- Referrals generated (add multiple)
- Short-term and long-term commitments
- Follow-up scheduling
- Next meeting scheduling

#### `meeting-recommendations.tsx`
Suggested partners to meet:
- Based on AI matching algorithm
- Days since last meeting
- One-click meeting request

### 3. Deals Components

#### `deals/page.tsx`
Deal tracking dashboard:
- Pipeline view with stages
- Stats cards (pipeline value, closed won, commissions)
- Filterable/searchable table
- Commission tier display
- New deal creation dialog
- Deal details dialog

Commission tiers example:
```typescript
const commissionTiers = [
  { id: "referral", name: "Referral", rate: 0.07, description: "Simple referral" },
  { id: "assist", name: "Assist", rate: 0.12, description: "Active involvement" },
  { id: "co-sell", name: "Co-Sell", rate: 0.17, description: "Full partnership" },
];
```

Deal stages:
```typescript
const dealStages = [
  { id: "referral", name: "Referral", color: "bg-blue-500" },
  { id: "qualified", name: "Qualified", color: "bg-purple-500" },
  { id: "proposal", name: "Proposal", color: "bg-yellow-500" },
  { id: "negotiation", name: "Negotiation", color: "bg-orange-500" },
  { id: "closed-won", name: "Closed Won", color: "bg-green-500" },
  { id: "closed-lost", name: "Closed Lost", color: "bg-red-500" },
];
```

### 4. Metrics Components

#### `affiliate-metrics/page.tsx`
Personal metrics dashboard:
- One-to-one meeting stats
- Referral stats (given vs received)
- Conversion rates
- Revenue generated
- Engagement score breakdown
- Comparison to network average

### 5. Referrals Components

#### `referrals/page.tsx`
Referral management:
- Tabs: All | Given | Received
- Status badges with colors
- Create new referral dialog
- Report deal outcome dialog
- Filter by status

---

## API Endpoints

```typescript
// Referrals
GET    /api/referrals?affiliateId=xxx&type=given|received
POST   /api/referrals
PATCH  /api/referrals/:id

// Affiliate Metrics
GET    /api/affiliate-metrics?affiliateId=xxx
GET    /api/affiliate-metrics?leaderboard=true

// AI Recommendations
GET    /api/ai/networking/recommendations?affiliateId=xxx
POST   /api/ai/enhance-text  // AI text enhancement

// Meetings
GET    /api/meetings?affiliateId=xxx
POST   /api/meetings
PATCH  /api/meetings/:id
```

---

## User Context Provider

Create a `UserProfileContext` that provides:

```typescript
interface UserProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  saveProfile: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  linkedTeamMember: TeamMemberDoc | null;
  
  // Wizard visibility
  showProfileWizard: boolean;
  setShowProfileWizard: (show: boolean) => void;
  showNetworkingWizard: boolean;
  setShowNetworkingWizard: (show: boolean) => void;
  
  // Helpers
  getDisplayName: () => string;
  getInitials: () => string;
}
```

---

## Authentication Guard

Protect portal routes with an `AuthGuard` component:

```typescript
interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

// Redirects to /sign-in if not authenticated
// Redirects to /portal if requireAdmin but user is not admin
```

---

## Key Features to Implement

### AI Text Enhancement
Button on text areas that sends content to AI for improvement:
- Formats as bullet points
- Adds professional headers
- Improves clarity and grammar

### Gamification
- Points for completing profile steps
- Badges for achievements
- Leaderboard rankings
- Streak tracking for consistent activity

### Real-time Updates
- Toast notifications for actions
- Loading states during API calls
- Optimistic UI updates

---

## Customization Points

When adapting for a new organization:

1. **Branding**: Update colors, logos, company name
2. **Commission Tiers**: Adjust rates and tier names
3. **Deal Stages**: Customize pipeline stages
4. **Expertise Categories**: Define industry-specific categories
5. **Meeting Types**: Add/remove virtual platforms
6. **Referral Types**: Customize short-term vs long-term definitions
7. **Engagement Score Algorithm**: Adjust weights for different activities

---

## File Structure

```
app/
├── (portal)/
│   ├── layout.tsx              # Portal layout with AuthGuard
│   └── portal/
│       ├── admin/
│       │   └── layout.tsx      # Admin role check
│       ├── deals/
│       │   └── page.tsx        # Deal tracking
│       ├── networking/
│       │   ├── page.tsx        # Networking hub
│       │   ├── leaderboard/
│       │   └── meetings/
│       ├── referrals/
│       │   └── page.tsx        # Referral management
│       └── affiliate-metrics/
│           └── page.tsx        # Personal metrics
├── api/
│   ├── referrals/
│   │   └── route.ts
│   ├── affiliate-metrics/
│   │   └── route.ts
│   └── ai/
│       ├── enhance-text/
│       └── networking/
│           └── recommendations/
└── sign-in/
    └── page.tsx

components/
└── portal/
    ├── affiliate-onboarding-wizard.tsx
    ├── affiliate-onboarding-progress.tsx
    ├── ai-networking-recommendations.tsx
    ├── auth-guard.tsx
    ├── meeting-recommendations.tsx
    ├── networking-leaderboard.tsx
    ├── networking-wizard.tsx
    ├── post-meeting-form.tsx
    └── profile-completion-wizard.tsx

contexts/
└── user-profile-context.tsx

lib/
├── firebase.ts
└── schema.ts
```

---

## Getting Started

1. Set up Next.js project with TypeScript
2. Install dependencies: `shadcn/ui`, `lucide-react`, `firebase`, `sonner`
3. Configure Firebase project and Firestore
4. Create database collections per schema above
5. Implement UserProfileContext
6. Build components in order: Auth → Onboarding → Networking → Referrals → Deals
7. Add API routes for data operations
8. Implement AI enhancement endpoints (OpenAI/Claude integration)

---

## Example Prompt for AI Assistant

> "Build a member networking platform with the following features:
> 
> 1. Member onboarding wizard that collects profile info, business details, and networking preferences
> 2. AI-powered partner matching that suggests compatible members to meet with
> 3. One-to-one meeting scheduling and post-meeting summary forms
> 4. Referral tracking between members with pipeline stages
> 5. Deal/commission tracking with tiered commission rates
> 6. Leaderboard and engagement scoring for gamification
> 7. Personal metrics dashboard showing activity and performance
> 
> Use Next.js 14 App Router, Tailwind CSS, shadcn/ui components, and Firebase Firestore.
> Implement authentication with Firebase Auth and protect routes with an AuthGuard component.
> Include AI text enhancement features using OpenAI API."

