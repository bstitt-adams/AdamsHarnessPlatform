"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Wrench, Cpu, Brain, CheckCircle } from "lucide-react";

const services = [
  {
    title: "PreConstruction & Design",
    tagline: "Plan It Right. Build It Once.",
    description:
      "Estimating, budgeting, constructability reviews, and Design-Build / Design-Assist delivery that set projects up for success.",
    icon: Wrench,
    color: "text-primary",
    bgColor: "bg-primary/10",
    href: "/services/preconstruction",
    features: [
      "Estimating & budgeting",
      "Constructability reviews",
      "Design-Build / Design-Assist",
      "Value engineering",
    ],
  },
  {
    title: "BIM / Virtual Design & PreFabrication",
    tagline: "Coordinate Digitally. Build Confidently.",
    description:
      "3D modeling, clash coordination, and offsite prefabrication that reduce rework and compress field schedules.",
    icon: Cpu,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    href: "/services/bim-virtual-design",
    features: [
      "3D modeling & clash detection",
      "Coordination drawings",
      "Prefabricated assemblies",
      "Field installation support",
    ],
  },
  {
    title: "Construction & Post Construction",
    tagline: "Skilled Crews. Reliable Delivery.",
    description:
      "Experienced electrical construction teams delivering safe, on-time installations with closeout and service support.",
    icon: Brain,
    color: "text-accent",
    bgColor: "bg-accent/10",
    href: "/services/construction",
    features: [
      "Electrical installation",
      "Project management & QA",
      "Closeout documentation",
      "Service & maintenance",
    ],
  },
];

export function ServicesOverview() {
  return (
    <section className="py-20 md:py-28">
      <div className="container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4">
            Electrical Construction Services
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Full-Lifecycle Capabilities
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From early planning through post-construction service, Adams Electric
            delivers electrical work you can trust throughout the Southeast.
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service) => (
            <Card key={service.title} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
              <div className={`absolute top-0 left-0 w-full h-1 ${service.bgColor}`} />
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${service.bgColor} flex items-center justify-center mb-4`}>
                  <service.icon className={`h-6 w-6 ${service.color}`} />
                </div>
                <CardTitle className="text-2xl">{service.title}</CardTitle>
                <CardDescription className="text-base font-medium">
                  {service.tagline}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle className={`h-4 w-4 mt-0.5 shrink-0 ${service.color}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" className="group/btn p-0 h-auto" asChild>
                  <Link href={service.href}>
                    Learn more
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Not sure which solution is right for you?
          </p>
          <Button size="lg" asChild>
            <Link href="/contact">
              Schedule a Discovery Call
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
