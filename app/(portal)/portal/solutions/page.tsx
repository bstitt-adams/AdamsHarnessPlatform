"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";

interface InterviewSummary {
  id: string;
  title: string;
  status: string;
  departmentId: string;
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

export default function SolutionsPage() {
  const { isLoading: profileLoading, isAuthenticated } = useUserProfile();
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [departments, setDepartments] = useState<Map<string, Department>>(new Map());
  const [loading, setLoading] = useState(true);

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
    if (!profileLoading && isAuthenticated) load();
    else if (!profileLoading) setLoading(false);
  }, [profileLoading, isAuthenticated, load]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" /> Solutions
          </h1>
          <p className="text-muted-foreground">
            Process interviews and solution specifications for your departments.
          </p>
        </div>
        <Button asChild>
          <Link href="/portal/solutions/new">
            <Plus className="mr-2 h-4 w-4" /> New Interview
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Interviews</CardTitle>
          <CardDescription>
            Pick up an in-progress interview or review a specification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : interviews.length === 0 ? (
            <p className="text-muted-foreground text-center p-8">
              No interviews yet. Start one to define a solution for your department.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((interview) => (
                  <TableRow key={interview.id}>
                    <TableCell className="font-medium">{interview.title}</TableCell>
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
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/portal/solutions/${interview.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
