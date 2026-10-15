/**
 * Firebase Page Designer Utility
 * 
 * Manages AI-generated page designs, layout templates, and design history
 * for the public-facing marketing pages.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

// ============================================================================
// COLLECTION NAMES
// ============================================================================

export const PAGE_DESIGNER_COLLECTIONS = {
  PAGE_DESIGNS: "page_designs",
  DESIGN_HISTORY: "page_design_history",
  LAYOUT_TEMPLATES: "page_layout_templates",
  AI_CONVERSATIONS: "page_ai_conversations",
  UX_REVIEWS: "page_ux_reviews",
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface PublicPage {
  id: string;
  path: string;
  name: string;
  description: string;
  sections: PageSection[];
}

export interface PageSection {
  id: string;
  name: string;
  type: SectionType;
  order: number;
  isEditable: boolean;
}

export type SectionType = 
  | "hero"
  | "features"
  | "testimonials"
  | "cta"
  | "pricing"
  | "team"
  | "faq"
  | "contact"
  | "gallery"
  | "stats"
  | "content"
  | "cards"
  | "timeline"
  | "comparison"
  | "video"
  | "newsletter"
  | "footer";

export interface PageDesignDoc {
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

export interface DesignContent {
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

export interface SectionDesign {
  sectionId: string;
  sectionType: SectionType;
  templateId?: string;
  content: Record<string, unknown>;
  styles?: Record<string, string>;
  isVisible: boolean;
  order: number;
}

export interface DesignHistoryDoc {
  id: string;
  pageId: string;
  designSnapshot: DesignContent;
  changeDescription: string;
  changedBy: string;
  aiPrompt?: string;
  createdAt: Timestamp;
}

export interface LayoutTemplateDoc {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
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

export type TemplateCategory = 
  | "minimal"
  | "modern"
  | "classic"
  | "bold"
  | "elegant"
  | "playful"
  | "corporate"
  | "startup";

export interface TemplateStructure {
  layout: "single-column" | "two-column" | "three-column" | "grid" | "masonry" | "split";
  components: TemplateComponent[];
  responsiveBreakpoints?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
}

export interface TemplateComponent {
  type: "heading" | "text" | "image" | "button" | "icon" | "card" | "list" | "form" | "video" | "spacer";
  props: Record<string, unknown>;
  children?: TemplateComponent[];
}

export interface AIConversationDoc {
  id: string;
  pageId: string;
  messages: AIMessage[];
  status: "active" | "completed" | "archived";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Timestamp;
  metadata?: {
    appliedChanges?: boolean;
    sectionTargeted?: string;
    templateUsed?: string;
  };
}

export interface UXReviewDoc {
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

export interface UXReviewCategory {
  name: string;
  score: number;
  maxScore: number;
  findings: string[];
}

export interface UXRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  suggestedFix: string;
  estimatedImpact: string;
  isImplemented: boolean;
}

export interface BrandConsistencyCheck {
  colorConsistency: number;
  typographyConsistency: number;
  imageryConsistency: number;
  toneConsistency: number;
  issues: string[];
}

export interface AccessibilityIssue {
  severity: "error" | "warning" | "info";
  element: string;
  issue: string;
  wcagCriteria: string;
  suggestedFix: string;
}

// ============================================================================
// PUBLIC PAGES REGISTRY
// ============================================================================

export const PUBLIC_PAGES: PublicPage[] = [
  {
    id: "home",
    path: "/",
    name: "Home",
    description: "Main landing page with hero carousel, services, and company overview",
    sections: [
      { id: "hero-carousel", name: "Hero Carousel", type: "hero", order: 1, isEditable: true },
      { id: "value-prop", name: "Value Proposition", type: "content", order: 2, isEditable: true },
      { id: "services-preview", name: "Services Overview", type: "features", order: 3, isEditable: true },
      { id: "testimonials", name: "Client Testimonials", type: "testimonials", order: 4, isEditable: true },
      { id: "stats", name: "Impact Statistics", type: "stats", order: 5, isEditable: true },
      { id: "cta-primary", name: "Primary Call to Action", type: "cta", order: 6, isEditable: true },
    ],
  },
  {
    id: "about",
    path: "/about",
    name: "About",
    description: "Company story, Adams Electric bio, and mission",
    sections: [
      { id: "hero", name: "About Hero", type: "hero", order: 1, isEditable: true },
      { id: "founder-story", name: "Founder Story", type: "content", order: 2, isEditable: true },
      { id: "mission-vision", name: "Mission & Vision", type: "features", order: 3, isEditable: true },
      { id: "values", name: "Core Values", type: "cards", order: 4, isEditable: true },
      { id: "journey", name: "Our Journey", type: "timeline", order: 5, isEditable: true },
      { id: "cta", name: "Work With Us", type: "cta", order: 6, isEditable: true },
    ],
  },
  {
    id: "company",
    path: "/company",
    name: "Company",
    description: "Company overview and organizational information",
    sections: [
      { id: "hero", name: "Company Hero", type: "hero", order: 1, isEditable: true },
      { id: "overview", name: "Company Overview", type: "content", order: 2, isEditable: true },
      { id: "approach", name: "Our Approach", type: "features", order: 3, isEditable: true },
      { id: "differentiators", name: "What Sets Us Apart", type: "cards", order: 4, isEditable: true },
      { id: "cta", name: "Get Started", type: "cta", order: 5, isEditable: true },
    ],
  },
  {
    id: "services",
    path: "/services",
    name: "Services",
    description: "Comprehensive service offerings for electrical construction and project delivery",
    sections: [
      { id: "hero", name: "Services Hero", type: "hero", order: 1, isEditable: true },
      { id: "overview", name: "Services Overview", type: "content", order: 2, isEditable: true },
      { id: "core-services", name: "Core Services", type: "cards", order: 3, isEditable: true },
      { id: "process", name: "Our Process", type: "timeline", order: 4, isEditable: true },
      { id: "packages", name: "Service Packages", type: "pricing", order: 5, isEditable: true },
      { id: "testimonials", name: "Client Results", type: "testimonials", order: 6, isEditable: true },
      { id: "cta", name: "Book Consultation", type: "cta", order: 7, isEditable: true },
    ],
  },
  {
    id: "academy",
    path: "/academy",
    name: "Academy",
    description: "Learning platform with courses, workshops, and assessments",
    sections: [
      { id: "hero", name: "Academy Hero", type: "hero", order: 1, isEditable: true },
      { id: "featured-courses", name: "Featured Courses", type: "cards", order: 2, isEditable: true },
      { id: "categories", name: "Course Categories", type: "features", order: 3, isEditable: true },
      { id: "workshops", name: "Upcoming Workshops", type: "cards", order: 4, isEditable: true },
      { id: "assessments", name: "Growth Assessments", type: "content", order: 5, isEditable: true },
      { id: "pricing", name: "Membership Tiers", type: "pricing", order: 6, isEditable: true },
      { id: "testimonials", name: "Student Success", type: "testimonials", order: 7, isEditable: true },
      { id: "cta", name: "Start Learning", type: "cta", order: 8, isEditable: true },
    ],
  },
  {
    id: "academy-courses",
    path: "/academy/courses",
    name: "Academy Courses",
    description: "Browse all available courses",
    sections: [
      { id: "hero", name: "Courses Hero", type: "hero", order: 1, isEditable: true },
      { id: "filters", name: "Course Filters", type: "content", order: 2, isEditable: true },
      { id: "course-grid", name: "Course Catalog", type: "cards", order: 3, isEditable: true },
      { id: "cta", name: "Can't Find What You Need?", type: "cta", order: 4, isEditable: true },
    ],
  },
  {
    id: "academy-workshops",
    path: "/academy/workshops",
    name: "Academy Workshops",
    description: "Live and recorded workshop sessions",
    sections: [
      { id: "hero", name: "Workshops Hero", type: "hero", order: 1, isEditable: true },
      { id: "upcoming", name: "Upcoming Workshops", type: "cards", order: 2, isEditable: true },
      { id: "on-demand", name: "On-Demand Workshops", type: "cards", order: 3, isEditable: true },
      { id: "benefits", name: "Workshop Benefits", type: "features", order: 4, isEditable: true },
    ],
  },
  {
    id: "contact",
    path: "/contact",
    name: "Contact",
    description: "Get in touch with our team",
    sections: [
      { id: "hero", name: "Contact Hero", type: "hero", order: 1, isEditable: true },
      { id: "form", name: "Contact Form", type: "contact", order: 2, isEditable: true },
      { id: "info", name: "Contact Information", type: "content", order: 3, isEditable: true },
      { id: "locations", name: "Office Locations", type: "cards", order: 4, isEditable: true },
      { id: "faq", name: "Quick Answers", type: "faq", order: 5, isEditable: true },
    ],
  },
  {
    id: "success-stories",
    path: "/success-stories",
    name: "Success Stories",
    description: "Client transformations and case studies",
    sections: [
      { id: "hero", name: "Success Stories Hero", type: "hero", order: 1, isEditable: true },
      { id: "featured", name: "Featured Case Studies", type: "cards", order: 2, isEditable: true },
      { id: "testimonials", name: "Client Testimonials", type: "testimonials", order: 3, isEditable: true },
      { id: "stats", name: "Impact Metrics", type: "stats", order: 4, isEditable: true },
      { id: "industries", name: "Industries Served", type: "features", order: 5, isEditable: true },
      { id: "cta", name: "Start Your Success Story", type: "cta", order: 6, isEditable: true },
    ],
  },
  {
    id: "events",
    path: "/events",
    name: "Events",
    description: "Upcoming events, webinars, and conferences",
    sections: [
      { id: "hero", name: "Events Hero", type: "hero", order: 1, isEditable: true },
      { id: "upcoming", name: "Upcoming Events", type: "cards", order: 2, isEditable: true },
      { id: "featured", name: "Featured Event", type: "content", order: 3, isEditable: true },
      { id: "past", name: "Past Events Gallery", type: "gallery", order: 4, isEditable: true },
      { id: "newsletter", name: "Event Updates", type: "newsletter", order: 5, isEditable: true },
    ],
  },
  {
    id: "insights",
    path: "/insights",
    name: "Insights",
    description: "Insights, articles, and thought leadership",
    sections: [
      { id: "hero", name: "Journal Hero", type: "hero", order: 1, isEditable: true },
      { id: "featured", name: "Featured Articles", type: "cards", order: 2, isEditable: true },
      { id: "recent", name: "Recent Posts", type: "cards", order: 3, isEditable: true },
      { id: "categories", name: "Article Categories", type: "features", order: 4, isEditable: true },
      { id: "newsletter", name: "Subscribe to Journal", type: "newsletter", order: 5, isEditable: true },
    ],
  },
  {
    id: "faq",
    path: "/faq",
    name: "FAQ",
    description: "Frequently asked questions and answers",
    sections: [
      { id: "hero", name: "FAQ Hero", type: "hero", order: 1, isEditable: true },
      { id: "search", name: "Search Questions", type: "content", order: 2, isEditable: true },
      { id: "general", name: "General Questions", type: "faq", order: 3, isEditable: true },
      { id: "services", name: "Services Questions", type: "faq", order: 4, isEditable: true },
      { id: "academy", name: "Academy Questions", type: "faq", order: 5, isEditable: true },
      { id: "cta", name: "Still Have Questions?", type: "cta", order: 6, isEditable: true },
    ],
  },
  {
    id: "quiz-intro",
    path: "/quiz-intro",
    name: "Growth IQ Quiz Intro",
    description: "Introduction to the Adams IQ assessment",
    sections: [
      { id: "hero", name: "Quiz Intro Hero", type: "hero", order: 1, isEditable: true },
      { id: "benefits", name: "Assessment Benefits", type: "features", order: 2, isEditable: true },
      { id: "preview", name: "What You'll Discover", type: "content", order: 3, isEditable: true },
      { id: "testimonials", name: "Participant Feedback", type: "testimonials", order: 4, isEditable: true },
      { id: "cta", name: "Take the Quiz", type: "cta", order: 5, isEditable: true },
    ],
  },
  {
    id: "quiz",
    path: "/quiz",
    name: "Growth IQ Quiz",
    description: "Interactive Adams IQ assessment",
    sections: [
      { id: "progress", name: "Progress Tracker", type: "content", order: 1, isEditable: false },
      { id: "questions", name: "Quiz Questions", type: "content", order: 2, isEditable: false },
      { id: "navigation", name: "Quiz Navigation", type: "content", order: 3, isEditable: false },
    ],
  },
  {
    id: "quiz-results",
    path: "/quiz/results",
    name: "Quiz Results",
    description: "Personalized Growth IQ assessment results",
    sections: [
      { id: "hero", name: "Results Hero", type: "hero", order: 1, isEditable: true },
      { id: "score", name: "Your Score", type: "stats", order: 2, isEditable: false },
      { id: "insights", name: "Personalized Insights", type: "content", order: 3, isEditable: false },
      { id: "recommendations", name: "Next Steps", type: "cards", order: 4, isEditable: true },
      { id: "cta", name: "Book Consultation", type: "cta", order: 5, isEditable: true },
    ],
  },
  {
    id: "schedule-a-call",
    path: "/schedule-a-call",
    name: "Schedule a Call",
    description: "Book a consultation with our team",
    sections: [
      { id: "hero", name: "Booking Hero", type: "hero", order: 1, isEditable: true },
      { id: "calendar", name: "Booking Calendar", type: "contact", order: 2, isEditable: false },
      { id: "expectations", name: "What to Expect", type: "features", order: 3, isEditable: true },
      { id: "preparation", name: "How to Prepare", type: "content", order: 4, isEditable: true },
      { id: "testimonials", name: "Client Experiences", type: "testimonials", order: 5, isEditable: true },
    ],
  },
  {
    id: "leadership",
    path: "/leadership",
    name: "Leadership",
    description: "Meet our leadership team",
    sections: [
      { id: "hero", name: "Leadership Hero", type: "hero", order: 1, isEditable: true },
      { id: "founder", name: "Founder Profile", type: "content", order: 2, isEditable: true },
      { id: "team", name: "Leadership Team", type: "team", order: 3, isEditable: true },
      { id: "advisors", name: "Advisory Board", type: "team", order: 4, isEditable: true },
      { id: "values", name: "Leadership Values", type: "features", order: 5, isEditable: true },
    ],
  },
  {
    id: "accessibility",
    path: "/accessibility",
    name: "Accessibility",
    description: "Our commitment to digital accessibility",
    sections: [
      { id: "hero", name: "Accessibility Hero", type: "hero", order: 1, isEditable: true },
      { id: "statement", name: "Accessibility Statement", type: "content", order: 2, isEditable: true },
      { id: "features", name: "Accessibility Features", type: "features", order: 3, isEditable: true },
      { id: "standards", name: "Standards Compliance", type: "content", order: 4, isEditable: true },
      { id: "contact", name: "Report Issues", type: "cta", order: 5, isEditable: true },
    ],
  },
];

// Helper function to get page by ID
export function getPageById(pageId: string): PublicPage | undefined {
  return PUBLIC_PAGES.find(page => page.id === pageId);
}

// Helper function to get page by path
export function getPageByPath(path: string): PublicPage | undefined {
  return PUBLIC_PAGES.find(page => page.path === path);
}

// Helper function to get all page paths
export function getAllPagePaths(): string[] {
  return PUBLIC_PAGES.map(page => page.path);
}

// Helper function to get pages by section type
export function getPagesBySectionType(sectionType: SectionType): PublicPage[] {
  return PUBLIC_PAGES.filter(page => 
    page.sections.some(section => section.type === sectionType)
  );
}

// ============================================================================
// LAYOUT TEMPLATES
// ============================================================================

export const DEFAULT_TEMPLATES: Omit<LayoutTemplateDoc, "id" | "createdAt">[] = [
  // Hero Templates
  {
    name: "Centered Hero with CTA",
    description: "Clean, centered hero with headline, subheadline, and prominent call-to-action buttons",
    category: "modern",
    sectionType: "hero",
    bestPractices: [
      "Keep headline under 10 words",
      "Use action-oriented CTA text",
      "Ensure sufficient contrast for readability",
      "Include social proof element",
    ],
    tags: ["centered", "minimal", "conversion-focused"],
    popularity: 95,
    isActive: true,
    structure: {
      layout: "single-column",
      components: [
        { type: "heading", props: { level: 1, align: "center" } },
        { type: "text", props: { align: "center", size: "lg" } },
        { type: "button", props: { variant: "primary", size: "lg" } },
        { type: "button", props: { variant: "outline", size: "lg" } },
      ],
    },
  },
  {
    name: "Split Hero with Image",
    description: "Two-column layout with content on one side and image on the other",
    category: "modern",
    sectionType: "hero",
    bestPractices: [
      "Use high-quality, relevant imagery",
      "Maintain visual hierarchy with typography",
      "Keep content scannable",
      "Mobile-first responsive design",
    ],
    tags: ["split", "image", "professional"],
    popularity: 88,
    isActive: true,
    structure: {
      layout: "two-column",
      components: [
        { type: "heading", props: { level: 1 } },
        { type: "text", props: { size: "lg" } },
        { type: "button", props: { variant: "primary" } },
        { type: "image", props: { aspectRatio: "4:3" } },
      ],
    },
  },
  {
    name: "Video Background Hero",
    description: "Full-width hero with video background and overlay content",
    category: "bold",
    sectionType: "hero",
    bestPractices: [
      "Keep video subtle and non-distracting",
      "Ensure text remains readable with overlay",
      "Provide fallback image for slow connections",
      "Consider autoplay policies",
    ],
    tags: ["video", "immersive", "dynamic"],
    popularity: 72,
    isActive: true,
    structure: {
      layout: "single-column",
      components: [
        { type: "video", props: { autoplay: true, muted: true, loop: true } },
        { type: "heading", props: { level: 1, align: "center", overlay: true } },
        { type: "button", props: { variant: "primary", size: "lg" } },
      ],
    },
  },
  // Features Templates
  {
    name: "Icon Grid Features",
    description: "3-column grid of features with icons, titles, and descriptions",
    category: "minimal",
    sectionType: "features",
    bestPractices: [
      "Use consistent icon style",
      "Keep descriptions concise (2-3 sentences)",
      "Limit to 3-6 features for scannability",
      "Use meaningful icons that reinforce the message",
    ],
    tags: ["grid", "icons", "scannable"],
    popularity: 91,
    isActive: true,
    structure: {
      layout: "three-column",
      components: [
        { type: "icon", props: { size: "lg" } },
        { type: "heading", props: { level: 3 } },
        { type: "text", props: { size: "sm" } },
      ],
    },
  },
  {
    name: "Alternating Features",
    description: "Features displayed in alternating left-right layout with images",
    category: "elegant",
    sectionType: "features",
    bestPractices: [
      "Alternate image placement for visual interest",
      "Use consistent image dimensions",
      "Include micro-interactions on hover",
      "Maintain consistent spacing",
    ],
    tags: ["alternating", "images", "detailed"],
    popularity: 85,
    isActive: true,
    structure: {
      layout: "two-column",
      components: [
        { type: "image", props: { aspectRatio: "16:9" } },
        { type: "heading", props: { level: 3 } },
        { type: "text", props: {} },
        { type: "button", props: { variant: "link" } },
      ],
    },
  },
  // Testimonials Templates
  {
    name: "Carousel Testimonials",
    description: "Rotating carousel of customer testimonials with photos",
    category: "modern",
    sectionType: "testimonials",
    bestPractices: [
      "Include customer photos for authenticity",
      "Show company/role for credibility",
      "Keep quotes concise and impactful",
      "Include navigation controls",
    ],
    tags: ["carousel", "photos", "social-proof"],
    popularity: 89,
    isActive: true,
    structure: {
      layout: "single-column",
      components: [
        { type: "image", props: { rounded: true, size: "sm" } },
        { type: "text", props: { italic: true, size: "lg" } },
        { type: "text", props: { weight: "bold" } },
        { type: "text", props: { size: "sm", muted: true } },
      ],
    },
  },
  {
    name: "Grid Testimonials",
    description: "Multi-column grid of testimonial cards",
    category: "corporate",
    sectionType: "testimonials",
    bestPractices: [
      "Use consistent card styling",
      "Include star ratings if applicable",
      "Show diverse customer types",
      "Keep grid balanced",
    ],
    tags: ["grid", "cards", "multiple"],
    popularity: 82,
    isActive: true,
    structure: {
      layout: "grid",
      components: [
        { type: "card", props: {}, children: [
          { type: "text", props: { italic: true } },
          { type: "image", props: { rounded: true, size: "xs" } },
          { type: "text", props: { weight: "bold", size: "sm" } },
        ]},
      ],
    },
  },
  // CTA Templates
  {
    name: "Full-Width CTA Banner",
    description: "Bold, full-width call-to-action with contrasting background",
    category: "bold",
    sectionType: "cta",
    bestPractices: [
      "Use contrasting colors for visibility",
      "Single, clear call-to-action",
      "Create urgency without being pushy",
      "Keep copy action-oriented",
    ],
    tags: ["full-width", "bold", "conversion"],
    popularity: 93,
    isActive: true,
    structure: {
      layout: "single-column",
      components: [
        { type: "heading", props: { level: 2, align: "center" } },
        { type: "text", props: { align: "center" } },
        { type: "button", props: { variant: "primary", size: "lg" } },
      ],
    },
  },
  // Pricing Templates
  {
    name: "Three-Tier Pricing",
    description: "Classic three-column pricing table with highlighted recommended tier",
    category: "corporate",
    sectionType: "pricing",
    bestPractices: [
      "Highlight recommended option",
      "Show clear feature comparison",
      "Include annual/monthly toggle",
      "Use psychological pricing",
    ],
    tags: ["three-tier", "comparison", "highlighted"],
    popularity: 94,
    isActive: true,
    structure: {
      layout: "three-column",
      components: [
        { type: "card", props: { highlighted: false } },
        { type: "card", props: { highlighted: true } },
        { type: "card", props: { highlighted: false } },
      ],
    },
  },
  // FAQ Templates
  {
    name: "Accordion FAQ",
    description: "Expandable accordion-style FAQ section",
    category: "minimal",
    sectionType: "faq",
    bestPractices: [
      "Group related questions",
      "Keep answers concise",
      "Use clear, searchable questions",
      "Include contact option for unanswered questions",
    ],
    tags: ["accordion", "expandable", "organized"],
    popularity: 90,
    isActive: true,
    structure: {
      layout: "single-column",
      components: [
        { type: "heading", props: { level: 3, expandable: true } },
        { type: "text", props: { collapsible: true } },
      ],
    },
  },
  // Stats Templates
  {
    name: "Animated Counter Stats",
    description: "Large numbers with animated counting effect",
    category: "modern",
    sectionType: "stats",
    bestPractices: [
      "Use impressive but honest numbers",
      "Include context for each stat",
      "Animate on scroll into view",
      "Limit to 3-4 key metrics",
    ],
    tags: ["animated", "numbers", "impact"],
    popularity: 87,
    isActive: true,
    structure: {
      layout: "grid",
      components: [
        { type: "heading", props: { level: 2, animated: true } },
        { type: "text", props: { size: "sm" } },
      ],
    },
  },
];

// ============================================================================
// PAGE DESIGN OPERATIONS
// ============================================================================

export async function getPageDesign(pageId: string): Promise<PageDesignDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, PAGE_DESIGNER_COLLECTIONS.PAGE_DESIGNS, pageId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return docSnap.data() as PageDesignDoc;
}

export async function savePageDesign(
  pageId: string,
  design: DesignContent,
  userId: string,
  changeDescription?: string
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const page = PUBLIC_PAGES.find(p => p.id === pageId);
  if (!page) throw new Error("Page not found");

  const designRef = doc(db, PAGE_DESIGNER_COLLECTIONS.PAGE_DESIGNS, pageId);
  const existingDesign = await getPageDesign(pageId);

  if (existingDesign) {
    // Save to history before updating
    await saveDesignHistory(pageId, existingDesign.currentDesign, userId, changeDescription);
    
    await updateDoc(designRef, {
      currentDesign: design,
      lastModifiedBy: userId,
      updatedAt: serverTimestamp(),
    });
  } else {
    const newDesign: Omit<PageDesignDoc, "createdAt" | "updatedAt"> = {
      id: pageId,
      pageId,
      pagePath: page.path,
      pageName: page.name,
      currentDesign: design,
      isPublished: false,
      publishedAt: null,
      lastModifiedBy: userId,
    };

    await setDoc(designRef, {
      ...newDesign,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function publishPageDesign(pageId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const designRef = doc(db, PAGE_DESIGNER_COLLECTIONS.PAGE_DESIGNS, pageId);
  await updateDoc(designRef, {
    isPublished: true,
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ============================================================================
// DESIGN HISTORY OPERATIONS
// ============================================================================

export async function saveDesignHistory(
  pageId: string,
  design: DesignContent,
  userId: string,
  description?: string,
  aiPrompt?: string
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const historyRef = doc(collection(db, PAGE_DESIGNER_COLLECTIONS.DESIGN_HISTORY));
  
  await setDoc(historyRef, {
    id: historyRef.id,
    pageId,
    designSnapshot: design,
    changeDescription: description || "Design update",
    changedBy: userId,
    aiPrompt: aiPrompt || null,
    createdAt: serverTimestamp(),
  });
}

export async function getDesignHistory(pageId: string, limitCount = 20): Promise<DesignHistoryDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const historyRef = collection(db, PAGE_DESIGNER_COLLECTIONS.DESIGN_HISTORY);
  const q = query(
    historyRef,
    where("pageId", "==", pageId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => doc.data() as DesignHistoryDoc);
}

// ============================================================================
// TEMPLATE OPERATIONS
// ============================================================================

export async function getLayoutTemplates(sectionType?: SectionType): Promise<LayoutTemplateDoc[]> {
  if (!db) throw new Error("Firebase not initialized");

  const templatesRef = collection(db, PAGE_DESIGNER_COLLECTIONS.LAYOUT_TEMPLATES);
  let q = query(templatesRef, where("isActive", "==", true), orderBy("popularity", "desc"));

  if (sectionType) {
    q = query(q, where("sectionType", "==", sectionType));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as LayoutTemplateDoc);
}

export async function seedDefaultTemplates(): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  for (const template of DEFAULT_TEMPLATES) {
    const templateRef = doc(collection(db, PAGE_DESIGNER_COLLECTIONS.LAYOUT_TEMPLATES));
    await setDoc(templateRef, {
      ...template,
      id: templateRef.id,
      createdAt: Timestamp.now(),
    });
  }
}

// ============================================================================
// AI CONVERSATION OPERATIONS
// ============================================================================

export async function getAIConversation(pageId: string): Promise<AIConversationDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const conversationsRef = collection(db, PAGE_DESIGNER_COLLECTIONS.AI_CONVERSATIONS);
  const q = query(
    conversationsRef,
    where("pageId", "==", pageId),
    where("status", "==", "active"),
    orderBy("updatedAt", "desc"),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as AIConversationDoc;
}

export async function createAIConversation(pageId: string): Promise<AIConversationDoc> {
  if (!db) throw new Error("Firebase not initialized");

  const conversationRef = doc(collection(db, PAGE_DESIGNER_COLLECTIONS.AI_CONVERSATIONS));
  
  const conversation: Omit<AIConversationDoc, "createdAt" | "updatedAt"> = {
    id: conversationRef.id,
    pageId,
    messages: [],
    status: "active",
  };

  await setDoc(conversationRef, {
    ...conversation,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    ...conversation,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

export async function addAIMessage(
  conversationId: string,
  message: Omit<AIMessage, "id" | "timestamp">
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const conversationRef = doc(db, PAGE_DESIGNER_COLLECTIONS.AI_CONVERSATIONS, conversationId);
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) throw new Error("Conversation not found");

  const conversation = conversationSnap.data() as AIConversationDoc;
  const newMessage: AIMessage = {
    ...message,
    id: `msg_${Date.now()}`,
    timestamp: Timestamp.now(),
  };

  await updateDoc(conversationRef, {
    messages: [...conversation.messages, newMessage],
    updatedAt: serverTimestamp(),
  });
}

// ============================================================================
// UX REVIEW OPERATIONS
// ============================================================================

export async function createUXReview(
  pageId: string,
  pagePath: string,
  reviewData: Omit<UXReviewDoc, "id" | "pageId" | "pagePath" | "createdAt" | "reviewDate">
): Promise<UXReviewDoc> {
  if (!db) throw new Error("Firebase not initialized");

  const reviewRef = doc(collection(db, PAGE_DESIGNER_COLLECTIONS.UX_REVIEWS));
  
  const review: Omit<UXReviewDoc, "createdAt" | "reviewDate"> = {
    id: reviewRef.id,
    pageId,
    pagePath,
    ...reviewData,
  };

  await setDoc(reviewRef, {
    ...review,
    reviewDate: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  return {
    ...review,
    reviewDate: Timestamp.now(),
    createdAt: Timestamp.now(),
  };
}

export async function getLatestUXReview(pageId: string): Promise<UXReviewDoc | null> {
  if (!db) throw new Error("Firebase not initialized");

  const reviewsRef = collection(db, PAGE_DESIGNER_COLLECTIONS.UX_REVIEWS);
  const q = query(
    reviewsRef,
    where("pageId", "==", pageId),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UXReviewDoc;
}

export async function updateRecommendationStatus(
  reviewId: string,
  recommendationId: string,
  isImplemented: boolean
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const reviewRef = doc(db, PAGE_DESIGNER_COLLECTIONS.UX_REVIEWS, reviewId);
  const reviewSnap = await getDoc(reviewRef);

  if (!reviewSnap.exists()) throw new Error("Review not found");

  const review = reviewSnap.data() as UXReviewDoc;
  const updatedRecommendations = review.recommendations.map(rec =>
    rec.id === recommendationId ? { ...rec, isImplemented } : rec
  );

  await updateDoc(reviewRef, {
    recommendations: updatedRecommendations,
  });
}
