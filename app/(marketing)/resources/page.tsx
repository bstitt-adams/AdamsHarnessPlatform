import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Video, FileText, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Resources, guides, and tools from Adams Electric covering electrical construction, safety, preconstruction, and project delivery.",
};

const resources = [
  {
    id: "insights",
    icon: BookOpen,
    title: "Insights",
    description: "Practical articles on electrical construction, jobsite safety, preconstruction planning, and project delivery.",
    link: "/insights",
    cta: "Read Articles",
  },
  {
    id: "academy",
    icon: Video,
    title: "Adams Academy",
    description: "On-demand training covering safety, BIM coordination, prefabrication, and field leadership development.",
    link: "/academy",
    cta: "Explore Courses",
  },
  {
    id: "quiz",
    icon: FileText,
    title: "Project Readiness Assessment",
    description: "Take our free assessment to see where your project delivery stands and get a personalized roadmap.",
    link: "/quiz-intro",
    cta: "Take the Assessment",
  },
];

export default function ResourcesPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-400">
              Free Resources
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Tools to Build{" "}
              <span className="text-blue-400">Better Projects</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
              Access our library of articles, training, assessments, and tools
              for safer, better-coordinated electrical construction.
            </p>
          </div>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {resources.map((resource) => (
              <Card key={resource.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                    <resource.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">{resource.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <p className="text-muted-foreground mb-6">
                    {resource.description}
                  </p>
                  <Button className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900" asChild>
                    <Link href={resource.link}>
                      {resource.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Need Personalized Guidance?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            While our resources are a great starting point, nothing beats a
            conversation about your specific project and goals.
          </p>
          <Button
            size="lg"
            className="text-lg px-8 bg-blue-500 hover:bg-blue-600 text-slate-900"
            asChild
          >
            <Link href="/schedule-a-call">
              Schedule a Call
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
