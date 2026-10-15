"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  Play,
  Users,
  Award,
  BookOpen,
  Calendar,
  Target,
  TrendingUp,
  Settings,
  ArrowRightLeft,
  CheckCircle,
  Clock,
  Star,
  Loader2,
} from "lucide-react";
import {
  getCourses,
  getWorkshops,
  getCategories,
  getAcademyStats,
  type CourseDoc,
  type WorkshopDoc,
  type CategoryDoc,
} from "@/lib/firebase-lms";

// Fallback data for when Firebase is not available
const fallbackCourses = [
  {
    title: "Preconstruction Planning Fundamentals",
    description: "Learn how Adams Electric approaches estimating, budgeting, and constructability review before mobilization.",
    category: "PreConstruction",
    duration: "8 hours",
    lessons: 24,
    level: "Intermediate",
    image: "https://images.pexels.com/photos/834892/pexels-photo-834892.jpeg?auto=compress&cs=tinysrgb&w=800&h=450&fit=crop",
    slug: "preconstruction-planning-fundamentals",
    isFeatured: true,
  },
  {
    title: "Jobsite Safety & Daily Planning",
    description: "Pre-task planning, hazard awareness, and reporting culture that keeps crews safe on every jobsite.",
    category: "Safety",
    duration: "4 hours",
    lessons: 12,
    level: "Beginner",
    image: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800&h=450&fit=crop",
    slug: "jobsite-safety-daily-planning",
  },
  {
    title: "Field Leadership Essentials",
    description: "Develop the communication and decision-making skills that turn foremen into confident field leaders.",
    category: "Workforce & Leadership",
    duration: "6 hours",
    lessons: 18,
    level: "Intermediate",
    image: "https://images.pexels.com/photos/35571322/pexels-photo-35571322.jpeg?auto=compress&cs=tinysrgb&w=800&h=450&fit=crop",
    slug: "field-leadership-essentials",
  },
  {
    title: "BIM Coordination Basics",
    description: "How 3D modeling and clash detection resolve conflicts before installation and reduce rework.",
    category: "BIM & Prefabrication",
    duration: "5 hours",
    lessons: 15,
    level: "Beginner",
    image: "https://images.pexels.com/photos/6615103/pexels-photo-6615103.jpeg?auto=compress&cs=tinysrgb&w=800&h=450&fit=crop",
    slug: "bim-coordination-basics",
  },
];

const fallbackCategories = [
  { id: "safety", name: "Safety", slug: "safety", icon: Target, color: "bg-blue-600", courseCount: 8 },
  { id: "preconstruction", name: "PreConstruction", slug: "preconstruction", icon: TrendingUp, color: "bg-blue-500", courseCount: 6 },
  { id: "bim-prefab", name: "BIM & Prefabrication", slug: "bim-prefab", icon: Settings, color: "bg-sky-600", courseCount: 7 },
  { id: "workforce-leadership", name: "Workforce & Leadership", slug: "workforce-leadership", icon: Users, color: "bg-slate-600", courseCount: 9 },
  { id: "project-delivery", name: "Project Delivery", slug: "project-delivery", icon: ArrowRightLeft, color: "bg-blue-700", courseCount: 5 },
];

const fallbackWorkshops = [
  {
    title: "Preconstruction Kickoff Best Practices",
    date: "January 15, 2025",
    time: "2:00 PM EST",
    type: "Live Workshop",
    spots: 12,
  },
  {
    title: "Project Closeout Deep Dive",
    date: "January 22, 2025",
    time: "1:00 PM EST",
    type: "Live Workshop",
    spots: 8,
  },
  {
    title: "Field Leadership Roundtable",
    date: "January 29, 2025",
    time: "3:00 PM EST",
    type: "Live Workshop",
    spots: 15,
  },
];

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "safety": Target,
  "preconstruction": TrendingUp,
  "bim-prefab": Settings,
  "workforce-leadership": Users,
  "project-delivery": ArrowRightLeft,
};

const CATEGORY_COLORS: Record<string, string> = {
  "safety": "bg-blue-600",
  "preconstruction": "bg-blue-500",
  "bim-prefab": "bg-sky-600",
  "workforce-leadership": "bg-slate-600",
  "project-delivery": "bg-blue-700",
};

const subscriptionTiers = [
  {
    name: "Adams Starter",
    price: 49,
    period: "month",
    description: "Essential training resources for team members building foundational skills",
    features: [
      "Access to Insights articles",
      "Monthly newsletter",
      "Community forum access",
      "1 free workshop per quarter",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Adams Builder",
    price: 149,
    period: "month",
    description: "Comprehensive training for growing field and office leaders",
    features: [
      "All Starter features",
      "Full course library access",
      "Weekly group sessions",
      "Pre/Post assessments",
      "Certificate programs",
      "Priority workshop registration",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Adams Master",
    price: 349,
    period: "month",
    description: "Premium access with personalized development support and exclusive resources",
    features: [
      "All Builder features",
      "Monthly 1-on-1 session",
      "Custom learning paths",
      "Leadership peer group access",
      "Annual training event invitation",
      "White-glove onboarding",
    ],
    cta: "Contact Us",
    popular: false,
  },
];

export default function AcademyPage() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseDoc[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopDoc[]>([]);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [stats, setStats] = useState({ totalCourses: 35, totalLessons: 200, totalWorkshops: 50, totalEnrollments: 500, totalCertificates: 0 });
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [coursesData, workshopsData, categoriesData, statsData] = await Promise.all([
          getCourses({ isPublished: true, isFeatured: true, limitCount: 4 }),
          getWorkshops({ isPublished: true, upcoming: true, limitCount: 3 }),
          getCategories(),
          getAcademyStats(),
        ]);
        setCourses(coursesData);
        setWorkshops(workshopsData);
        setCategories(categoriesData);
        setStats(statsData);
        setUseFallback(false);
      } catch (error) {
        console.error("Error loading academy data:", error);
        // Use fallback data on error
        setUseFallback(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Use Firebase data or fallback when there's an error or no data
  const displayCourses = courses.length > 0 ? courses : (useFallback ? fallbackCourses : []);
  const displayWorkshops = workshops.length > 0 ? workshops : (useFallback ? fallbackWorkshops : []);
  const displayCategories = categories.length > 0 ? categories : (useFallback ? fallbackCategories : []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-blue-500/20 text-blue-400 border-blue-500/30">
              Adams Electric Academy
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
              Build Your Skills Through{" "}
              <span className="text-blue-400">Continuous Learning</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Access electrical construction training, live workshops, and assessments
              built around safety, preconstruction, coordination, and field leadership.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="text-lg bg-blue-500 hover:bg-blue-600 text-slate-900" asChild>
                <Link href="/academy/courses">
                  Explore Courses
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg border-white/30 text-white hover:bg-white/10" asChild>
                <Link href="#pricing">
                  View Pricing
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-3xl font-bold text-blue-400">{stats.totalCourses || 35}+</div>
                <div className="text-gray-400">Courses</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400">{stats.totalLessons || 200}+</div>
                <div className="text-gray-400">Video Lessons</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400">{stats.totalWorkshops || 50}+</div>
                <div className="text-gray-400">Workshops</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400">{stats.totalEnrollments || 500}+</div>
                <div className="text-gray-400">Students</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20">
        <div className="container">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Courses</h2>
              <p className="text-muted-foreground">Start learning with our most popular programs</p>
            </div>
            <Button variant="ghost" className="text-blue-600" asChild>
              <Link href="/academy/courses">
                View All Courses
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-video" />
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : displayCourses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayCourses.map((course: any) => (
                <Card key={course.id || course.slug} className="group overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-slate-200 relative overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-slate-900/40" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="h-6 w-6 text-blue-600 ml-1" />
                      </div>
                    </div>
                    {course.isFeatured && (
                      <Badge className="absolute top-3 left-3 bg-blue-500 text-white">Featured</Badge>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Badge variant="outline" className="text-xs capitalize">{course.difficultyLevel}</Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{course.shortDescription || course.description}</p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {course.estimatedDurationMinutes ? `${Math.round(course.estimatedDurationMinutes / 60)}h` : "TBD"}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {course.enrollmentCount} enrolled
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {fallbackCourses.map((course) => (
              <Card key={course.slug} className="group overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-slate-200 relative overflow-hidden">
                  {course.image && course.image.startsWith("http") ? (
                    <img
                      src={course.image}
                      alt={course.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-slate-900/40" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="h-6 w-6 text-blue-600 ml-1" />
                    </div>
                  </div>
                  {course.isFeatured && (
                    <Badge className="absolute top-3 left-3 bg-blue-500 text-white">Featured</Badge>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Badge variant="outline" className="text-xs">{course.category}</Badge>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{course.description}</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {course.lessons} lessons
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-slate-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Browse by Category</h2>
            <p className="text-muted-foreground">Explore courses across the trades and project lifecycle</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {displayCategories.length > 0 ? (
              displayCategories.map((category) => {
                const IconComponent = CATEGORY_ICONS[category.slug] || Target;
                const colorClass = CATEGORY_COLORS[category.slug] || "bg-blue-500";
                return (
                  <Link
                    key={category.id}
                    href={`/academy/courses?category=${category.slug}`}
                    className="group"
                  >
                    <Card className="text-center p-6 hover:shadow-lg transition-all hover:-translate-y-1">
                      <div className={`w-14 h-14 rounded-full ${colorClass} flex items-center justify-center mx-auto mb-4`}>
                        <IconComponent className="h-7 w-7 text-white" />
                      </div>
                      <h3 className="font-semibold mb-1 group-hover:text-blue-600 transition-colors">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category.courseCount} courses</p>
                    </Card>
                  </Link>
                );
              })
            ) : (
              fallbackCategories.map((category) => (
                <Link
                  key={category.name}
                  href={`/academy/courses?category=${category.name.toLowerCase().replace(/ & /g, '-')}`}
                  className="group"
                >
                  <Card className="text-center p-6 hover:shadow-lg transition-all hover:-translate-y-1">
                    <div className={`w-14 h-14 rounded-full ${category.color} flex items-center justify-center mx-auto mb-4`}>
                      <category.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1 group-hover:text-blue-600 transition-colors">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.courseCount} courses</p>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Upcoming Workshops */}
      <section className="py-20">
        <div className="container">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Upcoming Workshops</h2>
              <p className="text-muted-foreground">Live, interactive sessions with Adams Electric</p>
            </div>
            <Button variant="ghost" className="text-blue-600" asChild>
              <Link href="/academy/workshops">
                View All Workshops
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {workshops.length > 0 ? (
              workshops.map((workshop) => (
                <Card key={workshop.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-blue-600 border-blue-500/50">
                        <Calendar className="h-3 w-3 mr-1" />
                        {workshop.workshopType === "live" ? "Live Workshop" : "Recorded"}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{workshop.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {workshop.scheduledStart?.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {workshop.scheduledStart?.toDate().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {workshop.maxParticipants ? `${workshop.maxParticipants - workshop.registrationCount} spots remaining` : "Open registration"}
                      </div>
                    </div>
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900">
                      Register Now
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : useFallback ? (
              fallbackWorkshops.map((workshop) => (
                <Card key={workshop.title} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-blue-600 border-blue-500/50">
                        <Calendar className="h-3 w-3 mr-1" />
                        {workshop.type}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{workshop.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {workshop.date}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {workshop.time}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {workshop.spots} spots remaining
                      </div>
                    </div>
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900">
                      Register Now
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : null}
          </div>
        </div>
      </section>

      {/* Assessments Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-blue-500/20 text-blue-400 border-blue-500/30">
              Pre & Post Assessments
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Measure Your Growth</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Take diagnostic assessments before and after each program to track your progress, 
              identify growth areas, and demonstrate ROI on your learning investment.
            </p>

            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">Diagnostic Assessments</h3>
                <p className="text-sm text-gray-400">Identify your starting point and key areas for development</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">Progress Tracking</h3>
                <p className="text-sm text-gray-400">Monitor skill development throughout your learning journey</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">Certification</h3>
                <p className="text-sm text-gray-400">Earn certificates upon successful course completion</p>
              </div>
            </div>

            <Button size="lg" className="mt-10 bg-blue-500 hover:bg-blue-600 text-slate-900" asChild>
              <Link href="/quiz-intro">
                Take the Project Readiness Assessment
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Choose Your Learning Path</h2>
            <p className="text-muted-foreground">Flexible plans designed for every stage of your career</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {subscriptionTiers.map((tier) => (
              <Card 
                key={tier.name} 
                className={`relative ${tier.popular ? 'border-blue-500 shadow-lg scale-105' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="my-6">
                    <span className="text-4xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground">/{tier.period}</span>
                  </div>
                  <ul className="space-y-3 text-left mb-8">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${tier.popular ? 'bg-blue-500 hover:bg-blue-600 text-slate-900' : ''}`}
                    variant={tier.popular ? 'default' : 'outline'}
                  >
                    {tier.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            All plans include a 14-day free trial. Cancel anytime. Annual billing saves 20%.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-50">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
            <p className="text-muted-foreground mb-8">
              Build the skills that power safe, predictable project delivery through
              the Adams Electric Academy. Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-slate-900" asChild>
                <Link href="/academy/courses">
                  Browse All Courses
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/schedule-a-call">
                  Talk to an Advisor
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
