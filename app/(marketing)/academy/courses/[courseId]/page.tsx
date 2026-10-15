"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useCourseCart } from "@/contexts/course-cart-context";
import { 
  getCourse, 
  getModules, 
  getLessons,
  getEnrollment,
  enrollInCourse,
  CourseDoc, 
  CourseModuleDoc, 
  LessonDoc 
} from "@/lib/firebase-lms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  ArrowLeft,
  Loader2,
  User,
  Users,
  Star,
  Lock,
  ShoppingCart
} from "lucide-react";
import { toast } from "sonner";

interface ModuleWithLessons extends CourseModuleDoc {
  lessons: LessonDoc[];
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, isAuthenticated } = useUserProfile();
  const { addItem, isInCart } = useCourseCart();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<CourseDoc | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCourseData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, isAuthenticated, profile.id]);

  const loadCourseData = async () => {
    setLoading(true);
    try {
      const courseData = await getCourse(courseId);
      
      if (!courseData) {
        router.push("/academy/courses");
        return;
      }

      setCourse(courseData);

      // Load modules and lessons
      const modulesData = await getModules(courseId);
      const modulesWithLessons = await Promise.all(
        modulesData.map(async (mod) => {
          const lessons = await getLessons(mod.id);
          return { ...mod, lessons };
        })
      );
      setModules(modulesWithLessons);

      // Expand first module by default
      if (modulesWithLessons.length > 0) {
        setExpandedModules(new Set([modulesWithLessons[0].id]));
      }

      // Check enrollment status
      if (isAuthenticated && profile.id) {
        const enrollment = await getEnrollment(profile.id, courseId);
        setIsEnrolled(!!enrollment);
      }
    } catch (error) {
      console.error("Error loading course:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`/sign-in?redirect=/academy/courses/${courseId}`);
      return;
    }

    if (!profile.id) return;

    setEnrolling(true);
    try {
      await enrollInCourse(profile.id, courseId);
      setIsEnrolled(true);
      toast.success("Successfully enrolled in course!");
      router.push(`/portal/my-courses/${courseId}`);
    } catch (error) {
      console.error("Error enrolling:", error);
      toast.error("Failed to enroll in course");
    } finally {
      setEnrolling(false);
    }
  };

  const handleAddToCart = () => {
    if (!course) return;
    
    if (isInCart(courseId)) {
      toast.info("This course is already in your cart");
      return;
    }

    addItem({
      courseId: course.id,
      courseTitle: course.title,
      courseSlug: course.slug,
      thumbnailUrl: course.thumbnailUrl,
      instructorName: course.instructorName,
      price: course.priceInCents,
      originalPrice: course.compareAtPriceInCents || undefined,
    });
    toast.success("Course added to cart!");
  };

  const isPaidCourse = course && !course.isFree && course.priceInCents > 0;
  const courseInCart = isInCart(courseId);

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

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
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
          <Link href="/academy/courses">Browse Courses</Link>
        </Button>
      </div>
    );
  }

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalDuration = course.estimatedDurationMinutes 
    ? Math.round(course.estimatedDurationMinutes / 60) 
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <Button variant="ghost" size="sm" asChild className="mb-6 text-slate-300 hover:text-white">
            <Link href="/academy/courses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Link>
          </Button>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-blue-500 text-slate-900">{course.difficultyLevel}</Badge>
                {course.isFeatured && (
                  <Badge variant="outline" className="border-blue-500 text-blue-500">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-slate-300 mb-6">{course.description}</p>

              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
                {course.instructorName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{course.instructorName}</span>
                  </div>
                )}
                {totalDuration && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{totalDuration} hours</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{totalLessons} lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{course.enrollmentCount} enrolled</span>
                </div>
              </div>
            </div>

            {/* Enrollment Card */}
            <div>
              <Card className="bg-white text-slate-900">
                <CardContent className="p-6">
                  {course.thumbnailUrl ? (
                    <img 
                      src={course.thumbnailUrl} 
                      alt={course.title}
                      className="w-full aspect-video object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-slate-200 rounded-lg mb-4 flex items-center justify-center">
                      <PlayCircle className="h-12 w-12 text-slate-400" />
                    </div>
                  )}

                  {!course.isFree && course.priceInCents > 0 ? (
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">
                          {formatPrice(course.priceInCents)}
                        </span>
                        {course.compareAtPriceInCents && course.compareAtPriceInCents > course.priceInCents && (
                          <span className="text-lg text-muted-foreground line-through">
                            {formatPrice(course.compareAtPriceInCents)}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-green-600">Free</span>
                    </div>
                  )}

                  {isEnrolled ? (
                    <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" asChild>
                      <Link href={`/portal/my-courses/${courseId}`}>
                        <PlayCircle className="h-5 w-5 mr-2" />
                        Continue Learning
                      </Link>
                    </Button>
                  ) : isPaidCourse ? (
                    // Paid course - show Add to Cart
                    courseInCart ? (
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700" 
                        size="lg"
                        asChild
                      >
                        <Link href="/academy/courses">
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          In Cart - Continue Shopping
                        </Link>
                      </Button>
                    ) : (
                      <Button 
                        className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900" 
                        size="lg"
                        onClick={handleAddToCart}
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Add to Cart
                      </Button>
                    )
                  ) : (
                    // Free course - direct enroll
                    <Button 
                      className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900" 
                      size="lg"
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >
                      {enrolling ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "Enroll Now - Free"
                      )}
                    </Button>
                  )}

                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Full lifetime access
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto py-12 px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* What You'll Learn */}
            {course.learningOutcomes && course.learningOutcomes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>What You'll Learn</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {course.learningOutcomes.map((outcome, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Course Curriculum */}
            <Card>
              <CardHeader>
                <CardTitle>Course Curriculum</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {modules.length} modules • {totalLessons} lessons
                  {totalDuration && ` • ${totalDuration} hours total`}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {modules.map((module, moduleIndex) => (
                    <div key={module.id}>
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="w-full p-4 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedModules.has(module.id) ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">
                                Module {moduleIndex + 1}: {module.title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {module.lessons.length} lessons
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                      
                      {expandedModules.has(module.id) && (
                        <div className="border-t bg-muted/30">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-3 p-4 pl-12 border-t first:border-t-0"
                            >
                              <div className="p-2 rounded-full bg-muted text-muted-foreground">
                                {getLessonIcon(lesson.contentType)}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">
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
                              {lesson.isPreview ? (
                                <Badge variant="outline">Preview</Badge>
                              ) : (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Prerequisites */}
            {course.prerequisites && course.prerequisites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Prerequisites</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {course.prerequisites.map((prereq, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span>•</span>
                        <span>{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

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
                    </div>
                  </div>
                  {course.instructorBio && (
                    <p className="text-sm text-muted-foreground mt-3">
                      {course.instructorBio}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {course.tags && course.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
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
