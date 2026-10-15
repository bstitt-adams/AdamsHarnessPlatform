"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { getUserEnrollments, getCourse, EnrollmentDoc, CourseDoc } from "@/lib/firebase-lms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  GraduationCap,
  Trophy,
  ArrowRight,
  Loader2
} from "lucide-react";

interface EnrolledCourse extends EnrollmentDoc {
  course: CourseDoc | null;
}

export default function MyCoursesPage() {
  const { profile, isAuthenticated } = useUserProfile();
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (isAuthenticated && profile.id) {
      loadEnrollments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, profile.id]);

  const loadEnrollments = async () => {
    if (!profile.id) return;
    
    setLoading(true);
    try {
      const userEnrollments = await getUserEnrollments(profile.id);
      
      // Fetch course details for each enrollment
      const enrolledCourses = await Promise.all(
        userEnrollments.map(async (enrollment) => {
          const course = await getCourse(enrollment.courseId);
          return { ...enrollment, course };
        })
      );
      
      setEnrollments(enrolledCourses);
    } catch (error) {
      console.error("Error loading enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEnrollments = enrollments.filter((e) => {
    if (activeTab === "all") return true;
    if (activeTab === "in-progress") return e.progressPercentage > 0 && e.progressPercentage < 100;
    if (activeTab === "completed") return e.progressPercentage === 100;
    if (activeTab === "not-started") return e.progressPercentage === 0;
    return true;
  });

  const stats = {
    total: enrollments.length,
    inProgress: enrollments.filter((e) => e.progressPercentage > 0 && e.progressPercentage < 100).length,
    completed: enrollments.filter((e) => e.progressPercentage === 100).length,
    notStarted: enrollments.filter((e) => e.progressPercentage === 0).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Courses</h1>
        <p className="text-muted-foreground">
          Track your learning progress and continue where you left off
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <PlayCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.notStarted}</p>
                <p className="text-sm text-muted-foreground">Not Started</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({stats.inProgress})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
          <TabsTrigger value="not-started">Not Started ({stats.notStarted})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Course Grid */}
      {filteredEnrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No courses found</h3>
            <p className="text-muted-foreground mb-4">
              {activeTab === "all" 
                ? "You haven't enrolled in any courses yet."
                : `No courses match the "${activeTab}" filter.`}
            </p>
            <Button asChild>
              <Link href="/academy/courses">Browse Courses</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEnrollments.map((enrollment) => (
            <CourseCard key={enrollment.id} enrollment={enrollment} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ enrollment }: { enrollment: EnrolledCourse }) {
  const { course } = enrollment;
  
  if (!course) {
    return null;
  }

  const isCompleted = enrollment.progressPercentage === 100;
  const isNotStarted = enrollment.progressPercentage === 0;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 relative">
        {course.thumbnailUrl ? (
          <img 
            src={course.thumbnailUrl} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-primary/40" />
          </div>
        )}
        {isCompleted && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500">
              <Trophy className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {course.shortDescription || course.description}
        </p>
      </CardHeader>

      <CardContent>
        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{enrollment.progressPercentage}%</span>
          </div>
          <Progress value={enrollment.progressPercentage} className="h-2" />
        </div>

        {/* Course Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          {course.estimatedDurationMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{Math.round(course.estimatedDurationMinutes / 60)}h</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{course.difficultyLevel}</span>
          </div>
        </div>

        {/* Action Button */}
        <Button asChild className="w-full">
          <Link href={`/portal/my-courses/${course.id}`}>
            {isNotStarted ? (
              <>
                Start Course
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : isCompleted ? (
              <>
                Review Course
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Continue Learning
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
