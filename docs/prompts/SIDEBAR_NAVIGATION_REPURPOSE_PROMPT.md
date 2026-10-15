# Sidebar Navigation Structure Repurpose Prompt

## Overview

This prompt provides a comprehensive blueprint for repurposing the left navigation sidebar structure from the Adams Electric (Adams) Platform to a similar application. The sidebar uses a modular, role-based visibility system with collapsible sections and feature flags.

---

## Architecture Components

### 1. Core Files to Create/Modify

| File | Purpose |
|------|---------|
| `components/portal/portal-sidebar.tsx` | Main sidebar component with navigation items |
| `lib/feature-visibility.ts` | Feature flags and role-based visibility system |
| `contexts/feature-visibility-context.tsx` | React context for visibility state |
| `components/ui/sidebar.tsx` | Reusable sidebar UI components (shadcn/ui based) |

---

## Navigation Structure

### Section Categories

The sidebar is organized into the following collapsible sections:

```typescript
// Section definitions
export const SECTIONS = {
  navigation: { label: "Navigation" },        // Primary navigation items
  work: { label: "Work" },                    // Work-related tools
  intelligence: { label: "Intelligence" },   // AI/Analytics features
  admin: { label: "Admin" },                  // Administrative functions
  initiatives: { label: "Initiatives" },     // Special projects/initiatives
  other: { label: "Other" },                  // Uncategorized items (for future organization)
} as const;
```

---

## Current Navigation Items by Section

### System Management
| Item | Route | Icon | Feature Key | Description |
|------|-------|------|-------------|-------------|
| Bug Tracker | `/portal/bug-tracker` | Bug | `bugTracker` | Issue tracking system |
| System Documentation | `/portal/system-docs` | BookOpen | `systemDocs` | Platform documentation |

### Project Management
| Item | Route | Icon | Feature Key | Badge | Description |
|------|-------|------|-------------|-------|-------------|
| Opportunities | `/portal/opportunities` | Target | `opportunities` | - | Sales pipeline management |
| Projects | `/portal/projects` | FolderKanban | `projects` | - | Project tracking |
| Calendar | `/portal/calendar` | Calendar | `calendar` | - | Event scheduling |
| Meetings | `/portal/meetings` | Users | `meetings` | - | Meeting management |
| Availability | `/portal/availability` | CalendarDays | `availability` | - | Schedule availability |
| Proposal Creator | `/portal/proposals` | FileText | `proposals` | AI | AI-powered proposals |
| AI Workforce | `/portal/ai-workforce` | Bot | `aiWorkforce` | AI | AI employee management |
| Events | `/portal/admin/events` | Ticket | `events` | - | Event management |
| EOS2 Dashboard | `/portal/eos2` | Target | `eos2` | EOS | EOS methodology tools |
| Rocks | `/portal/rocks` | CheckSquare | `rocks` | - | Goal tracking |

### Data
| Item | Route | Icon | Feature Key | Badge | Description |
|------|-------|------|-------------|-------|-------------|
| Apollo Search | `/portal/apollo-search` | Search | `apolloSearch` | AI | Lead search tool |
| Supplier Search | `/portal/supplier-search` | Factory | `supplierSearch` | AI | Supplier database |

### People
| Item | Route | Icon | Feature Key | Description |
|------|-------|------|-------------|-------------|
| Team Members | `/portal/admin/team-members` | UserCog | `teamMembers` | Team management |
| Affiliates | `/portal/affiliates` | Users | `affiliates` | Affiliate network |
| Customers | `/portal/customers` | Building | `customers` | Customer database |

### Productivity
| Item | Route | Icon | Feature Key | Description |
|------|-------|------|-------------|-------------|
| Networking | `/portal/networking` | Handshake | `networking` | Networking tracker |
| Deals | `/portal/deals` | DollarSign | `deals` | Deal pipeline |

### Affiliate Center
| Item | Route | Icon | Feature Key | Description |
|------|-------|------|-------------|-------------|
| Affiliates | `/portal/affiliates` | UsersRound | `affiliates` | Affiliate directory |
| Networking | `/portal/networking` | Network | `networking` | Network connections |
| Deals | `/portal/deals` | Briefcase | `deals` | Deal management |

### Content
| Item | Route | Icon | Feature Key | Description |
|------|-------|------|-------------|-------------|
| Documents | `/portal/documents` | FileText | `documents` | Document management |

### Admin
| Item | Route | Icon | Feature Key | Badge | Description |
|------|-------|------|-------------|-------|-------------|
| GoHighLevel | `/portal/gohighlevel` | Plug | `gohighlevel` | CRM | CRM integration |
| Page Designer | `/portal/admin/page-designer` | Paintbrush | `pageDesigner` | - | Visual page builder |
| Academy Admin | `/portal/admin/academy` | GraduationCap | `academyAdmin` | - | Learning management |
| Backup & Restore | `/portal/admin/backups` | Database | `backups` | - | Data backup system |

### Other (Uncategorized - For Future Organization)
| Item | Route | Icon | Feature Key | Description |
|------|-------|------|-------------|-------------|
| Command Center | `/portal/command-center` | LayoutDashboard | `commandCenter` | Main dashboard |
| LinkedIn Content | `/portal/linkedin-content` | Linkedin | `linkedinContent` | Social content |
| DocuSeal | `/portal/docuseal` | FileSignature | `docuseal` | Document signing |
| Adams Tools | `/portal/adams-tools` | Sparkles | `adamsTools` | Utility tools |
| Ask AdamsBrain | `/portal/ask` | Sparkles | `askAdamsBrain` | AI assistant |
| Book Call Leads | `/portal/admin/book-call-leads` | Phone | `bookCallLeads` | Lead management |
| Strategic Partners | `/portal/admin/strategic-partners` | Building2 | `strategicPartners` | Partner management |
| Hero Management | `/portal/admin/hero` | ImageIcon | `heroManagement` | Homepage hero |
| Contact Popup | `/portal/admin/popup` | MessageSquare | `contactPopup` | Contact form config |
| Growth IQ Quiz | `/portal/admin/quiz` | Battery | `growthIqQuiz` | Assessment tool |
| Image Manager | `/portal/admin/images` | ImageIcon | `imageManager` | Media library |
| Initiatives | `/portal/admin/initiatives` | Rocket | `initiatives` | Initiative tracking |
| TBMNC Suppliers | `/portal/admin/initiatives/tbmnc` | Factory | `tbmncSuppliers` | Supplier initiative |

---

## Feature Visibility System

### Role Types

```typescript
export type UserRole = "superadmin" | "admin" | "team" | "affiliate" | "consultant";
```

### Feature Definition Structure

```typescript
export const SIDEBAR_FEATURES = {
  featureKey: { 
    label: "Display Name", 
    section: "sectionKey", 
    href: "/route/path" 
  },
  // ... more features
} as const;

export type FeatureKey = keyof typeof SIDEBAR_FEATURES;
```

### Default Role Visibility Pattern

```typescript
export const DEFAULT_ROLE_VISIBILITY: Record<UserRole, {
  features: Record<FeatureKey, boolean>;
  sections: Record<SectionKey, boolean>;
}> = {
  superadmin: {
    features: { /* all true */ },
    sections: { /* all true */ },
  },
  admin: {
    features: { /* all true */ },
    sections: { /* all true */ },
  },
  team: {
    features: {
      // Explicitly set each feature
      commandCenter: true,
      opportunities: true,
      projects: true,
      // ... etc
    },
    sections: { /* all true */ },
  },
  affiliate: {
    features: {
      // Limited access
      commandCenter: true,
      opportunities: true,
      documents: true,
      // Admin features: false
      heroManagement: false,
      // ... etc
    },
    sections: {
      navigation: true,
      work: true,
      intelligence: true,
      admin: false,  // Hide admin section
      initiatives: false,
    },
  },
  consultant: {
    features: { /* custom access */ },
    sections: { /* custom access */ },
  },
};
```

---

## Navigation Item Structure

### TypeScript Interface

```typescript
interface NavItem {
  title: string;           // Display name
  href: string;            // Route path
  icon: React.ElementType; // Lucide icon component
  badge?: string;          // Optional badge (e.g., "AI", "CRM", "EOS")
  featureKey: FeatureKey;  // Feature visibility key
}
```

### Example Item Array

```typescript
const projectManagementItems: NavItem[] = [
  {
    title: "Opportunities",
    href: "/portal/opportunities",
    icon: Target,
    featureKey: "opportunities",
  },
  {
    title: "Proposal Creator",
    href: "/portal/proposals",
    icon: FileText,
    badge: "AI",
    featureKey: "proposals",
  },
];
```

---

## Sidebar Component Structure

### Main Component Pattern

```tsx
export function PortalSidebar() {
  const pathname = usePathname();
  const { canSeeFeature, canSeeSection } = useFeatureVisibility();

  // Filter items based on visibility
  const visibleItems = items.filter(item => canSeeFeature(item.featureKey));

  return (
    <Sidebar>
      <SidebarHeader>
        {/* Logo and branding */}
      </SidebarHeader>
      
      <SidebarContent>
        {/* Collapsible sections */}
        {canSeeSection("navigation") && (
          <CollapsibleSection title="Navigation" items={navigationItems} />
        )}
        {canSeeSection("work") && (
          <CollapsibleSection title="Work" items={workItems} />
        )}
        {/* ... more sections */}
      </SidebarContent>
      
      <SidebarFooter>
        {/* User profile dropdown */}
      </SidebarFooter>
    </Sidebar>
  );
}
```

### Collapsible Section Pattern

```tsx
function CollapsibleSection({ title, items }: { title: string; items: NavItem[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const { canSeeFeature } = useFeatureVisibility();
  
  const visibleItems = items.filter(item => canSeeFeature(item.featureKey));
  
  if (visibleItems.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger>
        <SidebarGroupLabel>
          {title}
          <ChevronDown className={cn("transition-transform", isOpen && "rotate-180")} />
        </SidebarGroupLabel>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenu>
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                  {item.badge && <Badge>{item.badge}</Badge>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

---

## Required Dependencies

```json
{
  "dependencies": {
    "lucide-react": "^0.x.x",
    "@radix-ui/react-collapsible": "^1.x.x",
    "@radix-ui/react-dropdown-menu": "^2.x.x",
    "@radix-ui/react-avatar": "^1.x.x",
    "next": "^14.x.x",
    "react": "^18.x.x"
  }
}
```

---

## Icon Mapping Reference

```typescript
import {
  // Navigation
  LayoutDashboard,  // Dashboard/Command Center
  Target,           // Opportunities, Goals
  FolderKanban,     // Projects
  Users,            // Team, Meetings
  Building,         // Customers, Organizations
  
  // Calendar/Time
  Calendar,         // Calendar
  CalendarDays,     // Availability
  CalendarClock,    // Scheduling
  
  // Documents
  FileText,         // Documents, Proposals
  FileSignature,    // Contracts, Signing
  BookOpen,         // Documentation
  
  // People
  UserCog,          // Team Members, Settings
  UsersRound,       // Affiliates
  Building2,        // Partners
  
  // Business
  DollarSign,       // Deals, Revenue
  Handshake,        // Networking
  Briefcase,        // Business, Deals
  Network,          // Connections
  
  // Tools
  Search,           // Search features
  Factory,          // Suppliers, Manufacturing
  Plug,             // Integrations
  Bot,              // AI features
  Sparkles,         // AI, Special features
  
  // Admin
  Settings,         // Settings
  Shield,           // Security
  Database,         // Backups, Data
  Paintbrush,       // Design, Customization
  GraduationCap,    // Learning, Academy
  ImageIcon,        // Images, Media
  
  // Status
  Bug,              // Bug tracking
  CheckSquare,      // Tasks, Todos
  Ticket,           // Events, Tickets
  Rocket,           // Initiatives, Launch
  Battery,          // Progress, Quiz
  
  // Communication
  MessageSquare,    // Messages, Chat
  Bell,             // Notifications
  Phone,            // Calls, Leads
  Linkedin,         // Social, LinkedIn
  
  // Actions
  LogOut,           // Logout
  ChevronDown,      // Expand/Collapse
  ChevronUp,        // Collapse/Expand
  ChevronRight,     // Navigate
} from "lucide-react";
```

---

## Implementation Steps

### Step 1: Set Up Feature Visibility System

1. Create `lib/feature-visibility.ts` with feature definitions
2. Define role-based default visibility
3. Create Firestore collection for dynamic settings (optional)

### Step 2: Create Visibility Context

1. Create `contexts/feature-visibility-context.tsx`
2. Implement `canSeeFeature()` and `canSeeSection()` hooks
3. Add preview mode for testing visibility

### Step 3: Build Sidebar Component

1. Create navigation item arrays for each section
2. Implement collapsible sections
3. Add active state highlighting
4. Include user profile dropdown in footer

### Step 4: Add Dynamic Features

1. Real-time badge counts (e.g., unread notifications)
2. Role-based section visibility
3. Persistent collapse state (localStorage)

### Step 5: Style and Polish

1. Apply consistent theming
2. Add hover/active states
3. Implement responsive behavior
4. Add loading skeletons

---

## Customization Points

### Adding New Navigation Items

1. Add feature key to `SIDEBAR_FEATURES`
2. Add to appropriate item array in sidebar component
3. Update `DEFAULT_ROLE_VISIBILITY` for each role
4. Create the corresponding page/route

### Adding New Sections

1. Add section to `SECTIONS` constant
2. Create item array for the section
3. Add collapsible section to sidebar component
4. Update role visibility defaults

### Adding New Roles

1. Add role to `UserRole` type
2. Define feature visibility in `DEFAULT_ROLE_VISIBILITY`
3. Update any role-specific logic

---

## Best Practices

1. **Feature Keys**: Use camelCase, descriptive names
2. **Icons**: Use consistent icon style (Lucide recommended)
3. **Badges**: Use sparingly for important indicators
4. **Sections**: Group logically, limit to 5-7 items per section
5. **Visibility**: Default to restrictive, grant access explicitly
6. **Routes**: Use consistent URL patterns (`/portal/[section]/[feature]`)

---

## Notes

- The "Other" section is reserved for items that don't fit existing categories
- Review and reorganize "Other" items periodically
- Consider user feedback when organizing navigation
- Test visibility with each role before deployment
