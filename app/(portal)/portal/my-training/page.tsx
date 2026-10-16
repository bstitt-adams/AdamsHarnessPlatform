"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useUserProfile } from "@/contexts/user-profile-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GraduationCap,
  Award,
  BookOpen,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface UserEnrollmentRow {
  id: string;
  courseId: string;
  courseTitle: string;
  progressPercentage: number;
  enrolledAt?: string;
  completedAt?: string;
}

interface UserCertificateRow {
  id: string;
  certificateNumber: string;
  courseTitle: string;
  studentName: string;
  issuedAt?: string;
}

export default function MyTrainingAndCertsPage() {
  const { linkedTeamMember, profile, isMasqueradingUser } = useUserProfile();
  const [enrollments, setEnrollments] = useState<UserEnrollmentRow[]>([]);
  const [certificates, setCertificates] = useState<UserCertificateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const viewedName = linkedTeamMember
    ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}`.trim()
    : profile.firstName
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : profile.email || "Current User";

  const targetUid = linkedTeamMember?.firebaseUid || auth?.currentUser?.uid || "";
  const targetMemberId = linkedTeamMember?.id || "";

  const loadTraining = useCallback(async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const candidateIds = Array.from(
        new Set([targetUid, targetMemberId].filter(Boolean))
      );

      const coursesSnap = await getDocs(collection(db, "lms_courses")).catch(() => null);
      const courseMap = new Map<string, string>();
      coursesSnap?.forEach((d) => {
        const data = d.data();
        courseMap.set(d.id, String(data.title || d.id));
      });

      const enrollRows: UserEnrollmentRow[] = [];
      const certRows: UserCertificateRow[] = [];

      if (candidateIds.length > 0) {
        const [enrollSnap, certSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "lms_enrollments"),
              where("userId", "in", candidateIds)
            )
          ).catch(() => null),
          getDocs(
            query(
              collection(db, "lms_certificates"),
              where("userId", "in", candidateIds)
            )
          ).catch(() => null),
        ]);

        enrollSnap?.forEach((d) => {
          const data = d.data();
          const courseId = String(data.courseId || "");
          enrollRows.push({
            id: d.id,
            courseId,
            courseTitle: courseMap.get(courseId) || String(data.courseTitle || courseId),
            progressPercentage: Number(data.progressPercentage ?? 0),
            enrolledAt: data.enrolledAt?.toDate
              ? data.enrolledAt.toDate().toLocaleDateString()
              : undefined,
            completedAt: data.completedAt?.toDate
              ? data.completedAt.toDate().toLocaleDateString()
              : undefined,
          });
        });

        certSnap?.forEach((d) => {
          const data = d.data();
          certRows.push({
            id: d.id,
            certificateNumber: String(data.certificateNumber || d.id),
            courseTitle: String(data.courseTitle || courseMap.get(String(data.courseId)) || "Course"),
            studentName: String(data.studentName || viewedName),
            issuedAt: data.issuedAt?.toDate
              ? data.issuedAt.toDate().toLocaleDateString()
              : undefined,
          });
        });
      }

      setEnrollments(enrollRows);
      setCertificates(certRows);
    } catch (err) {
      console.error("Failed to load training & certs:", err);
      toast.error("Failed to load training records");
    } finally {
      setLoading(false);
    }
  }, [targetUid, targetMemberId, viewedName]);

  useEffect(() => {
    void loadTraining();
  }, [loadTraining]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>My Mission Critical</span>
            <span>/</span>
            <span>My Training and Certs</span>
            {isMasqueradingUser && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                Viewing as {viewedName}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            My Training and Certs
          </h1>
          <p className="text-sm text-muted-foreground">
            Enrolled courses, progress, and earned Adams Electric certifications for {viewedName}.
          </p>
        </div>

        <Button asChild>
          <Link href="/academy">
            <BookOpen className="mr-2 h-4 w-4" />
            Browse Adams Learning Academy
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Enrolled Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{enrollments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Completed Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {enrollments.filter((e) => e.progressPercentage >= 100 || e.completedAt).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              Active Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{certificates.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Course Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle>My Course Enrollments ({enrollments.length})</CardTitle>
          <CardDescription>
            Courses {viewedName} is enrolled in across Adams Learning Academy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : enrollments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No course enrollments found for {viewedName}.{" "}
              <Link href="/academy" className="text-primary underline">
                Enroll in a course
              </Link>
              .
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enr) => (
                  <TableRow key={enr.id}>
                    <TableCell className="font-medium">{enr.courseTitle}</TableCell>
                    <TableCell className="w-48">
                      <div className="flex items-center gap-2">
                        <Progress value={enr.progressPercentage} className="h-2" />
                        <span className="text-xs text-muted-foreground">
                          {enr.progressPercentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {enr.enrolledAt || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {enr.completedAt || "In Progress"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Earned Certificates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            My Certifications ({certificates.length})
          </CardTitle>
          <CardDescription>
            Verified completion certificates issued to {viewedName}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {certificates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No certificates issued to {viewedName} yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate #</TableHead>
                  <TableHead>Course / Credential</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead className="text-right">Verify</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-mono text-xs">
                      {cert.certificateNumber}
                    </TableCell>
                    <TableCell className="font-medium">{cert.courseTitle}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {cert.issuedAt || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/portal/admin/academy/certificates">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Link>
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
