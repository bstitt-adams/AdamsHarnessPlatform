import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Users,
  Settings,
  ArrowRightLeft,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

const services = {
  "preconstruction": {
    icon: Target,
    title: "PreConstruction",
    tagline: "Plan it right before you build.",
    description:
      "Estimating, budgeting, and constructability reviews that identify risk early and set projects up for predictable delivery.",
    benefits: [
      "Accurate budgets built on clear scope",
      "Constructability issues resolved before field work",
      "Long-lead procurement identified early",
      "Realistic schedules you can commit to",
      "Risks surfaced while they're still cheap to fix",
    ],
    features: [
      "Estimating & Budgeting",
      "Constructability Reviews",
      "Value Engineering",
      "Schedule Planning",
      "Procurement Planning",
    ],
    ideal: "Owners and general contractors planning commercial, industrial, or institutional electrical projects who want cost and schedule certainty before mobilization.",
  },
  "design-build": {
    icon: Users,
    title: "Design-Build / Design-Assist",
    tagline: "One team from concept to completion.",
    description:
      "Integrated design and construction delivery that streamlines decisions, reduces risk, and keeps owners on schedule.",
    benefits: [
      "Single-point accountability for design and construction",
      "Drawings that reflect how work will actually be installed",
      "Fewer RFIs and change orders",
      "Faster decision cycles during design",
      "Cost and schedule certainty earlier",
    ],
    features: [
      "Design-Build Delivery",
      "Design-Assist Collaboration",
      "Early Trade Involvement",
      "Cost & Schedule Certainty",
      "Integrated Project Planning",
    ],
    ideal: "Owners who want a single accountable electrical partner, and design teams looking for constructible electrical systems.",
  },
  "bim-virtual-design": {
    icon: Settings,
    title: "BIM / Virtual Design",
    tagline: "Coordinate digitally, build confidently.",
    description:
      "3D modeling and clash coordination that resolves conflicts before field work begins.",
    benefits: [
      "Conflicts resolved in the model, not the ceiling",
      "Reduced rework and field downtime",
      "Serviceable, maintainable installations",
      "Accurate layout and field points",
      "Prefabrication-ready coordinated designs",
    ],
    features: [
      "3D Modeling",
      "Clash Detection & Resolution",
      "Coordination Drawings",
      "Prefabrication Support",
      "As-Built Documentation",
    ],
    ideal: "Projects with congested ceilings, complex systems, or aggressive schedules where coordination drives field productivity.",
  },
  "prefabrication": {
    icon: ArrowRightLeft,
    title: "PreFabrication",
    tagline: "Build offsite, install faster.",
    description:
      "Offsite fabrication of electrical assemblies that improves quality, safety, and schedule.",
    benefits: [
      "Compressed field schedules",
      "Consistent shop-quality assemblies",
      "Reduced field labor exposure",
      "Safer installation with less overhead work",
      "Predictable logistics and kitting",
    ],
    features: [
      "Assembly Fabrication",
      "Kitting & Logistics",
      "Shop Quality Control",
      "Field Installation Support",
      "Repeatable Component Design",
    ],
    ideal: "Projects with repeatable rooms or systems, tight schedules, or limited site access where offsite fabrication pays for itself.",
  },
  "construction": {
    icon: Target,
    title: "Construction",
    tagline: "Skilled crews. Reliable execution.",
    description:
      "Experienced electrical construction teams delivering safe, on-time installations.",
    benefits: [
      "Safe, well-run jobsites",
      "Quality workmanship verified throughout",
      "Schedules that hold",
      "Experienced supervision and project management",
      "Responsive communication with the project team",
    ],
    features: [
      "Electrical Installation",
      "Project Management",
      "Field Supervision",
      "Quality Assurance",
      "Safety Leadership",
    ],
    ideal: "Owners and contractors who need a dependable electrical partner for commercial, industrial, and institutional projects.",
  },
  "post-construction": {
    icon: ArrowRightLeft,
    title: "Post Construction",
    tagline: "Support beyond turnover.",
    description:
      "Closeout documentation, commissioning support, and ongoing service after project completion.",
    benefits: [
      "Clean, complete project turnover",
      "Documentation operators actually use",
      "Commissioning support when it matters",
      "Responsive service after completion",
      "A partner for the life of the building",
    ],
    features: [
      "Closeout Documentation",
      "Commissioning Support",
      "O&M Manuals & As-Builts",
      "Service & Maintenance",
      "Warranty Support",
    ],
    ideal: "Owners and facility teams who want an electrical partner that stays engaged long after the lights turn on.",
  },
};

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = services[slug as keyof typeof services];
  
  if (!service) {
    return {
      title: "Service Not Found",
    };
  }

  return {
    title: `${service.title}`,
    description: service.description,
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const service = services[slug as keyof typeof services];

  if (!service) {
    notFound();
  }

  const IconComponent = service.icon;

  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-400">
              <Link href="/services" className="hover:underline">
                ← All Services
              </Link>
            </Badge>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <IconComponent className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  {service.title}
                </h1>
                <p className="text-xl text-blue-400 mt-2">{service.tagline}</p>
              </div>
            </div>
            <p className="text-lg text-gray-300">
              {service.description}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Benefits */}
            <div>
              <h2 className="text-2xl font-bold mb-6">What You&apos;ll Achieve</h2>
              <ul className="space-y-4">
                {service.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Button className="mt-8 bg-blue-600 hover:bg-blue-700 text-white" asChild>
                <Link href="/contact">
                  Talk to Our Team
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* Features Card */}
            <div>
              <Card className="border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-t-lg">
                  <CardTitle className="text-xl">What&apos;s Included</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-3 mb-6">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-6 border-t">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                      IDEAL FOR:
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {service.ideal}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Talk to our team about how our {service.title.toLowerCase()} capabilities
            can support your next project.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size="lg"
              className="text-lg px-8 bg-blue-600 hover:bg-blue-700 text-white"
              asChild
            >
              <Link href="/schedule-a-call">
                Schedule a Call
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8"
              asChild
            >
              <Link href="/services">
                All Services
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
