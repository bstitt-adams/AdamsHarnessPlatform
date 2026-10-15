"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Target,
  FolderKanban,
  CheckSquare,
  Users,
  Calendar,
  Clock,
  Video,
  FileText,
  AlertCircle,
  MoreHorizontal,
  Plus,
  Bug,
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, Timestamp, onSnapshot } from "firebase/firestore";
import { COLLECTIONS, type OpportunityDoc, type ProjectDoc, type ActionItemDoc, type ActivityDoc, type TeamMemberDoc } from "@/lib/schema";
import type { CalendarEventDoc } from "@/lib/schema";
import { DataMigrationBanner } from "@/components/portal/data-migration-banner";
import { BugTrackerForm } from "@/components/bug-tracker";

// Types for dashboard data
interface DashboardStats {
  pipeline: {
    value: number;
    change: number;
    trend: "up" | "down";
  };
  activeProjects: {
    count: number;
    atRisk: number;
  };
  actionItems: {
    progress: number;
    daysRemaining: number;
  };
  teamOnline: number;
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

interface MeetingDisplay {
  id: string;
  title: string;
  time: string;
  duration: string;
  attendees: number;
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
  return stage.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
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

function getCurrentQuarter(): string {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return `Q${quarter} ${now.getFullYear()}`;
}

function getDaysRemainingInQuarter(): number {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
  const diffMs = quarterEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / 86400000));
}

export default function CommandCenterPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    pipeline: { value: 0, change: 0, trend: "up" },
    activeProjects: { count: 0, atRisk: 0 },
    actionItems: { progress: 0, daysRemaining: getDaysRemainingInQuarter() },
    teamOnline: 0,
    bugTracker: { openBugs: 0, totalItems: 0, criticalCount: 0 },
  });
  const [opportunities, setOpportunities] = useState<OpportunityDisplay[]>([]);
  const [meetings, setMeetings] = useState<MeetingDisplay[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemDisplay[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityDisplay[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ initials: string; name: string }[]>([]);

  // Get user ID from auth or session storage
  useEffect(() => {
    if (auth?.currentUser) {
      setUserId(auth.currentUser.uid);
    } else {
      // Fallback to session storage for team member ID
      const teamMemberId = sessionStorage.getItem("adams_team_member_id");
      if (teamMemberId) {
        setUserId(teamMemberId);
      }
    }
  }, []);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!db) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch opportunities
        const oppsRef = collection(db, COLLECTIONS.OPPORTUNITIES);
        const oppsQuery = query(oppsRef, orderBy("updatedAt", "desc"), limit(5));
        const oppsSnapshot = await getDocs(oppsQuery);
        
        let totalPipelineValue = 0;
        const oppsData: OpportunityDisplay[] = [];
        
        oppsSnapshot.forEach((doc) => {
          const data = doc.data() as OpportunityDoc;
          if (data.stage !== "closed-won" && data.stage !== "closed-lost") {
            totalPipelineValue += data.value || 0;
          }
          const updatedAt = data.updatedAt?.toDate() || new Date();
          oppsData.push({
            id: doc.id,
            name: data.name || "Unnamed Opportunity",
            stage: data.stage || "lead",
            value: data.value || 0,
            daysAgo: getDaysAgo(updatedAt),
            owner: { name: "Owner", initials: "OW" },
          });
        });
        setOpportunities(oppsData);

        // Fetch projects
        const projectsRef = collection(db, COLLECTIONS.PROJECTS);
        const activeProjectsQuery = query(projectsRef, where("status", "==", "active"));
        const projectsSnapshot = await getDocs(activeProjectsQuery);
        
        let activeCount = 0;
        let atRiskCount = 0;
        projectsSnapshot.forEach((doc) => {
          const data = doc.data() as ProjectDoc;
          activeCount++;
          if (data.status === "on-hold") {
            atRiskCount++;
          }
        });

        // Fetch action items (Traction Todos)
        const todosRef = collection(db, COLLECTIONS.TRACTION_TODOS);
        const todosQuery = query(todosRef, where("status", "!=", "complete"), orderBy("status"), orderBy("dueDate", "asc"), limit(5));
        
        try {
          const todosSnapshot = await getDocs(todosQuery);
          const todosData: ActionItemDisplay[] = [];
          todosSnapshot.forEach((doc) => {
            const data = doc.data();
            const dueDate = data.dueDate?.toDate();
            todosData.push({
              id: doc.id,
              title: data.description || "Task",
              dueDate: dueDate ? getRelativeTime(dueDate) : "No due date",
              priority: data.priority || "medium",
              completed: data.status === "complete",
            });
          });
          setActionItems(todosData);
        } catch {
          setActionItems([]);
        }

        // Fetch recent activity
        const activitiesRef = collection(db, COLLECTIONS.ACTIVITIES);
        const activitiesQuery = query(activitiesRef, orderBy("createdAt", "desc"), limit(5));
        
        try {
          const activitiesSnapshot = await getDocs(activitiesQuery);
          const activitiesData: ActivityDisplay[] = [];
          activitiesSnapshot.forEach((doc) => {
            const data = doc.data() as ActivityDoc;
            const createdAt = data.createdAt?.toDate() || new Date();
            activitiesData.push({
              id: doc.id,
              type: data.entityType || "project",
              message: data.description || "Activity",
              time: getRelativeTime(createdAt),
            });
          });
          setRecentActivity(activitiesData);
        } catch {
          setRecentActivity([]);
        }

        // Fetch team members
        const teamRef = collection(db, COLLECTIONS.TEAM_MEMBERS);
        const teamQuery = query(teamRef, where("status", "==", "active"), limit(10));
        
        try {
          const teamSnapshot = await getDocs(teamQuery);
          const teamData: { initials: string; name: string }[] = [];
          teamSnapshot.forEach((doc) => {
            const data = doc.data() as TeamMemberDoc;
            const initials = `${(data.firstName || "")[0] || ""}${(data.lastName || "")[0] || ""}`.toUpperCase() || "??";
            teamData.push({
              initials,
              name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Team Member",
            });
          });
          setTeamMembers(teamData);
        } catch {
          setTeamMembers([]);
        }

        // Fetch action items progress
        const rocksRef = collection(db, COLLECTIONS.TRACTION_ROCKS);
        const currentQuarter = getCurrentQuarter();
        const rocksQuery = query(rocksRef, where("quarter", "==", currentQuarter));
        
        let totalProgress = 0;
        let actionItemCount = 0;
        try {
          const rocksSnapshot = await getDocs(rocksQuery);
          rocksSnapshot.forEach((doc) => {
            const data = doc.data();
            totalProgress += data.progress || 0;
            actionItemCount++;
          });
        } catch {
          // Action items collection may not exist
        }

        // Fetch bug tracker stats
        let openBugsCount = 0;
        let totalItemsCount = 0;
        let criticalCount = 0;
        
        try {
          const bugTrackerRef = collection(db, COLLECTIONS.BUG_TRACKER_ITEMS);
          const bugTrackerSnapshot = await getDocs(bugTrackerRef);
          
          bugTrackerSnapshot.forEach((doc) => {
            const data = doc.data();
            totalItemsCount++;
            if (data.type === "bug" && data.status === "open") {
              openBugsCount++;
            }
            if (data.priority === "critical") {
              criticalCount++;
            }
          });
        } catch {
          // Bug tracker collection may not exist
        }

        // Update stats
        setStats({
          pipeline: {
            value: totalPipelineValue,
            change: 0, // Would need historical data to calculate
            trend: "up",
          },
          activeProjects: {
            count: activeCount,
            atRisk: atRiskCount,
          },
          actionItems: {
            progress: actionItemCount > 0 ? Math.round(totalProgress / actionItemCount) : 0,
            daysRemaining: getDaysRemainingInQuarter(),
          },
          teamOnline: teamMembers.length,
          bugTracker: {
            openBugs: openBugsCount,
            totalItems: totalItemsCount,
            criticalCount: criticalCount,
          },
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Real-time listener for today's meetings
  useEffect(() => {
    if (!db) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const eventsRef = collection(db, COLLECTIONS.CALENDAR_EVENTS);
    const todayEventsQuery = query(
      eventsRef,
      where("startDate", ">=", Timestamp.fromDate(today)),
      where("startDate", "<", Timestamp.fromDate(tomorrow)),
      orderBy("startDate", "asc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      todayEventsQuery,
      (snapshot) => {
        const meetingsData: MeetingDisplay[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as CalendarEventDoc;
          const startDate = data.startDate?.toDate();
          const endDate = data.endDate?.toDate();
          const durationMins = startDate && endDate
            ? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
            : 30;

          meetingsData.push({
            id: doc.id,
            title: data.title || "Meeting",
            time: startDate ? startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
            duration: `${durationMins} min`,
            attendees: data.attendees?.length || 0,
          });
        });
        setMeetings(meetingsData);
      },
      (error) => {
        console.error("Error listening to today's meetings:", error);
        setMeetings([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Migration Banner */}
      {userId && <DataMigrationBanner userId={userId} />}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/portal/ask">
              Ask AI
            </Link>
          </Button>
          <Button asChild>
            <Link href="/portal/opportunities/new">
              New Opportunity
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pipeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pipeline.value)}</div>
            {stats.pipeline.value > 0 ? (
              <div className="flex items-center text-xs text-muted-foreground">
                {stats.pipeline.trend === "up" ? (
                  <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                )}
                <span className={stats.pipeline.trend === "up" ? "text-green-500" : "text-red-500"}>
                  Active opportunities
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No active opportunities</p>
            )}
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects.count}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.activeProjects.atRisk > 0 ? (
                <>
                  <AlertCircle className="mr-1 h-4 w-4 text-orange-500" />
                  <span className="text-orange-500">{stats.activeProjects.atRisk} at risk</span>
                </>
              ) : stats.activeProjects.count > 0 ? (
                <span className="text-green-500">All on track</span>
              ) : (
                <span>No active projects</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Items Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{getCurrentQuarter()} Action Items</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.actionItems.progress}%</div>
            <Progress value={stats.actionItems.progress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.actionItems.daysRemaining} days remaining
            </p>
          </CardContent>
        </Card>

        {/* Team Online */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Team Online</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <div className="flex -space-x-2 mt-2">
              {teamMembers.length > 0 ? (
                teamMembers.slice(0, 5).map((member, i) => (
                  <Avatar key={i} className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No team members</p>
              )}
              {teamMembers.length > 5 && (
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    +{teamMembers.length - 5}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bug Tracker Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bug Tracker</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bugTracker.openBugs}</div>
            <div className="flex items-center text-xs text-muted-foreground gap-2">
              {stats.bugTracker.criticalCount > 0 ? (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">{stats.bugTracker.criticalCount} critical</span>
                </>
              ) : stats.bugTracker.openBugs > 0 ? (
                <span className="text-sky-500">{stats.bugTracker.openBugs} open bugs</span>
              ) : (
                <span className="text-green-500">No open bugs</span>
              )}
              <span className="text-muted-foreground">•</span>
              <span>{stats.bugTracker.totalItems} total items</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Opportunities */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Opportunities</CardTitle>
              <CardDescription>Your latest pipeline activity</CardDescription>
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
                          <Badge variant="secondary" className={`${getStageColor(opp.stage)} text-white`}>
                            {formatStage(opp.stage)}
                          </Badge>
                          <span>•</span>
                          <span>{opp.daysAgo === 0 ? "Today" : `${opp.daysAgo} days ago`}</span>
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
                <p className="text-muted-foreground mb-4">No opportunities yet</p>
                <Button asChild>
                  <Link href="/portal/opportunities/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Opportunity
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Meetings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today's Meetings</CardTitle>
              <CardDescription>Your schedule for today</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/portal/calendar">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {meetings.length > 0 ? (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
                      <Video className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{meeting.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{meeting.time}</span>
                        <span>•</span>
                        <span>{meeting.duration}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Join
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No meetings scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Action Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Action Items</CardTitle>
              <CardDescription>Tasks requiring your attention</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/portal/rocks">
                View All
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
                      <p className={`font-medium ${item.completed ? "line-through" : ""}`}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Due: {item.dueDate}</span>
                        {item.priority === "high" && !item.completed && (
                          <Badge variant="destructive" className="text-xs">
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
                <p className="text-muted-foreground">No pending action items</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates across the platform</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/portal/notifications">
                View All
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
                      {activity.type === "organization" && <Target className="h-4 w-4" />}
                      {activity.type === "affiliate" && <Users className="h-4 w-4" />}
                      {activity.type === "settings" && <CheckSquare className="h-4 w-4" />}
                      {activity.type === "task" && <CheckSquare className="h-4 w-4" />}
                      {activity.type === "rock" && <Target className="h-4 w-4" />}
                      {activity.type === "proposal" && <FileText className="h-4 w-4" />}
                      {activity.type === "calendar" && <Calendar className="h-4 w-4" />}
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
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Bug Report */}
        <BugTrackerForm compact onSuccess={() => {
          // Refresh stats after successful submission
          // This will be handled by the parent component's state
        }} />
      </div>
    </div>
  );
}
