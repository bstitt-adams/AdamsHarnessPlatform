# Page Designer Repurposing Prompt

Use this prompt to adapt the AI Page Designer component for another adams-platform site.

---

## Prompt for AI Assistant

```
I need to repurpose the Page Designer feature from an existing adams-platform site for a new site. The Page Designer is a comprehensive AI-powered page editing tool. Please help me adapt it for [NEW_SITE_NAME].

## Current Page Designer Architecture

### Core Files to Copy/Adapt:
1. **Main Page Component**: `app/(portal)/portal/admin/page-designer/page.tsx` (~2000 lines)
   - Client-side React component with "use client" directive
   - Contains wizard, chat interface, templates, and UX review features

2. **Firebase Utility Library**: `lib/firebase-page-designer.ts` (~943 lines)
   - Firestore collection definitions
   - TypeScript interfaces for all data structures
   - CRUD operations for designs, templates, conversations, and reviews

3. **Feature Visibility Config**: `lib/feature-visibility.ts`
   - Add `pageDesigner` entry to SIDEBAR_FEATURES
   - Configure role-based access (currently admin/superadmin only)

4. **Sidebar Navigation**: `components/portal/portal-sidebar.tsx`
   - Add menu item under admin section

### Key Dependencies (UI Components):
- @/components/ui/card
- @/components/ui/button
- @/components/ui/badge
- @/components/ui/input
- @/components/ui/textarea
- @/components/ui/tabs
- @/components/ui/scroll-area
- @/components/ui/separator
- @/components/ui/select
- @/components/ui/collapsible
- lucide-react (icons)
- sonner (toast notifications)
- @/lib/utils (cn utility)

### Firebase Collections Required:
- `page_designs` - Stores current page designs
- `page_design_history` - Version history of designs
- `page_layout_templates` - Reusable section templates
- `page_ai_conversations` - AI chat history
- `page_ux_reviews` - UX audit results

## Customization Points

### 1. PUBLIC_PAGES Registry (MUST CUSTOMIZE)
Update the `PUBLIC_PAGES` array in `firebase-page-designer.ts` to match your site's pages:

```typescript
export const PUBLIC_PAGES: PublicPage[] = [
  {
    id: "home",
    path: "/",
    name: "Home",
    description: "Main landing page description",
    sections: [
      { id: "hero", name: "Hero Section", type: "hero", order: 1, isEditable: true },
      // Add your sections...
    ],
  },
  // Add your pages...
];
```

### 2. Page Goals (Customize for your business)
Update `PAGE_GOALS` array for your site's objectives:
- lead-gen, sales, educate, brand, recruit, engage

### 3. Audience Options (Customize for your target market)
Update `AUDIENCE_OPTIONS` array with your target demographics

### 4. Style Options (Customize brand colors)
Update `STYLE_OPTIONS` object:
- tone: professional, friendly, bold, inspiring
- colorScheme: Update brand colors (currently Amber & Slate)
- layout: modern, classic, dynamic, minimal

### 5. Section Types Available:
hero, features, testimonials, cta, pricing, team, faq, contact, gallery, stats, content, cards, timeline, comparison, video, newsletter, footer

### 6. Template Categories:
minimal, modern, classic, bold, elegant, playful, corporate, startup

## Features Included

### AI Chat Interface
- Natural language page editing
- Context-aware responses based on selected page/section
- Quick action buttons for common tasks
- Message history with applied changes tracking

### Design Wizard (7 Steps)
1. Mode - Create new or update existing
2. Goal - Define page objective
3. Audience - Select target demographics
4. Style - Visual preferences (tone, colors, layout)
5. Sections - Choose page sections (min 2)
6. Content - Key messaging (headline, subheadline, CTA)
7. Review - Confirm and generate

### Template Library
- Pre-built section templates with best practices
- Filterable by section type
- Popularity ratings
- Collapsible best practices tips

### UX Review System
- Overall score (0-100)
- Category breakdown:
  - Visual Hierarchy
  - Content Clarity
  - Brand Consistency
  - Conversion Optimization
  - Mobile Experience
  - Accessibility
- Prioritized recommendations with impact estimates
- WCAG accessibility issue detection
- Brand consistency metrics

## Implementation Steps

1. **Copy core files** to your new project
2. **Update PUBLIC_PAGES** with your site's page structure
3. **Customize branding** (colors, goals, audiences)
4. **Add to sidebar navigation** with proper feature key
5. **Configure role permissions** in feature-visibility.ts
6. **Initialize Firebase collections** (run seedDefaultTemplates if needed)
7. **Test wizard flow** with your pages
8. **Connect to actual AI API** (currently uses mock responses)

## AI Integration Points (Currently Mock)

Replace these mock implementations with real AI calls:
- `generateAIResponse()` - Chat responses
- `handleWizardGenerate()` - Design generation
- `handleUXReview()` - Page analysis

## Notes

- Component is ~2000 lines - consider splitting if needed
- All state is client-side (no server actions currently)
- Firebase operations are async with proper error handling
- Toast notifications via sonner for user feedback
- Responsive design with mobile considerations
```

---

## Quick Reference: Files to Copy

| Source File | Purpose |
|-------------|---------|
| `app/(portal)/portal/admin/page-designer/page.tsx` | Main UI component |
| `lib/firebase-page-designer.ts` | Data layer & types |
| `lib/feature-visibility.ts` | Add pageDesigner feature |
| `components/portal/portal-sidebar.tsx` | Add nav item |

## Quick Reference: What to Customize

| Item | Location | Action |
|------|----------|--------|
| Site Pages | `PUBLIC_PAGES` array | Replace with your pages |
| Brand Colors | `STYLE_OPTIONS.colorScheme` | Update color descriptions |
| Business Goals | `PAGE_GOALS` array | Customize for your business |
| Target Audience | `AUDIENCE_OPTIONS` array | Define your demographics |
| Section Templates | `DEFAULT_TEMPLATES` array | Add/modify templates |
| Role Access | `DEFAULT_ROLE_VISIBILITY` | Set who can access |

## TypeScript Interfaces Reference

```typescript
// Core page structure
interface PublicPage {
  id: string;
  path: string;
  name: string;
  description: string;
  sections: PageSection[];
}

interface PageSection {
  id: string;
  name: string;
  type: SectionType;
  order: number;
  isEditable: boolean;
}

// Design content
interface DesignContent {
  sections: SectionDesign[];
  globalStyles?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    spacing?: string;
  };
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

// Section types available
type SectionType = 
  | "hero" | "features" | "testimonials" | "cta" | "pricing"
  | "team" | "faq" | "contact" | "gallery" | "stats"
  | "content" | "cards" | "timeline" | "comparison"
  | "video" | "newsletter" | "footer";
```

---

## Example: Adapting for a Different Business

If repurposing for a **fitness coaching** site:

```typescript
// Update PAGE_GOALS
const PAGE_GOALS = [
  { id: "membership", label: "Drive Memberships", description: "Convert visitors to members", icon: Users },
  { id: "programs", label: "Sell Programs", description: "Promote training programs", icon: Dumbbell },
  { id: "community", label: "Build Community", description: "Foster member engagement", icon: Heart },
  // ...
];

// Update AUDIENCE_OPTIONS
const AUDIENCE_OPTIONS = [
  { id: "beginners", label: "Fitness Beginners", description: "New to exercise" },
  { id: "athletes", label: "Athletes", description: "Competitive sports enthusiasts" },
  { id: "seniors", label: "Active Seniors", description: "50+ fitness seekers" },
  // ...
];

// Update PUBLIC_PAGES
export const PUBLIC_PAGES: PublicPage[] = [
  {
    id: "home",
    path: "/",
    name: "Home",
    description: "Main fitness landing page",
    sections: [
      { id: "hero", name: "Hero Section", type: "hero", order: 1, isEditable: true },
      { id: "programs", name: "Training Programs", type: "cards", order: 2, isEditable: true },
      { id: "transformations", name: "Transformations", type: "testimonials", order: 3, isEditable: true },
      { id: "trainers", name: "Our Trainers", type: "team", order: 4, isEditable: true },
      { id: "cta", name: "Start Today", type: "cta", order: 5, isEditable: true },
    ],
  },
  // ...
];
```
