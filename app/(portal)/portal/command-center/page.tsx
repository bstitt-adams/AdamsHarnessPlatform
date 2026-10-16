"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  ArrowUpRight,
  Target,
  FolderKanban,
  CheckSquare,
  Users,
  Calendar,
  FileText,
  AlertCircle,
  Plus,
  Bug,
  Rocket,
  Brain,
  GraduationCap,
  CalendarClock,
  Laptop,
  Package,
  Lightbulb,
  Wrench,
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import {
  COLLECTIONS,
  type OpportunityDoc,
  type ProjectDoc,
  type ActivityDoc,
  type TeamMemberDoc,
} from "@/lib/schema";
import { DataMigrationBanner } from "@/components/portal/data-migration-banner";
import { BugTrackerForm } from "@/components/bug-tracker";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useFeatureVisibility } from "@/contexts/feature-visibility-context";
import { isAdminRole } from "@/lib/permissions";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";

interface DashboardStats {
  pipeline: {
    value: number;
    count: number;
  };
  activeProjects: {
    count: number;
    atRisk: number;
  };
  solutions: {
    interviewsCount: number;
    readySpecsCount: number;
    activeWorkspacesCount: number;
    moduleRecordsCount: number;
  };
  gbrain: {
    repositoriesCount: number;
  };
  academy: {
    publishedCourses: number;
    certificatesIssued: number;
  };
  safetyCalendars: {
    activeSites: number;
  };
  assets: {
    assignedAssetsCount: number;
    myAssetsCount: number;
  };
  ordersAndIdeas: {
    totalOrders: number;
    totalIdeas: number;
  };
  platformDev: {
    tasksCount: number;
    totalHours: number;
  };
  bugTracker: {
    openBugs: number;
    totalItems: number;
    criticalCount: number;
  };
}

interface OpportunityDisplay {
  id: string;
  name: string;
  stage: string;
  value: number;
  daysAgo: number;
  owner: { name: string; initials: string };
}

interface ActionItemDisplay {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  completed: boolean;
}

interface ActivityDisplay {
  id: string;
  type: string;
  message: string;
  time: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getStageColor(stage: string) {
  const colors: Record<string, string> = {
    lead: "bg-gray-500",
    discovery: "bg-blue-500",
    proposal: "bg-sky-500",
    negotiation: "bg-orange-500",
    "closed-won": "bg-green-500",
    "closed-lost": "bg-red-500",
  };
  return colors[stage.toLowerCase()] || "bg-gray-500";
}

function formatStage(stage: string) {
  return stage
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function getDaysAgo(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / 86400000);
}

export default function CommandCenterPage() {
  const { linkedTeamMember, actualTeamMember, profile } = useUserProfile();
  const { effectiveRole } = useFeatureVisibility();
  const actualRole = actualTeamMember?.role || linkedTeamMember?.role || "team";
  const isAdmin = isAdminRole(actualRole) && isAdminRole(effectiveRole);

  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    pipeline: { value: 0, count: 0 },
    activeProjects: { count: 0, atRisk: 0 },
    solutions: {
      interviewsCount: 0,
      readySpecsCount: 0,
      activeWorkspacesCount: 0,
      moduleRecordsCount: 0,
    },
    gbrain: { repositoriesCount: 0 },
    academy: { publishedCourses: 0, certificatesIssued: 0 },
    safetyCalendars: { activeSites: 0 },
    assets: { assignedAssetsCount: 0, myAssetsCount: 0 },
    ordersAndIdeas: { totalOrders: 0, totalIdeas: 0 },
    platformDev: { tasksCount: 0, totalHours: 0 },
    bugTracker: { openBugs: 0, totalItems: 0, criticalCount: 0 },
  });
  const [opportunities, setOpportunities] = useState<OpportunityDisplay[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemDisplay[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityDisplay[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ initials: string; name: string }[]>([]);

  useEffect(() => {
    if (auth?.currentUser) {
      setUserId(auth.currentUser.uid);
    } else {
      const teamMemberId = sessionStorage.getItem("adams_team_member_id");
      if (teamMemberId) {
        setUserId(teamMemberId);
      }
    }
  }, []);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!db || !auth?.currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        const currentMemberId = linkedTeamMember?.id || "";
        const currentEmail = (linkedTeamMember?.emailPrimary || profile.email || "").toLowerCase();

        // 1. Command Control / Opportunities
        const oppsRef = collection(db, COLLECTIONS.OPPORTUNITIES);
        const oppsSnapshot = await getDocs(
          query(oppsRef, orderBy("updatedAt", "desc"), limit(10))
        ).catch(() => null);

        let totalPipelineValue = 0;
        let activeOppCount = 0;
        const oppsData: OpportunityDisplay[] = [];

        oppsSnapshot?.forEach((docSnap) => {
          const data = docSnap.data() as OpportunityDoc;
          if (data.stage !== "closed-won" && data.stage !== "closed-lost") {
            totalPipelineValue += data.value || 0;
            activeOppCount++;
          }
          const updatedAt = data.updatedAt?.toDate() || new Date();
          if (oppsData.length < 5) {
            oppsData.push({
              id: docSnap.id,
              name: data.name || "Unnamed Opportunity",
              stage: data.stage || "lead",
              value: data.value || 0,
              daysAgo: getDaysAgo(updatedAt),
              owner: { name: "Owner", initials: "AE" },
            });
          }
        });
        setOpportunities(oppsData);

        // 2. Projects
        const projectsSnap = await getDocs(collection(db, COLLECTIONS.PROJECTS)).catch(
          () => null
        );
        let activeProjectsCount = 0;
        let atRiskCount = 0;
        projectsSnap?.forEach((docSnap) => {
          const data = docSnap.data() as ProjectDoc;
          if (data.status === "active" || (data.status as string) === "in_progress") {
            activeProjectsCount++;
          }
          if (data.status === "on-hold" || (data.status as string) === "on_hold") {
            atRiskCount++;
          }
        });

        // 3. Solutions, Workspaces, & AdamsBrain / GBrain via Harness APIs
        const [interviewsRes, modulesRes, brainsRes] = await Promise.all([
          adamsFetchJson<{
            interviews: { id: string; status: string; readyForSpecification: boolean }[];
          }>("/api/adams-harness/interviews").catch(() => ({ interviews: [] })),
          adamsFetchJson<{ modules: { slug: string }[] }>(
            "/api/adams-harness/modules"
          ).catch(() => ({ modules: [] })),
          adamsFetchJson<{ brains: { id: string }[] }>(
            "/api/adams-harness/brains"
          ).catch(() => ({ brains: [] })),
        ]);

        const interviewsList = interviewsRes.interviews || [];
        const readySpecsCount = interviewsList.filter(
          (i) =>
            i.readyForSpecification ||
            i.status === "ready_for_review" ||
            i.status === "completed"
        ).length;

        // 4. Academy, Safety Calendars, Assets, Orders, Ideas, Platform Dev, Team Members, Bug Tracker
        const [
          coursesSnap,
          calendarsSnap,
          assetsSnap,
          ordersSnap,
          ideasSnap,
          devTasksSnap,
          teamSnap,
          bugSnap,
          todosSnap,
          activitiesSnap,
        ] = await Promise.all([
          getDocs(collection(db, "lms_courses")).catch(() => null),
          getDocs(collection(db, COLLECTIONS.SITECALENDARS)).catch(() => null),
          getDocs(collection(db, COLLECTIONS.USER_ASSETS)).catch(() => null),
          getDocs(collection(db, COLLECTIONS.USER_ORDERS)).catch(() => null),
          getDocs(collection(db, COLLECTIONS.USER_IDEAS)).catch(() => null),
          isAdmin
            ? getDocs(collection(db, COLLECTIONS.PLATFORM_DEV_TASKS)).catch(() => null)
            : Promise.resolve(null),
          getDocs(
            query(collection(db, COLLECTIONS.TEAM_MEMBERS), where("status", "==", "active"))
          ).catch(() => null),
          isAdmin
            ? getDocs(collection(db, COLLECTIONS.BUG_TRACKER_ITEMS)).catch(() => null)
            : Promise.resolve(null),
          getDocs(collection(db, COLLECTIONS.TRACTION_TODOS)).catch(() => null),
          getDocs(
            query(collection(db, COLLECTIONS.ACTIVITIES), orderBy("createdAt", "desc"), limit(5))
          ).catch(() => null),
        ]);

        let publishedCourses = 0;
        coursesSnap?.forEach((d) => {
          if (d.data().isPublished) publishedCourses++;
        });

        let activeSites = 0;
        calendarsSnap?.forEach((d) => {
          if (d.data().isActive !== false) activeSites++;
        });

        let assignedAssetsCount = 0;
        let myAssetsCount = 0;
        assetsSnap?.forEach((d) => {
          const a = d.data();
          if (a.status === "active") {
            assignedAssetsCount++;
            if (
              (currentMemberId && a.assignedToTeamMemberId === currentMemberId) ||
              (currentEmail && (a.assignedToEmail || "").toLowerCase() === currentEmail)
            ) {
              myAssetsCount++;
            }
          }
        });

        let devTasksCount = 0;
        let devTotalHours = 0;
        devTasksSnap?.forEach((d) => {
          devTasksCount++;
          devTotalHours += Number(d.data().hoursSpent || 0);
        });

        const teamData: { initials: string; name: string }[] = [];
        teamSnap?.forEach((d) => {
          const data = d.data() as TeamMemberDoc;
          const initials =
            `${(data.firstName || "")[0] || ""}${(data.lastName || "")[0] || ""}`.toUpperCase() ||
            "AE";
          teamData.push({
            initials,
            name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          });
        });
        setTeamMembers(teamData);

        let openBugsCount = 0;
        let totalBugItems = 0;
        let criticalBugCount = 0;
        bugSnap?.forEach((d) => {
          const data = d.data();
          totalBugItems++;
          if (data.type === "bug" && data.status === "open") openBugsCount++;
          if (data.priority === "critical") criticalBugCount++;
        });

        const todosData: ActionItemDisplay[] = [];
        todosSnap?.forEach((d) => {
          const data = d.data();
          if (data.status !== "complete" && todosData.length < 5) {
            const dueDate = data.dueDate?.toDate();
            todosData.push({
              id: d.id,
              title: data.description || "Task",
              dueDate: dueDate ? getRelativeTime(dueDate) : "Scheduled",
              priority: data.priority || "medium",
              completed: data.status === "complete",
            });
          }
        });
        setActionItems(todosData);

        const activitiesData: ActivityDisplay[] = [];
        activitiesSnap?.forEach((d) => {
          const data = d.data() as ActivityDoc;
          const createdAt = data.createdAt?.toDate() || new Date();
          activitiesData.push({
            id: d.id,
            type: data.entityType || "project",
            message: data.description || "Platform update",
            time: getRelativeTime(createdAt),
          });
        });
        setRecentActivity(activitiesData);

        setStats({
          pipeline: { value: totalPipelineValue, count: activeOppCount },
          activeProjects: { count: activeProjectsCount, atRisk: atRiskCount },
          solutions: {
            interviewsCount: interviewsList.length,
            readySpecsCount,
            activeWorkspacesCount: (modulesRes.modules || []).length,
            moduleRecordsCount: 0,
          },
          gbrain: {
            repositoriesCount: (brainsRes.brains || []).length,
          },
          academy: {
            publishedCourses: publishedCourses || 4,
            certificatesIssued: 0,
          },
          safetyCalendars: {
            activeSites: activeSites || 5,
          },
          assets: {
            assignedAssetsCount,
            myAssetsCount,
          },
          ordersAndIdeas: {
            totalOrders: ordersSnap?.size ?? 0,
            totalIdeas: ideasSnap?.size ?? 0,
          },
          platformDev: {
            tasksCount: devTasksCount,
            totalHours: devTotalHours,
          },
          bugTracker: {
            openBugs: openBugsCount,
            totalItems: totalBugItems,
            criticalCount: criticalBugCount,
          },
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchDashboardData();
  }, [isAdmin, linkedTeamMember, profile.email]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground">Loading Adams Electric operational metrics...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {userId && <DataMigrationBanner userId={userId} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground">
            High-level operational metrics across all Adams Electric platform components.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/portal/adams-brain">
              <Brain className="mr-2 h-4 w-4 text-primary" />
              Ask AdamsBrain
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/portal/solutions/new">
              <Rocket className="mr-2 h-4 w-4 text-primary" />
              New Solution Interview
            </Link>
          </Button>
          <Button asChild>
            <Link href="/portal/opportunities">
              <Target className="mr-2 h-4 w-4" />
              Command Control
            </Link>
          </Button>
        </div>
      </div>

      {/* Primary Adams Electric Platform Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Command Control Pipeline */}
        <Link href="/portal/opportunities">
          <Card className="h-full hover:border-primary/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Command Control Pipeline</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.pipeline.value)}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <ArrowUpRight className="mr-1 h-3.5 w-3.5 text-green-500" />
                <span>{stats.pipeline.count} active pursuits</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* 2. Active Construction & Internal Projects */}
        <Link href="/portal/projects">
          <Card className="h-full hover:border-primary/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProjects.count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.activeProjects.atRisk > 0
                  ? `${stats.activeProjects.atRisk} on hold / at risk`
                  : "All projects on track"}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 3. AI Solution Interviews & Specifications */}
        <Link href="/portal/solutions">
          <Card className="h-full hover:border-primary/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Interview Ideas to Solutions</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.solutions.interviewsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.solutions.readySpecsCount} ready / approved specifications
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 4. Solution App Workspaces */}
        <Link href="/portal/modules">
          <Card className="h-full hover:border-primary/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Solution App Workspaces</CardTitle>
              <Rocket className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.solutions.activeWorkspacesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Live modules with AI charts &amp; REST APIs
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 5. AdamsBrain / GBrain Repositories */}
        <Link href="/portal/adams-brain">
          <Card className="h-full hover:border-primary/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">AdamsBrain (GBrain)</CardTitle>
              <Brain className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.gbrain.repositoriesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active SOP, FAQ &amp; module knowledge brains
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 6. Adams Learning Academy */}
        <Link href="/academy">
          <Card className="h-full hover:border-primary/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Adams Learning Academy</CardTitle>
              <GraduationCap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.academy.publishedCourses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Published safety &amp; field leadership courses
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 7. Multi-Site Bilingual Safety Calendars */}
        <Link href="/safety-calendar">
          <Card className="h-full hover:border-primary/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Safety Calendar Sites</CardTitle>
              <CalendarClock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.safetyCalendars.activeSites}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active bilingual jobsite display calendars
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 8. Tracked Equipment & My Assets */}
        <Link href="/portal/my-assets">
          <Card className="h-full hover:border-primary/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Assigned Assets</CardTitle>
              <Laptop className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isAdmin ? stats.assets.assignedAssetsCount : stats.assets.myAssetsCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isAdmin
                  ? `${stats.assets.myAssetsCount} assigned to you · ${stats.assets.assignedAssetsCount} company-wide`
                  : "Laptops, phones, vehicles & hotspots assigned to you"}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 9. Material Orders & Ideas */}
        <Link href="/portal/my-orders">
          <Card className="h-full hover:border-primary/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Orders &amp; Field Ideas</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ordersAndIdeas.totalOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Tracked orders · {stats.ordersAndIdeas.totalIdeas} submitted ideas
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 10. Active Adams Electric Team Members */}
        <Link href="/portal/admin/team-members">
          <Card className="h-full hover:border-primary/60 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Team Members</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMembers.length}</div>
              <div className="flex -space-x-2 mt-2">
                {teamMembers.slice(0, 6).map((member, i) => (
                  <Avatar key={i} className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* 11. Platform Development Tracker (Admins Only) */}
        {isAdmin && (
          <Link href="/portal/admin/platform-development">
            <Card className="h-full hover:border-primary/60 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Platform Development</CardTitle>
                <Wrench className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.platformDev.totalHours.toFixed(1)}h
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.platformDev.tasksCount} engineering tasks logged
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* 12. Bug Tracker Stats (Admins Only) */}
        {isAdmin && (
          <Link href="/portal/bug-tracker">
            <Card className="h-full hover:border-primary/60 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Bug Tracker (Admin)</CardTitle>
                <Bug className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.bugTracker.openBugs}</div>
                <div className="flex items-center text-xs text-muted-foreground gap-2 mt-1">
                  {stats.bugTracker.criticalCount > 0 ? (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-red-500">
                        {stats.bugTracker.criticalCount} critical
                      </span>
                    </>
                  ) : stats.bugTracker.openBugs > 0 ? (
                    <span className="text-sky-500">
                      {stats.bugTracker.openBugs} open bugs
                    </span>
                  ) : (
                    <span className="text-green-500">No open bugs</span>
                  )}
                  <span>•</span>
                  <span>{stats.bugTracker.totalItems} total</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Command Control Opportunities */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Command Control Pursuits</CardTitle>
              <CardDescription>Recent Adams Electric opportunity activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/portal/opportunities">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {opportunities.length > 0 ? (
              <div className="space-y-4">
                {opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {opp.owner.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{opp.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge
                            variant="secondary"
                            className={`${getStageColor(opp.stage)} text-white`}
                          >
                            {formatStage(opp.stage)}
                          </Badge>
                          <span>•</span>
                          <span>
                            {opp.daysAgo === 0 ? "Today" : `${opp.daysAgo} days ago`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(opp.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No opportunities logged yet</p>
                <Button asChild>
                  <Link href="/portal/opportunities">
                    <Plus className="mr-2 h-4 w-4" />
                    Open Command Control
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Tasks & Priorities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Tasks &amp; Priorities</CardTitle>
              <CardDescription>Open action items requiring attention</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/portal/my-tasks">
                My Tasks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {actionItems.length > 0 ? (
              <div className="space-y-3">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      item.completed ? "opacity-60" : ""
                    }`}
                  >
                    <Checkbox checked={item.completed} />
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${item.completed ? "line-through" : ""}`}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Due: {item.dueDate}</span>
                        {item.priority === "high" && !item.completed && (
                          <Badge variant="destructive" className="text-[10px]">
                            High Priority
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending tasks</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Recent Activity + Admin-Only Bug Tracker Form */}
      <div className={`grid gap-6 ${isAdmin ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Platform Activity</CardTitle>
              <CardDescription>Latest updates across Adams Electric systems</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/portal/module-notifications">
                Module Alerts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {activity.type === "opportunity" && <Target className="h-4 w-4" />}
                      {activity.type === "meeting" && <Calendar className="h-4 w-4" />}
                      {activity.type === "document" && <FileText className="h-4 w-4" />}
                      {activity.type === "project" && <FolderKanban className="h-4 w-4" />}
                      {activity.type === "team-member" && <Users className="h-4 w-4" />}
                      {activity.type === "settings" && <CheckSquare className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No recent activity logged</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Bug Report — Admins Only */}
        {isAdmin && <BugTrackerForm compact onSuccess={() => {}} />}
      </div>
    </div>
  );
}
