"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CalendarDays,
  FileText,
  Bot,
  Ticket,
  CheckSquare,
  Factory,
  UserCog,
  Building,
  Handshake,
  DollarSign,
  Plug,
  Paintbrush,
  GraduationCap,
  Shield,
  Bug,
  Settings,
  CreditCard,
  ShoppingCart,
  Bell,
  Database,
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
  // System Management
  {
    id: "bug-tracker",
    title: "Bug Tracker",
    category: "System Management",
    icon: Bug,
    description: "Track and manage bugs, issues, and feature requests across the platform. Supports priority levels, status tracking, and team assignment.",
    features: [
      "Create and manage bug reports with detailed descriptions",
      "Assign priority levels (Critical, High, Medium, Low)",
      "Track status (Open, In Progress, Resolved, Closed)",
      "Add comments and updates to bug reports",
      "Filter and search bugs by status, priority, or assignee",
      "Firebase-backed real-time updates",
    ],
    usage: "Navigate to System Management → Bug Tracker to view all reported issues. Click 'New Bug' to report an issue, or click on an existing bug to view details and add comments.",
    relatedPages: ["/portal/bug-tracker"],
  },
  {
    id: "system-docs",
    title: "System Documentation",
    category: "System Management",
    icon: BookOpen,
    description: "Comprehensive documentation for all platform features, including usage guides, feature descriptions, and best practices.",
    features: [
      "Auto-generated documentation for all features",
      "Searchable feature index",
      "Category-based organization",
      "Usage instructions and best practices",
    ],
    usage: "You're viewing it now! Use the search bar to find specific features or browse by category.",
    relatedPages: ["/portal/system-docs"],
  },

  // Project Management
  {
    id: "opportunities",
    title: "Opportunities",
    category: "Project Management",
    icon: Target,
    description: "Manage sales opportunities and track potential deals through your pipeline. Integrates with CRM data for comprehensive opportunity management.",
    features: [
      "Create and track sales opportunities",
      "Pipeline stage management",
      "Deal value and probability tracking",
      "Activity logging and follow-ups",
      "Integration with GoHighLevel CRM",
      "Kanban and list view options",
    ],
    usage: "Navigate to Project Management → Opportunities to view your pipeline. Drag opportunities between stages or click to view/edit details.",
    relatedPages: ["/portal/opportunities"],
  },
  {
    id: "projects",
    title: "Projects",
    category: "Project Management",
    icon: FolderKanban,
    description: "Full project management with task tracking, milestones, and team collaboration features.",
    features: [
      "Create projects with descriptions and timelines",
      "Task management with assignments",
      "Milestone tracking",
      "Team member collaboration",
      "Progress tracking and reporting",
      "File attachments and comments",
    ],
    usage: "Navigate to Project Management → Projects to view all projects. Click 'New Project' to create one, or select an existing project to manage tasks and milestones.",
    relatedPages: ["/portal/projects"],
  },
  {
    id: "calendar",
    title: "Calendar",
    category: "Project Management",
    icon: Calendar,
    description: "Unified calendar view for meetings, events, deadlines, and scheduled activities.",
    features: [
      "Month, week, and day views",
      "Event creation and management",
      "Meeting scheduling",
      "Integration with external calendars",
      "Reminder notifications",
      "Color-coded event categories",
    ],
    usage: "Navigate to Project Management → Calendar to view your schedule. Click on a date to create an event or click existing events to view details.",
    relatedPages: ["/portal/calendar"],
  },
  {
    id: "meetings",
    title: "Meetings",
    category: "Project Management",
    icon: Users,
    description: "Full meeting management with scheduling, video conferencing integration, and Calendar sync. Create, edit, and track meetings with real-time Firestore updates.",
    features: [
      "Full CRUD operations (Create, Read, Update, Delete)",
      "Real-time sync with Calendar events",
      "Multiple meeting types (Discovery, Follow-up, Project, Internal, One-to-One)",
      "Video conferencing URL support (Zoom, Teams, etc.)",
      "Location and attendee tracking",
      "Meeting notes, transcripts, and action items",
      "Upcoming and past meetings tabs with counts",
      "Duration options from 15 minutes to 2 hours",
      "Meeting reminders via notification system",
    ],
    usage: "Navigate to Project Management → Meetings to view all meetings. Click 'Schedule Meeting' to create a new meeting with title, date, time, duration, type, location, and meeting URL. Meetings automatically sync with the Calendar page.",
    relatedPages: ["/portal/meetings", "/portal/calendar"],
  },
  {
    id: "availability",
    title: "Availability",
    category: "Project Management",
    icon: CalendarDays,
    description: "Set and manage your availability for meetings and appointments. Share availability with clients for easy scheduling.",
    features: [
      "Set working hours and availability",
      "Block out unavailable times",
      "Share availability links",
      "Integration with booking systems",
      "Time zone support",
    ],
    usage: "Navigate to Project Management → Availability to configure your available times. Share your availability link with clients for self-service booking.",
    relatedPages: ["/portal/availability"],
  },
  {
    id: "proposals",
    title: "Proposal Creator",
    category: "Project Management",
    icon: FileText,
    description: "AI-powered proposal and document creation system. Create professional proposals, grants, NDAs, and RFP responses with AI assistance.",
    features: [
      "AI-enhanced text generation",
      "Multiple document types (Proposals, Grants, NDAs, RFP Responses)",
      "Template library",
      "Document wizard workflows",
      "Export to PDF",
      "Version history",
    ],
    usage: "Navigate to Project Management → Proposal Creator. Click 'New Proposal' and select a document type to start the AI-assisted wizard.",
    relatedPages: ["/portal/proposals"],
  },
  {
    id: "ai-workforce",
    title: "AI Workforce",
    category: "Project Management",
    icon: Bot,
    description: "AI-powered virtual employees that can assist with various tasks including research, writing, analysis, and more.",
    features: [
      "Multiple AI employee roles",
      "Chat-based interaction",
      "Task delegation",
      "Context-aware responses",
      "Integration with platform data",
    ],
    usage: "Navigate to Project Management → AI Workforce to access your AI employees. Select an AI role and start a conversation to get assistance.",
    relatedPages: ["/portal/ai-workforce"],
  },
  {
    id: "events",
    title: "Events Management",
    category: "Project Management",
    icon: Ticket,
    description: "Full event management with ticketing, landing pages, and Stripe payment integration. Create and manage webinars, workshops, conferences, and more.",
    features: [
      "Create events with detailed information",
      "Multiple ticket types with pricing",
      "Stripe payment integration",
      "Shopping cart and checkout",
      "Event landing pages",
      "Attendee registration tracking",
      "Speaker and agenda management",
      "FAQ and sponsor sections",
    ],
    usage: "Navigate to Project Management → Events to manage events. Create ticket types, set pricing, and publish events with custom landing pages at /events/[slug].",
    relatedPages: ["/portal/admin/events", "/events"],
  },
  {
    id: "eos2",
    title: "EOS2 Dashboard",
    category: "Project Management",
    icon: Target,
    description: "Entrepreneurial Operating System (EOS) dashboard for tracking rocks, issues, and quarterly goals.",
    features: [
      "Quarterly rock tracking",
      "Issue management (IDS process)",
      "Scorecard metrics",
      "Meeting pulse tracking",
      "Team accountability",
    ],
    usage: "Navigate to Project Management → EOS2 Dashboard to view your EOS metrics and manage quarterly rocks.",
    relatedPages: ["/portal/eos2"],
  },
  {
    id: "rocks",
    title: "Rocks",
    category: "Project Management",
    icon: CheckSquare,
    description: "Track quarterly priorities (Rocks) as part of the EOS methodology. Set, track, and complete your most important goals.",
    features: [
      "Create quarterly rocks with owners",
      "Progress tracking",
      "Status updates",
      "Team visibility",
      "Historical tracking",
    ],
    usage: "Navigate to Project Management → Rocks to view and manage your quarterly priorities.",
    relatedPages: ["/portal/rocks"],
  },

  // Data
  {
    id: "apollo-search",
    title: "Apollo Search",
    category: "Data",
    icon: Search,
    description: "AI-powered search through Apollo.io database for lead generation and contact discovery.",
    features: [
      "Search by company, title, industry",
      "Contact information retrieval",
      "Lead scoring",
      "Export capabilities",
      "Integration with CRM",
    ],
    usage: "Navigate to Data → Apollo Search to find leads. Enter search criteria and browse results to find potential contacts.",
    relatedPages: ["/portal/apollo-search"],
  },
  {
    id: "supplier-search",
    title: "Supplier Search",
    category: "Data",
    icon: Factory,
    description: "Search and discover suppliers for various business needs. AI-assisted supplier matching and evaluation.",
    features: [
      "Supplier database search",
      "Category filtering",
      "Supplier profiles",
      "Contact information",
      "Rating and reviews",
    ],
    usage: "Navigate to Data → Supplier Search to find suppliers. Filter by category and requirements to find matching suppliers.",
    relatedPages: ["/portal/supplier-search"],
  },

  // People
  {
    id: "team-members",
    title: "Team Members",
    category: "People",
    icon: UserCog,
    description: "Manage team members, roles, and permissions. View team directory and manage access levels.",
    features: [
      "Team member directory",
      "Role assignment",
      "Permission management",
      "Contact information",
      "Activity tracking",
    ],
    usage: "Navigate to People → Team Members to view and manage your team. Click on a member to edit their profile or permissions.",
    relatedPages: ["/portal/admin/team-members"],
  },
  {
    id: "affiliates",
    title: "Affiliates",
    category: "People",
    icon: Users,
    description: "Manage affiliate partners and track their performance. View commissions and referral activity.",
    features: [
      "Affiliate directory",
      "Performance tracking",
      "Commission management",
      "Referral links",
      "Payout tracking",
    ],
    usage: "Navigate to People → Affiliates to view and manage affiliate partners.",
    relatedPages: ["/portal/affiliates"],
  },
  {
    id: "customers",
    title: "Customers",
    category: "People",
    icon: Building,
    description: "Customer relationship management with contact tracking, interaction history, and account management.",
    features: [
      "Customer profiles",
      "Contact management",
      "Interaction history",
      "Account status tracking",
      "Notes and tags",
    ],
    usage: "Navigate to People → Customers to view and manage customer accounts.",
    relatedPages: ["/portal/customers"],
  },

  // Productivity
  {
    id: "networking",
    title: "Networking",
    category: "Productivity",
    icon: Handshake,
    description: "Track networking activities, connections, and follow-ups. Manage your professional network effectively.",
    features: [
      "Contact management",
      "Meeting tracking",
      "Follow-up reminders",
      "Connection notes",
      "Event attendance tracking",
    ],
    usage: "Navigate to Productivity → Networking to manage your professional connections and networking activities.",
    relatedPages: ["/portal/networking"],
  },
  {
    id: "deals",
    title: "Deals",
    category: "Productivity",
    icon: DollarSign,
    description: "Track deals and business opportunities. Manage deal stages, values, and close dates.",
    features: [
      "Deal pipeline management",
      "Stage tracking",
      "Value and probability",
      "Close date tracking",
      "Win/loss analysis",
    ],
    usage: "Navigate to Productivity → Deals to view and manage your deal pipeline.",
    relatedPages: ["/portal/deals"],
  },

  // Content
  {
    id: "documents",
    title: "Documents",
    category: "Content",
    icon: FileText,
    description: "Document management system for storing, organizing, and sharing files and documents.",
    features: [
      "File upload and storage",
      "Folder organization",
      "Document sharing",
      "Version control",
      "Search functionality",
    ],
    usage: "Navigate to Content → Documents to manage your files and documents.",
    relatedPages: ["/portal/documents"],
  },

  // Admin
  {
    id: "gohighlevel",
    title: "GoHighLevel Integration",
    category: "Admin",
    icon: Plug,
    description: "Integration with GoHighLevel CRM for contact sync, pipeline management, and marketing automation.",
    features: [
      "Contact synchronization",
      "Pipeline integration",
      "Calendar sync",
      "Automation triggers",
      "Reporting integration",
    ],
    usage: "Navigate to Admin → GoHighLevel to configure and manage your GoHighLevel integration.",
    relatedPages: ["/portal/gohighlevel"],
  },
  {
    id: "page-designer",
    title: "Page Designer",
    category: "Admin",
    icon: Paintbrush,
    description: "Visual page designer for creating and editing marketing pages, landing pages, and content sections.",
    features: [
      "Drag-and-drop editor",
      "Pre-built templates",
      "Custom styling",
      "Preview mode",
      "Publish controls",
    ],
    usage: "Navigate to Admin → Page Designer to create and edit pages visually.",
    relatedPages: ["/portal/admin/page-designer"],
  },
  {
    id: "academy-admin",
    title: "Academy Admin",
    category: "Admin",
    icon: GraduationCap,
    description: "Manage the Adams Electric Academy learning management system. Create courses, manage enrollments, and track progress.",
    features: [
      "Course creation and management",
      "Lesson and module organization",
      "Student enrollment",
      "Progress tracking",
      "Certificate generation",
    ],
    usage: "Navigate to Admin → Academy Admin to manage courses and student enrollments.",
    relatedPages: ["/portal/admin/academy"],
  },
  {
    id: "superadmin",
    title: "SuperAdmin Controls",
    category: "Admin",
    icon: Shield,
    description: "Advanced administrative controls for platform configuration, user management, and system settings.",
    features: [
      "User role management",
      "Feature visibility controls",
      "System configuration",
      "Audit logging",
      "Platform settings",
    ],
    usage: "Navigate to Admin → SuperAdmin Controls (visible to superadmins only) for advanced platform management.",
    relatedPages: ["/portal/admin/superadmin"],
  },
  {
    id: "settings",
    title: "Settings & Integrations",
    category: "Admin",
    icon: Settings,
    description: "Platform settings including API integrations, webhooks, notifications, and user preferences.",
    features: [
      "API key management (Stripe, Mattermost, Apollo, etc.)",
      "Webhook configuration",
      "Notification preferences",
      "LLM provider settings",
      "Social link configuration",
    ],
    usage: "Navigate to Settings from the user menu to configure integrations and preferences.",
    relatedPages: ["/portal/settings"],
  },
  {
    id: "stripe-integration",
    title: "Stripe Payment Integration",
    category: "Admin",
    icon: CreditCard,
    description: "Stripe payment processing for event tickets and subscriptions. Secure checkout with webhook handling.",
    features: [
      "Secure payment processing",
      "Checkout session management",
      "Webhook event handling",
      "Refund processing",
      "Payment status tracking",
    ],
    usage: "Configure Stripe in Settings → Integrations. Stripe is used automatically for event ticket purchases.",
    relatedPages: ["/portal/settings", "/portal/admin/events"],
  },
  {
    id: "shopping-cart",
    title: "Shopping Cart & Checkout",
    category: "Admin",
    icon: ShoppingCart,
    description: "Shopping cart system for event ticket purchases with multi-event support and persistent cart state.",
    features: [
      "Add tickets to cart",
      "Quantity management",
      "Multi-event support",
      "Persistent cart (localStorage)",
      "Secure Stripe checkout",
      "Order confirmation",
    ],
    usage: "Add event tickets to cart from event landing pages. Access cart from the cart icon and proceed to checkout.",
    relatedPages: ["/events"],
  },
  {
    id: "notifications",
    title: "Notifications Center",
    category: "System Management",
    icon: Bell,
    description: "Comprehensive notification system with calendar event reminders, in-app toasts, browser notifications, and activity tracking.",
    features: [
      "Calendar event popup reminders (15 min, 5 min, at start)",
      "In-app toast notifications",
      "Browser push notifications (with permission)",
      "Notification sound settings",
      "Upcoming events tab with countdown",
      "Activity feed from platform actions",
      "Per-feature notification type toggles",
      "Mark as read and clear all functionality",
      "Persistent settings in localStorage",
    ],
    usage: "Navigate to System Management → Notifications to view all notifications and upcoming events. Use the Settings tab to configure notification preferences including calendar reminders, browser notifications, and sound alerts.",
    relatedPages: ["/portal/notifications", "/portal/calendar"],
  },
  {
    id: "backups",
    title: "Backup & Restore",
    category: "Admin",
    icon: Database,
    description: "Enterprise-grade backup and restore system with Google Drive integration. Create manual or scheduled backups, store them securely in the cloud, and manage data protection.",
    features: [
      "Full database backups (all collections)",
      "Selective collection backups",
      "Google Drive cloud storage integration",
      "Setup wizard for easy Google Drive connection",
      "Scheduled backups (hourly, daily, weekly, monthly)",
      "Timezone-aware scheduling",
      "Real-time backup progress tracking",
      "Backup history with status, size, and duration",
      "Pause/resume backup schedules",
      "Backup statistics dashboard",
      "Document count tracking per collection",
      "Checksum verification for data integrity",
      "Retention policy configuration",
    ],
    usage: "Navigate to Admin → Backup & Restore. Use the Cloud Storage tab to connect Google Drive via the setup wizard. Create manual backups from the History tab or set up automated schedules from the Schedules tab. Configure frequency, time, and timezone for scheduled backups.",
    relatedPages: ["/portal/admin/backups"],
  },
];

const categories = [
  "All",
  "System Management",
  "Project Management",
  "Data",
  "People",
  "Productivity",
  "Content",
  "Admin",
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
          Comprehensive documentation for all platform features and capabilities
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search features..."
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
            <p className="text-xs text-muted-foreground">Total Features</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{categories.length - 1}</div>
            <p className="text-xs text-muted-foreground">Categories</p>
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
                ({docs.length} features)
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
              <h3 className="font-semibold mb-2">No features found</h3>
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
