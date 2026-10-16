"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { isSuperAdmin } from "@/lib/permissions";
import { collection, query, where, onSnapshot, terminate } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useFeatureVisibility } from "@/contexts/feature-visibility-context";
import { RoleSwitcherCompact } from "@/components/portal/role-switcher";
import { TeamMemberSwitcher } from "@/components/portal/team-member-switcher";
import { FeatureKey, SectionKey } from "@/lib/feature-visibility";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Factory,
  LayoutDashboard,
  Target,
  FolderKanban,
  Users,
  Building,
  FileText,
  Calendar,
  CheckSquare,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Mail,
  Handshake,
  DollarSign,
  User,
  ImageIcon,
  Shield,
  Rocket,
  Battery,
  UserCog,
  Building2,
  Search,
  Linkedin,
  FileSignature,
  Bot,
  Plug,
  Bug,
  Heart,
  Phone,
  CalendarClock,
  GraduationCap,
  Paintbrush,
  BookOpen,
  Database,
  Ticket,
  UsersRound,
  Briefcase,
  Network,
  Menu,
  Presentation,
  Quote,
  ArrowRightLeft,
  Truck,
  ClipboardList,
  Package,
  HardHat,
  Award,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

// System Management
const systemManagementItems: { title: string; href: string; icon: React.ElementType; badge?: string; featureKey: FeatureKey }[] = [];

// Project Management
const projectManagementItems: { title: string; href: string; icon: React.ElementType; badge?: string; featureKey: FeatureKey }[] = [
  {
    title: "Solutions",
    href: "/portal/solutions",
    icon: FileText,
    featureKey: "solutions",
  },
  {
    title: "Modules",
    href: "/portal/modules",
    icon: Database,
    featureKey: "modules",
  },
  {
    title: "Module Alerts",
    href: "/portal/module-notifications",
    icon: Bell,
    featureKey: "moduleNotifications",
  },
  {
    title: "AdamsBrain",
    href: "/portal/adams-brain",
    icon: Sparkles,
    badge: "AI",
    featureKey: "askAdamsBrain",
  },
  {
    title: "AI Workforce",
    href: "/portal/ai-workforce",
    icon: Bot,
    badge: "AI",
    featureKey: "aiWorkforce",
  },
  {
    title: "EOS2 Dashboard",
    href: "/portal/eos2",
    icon: Target,
    badge: "EOS",
    featureKey: "eos2",
  },
  {
    title: "Action Items",
    href: "/portal/rocks",
    icon: CheckSquare,
    featureKey: "rocks",
  },
];

// Data
const dataItems: { title: string; href: string; icon: React.ElementType; badge?: string; featureKey: FeatureKey }[] = [
  {
    title: "Apollo Search",
    href: "/portal/apollo-search",
    icon: Search,
    badge: "AI",
    featureKey: "apolloSearch",
  },
];

// People
const peopleItems: { title: string; href: string; icon: React.ElementType; badge?: string; featureKey: FeatureKey }[] = [];

// Productivity
const productivityItems: { title: string; href: string; icon: React.ElementType; badge?: string; featureKey: FeatureKey }[] = [];

// Mission Critical
const missionCriticalItems: { title: string; href: string; icon: React.ElementType; badge?: string; featureKey: FeatureKey }[] = [
  {
    title: "Safety Calendar",
    href: "/safety-calendar",
    icon: CalendarClock,
    featureKey: "safetyCalendar",
  },
  {
    title: "Adams Learning Academy",
    href: "/academy",
    icon: GraduationCap,
    featureKey: "adamsLearningAcademy",
  },
  {
    title: "Certification Tracker",
    href: "/portal/admin/academy/certificates",
    icon: Award,
    featureKey: "certificationTracker",
  },
  {
    title: "Vehicle Inspection",
    href: "/portal/vehicle-inspection",
    icon: Truck,
    featureKey: "vehicleInspection",
  },
  {
    title: "Safety Request Box",
    href: "/portal/safety-request-box",
    icon: ClipboardList,
    featureKey: "safetyRequestBox",
  },
  {
    title: "Order Tracking",
    href: "/portal/order-tracking",
    icon: Package,
    featureKey: "orderTracking",
  },
  {
    title: "MindChuk Clone",
    href: "/portal/mindchuk-clone",
    icon: HardHat,
    featureKey: "mindchukClone",
  },
];

// Affiliate Center
const affiliateCenterItems: { title: string; href: string; icon: React.ElementType; badge?: string; featureKey: FeatureKey }[] = [];

// Content
const contentItems: { title: string; href: string; icon: React.ElementType; badge?: string; featureKey: FeatureKey }[] = [];

// Admin
const adminItems: { title: string; href: string; icon: React.ElementType; badge?: string; featureKey: FeatureKey }[] = [
  {
    title: "Book a Call",
    href: "/portal/admin/book-a-call",
    icon: Calendar,
    featureKey: "bookACall",
  },
  {
    title: "Safety Calendar Admin",
    href: "/calendar-admin",
    icon: CalendarClock,
    featureKey: "safetyCalendarAdmin",
  },
  {
    title: "Page Designer",
    href: "/portal/admin/page-designer",
    icon: Paintbrush,
    featureKey: "pageDesigner",
  },
  {
    title: "Mail",
    href: "/portal/admin/mail",
    icon: Mail,
    featureKey: "mailAdmin",
  },
  {
    title: "Departments",
    href: "/portal/admin/departments",
    icon: Building2,
    featureKey: "departments",
  },
  {
    title: "Module Builds",
    href: "/portal/admin/modules",
    icon: Rocket,
    featureKey: "moduleBuilds",
  },
  {
    title: "AdamsBrain Admin",
    href: "/portal/admin/adams-brain",
    icon: Database,
    featureKey: "adamsBrainAdmin",
  },
  {
    title: "Platform Development",
    href: "/portal/admin/platform-development",
    icon: Wrench,
    featureKey: "platformDevelopment",
  },
];

// Adams Electric
const adamsBusinessItems: { title: string; href: string; icon: React.ElementType; badge?: string; featureKey: FeatureKey }[] = [
  {
    title: "Bug Tracker",
    href: "/portal/bug-tracker",
    icon: Bug,
    featureKey: "bugTracker",
  },
  {
    title: "System Documentation",
    href: "/portal/system-docs",
    icon: BookOpen,
    featureKey: "systemDocs",
  },
  {
    title: "Command Control",
    href: "/portal/opportunities",
    icon: Target,
    featureKey: "opportunities",
  },
  {
    title: "Projects",
    href: "/portal/projects",
    icon: FolderKanban,
    featureKey: "projects",
  },
  {
    title: "Adams Master Calendar",
    href: "/portal/calendar",
    icon: Calendar,
    featureKey: "calendar",
  },
  {
    title: "Meetings",
    href: "/portal/meetings",
    icon: Users,
    featureKey: "meetings",
  },
  {
    title: "Proposal Creator",
    href: "/portal/proposals",
    icon: FileText,
    badge: "AI",
    featureKey: "proposals",
  },
  {
    title: "Events",
    href: "/portal/admin/events",
    icon: Ticket,
    featureKey: "events",
  },
  {
    title: "Deals",
    href: "/portal/deals",
    icon: DollarSign,
    featureKey: "deals",
  },
  {
    title: "Supplier Search",
    href: "/portal/supplier-search",
    icon: Factory,
    badge: "AI",
    featureKey: "supplierSearch",
  },
  {
    title: "Team Members",
    href: "/portal/admin/team-members",
    icon: UserCog,
    featureKey: "teamMembers",
  },
  {
    title: "Affiliates",
    href: "/portal/affiliates",
    icon: Users,
    featureKey: "affiliates",
  },
  {
    title: "Customers",
    href: "/portal/customers",
    icon: Building,
    featureKey: "customers",
  },
  {
    title: "Documents",
    href: "/portal/documents",
    icon: FileText,
    featureKey: "documents",
  },
  {
    title: "GoHighLevel",
    href: "/portal/gohighlevel",
    icon: Plug,
    badge: "CRM",
    featureKey: "gohighlevel",
  },
  {
    title: "GHL Integration",
    href: "/portal/admin/ghl-migration",
    icon: ArrowRightLeft,
    featureKey: "ghlMigration",
  },
  {
    title: "Hero Carousel",
    href: "/portal/admin/hero",
    icon: Presentation,
    featureKey: "heroManagement",
  },
  {
    title: "Image Manager",
    href: "/portal/admin/images",
    icon: ImageIcon,
    featureKey: "imageManager",
  },
  {
    title: "Academy",
    href: "/academy",
    icon: GraduationCap,
    featureKey: "academy",
  },
  {
    title: "Academy Admin",
    href: "/portal/admin/academy",
    icon: GraduationCap,
    featureKey: "academyAdmin",
  },
  {
    title: "Navigation Manager",
    href: "/portal/admin/navigation",
    icon: Menu,
    featureKey: "navigationManager",
  },
  {
    title: "Revenue Config",
    href: "/portal/admin/revenue",
    icon: DollarSign,
    featureKey: "revenueConfig",
  },
  {
    title: "Alignable",
    href: "/portal/admin/alignable",
    icon: Network,
    featureKey: "alignable",
  },
  {
    title: "Backup & Restore",
    href: "/portal/admin/backups",
    icon: Database,
    featureKey: "backups",
  },
  {
    title: "Success Stories",
    href: "/portal/admin/success-stories",
    icon: Quote,
    featureKey: "successStories",
  },
];

export function PortalSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { getDisplayName, getInitials, profile, linkedTeamMember, isAuthenticated } = useUserProfile();
  const { canSeeFeature, canSeeSection, isPreviewMode } = useFeatureVisibility();
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);
  const currentUserRole = linkedTeamMember?.role || "affiliate";
  const showSuperAdminLink = isSuperAdmin(currentUserRole);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      // Sign out from Firebase Auth
      if (auth) {
        await auth.signOut();
      }
      // Clear session storage
      sessionStorage.removeItem("adams_authenticated");
      sessionStorage.removeItem("adams_user_email");
      sessionStorage.removeItem("adams_firebase_uid");
      sessionStorage.removeItem("adams_user_name");
      sessionStorage.removeItem("adams_team_member_id");
      sessionStorage.removeItem("adams_user_role");
      // Clear local storage remember me
      localStorage.removeItem("adams_remembered_email");
      localStorage.removeItem("adams_remember_me");
      // Force a full page reload to reinitialize Firebase cleanly
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      window.location.href = "/";
    }
  };

  // Subscribe to Opportunities count (active opportunities)
  useEffect(() => {
    if (!db || !isAuthenticated || !auth?.currentUser) return;

    const q = query(
      collection(db, COLLECTIONS.OPPORTUNITIES),
      where("status", "in", ["new", "contacted", "qualified", "proposal", "negotiation"])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setOpportunitiesCount(snapshot.size);
      },
      (error) => {
        console.warn("Opportunities count subscription error:", error?.message || error);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Subscribe to Projects count (active projects)
  useEffect(() => {
    if (!db || !isAuthenticated || !auth?.currentUser) return;

    const q = query(
      collection(db, COLLECTIONS.PROJECTS),
      where("status", "in", ["planning", "in_progress", "on_hold"])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setProjectsCount(snapshot.size);
      },
      (error) => {
        console.warn("Projects count subscription error:", error?.message || error);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Collapsible state for each section
  const [openSections, setOpenSections] = useState({
    systemManagement: true,
    projectManagement: true,
    data: false,
    people: false,
    productivity: false,
    affiliateCenter: false,
    content: false,
    admin: false,
    adamsBusiness: true,
    missionCritical: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Get dynamic count for specific items
  const getDynamicCount = (href: string): number | null => {
    if (href === "/portal/opportunities") return opportunitiesCount > 0 ? opportunitiesCount : null;
    if (href === "/portal/projects") return projectsCount > 0 ? projectsCount : null;
    return null;
  };

  // Helper to render menu items
  const renderMenuItems = (items: typeof systemManagementItems) => (
    <SidebarMenu>
      {items.filter(item => canSeeFeature(item.featureKey)).map((item) => {
        const dynamicCount = getDynamicCount(item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
              tooltip={item.title}
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
            {dynamicCount !== null ? (
              <SidebarMenuBadge>{dynamicCount}</SidebarMenuBadge>
            ) : item.badge ? (
              <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
            ) : null}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  // Helper to render a collapsible section
  const renderSection = (
    sectionKey: keyof typeof openSections,
    label: string,
    items: typeof systemManagementItems
  ) => {
    const visibleItems = items.filter(item => canSeeFeature(item.featureKey));
    if (visibleItems.length === 0) return null;

    return (
      <Collapsible open={openSections[sectionKey]} onOpenChange={() => toggleSection(sectionKey)}>
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md flex items-center justify-between pr-2">
              <span>{label}</span>
              {openSections[sectionKey] ? (
                <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
              ) : (
                <ChevronRight className="h-4 w-4 text-sidebar-foreground/60" />
              )}
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>
              {renderMenuItems(visibleItems)}
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/portal" className="flex items-center gap-2 px-2 py-4">
          <NextImage
            src="/images/adamselectric_logo.png"
            alt="Adams Electric"
            width={160}
            height={53}
            className="h-10 w-auto"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Preview Mode Indicator */}
        {isPreviewMode && (
          <div className="mx-2 mb-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-md">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              👁️ Preview Mode Active
            </p>
          </div>
        )}

        {/* Adams Electric */}
        <Collapsible open={openSections.adamsBusiness} onOpenChange={() => toggleSection("adamsBusiness")}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md flex items-center justify-between pr-2">
                <span>Adams Electric</span>
                {openSections.adamsBusiness ? (
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-sidebar-foreground/60" />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adamsBusinessItems.filter(item => canSeeFeature(item.featureKey)).map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge && (
                        <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  ))}
                  {/* SuperAdmin Controls - Only visible to superadmins */}
                  {showSuperAdminLink && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/portal/admin/superadmin"}
                        tooltip="SuperAdmin Controls"
                      >
                        <Link href="/portal/admin/superadmin">
                          <Shield className="h-4 w-4" />
                          <span>SuperAdmin Controls</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* System Management */}
        {renderSection("systemManagement", "System Management", systemManagementItems)}

        {/* Project Management */}
        {renderSection("projectManagement", "Project Management", projectManagementItems)}

        {/* Productivity */}
        {renderSection("productivity", "Productivity", productivityItems)}

        {/* Data */}
        {renderSection("data", "Data", dataItems)}

        {/* People */}
        {renderSection("people", "People", peopleItems)}

        {/* Affiliate Center */}
        {renderSection("affiliateCenter", "Affiliate Center", affiliateCenterItems)}

        {/* Content */}
        {renderSection("content", "Content", contentItems)}

        {/* Admin */}
        {renderSection("admin", "Admin", adminItems)}

        {/* Mission Critical */}
        {renderSection("missionCritical", "Mission Critical", missionCriticalItems)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {/* Admin view controls */}
        <TeamMemberSwitcher />
        <RoleSwitcherCompact />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm">
                    <span className="font-medium">{getDisplayName()}</span>
                    <span className="text-xs text-sidebar-foreground/60 capitalize">{profile.role.replace("_", " ")}</span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/portal/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/portal/settings?tab=notifications">
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/portal/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
