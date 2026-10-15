"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { 
  getCourse, 
  getModules, 
  getLessons, 
  getEnrollment,
  getLesson,
  CourseDoc, 
  CourseModuleDoc, 
  LessonDoc,
  EnrollmentDoc 
} from "@/lib/firebase-lms";
import { 
  getLessonProgress, 
  markLessonComplete, 
  markLessonIncomplete,
  LessonProgressDoc 
} from "@/lib/firebase-lms-student";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  ChevronLeft,
  ChevronRight,
  FileText,
  Video,
  HelpCircle,
  Download,
  ArrowLeft,
  Loader2,
  Check,
  X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { QuizPlayer } from "@/components/academy/quiz-player";
import { toast } from "sonner";

interface ModuleWithLessons extends CourseModuleDoc {
  lessons: LessonDoc[];
}

export default function LessonViewerPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, isAuthenticated } = useUserProfile();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [course, setCourse] = useState<CourseDoc | null>(null);
  const [lesson, setLesson] = useState<LessonDoc | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [enrollment, setEnrollment] = useState<EnrollmentDoc | null>(null);
  const [progress, setProgress] = useState<LessonProgressDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && profile.id && courseId && lessonId) {
      loadLessonData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, profile.id, courseId, lessonId]);

  const loadLessonData = async () => {
    if (!profile.id) return;

    setLoading(true);
    try {
      const [courseData, lessonData, enrollmentData, modulesData] = await Promise.all([
        getCourse(courseId),
        getLesson(lessonId),
        getEnrollment(profile.id, courseId),
        getModules(courseId),
      ]);

      if (!courseData || !lessonData) {
        router.push(`/portal/my-courses/${courseId}`);
        return;
      }

      setCourse(courseData);
      setLesson(lessonData);
      setEnrollment(enrollmentData);

      // Load lessons for each module
      const modulesWithLessons = await Promise.all(
        modulesData.map(async (mod) => {
          const lessons = await getLessons(mod.id);
          return { ...mod, lessons };
        })
      );
      setModules(modulesWithLessons);

      // Load progress
      const progressData = await getLessonProgress(profile.id, lessonId);
      setProgress(progressData);
    } catch (error) {
      console.error("Error loading lesson:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!profile.id || !enrollment) return;

    setCompleting(true);
    try {
      const newProgress = await markLessonComplete({
        userId: profile.id,
        lessonId,
        courseId,
        enrollmentId: enrollment.id,
      });
      setProgress(newProgress);
      toast.success("Lesson marked as complete!");
      
      // Navigate to next lesson
      const nextLesson = getNextLesson();
      if (nextLesson) {
        router.push(`/portal/my-courses/${courseId}/lessons/${nextLesson.id}`);
      }
    } catch (error) {
      console.error("Error marking complete:", error);
      toast.error("Failed to mark lesson as complete");
    } finally {
      setCompleting(false);
    }
  };

  const handleMarkIncomplete = async () => {
    if (!profile.id || !enrollment) return;

    setCompleting(true);
    try {
      await markLessonIncomplete({
        userId: profile.id,
        lessonId,
        courseId,
        enrollmentId: enrollment.id,
      });
      setProgress(prev => prev ? { ...prev, isCompleted: false, completedAt: null } : null);
      toast.success("Lesson marked as incomplete");
    } catch (error) {
      console.error("Error marking incomplete:", error);
      toast.error("Failed to update lesson status");
    } finally {
      setCompleting(false);
    }
  };

  const getAllLessons = (): LessonDoc[] => {
    return modules.flatMap(m => m.lessons);
  };

  const getCurrentLessonIndex = (): number => {
    const allLessons = getAllLessons();
    return allLessons.findIndex(l => l.id === lessonId);
  };

  const getPreviousLesson = (): LessonDoc | null => {
    const allLessons = getAllLessons();
    const currentIndex = getCurrentLessonIndex();
    return currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  };

  const getNextLesson = (): LessonDoc | null => {
    const allLessons = getAllLessons();
    const currentIndex = getCurrentLessonIndex();
    return currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  };

  const getLessonIcon = (contentType: string) => {
    switch (contentType) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "text":
        return <FileText className="h-4 w-4" />;
      case "quiz":
        return <HelpCircle className="h-4 w-4" />;
      case "download":
        return <Download className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course || !lesson) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Lesson Not Found</h1>
        <Button asChild>
          <Link href={`/portal/my-courses/${courseId}`}>Back to Course</Link>
        </Button>
      </div>
    );
  }

  const previousLesson = getPreviousLesson();
  const nextLesson = getNextLesson();
  const isCompleted = progress?.isCompleted || false;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/portal/my-courses/${courseId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course
              </Link>
            </Button>
            
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              ) : (
                <Badge variant="secondary">In Progress</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Lesson Header */}
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                {getLessonIcon(lesson.contentType)}
                <span className="capitalize">{lesson.contentType}</span>
                {lesson.videoDurationSeconds && (
                  <>
                    <span>•</span>
                    <span>{Math.round(lesson.videoDurationSeconds / 60)} min</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">{lesson.title}</h1>
              {lesson.description && (
                <p className="text-muted-foreground mt-2">{lesson.description}</p>
              )}
            </div>

            {/* Content Area */}
            <Card>
              <CardContent className="p-6">
                {lesson.contentType === "video" && lesson.videoUrl && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                      src={lesson.videoUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {lesson.contentType === "text" && lesson.textContent && (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown>{lesson.textContent}</ReactMarkdown>
                  </div>
                )}

                {lesson.contentType === "quiz" && enrollment && (
                  <QuizPlayer
                    lessonId={lessonId}
                    courseId={courseId}
                    enrollmentId={enrollment.id}
                    userId={profile.id}
                    quizContent={lesson.textContent || ""}
                    onComplete={() => {
                      setProgress(prev => prev ? { ...prev, isCompleted: true } : null);
                    }}
                  />
                )}

                {lesson.contentType === "download" && lesson.downloadUrl && (
                  <div className="text-center py-8">
                    <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Downloadable Resource</h3>
                    <p className="text-muted-foreground mb-4">
                      Click below to download the resource for this lesson.
                    </p>
                    <Button asChild>
                      <a href={lesson.downloadUrl} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download Resource
                      </a>
                    </Button>
                  </div>
                )}

                {lesson.contentType === "assignment" && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Assignment</h3>
                    {lesson.textContent ? (
                      <div className="prose prose-slate dark:prose-invert max-w-none text-left">
                        <ReactMarkdown>{lesson.textContent}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        Complete the assignment as described and mark this lesson complete when finished.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completion Actions */}
            {lesson.contentType !== "quiz" && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {isCompleted ? "Lesson Completed!" : "Mark as Complete"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isCompleted 
                          ? "You've completed this lesson. You can mark it incomplete if needed."
                          : "Click the button when you've finished this lesson."}
                      </p>
                    </div>
                    {isCompleted ? (
                      <Button 
                        variant="outline" 
                        onClick={handleMarkIncomplete}
                        disabled={completing}
                      >
                        {completing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Mark Incomplete
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleMarkComplete}
                        disabled={completing}
                      >
                        {completing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Mark Complete
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              {previousLesson ? (
                <Button variant="outline" asChild>
                  <Link href={`/portal/my-courses/${courseId}/lessons/${previousLesson.id}`}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous: {previousLesson.title}
                  </Link>
                </Button>
              ) : (
                <div />
              )}
              
              {nextLesson ? (
                <Button asChild>
                  <Link href={`/portal/my-courses/${courseId}/lessons/${nextLesson.id}`}>
                    Next: {nextLesson.title}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href={`/portal/my-courses/${courseId}`}>
                    Back to Course Overview
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar - Course Outline */}
          <div className="hidden lg:block">
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Course Outline</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="px-4 pb-4 space-y-4">
                    {modules.map((module, moduleIndex) => (
                      <div key={module.id}>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Module {moduleIndex + 1}: {module.title}
                        </p>
                        <div className="space-y-1">
                          {module.lessons.map((l, lessonIndex) => {
                            const isCurrent = l.id === lessonId;
                            return (
                              <Link
                                key={l.id}
                                href={`/portal/my-courses/${courseId}/lessons/${l.id}`}
                                className={`flex items-center gap-2 p-2 rounded-md text-sm transition-colors ${
                                  isCurrent 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'hover:bg-muted'
                                }`}
                              >
                                <span className="shrink-0">
                                  {getLessonIcon(l.contentType)}
                                </span>
                                <span className="truncate">
                                  {lessonIndex + 1}. {l.title}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
