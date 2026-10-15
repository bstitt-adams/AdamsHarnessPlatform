"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

const highlights = [
  {
    quote:
      "Preconstruction is where projects are won. Accurate budgets, constructability review, and early coordination set the job up before crews ever mobilize.",
    label: "PreConstruction",
    detail: "Estimating, budgeting, and design-assist planning",
    initials: "PC",
  },
  {
    quote:
      "BIM coordination resolves clashes in the model instead of the ceiling, so installations are serviceable and field crews stay productive.",
    label: "BIM / Virtual Design",
    detail: "3D coordination and prefabrication-ready design",
    initials: "VD",
  },
  {
    quote:
      "Prefabricating electrical assemblies offsite compresses schedules, improves quality, and keeps field labor safer.",
    label: "PreFabrication",
    detail: "Shop-built assemblies and jobsite kitting",
    initials: "PF",
  },
  {
    quote:
      "Clean closeout, commissioning support, and responsive service mean the relationship continues long after turnover.",
    label: "Post Construction",
    detail: "Closeout, commissioning, and ongoing service",
    initials: "SC",
  },
];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % highlights.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + highlights.length) % highlights.length);
  };

  return (
    <section className="py-20 md:py-28">
      <div className="container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            What Drives Our Work
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            The principles behind how Adams Electric delivers electrical construction
            across the Southeast.
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="relative max-w-4xl mx-auto">
          <Card className="bg-card border-2">
            <CardContent className="p-8 md:p-12">
              <Quote className="h-12 w-12 text-primary/20 mb-6" />
              
              <blockquote className="text-xl md:text-2xl font-medium mb-8 leading-relaxed">
                &ldquo;{highlights[currentIndex].quote}&rdquo;
              </blockquote>

              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {highlights[currentIndex].initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{highlights[currentIndex].label}</div>
                  <div className="text-sm text-muted-foreground">
                    {highlights[currentIndex].detail}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button variant="outline" size="icon" onClick={prev}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex gap-2">
              {highlights.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <Button variant="outline" size="icon" onClick={next}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
