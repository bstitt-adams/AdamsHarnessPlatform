# AI Page Designer - Complete Recreation Prompt

Use this comprehensive prompt to recreate the AI Page Designer feature in another adams-platform site.

---

## 🎯 Prompt for AI Assistant

```
I need to recreate the AI Page Designer feature from the Adams Electric adams-platform site in a new adams-platform project. This is a comprehensive AI-powered page editing tool with wizard, chat interface, templates, and UX review capabilities.

## 📋 Overview

The AI Page Designer is a sophisticated admin tool that allows:
- AI-powered conversational page editing
- Guided wizard for creating/updating page designs
- Template library with best practices
- Automated UX reviews with accessibility checks
- Design history and version tracking
- Firebase-backed persistence

## 🏗️ Architecture

### Core Files (4 files to create/modify)

1. **Main Page Component** (~2000 lines)
   - Path: `app/(portal)/portal/admin/page-designer/page.tsx`
   - Type: Client-side React component ("use client")
   - Features: Wizard, AI Chat, Templates, UX Review

2. **Firebase Utility Library** (~943 lines)
   - Path: `lib/firebase-page-designer.ts`
   - Contains: TypeScript interfaces, Firestore operations, data structures
   - Collections: page_designs, page_design_history, page_layout_templates, page_ai_conversations, page_ux_reviews

3. **Feature Visibility Configuration**
   - Path: `lib/feature-visibility.ts`
   - Action: Add `pageDesigner` to SIDEBAR_FEATURES
   - Access: Admin/Superadmin roles only

4. **Sidebar Navigation**
   - Path: `components/portal/portal-sidebar.tsx`
   - Action: Add menu item under admin section with Paintbrush icon

## 📦 Dependencies Required

### UI Components (shadcn/ui)
```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
```

### Icons (lucide-react)
```typescript
import {
  Wand2, Send, Loader2, Layout, Palette, Eye, History, Sparkles,
  CheckCircle, AlertTriangle, AlertCircle, Info, ChevronDown,
  ChevronRight, ChevronLeft, ExternalLink, RefreshCw, Lightbulb,
  Target, Zap, Shield, Accessibility, Paintbrush, Type,
  Image as ImageIcon, MessageSquare, LayoutTemplate, Star,
  TrendingUp, Clock, User, Bot, Copy, Check, Users, Megaphone,
  ShoppingCart, BookOpen, Heart, Briefcase, ArrowRight, Plus,
  Minus, GripVertical, X
} from "lucide-react"
```

### Other Dependencies
- `sonner` - Toast notifications
- `@/lib/utils` - cn() utility for className merging
- `firebase/firestore` - Database operations

## 🔥 Firebase Collections Structure

### 1. page_designs
Stores current published/draft designs for each page.

```typescript
interface PageDesignDoc {
  id: string;
  pageId: string;
  pagePath: string;
  pageName: string;
  currentDesign: DesignContent;
  isPublished: boolean;
  publishedAt: Timestamp | null;
  lastModifiedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2. page_design_history
Version control for all design changes.

```typescript
interface DesignHistoryDoc {
  id: string;
  pageId: string;
  designSnapshot: DesignContent;
  changeDescription: string;
  changedBy: string;
  aiPrompt?: string;
  createdAt: Timestamp;
}
```

### 3. page_layout_templates
Reusable section templates with best practices.

```typescript
interface LayoutTemplateDoc {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory; // minimal, modern, classic, bold, elegant, playful, corporate, startup
  sectionType: SectionType;
  thumbnail?: string;
  previewHtml?: string;
  structure: TemplateStructure;
  bestPractices: string[];
  tags: string[];
  popularity: number;
  isActive: boolean;
  createdAt: Timestamp;
}
```

### 4. page_ai_conversations
Chat history for each page editing session.

```typescript
interface AIConversationDoc {
  id: string;
  pageId: string;
  messages: AIMessage[];
  status: "active" | "completed" | "archived";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 5. page_ux_reviews
UX audit results with recommendations.

```typescript
interface UXReviewDoc {
  id: string;
  pageId: string;
  pagePath: string;
  reviewDate: Timestamp;
  overallScore: number;
  categories: UXReviewCategory[];
  recommendations: UXRecommendation[];
  brandConsistency: BrandConsistencyCheck;
  accessibilityIssues: AccessibilityIssue[];
  status: "pending" | "reviewed" | "implemented" | "dismissed";
  reviewedBy: string;
  createdAt: Timestamp;
}
```

## 🎨 Customization Points (CRITICAL)

### 1. PUBLIC_PAGES Registry (MUST CUSTOMIZE)

**Location:** `lib/firebase-page-designer.ts`

This is the most important customization. Replace with your site's actual pages:

```typescript
export const PUBLIC_PAGES: PublicPage[] = [
  {
    id: "home",
    path: "/",
    name: "Home",
    description: "Main landing page with hero, services overview, and CTAs",
    sections: [
      { id: "hero", name: "Hero Section", type: "hero", order: 1, isEditable: true },
      { id: "services", name: "Services Overview", type: "features", order: 2, isEditable: true },
      { id: "testimonials", name: "Testimonials", type: "testimonials", order: 3, isEditable: true },
      { id: "cta", name: "Call to Action", type: "cta", order: 4, isEditable: true },
    ],
  },
  // Add all your public pages here
];
```

**Available Section Types:**
- hero, features, testimonials, cta, pricing, team, faq, contact
- gallery, stats, content, cards, timeline, comparison, video, newsletter, footer

### 2. PAGE_GOALS (Customize for your business)

**Location:** `app/(portal)/portal/admin/page-designer/page.tsx`

```typescript
const PAGE_GOALS = [
  { id: "lead-gen", label: "Generate Leads", description: "Capture contact information", icon: Megaphone },
  { id: "sales", label: "Drive Sales", description: "Convert visitors to customers", icon: ShoppingCart },
  { id: "educate", label: "Educate Visitors", description: "Inform and build trust", icon: BookOpen },
  { id: "brand", label: "Build Brand", description: "Establish credibility", icon: Heart },
  { id: "recruit", label: "Recruit Talent", description: "Attract team members", icon: Briefcase },
  { id: "engage", label: "Engage Community", description: "Foster interaction", icon: Users },
];
```

### 3. AUDIENCE_OPTIONS (Customize for your market)

```typescript
const AUDIENCE_OPTIONS = [
  { id: "business-owners", label: "Business Owners", description: "Entrepreneurs and company leaders" },
  { id: "executives", label: "C-Suite Executives", description: "CEOs, CFOs, COOs" },
  { id: "managers", label: "Managers", description: "Team leads and department heads" },
  // Add your target demographics
];
```

### 4. STYLE_OPTIONS (Update brand colors)

```typescript
const STYLE_OPTIONS = {
  tone: [
    { id: "professional", label: "Professional", description: "Formal and authoritative" },
    { id: "friendly", label: "Friendly", description: "Warm and approachable" },
    { id: "bold", label: "Bold", description: "Confident and impactful" },
    { id: "inspiring", label: "Inspiring", description: "Motivational and uplifting" },
  ],
  colorScheme: [
    { id: "brand", label: "Brand Colors", description: "Amber & Slate (UPDATE THIS)" },
    { id: "warm", label: "Warm Tones", description: "Oranges and reds" },
    { id: "cool", label: "Cool Tones", description: "Blues and greens" },
    { id: "neutral", label: "Neutral", description: "Grays and whites" },
  ],
  layout: [
    { id: "modern", label: "Modern", description: "Clean lines, lots of whitespace" },
    { id: "classic", label: "Classic", description: "Traditional, structured layout" },
    { id: "dynamic", label: "Dynamic", description: "Asymmetric, engaging design" },
    { id: "minimal", label: "Minimal", description: "Simple, focused content" },
  ],
};
```

### 5. DEFAULT_TEMPLATES (Optional - can use as-is)

**Location:** `lib/firebase-page-designer.ts`

The system includes 10+ pre-built templates:
- Hero: Centered Hero, Split Hero, Video Background Hero
- Features: Icon Grid, Alternating Features
- Testimonials: Carousel, Grid
- CTA: Full-Width Banner
- Pricing: Three-Tier
- FAQ: Accordion
- Stats: Animated Counter

You can add more or modify existing ones.

## ✨ Features Breakdown

### 1. AI Chat Interface
- **Purpose:** Natural language page editing
- **Features:**
  - Context-aware responses based on selected page/section
  - Message history with timestamps
  - Applied changes tracking
  - Quick action buttons (Update headline, Improve CTAs, Optimize layout)
  - Loading states with animations
  - User/Assistant message differentiation

### 2. Design Wizard (7 Steps)

**Step 1: Mode**
- Create new design vs. Update existing page
- Page selector for update mode

**Step 2: Goal**
- Select primary page objective
- 6 pre-defined goals with icons

**Step 3: Audience**
- Multi-select target demographics
- Minimum 1 required

**Step 4: Style**
- Tone selection (professional, friendly, bold, inspiring)
- Color scheme selection
- Layout style selection

**Step 5: Sections**
- Choose page sections (minimum 2)
- 10 section types available
- Toggle enabled/disabled

**Step 6: Content**
- Main headline (required)
- Subheadline (optional)
- Primary CTA text and URL

**Step 7: Review**
- Summary of all selections
- Generate button to create design

### 3. Template Library
- **Filterable by section type**
- **Displays:**
  - Template name and description
  - Popularity score (0-100%)
  - Category and tags
  - Collapsible best practices
- **Actions:**
  - Select template
  - Apply to section

### 4. UX Review System

**Overall Score:** 0-100 rating

**6 Categories Analyzed:**
1. Visual Hierarchy (Layout icon)
2. Content Clarity (Type icon)
3. Brand Consistency (Palette icon)
4. Conversion Optimization (Target icon)
5. Mobile Experience (Zap icon)
6. Accessibility (Accessibility icon)

**Recommendations:**
- Priority levels: critical, high, medium, low
- Estimated impact metrics
- Suggested fixes
- One-click implementation

**Accessibility Checks:**
- WCAG criteria compliance
- Severity levels: error, warning, info
- Element-specific issues
- Copy-to-clipboard fixes

**Brand Consistency:**
- Color consistency %
- Typography consistency %
- Imagery consistency %
- Tone consistency %
- Issue list

## 🚀 Implementation Steps

### Step 1: Copy Core Files

```bash
# Copy main page component
cp source/app/(portal)/portal/admin/page-designer/page.tsx target/app/(portal)/portal/admin/page-designer/page.tsx

# Copy Firebase utility
cp source/lib/firebase-page-designer.ts target/lib/firebase-page-designer.ts
```

### Step 2: Update PUBLIC_PAGES

Edit `lib/firebase-page-designer.ts`:
- Replace PUBLIC_PAGES array with your site's pages
- Map out all sections for each page
- Ensure section types match available types

### Step 3: Customize Branding

Edit `app/(portal)/portal/admin/page-designer/page.tsx`:
- Update PAGE_GOALS for your business model
- Update AUDIENCE_OPTIONS for your target market
- Update STYLE_OPTIONS.colorScheme with your brand colors
- Modify welcome message (line ~272)

### Step 4: Add to Sidebar

Edit `components/portal/portal-sidebar.tsx`:

```typescript
const adminItems = [
  // ... existing items
  {
    title: "Page Designer",
    href: "/portal/admin/page-designer",
    icon: Paintbrush,
    featureKey: "pageDesigner",
  },
];
```

### Step 5: Configure Permissions

Edit `lib/feature-visibility.ts`:

```typescript
export const SIDEBAR_FEATURES = {
  // ... existing features
  pageDesigner: {
    label: "Page Designer",
    description: "AI-powered page editing tool",
    defaultRoles: ["admin", "superadmin"],
  },
};
```

### Step 6: Initialize Firebase Collections

Run the seed function (optional - templates will be empty otherwise):

```typescript
import { seedDefaultTemplates } from "@/lib/firebase-page-designer";

// In a one-time setup script or admin action
await seedDefaultTemplates();
```

### Step 7: Test the Feature

1. Log in as admin
2. Navigate to Page Designer
3. Test wizard flow
4. Test chat interface
5. Test template selection
6. Test UX review

### Step 8: Connect Real AI (Currently Mock)

Replace these mock implementations:

**Chat Responses** (line ~346):
```typescript
const generateAIResponse = async (input: string, page: PublicPage, section: PageSection | null) => {
  // TODO: Replace with actual AI API call (OpenAI, Anthropic, etc.)
  const response = await fetch('/api/ai/page-designer/chat', {
    method: 'POST',
    body: JSON.stringify({ input, page, section }),
  });
  return response.json();
};
```

**Wizard Generation** (line ~450):
```typescript
const handleWizardGenerate = async () => {
  // TODO: Replace with actual AI generation
  const response = await fetch('/api/ai/page-designer/generate', {
    method: 'POST',
    body: JSON.stringify(wizardData),
  });
  return response.json();
};
```

**UX Review** (line ~525):
```typescript
const handleUXReview = async () => {
  // TODO: Replace with actual AI analysis
  const response = await fetch('/api/ai/page-designer/review', {
    method: 'POST',
    body: JSON.stringify({ pageId: selectedPage.id }),
  });
  return response.json();
};
```

## 🎯 State Management

The component uses React useState for:
- `selectedPage` - Currently selected page
- `selectedSection` - Currently selected section (optional)
- `activeTab` - Active tab (chat, templates, review)
- `chatMessages` - Chat message history
- `chatInput` - Current chat input
- `isGenerating` - Loading state for chat
- `isReviewing` - Loading state for UX review
- `uxReview` - UX review results
- `selectedTemplate` - Currently selected template
- `templateFilter` - Template filter by section type
- `showWizard` - Wizard modal visibility
- `wizardStep` - Current wizard step (0-6)
- `wizardData` - Wizard form data

## 📝 TypeScript Interfaces

All interfaces are defined in `lib/firebase-page-designer.ts`:

**Core Types:**
- PublicPage
- PageSection
- SectionType
- PageDesignDoc
- DesignContent
- SectionDesign
- DesignHistoryDoc
- LayoutTemplateDoc
- TemplateCategory
- TemplateStructure
- TemplateComponent
- AIConversationDoc
- AIMessage
- UXReviewDoc
- UXReviewCategory
- UXRecommendation
- BrandConsistencyCheck
- AccessibilityIssue

## 🎨 UI/UX Patterns

### Color Scheme
- Primary: Amber (#F59E0B)
- Secondary: Slate (#1E293B)
- Success: Green
- Warning: Yellow
- Error: Red

### Component Patterns
- Cards for major sections
- Badges for tags and status
- Collapsibles for expandable content
- ScrollAreas for long content
- Tabs for different views
- Modal for wizard

### Responsive Design
- Mobile-first approach
- Grid layouts with breakpoints (md:, lg:)
- Sticky elements where appropriate
- Touch-friendly targets

## 🔧 Utility Functions

**Firebase Operations** (in `lib/firebase-page-designer.ts`):
- `getPageDesign(pageId)` - Fetch current design
- `savePageDesign(pageId, design, userId, description)` - Save design with history
- `publishPageDesign(pageId)` - Publish design
- `getDesignHistory(pageId, limit)` - Fetch version history
- `getLayoutTemplates(sectionType?)` - Fetch templates
- `seedDefaultTemplates()` - Initialize templates
- `getAIConversation(pageId)` - Fetch chat history
- `createAIConversation(pageId)` - Start new conversation
- `addAIMessage(conversationId, message)` - Add chat message
- `createUXReview(pageId, pagePath, reviewData)` - Save UX review
- `getLatestUXReview(pageId)` - Fetch latest review
- `updateRecommendationStatus(reviewId, recommendationId, isImplemented)` - Mark recommendation

## 📊 Example: Fitness Coaching Site

```typescript
// Update PAGE_GOALS
const PAGE_GOALS = [
  { id: "membership", label: "Drive Memberships", description: "Convert visitors to members", icon: Users },
  { id: "programs", label: "Sell Programs", description: "Promote training programs", icon: Dumbbell },
  { id: "community", label: "Build Community", description: "Foster member engagement", icon: Heart },
  { id: "transformation", label: "Showcase Results", description: "Display transformations", icon: TrendingUp },
];

// Update AUDIENCE_OPTIONS
const AUDIENCE_OPTIONS = [
  { id: "beginners", label: "Fitness Beginners", description: "New to exercise" },
  { id: "athletes", label: "Athletes", description: "Competitive sports enthusiasts" },
  { id: "seniors", label: "Active Seniors", description: "50+ fitness seekers" },
  { id: "weight-loss", label: "Weight Loss Goals", description: "Looking to lose weight" },
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
  {
    id: "programs",
    path: "/programs",
    name: "Programs",
    description: "Training program offerings",
    sections: [
      { id: "hero", name: "Programs Hero", type: "hero", order: 1, isEditable: true },
      { id: "program-grid", name: "Program Grid", type: "cards", order: 2, isEditable: true },
      { id: "pricing", name: "Pricing", type: "pricing", order: 3, isEditable: true },
      { id: "faq", name: "FAQ", type: "faq", order: 4, isEditable: true },
    ],
  },
];
```

## ⚠️ Important Notes

1. **File Size:** Main component is ~2000 lines - consider splitting if needed
2. **Client-Side:** All state is client-side (no server actions currently)
3. **Error Handling:** Firebase operations have proper try-catch blocks
4. **Toast Notifications:** Uses sonner for user feedback
5. **Responsive:** Mobile-first design with proper breakpoints
6. **Accessibility:** Includes WCAG compliance checking
7. **Performance:** Uses React best practices (useEffect, useRef, etc.)
8. **Type Safety:** Full TypeScript coverage

## 🐛 Common Issues & Solutions

**Issue:** Templates not showing
**Solution:** Run `seedDefaultTemplates()` to populate the database

**Issue:** Chat not responding
**Solution:** Check that `generateAIResponse()` is working (currently returns mock data)

**Issue:** Page not appearing in selector
**Solution:** Verify page is in PUBLIC_PAGES array with correct structure

**Issue:** Permission denied
**Solution:** Check feature-visibility.ts has pageDesigner configured for your role

**Issue:** Firebase errors
**Solution:** Ensure Firebase is initialized and collections have proper security rules

## 📚 Additional Resources

- Firebase Firestore Documentation
- shadcn/ui Component Library
- Lucide React Icons
- React Hook Best Practices
- WCAG Accessibility Guidelines

## ✅ Checklist

- [ ] Copy page.tsx to new project
- [ ] Copy firebase-page-designer.ts to new project
- [ ] Update PUBLIC_PAGES with your site's pages
- [ ] Customize PAGE_GOALS for your business
- [ ] Customize AUDIENCE_OPTIONS for your market
- [ ] Update STYLE_OPTIONS with your brand colors
- [ ] Add pageDesigner to feature-visibility.ts
- [ ] Add menu item to portal-sidebar.tsx
- [ ] Test wizard flow end-to-end
- [ ] Test chat interface
- [ ] Test template selection
- [ ] Test UX review
- [ ] Seed default templates (optional)
- [ ] Connect real AI API (replace mocks)
- [ ] Configure Firebase security rules
- [ ] Test on mobile devices
- [ ] Review accessibility compliance

```

---

## 🎬 Quick Start Command

Once files are in place, just customize these 3 things:

1. **PUBLIC_PAGES** in `lib/firebase-page-designer.ts`
2. **PAGE_GOALS** in `app/(portal)/portal/admin/page-designer/page.tsx`
3. **Brand colors** in STYLE_OPTIONS

Then add to sidebar and you're ready to go!
