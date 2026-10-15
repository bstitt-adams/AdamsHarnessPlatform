import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wrench,
  ArrowRight,
  CheckCircle,
  Cog,
  Bot,
  FileCheck,
  Monitor,
  Users,
  Globe,
  Search,
  BarChart3,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Capabilities",
  description:
    "Adams Electric capabilities: PreConstruction, Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication, Construction, and Post Construction services across the Southeast.",
};

const modules = [
  {
    id: "preconstruction",
    title: "PreConstruction",
    tagline: "Plan It Right Before You Build.",
    icon: Cog,
    description:
      "Estimating, budgeting, and constructability reviews that identify risk early and keep projects predictable.",
    features: [
      "Estimating and budgeting",
      "Constructability reviews",
      "Value engineering",
      "Schedule planning",
      "Long-lead procurement tracking",
      "Risk identification",
    ],
    outcomes: [
      "Clearer budgets and schedules",
      "Reduced field rework",
      "Fewer surprises during construction",
    ],
    href: "/services/preconstruction",
  },
  {
    id: "design-build",
    title: "Design-Build / Design-Assist",
    tagline: "One Team From Concept to Completion.",
    icon: Bot,
    description:
      "Integrated design and construction delivery that streamlines decisions and reduces risk.",
    features: [
      "Design-Build delivery",
      "Design-Assist collaboration",
      "Early trade involvement",
      "Cost and schedule certainty",
      "Single-point accountability",
      "Faster decision cycles",
    ],
    outcomes: [
      "Fewer RFIs and change orders",
      "Constructible designs",
      "Compressed schedules",
    ],
    href: "/services/design-build",
  },
  {
    id: "bim",
    title: "BIM / Virtual Design",
    tagline: "Coordinate Digitally. Build Confidently.",
    icon: FileCheck,
    description:
      "3D modeling and clash coordination that resolves conflicts before field work begins.",
    features: [
      "3D modeling",
      "Clash detection and resolution",
      "Coordination drawings",
      "Prefabrication support",
      "Layout and field points",
      "As-built documentation",
    ],
    outcomes: [
      "Conflicts resolved upstream",
      "Better field productivity",
      "Serviceable installations",
    ],
    href: "/services/bim-virtual-design",
  },
  {
    id: "prefabrication",
    title: "PreFabrication",
    tagline: "Build Offsite. Install Faster.",
    icon: Monitor,
    description:
      "Offsite fabrication of electrical assemblies that improves quality, safety, and schedule.",
    features: [
      "Assembly fabrication",
      "Kitting and logistics",
      "Quality control in the shop",
      "Reduced field labor hours",
      "Safer installation",
      "Field installation support",
    ],
    outcomes: [
      "Compressed field schedules",
      "Consistent quality",
      "Safer jobsites",
    ],
    href: "/services/prefabrication",
  },
  {
    id: "construction",
    title: "Construction",
    tagline: "Skilled Crews. Reliable Execution.",
    icon: Users,
    description:
      "Experienced electrical construction teams delivering safe, on-time installations.",
    features: [
      "Electrical installation",
      "Project management",
      "Field supervision",
      "Quality assurance",
      "Safety leadership",
      "Schedule management",
    ],
    outcomes: [
      "Safe, quality installations",
      "Predictable delivery",
      "Trusted jobsite partner",
    ],
    href: "/services/construction",
  },
  {
    id: "post-construction",
    title: "Post Construction",
    tagline: "Support Beyond Turnover.",
    icon: Globe,
    description:
      "Closeout documentation, commissioning support, and ongoing service after project completion.",
    features: [
      "Closeout documentation",
      "Commissioning support",
      "O&M manuals and as-builts",
      "Service and maintenance",
      "Warranty support",
      "Owner training",
    ],
    outcomes: [
      "Clean project turnover",
      "Confident building operators",
      "Long-term partnership",
    ],
    href: "/services/post-construction",
  },
];

const benefits = [
  {
    icon: Zap,
    title: "Full-Lifecycle Partner",
    description: "One accountable team from early planning through post-construction service.",
  },
  {
    icon: BarChart3,
    title: "Predictable Delivery",
    description: "Preconstruction planning and BIM coordination keep budgets and schedules on track.",
  },
  {
    icon: Search,
    title: "Safety First",
    description: "A strong safety culture protects our people, our partners, and your project.",
  },
  {
    icon: Users,
    title: "Family Owned Since 1928",
    description: "Third-generation ownership means decisions are made for the long term.",
  },
];

export default function CapabilitiesPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-black text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary">
              Adams Electric Capabilities
            </Badge>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center">
                <Wrench className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Build Trust Through{" "}
              <span className="text-primary">Performance.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
              Full-lifecycle electrical construction services—PreConstruction,
              Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication,
              Construction, and Post Construction—throughout the Southeast.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="text-lg px-8" asChild>
                <Link href="/contact">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 border-white/20 hover:bg-white/10" asChild>
                <Link href="#modules">
                  Explore Capabilities
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="text-center">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="modules" className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Explore Our Capabilities
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Each service delivers standalone value—and they&apos;re designed to work
              together across the full project lifecycle.
            </p>
          </div>

          <Tabs defaultValue="preconstruction" className="max-w-5xl mx-auto">
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto gap-2 bg-transparent">
              {modules.map((module) => (
                <TabsTrigger
                  key={module.id}
                  value={module.id}
                  className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <module.icon className="h-5 w-5" />
                  <span className="text-xs">{module.title.split(" /")[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {modules.map((module) => (
              <TabsContent key={module.id} value={module.id} className="mt-8">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                        <module.icon className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{module.title}</CardTitle>
                        <CardDescription className="text-base font-medium">
                          {module.tagline}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground">{module.description}</p>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="font-semibold mb-4">What&apos;s Included</h4>
                        <ul className="space-y-2">
                          {module.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2">
                              <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-4">What It Delivers</h4>
                        <ul className="space-y-2">
                          {module.outcomes.map((outcome) => (
                            <li key={outcome} className="flex items-start gap-2">
                              <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                              <span className="font-medium">{outcome}</span>
                            </li>
                          ))}
                        </ul>
                        <Button className="mt-6" asChild>
                          <Link href={module.href}>
                            Learn More
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Build with Adams Electric?
          </h2>
          <p className="mt-4 text-lg opacity-90 max-w-2xl mx-auto">
            Talk to our team about your next electrical construction project.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-8 text-lg px-8 bg-white text-primary hover:bg-white/90"
            asChild
          >
            <Link href="/contact">
              Contact Us
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
