"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { BarChart3, BookOpen, CheckCircle2, Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { LMS_COLLECTIONS, type CourseDoc, type EnrollmentDoc } from "@/lib/firebase-lms";

interface ProgressRecord {
  courseId: string;
  isCompleted?: boolean;
}

export default function AcademyTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseDoc[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentDoc[]>([]);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [certificates, setCertificates] = useState(0);

  useEffect(() => {
    async function load() {
      if (!db) {
        setLoading(false);
        return;
      }
      try {
        const [coursesSnap, enrollmentsSnap, progressSnap, certificatesSnap] = await Promise.all([
          getDocs(collection(db, LMS_COLLECTIONS.COURSES)),
          getDocs(collection(db, LMS_COLLECTIONS.ENROLLMENTS)),
          getDocs(collection(db, LMS_COLLECTIONS.LESSON_PROGRESS)),
          getDocs(collection(db, LMS_COLLECTIONS.CERTIFICATES)),
        ]);
        setCourses(coursesSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as CourseDoc));
        setEnrollments(enrollmentsSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as EnrollmentDoc));
        setProgress(progressSnap.docs.map((item) => item.data() as ProgressRecord));
        setCertificates(certificatesSnap.size);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const completedLessons = progress.filter((item) => item.isCompleted).length;
  const averageCompletion = enrollments.length
    ? Math.round(enrollments.reduce((sum, item) => sum + (item.progressPercentage || 0), 0) / enrollments.length)
    : 0;
  const courseRows = useMemo(
    () => courses.map((course) => {
      const courseEnrollments = enrollments.filter((item) => item.courseId === course.id);
      const completion = courseEnrollments.length
        ? Math.round(courseEnrollments.reduce((sum, item) => sum + (item.progressPercentage || 0), 0) / courseEnrollments.length)
        : 0;
      return { course, enrollments: courseEnrollments.length, completion };
    }).sort((a, b) => b.enrollments - a.enrollments),
    [courses, enrollments],
  );

  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Academy Tracking & Metrics</h1>
        <p className="text-muted-foreground">Monitor learner engagement, completion, and certificate outcomes across Adams Academy.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active enrollments" value={enrollments.length} icon={Users} />
        <MetricCard label="Average completion" value={`${averageCompletion}%`} icon={BarChart3} />
        <MetricCard label="Lessons completed" value={completedLessons} icon={CheckCircle2} />
        <MetricCard label="Certificates issued" value={certificates} icon={BookOpen} />
      </div>
      <Card>
        <CardHeader><CardTitle>Course performance</CardTitle></CardHeader>
        <CardContent>
          {courseRows.length === 0 ? <p className="py-8 text-center text-muted-foreground">No course tracking data yet.</p> : (
            <div className="space-y-3">
              {courseRows.map(({ course, enrollments: count, completion }) => (
                <div key={course.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="min-w-0"><p className="truncate font-medium">{course.title}</p><p className="text-sm text-muted-foreground">{count} enrolled</p></div>
                  <Badge variant={completion >= 80 ? "default" : "secondary"}>{completion}% complete</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{label}</CardTitle><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{value}</div></CardContent></Card>;
}
