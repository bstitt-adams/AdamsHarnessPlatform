# White-Label Platform Template Prompt

## Overview

This document serves as a comprehensive prompt/guide for creating a white-labeled version of the Adams (Adams Electric) Platform. The goal is to enable any company to clone this framework and rebrand it for their own use, with full control over the front-facing website, tools, and initiatives.

---

## 🎯 Objective

Create a white-label SaaS platform template based on the Adams Platform with the following capabilities:

1. **Dynamic Front-Facing Website** - Content controlled via backend/CMS
2. **Rebranding Wizard** - Step-by-step setup for new companies
3. **Customizable Tool Suite** - Rebrand "Adams Tools" to "[Company] Tools"
4. **Initiative Templates** - Rebrand initiatives like "TMBNC Supplier Initiative"
5. **Multi-Tenant Architecture** - Support multiple white-label instances

---

## 📁 Architecture Requirements

### 1. Configuration-Driven Branding

Create a centralized branding configuration system:

```typescript
// lib/branding/config.ts
export interface BrandingConfig {
  // Company Identity
  company: {
    fullName: string;           // "Adams Electric Solutions"
    shortName: string;          // "Adams Electric"
    initials: string;           // "Adams"
    tagline: string;            // "Transforming U.S. Manufacturing"
    description: string;        // Company description for SEO
    foundedYear?: number;
    industry: string;
  };
  
  // Visual Identity
  branding: {
    logo: {
      primary: string;          // "/logos/primary-logo.svg"
      secondary: string;        // "/logos/secondary-logo.svg"
      icon: string;             // "/logos/icon.svg"
      favicon: string;          // "/favicon.ico"
    };
    colors: {
      primary: string;          // "#0066CC"
      secondary: string;        // "#FF6600"
      accent: string;           // "#00CC66"
      background: string;
      foreground: string;
    };
    fonts: {
      heading: string;          // "DM Sans"
      body: string;             // "Manrope"
    };
  };
  
  // Contact Information
  contact: {
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    social: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
      youtube?: string;
      instagram?: string;
    };
  };
  
  // Domain & URLs
  urls: {
    domain: string;             // "adams-electric.com"
    portalSubdomain?: string;   // "portal" or null for /portal path
    apiSubdomain?: string;      // "api" or null for /api path
  };
  
  // Feature Flags
  features: {
    enableAffiliateProgram: boolean;
    enableSupplierSearch: boolean;
    enableApolloIntegration: boolean;
    enableAIWorkforce: boolean;
    enableProposalCreator: boolean;
    enableDocuSeal: boolean;
    enableGoHighLevel: boolean;
    enableLinkedInContent: boolean;
    enableBugTracker: boolean;
    enableTractionRocks: boolean;
    enableNetworking: boolean;
  };
  
  // Tool Naming
  tools: {
    prefix: string;             // "Adams" -> "[Company Initials]"
    toolsLabel: string;         // "Adams Tools" -> "[Company] Tools"
    supplierInitiative: {
      name: string;             // "TMBNC Supplier Initiative"
      shortName: string;        // "TMBNC"
      description: string;
    };
  };
  
  // Legal
  legal: {
    termsUrl: string;
    privacyUrl: string;
    copyrightYear: number;
    copyrightHolder: string;
  };
}
```

### 2. Firestore Schema for Dynamic Content

```typescript
// lib/schema-whitelabel.ts

/** Site Content - CMS-controlled pages */
export interface SiteContentDoc {
  id: string;
  pageSlug: string;           // "home", "about", "services", etc.
  title: string;
  metaDescription: string;
  metaKeywords: string[];
  sections: ContentSection[];
  isPublished: boolean;
  publishedAt?: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface ContentSection {
  id: string;
  type: "hero" | "features" | "testimonials" | "cta" | "text" | "image" | "video" | "stats" | "team" | "faq" | "pricing" | "contact";
  order: number;
  title?: string;
  subtitle?: string;
  content?: string;           // Rich text / markdown
  items?: ContentItem[];
  settings?: Record<string, any>;
  isVisible: boolean;
}

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  image?: string;
  link?: string;
  icon?: string;
  metadata?: Record<string, any>;
}

/** Navigation Configuration */
export interface NavigationDoc {
  id: string;
  location: "header" | "footer" | "sidebar";
  items: NavItem[];
  updatedAt: Timestamp;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  children?: NavItem[];
  isExternal: boolean;
  requiresAuth: boolean;
  roles?: string[];           // Which roles can see this
}

/** Branding Settings (stored in Firestore) */
export interface BrandingSettingsDoc {
  id: string;
  config: BrandingConfig;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Initiative Template */
export interface InitiativeTemplateDoc {
  id: string;
  name: string;               // "TMBNC Supplier Initiative"
  shortName: string;          // "TMBNC"
  description: string;
  targetAudience: string;
  goals: string[];
  phases: InitiativePhase[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface InitiativePhase {
  id: string;
  name: string;
  description: string;
  order: number;
  milestones: string[];
  duration?: string;
}
```

---

## 🧙 Rebranding Wizard Flow

### Step 1: Company Information
```
┌─────────────────────────────────────────────────────────┐
│  Welcome to Your Platform Setup                         │
│                                                         │
│  Let's get started by setting up your company info.     │
│                                                         │
│  Company Full Name: [________________________]          │
│  Company Short Name: [________________________]         │
│  Company Initials: [___] (e.g., "ABC")                 │
│  Tagline: [________________________]                    │
│  Industry: [Dropdown: Manufacturing, Tech, etc.]        │
│                                                         │
│                              [Next →]                   │
└─────────────────────────────────────────────────────────┘
```

### Step 2: Visual Identity
```
┌─────────────────────────────────────────────────────────┐
│  Brand Your Platform                                    │
│                                                         │
│  Upload Your Logo:                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Primary │  │Secondary │  │   Icon   │              │
│  │   Logo   │  │   Logo   │  │  (32x32) │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│  Brand Colors:                                          │
│  Primary: [#______] [■]  Secondary: [#______] [■]      │
│  Accent:  [#______] [■]                                │
│                                                         │
│  Fonts:                                                 │
│  Heading: [Dropdown]  Body: [Dropdown]                 │
│                                                         │
│                    [← Back]  [Next →]                   │
└─────────────────────────────────────────────────────────┘
```

### Step 3: Contact & Social
```
┌─────────────────────────────────────────────────────────┐
│  Contact Information                                    │
│                                                         │
│  Email: [________________________]                      │
│  Phone: [________________________]                      │
│                                                         │
│  Address:                                               │
│  Street: [________________________]                     │
│  City: [____________] State: [__] ZIP: [_____]         │
│                                                         │
│  Social Media (optional):                               │
│  LinkedIn: [________________________]                   │
│  Twitter:  [________________________]                   │
│  Facebook: [________________________]                   │
│                                                         │
│                    [← Back]  [Next →]                   │
└─────────────────────────────────────────────────────────┘
```

### Step 4: Tool Configuration
```
┌─────────────────────────────────────────────────────────┐
│  Configure Your Tools                                   │
│                                                         │
│  Your tools will be branded as: "[ABC] Tools"          │
│                                                         │
│  Enable/Disable Features:                               │
│  ☑ Affiliate Program                                   │
│  ☑ Supplier Search                                     │
│  ☑ Apollo Integration                                  │
│  ☐ AI Workforce                                        │
│  ☑ Proposal Creator                                    │
│  ☑ Document Signing (DocuSeal)                         │
│  ☐ GoHighLevel CRM                                     │
│  ☑ LinkedIn Content                                    │
│  ☑ Bug Tracker                                         │
│  ☑ Traction/EOS Rocks                                  │
│  ☑ Networking System                                   │
│                                                         │
│                    [← Back]  [Next →]                   │
└─────────────────────────────────────────────────────────┘
```

### Step 5: Initiative Setup
```
┌─────────────────────────────────────────────────────────┐
│  Create Your Initiative                                 │
│                                                         │
│  (Based on TMBNC Supplier Initiative template)          │
│                                                         │
│  Initiative Name: [________________________]            │
│  Short Name/Acronym: [________]                        │
│  Description:                                           │
│  [                                                     ]│
│  [                                                     ]│
│                                                         │
│  Target Audience: [________________________]            │
│                                                         │
│  Goals:                                                 │
│  1. [________________________] [+]                     │
│  2. [________________________] [+]                     │
│                                                         │
│                    [← Back]  [Next →]                   │
└─────────────────────────────────────────────────────────┘
```

### Step 6: Domain & Deployment
```
┌─────────────────────────────────────────────────────────┐
│  Domain Configuration                                   │
│                                                         │
│  Primary Domain: [________________________.com]         │
│                                                         │
│  DNS Configuration Required:                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Type  │ Name │ Value                            │   │
│  │ A     │ @    │ 76.76.21.21                     │   │
│  │ CNAME │ www  │ cname.vercel-dns.com            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  SSL Certificate: [Auto-provisioned via Let's Encrypt] │
│                                                         │
│                    [← Back]  [Complete Setup →]         │
└─────────────────────────────────────────────────────────┘
```

### Step 7: Review & Launch
```
┌─────────────────────────────────────────────────────────┐
│  Review Your Configuration                              │
│                                                         │
│  Company: Acme Manufacturing Solutions (AMS)            │
│  Tagline: "Building Tomorrow's Supply Chain"            │
│  Domain: acmemfg.com                                    │
│                                                         │
│  Tools Enabled: 9 of 11                                 │
│  Initiative: "AMS Supplier Excellence Program"          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Preview Site]  [Preview Portal]                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ☑ I confirm all information is correct                │
│                                                         │
│                    [← Back]  [🚀 Launch Platform]       │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Components

### 1. Branding Context Provider

```typescript
// contexts/branding-context.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { BrandingConfig } from "@/lib/branding/config";
import { defaultBrandingConfig } from "@/lib/branding/defaults";

interface BrandingContextType {
  config: BrandingConfig;
  isLoading: boolean;
  toolsLabel: string;
  companyInitials: string;
  getToolName: (baseName: string) => string;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<BrandingConfig>(defaultBrandingConfig);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBranding() {
      try {
        const docRef = doc(db, "brandingSettings", "active");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data().config as BrandingConfig);
        }
      } catch (error) {
        console.error("Error loading branding:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadBranding();
  }, []);

  const toolsLabel = `${config.tools.prefix} Tools`;
  const companyInitials = config.company.initials;
  
  const getToolName = (baseName: string) => {
    // Replace "Adams" with company initials
    return baseName.replace(/Adams/g, config.company.initials);
  };

  return (
    <BrandingContext.Provider value={{ 
      config, 
      isLoading, 
      toolsLabel, 
      companyInitials,
      getToolName 
    }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return context;
}
```

### 2. Dynamic Metadata Generation

```typescript
// lib/branding/metadata.ts
import { Metadata } from "next";
import { getBrandingConfig } from "./config";

export async function generateBrandedMetadata(
  pageTitle?: string,
  pageDescription?: string
): Promise<Metadata> {
  const config = await getBrandingConfig();
  
  return {
    metadataBase: new URL(`https://${config.urls.domain}`),
    title: {
      default: `${config.company.shortName} | ${config.company.tagline}`,
      template: `%s | ${config.company.shortName}`,
    },
    description: pageDescription || config.company.description,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: `https://${config.urls.domain}`,
      siteName: config.company.shortName,
      title: pageTitle || `${config.company.shortName} | ${config.company.tagline}`,
      description: pageDescription || config.company.description,
    },
    // ... rest of metadata
  };
}
```

### 3. CMS-Controlled Page Component

```typescript
// components/cms/dynamic-page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { SiteContentDoc, ContentSection } from "@/lib/schema-whitelabel";
import { HeroSection } from "./sections/hero";
import { FeaturesSection } from "./sections/features";
import { TestimonialsSection } from "./sections/testimonials";
import { CTASection } from "./sections/cta";
// ... other section imports

interface DynamicPageProps {
  pageSlug: string;
}

export function DynamicPage({ pageSlug }: DynamicPageProps) {
  const [content, setContent] = useState<SiteContentDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      const docRef = doc(db, "siteContent", pageSlug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setContent(docSnap.data() as SiteContentDoc);
      }
      setIsLoading(false);
    }
    loadContent();
  }, [pageSlug]);

  if (isLoading) return <PageSkeleton />;
  if (!content) return <NotFound />;

  return (
    <main>
      {content.sections
        .filter(s => s.isVisible)
        .sort((a, b) => a.order - b.order)
        .map(section => renderSection(section))}
    </main>
  );
}

function renderSection(section: ContentSection) {
  switch (section.type) {
    case "hero":
      return <HeroSection key={section.id} {...section} />;
    case "features":
      return <FeaturesSection key={section.id} {...section} />;
    case "testimonials":
      return <TestimonialsSection key={section.id} {...section} />;
    case "cta":
      return <CTASection key={section.id} {...section} />;
    // ... other section types
    default:
      return null;
  }
}
```

### 4. Admin CMS Interface

Create an admin section for managing website content:

```
/portal/admin/cms/
  ├── pages/           # Manage site pages
  ├── navigation/      # Configure menus
  ├── media/           # Upload images/videos
  ├── branding/        # Logo, colors, fonts
  └── initiatives/     # Manage initiative templates
```

---

## 📋 Files to Modify for White-Labeling

### Core Configuration Files
- `app/layout.tsx` - Dynamic metadata from branding config
- `next.config.ts` - Environment-based configuration
- `tailwind.config.ts` - CSS variables from branding colors
- `app/globals.css` - CSS custom properties for theming

### Branding References to Replace
Search and replace these patterns:
- `"Adams Electric"` → `{config.company.shortName}`
- `"Adams"` → `{config.company.initials}`
- `"Adams Tools"` → `{config.tools.toolsLabel}`
- `"TMBNC"` → `{config.tools.supplierInitiative.shortName}`
- `"adams-electric.com"` → `{config.urls.domain}`
- Logo paths → Dynamic from config
- Color hex values → CSS variables

### Component Updates Required
1. **Header/Navigation** - Use dynamic navigation from Firestore
2. **Footer** - Dynamic contact info and links
3. **Sidebar** - Tool names from branding config
4. **Profile Page** - Tool access based on feature flags
5. **All Tool Pages** - Conditional rendering based on features

---

## 🗄️ Database Collections for White-Label

```
Firestore Collections:
├── brandingSettings/     # Active branding configuration
├── siteContent/          # CMS page content
├── navigation/           # Menu configurations
├── initiativeTemplates/  # Reusable initiative templates
├── mediaLibrary/         # Uploaded assets
└── setupWizardProgress/  # Track wizard completion
```

---

## 🚀 Deployment Strategy

### Option 1: Single Codebase, Multiple Deployments
- Each white-label client gets their own Vercel deployment
- Environment variables control branding
- Separate Firebase projects per client

### Option 2: Multi-Tenant Single Deployment
- Single deployment with subdomain routing
- Branding loaded dynamically based on hostname
- Shared Firebase with tenant isolation

### Option 3: Self-Hosted Template
- Provide complete codebase to clients
- They deploy to their own infrastructure
- License-based access to updates

---

## 📝 Environment Variables Template

```env
# Company Branding
NEXT_PUBLIC_COMPANY_NAME="Your Company Name"
NEXT_PUBLIC_COMPANY_SHORT_NAME="YCN"
NEXT_PUBLIC_COMPANY_INITIALS="YCN"
NEXT_PUBLIC_COMPANY_TAGLINE="Your Tagline Here"
NEXT_PUBLIC_DOMAIN="yourcompany.com"

# Feature Flags
NEXT_PUBLIC_ENABLE_AFFILIATES=true
NEXT_PUBLIC_ENABLE_SUPPLIER_SEARCH=true
NEXT_PUBLIC_ENABLE_APOLLO=true
NEXT_PUBLIC_ENABLE_AI_WORKFORCE=false
NEXT_PUBLIC_ENABLE_PROPOSALS=true
NEXT_PUBLIC_ENABLE_DOCUSEAL=true
NEXT_PUBLIC_ENABLE_GOHIGHLEVEL=false
NEXT_PUBLIC_ENABLE_LINKEDIN=true
NEXT_PUBLIC_ENABLE_BUGTRACKER=true
NEXT_PUBLIC_ENABLE_TRACTION=true
NEXT_PUBLIC_ENABLE_NETWORKING=true

# Firebase (per-tenant)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Integrations (optional per tenant)
APOLLO_API_KEY=
GOHIGHLEVEL_API_KEY=
DOCUSEAL_API_KEY=
OPENAI_API_KEY=
```

---

## ✅ Checklist for White-Label Implementation

### Phase 1: Foundation
- [ ] Create `BrandingConfig` interface and types
- [ ] Create `BrandingContext` provider
- [ ] Create default branding configuration
- [ ] Add Firestore collections for branding/CMS
- [ ] Update Firestore security rules

### Phase 2: Dynamic Branding
- [ ] Replace hardcoded company names with config values
- [ ] Replace hardcoded colors with CSS variables
- [ ] Create dynamic logo component
- [ ] Update metadata generation to use branding
- [ ] Create theme switching based on config

### Phase 3: CMS System
- [ ] Create `SiteContent` schema and types
- [ ] Build section renderer components
- [ ] Create admin CMS interface
- [ ] Build page editor with drag-and-drop
- [ ] Add media library management

### Phase 4: Rebranding Wizard
- [ ] Create wizard UI components
- [ ] Build step-by-step flow
- [ ] Add logo upload functionality
- [ ] Create color picker with preview
- [ ] Build feature toggle interface
- [ ] Add initiative template customization
- [ ] Create review and launch flow

### Phase 5: Tool Rebranding
- [ ] Update sidebar to use dynamic tool names
- [ ] Add feature flag checks to all tool pages
- [ ] Create tool access control based on config
- [ ] Update profile page tool section

### Phase 6: Testing & Documentation
- [ ] Test with multiple branding configurations
- [ ] Create documentation for white-label setup
- [ ] Build demo/preview mode
- [ ] Create onboarding guide for new clients

---

## 🎨 Example: Rebranded Platform

**Original (Adams):**
- Company: Adams Electric Solutions
- Initials: Adams
- Tools: Adams Tools
- Initiative: TMBNC Supplier Initiative

**White-Label Example (Acme Manufacturing):**
- Company: Acme Manufacturing Solutions
- Initials: AMS
- Tools: AMS Tools
- Initiative: AMS Supplier Excellence Program

---

---

## 💼 Opportunity Management Features

The platform includes a comprehensive Opportunity management system with the following features that should be white-labeled:

### Opportunity Form Fields

```typescript
interface OpportunityForm {
  // Basic Information
  name: string;
  organizationName: string;
  description: string;
  notes: string;
  
  // Deal Information
  stage: string;                    // lead, discovery, proposal, negotiation, closed-won, closed-lost
  value: string;                    // One-time deal value
  probability: string;              // Auto-calculated from stage
  expectedCloseDate: string;
  
  // Subscription/Recurring Revenue
  isSubscription: boolean;
  monthlyAmount: string;
  subscriptionTermMonths: string;   // 6, 12, 24, 36, 60 months
  
  // Affiliate Assignment
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  affiliatePhone: string;
  affiliateCompany: string;
  
  // Deliverables
  deliverables: string[];           // Array of deliverable items
}
```

### Key Features to Rebrand

1. **AI Enhancement** - "Enhance with AI" buttons for Description and Notes
   - Generates professional narratives using OpenAI/Ollama
   - Context-aware prompts based on opportunity details

2. **Subscription Pricing** - Toggle between one-time and recurring revenue
   - Monthly amount × Term = Total Contract Value
   - Term options: 6, 12, 24, 36, 60 months
   - Real-time calculation display

3. **Affiliate Assignment** - Dropdown to assign opportunities to affiliates
   - Auto-populates contact information
   - Shows avatar, email, phone, company

4. **Deliverables Management** - Dynamic array of deliverable items
   - Add/remove deliverables
   - Keyboard support (Enter to add)

5. **Summary Sidebar** - Real-time deal summary
   - Deal Value / Total Contract Value
   - Probability percentage
   - Weighted Value calculation
   - Subscription indicator

---

## 🔑 Software License Key System

The platform includes a software key system for enabling tool access per white-label deployment:

### Key Format
```
[PREFIX]-XXXX-XXXX-XXXX
Example: ADAMS-A3K9-M7P2-X4L8
```

### Key Schema

```typescript
interface SoftwareKeyDoc {
  id: string;
  key: string;                      // The license key
  name: string;                     // Friendly name
  description?: string;
  
  // Tool Access
  tools: ToolType[];                // Which tools this key enables
  
  // Assignment
  assignedTo?: string;              // User/org ID
  assignedToName?: string;
  assignedToEmail?: string;
  assignmentType?: 'user' | 'organization' | 'affiliate';
  
  // Validity
  status: 'active' | 'inactive' | 'expired' | 'revoked';
  activatedAt?: Timestamp;
  expiresAt?: Timestamp;
  
  // Usage Limits
  maxActivations?: number;
  currentActivations: number;
  
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  notes?: string;
}

type ToolType = 
  | 'apollo-search'
  | 'supplier-search'
  | 'ai-workforce'
  | 'proposal-creator'
  | 'docuseal'
  | 'gohighlevel'
  | 'linkedin-content'
  | 'bug-tracker'
  | 'traction'
  | 'networking'
  | 'calendar'
  | 'all-tools';
```

### Key Management Features
- Generate keys with custom prefix (company initials)
- Assign to users, organizations, or affiliates
- Set expiration dates
- Limit activations
- Revoke/reactivate keys
- Track usage

---

## 🏢 White-Label Deployment Management

### Deployment Schema

```typescript
interface WhiteLabelDeploymentDoc {
  id: string;
  
  // Deployment Identity
  name: string;                     // "Acme Manufacturing Platform"
  slug: string;                     // "acme-mfg" (used in URLs)
  status: 'pending' | 'provisioning' | 'active' | 'suspended' | 'terminated';
  
  // Branding Configuration
  branding: BrandingConfig;
  
  // Domain Configuration
  domains: {
    primary: string;                // "acmemfg.com"
    portal?: string;                // "portal.acmemfg.com" or null
    api?: string;                   // "api.acmemfg.com" or null
    customDomains?: string[];       // Additional custom domains
  };
  
  // Infrastructure
  infrastructure: {
    provider: 'vercel' | 'netlify' | 'self-hosted';
    projectId?: string;             // Vercel/Netlify project ID
    deploymentUrl?: string;         // Current deployment URL
    firebaseProjectId?: string;     // Dedicated Firebase project
    region?: string;                // Deployment region
  };
  
  // License & Billing
  license: {
    type: 'trial' | 'starter' | 'professional' | 'enterprise';
    startDate: Timestamp;
    endDate?: Timestamp;
    maxUsers?: number;
    maxAffiliates?: number;
    softwareKeys: string[];         // IDs of assigned software keys
  };
  
  // Feature Overrides
  features: {
    enabledTools: ToolType[];
    customFeatures?: Record<string, boolean>;
  };
  
  // Contact Information
  owner: {
    userId: string;
    name: string;
    email: string;
    phone?: string;
    company: string;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  provisionedAt?: Timestamp;
  lastActivityAt?: Timestamp;
  notes?: string;
}
```

### Deployment Management Admin UI

```
/portal/admin/white-label/
  ├── deployments/        # List all white-label deployments
  │   ├── [id]/          # Individual deployment details
  │   │   ├── settings/  # Branding & configuration
  │   │   ├── domains/   # Domain management
  │   │   ├── keys/      # Software keys for this deployment
  │   │   ├── users/     # Users in this deployment
  │   │   └── analytics/ # Usage analytics
  │   └── new/           # Create new deployment
  ├── templates/          # Deployment templates
  └── billing/            # License & billing management
```

### Deployment Lifecycle

```
┌─────────────┐    ┌──────────────┐    ┌─────────┐
│   Pending   │ -> │ Provisioning │ -> │  Active │
└─────────────┘    └──────────────┘    └─────────┘
                                            │
                                            v
                   ┌──────────────┐    ┌───────────┐
                   │  Terminated  │ <- │ Suspended │
                   └──────────────┘    └───────────┘
```

### Multi-Deployment Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  White-Label Deployments                              [+ New Deployment] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Stats:  Total: 12  │  Active: 8  │  Trial: 3  │  Suspended: 1          │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🏢 Acme Manufacturing                              [Active] ●    │   │
│  │    acmemfg.com  •  Enterprise  •  15 users  •  Last: 2 hrs ago  │   │
│  │    [Manage] [View Site] [Analytics]                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🏢 TechParts Inc                                   [Active] ●    │   │
│  │    techparts.io  •  Professional  •  8 users  •  Last: 5 min    │   │
│  │    [Manage] [View Site] [Analytics]                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🏢 Midwest Suppliers                               [Trial] ⏱     │   │
│  │    midwestsuppliers.com  •  Trial (12 days left)  •  3 users    │   │
│  │    [Manage] [View Site] [Convert to Paid]                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Updated Database Collections

```
Firestore Collections:
├── brandingSettings/         # Active branding configuration
├── siteContent/              # CMS page content
├── navigation/               # Menu configurations
├── initiativeTemplates/      # Reusable initiative templates
├── mediaLibrary/             # Uploaded assets
├── setupWizardProgress/      # Track wizard completion
├── softwareKeys/             # License keys
├── keyActivations/           # Key usage tracking
├── whiteLabelDeployments/    # White-label deployment configs
├── deploymentAnalytics/      # Usage analytics per deployment
└── deploymentAuditLogs/      # Audit trail for deployments
```

---

## ✅ Updated Checklist

### Phase 1: Foundation
- [x] Create `BrandingConfig` interface and types
- [x] Create `BrandingContext` provider
- [x] Create default branding configuration
- [x] Add Firestore collections for branding/CMS
- [x] Update Firestore security rules

### Phase 2: Dynamic Branding
- [x] Replace hardcoded company names with config values
- [x] Replace hardcoded colors with CSS variables
- [x] Create dynamic logo component
- [x] Update metadata generation to use branding
- [x] Create theme switching based on config

### Phase 3: CMS System
- [x] Create `SiteContent` schema and types
- [x] Build section renderer components
- [x] Create admin CMS interface
- [ ] Build page editor with drag-and-drop
- [ ] Add media library management

### Phase 4: Rebranding Wizard
- [x] Create wizard UI components
- [x] Build step-by-step flow
- [ ] Add logo upload functionality
- [x] Create color picker with preview
- [x] Build feature toggle interface
- [x] Add initiative template customization
- [x] Create review and launch flow

### Phase 5: Tool Rebranding
- [x] Update sidebar to use dynamic tool names
- [x] Add feature flag checks to all tool pages
- [x] Create tool access control based on config
- [x] Update profile page tool section

### Phase 6: Opportunity System
- [x] Subscription/recurring revenue support
- [x] AI enhancement for descriptions/notes
- [x] Affiliate assignment with contact info
- [x] Deliverables array management
- [x] Real-time summary calculations

### Phase 7: License Key System
- [x] Key generation utility
- [x] Key validation and activation
- [x] Admin UI for key management
- [x] Tool access control via keys
- [ ] Key activation tracking

### Phase 8: Multi-Deployment Management
- [ ] Deployment schema and types
- [ ] Deployment CRUD operations
- [ ] Admin dashboard for deployments
- [ ] Domain configuration management
- [ ] Deployment provisioning automation
- [ ] Usage analytics per deployment
- [ ] Billing integration

### Phase 9: Testing & Documentation
- [ ] Test with multiple branding configurations
- [ ] Create documentation for white-label setup
- [ ] Build demo/preview mode
- [ ] Create onboarding guide for new clients

---

## 📞 Support

For questions about implementing this white-label template, contact the development team or refer to the technical documentation in `/docs/technical/`.
