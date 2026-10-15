# Hero Management System Repurpose Prompt

## Overview

This prompt provides a comprehensive blueprint for repurposing the Hero Carousel Management system from the Adams Electric (Adams) Platform to a similar application. The system allows administrators to create, edit, reorder, and publish rotating hero slides for the homepage with a step-by-step wizard interface.

---

## Architecture Components

### 1. Core Files to Create/Modify

| File | Purpose |
|------|---------|
| `components/marketing/hero-carousel.tsx` | Frontend carousel component with auto-play and navigation |
| `components/marketing/hero.tsx` | Static hero component (single slide, no carousel) |
| `app/(portal)/portal/admin/hero/page.tsx` | Admin management page with wizard dialog |

---

## Data Model

### HeroSlide Interface

```typescript
export interface HeroSlide {
  id: string;                    // Unique identifier
  badge: string;                 // Top badge text (e.g., "Introducing EDGE-X™")
  headline: string;              // Main headline text
  highlightedText: string;       // Text shown in primary color (accent)
  subheadline: string;           // Supporting description text
  benefits: string[];            // Array of key benefits (up to 3)
  primaryCta: {                  // Primary call-to-action button
    text: string;
    href: string;
  };
  secondaryCta: {                // Secondary call-to-action button
    text: string;
    href: string;
  };
  isPublished: boolean;          // Whether slide is visible on frontend
  order: number;                 // Display order (1-based)
}
```

### Firebase/Database Schema (Optional)

```typescript
// Collection: heroSlides
interface HeroSlideDoc extends HeroSlide {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;             // User ID who created
  updatedBy: string;             // User ID who last updated
}
```

---

## Admin Management Page Features

### 1. Dashboard Stats

| Stat | Description |
|------|-------------|
| Total Slides | Count of all slides |
| Published | Count of slides with `isPublished: true` |
| Drafts | Count of slides with `isPublished: false` |

### 2. Slide List

Each slide card displays:
- **Reorder buttons** - Move slide up/down
- **Status badge** - Published (green) or Draft (yellow)
- **Order number** - Current position
- **Headline preview** - With highlighted text in primary color
- **Badge text** - Subtitle preview
- **Action buttons**:
  - Toggle publish/unpublish (Eye/EyeOff icon)
  - Edit (Pencil icon)
  - Delete (Trash icon)

### 3. Wizard Dialog (4 Steps)

#### Step 1: Basic Info
| Field | Type | Description |
|-------|------|-------------|
| Badge Text | Input | Top badge/announcement text |
| Headline | Input | Main headline |
| Highlighted Text | Input | Accent-colored word/phrase |

#### Step 2: Content
| Field | Type | Description |
|-------|------|-------------|
| Subheadline | Textarea | Supporting description |
| Benefits | 3x Input | Key benefit bullet points |

#### Step 3: Actions
| Field | Type | Description |
|-------|------|-------------|
| Primary CTA Text | Input | Primary button label |
| Primary CTA URL | Input | Primary button link |
| Secondary CTA Text | Input | Secondary button label |
| Secondary CTA URL | Input | Secondary button link |

#### Step 4: Review
- Live preview of slide appearance
- Publish toggle switch
- Save/Create button

---

## Frontend Carousel Component

### Props Interface

```typescript
interface HeroCarouselProps {
  slides?: HeroSlide[];          // Array of slides (uses defaults if not provided)
  autoPlayInterval?: number;     // Auto-advance interval in ms (default: 6000)
}
```

### Features

| Feature | Description |
|---------|-------------|
| Auto-play | Automatically advances slides at configurable interval |
| Pause on interaction | Stops auto-play when user manually navigates |
| Resume auto-play | Resumes after 10 seconds of inactivity |
| Fade animation | Smooth fade transition between slides |
| Dot navigation | Clickable dots showing current position |
| Arrow navigation | Previous/Next buttons |
| Responsive | Adapts to mobile, tablet, desktop |
| Published filter | Only shows slides where `isPublished: true` |
| Order sorting | Displays slides in `order` sequence |

### Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [Background Pattern - Grid with radial mask]               │
│                                                             │
│                    ┌─ Badge ─┐                              │
│                    │ Announcement Text │                    │
│                                                             │
│           Headline [Highlighted] Your Manufacturing.        │
│                                                             │
│              Subheadline description text here              │
│                                                             │
│         ✓ Benefit 1    ✓ Benefit 2    ✓ Benefit 3          │
│                                                             │
│                  [ Primary CTA Button ]                     │
│                                                             │
│              ◀  ○ ○ ● ○  ▶  (Navigation)                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│              Trust Indicators / Certifications              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Create HeroSlide Interface

Create or add to your types file:

```typescript
// lib/types.ts or components/marketing/hero-carousel.tsx
export interface HeroSlide {
  id: string;
  badge: string;
  headline: string;
  highlightedText: string;
  subheadline: string;
  benefits: string[];
  primaryCta: { text: string; href: string };
  secondaryCta: { text: string; href: string };
  isPublished: boolean;
  order: number;
}
```

### Step 2: Create Hero Carousel Component

```tsx
// components/marketing/hero-carousel.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  id: string;
  badge: string;
  headline: string;
  highlightedText: string;
  subheadline: string;
  benefits: string[];
  primaryCta: { text: string; href: string };
  secondaryCta: { text: string; href: string };
  isPublished: boolean;
  order: number;
}

interface HeroCarouselProps {
  slides?: HeroSlide[];
  autoPlayInterval?: number;
}

export function HeroCarousel({ slides = [], autoPlayInterval = 6000 }: HeroCarouselProps) {
  const publishedSlides = slides.filter(s => s.isPublished).sort((a, b) => a.order - b.order);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % publishedSlides.length);
  }, [publishedSlides.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + publishedSlides.length) % publishedSlides.length);
  }, [publishedSlides.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying || publishedSlides.length <= 1) return;
    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isAutoPlaying, autoPlayInterval, goToNext, publishedSlides.length]);

  if (publishedSlides.length === 0) return null;

  const currentSlide = publishedSlides[currentIndex];

  return (
    <section className="relative overflow-hidden bg-black text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      <div className="relative py-20 md:py-32 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div key={currentSlide.id} className="animate-in fade-in duration-500">
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary">
              {currentSlide.badge}
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {currentSlide.headline}{" "}
              <span className="text-primary">{currentSlide.highlightedText}</span> Your Manufacturing.
            </h1>

            <p className="mt-6 text-lg text-gray-300 md:text-xl max-w-2xl mx-auto">
              {currentSlide.subheadline}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              {currentSlide.benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Button size="lg" className="text-lg px-8" asChild>
                <Link href={currentSlide.primaryCta.href}>
                  {currentSlide.primaryCta.text}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Navigation */}
          {publishedSlides.length > 1 && (
            <div className="mt-12 flex items-center justify-center gap-4">
              <button
                onClick={() => { goToPrev(); setIsAutoPlaying(false); }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex gap-2">
                {publishedSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all duration-300",
                      index === currentIndex ? "bg-primary w-8" : "bg-white/30 hover:bg-white/50"
                    )}
                  />
                ))}
              </div>
              <button
                onClick={() => { goToNext(); setIsAutoPlaying(false); }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
```

### Step 3: Create Admin Management Page

```tsx
// app/(portal)/portal/admin/hero/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, EyeOff, ChevronRight, ChevronLeft, Check, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeroSlide } from "@/components/marketing/hero-carousel";

const wizardSteps = [
  { id: 1, title: "Basic Info", description: "Badge and headline" },
  { id: 2, title: "Content", description: "Subheadline and benefits" },
  { id: 3, title: "Actions", description: "Call-to-action buttons" },
  { id: 4, title: "Review", description: "Preview and publish" },
];

interface SlideFormData {
  badge: string;
  headline: string;
  highlightedText: string;
  subheadline: string;
  benefits: string[];
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
  isPublished: boolean;
}

const emptyFormData: SlideFormData = {
  badge: "",
  headline: "",
  highlightedText: "",
  subheadline: "",
  benefits: ["", "", ""],
  primaryCtaText: "",
  primaryCtaHref: "",
  secondaryCtaText: "",
  secondaryCtaHref: "",
  isPublished: false,
};

export default function HeroManagementPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [formData, setFormData] = useState<SlideFormData>(emptyFormData);

  // ... implement openWizard, closeWizard, handleSave, handleDelete, togglePublish, moveSlide
  // See full implementation in source file

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      {/* Stats cards */}
      {/* Slides list with reorder/edit/delete */}
      {/* Wizard dialog */}
    </div>
  );
}
```

### Step 4: Add to Sidebar Navigation

Add to your sidebar navigation items:

```typescript
{
  title: "Hero Management",
  href: "/portal/admin/hero",
  icon: ImageIcon,
}
```

### Step 5: Connect to Database (Optional)

For production, replace the mock data with Firebase/database calls:

```typescript
// Fetch slides
const fetchSlides = async () => {
  const snapshot = await getDocs(collection(db, "heroSlides"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Save slide
const saveSlide = async (slide: HeroSlide) => {
  if (slide.id) {
    await updateDoc(doc(db, "heroSlides", slide.id), slide);
  } else {
    await addDoc(collection(db, "heroSlides"), slide);
  }
};

// Delete slide
const deleteSlide = async (id: string) => {
  await deleteDoc(doc(db, "heroSlides", id));
};
```

---

## Required Dependencies

```json
{
  "dependencies": {
    "lucide-react": "^0.x.x",
    "@radix-ui/react-dialog": "^1.x.x",
    "@radix-ui/react-switch": "^1.x.x",
    "next": "^14.x.x",
    "react": "^18.x.x"
  }
}
```

---

## Icon Mapping Reference

```typescript
import {
  Plus,           // Add new slide
  Pencil,         // Edit slide
  Trash2,         // Delete slide
  Eye,            // Published indicator
  EyeOff,         // Draft indicator
  ArrowUp,        // Move slide up
  ArrowDown,      // Move slide down
  ChevronLeft,    // Previous step/slide
  ChevronRight,   // Next step/slide
  Check,          // Completed step / Save
  CheckCircle,    // Benefit checkmark
  ArrowRight,     // CTA arrow
  ImageIcon,      // Sidebar icon
} from "lucide-react";
```

---

## Customization Points

### 1. Slide Content Structure

Modify the `HeroSlide` interface to add/remove fields:
- Add `backgroundImage` for custom backgrounds
- Add `videoUrl` for video backgrounds
- Add `theme` for light/dark variants
- Add `targetAudience` for personalization

### 2. Wizard Steps

Add or modify wizard steps for additional fields:
- Add media upload step
- Add scheduling step (publish date/time)
- Add A/B testing configuration

### 3. Carousel Behavior

Customize carousel behavior:
- Change transition animation (fade, slide, zoom)
- Adjust auto-play timing
- Add keyboard navigation
- Add swipe gestures for mobile

### 4. Trust Indicators

Customize the bottom section:
- Add client logos
- Add certification badges
- Add testimonial snippets
- Add social proof counters

---

## Best Practices

1. **Content Guidelines**
   - Keep headlines under 10 words
   - Highlighted text should be 1-2 words
   - Subheadlines under 30 words
   - Limit to 3 benefits per slide

2. **Performance**
   - Lazy load images if using background images
   - Preload next slide content
   - Use optimized image formats (WebP)

3. **Accessibility**
   - Include aria-labels on navigation buttons
   - Ensure sufficient color contrast
   - Provide pause control for auto-play
   - Support keyboard navigation

4. **SEO**
   - Use semantic HTML (h1 for headline)
   - Include alt text for any images
   - Ensure first slide has key messaging

---

## API Routes (Optional)

If using API routes instead of direct database access:

```typescript
// GET /api/hero-slides - List all slides
// POST /api/hero-slides - Create new slide
// PATCH /api/hero-slides/[id] - Update slide
// DELETE /api/hero-slides/[id] - Delete slide
// POST /api/hero-slides/reorder - Reorder slides
```

---

## Notes

- The wizard provides a guided experience for non-technical users
- Published/Draft status allows content staging
- Order management enables easy reordering without drag-and-drop complexity
- The carousel gracefully handles single-slide scenarios (hides navigation)
- Auto-play pauses on user interaction for better UX
