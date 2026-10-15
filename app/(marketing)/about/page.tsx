import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Eye,
  Heart,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Quote,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Adams Electric is a third-generation, family-owned electrical contractor founded in 1928, serving the Southeast with a mission to Build Trust Through Performance.",
};

const values = [
  {
    icon: Heart,
    title: "Trust",
    description:
      "We earn trust the old-fashioned way—by doing what we say we'll do, on every project.",
  },
  {
    icon: Sparkles,
    title: "Safety",
    description:
      "The wellbeing of our people, our partners, and the public comes first on every jobsite.",
  },
  {
    icon: Target,
    title: "Craftsmanship",
    description:
      "Quality workmanship in every installation—work we're proud to put our name on.",
  },
  {
    icon: TrendingUp,
    title: "Family",
    description:
      "Third-generation family ownership shapes how we treat our people and our partners.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-400">
              About Adams Electric
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Build Trust Through{" "}
              <span className="text-blue-400">Performance</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
              Since 1928, Adams Electric has delivered electrical construction
              across the Southeast—guided by three generations of family ownership.
            </p>
          </div>
        </div>
      </section>

      {/* Our Company */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="relative">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl bg-slate-100 flex items-center justify-center">
                <Image
                  src="/images/adamselectric_logo.png"
                  alt="Adams Electric"
                  width={320}
                  height={320}
                  className="object-contain p-12"
                  priority
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-xl p-4 max-w-xs">
                <Quote className="h-6 w-6 text-blue-400 mb-2" />
                <p className="text-sm text-muted-foreground italic">
                  &quot;Build Trust Through Performance.&quot;
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                A Century of Electrical Construction
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="text-lg">
                  Founded in 1928, Adams Electric is a third-generation, family-owned
                  electrical contractor serving customers throughout the Southeast.
                </p>
                <p>
                  Our teams deliver PreConstruction, Design-Build / Design-Assist,
                  BIM / Virtual Design, PreFabrication, Construction, and Post
                  Construction services—supporting projects from early planning
                  through turnover and beyond.
                </p>
                <p>
                  Through the Adams Platform, we connect our teams, tools, and
                  partners—streamlining project coordination, communication, and
                  workforce development across every jobsite we run.
                </p>
              </div>
              <Button className="mt-8 bg-blue-600 hover:bg-blue-700 text-white" asChild>
                <Link href="/contact">
                  Contact Our Team
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <Card className="border-2 border-blue-500/20">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-6">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                <p className="text-muted-foreground">
                  Build Trust Through Performance. We deliver electrical construction
                  that owners, contractors, and communities can count on—safely,
                  on schedule, and built to last.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500/20">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-6">
                  <Eye className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
                <p className="text-muted-foreground">
                  To be the electrical contractor of choice across the Southeast—known
                  for the quality of our work, the strength of our teams, and the
                  trust we build on every project.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 border-blue-500/50 text-blue-600">
                Our Story
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Three Generations of Ownership
              </h2>
            </div>
            <div className="prose prose-lg max-w-none">
              <p className="text-muted-foreground text-lg leading-relaxed">
                Since 1928, Adams Electric has been a family-owned business. That
                continuity matters: decisions are made for the long term, relationships
                span decades, and the company&apos;s name goes on every project we deliver.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed mt-6">
                Electrical construction has changed dramatically over the decades, and
                so have we—investing in BIM and virtual design, prefabrication, and the
                Adams Platform to keep our teams coordinated and our projects
                predictable.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed mt-6">
                What hasn&apos;t changed is the standard: do the work safely, do it right,
                and stand behind it. That&apos;s what Build Trust Through Performance means
                in practice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="container">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-blue-500/50 text-blue-600">
              What We Stand For
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Core Values</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do at Adams Electric.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {values.map((value) => (
              <Card key={value.title} className="text-center border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-7 w-7 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-4 border-blue-500/50 text-blue-600">
              Our Approach
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              Full-Lifecycle Electrical Services
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              Adams Electric supports projects from early planning through turnover
              and service—one accountable partner across the entire lifecycle.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
              {["PreConstruction", "Design-Build", "BIM / Virtual Design", "PreFabrication", "Construction", "Post Construction"].map((service) => (
                <div key={service} className="text-center">
                  <div className="h-16 rounded-lg bg-blue-600 flex items-center justify-center mx-auto mb-2 px-3">
                    <span className="text-sm font-bold text-white">{service}</span>
                  </div>
                </div>
              ))}
            </div>

            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
              <Link href="/services">
                Explore Our Services
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Build with Adams Electric?
          </h2>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Talk to our team about your next electrical construction project.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Button
              size="lg"
              className="text-lg px-8 bg-blue-600 hover:bg-blue-700 text-white"
              asChild
            >
              <Link href="/contact">
                Contact Us
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 border-white text-white hover:bg-white hover:text-slate-900"
              asChild
            >
              <Link href="/adams-platform">
                Discover the Adams Platform
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
