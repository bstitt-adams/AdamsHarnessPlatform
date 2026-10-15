"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  id: string;
  badge: string;
  headline: string;
  highlightedText: string;
  subheadline: string;
  benefits: string[];
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta: {
    text: string;
    href: string;
  };
  isPublished: boolean;
  order: number;
  backgroundImage?: {
    imageId: string;
    url: string;
    name: string;
  };
  animation?: {
    type: "fade" | "slide-up" | "slide-left" | "zoom" | "none";
    duration: number;
    delay: number;
  };
  overlay?: {
    enabled: boolean;
    color: string;
    opacity: number;
  };
  leadMagnet?: {
    enabled: boolean;
    type: "quiz" | "download" | "consultation" | "demo";
    urgency?: string;
  };
}

// Default slides - in production these would come from a database
const defaultSlides: HeroSlide[] = [
  {
    id: "1",
    badge: "Adams Electric — Since 1928",
    headline: "Build Trust",
    highlightedText: "Through Performance",
    subheadline: "A third-generation, family-owned electrical contractor delivering PreConstruction, Design-Build, BIM, PreFabrication, Construction, and Post Construction services across the Southeast.",
    benefits: ["PreConstruction Planning", "Design-Build / Design-Assist", "BIM / Virtual Design"],
    primaryCta: { text: "Start a Conversation", href: "/schedule-a-call" },
    secondaryCta: { text: "Our Capabilities", href: "/capabilities" },
    isPublished: true,
    order: 1,
  },
  {
    id: "2",
    badge: "PreConstruction Services",
    headline: "Plan With",
    highlightedText: "Confidence",
    subheadline: "Estimating, budgeting, and constructability reviews that surface issues early and set your project up for a predictable build.",
    benefits: ["Accurate Budgets", "Constructability Reviews", "Long-Lead Procurement"],
    primaryCta: { text: "Explore PreConstruction", href: "/services" },
    secondaryCta: { text: "Learn More", href: "/about" },
    isPublished: true,
    order: 2,
  },
  {
    id: "3",
    badge: "BIM / Virtual Design",
    headline: "Coordinate Before",
    highlightedText: "You Build",
    subheadline: "3D coordination and clash detection resolve conflicts in the model, reduce rework, and feed prefabrication-ready designs to the field.",
    benefits: ["Clash Detection", "Coordination Sign-Off", "Prefab-Ready Models"],
    primaryCta: { text: "See How We Coordinate", href: "/services" },
    secondaryCta: { text: "Learn More", href: "/about" },
    isPublished: true,
    order: 3,
  },
  {
    id: "4",
    badge: "PreFabrication",
    headline: "Build Offsite.",
    highlightedText: "Install Faster.",
    subheadline: "Prefabricated assemblies move work into a controlled shop environment, compressing field schedules and improving safety and quality.",
    benefits: ["Repeatable Assemblies", "Kitting & Logistics", "Schedule Compression"],
    primaryCta: { text: "Explore PreFabrication", href: "/services" },
    secondaryCta: { text: "Learn More", href: "/about" },
    isPublished: true,
    order: 4,
  },
  {
    id: "5",
    badge: "Construction & Post Construction",
    headline: "From Groundbreak",
    highlightedText: "to Turnover",
    subheadline: "Safe, coordinated execution in the field and complete closeout documentation at handover — performance from start to finish.",
    benefits: ["Safety-First Culture", "Field Leadership", "Complete Closeout"],
    primaryCta: { text: "Schedule a Call", href: "/schedule-a-call" },
    secondaryCta: { text: "Our Capabilities", href: "/capabilities" },
    isPublished: true,
    order: 5,
  },
];

interface HeroCarouselProps {
  slides?: HeroSlide[];
  autoPlayInterval?: number;
}

export function HeroCarousel({ slides = defaultSlides, autoPlayInterval = 6000 }: HeroCarouselProps) {
  const publishedSlides = slides.filter(s => s.isPublished).sort((a, b) => a.order - b.order);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % publishedSlides.length);
  }, [publishedSlides.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + publishedSlides.length) % publishedSlides.length);
  }, [publishedSlides.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying || publishedSlides.length <= 1) return;
    
    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isAutoPlaying, autoPlayInterval, goToNext, publishedSlides.length]);

  if (publishedSlides.length === 0) {
    return null;
  }

  const currentSlide = publishedSlides[currentIndex];

  return (
    <section className="relative overflow-hidden bg-black text-white z-0">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      <div className="relative py-20 md:py-32 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Slide Content with Fade Animation */}
          <div key={currentSlide.id} className="animate-in fade-in duration-500">
            {/* Badge */}
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary">
              {currentSlide.badge}
            </Badge>

            {/* Headline */}
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {currentSlide.headline}{" "}
              <span className="text-primary">{currentSlide.highlightedText}</span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-lg text-gray-300 md:text-xl max-w-2xl mx-auto">
              {currentSlide.subheadline}
            </p>

            {/* Key Benefits */}
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              {currentSlide.benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-10 flex justify-center">
              <Button size="lg" className="text-lg px-8" asChild>
                <Link href={currentSlide.primaryCta.href}>
                  {currentSlide.primaryCta.text}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Carousel Navigation */}
          {publishedSlides.length > 1 && (
            <div className="mt-12 flex items-center justify-center gap-4">
              {/* Prev Button */}
              <button
                onClick={() => { goToPrev(); setIsAutoPlaying(false); }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Dots */}
              <div className="flex gap-2">
                {publishedSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all duration-300",
                      index === currentIndex
                        ? "bg-primary w-8"
                        : "bg-white/30 hover:bg-white/50"
                    )}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={() => { goToNext(); setIsAutoPlaying(false); }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Trust Indicators */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-sm text-gray-400 mb-6">Trusted by businesses across the United States</p>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-white">ISO 9001</span>
                <span className="text-xs text-gray-400">Compliant</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-white">EOS®</span>
                <span className="text-xs text-gray-400">Aligned</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-white">AI</span>
                <span className="text-xs text-gray-400">Powered Tools</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-white">Adams Electric</span>
                <span className="text-xs text-gray-400">Partner Network</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
