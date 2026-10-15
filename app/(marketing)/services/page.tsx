import { Metadata } from "next";
import Link from "next/link";
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
  Phone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Explore Adams Electric's electrical construction services: PreConstruction, Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication, Construction, and Post Construction.",
};

const services = [
  {
    id: "preconstruction",
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
  {
    id: "design-build",
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
  {
    id: "bim-virtual-design",
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
  {
    id: "prefabrication",
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
  {
    id: "construction",
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
  {
    id: "post-construction",
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
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-400">
              Our Services
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Full-Lifecycle{" "}
              <span className="text-blue-400">Electrical Services</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
              From preconstruction through post construction, Adams Electric delivers
              electrical work backed by planning, coordination, and craftsmanship.
            </p>
          </div>
        </div>
      </section>

      {/* Project lifecycle overview */}
      <section className="py-16 bg-blue-50">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">From Plan to Performance</h2>
            <p className="text-muted-foreground mb-8">
              Our project delivery approach connects every phase so nothing falls
              through the cracks between design, coordination, and construction.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              {["Plan", "Design", "Coordinate", "Build", "Support"].map((step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {step.charAt(0)}
                    </span>
                  </div>
                  <span className="font-medium">{step}</span>
                  {index < 4 && <ArrowRight className="h-4 w-4 text-blue-500 hidden sm:block" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Detail */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="space-y-24">
            {services.map((service, index) => (
              <div 
                key={service.id} 
                id={service.id}
                className={`grid md:grid-cols-2 gap-12 items-start ${
                  index % 2 === 1 ? "md:direction-rtl" : ""
                }`}
              >
                {/* Content */}
                <div className={index % 2 === 1 ? "md:order-2" : ""}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <service.icon className="h-7 w-7 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold">{service.title}</h2>
                      <p className="text-blue-600 font-medium">{service.tagline}</p>
                    </div>
                  </div>
                  
                  <p className="text-lg text-muted-foreground mb-8">
                    {service.description}
                  </p>

                  <div className="mb-8">
                    <h3 className="font-semibold mb-4">What You&apos;ll Achieve:</h3>
                    <ul className="space-y-3">
                      {service.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
                    <Link href="/contact">
                      Talk to Our Team
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>

                {/* Card */}
                <div className={index % 2 === 1 ? "md:order-1" : ""}>
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
            ))}
          </div>
        </div>
      </section>

      {/* How We Work Together */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <Badge variant="outline" className="mb-4 border-blue-500/50 text-blue-600">
              Our Process
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How We Work Together
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Every project is different, but here&apos;s what you can expect from our team.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { step: "1", title: "Discovery", description: "We learn about your project scope, schedule, and delivery requirements." },
              { step: "2", title: "Planning", description: "Preconstruction planning, estimating, and coordination set the project up right." },
              { step: "3", title: "Execution", description: "Skilled crews and prefabricated assemblies deliver the work safely and on time." },
              { step: "4", title: "Support", description: "Clean closeout, commissioning support, and service after turnover." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container text-center">
          <Phone className="h-12 w-12 mx-auto mb-6 text-blue-400" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Not Sure Where to Start?
          </h2>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Talk to our team about your project, or schedule a call to discuss
            the right delivery approach for your needs.
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
              className="text-lg px-8 border-white/30 hover:bg-white/10"
              asChild
            >
              <Link href="/schedule-a-call">
                Schedule a Strategy Call
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
