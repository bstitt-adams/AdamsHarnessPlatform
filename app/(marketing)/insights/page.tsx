import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Calendar,
  Clock,
  Search,
  BookOpen,
  TrendingUp,
  Users,
  Target,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "Insights on electrical construction from Adams Electric—safety, preconstruction, project coordination, workforce development, and project closeout.",
};

const featuredPost = {
  title: "5 Jobsite Safety Warning Signs Every Electrical Contractor Should Watch",
  excerpt:
    "Recognizing early warning signs on the jobsite is the first step to preventing incidents. Here are five signals that your safety program needs attention.",
  category: "Safety",
  date: "December 15, 2025",
  readTime: "8 min read",
  image: "/images/blog-featured.jpg",
  slug: "jobsite-safety-warning-signs",
};

const blogPosts = [
  {
    title: "The Workforce Development Checklist Every Electrical Contractor Needs",
    excerpt:
      "Skilled electricians are made, not found. This checklist covers the fundamentals of building a workforce development program that actually works.",
    category: "Workforce",
    date: "December 10, 2025",
    readTime: "6 min read",
    slug: "workforce-development-checklist",
  },
  {
    title: "Building a Field Leadership Team You Can Trust",
    excerpt:
      "Great projects are delivered by great foremen and superintendents. Here's how electrical contractors build field leadership that scales.",
    category: "Workforce",
    date: "December 5, 2025",
    readTime: "7 min read",
    slug: "building-field-leadership-team",
  },
  {
    title: "Project Closeout Best Practices for Electrical Contractors",
    excerpt:
      "Closeout is where reputations are finished. These practices help electrical contractors turn over projects cleanly and earn the next one.",
    category: "Closeout",
    date: "November 28, 2025",
    readTime: "10 min read",
    slug: "project-closeout-best-practices",
  },
  {
    title: "The Preconstruction Planning Blueprint for Electrical Projects",
    excerpt:
      "What happens before mobilization determines what happens in the field. A disciplined preconstruction blueprint for electrical work.",
    category: "Preconstruction",
    date: "November 20, 2025",
    readTime: "9 min read",
    slug: "preconstruction-planning-blueprint",
  },
  {
    title: "Why Preconstruction Planning Pays Off in Electrical Construction",
    excerpt:
      "Every dollar and hour invested in preconstruction returns multiples in the field. Here's why the planning phase matters so much for electrical work.",
    category: "Preconstruction",
    date: "November 15, 2025",
    readTime: "6 min read",
    slug: "why-preconstruction-planning-pays-off",
  },
  {
    title: "From Foreman to Leader: Making the Mindset Shift",
    excerpt:
      "Running work and leading people are different jobs. How experienced tradespeople make the shift from top electrician to field leader.",
    category: "Workforce",
    date: "November 8, 2025",
    readTime: "8 min read",
    slug: "foreman-to-leader-mindset-shift",
  },
  {
    title: "Building Projects That Last: Quality in Electrical Construction",
    excerpt:
      "Quality isn't inspected in—it's built in. How disciplined installation, coordination, and documentation produce electrical work that endures.",
    category: "Construction",
    date: "November 1, 2025",
    readTime: "7 min read",
    slug: "building-projects-that-last",
  },
  {
    title: "The Hidden Cost of Rework in Electrical Construction",
    excerpt:
      "Rework costs far more than the labor to redo it. Where rework really comes from in electrical projects and how coordination eliminates it.",
    category: "Coordination",
    date: "October 25, 2025",
    readTime: "5 min read",
    slug: "hidden-cost-of-rework",
  },
];

const categories = [
  { name: "All", count: 9, icon: BookOpen },
  { name: "Safety", count: 1, icon: Users },
  { name: "Preconstruction", count: 2, icon: Target },
  { name: "Workforce", count: 3, icon: TrendingUp },
];

export default function InsightsPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-400">
              Insights
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Insights for Building{" "}
              <span className="text-blue-400">Better Projects</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
              Practical perspectives from Adams Electric on safety, preconstruction,
              project coordination, and workforce development in electrical construction.
            </p>

            {/* Search */}
            <div className="mt-8 max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search articles..."
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 border-b">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <Button
                key={category.name}
                variant={category.name === "All" ? "default" : "outline"}
                className={category.name === "All" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
              >
                <category.icon className="h-4 w-4 mr-2" />
                {category.name}
                <span className="ml-2 text-xs opacity-70">({category.count})</span>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-16">
        <div className="container">
          <Card className="overflow-hidden border-0 shadow-xl">
            <div className="grid md:grid-cols-2">
              <div className="aspect-video md:aspect-auto bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                <div className="text-center p-8">
                  <BookOpen className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <p className="text-blue-800 font-medium">Featured Article</p>
                </div>
              </div>
              <CardContent className="p-8 md:p-12 flex flex-col justify-center">
                <Badge className="w-fit mb-4 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                  {featuredPost.category}
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  {featuredPost.title}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {featuredPost.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {featuredPost.readTime}
                  </span>
                </div>
                <Button className="w-fit bg-blue-600 hover:bg-blue-700 text-white" asChild>
                  <Link href={`/insights/${featuredPost.slug}`}>
                    Read Article
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 bg-slate-50">
        <div className="container">
          <h2 className="text-2xl font-bold mb-8">Latest Articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <Link key={post.slug} href={`/insights/${post.slug}`} className="block group">
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow h-full">
                  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center group-hover:from-blue-50 group-hover:to-blue-100 transition-colors">
                    <BookOpen className="h-10 w-10 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <CardContent className="p-6">
                    <Badge className="mb-3 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                      {post.category}
                    </Badge>
                    <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-6 text-blue-400" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Get Insights Delivered
          </h2>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Receive occasional insights on electrical construction, safety, and
            project delivery from the Adams Electric team.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
            <Button className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
              Subscribe
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Unsubscribe anytime. We respect your inbox.
          </p>
        </div>
      </section>
    </>
  );
}
