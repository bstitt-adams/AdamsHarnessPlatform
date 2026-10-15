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
  CourseDoc, 
  CourseModuleDoc, 
  LessonDoc,
  EnrollmentDoc 
} from "@/lib/firebase-lms";
import { getLessonProgress, LessonProgressDoc } from "@/lib/firebase-lms-student";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  BookOpen, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  HelpCircle,
  Download,
  Lock,
  ArrowLeft,
  Loader2,
  User
} from "lucide-react";

interface ModuleWithLessons extends CourseModuleDoc {
  lessons: LessonDoc[];
  completedLessons: number;
}

export default function CoursePlayerPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, isAuthenticated } = useUserProfile();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<CourseDoc | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [enrollment, setEnrollment] = useState<EnrollmentDoc | null>(null);
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgressDoc>>({});
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isAuthenticated && profile.id && courseId) {
      loadCourseData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, profile.id, courseId]);

  const loadCourseData = async () => {
    if (!profile.id) return;

    setLoading(true);
    try {
      // Load course, enrollment, and modules in parallel
      const [courseData, enrollmentData, modulesData] = await Promise.all([
        getCourse(courseId),
        getEnrollment(profile.id, courseId),
        getModules(courseId),
      ]);

      if (!courseData) {
        router.push("/portal/my-courses");
        return;
      }

      setCourse(courseData);
      setEnrollment(enrollmentData);

      // Load lessons for each module
      const modulesWithLessons = await Promise.all(
        modulesData.map(async (mod) => {
          const lessons = await getLessons(mod.id);
          return { ...mod, lessons, completedLessons: 0 };
        })
      );

      // Load progress for all lessons
      if (enrollmentData) {
        const progressMap: Record<string, LessonProgressDoc> = {};
        for (const mod of modulesWithLessons) {
          for (const lesson of mod.lessons) {
            const progress = await getLessonProgress(profile.id, lesson.id);
            if (progress) {
              progressMap[lesson.id] = progress;
            }
          }
          // Count completed lessons
          mod.completedLessons = mod.lessons.filter(l => progressMap[l.id]?.isCompleted).length;
        }
        setLessonProgress(progressMap);
      }

      setModules(modulesWithLessons);

      // Expand first incomplete module
      const firstIncompleteModule = modulesWithLessons.find(
        m => m.completedLessons < m.lessons.length
      );
      if (firstIncompleteModule) {
        setExpandedModules(new Set([firstIncompleteModule.id]));
      }
    } catch (error) {
      console.error("Error loading course:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const getNextLesson = (): LessonDoc | null => {
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        if (!lessonProgress[lesson.id]?.isCompleted) {
          return lesson;
        }
      }
    }
    return modules[0]?.lessons[0] || null;
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

  if (!course) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
        <Button asChild>
          <Link href="/portal/my-courses">Back to My Courses</Link>
        </Button>
      </div>
    );
  }

  const nextLesson = getNextLesson();
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedLessons = Object.values(lessonProgress).filter(p => p.isCompleted).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto py-6 px-4">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/portal/my-courses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Courses
            </Link>
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{course.title}</h1>
              <p className="text-muted-foreground mb-4">{course.shortDescription}</p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {course.instructorName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{course.instructorName}</span>
                  </div>
                )}
                {course.estimatedDurationMinutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{Math.round(course.estimatedDurationMinutes / 60)} hours</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{totalLessons} lessons</span>
                </div>
                <Badge variant="secondary">{course.difficultyLevel}</Badge>
              </div>
            </div>

            {nextLesson && (
              <Button size="lg" asChild>
                <Link href={`/portal/my-courses/${courseId}/lessons/${nextLesson.id}`}>
                  <PlayCircle className="h-5 w-5 mr-2" />
                  {completedLessons === 0 ? "Start Course" : "Continue Learning"}
                </Link>
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Course Progress</span>
              <span className="font-medium">
                {completedLessons} of {totalLessons} lessons completed ({enrollment?.progressPercentage || 0}%)
              </span>
            </div>
            <Progress value={enrollment?.progressPercentage || 0} className="h-2" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8 px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Course Curriculum */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Course Curriculum</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {modules.map((module, moduleIndex) => (
                    <Collapsible
                      key={module.id}
                      open={expandedModules.has(module.id)}
                      onOpenChange={() => toggleModule(module.id)}
                    >
                      <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedModules.has(module.id) ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="text-left">
                              <p className="font-medium">
                                Module {moduleIndex + 1}: {module.title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {module.completedLessons} of {module.lessons.length} lessons completed
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {module.completedLessons === module.lessons.length && module.lessons.length > 0 ? (
                              <Badge className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {module.completedLessons}/{module.lessons.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t bg-muted/30">
                          {module.lessons.map((lesson, lessonIndex) => {
                            const progress = lessonProgress[lesson.id];
                            const isCompleted = progress?.isCompleted;

                            return (
                              <Link
                                key={lesson.id}
                                href={`/portal/my-courses/${courseId}/lessons/${lesson.id}`}
                                className="flex items-center gap-3 p-4 pl-12 hover:bg-muted/50 transition-colors border-t first:border-t-0"
                              >
                                <div className={`p-2 rounded-full ${isCompleted ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : (
                                    getLessonIcon(lesson.contentType)
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className={`font-medium ${isCompleted ? 'text-muted-foreground' : ''}`}>
                                    {lessonIndex + 1}. {lesson.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="capitalize">{lesson.contentType}</span>
                                    {lesson.videoDurationSeconds && (
                                      <>
                                        <span>•</span>
                                        <span>{Math.round(lesson.videoDurationSeconds / 60)} min</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {lesson.isPreview && !enrollment && (
                                  <Badge variant="outline">Preview</Badge>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About This Course</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{course.description}</p>
                
                {course.learningOutcomes && course.learningOutcomes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">What You'll Learn</h4>
                    <ul className="space-y-2">
                      {course.learningOutcomes.map((outcome, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {course.prerequisites && course.prerequisites.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Prerequisites</h4>
                    <ul className="space-y-1">
                      {course.prerequisites.map((prereq, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {prereq}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructor */}
            {course.instructorName && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Instructor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {course.instructorImageUrl ? (
                        <img 
                          src={course.instructorImageUrl} 
                          alt={course.instructorName}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{course.instructorName}</p>
                      {course.instructorBio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {course.instructorBio}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
