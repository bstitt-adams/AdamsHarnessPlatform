"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Target, Users, Settings, ArrowRightLeft, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";

const services = [
  {
    title: "PreConstruction",
    tagline: "Plan it right before you build.",
    pillarLetter: "P",
    pillarWord: "Plan",
    description:
      "Estimating, budgeting, and constructability reviews that identify risk early and set projects up for predictable delivery.",
    expandedContent:
      "PreConstruction is where projects are won or lost. Our team reviews drawings for constructability, builds realistic budgets, flags long-lead procurement, and plans BIM coordination and prefabrication opportunities before work hits the field.",
    icon: Target,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    href: "/services#preconstruction",
    features: [
      "Estimating & Budgeting",
      "Constructability Reviews",
      "Value Engineering",
      "Schedule Planning",
    ],
  },
  {
    title: "Design-Build / Design-Assist",
    tagline: "One team from concept to completion.",
    pillarLetter: "D",
    pillarWord: "Design",
    description:
      "Integrated design and construction delivery that streamlines decisions, reduces risk, and keeps owners on schedule.",
    expandedContent:
      "With Design-Build and Design-Assist delivery, Adams Electric helps shape the design around how the work will actually be installed—reducing RFIs, change orders, and field friction while improving cost and schedule certainty.",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    href: "/services#design-build",
    features: [
      "Design-Build Delivery",
      "Design-Assist Collaboration",
      "Early Trade Involvement",
      "Cost & Schedule Certainty",
    ],
  },
  {
    title: "BIM / Virtual Design & PreFabrication",
    tagline: "Coordinate digitally, build confidently.",
    pillarLetter: "B",
    pillarWord: "Build",
    description:
      "3D modeling and clash coordination resolve conflicts before field work begins, and offsite prefabrication improves quality, safety, and schedule.",
    expandedContent:
      "Our BIM and Virtual Design team models and coordinates electrical systems in 3D, then our PreFabrication shop turns coordinated designs into ready-to-install assemblies—reducing rework and compressing field schedules.",
    icon: Settings,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    href: "/services#bim-virtual-design",
    features: [
      "3D Modeling",
      "Clash Detection",
      "Prefabrication",
      "Coordination Drawings",
    ],
  },
  {
    title: "Construction & Post Construction",
    tagline: "Skilled crews. Reliable execution.",
    pillarLetter: "C",
    pillarWord: "Construct",
    description:
      "Experienced electrical construction teams deliver safe, on-time installations, with closeout and service support after turnover.",
    expandedContent:
      "From mobilization through closeout, Adams Electric field teams deliver quality installations backed by project management, quality assurance, commissioning support, and post-construction service.",
    icon: ArrowRightLeft,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    href: "/services#construction",
    features: [
      "Electrical Installation",
      "Project Management",
      "Closeout Documentation",
      "Service & Maintenance",
    ],
  },
];

export function AdamsServicesOverview() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toggleCard = (title: string) => {
    setExpandedCard(expandedCard === title ? null : title);
  };

  return (
    <section className="py-20 md:py-28 bg-slate-50">
      <div className="container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 border-blue-500/50 text-blue-600">
            Our Capabilities
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Full-Lifecycle Electrical Services
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From preconstruction through post construction, Adams Electric delivers
            electrical work backed by planning, coordination, and craftsmanship.
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {services.map((service) => (
            <Card key={service.title} className="relative overflow-hidden group hover:shadow-lg transition-shadow border-0 shadow-md">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600" />
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${service.bgColor} flex items-center justify-center mb-4`}>
                  <service.icon className={`h-6 w-6 ${service.color}`} />
                </div>
                <CardTitle className="text-2xl">{service.title}</CardTitle>
                <CardDescription className="text-base font-medium text-blue-600">
                  {service.tagline}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{service.description}</p>
                
                {/* Capability badge */}
                <div className="flex items-center gap-2 py-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{service.pillarLetter}</span>
                  </div>
                  <span className="text-sm font-medium text-blue-700">Build Trust Through Performance</span>
                </div>

                <ul className="grid grid-cols-2 gap-2">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle className={`h-4 w-4 mt-0.5 shrink-0 ${service.color}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Expanded Content */}
                {expandedCard === service.title && (
                  <div className="pt-4 border-t border-blue-200 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-sm text-muted-foreground mb-4">{service.expandedContent}</p>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" asChild>
                      <Link href="/contact">
                        Get Started with {service.title}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}

                <Button 
                  variant="ghost" 
                  className="group/btn p-0 h-auto text-blue-600 hover:text-blue-700"
                  onClick={() => toggleCard(service.title)}
                >
                  {expandedCard === service.title ? (
                    <>
                      Show less
                      <ChevronUp className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Learn more
                      <ChevronDown className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-y-0.5" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sign Up CTA */}
        <div className="mt-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 md:p-12 text-center text-white">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Build with Adams Electric?
          </h3>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Talk to our team about your next electrical construction project—from
            early planning through closeout and service.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="text-lg bg-blue-600 hover:bg-blue-700 text-white" asChild>
              <Link href="/contact">
                Contact Our Team
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg border-blue-400 text-blue-400 hover:bg-blue-400/20 hover:text-blue-300" asChild>
              <Link href="/schedule-a-call">
                Schedule a Call
              </Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-gray-400">
            Build Trust Through Performance. Serving the Southeast since 1928.
          </p>
        </div>
      </div>
    </section>
  );
}
