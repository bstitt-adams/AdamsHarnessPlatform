"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Search,
  Target,
  FolderKanban,
  Calendar,
  Users,
  FileText,
  Bot,
  Ticket,
  CheckSquare,
  Factory,
  UserCog,
  Building,
  DollarSign,
  Plug,
  Paintbrush,
  GraduationCap,
  Shield,
  Bug,
  Settings,
  Bell,
  Database,
  Sparkles,
  CalendarClock,
  Award,
  Truck,
  ClipboardList,
  Package,
  HardHat,
  Mail,
  Building2,
  Rocket,
  Wrench,
  ArrowRightLeft,
  Presentation,
  ImageIcon,
  Menu,
  Network,
  Quote,
} from "lucide-react";

interface FeatureDoc {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  description: string;
  features: string[];
  usage: string;
  relatedPages?: string[];
}

const systemDocumentation: FeatureDoc[] = [
  // Adams Electric
  {
    id: "bug-tracker",
    title: "Bug Tracker",
    category: "Adams Electric",
    icon: Bug,
    description: "Track and manage platform bugs, issues, and feature requests across Adams Electric with priority levels, status tracking, and assignments.",
    features: [
      "Create and manage bug reports and feature requests",
      "Assign priority levels (Critical, High, Medium, Low)",
      "Track status (Open, In Progress, Resolved, Closed)",
      "Filter and search items by status, priority, or type",
      "Real-time Firestore updates",
    ],
    usage: "Navigate to Adams Electric → Bug Tracker to report or review platform issues and enhancement requests.",
    relatedPages: ["/portal/bug-tracker"],
  },
  {
    id: "system-docs",
    title: "System Documentation",
    category: "Adams Electric",
    icon: BookOpen,
    description: "Reference documentation for all active Adams Platform modules, organized by portal section.",
    features: [
      "Documentation for active Adams Platform modules",
      "Searchable module index",
      "Category-based filtering matching the portal sidebar",
      "Usage instructions and direct route references",
    ],
    usage: "Use the search bar or category tabs above to filter Adams Platform modules.",
    relatedPages: ["/portal/system-docs"],
  },
  {
    id: "command-control",
    title: "Command Control",
    category: "Adams Electric",
    icon: Target,
    description: "Centralized pipeline and opportunity tracking for Adams Electric construction pursuits and strategic initiatives.",
    features: [
      "Track active pursuits and opportunities across stages",
      "Monitor estimated values, probabilities, and close dates",
      "Filter by stage and search across opportunities",
      "Activity logging on pipeline updates",
    ],
    usage: "Navigate to Adams Electric → Command Control to review and manage active opportunities.",
    relatedPages: ["/portal/opportunities"],
  },
  {
    id: "projects",
    title: "Projects",
    category: "Adams Electric",
    icon: FolderKanban,
    description: "Manage active Adams Electric projects, milestones, tasks, and delivery status.",
    features: [
      "Create and track construction and internal projects",
      "Manage project milestones and task assignments",
      "Track project health and completion progress",
      "Collaborate across project delivery teams",
    ],
    usage: "Navigate to Adams Electric → Projects to create or manage projects and milestones.",
    relatedPages: ["/portal/projects"],
  },
  {
    id: "calendar",
    title: "Adams Master Calendar",
    category: "Adams Electric",
    icon: Calendar,
    description: "Unified master calendar for Adams Electric meetings, milestones, deadlines, and scheduled events.",
    features: [
      "Month, week, and day calendar views",
      "Event creation and scheduling",
      "Synchronization with portal Meetings",
      "Color-coded event categories and reminders",
    ],
    usage: "Navigate to Adams Electric → Adams Master Calendar to view or schedule company-wide events.",
    relatedPages: ["/portal/calendar"],
  },
  {
    id: "meetings",
    title: "Meetings",
    category: "Adams Electric",
    icon: Users,
    description: "Schedule and manage internal and project meetings with notes, attendees, action items, and Adams Master Calendar sync.",
    features: [
      "Create, edit, and delete scheduled meetings",
      "Automatic sync with Adams Master Calendar",
      "Track attendees, video links, and locations",
      "Record meeting notes and follow-up action items",
    ],
    usage: "Navigate to Adams Electric → Meetings to schedule meetings and manage meeting notes.",
    relatedPages: ["/portal/meetings", "/portal/calendar"],
  },
  {
    id: "proposals",
    title: "Proposal Creator",
    category: "Adams Electric",
    icon: FileText,
    description: "AI-assisted proposal, scope, and document builder for Adams Electric bids and project documentation.",
    features: [
      "AI-assisted drafting for proposals and scopes of work",
      "Reusable templates and structured document wizard",
      "PDF export and version tracking",
    ],
    usage: "Navigate to Adams Electric → Proposal Creator to launch the proposal wizard.",
    relatedPages: ["/portal/proposals"],
  },
  {
    id: "events",
    title: "Events",
    category: "Adams Electric",
    icon: Ticket,
    description: "Manage Adams Electric training events, company gatherings, workshops, and attendee registrations.",
    features: [
      "Create and publish events with custom landing pages",
      "Manage registration tiers and attendee lists",
      "Track event schedules, speakers, and venues",
    ],
    usage: "Navigate to Adams Electric → Events to create and manage events.",
    relatedPages: ["/portal/admin/events", "/events"],
  },
  {
    id: "deals",
    title: "Deals",
    category: "Adams Electric",
    icon: DollarSign,
    description: "Track commercial deals, contract values, stages, and close timelines.",
    features: [
      "Deal pipeline and stage management",
      "Contract value and probability tracking",
      "Win/loss and close-date reporting",
    ],
    usage: "Navigate to Adams Electric → Deals to manage commercial deals.",
    relatedPages: ["/portal/deals"],
  },
  {
    id: "supplier-search",
    title: "Supplier Search",
    category: "Adams Electric",
    icon: Factory,
    description: "AI-assisted supplier and vendor discovery for electrical materials, prefabrication, and jobsite procurement.",
    features: [
      "Search and filter electrical suppliers and vendors",
      "Save supplier lists and vendor profiles",
      "Review supplier capabilities and contact details",
    ],
    usage: "Navigate to Adams Electric → Supplier Search to find and save qualified suppliers.",
    relatedPages: ["/portal/supplier-search"],
  },
  {
    id: "team-members",
    title: "Team Members",
    category: "Adams Electric",
    icon: UserCog,
    description: "Directory and role management for Adams Electric team members, admins, and Firebase Authentication linking.",
    features: [
      "Manage team member profiles, departments, and roles",
      "Sync Firebase Authentication users with Team Member records",
      "Create new Firebase Auth users and Team Member records in one step",
      "Role-based access control (SuperAdmin, Admin, Team Member)",
    ],
    usage: "Navigate to Adams Electric → Team Members to manage users, roles, and Firebase Auth synchronization.",
    relatedPages: ["/portal/admin/team-members"],
  },
  {
    id: "affiliates",
    title: "Affiliates",
    category: "Adams Electric",
    icon: Users,
    description: "Manage external trade partners and affiliate relationships.",
    features: [
      "Partner directory and profile management",
      "Capability and referral tracking",
    ],
    usage: "Navigate to Adams Electric → Affiliates to view and manage external partners.",
    relatedPages: ["/portal/affiliates"],
  },
  {
    id: "customers",
    title: "Customers",
    category: "Adams Electric",
    icon: Building,
    description: "Manage general contractors, project owners, and customer accounts served by Adams Electric.",
    features: [
      "Customer and account directory",
      "Contact and project interaction history",
      "Account status and notes",
    ],
    usage: "Navigate to Adams Electric → Customers to manage customer accounts.",
    relatedPages: ["/portal/customers"],
  },
  {
    id: "documents",
    title: "Documents",
    category: "Adams Electric",
    icon: FileText,
    description: "Centralized repository for Adams Electric SOPs, safety documents, specifications, and project files.",
    features: [
      "Upload, organize, and download company documents",
      "Category and tag filtering",
      "Version and metadata tracking",
    ],
    usage: "Navigate to Adams Electric → Documents to upload or browse company documents.",
    relatedPages: ["/portal/documents"],
  },
  {
    id: "gohighlevel",
    title: "GoHighLevel",
    category: "Adams Electric",
    icon: Plug,
    description: "CRM connection and workflow management for GoHighLevel.",
    features: [
      "CRM contact and pipeline synchronization",
      "Workflow and automation management",
    ],
    usage: "Navigate to Adams Electric → GoHighLevel to manage CRM settings.",
    relatedPages: ["/portal/gohighlevel"],
  },
  {
    id: "ghl-migration",
    title: "GHL Integration",
    category: "Adams Electric",
    icon: ArrowRightLeft,
    description: "Data migration and sync utilities for GoHighLevel.",
    features: [
      "Import and synchronize CRM records",
      "Review sync logs and migration status",
    ],
    usage: "Navigate to Adams Electric → GHL Integration to run or inspect CRM syncs.",
    relatedPages: ["/portal/admin/ghl-migration"],
  },
  {
    id: "hero-management",
    title: "Hero Carousel",
    category: "Adams Electric",
    icon: Presentation,
    description: "Manage marketing hero slides and featured banners.",
    features: [
      "Create, reorder, and publish hero slides",
      "Configure headlines, calls to action, and imagery",
    ],
    usage: "Navigate to Adams Electric → Hero Carousel to edit hero banners.",
    relatedPages: ["/portal/admin/hero"],
  },
  {
    id: "image-manager",
    title: "Image Manager",
    category: "Adams Electric",
    icon: ImageIcon,
    description: "Manage platform media assets and images.",
    features: [
      "Upload, preview, and organize platform images",
      "Copy asset references for pages and courses",
    ],
    usage: "Navigate to Adams Electric → Image Manager to manage uploaded images.",
    relatedPages: ["/portal/admin/images"],
  },
  {
    id: "academy",
    title: "Academy",
    category: "Adams Electric",
    icon: GraduationCap,
    description: "Adams Electric learning portal for electrical construction, preconstruction, BIM, field leadership, and safety training.",
    features: [
      "Browse courses by category and skill level",
      "Complete lessons and quizzes",
      "Earn branded Adams Electric completion certificates",
    ],
    usage: "Navigate to Adams Electric → Academy or /academy to access training courses.",
    relatedPages: ["/academy", "/academy/courses"],
  },
  {
    id: "academy-admin",
    title: "Academy Admin",
    category: "Adams Electric",
    icon: GraduationCap,
    description: "Course management, curriculum development, learner tracking, and certificate administration for Adams Learning Academy.",
    features: [
      "Create and edit courses, modules, and lessons",
      "Track employee course enrollments and completion metrics",
      "Issue and verify branded Adams Electric certificates",
    ],
    usage: "Navigate to Adams Electric → Academy Admin to manage courses, tracking, and certificates.",
    relatedPages: [
      "/portal/admin/academy",
      "/portal/admin/academy/tracking",
      "/portal/admin/academy/certificates",
    ],
  },
  {
    id: "navigation-manager",
    title: "Navigation Manager",
    category: "Adams Electric",
    icon: Menu,
    description: "Configure site navigation menus and links.",
    features: [
      "Manage public header and footer navigation items",
      "Order and toggle visibility of menu links",
    ],
    usage: "Navigate to Adams Electric → Navigation Manager to customize navigation links.",
    relatedPages: ["/portal/admin/navigation"],
  },
  {
    id: "revenue-config",
    title: "Revenue Config",
    category: "Adams Electric",
    icon: DollarSign,
    description: "Configure financial targets and revenue reporting parameters.",
    features: [
      "Set revenue goals and reporting thresholds",
      "Manage financial categories",
    ],
    usage: "Navigate to Adams Electric → Revenue Config to update financial settings.",
    relatedPages: ["/portal/admin/revenue"],
  },
  {
    id: "alignable",
    title: "Alignable",
    category: "Adams Electric",
    icon: Network,
    description: "Manage Alignable business network integration.",
    features: [
      "Connect and track Alignable partner activity",
    ],
    usage: "Navigate to Adams Electric → Alignable to configure the integration.",
    relatedPages: ["/portal/admin/alignable"],
  },
  {
    id: "backups",
    title: "Backup & Restore",
    category: "Adams Electric",
    icon: Database,
    description: "Database backup and restore management for Firestore collections.",
    features: [
      "Full and selective Firestore collection backups",
      "Cloud storage export and scheduled backups",
      "Backup history and integrity verification",
    ],
    usage: "Navigate to Adams Electric → Backup & Restore to run or schedule database backups.",
    relatedPages: ["/portal/admin/backups"],
  },
  {
    id: "success-stories",
    title: "Success Stories",
    category: "Adams Electric",
    icon: Quote,
    description: "Manage featured project highlights and client testimonials.",
    features: [
      "Create and publish project success stories",
      "Manage quotes, metrics, and featured status",
    ],
    usage: "Navigate to Adams Electric → Success Stories to add or edit testimonials.",
    relatedPages: ["/portal/admin/success-stories"],
  },
  {
    id: "superadmin",
    title: "SuperAdmin Controls",
    category: "Adams Electric",
    icon: Shield,
    description: "Role-based feature visibility and system-wide administrative controls (SuperAdmin only).",
    features: [
      "Toggle sidebar sections and modules per user role",
      "Preview the portal as different roles or team members",
      "Manage global platform security and configuration",
    ],
    usage: "Navigate to Adams Electric → SuperAdmin Controls to configure role visibility.",
    relatedPages: ["/portal/admin/superadmin"],
  },

  // Project Management
  {
    id: "solutions",
    title: "Solutions",
    category: "Project Management",
    icon: FileText,
    description: "Review AI process interviews, generate versioned solution specifications, and manage department owner approvals.",
    features: [
      "View public and internal requirements interviews",
      "Inspect captured process facts and topic coverage",
      "Generate and approve versioned solution specifications",
      "Full audit trail of interview and specification actions",
    ],
    usage: "Navigate to Project Management → Solutions to review process interviews and approve specifications.",
    relatedPages: ["/portal/solutions", "/interview"],
  },
  {
    id: "modules",
    title: "Modules",
    category: "Project Management",
    icon: Database,
    description: "Run and manage deployed Adams Platform workflow modules built from approved specifications.",
    features: [
      "Access active department workflow modules",
      "Create, update, and track module records",
      "Execute scheduled module automations",
    ],
    usage: "Navigate to Project Management → Modules to use deployed internal workflow modules.",
    relatedPages: ["/portal/modules"],
  },
  {
    id: "module-notifications",
    title: "Module Alerts",
    category: "Project Management",
    icon: Bell,
    description: "Notifications, escalations, and due-date alerts generated by Adams Platform modules.",
    features: [
      "View overdue reminders and supervisor escalations",
      "Track notification delivery status",
      "Filter alerts by module and severity",
    ],
    usage: "Navigate to Project Management → Module Alerts to review active workflow notifications.",
    relatedPages: ["/portal/module-notifications"],
  },
  {
    id: "adams-brain",
    title: "AdamsBrain",
    category: "Project Management",
    icon: Sparkles,
    description: "AI knowledge assistant grounded in Adams Electric documents, SOPs, and department knowledge bases.",
    features: [
      "Ask natural-language questions against indexed company knowledge",
      "Source citations from uploaded AdamsBrain documents",
      "Department-scoped knowledge retrieval",
    ],
    usage: "Navigate to Project Management → AdamsBrain to query the internal AI knowledge base.",
    relatedPages: ["/portal/adams-brain"],
  },
  {
    id: "ai-workforce",
    title: "AI Workforce",
    category: "Project Management",
    icon: Bot,
    description: "Specialized AI agents configured to assist Adams Electric teams with drafting, analysis, and operations.",
    features: [
      "Role-specific AI assistants",
      "Interactive chat with operational context",
      "Task delegation and saved conversation history",
    ],
    usage: "Navigate to Project Management → AI Workforce to collaborate with AI assistants.",
    relatedPages: ["/portal/ai-workforce"],
  },
  {
    id: "eos2",
    title: "EOS2 Dashboard",
    category: "Project Management",
    icon: Target,
    description: "Traction / EOS operating dashboard for tracking quarterly Rocks, scorecard metrics, Issues (IDS), and Level 10 meetings.",
    features: [
      "Quarterly Rock progress tracking",
      "Weekly scorecard metrics",
      "Issues list and To-Dos management",
      "Meeting pulse and accountability tracking",
    ],
    usage: "Navigate to Project Management → EOS2 Dashboard to manage EOS rocks, scorecard metrics, and issues.",
    relatedPages: ["/portal/eos2"],
  },
  {
    id: "action-items",
    title: "Action Items",
    category: "Project Management",
    icon: CheckSquare,
    description: "Track quarterly priorities, Rocks, and assigned action items across Adams Electric teams.",
    features: [
      "Create and assign action items and milestones",
      "Track due dates and completion percentages",
      "Filter by owner, quarter, and status",
    ],
    usage: "Navigate to Project Management → Action Items to update progress on assigned priorities.",
    relatedPages: ["/portal/rocks"],
  },

  // Data
  {
    id: "apollo-search",
    title: "Apollo Search",
    category: "Data",
    icon: Search,
    description: "AI-assisted company and contact research via Apollo.",
    features: [
      "Search companies and contacts by industry, role, and location",
      "Save prospect lists and export contact records",
    ],
    usage: "Navigate to Data → Apollo Search to research companies and contacts.",
    relatedPages: ["/portal/apollo-search"],
  },

  // Admin
  {
    id: "book-a-call",
    title: "Book a Call",
    category: "Admin",
    icon: Calendar,
    description: "Configure scheduling pages and booking availability.",
    features: [
      "Manage booking calendar settings and time slots",
    ],
    usage: "Navigate to Admin → Book a Call to manage scheduling configuration.",
    relatedPages: ["/portal/admin/book-a-call"],
  },
  {
    id: "safety-calendar-admin",
    title: "Safety Calendar Admin",
    category: "Admin",
    icon: CalendarClock,
    description: "Central administration for the Multi-Site Bilingual Safety Calendar displayed in jobsite safety offices.",
    features: [
      "Manage jobsite calendars (Conover, Charlotte, Southern Virginia, Charleston, Greenville, etc.)",
      "Publish bilingual English and Spanish safety entries",
      "Configure site PIN codes and TV display settings",
    ],
    usage: "Navigate to Admin → Safety Calendar Admin to manage jobsite safety calendars and entries.",
    relatedPages: ["/calendar-admin", "/safety-calendar"],
  },
  {
    id: "page-designer",
    title: "Page Designer",
    category: "Admin",
    icon: Paintbrush,
    description: "Visual page builder and layout editor for portal and marketing pages.",
    features: [
      "Customize page sections and layouts",
      "Preview and publish content updates",
    ],
    usage: "Navigate to Admin → Page Designer to edit page layouts.",
    relatedPages: ["/portal/admin/page-designer"],
  },
  {
    id: "mail-admin",
    title: "Mail",
    category: "Admin",
    icon: Mail,
    description: "Configure platform email and messaging channel integrations.",
    features: [
      "Manage Microsoft 365 / email connection settings",
      "Configure outbound notification channels",
    ],
    usage: "Navigate to Admin → Mail to manage email integration settings.",
    relatedPages: ["/portal/admin/mail"],
  },
  {
    id: "departments",
    title: "Departments",
    category: "Admin",
    icon: Building2,
    description: "Manage Adams Electric departments, department codes, named owners, and assigned members.",
    features: [
      "Create and edit departments (Safety, Preconstruction, Project Delivery, Service, Finance, People & Culture)",
      "Assign department owners and members",
      "Control which departments appear in the public requirements interview",
    ],
    usage: "Navigate to Admin → Departments to configure departments and owners.",
    relatedPages: ["/portal/admin/departments"],
  },
  {
    id: "module-builds",
    title: "Module Builds",
    category: "Admin",
    icon: Rocket,
    description: "Build, provision, and deploy working portal modules from approved department specifications.",
    features: [
      "Trigger module builds from approved specifications",
      "Monitor build status and deployment logs",
      "Manage module lifecycle and versions",
    ],
    usage: "Navigate to Admin → Module Builds to build and deploy approved specifications.",
    relatedPages: ["/portal/admin/modules"],
  },
  {
    id: "adams-brain-admin",
    title: "AdamsBrain Admin",
    category: "Admin",
    icon: Database,
    description: "Manage knowledge bases, document sources, and indexing for AdamsBrain.",
    features: [
      "Create and configure department knowledge brains",
      "Upload and index reference documents",
      "Review query logs and chunk coverage",
    ],
    usage: "Navigate to Admin → AdamsBrain Admin to manage AI knowledge sources.",
    relatedPages: ["/portal/admin/adams-brain"],
  },
  {
    id: "platform-development",
    title: "Platform Development",
    category: "Admin",
    icon: Wrench,
    description: "SuperAdmin module for tracking Adams Platform development tasks, hours, connected systems, and AI-generated weekly PDF reports.",
    features: [
      "Log development tasks with date, hours spent, category, systems affected, and AI capabilities introduced",
      "Generate AI executive summary reports on demand or automatically every Friday at 6:00 PM",
      "Store weekly reports as Base64-encoded PDFs in Firestore",
      "Copy shareable report links or download PDF reports directly for leadership review",
    ],
    usage: "Navigate to Admin → Platform Development (SuperAdmin only) to log development activities and generate or share weekly reports.",
    relatedPages: ["/portal/admin/platform-development"],
  },
  {
    id: "settings",
    title: "Settings & Integrations",
    category: "Admin",
    icon: Settings,
    description: "Configure Hermes AI (local or remote endpoint), Telegram bot notifications, webhooks, and platform preferences.",
    features: [
      "Configure and test Local or Remote Hermes AI endpoints",
      "Manage server-side API secrets in protected Firestore storage",
      "Configure Telegram notifications and webhook events",
    ],
    usage: "Open Settings from the account menu in the bottom-left of the sidebar.",
    relatedPages: ["/portal/settings"],
  },

  // Mission Critical
  {
    id: "safety-calendar",
    title: "Safety Calendar",
    category: "Mission Critical",
    icon: CalendarClock,
    description: "Multi-site bilingual (English/Spanish) safety calendar for Adams Electric jobsite safety offices and TV displays.",
    features: [
      "Site-specific safety schedules and announcements",
      "Instant English / Spanish language toggle",
      "PIN-protected jobsite access",
    ],
    usage: "Navigate to Mission Critical → Safety Calendar to view jobsite safety calendars.",
    relatedPages: ["/safety-calendar"],
  },
  {
    id: "adams-learning-academy",
    title: "Adams Learning Academy",
    category: "Mission Critical",
    icon: GraduationCap,
    description: "Internal training catalog and learning paths for Adams Electric field and office teams.",
    features: [
      "Role-relevant electrical construction and safety courses",
      "Self-paced modules and live workshops",
      "Automated progress and completion tracking",
    ],
    usage: "Navigate to Mission Critical → Adams Learning Academy to access training courses.",
    relatedPages: ["/academy"],
  },
  {
    id: "certification-tracker",
    title: "Certification Tracker",
    category: "Mission Critical",
    icon: Award,
    description: "Track workforce training completions, issued certificates, expiration dates, and credential verification.",
    features: [
      "View and search issued Adams Electric certificates",
      "Download branded completion certificates",
      "Monitor upcoming certification renewals",
    ],
    usage: "Navigate to Mission Critical → Certification Tracker to view and manage employee certifications.",
    relatedPages: ["/portal/admin/academy/certificates"],
  },
  {
    id: "vehicle-inspection",
    title: "Vehicle Inspection",
    category: "Mission Critical",
    icon: Truck,
    description: "Recurring vehicle inspection checklists, photo evidence capture, and fleet safety records for Adams Electric crews.",
    features: [
      "Interior and exterior inspection checklists with photo uploads",
      "VIN and license plate tracking",
      "Overdue inspection reminders and supervisor escalation",
    ],
    usage: "Navigate to Mission Critical → Vehicle Inspection to complete or review fleet inspections.",
    relatedPages: ["/portal/vehicle-inspection"],
  },
  {
    id: "safety-request-box",
    title: "Safety Request Box",
    category: "Mission Critical",
    icon: ClipboardList,
    description: "Centralized inbox for safety superintendent requests, jobsite observations, and near-miss reports.",
    features: [
      "Submit and categorize jobsite safety requests",
      "Assign owners and track due dates to completion",
      "Notify requesters when safety actions are resolved",
    ],
    usage: "Navigate to Mission Critical → Safety Request Box to submit or track safety requests.",
    relatedPages: ["/portal/safety-request-box"],
  },
  {
    id: "order-tracking",
    title: "Order Tracking",
    category: "Mission Critical",
    icon: Package,
    description: "Track material orders, purchase orders, delivery schedules, and jobsite inventory for Adams Electric projects.",
    features: [
      "Monitor material order status and expected delivery dates",
      "Track jobsite receiving and inventory alerts",
    ],
    usage: "Navigate to Mission Critical → Order Tracking to check material order status.",
    relatedPages: ["/portal/order-tracking"],
  },
  {
    id: "mindchuk-clone",
    title: "MindChuk Clone",
    category: "Mission Critical",
    icon: HardHat,
    description: "Adams Electric field knowledge assistant and quick safety/code reference tool.",
    features: [
      "Field Q&A for safety procedures and electrical construction standards",
      "Quick lookup for jobsite crews and foremen",
    ],
    usage: "Navigate to Mission Critical → MindChuk Clone to access the field assistant.",
    relatedPages: ["/portal/mindchuk-clone"],
  },
];

const categories = [
  "All",
  "Adams Electric",
  "Project Management",
  "Data",
  "Admin",
  "Mission Critical",
];

export default function SystemDocumentationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredDocs = systemDocumentation.filter((doc) => {
    const matchesSearch =
      searchQuery === "" ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.features.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "All" || doc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const groupedDocs = filteredDocs.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, FeatureDoc[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          System Documentation
        </h1>
        <p className="text-muted-foreground mt-2">
          Documentation for active Adams Electric platform modules and capabilities
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Adams Electric modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="flex-wrap h-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{systemDocumentation.length}</div>
            <p className="text-xs text-muted-foreground">Active Modules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{categories.length - 1}</div>
            <p className="text-xs text-muted-foreground">Portal Sections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredDocs.length}</div>
            <p className="text-xs text-muted-foreground">Matching Results</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {systemDocumentation.reduce((acc, doc) => acc + doc.features.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total Capabilities</p>
          </CardContent>
        </Card>
      </div>

      {/* Documentation Content */}
      <div className="space-y-8">
        {Object.entries(groupedDocs).map(([category, docs]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Badge variant="outline">{category}</Badge>
              <span className="text-sm text-muted-foreground">
                ({docs.length} {docs.length === 1 ? "module" : "modules"})
              </span>
            </h2>
            <Accordion type="multiple" className="space-y-2">
              {docs.map((doc) => (
                <AccordionItem
                  key={doc.id}
                  value={doc.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <doc.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">{doc.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {doc.description}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <div>
                        <h4 className="font-medium mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground">
                          {doc.description}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Features & Capabilities</h4>
                        <ul className="grid sm:grid-cols-2 gap-2">
                          {doc.features.map((feature, idx) => (
                            <li
                              key={idx}
                              className="text-sm flex items-start gap-2"
                            >
                              <span className="text-primary mt-1">•</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">How to Use</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {doc.usage}
                        </p>
                      </div>

                      {doc.relatedPages && doc.relatedPages.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Related Pages</h4>
                          <div className="flex flex-wrap gap-2">
                            {doc.relatedPages.map((page) => (
                              <Badge key={page} variant="secondary">
                                {page}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No modules found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search query or category filter
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
