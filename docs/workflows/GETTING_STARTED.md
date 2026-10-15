# Getting Started Guide

A comprehensive onboarding guide for new users and administrators of the Adams Electric Platform.

---

## Table of Contents
- [Initial Setup](#initial-setup)
- [First-Time Configuration](#first-time-configuration)
- [Quick Start Tutorials](#quick-start-tutorials)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Getting Help](#getting-help)

---

## Initial Setup

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 18.x | 20.x or later |
| npm | 9.x | 10.x or later |
| Browser | Chrome 90+, Firefox 90+, Safari 14+ | Latest version |
| Screen | 1280x720 | 1920x1080 |

### Installation

#### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/adams-platform.git
cd adams-platform
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Configure Environment
```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your values
notepad .env.local  # Windows
# or
nano .env.local     # Mac/Linux
```

#### Step 4: Required Environment Variables

```env
# Firebase (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI (Required for AI features)
OPENAI_API_KEY=sk-...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Step 5: Start Development Server
```bash
npm run dev
```

#### Step 6: Access Application
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## First-Time Configuration

### Step 1: Access Admin Portal

1. Navigate to `/portal`
2. Log in with admin credentials
3. You'll see the Command Center dashboard

### Step 2: Configure Integrations

#### OpenAI Setup
1. Go to **Settings** (gear icon in sidebar)
2. Find **Integrations** section
3. Enter your **OpenAI API Key**
4. Click **Test Connection**
5. Click **Save**

#### Stripe Setup
1. In **Settings → Integrations**
2. Enter **Stripe Secret Key**
3. Enter **Stripe Publishable Key**
4. Enter **Stripe Webhook Secret**
5. Click **Test Connection**
6. Click **Save**

### Step 3: Set Up Hero Carousel

1. Go to **Admin → Hero Management**
2. Click **+ Add Slide**
3. Create your first hero slide:
   - Enter headline
   - Add subheadline
   - Configure CTA buttons
   - Toggle **Published** ON
4. Click **Create Slide**

### Step 4: Create Your First Course

1. Go to **Admin → Academy**
2. Click **+ Add Course**
3. Fill in course details:
   - Title
   - Description
   - Instructor name
   - Difficulty level
4. Click **Create Course**
5. Click **Manage Content** to add modules and lessons

### Step 5: Configure Availability (Optional)

1. Go to **Availability** in sidebar
2. Set your weekly schedule
3. Create meeting types
4. Share your booking link

---

## Quick Start Tutorials

### Tutorial 1: Create and Publish a Course (15 minutes)

**Goal:** Create a complete course with AI-generated content

#### Part A: Create Course Shell
1. **Admin → Academy → + Add Course**
2. Enter: Title, Description, Instructor Name
3. Set Difficulty: Beginner
4. Click **Create Course**

#### Part B: Generate Syllabus with AI
1. Click **Manage Content**
2. Click **Generate Syllabus** in AI toolbar
3. Enter topic and target audience
4. Set 4 modules
5. Click **Generate**
6. Review and click **Apply Syllabus**

#### Part C: Add Content to Lessons
1. Click on first module to expand
2. Click first lesson → **Edit**
3. Click **Generate with AI** button
4. Review generated content
5. Click **Apply Content**
6. Save lesson
7. Repeat for other lessons

#### Part D: Publish Course
1. Go back to Academy dashboard
2. Click **Edit Course**
3. Toggle **Published** ON
4. Save changes

#### Part E: Verify
1. Open `/academy/courses` in new tab
2. See your course in the catalog
3. Click to view course details

---

### Tutorial 2: Set Up Paid Course with Stripe (10 minutes)

**Goal:** Configure a course for paid enrollment

#### Prerequisites
- Stripe account configured
- Course already created

#### Steps
1. **Admin → Academy**
2. Find your course → **Edit Course**
3. Toggle **Free Course** OFF
4. Enter **Price**: 99.00
5. Enter **Compare At Price**: 149.00 (optional)
6. Click **Save Changes**
7. System creates Stripe product automatically

#### Test Purchase
1. Open `/academy/courses` in incognito window
2. Add course to cart
3. Proceed to checkout
4. Use test card: `4242 4242 4242 4242`
5. Complete purchase
6. Verify enrollment created

---

### Tutorial 3: Create AI-Generated Quiz (5 minutes)

**Goal:** Generate a quiz for your course

#### Steps
1. Open course **Content Builder**
2. Click **Generate Quiz** in AI toolbar
3. Configure:
   - Topic: Your course topic
   - Questions: 10
   - Types: Mixed
   - Difficulty: Mixed
4. Click **Generate Quiz**
5. Review questions
6. Click **Apply Quiz**
7. Create a Quiz-type lesson
8. Paste quiz content
9. Save lesson

---

### Tutorial 4: Set Up Booking System (10 minutes)

**Goal:** Allow others to book meetings with you

#### Part A: Set Weekly Schedule
1. Go to **Availability**
2. Click **Edit Schedule**
3. For each workday:
   - Toggle **Available** ON
   - Set Start: 9:00 AM
   - Set End: 5:00 PM
   - Add lunch break: 12:00 - 1:00 PM
4. Save schedule

#### Part B: Create Meeting Type
1. Click **+ Add Meeting Type**
2. Enter:
   - Name: "30-Minute Consultation"
   - Duration: 30 minutes
   - Buffer Before: 15 minutes
   - Buffer After: 15 minutes
3. Add video meeting link
4. Save meeting type

#### Part C: Share Booking Link
1. Copy your booking URL
2. Test by opening in incognito
3. Select a time slot
4. Complete test booking

---

## Common Tasks

### Daily Tasks

| Task | Steps |
|------|-------|
| Check new bookings | Availability → Bookings → Filter: Today |
| Review purchases | Admin → Academy → Purchases |
| Check meetings | Meetings → Calendar view |

### Weekly Tasks

| Task | Steps |
|------|-------|
| Update hero slides | Admin → Hero → Edit/Add slides |
| Review course analytics | Admin → Academy → Course stats |
| Create backup | Admin → Backups → Create Backup |

### Monthly Tasks

| Task | Steps |
|------|-------|
| Export purchase data | Purchases → Export CSV |
| Review and update availability | Availability → Date Overrides |
| Update course content | Academy → Manage Content |

---

## Troubleshooting

### Common Issues and Solutions

#### "API key not configured"
**Cause:** Missing or invalid API key
**Solution:**
1. Go to Settings → Integrations
2. Enter valid API key
3. Click Test Connection
4. Save settings

#### "Course not appearing in catalog"
**Cause:** Course not published
**Solution:**
1. Edit the course
2. Toggle Published ON
3. Save changes

#### "Stripe checkout failing"
**Cause:** Invalid Stripe configuration
**Solution:**
1. Verify all 3 Stripe keys are entered
2. Check webhook URL is correct
3. Ensure webhook events are selected
4. Test connection in Settings

#### "AI generation not working"
**Cause:** OpenAI API issue
**Solution:**
1. Check API key is valid
2. Verify account has credits
3. Check rate limits
4. Try again in a few minutes

#### "Booking times not showing"
**Cause:** Availability not configured
**Solution:**
1. Go to Availability
2. Set weekly schedule
3. Create at least one meeting type
4. Check for date overrides blocking times

#### "Video not playing in lesson"
**Cause:** Invalid or inaccessible URL
**Solution:**
1. Verify URL is correct
2. Check video is public/unlisted (not private)
3. Test URL directly in browser
4. Try different video platform

### Error Messages

| Error | Meaning | Action |
|-------|---------|--------|
| "Network error" | Connection issue | Check internet, retry |
| "Unauthorized" | Session expired | Log in again |
| "Not found" | Resource deleted | Refresh page |
| "Rate limited" | Too many requests | Wait and retry |
| "Validation error" | Invalid input | Check form fields |

---

## Getting Help

### Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| Features Overview | `/docs/FEATURES.md` | All platform features |
| Academy Workflows | `/docs/workflows/ACADEMY_WORKFLOWS.md` | Course management |
| AI Workflows | `/docs/workflows/AI_CONTENT_WORKFLOWS.md` | AI content generation |
| Admin Workflows | `/docs/workflows/ADMIN_WORKFLOWS.md` | Administrative tasks |
| Meetings Workflows | `/docs/workflows/MEETINGS_AVAILABILITY_WORKFLOWS.md` | Scheduling |

### Support Channels

| Channel | Use For | Response Time |
|---------|---------|---------------|
| Documentation | Self-service help | Immediate |
| Email Support | Complex issues | 24-48 hours |
| GitHub Issues | Bug reports | 1-5 days |

### Reporting Bugs

When reporting issues, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser and version
5. Screenshots if applicable
6. Console errors (F12 → Console)

### Feature Requests

Submit feature requests via:
1. GitHub Issues with "enhancement" label
2. Email to development team
3. Feedback form in Settings

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Ctrl/Cmd + /` | Show shortcuts |
| `Esc` | Close dialog/modal |

### Form Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save form |
| `Ctrl/Cmd + Enter` | Submit form |
| `Tab` | Next field |
| `Shift + Tab` | Previous field |

### Navigation

| Shortcut | Action |
|----------|--------|
| `G then H` | Go to Home |
| `G then C` | Go to Command Center |
| `G then M` | Go to Meetings |
| `G then A` | Go to Academy Admin |

---

## Next Steps

After completing initial setup:

1. **Explore the Portal**
   - Visit each section in the sidebar
   - Familiarize yourself with the interface

2. **Create Test Content**
   - Make a test course
   - Try AI generation features
   - Test the checkout flow

3. **Configure for Production**
   - Switch to live Stripe keys
   - Set up proper availability
   - Create real hero slides

4. **Invite Team Members**
   - Add other administrators
   - Set appropriate permissions

5. **Launch**
   - Publish courses
   - Share booking links
   - Promote your academy
