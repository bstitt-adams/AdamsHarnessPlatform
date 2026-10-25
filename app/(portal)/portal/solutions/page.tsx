"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Rocket,
  Settings,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";

interface InterviewSummary {
  id: string;
  title: string;
  task?: string;
  status: string;
  departmentId: string;
  respondentName?: string;
  createdByName?: string;
  readyForSpecification: boolean;
  updatedAt?: string;
  createdAt?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

const statusLabels: Record<string, string> = {
  draft: "Draft",
  interviewing: "Interviewing",
  ready_for_review: "Ready for Review",
  completed: "Completed",
};

const CHART_COLORS = ["#0072BC", "#10b981", "#f59e0b", "#6366f1", "#ec4899"];

function slugifySolutionTitle(title: string, idSuffix?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 45);
  const suffix = idSuffix ? `-${idSuffix.slice(0, 6).toLowerCase()}` : "";
  return `${base || "solution-app"}${suffix}`;
}

export default function SolutionsPage() {
  const { isLoading: profileLoading, isAuthenticated } = useUserProfile();
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [departments, setDepartments] = useState<Map<string, Department>>(new Map());
  const [loading, setLoading] = useState(true);

  // Global search & column filters
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [titleFilter, setTitleFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [interviewData, deptData] = await Promise.all([
        adamsFetchJson<{ interviews: InterviewSummary[] }>(
          "/api/adams-harness/interviews",
        ),
        adamsFetchJson<{ departments: Department[] }>(
          "/api/adams-harness/departments",
        ).catch(() => ({ departments: [] })),
      ]);
      setInterviews(interviewData.interviews);
      setDepartments(new Map(deptData.departments.map((d) => [d.id, d])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profileLoading && isAuthenticated) void load();
    else if (!profileLoading) setLoading(false);
  }, [profileLoading, isAuthenticated, load]);

  const filteredInterviews = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    const tf = titleFilter.trim().toLowerCase();
    return interviews.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (deptFilter !== "all" && item.departmentId !== deptFilter) return false;
      if (tf && !item.title.toLowerCase().includes(tf)) return false;

      if (!q) return true;
      const deptName = departments.get(item.departmentId)?.name || item.departmentId;
      return (
        item.title.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        deptName.toLowerCase().includes(q) ||
        (item.respondentName || "").toLowerCase().includes(q) ||
        (item.createdByName || "").toLowerCase().includes(q) ||
        (item.task || "").toLowerCase().includes(q)
      );
    });
  }, [interviews, departments, globalSearch, statusFilter, deptFilter, titleFilter]);

  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of interviews) {
      const label = statusLabels[item.status] || item.status;
      counts[label] = (counts[label] ?? 0) + 1;
    }
    const entries = Object.entries(counts).map(([name, value]) => ({ name, value }));
    return entries.length > 0 ? entries : [{ name: "No Ideas Yet", value: 0 }];
  }, [interviews]);

  const departmentChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of interviews) {
      const deptName = departments.get(item.departmentId)?.name || item.departmentId;
      counts[deptName] = (counts[deptName] ?? 0) + 1;
    }
    const entries = Object.entries(counts).map(([name, value]) => ({ name, value }));
    return entries.length > 0 ? entries : [{ name: "No Departments Yet", value: 0 }];
  }, [interviews, departments]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Interview Ideas to Solutions
          </h1>
          <p className="text-muted-foreground text-sm">
            Track process interviews, specifications, metrics, and launch each solution&apos;s standard app workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/portal/modules">
              <Rocket className="mr-2 h-4 w-4" /> All Solution Workspaces
            </Link>
          </Button>
          <Button asChild>
            <Link href="/portal/solutions/new">
              <Plus className="mr-2 h-4 w-4" /> New Interview
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              Total Interview Ideas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{interviews.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              Ready for Spec / Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {
                interviews.filter(
                  (i) =>
                    i.readyForSpecification ||
                    i.status === "ready_for_review" ||
                    i.status === "completed",
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              Active Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {interviews.filter((i) => i.status === "interviewing").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              Departments Participating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Set(interviews.map((i) => i.departmentId)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommended Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Solution Pipeline by Status
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                AI Recommended
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label
                  >
                    {statusChartData.map((_, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Solutions by Department
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                AI Recommended
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0072BC" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Search & Filterable Solutions Table */}
      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Solutions &amp; Interviews ({filteredInterviews.length})</CardTitle>
            <CardDescription>
              Open the interview/specification detail page, launch its standardized Solution App Workspace, or configure its Settings &amp; API.
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Global search across title, department, task, status, or ID..."
                className="pl-9"
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full sm:w-[190px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {Array.from(departments.values()).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="interviewing">Interviewing</SelectItem>
                <SelectItem value="ready_for_review">Ready for Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredInterviews.length === 0 ? (
            <p className="text-muted-foreground text-center p-8">
              No matching solution interviews found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="space-y-1 py-1">
                        <span>Title</span>
                        <Input
                          value={titleFilter}
                          onChange={(e) => setTitleFilter(e.target.value)}
                          placeholder="Filter title..."
                          className="h-7 text-xs max-w-[220px]"
                        />
                      </div>
                    </TableHead>
                    <TableHead>Respondent</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterviews.map((interview) => {
                    const appSlug = slugifySolutionTitle(interview.title, interview.id);
                    return (
                      <TableRow key={interview.id}>
                        <TableCell className="font-medium">{interview.title}</TableCell>
                        <TableCell className="text-sm">
                          {interview.respondentName || interview.createdByName || "-"}
                        </TableCell>
                        <TableCell>
                          {departments.get(interview.departmentId)?.name ||
                            interview.departmentId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              interview.status === "ready_for_review" ||
                              interview.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {statusLabels[interview.status] || interview.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {interview.updatedAt
                            ? new Date(interview.updatedAt).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/portal/solutions/${interview.id}`}>
                                Interview &amp; Spec
                              </Link>
                            </Button>
                            <Button size="sm" variant="default" asChild>
                              <Link href={`/portal/modules/${encodeURIComponent(appSlug)}`}>
                                <Rocket className="mr-1.5 h-3.5 w-3.5" />
                                App Workspace
                              </Link>
                            </Button>
                            <Button size="sm" variant="ghost" asChild title="Solution App Settings">
                              <Link href={`/portal/modules/${encodeURIComponent(appSlug)}/settings`}>
                                <Settings className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
