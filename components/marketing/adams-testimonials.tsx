"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    id: 1,
    quote: "Adams Electric has been building electrical projects across the Southeast since 1928. Three generations of family ownership guide how we work today.",
    author: "Adams Electric",
    title: "Founded 1928",
    location: "Southeast United States",
    result: "Third-generation family owned",
    rating: 5,
  },
  {
    id: 2,
    quote: "From preconstruction planning through closeout and service, our teams deliver electrical work that owners can trust for the life of the building.",
    author: "Adams Electric",
    title: "Full-Lifecycle Services",
    location: "Southeast United States",
    result: "Build Trust Through Performance",
    rating: 5,
  },
  {
    id: 3,
    quote: "BIM coordination and prefabrication let us solve problems in the model and the shop—before they become rework in the field.",
    author: "Adams Electric",
    title: "Virtual Design & PreFabrication",
    location: "Southeast United States",
    result: "Coordinated, safer installations",
    rating: 5,
  },
  {
    id: 4,
    quote: "Safety is the foundation of every jobsite we run. Daily planning, mentorship, and a strong reporting culture protect our people and our partners.",
    author: "Adams Electric",
    title: "Safety Culture",
    location: "Southeast United States",
    result: "Safety first on every project",
    rating: 5,
  },
  {
    id: 5,
    quote: "The Adams Platform connects our teams, tools, and partners—streamlining project coordination, communication, and workforce development.",
    author: "Adams Electric",
    title: "The Adams Platform",
    location: "Southeast United States",
    result: "Connected project delivery",
    rating: 5,
  },
];

export function AdamsTestimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 border-blue-500/50 text-blue-600">
            Why Adams Electric
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Build Trust Through Performance
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            What sets Adams Electric apart on every project we deliver.
          </p>
        </div>

        {/* Featured Testimonial */}
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-xl bg-white">
            <CardContent className="p-8 md:p-12">
              <div className="flex justify-center mb-6">
                <Quote className="h-12 w-12 text-blue-400" />
              </div>
              
              {/* Stars */}
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(currentTestimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-blue-400 text-blue-400" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-xl md:text-2xl text-center font-medium leading-relaxed mb-8">
                &quot;{currentTestimonial.quote}&quot;
              </blockquote>

              {/* Result Badge */}
              <div className="flex justify-center mb-6">
                <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 text-sm px-4 py-1">
                  Result: {currentTestimonial.result}
                </Badge>
              </div>

              {/* Author */}
              <div className="text-center">
                <div className="font-semibold text-lg">{currentTestimonial.author}</div>
                <div className="text-muted-foreground">
                  {currentTestimonial.title} • {currentTestimonial.location}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrev}
              className="rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all duration-300",
                    index === currentIndex
                      ? "bg-blue-500 w-6"
                      : "bg-slate-300 hover:bg-slate-400"
                  )}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              className="rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Testimonial Grid (Additional) */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          {testimonials.slice(0, 3).map((testimonial) => (
            <Card key={testimonial.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-blue-400 text-blue-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 line-clamp-4">
                  &quot;{testimonial.quote}&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <span className="font-semibold text-blue-600">
                      {testimonial.author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-sm">{testimonial.author}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.title}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
