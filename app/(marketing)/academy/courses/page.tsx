"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Play,
  Search,
  Clock,
  BookOpen,
  Target,
  TrendingUp,
  Settings,
  Users,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import { getCourses, CourseDoc } from "@/lib/firebase-lms";

// Fallback courses for when Firestore is empty
const fallbackCourses = [
  {
    id: "1",
    title: "Preconstruction Planning Fundamentals",
    description: "Estimating, budgeting, and constructability review practices that set projects up before mobilization.",
    category: "PreConstruction",
    categorySlug: "preconstruction",
    duration: "8 hours",
    lessons: 24,
    level: "Intermediate",
    slug: "preconstruction-planning-fundamentals",
    isFeatured: true,
    enrollmentCount: 156,
  },
  {
    id: "2",
    title: "Jobsite Safety & Daily Planning",
    description: "Pre-task planning, hazard awareness, and reporting culture that keeps crews safe on every jobsite.",
    category: "Safety",
    categorySlug: "safety",
    duration: "4 hours",
    lessons: 12,
    level: "Beginner",
    slug: "jobsite-safety-daily-planning",
    enrollmentCount: 89,
  },
  {
    id: "3",
    title: "Field Leadership Essentials",
    description: "Develop the communication and decision-making skills that turn foremen into confident field leaders.",
    category: "Workforce & Leadership",
    categorySlug: "workforce-leadership",
    duration: "6 hours",
    lessons: 18,
    level: "Intermediate",
    slug: "field-leadership-essentials",
    enrollmentCount: 124,
  },
  {
    id: "4",
    title: "BIM Coordination Basics",
    description: "How 3D modeling and clash detection resolve conflicts before installation and reduce rework.",
    category: "BIM & Prefabrication",
    categorySlug: "bim-prefab",
    duration: "5 hours",
    lessons: 15,
    level: "Beginner",
    slug: "bim-coordination-basics",
    enrollmentCount: 98,
  },
  {
    id: "5",
    title: "Prefabrication Workflows",
    description: "Design-for-fabrication practices, kitting, and logistics that compress field schedules.",
    category: "BIM & Prefabrication",
    categorySlug: "bim-prefab",
    duration: "6 hours",
    lessons: 20,
    level: "Intermediate",
    slug: "prefabrication-workflows",
    enrollmentCount: 112,
  },
  {
    id: "6",
    title: "Building Your Field Leadership Team",
    description: "Mentor and develop crew leaders who keep projects moving safely and on schedule.",
    category: "Workforce & Leadership",
    categorySlug: "workforce-leadership",
    duration: "4 hours",
    lessons: 14,
    level: "Intermediate",
    slug: "building-field-leadership-team",
    enrollmentCount: 76,
  },
  {
    id: "7",
    title: "Safety Leadership for Supervisors",
    description: "Lead pre-task planning and hazard communication that protects crews every day.",
    category: "Safety",
    categorySlug: "safety",
    duration: "3 hours",
    lessons: 10,
    level: "Beginner",
    slug: "safety-leadership-supervisors",
    enrollmentCount: 145,
  },
  {
    id: "8",
    title: "Project Closeout Excellence",
    description: "Plan documentation from kickoff so closeout is clean, complete, and fast.",
    category: "Project Delivery",
    categorySlug: "project-delivery",
    duration: "5 hours",
    lessons: 16,
    level: "Advanced",
    slug: "project-closeout-excellence",
    enrollmentCount: 67,
  },
  {
    id: "9",
    title: "Closeout Documentation Workshop",
    description: "As-built, O&M, and turnover documentation practices that make handoff smooth.",
    category: "Project Delivery",
    categorySlug: "project-delivery",
    duration: "2 hours",
    lessons: 8,
    level: "Beginner",
    slug: "closeout-documentation-workshop",
    enrollmentCount: 203,
  },
  {
    id: "10",
    title: "Electrical Estimating Fundamentals",
    description: "Build accurate, competitive estimates that reflect real labor and material conditions.",
    category: "PreConstruction",
    categorySlug: "preconstruction",
    duration: "4 hours",
    lessons: 12,
    level: "Intermediate",
    slug: "electrical-estimating-fundamentals",
    enrollmentCount: 91,
  },
];

const categories = [
  { name: "All Categories", slug: "all", icon: BookOpen },
  { name: "Safety", slug: "safety", icon: Target },
  { name: "PreConstruction", slug: "preconstruction", icon: TrendingUp },
  { name: "BIM & Prefabrication", slug: "bim-prefab", icon: Settings },
  { name: "Workforce & Leadership", slug: "workforce-leadership", icon: Users },
  { name: "Project Delivery", slug: "project-delivery", icon: ArrowRightLeft },
];

const levels = ["All Levels", "Beginner", "Intermediate", "Advanced"];

interface DisplayCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  categorySlug: string;
  duration: string;
  lessons: number;
  level: string;
  slug: string;
  isFeatured?: boolean;
  enrollmentCount: number;
  thumbnailUrl?: string | null;
}

function mapCourseDocToDisplay(course: CourseDoc): DisplayCourse {
  return {
    id: course.id,
    title: course.title,
    description: course.shortDescription || course.description || "",
    category: course.difficultyLevel || "General",
    categorySlug: course.categoryId || "general",
    duration: course.estimatedDurationMinutes 
      ? `${Math.round(course.estimatedDurationMinutes / 60)} hours` 
      : "Self-paced",
    lessons: 0, // Will be calculated separately if needed
    level: course.difficultyLevel || "Intermediate",
    slug: course.slug,
    isFeatured: course.isFeatured,
    enrollmentCount: course.enrollmentCount || 0,
    thumbnailUrl: course.thumbnailUrl,
  };
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<DisplayCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("All Levels");

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const firestoreCourses = await getCourses({ isPublished: true });
      if (firestoreCourses.length > 0) {
        setCourses(firestoreCourses.map(mapCourseDocToDisplay));
      } else {
        // Use fallback courses if no Firestore courses
        setCourses(fallbackCourses as DisplayCourse[]);
      }
    } catch (error) {
      console.error("Error loading courses:", error);
      setCourses(fallbackCourses as DisplayCourse[]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || course.categorySlug === selectedCategory;
    const matchesLevel = selectedLevel === "All Levels" || course.level === selectedLevel;
    return matchesSearch && matchesCategory && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12">
      <div className="container">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Course Library</h1>
          <p className="text-muted-foreground text-lg">
            Explore our library of electrical construction training courses covering safety, preconstruction, coordination, and field leadership.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.slug} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              {levels.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="mb-6 text-sm text-muted-foreground">
          {loading ? "Loading courses..." : `Showing ${filteredCourses.length} of ${courses.length} courses`}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Course Grid */}
        {!loading && <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-slate-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-slate-900/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 text-blue-600 ml-1" />
                  </div>
                </div>
                {course.isFeatured && (
                  <Badge className="absolute top-3 left-3 bg-blue-500 text-white">Featured</Badge>
                )}
                <Badge 
                  variant="outline" 
                  className="absolute top-3 right-3 bg-white/90 text-slate-700"
                >
                  {course.level}
                </Badge>
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Badge variant="outline" className="text-xs">{course.category}</Badge>
                </div>
                <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{course.description}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {course.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {course.lessons} lessons
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {course.enrollmentCount}
                  </div>
                </div>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900" asChild>
                  <Link href={`/academy/courses/${course.slug}`}>
                    View Course
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>}

        {!loading && filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No courses found matching your criteria.</p>
            <Button variant="outline" onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedLevel("All Levels");
            }}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
