# Adams Platform

A modern **Next.js 16** application serving as both a **marketing website** and an **operations platform** for Adams Electric.

## Overview

Adams Electric is a third-generation, family-owned electrical contractor founded in 1928, serving the Southeast with PreConstruction, Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication, Construction, and Post Construction services.

This platform unifies:
- **Marketing Website** - Lead capture, service showcase, event promotion
- **Business Portal** - Command center, pipeline management, team coordination
- **Academy/LMS** - Course management with AI-powered content creation
- **Event Management** - Ticketing with Stripe payment integration
- **AI Intelligence** - Natural language queries and content generation

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Payments:** Stripe
- **UI Components:** shadcn/ui
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **AI:** OpenAI GPT-4o (with Ollama fallback)

## Getting Started

### Prerequisites

- Node.js 20.16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
adams-platform/
├── app/
│   ├── (marketing)/          # Public marketing pages
│   │   ├── page.tsx          # Homepage with Hero Carousel
│   │   ├── about/
│   │   ├── contact/
│   │   ├── academy/          # LMS public pages
│   │   │   ├── cart/         # Shopping cart
│   │   │   ├── courses/      # Course catalog
│   │   │   └── checkout/     # Stripe checkout
│   │   ├── events/           # Event listings & ticketing
│   │   └── ...
│   ├── (portal)/             # Authenticated portal
│   │   └── portal/
│   │       ├── command-center/
│   │       ├── opportunities/
│   │       ├── admin/
│   │       │   ├── academy/  # Course management
│   │       │   ├── hero/     # Hero carousel management
│   │       │   └── backups/  # System backups
│   │       ├── meetings/     # Meeting management
│   │       ├── availability/ # Calendly-style booking
│   │       └── settings/     # Platform settings
│   ├── api/
│   │   ├── ai/               # AI endpoints
│   │   ├── stripe/           # Payment webhooks
│   │   └── admin/            # Admin APIs
│   └── globals.css
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── marketing/            # Marketing components
│   ├── portal/               # Portal components
│   ├── academy/              # LMS components
│   └── shared/               # Shared components
├── lib/
│   ├── firebase.ts           # Firebase config
│   ├── firebase-lms.ts       # LMS CRUD operations
│   ├── stripe.ts             # Stripe integration
│   ├── ai-course-generator.ts # AI content generation
│   └── schema.ts             # Firestore schemas
├── types/                    # TypeScript types
└── public/                   # Static assets
```

## Key Features

### Marketing Website
- **Homepage** with dynamic Hero Carousel (admin-managed)
- **Service Pages** for PreConstruction, Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication, Construction, and Post Construction
- **Contact Form** with lead capture
- **About Page** with team and mission
- **Events** with Stripe ticketing integration

### Academy / LMS
- **Course Catalog** - Browse and purchase courses
- **Shopping Cart** - Multi-course checkout with Stripe
- **AI Content Builder** - Generate syllabi, lessons, quizzes, exams
- **Video Embedding** - YouTube, Vimeo, Loom support
- **Course Modules** - Organize content into sections
- **Multiple Content Types** - Video, text, quiz, assignment, downloads

### Business Portal
- **Command Center** - Real-time dashboard with pipeline, projects, rocks
- **Opportunities** - Sales pipeline management
- **Projects** - Active engagement tracking
- **Affiliates** - Network capability directory
- **Customers** - CRM functionality
- **Meetings** - Full CRUD with calendar integration
- **Availability** - Calendly-style booking system
- **Documents** - File management and sharing
- **Ask Adams** - AI-powered business queries

### Admin Features
- **Hero Management** - CRUD for homepage carousel slides
- **Academy Admin** - Course, module, lesson management
- **Purchase Dashboard** - Revenue tracking and purchase history
- **Backup System** - Scheduled backups with Google Drive integration
- **Settings** - API keys, integrations, feature visibility

## Environment Variables

Create a `.env.local` file with:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Stripe
STRIPE_SECRET_KEY="sk_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# AI (OpenAI)
OPENAI_API_KEY="sk-..."

# Optional: Ollama (local AI)
USE_OLLAMA="false"
OLLAMA_URL="http://localhost:11434"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Deployment

Deploy to Vercel:

```bash
npx vercel
```

Or use the Vercel Dashboard for automatic deployments from GitHub.

## AI Features

### Course Content Generation
The platform includes AI-powered tools for rapid course creation:

- **Syllabus Generator** - Generate complete course outlines with modules and lessons
- **Lesson Content Generator** - Create video scripts, articles, and assignments
- **Quiz Generator** - Generate multiple choice and true/false questions
- **Exam Generator** - Create comprehensive exams covering all modules
- **Content Enhancement** - Improve existing descriptions and content

Access AI tools in: `Portal → Admin → Academy → [Course] → Manage Content`

## Stripe Integration

### Event Ticketing
- Create events with multiple ticket types
- Process payments via Stripe Checkout
- Webhook handling for payment confirmation
- Refund support

### Course Purchases
- Shopping cart with localStorage persistence
- Multi-course checkout
- Free course enrollment
- Purchase history tracking

Configure Stripe in: `Portal → Settings → Integrations → Stripe`

## Firebase Collections

| Collection | Description |
|------------|-------------|
| `lms_courses` | Course definitions with pricing |
| `lms_course_modules` | Course sections/modules |
| `lms_lessons` | Individual lessons |
| `lms_course_purchases` | Purchase records |
| `lms_enrollments` | User enrollments |
| `calendar_events` | Meetings and events |
| `bookings` | Availability bookings |
| `hero_slides` | Homepage carousel slides |
| `platform_settings` | Global settings |

## Roadmap

### Completed ✅
- [x] Marketing website with Hero Carousel
- [x] Portal layout and navigation
- [x] Command Center dashboard
- [x] Core portal pages (opportunities, projects, affiliates, etc.)
- [x] Firebase Firestore integration
- [x] Meetings CRUD with calendar
- [x] Availability/Booking system (Calendly-style)
- [x] Hero Carousel management
- [x] Academy/LMS with course management
- [x] AI-powered content builder
- [x] Stripe payment integration (events & courses)
- [x] Shopping cart for courses
- [x] Purchase history and revenue dashboard

### In Progress 🚧
- [ ] User authentication flow
- [ ] Course progress tracking
- [ ] Certificate generation
- [ ] Email notifications

### Future 📋
- [ ] Go High Level CRM integration
- [ ] Mattermost team notifications
- [ ] Affiliate matching engine
- [ ] Mobile app

## License

Proprietary - Adams Electric

## Contact

- Website: [adams-electric.com](https://adams-electric.com)
