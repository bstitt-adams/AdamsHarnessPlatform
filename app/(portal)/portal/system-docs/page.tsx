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
  FileText,
  Bot,
  CheckSquare,
  UserCog,
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
  ImageIcon,
  Menu,
  Laptop,
  Lightbulb,
  Brain,
} from "lucide-react";

interface FeatureDoc {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  description: string;
  features: string[];
  steps: string[];
  relatedPages?: string[];
}

const systemDocumentation: FeatureDoc[] = [
  // ============================================================================
  // MY MISSION CRITICAL (User-Scoped Applications)
  // ============================================================================
  {
    id: "my-tasks",
    title: "My Tasks & MindChuk Feed",
    category: "My Mission Critical",
    icon: CheckSquare,
    description:
      "Personal task hub and MindChuk ('For Minds That Never Turn Off') capture feed displaying Tasks, Notes/Thoughts, Ideas, Links, Photos, and Reminders assigned to the signed-in (or masqueraded) user.",
    features: [
      "Instant MindChuk Brain-Dump Capture Box: drop tasks, notes, ideas, web links (https://...), Base64 photo/file attachments, and scheduled reminders in seconds",
      "Automatic #hashtag extraction from text plus inline '+ #tag' tagging and one-click #tag filter cloud ('No folders. No digging. Just find it.')",
      "Type filter pills for All, Pinned, Tasks, Notes, Ideas, Links, Photos, and Reminders",
      "Switch between MindChuk Feed View (cards with previews) and structured Tasks Table View",
      "Mark Done / Reopen button, Done checkbox, Pin to top, Convert any Note/Idea to a Task, and Delete on every item",
      "Automatic synchronization of tasks/reminders with due dates to the Adams Master Calendar",
    ],
    steps: [
      "1. Open 'My Mission Critical → My Tasks' (/portal/my-tasks) or 'Mission Critical → MindChuk Clone' (/portal/mindchuk-clone).",
      "2. In 'Save Anything Worth Remembering', select an item kind (Task, Note, Idea, Link, Photo, Reminder) or type directly with #hashtags (e.g., '#safety #panel-b') and press Ctrl+Enter or click 'Save'.",
      "3. Optionally attach a photo/PDF (stored as Base64) or pick a Due / Reminder Date (which automatically adds the item to the Adams Master Calendar).",
      "4. Click any #tag pill or type in 'Type anything you remember...' to filter your feed instantly.",
      "5. Click the Done checkbox, 'Mark Done / Reopen', the Pin icon, 'Convert to Task', or the Trash icon on any item.",
    ],
    relatedPages: ["/portal/my-tasks", "/portal/mindchuk-clone"],
  },
  {
    id: "my-assets",
    title: "My Assets (with Admin-Only Management)",
    category: "My Mission Critical",
    icon: Laptop,
    description:
      "View company equipment assigned to you (laptops, cell phones, iPads, vehicles, hotspots). Asset assignment and custom asset type controls are strictly restricted to Admins and SuperAdmins.",
    features: [
      "User-scoped view of assigned laptops, cell phones, iPads, vehicles, hotspots, and custom equipment",
      "Summary count cards broken down by each tracked asset category",
      "Admin/SuperAdmin-only 'Assign Asset to User' modal to assign equipment, serial numbers, phone numbers, or VINs to any Team Member",
      "Admin/SuperAdmin-only 'Manage Tracked Asset Types' modal to add or remove equipment categories dynamically",
      "Admin/SuperAdmin-only toggle to switch between 'Showing My Assets Only' and 'Showing All Users'",
    ],
    steps: [
      "1. Open 'My Mission Critical → My Assets' in the left sidebar to see all active equipment assigned to your profile.",
      "2. Use the search bar to filter your assigned equipment by model, serial number, phone number, or VIN.",
      "3. (Admins / SuperAdmins Only) Click 'Assign Asset to User' in the top right, choose the Team Member, pick the Asset Type, enter the model and serial/VIN/phone identifier, and click 'Assign Asset'.",
      "4. (Admins / SuperAdmins Only) Click 'Manage Tracked Asset Types' to add new equipment categories or 'Showing All Users' to audit company-wide assets.",
    ],
    relatedPages: ["/portal/my-assets"],
  },
  {
    id: "my-training",
    title: "My Training and Certs (with Base64 Artifact Upload & Expiration Tracking)",
    category: "My Mission Critical",
    icon: GraduationCap,
    description:
      "Personal training dashboard to upload training/certification artifacts in Base64 format with required expiration dates, track enrolled Adams Learning Academy courses, and automatically sync training dates to the Adams Master Calendar.",
    features: [
      "Upload Training / Certification modal storing PDF, PNG, JPG, and WEBP artifacts in Base64 format in Firestore",
      "Captures Training Title, Category (OSHA, NFPA 70E, Lift, First Aid, BIM, License), Issuing Organization, Credential ID, Training Hours, Completion Date, and Required Expiration Date",
      "Automatic expiration status badges (Active, Expires in Xd, Expired) and Expiring Soon / Expired KPI counter",
      "Inline artifact preview modal (image/PDF viewer), one-click Base64 download, and delete",
      "Automatically adds both Training Completion and Certification Expiration / Renewal events to the Adams Master Calendar (/portal/calendar)",
    ],
    steps: [
      "1. Open 'My Mission Critical → My Training and Certs' (/portal/my-training).",
      "2. Click 'Upload Training / Certification' in the top right.",
      "3. Enter the Training Title, Category, Issuing Organization, optional Credential ID and Hours, Completion Date, and the required Expiration Date.",
      "4. Select your certificate or card file (.pdf, .png, .jpg, .webp) to encode as Base64 and click 'Save Training & Artifact'.",
      "5. Use the Eye icon to preview the uploaded certificate inline, the Download icon to save it, or open the Adams Master Calendar (/portal/calendar) to see your synced training and expiration dates.",
    ],
    relatedPages: ["/portal/my-training", "/academy", "/portal/calendar"],
  },
  {
    id: "my-orders",
    title: "My Orders",
    category: "My Mission Critical",
    icon: Package,
    description:
      "Track material, tool, and equipment orders requested by you across Adams Electric jobsites.",
    features: [
      "Filtered view of material and purchase orders submitted by the current user",
      "Modal to submit new material/equipment orders with jobsite, supplier, quantity, and needed-by date",
      "Auto-generated PO/Order numbers when not manually specified",
      "Real-time order status badges (Requested, Approved, Ordered, Shipped, Delivered)",
    ],
    steps: [
      "1. Open 'My Mission Critical → My Orders' in the left sidebar.",
      "2. Click 'Request Material / Order' in the top right.",
      "3. Enter the Material/Item Summary, Jobsite/Project name, optional PO #, Supplier/Vendor, Quantity, Needed By Date, and Delivery Notes.",
      "4. Click 'Submit Order' to log the request under your account.",
      "5. Use the search box to filter your orders by PO number, material, jobsite, or status.",
    ],
    relatedPages: ["/portal/my-orders"],
  },
  {
    id: "my-ideas",
    title: "My Ideas",
    category: "My Mission Critical",
    icon: Lightbulb,
    description:
      "Submit field, safety, and operational improvement ideas and track AI solution interviews you have initiated.",
    features: [
      "Submit process improvement ideas categorized by Automation, Safety, Prefab/BIM, Productivity, or Logistics",
      "Track review and implementation status of your submitted ideas",
      "View all AI Requirements Interviews initiated by your account with direct links to open them",
    ],
    steps: [
      "1. Open 'My Mission Critical → My Ideas' in the left sidebar.",
      "2. Click 'Submit Idea' to log a new process or safety improvement idea with Title, Category, Description, and Expected Impact.",
      "3. Alternatively, click 'Start AI Solution Interview' to launch a guided 15-topic AI requirements interview that turns your idea into a full Solution Specification.",
      "4. Track the status of both your submitted ideas and your AI Solution Interviews in the tables below.",
    ],
    relatedPages: ["/portal/my-ideas", "/portal/solutions/new"],
  },

  // ============================================================================
  // SOLUTIONS & STANDARDIZED SOLUTION APP WORKSPACES
  // ============================================================================
  {
    id: "solutions-hub",
    title: "Interview Ideas to Solutions (with Multi-Format Attachment Analysis)",
    category: "Project Management",
    icon: FileText,
    description:
      "End-to-end hub for conducting AI process discovery interviews, uploading & analyzing spreadsheets/documents (.xlsx, .xls, .csv, .pptx, .ppt, .docx, .doc, .pdf, .md, .txt), generating versioned Solution Specifications, and launching Solution App Workspaces.",
    features: [
      "Multi-format attachment analyzer supporting Excel (.xlsx, .xls, .csv), PowerPoint (.pptx, .ppt), Word (.docx, .doc), Adobe PDF (.pdf), Markdown (.md), and Text (.txt)",
      "Automatically extracts Excel worksheet names, column headers, formulas, and sample rows and asks targeted follow-up questions on how the spreadsheet works",
      "Automatically maps extracted spreadsheet columns into the generated Solution Specification's Data Entities",
      "Guided 15-topic AI interviewer that extracts structured process facts in real time",
      "One-click versioned Specification generation with SHA-256 hash verification and immediate Solution App Workspace provisioning",
    ],
    steps: [
      "1. Navigate to 'Project Management → Solutions' (/portal/solutions) or the public '/interview' page.",
      "2. Click 'New Interview', choose the owning Adams Electric Department, enter a title and process seed, and optionally attach an Excel spreadsheet, PowerPoint, Word doc, PDF, Markdown, or Text file.",
      "3. During any active interview, click 'Upload & Analyze Attachment' (or 'Attach & Analyze File' on /interview) to upload additional spreadsheets or documents.",
      "4. Review the 'Analyzed Attachments & Spreadsheet Context' card showing extracted sheets, column badges, and AI follow-up questions, and answer the interviewer's questions until coverage reaches 100%.",
      "5. Click 'Generate Specification' → 'Submit for Review' → 'Approve', then click 'Open Solution Workspace' to launch the standardized application.",
    ],
    relatedPages: ["/portal/solutions", "/portal/solutions/new", "/interview"],
  },
  {
    id: "solution-app-workspace",
    title: "Standardized Solution App Workspace",
    category: "Project Management",
    icon: Database,
    description:
      "Every Interview Idea to Solution automatically provides a standardized application interface with a KPI metrics dashboard, AI charts, global search, filterable table, item detail pages, and app settings.",
    features: [
      "Live KPI Metrics Dashboard driving the solution",
      "AI Recommended Charts & Graphs (Pie, Bar, Line, Area) plus an inline 'Ask AI to add a chart' prompt bar",
      "Global search across every field, note, tag, extended attribute, and record ID",
      "Filterable list table with per-column filters and configurable visible columns",
      "Dedicated Item Detail Page (/portal/modules/[slug]/records/[id]) storing extended fields, root-cause notes, tags, and activity comments",
      "Dedicated App Settings & API Page (/portal/modules/[slug]/settings) for column visibility, AI metrics/charts, action triggers, and external REST API keys",
    ],
    steps: [
      "1. Open 'Project Management → Modules' (/portal/modules) and click 'Open Workspace' on any solution (e.g., Safety Request Inbox, Six-Month Vehicle Inspection, or any interview-derived solution).",
      "2. Review the top KPI Metrics cards and AI Recommended Charts. Type a prompt in 'Ask AI to add a chart' (e.g., 'Pie chart by priority') and click 'Add Chart' to create custom visualizations.",
      "3. Click the '+ New Item' button in the top right to submit a new record into the solution.",
      "4. Use the Global Search bar or the column header filter inputs to search and filter items.",
      "5. Click 'Details' on any row to open its Item Detail Page, where you can record Root Cause, Resolution Notes, External PO/Ticket #, custom attributes, tags, and activity comments.",
      "6. Click 'App Settings & API' in the top right to configure visible table columns, build AI automations/triggers, or generate an external REST API key.",
    ],
    relatedPages: [
      "/portal/modules",
      "/portal/modules/safety-request-inbox",
      "/portal/modules/vehicle-inspection-tracker",
    ],
  },
  {
    id: "module-notifications",
    title: "Module Alerts",
    category: "Project Management",
    icon: Bell,
    description:
      "Centralized inbox for assignments, reminders, overdue alerts, and supervisor escalations triggered by Solution App Workspaces.",
    features: [
      "Real-time feed of notifications generated by solution triggers and scheduled checks",
      "Unread/read filtering and one-click mark-as-read",
      "Direct links back to the originating solution module and record",
    ],
    steps: [
      "1. Navigate to 'Project Management → Module Alerts' (/portal/module-notifications).",
      "2. Review active assignment, reminder, and escalation alerts.",
      "3. Click 'Mark read' once an alert has been addressed.",
    ],
    relatedPages: ["/portal/module-notifications"],
  },
  {
    id: "adams-brain",
    title: "AdamsBrain (ABrAIn / GBrain) Hub & 4-Step Data Import Wizard",
    category: "Project Management",
    icon: Sparkles,
    description:
      "Multi-repository knowledge hub with a 4-step Data Import & Hermes Storage Wizard, interactive repository chat, source explorer, and automatic grounding for Telegram and Microsoft Teams.",
    features: [
      "4-Step Data Import & Hermes Wizard: (1) Select or create a repository, (2) Upload .pdf, .docx, .md, .txt, .csv, .json files, paste SOP/FAQ pages, or select from 8 live Adams Platform datasets, (3) Configure Hermes & Telegram/Teams grounding, (4) Store in Hermes Harness (RESOLVER.md + HERMES_MEMORY.json)",
      "Multi-Repository Selector including 'All Active Repositories' global search mode",
      "Interactive Repository Chat with suggested starter prompts, cited source cards, and 'Ask About This Source' actions",
      "Automatic grounding for linked Telegram and Microsoft Teams users via Hermes",
    ],
    steps: [
      "1. Navigate to 'Project Management → AdamsBrain' (/portal/adams-brain).",
      "2. Click 'Data Import & Hermes Wizard' in the top right to create a repository or import files (.pdf, .docx, .csv, .json, .md, .txt), SOPs/FAQs, and live platform datasets into Hermes.",
      "3. Select a repository (or 'All Active Repositories') from the left sidebar.",
      "4. In the 'Chat with Repo' tab, click a suggested prompt or type your question and press Ctrl+Enter to receive a cited answer.",
      "5. Use the 'Stored Sources' tab to inspect indexed documents or click 'Sync Repo to Hermes' at any time to refresh RESOLVER.md and HERMES_MEMORY.json.",
    ],
    relatedPages: ["/portal/adams-brain", "/portal/admin/adams-brain", "/portal/settings?tab=gbrain"],
  },
  {
    id: "ai-workforce",
    title: "AI Workforce",
    category: "Project Management",
    icon: Bot,
    description:
      "Role-specialized AI assistants for drafting, operational analysis, preconstruction support, and safety documentation.",
    features: [
      "Select from specialized AI employee personas",
      "Interactive chat with saved conversation history",
    ],
    steps: [
      "1. Navigate to 'Project Management → AI Workforce' (/portal/ai-workforce).",
      "2. Select an AI assistant role and enter your prompt or task.",
    ],
    relatedPages: ["/portal/ai-workforce"],
  },

  // ============================================================================
  // MISSION CRITICAL (Company-Wide Field & Safety Applications)
  // ============================================================================
  {
    id: "safety-calendar",
    title: "Safety Calendar",
    category: "Mission Critical",
    icon: CalendarClock,
    description:
      "Multi-site bilingual (English/Spanish) safety calendar designed for jobsite safety office TV displays and field crews.",
    features: [
      "Site-specific calendars (Conover NC, Charlotte NC, Southern Virginia, Charleston SC, Greenville SC)",
      "One-click English / Español toggle",
      "PIN-protected jobsite display access",
    ],
    steps: [
      "1. Open 'Mission Critical → Safety Calendar' (/safety-calendar).",
      "2. Select a jobsite location and enter the site PIN (default: 1234).",
      "3. Toggle between English and Spanish in the top bar for bilingual crew briefings.",
    ],
    relatedPages: ["/safety-calendar", "/calendar-admin"],
  },
  {
    id: "adams-learning-academy",
    title: "Adams Learning Academy",
    category: "Mission Critical",
    icon: GraduationCap,
    description:
      "Internal training portal for electrical construction, preconstruction, BIM coordination, jobsite safety, and field leadership.",
    features: [
      "Browse courses by category and skill level",
      "Complete video/text lessons and assessments",
      "Automatic progress tracking and certificate issuance",
    ],
    steps: [
      "1. Open 'Mission Critical → Adams Learning Academy' (/academy).",
      "2. Browse featured courses or filter by category.",
      "3. Click a course to enroll and complete its modules.",
    ],
    relatedPages: ["/academy", "/academy/courses"],
  },
  {
    id: "certification-tracker",
    title: "Certification Tracker",
    category: "Mission Critical",
    icon: Award,
    description:
      "Track issued workforce training certificates, credential numbers, and completion records.",
    features: [
      "Search and filter issued Adams Electric certificates",
      "Preview and download branded PDF certificates",
    ],
    steps: [
      "1. Open 'Mission Critical → Certification Tracker' (/portal/admin/academy/certificates).",
      "2. Search by employee name, course title, or certificate number.",
      "3. Click 'Preview' or 'Download' to view or print the branded certificate.",
    ],
    relatedPages: ["/portal/admin/academy/certificates"],
  },
  {
    id: "vehicle-inspection",
    title: "Vehicle Inspection",
    category: "Mission Critical",
    icon: Truck,
    description:
      "Fleet safety inspection tracking for Adams Electric vehicles.",
    features: [
      "Log recurring vehicle inspections with VIN/plate, mileage, condition, and next due date",
      "Full Solution Workspace available at /portal/modules/vehicle-inspection-tracker",
    ],
    steps: [
      "1. Open 'Mission Critical → Vehicle Inspection' (/portal/vehicle-inspection) or '/portal/modules/vehicle-inspection-tracker'.",
      "2. Click 'Save Inspection' to log a vehicle inspection with unit number, driver, VIN, mileage, and condition.",
    ],
    relatedPages: ["/portal/vehicle-inspection", "/portal/modules/vehicle-inspection-tracker"],
  },
  {
    id: "safety-request-box",
    title: "Safety Request Box",
    category: "Mission Critical",
    icon: ClipboardList,
    description:
      "Capture safety superintendent requests, jobsite observations, and near-miss reports.",
    features: [
      "Categorize requests by PPE, Signage, Equipment Inspection, Hazard Report, or Training",
      "Assign owners, track due dates, and trigger automated notifications",
      "Full Solution Workspace available at /portal/modules/safety-request-inbox",
    ],
    steps: [
      "1. Open 'Mission Critical → Safety Request Box' (/portal/safety-request-box) or '/portal/modules/safety-request-inbox'.",
      "2. Submit a safety request with priority, jobsite, requester, and due date.",
    ],
    relatedPages: ["/portal/safety-request-box", "/portal/modules/safety-request-inbox"],
  },
  {
    id: "order-tracking",
    title: "Order Tracking",
    category: "Mission Critical",
    icon: Package,
    description:
      "Track material orders, purchase orders, and delivery schedules across jobsites.",
    features: [
      "Monitor material requests and expected delivery dates",
      "Personal orders also accessible under My Mission Critical → My Orders",
    ],
    steps: [
      "1. Open 'Mission Critical → Order Tracking' (/portal/order-tracking) or 'My Mission Critical → My Orders' (/portal/my-orders).",
      "2. Review or submit material order requests.",
    ],
    relatedPages: ["/portal/order-tracking", "/portal/my-orders"],
  },
  {
    id: "mindchuk-clone",
    title: "MindChuk — For Minds That Never Turn Off",
    category: "Mission Critical",
    icon: HardHat,
    description:
      "Zero-friction personal thought, task, note, link, photo, and reminder capture feed with automatic #hashtag organization and instant search.",
    features: [
      "Save tasks, field notes, ideas, web links, Base64 photos, and reminders into a private searchable feed",
      "Auto-extracts #hashtags and provides one-click #tag filtering and pinning",
      "Switch between MindChuk Feed View and Tasks Table View, or convert any note/thought into an actionable Task",
    ],
    steps: [
      "1. Open 'Mission Critical → MindChuk Clone' (/portal/mindchuk-clone) or 'My Mission Critical → My Tasks' (/portal/my-tasks).",
      "2. Type any thought, link, or task with #tags in the capture box and press Ctrl+Enter to save.",
      "3. Filter by type (Tasks, Notes, Ideas, Links, Photos, Reminders, Pinned) or click any #tag pill.",
    ],
    relatedPages: ["/portal/mindchuk-clone", "/portal/my-tasks"],
  },

  // ============================================================================
  // ADAMS ELECTRIC CORE MODULES
  // ============================================================================
  {
    id: "command-center",
    title: "Command Center (High-Level Platform Metrics)",
    category: "Adams Electric",
    icon: Target,
    description:
      "Executive operational dashboard displaying live metrics across all Adams Electric components, with Admin-only Bug Tracker and Platform Development views.",
    features: [
      "Live KPI cards for Command Control Pipeline, Active Projects, Interview Ideas to Solutions, Solution App Workspaces, AdamsBrain (GBrain), Adams Learning Academy, Safety Calendar Sites, Assigned Assets, Orders & Field Ideas, and Active Team Members",
      "Admin/SuperAdmin-only Bug Tracker KPI card, Quick Bug Report form, and Platform Development hours card",
    ],
    steps: [
      "1. Open 'Command Center' (/portal/command-center) upon signing in.",
      "2. Click any component metric card to jump directly to that module.",
    ],
    relatedPages: ["/portal/command-center"],
  },
  {
    id: "command-control",
    title: "Command Control",
    category: "Adams Electric",
    icon: Target,
    description:
      "Centralized pipeline and pursuit management for Adams Electric construction opportunities and strategic initiatives.",
    features: [
      "Track active pursuits across stages (Lead, Discovery, Proposal, Negotiation, Closed-Won)",
      "Monitor estimated values, probabilities, and expected close dates",
    ],
    steps: [
      "1. Open 'Adams Electric → Command Control' (/portal/opportunities).",
      "2. Filter by stage or search by opportunity name.",
      "3. Click 'New Opportunity' to add a pursuit or click an existing row to update its stage.",
    ],
    relatedPages: ["/portal/opportunities"],
  },
  {
    id: "projects",
    title: "Projects",
    category: "Adams Electric",
    icon: FolderKanban,
    description:
      "Manage active construction and internal projects, milestones, and team assignments.",
    features: [
      "Create projects with timelines, status, and milestones",
      "Track active and at-risk project counts",
    ],
    steps: [
      "1. Open 'Adams Electric → Projects' (/portal/projects).",
      "2. Click 'New Project' to create a project or open an existing project to update milestones.",
    ],
    relatedPages: ["/portal/projects"],
  },
  {
    id: "calendar",
    title: "Adams Master Calendar (with Auto-Synced Training & Certs)",
    category: "Adams Electric",
    icon: Calendar,
    description:
      "Company-wide master calendar for Adams Electric meetings, rocks, to-dos, issues, and automatically synced training & certification events.",
    features: [
      "Month and day views with deduplicated real-time Firestore event sync and local-timezone date handling",
      "Automatic synchronization of Training Completion dates, Certification Expiration / Renewal dates (from My Training and Certs), Academy Workshops, and MindChuk task reminders",
      "Dedicated 'Training' KPI card and event type filter",
    ],
    steps: [
      "1. Open 'Adams Electric → Adams Master Calendar' (/portal/calendar).",
      "2. Click any date or '+ Add Event' to schedule a Meeting, Training / Certification, Rock, To-Do, or Issue.",
      "3. Click the 'Training' stat card at the top to filter the calendar to training completions, workshops, and certification expirations.",
    ],
    relatedPages: ["/portal/calendar", "/portal/my-training"],
  },
  {
    id: "proposals",
    title: "Proposal Creator",
    category: "Adams Electric",
    icon: FileText,
    description:
      "AI-assisted proposal, scope of work, and document builder.",
    features: [
      "Step-by-step wizard with AI text drafting and PDF export",
    ],
    steps: [
      "1. Open 'Adams Electric → Proposal Creator' (/portal/proposals).",
      "2. Select a template and follow the guided wizard to generate and export a proposal.",
    ],
    relatedPages: ["/portal/proposals"],
  },
  {
    id: "documents",
    title: "Documents",
    category: "Adams Electric",
    icon: FileText,
    description:
      "Company document repository for SOPs, submittals, safety manuals, and project files.",
    features: [
      "Upload, categorize, search, and download documents",
    ],
    steps: [
      "1. Open 'Adams Electric → Documents' (/portal/documents).",
      "2. Upload files or filter by category and tag.",
    ],
    relatedPages: ["/portal/documents"],
  },
  {
    id: "bug-tracker",
    title: "Bug Tracker",
    category: "Adams Electric",
    icon: Bug,
    description:
      "Report and track platform bugs, issues, and enhancement requests.",
    features: [
      "Log bugs or feature requests with severity and status tracking",
    ],
    steps: [
      "1. Open 'Adams Electric → Bug Tracker' (/portal/bug-tracker).",
      "2. Click 'Add Item' to submit a bug report or enhancement request.",
    ],
    relatedPages: ["/portal/bug-tracker"],
  },

  // ============================================================================
  // ADMIN PANEL ITEMS (Step-by-Step Administrator Guides)
  // ============================================================================
  {
    id: "adams-brain-admin",
    title: "AdamsBrain & GBrain Config (Admin)",
    category: "Admin",
    icon: Brain,
    description:
      "Create and manage GBrain repositories (garrytan/gbrain format), author SOPs and FAQs, upload documents, sync live platform modules, push to GitHub, and manage Hermes API keys.",
    features: [
      "Create department-scoped or admin-only GBrain repositories",
      "In-app GBrain Page Editor with YAML frontmatter, Compiled Truth, and Timeline & Evidence",
      "4-Step Data Import & Hermes Storage Wizard supporting .pdf, .docx, .md, .txt, .csv, and .json files plus 8 live platform connectors",
      "One-click 'Store in Hermes Harness' compiling RESOLVER.md and HERMES_MEMORY.json into Hermes and Firestore",
      "One-click connectors for Approved Specifications, Module Schemas, Live Module Records, Safety Calendars, User Assets, Workforce Training & Certifications, Command Control Opportunities & Projects, and System Docs",
      "Compile & Sync GBrain Markdown pages (including RESOLVER.md) to GitHub or download as a bundle",
      "Per-repository X-API-Key for Hermes Agent (/api/public/gbrain) plus automatic grounding in Telegram and Microsoft Teams",
    ],
    steps: [
      "1. Open 'Admin → AdamsBrain Admin' (/portal/admin/adams-brain) or 'Settings → Integrations → AdamsBrain (GBrain)' (/portal/settings?tab=gbrain).",
      "2. Click 'Data Import & Hermes Wizard' in the top right for a guided 4-step import into Hermes, or create a repository manually in the left column.",
      "3. Select your repository on the left, then open the 'Author SOP / FAQ Page' tab to write a Standard Operating Procedure, FAQ, or Module Reference with a Title, Tags, Compiled Truth, and Timeline Notes. Click 'Save & Index GBrain Page'.",
      "4. Open the 'Upload Documents & Module Sync' tab to upload .pdf/.docx/.csv/.json/.md/.txt files or click any of the 8 'Sync ...' buttons to ingest live platform records into the brain.",
      "5. Click 'Store in Hermes Harness' in the top right (or open the 'GBrain GitHub & Hermes API' tab) to compile RESOLVER.md + HERMES_MEMORY.json for Hermes, Telegram, and Microsoft Teams.",
    ],
    relatedPages: ["/portal/admin/adams-brain", "/portal/settings?tab=gbrain", "/portal/adams-brain"],
  },
  {
    id: "team-members-admin",
    title: "Team Members & Firebase Auth Sync (Admin)",
    category: "Admin",
    icon: UserCog,
    description:
      "Manage Adams Electric team members, assign roles and departments, synchronize Firebase Authentication accounts, and create new login users.",
    features: [
      "Full directory of Adams Electric team members and roles (SuperAdmin, Admin, Team, Affiliate, Consultant)",
      "One-click 'Sync Auth Users' linking Firebase Authentication UIDs to Team Member records by email",
      "One-click 'Create Auth User' modal that provisions both a Firebase Auth login and a linked Team Member document",
    ],
    steps: [
      "1. Open 'Adams Electric → Team Members' (/portal/admin/team-members).",
      "2. To link existing Firebase Auth accounts to Team Member profiles, click 'Sync Auth Users' in the top right.",
      "3. To create a brand-new user who can log in immediately, click 'Create Auth User', enter First Name, Last Name, Email, Password, and Role, and click 'Create User'.",
      "4. Click the edit pencil on any member row to update their role, title, or department assignments.",
    ],
    relatedPages: ["/portal/admin/team-members"],
  },
  {
    id: "platform-development",
    title: "Platform Development Tracker (SuperAdmin)",
    category: "Admin",
    icon: Wrench,
    description:
      "SuperAdmin module for logging Adams Platform engineering tasks, hours spent, connected systems, and AI capabilities, with AI-generated Base64 PDF executive reports.",
    features: [
      "Log development tasks by date, hours, category (Firebase, Vercel, Portal UI, LMS, Safety Calendar, Hermes, Integrations), systems affected, and AI capability introduced",
      "Generate AI executive summary reports on demand or automatically every Friday at 6:00 PM",
      "Stores generated reports as Base64-encoded PDFs in Firestore with shareable links for Jeff Allen (JeffreyAllen@Adams-Electric.com)",
    ],
    steps: [
      "1. Open 'Admin → Platform Development' (/portal/admin/platform-development) as a SuperAdmin.",
      "2. Click 'Add Task', fill in Title, Category, Status, Hours Spent, Date, Systems Affected, and AI Capability Introduced, and click 'Save Task'.",
      "3. Click 'Generate Weekly Report' in the top right to compile the week's tasks into an AI executive summary and Base64 PDF.",
      "4. In the 'Weekly Reports' card, click 'Copy Link' to share the report URL with Jeff Allen or click 'View' to inspect and download the PDF.",
    ],
    relatedPages: ["/portal/admin/platform-development"],
  },
  {
    id: "departments-admin",
    title: "Departments (Admin)",
    category: "Admin",
    icon: Building2,
    description:
      "Configure Adams Electric departments, department codes, named owners, and assigned members.",
    features: [
      "Manage active departments shown in the public requirements interview picker",
      "Assign department owners (who can approve Solution Specifications) and members",
    ],
    steps: [
      "1. Open 'Admin → Departments' (/portal/admin/departments).",
      "2. Create or edit a department, assign Owner IDs and Member IDs, and save.",
    ],
    relatedPages: ["/portal/admin/departments"],
  },
  {
    id: "module-builds-admin",
    title: "Module Builds (Admin)",
    category: "Admin",
    icon: Rocket,
    description:
      "Monitor and deploy autonomous Hermes module builds generated from approved Solution Specifications.",
    features: [
      "View platform health (Firebase Admin, Hermes, GitHub, Cron secrets)",
      "Reconcile and deploy module build branches",
    ],
    steps: [
      "1. Open 'Admin → Module Builds' (/portal/admin/modules).",
      "2. Inspect build status, click 'Reconcile' to refresh run status from Hermes, or click 'Deploy' when preview checks pass.",
    ],
    relatedPages: ["/portal/admin/modules"],
  },
  {
    id: "safety-calendar-admin",
    title: "Safety Calendar Admin",
    category: "Admin",
    icon: CalendarClock,
    description:
      "Manage jobsite safety calendars, bilingual English/Spanish entries, and site PIN codes.",
    features: [
      "Add, edit, and schedule bilingual safety events across all Adams Electric jobsites",
    ],
    steps: [
      "1. Open 'Admin → Safety Calendar Admin' (/calendar-admin).",
      "2. Select a jobsite calendar, add or edit English and Spanish safety entries, and save.",
    ],
    relatedPages: ["/calendar-admin", "/safety-calendar"],
  },
  {
    id: "academy-admin",
    title: "Academy Admin",
    category: "Admin",
    icon: GraduationCap,
    description:
      "Create and manage Adams Learning Academy courses, modules, lessons, learner tracking, and certificates.",
    features: [
      "Create courses, modules, and lessons",
      "Track employee enrollment progress and issue certificates",
    ],
    steps: [
      "1. Open 'Adams Electric → Academy Admin' (/portal/admin/academy).",
      "2. Click 'New Course' to create a course or use the Tracking and Certificates tabs to monitor completions.",
    ],
    relatedPages: ["/portal/admin/academy", "/portal/admin/academy/tracking", "/portal/admin/academy/certificates"],
  },
  {
    id: "settings-integrations-masquerade",
    title: "Settings, Hermes / Telegram / Teams Integrations & User Masquerading",
    category: "Admin",
    icon: Settings,
    description:
      "Central configuration for LLM providers, Hermes Agent, AdamsBrain (GBrain), Telegram multi-user access, Microsoft Teams multi-user access, Role Feature Visibility, and Live User/Role Masquerading.",
    features: [
      "Integrations → LLM Configuration: Configure OpenAI, Anthropic, Google, Mistral, or Ollama",
      "Integrations → Hermes Integration: Connect Local Hermes (http://127.0.0.1:8642) or Remote HTTPS Hermes and test latency",
      "Integrations → AdamsBrain (GBrain): Full GBrain repository and SOP/FAQ management",
      "Integrations → Telegram: Configure BotFather token, register webhook, and add/manage multiple Telegram users with Hermes access",
      "Integrations → Microsoft Teams: Configure Azure Bot App ID/Password, verify with Microsoft Identity Platform, and manage multiple Teams users with Hermes access",
      "Feature Visibility: Toggle any sidebar section or admin menu item on or off per role (Admin, Team Member, Affiliate, Consultant)",
      "Live User & Role Masquerading: Switch to any Team Member or Role from the top header, sidebar footer, or Feature Visibility tab without logging out",
    ],
    steps: [
      "1. Open 'Settings' (/portal/settings) from the bottom-left account menu.",
      "2. Under 'Integrations', select 'Hermes Integration', 'AdamsBrain (GBrain)', 'Telegram', or 'Microsoft Teams' to configure and test each service.",
      "3. In 'Telegram' or 'Microsoft Teams', click 'Add Telegram User' / 'Add Teams User' to authorize multiple team members to chat with Hermes and copy their '/start <id>' link command.",
      "4. Open the 'Feature Visibility' tab to toggle which modules and admin items each role can see, then click 'Save Changes'.",
      "5. Use the 'Masquerade User' and 'View as' dropdowns in the top header, sidebar footer, or Feature Visibility tab to preview the exact portal experience of any user or role, and select 'My Account' / 'My View' to return.",
    ],
    relatedPages: [
      "/portal/settings",
      "/portal/settings?tab=hermes",
      "/portal/settings?tab=gbrain",
      "/portal/settings?tab=telegram",
      "/portal/settings?tab=teams",
      "/portal/settings?tab=visibility",
    ],
  },
  {
    id: "other-admin-tools",
    title: "Page Designer, Navigation, Images, Mail & Backups (Admin)",
    category: "Admin",
    icon: Shield,
    description:
      "Supporting administration utilities for page layouts, navigation menus, media assets, email channels, and Firestore backups.",
    features: [
      "Page Designer (/portal/admin/page-designer)",
      "Navigation Manager (/portal/admin/navigation)",
      "Image Manager (/portal/admin/images)",
      "Mail Admin (/portal/admin/mail)",
      "Backup & Restore (/portal/admin/backups)",
      "SuperAdmin Controls (/portal/admin/superadmin)",
    ],
    steps: [
      "1. Use the search input at the top of the left sidebar to quickly jump to Page Designer, Navigation Manager, Image Manager, Mail, or Backup & Restore.",
    ],
    relatedPages: [
      "/portal/admin/page-designer",
      "/portal/admin/navigation",
      "/portal/admin/images",
      "/portal/admin/mail",
      "/portal/admin/backups",
      "/portal/admin/superadmin",
    ],
  },
];

const categories = [
  "All",
  "My Mission Critical",
  "Project Management",
  "Mission Critical",
  "Adams Electric",
  "Admin",
];

export default function SystemDocumentationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredDocs = systemDocumentation.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      doc.title.toLowerCase().includes(q) ||
      doc.description.toLowerCase().includes(q) ||
      doc.features.some((f) => f.toLowerCase().includes(q)) ||
      doc.steps.some((s) => s.toLowerCase().includes(q));

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
          <BookOpen className="h-8 w-8 text-primary" />
          System Documentation &amp; Step-by-Step Guides
        </h1>
        <p className="text-muted-foreground mt-2">
          Pointed step-by-step instructions and feature documentation for all Adams Platform applications, Solution Workspaces, AdamsBrain / GBrain repositories, and Admin controls.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules, features, or step-by-step instructions..."
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
            <p className="text-xs text-muted-foreground">Documented Modules</p>
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
            <p className="text-xs text-muted-foreground">Matching Guides</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {systemDocumentation.reduce((acc, doc) => acc + doc.steps.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Guided Steps</p>
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
                ({docs.length} {docs.length === 1 ? "guide" : "guides"})
              </span>
            </h2>
            <Accordion
              type="multiple"
              defaultValue={docs.map((d) => d.id)}
              className="space-y-3"
            >
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
                        <h4 className="font-medium mb-1">Overview</h4>
                        <p className="text-sm text-muted-foreground">
                          {doc.description}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Key Capabilities</h4>
                        <ul className="grid sm:grid-cols-2 gap-2">
                          {doc.features.map((feature, idx) => (
                            <li
                              key={idx}
                              className="text-sm flex items-start gap-2"
                            >
                              <span className="text-primary mt-0.5">•</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">
                          Step-by-Step How to Use
                        </h4>
                        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                          {doc.steps.map((step, idx) => (
                            <p
                              key={idx}
                              className="text-sm text-foreground leading-relaxed"
                            >
                              {step}
                            </p>
                          ))}
                        </div>
                      </div>

                      {doc.relatedPages && doc.relatedPages.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Routes</h4>
                          <div className="flex flex-wrap gap-2">
                            {doc.relatedPages.map((page) => (
                              <Badge key={page} variant="secondary" className="font-mono text-xs">
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
              <h3 className="font-semibold mb-2">No guides found</h3>
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
