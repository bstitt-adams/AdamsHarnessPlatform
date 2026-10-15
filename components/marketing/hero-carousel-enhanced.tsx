"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, ChevronLeft, ChevronRight, Clock } from "lucide-react";
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
    url: string;
    source: "pexels" | "unsplash" | "custom";
    photographer?: string;
    photographerUrl?: string;
    alt: string;
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

const defaultSlides: HeroSlide[] = [
  {
    id: "1",
    badge: "Introducing EDGE-X™ — Next-Gen Manufacturing Intelligence",
    headline: "Win OEM Contracts.",
    highlightedText: "Transform",
    subheadline: "We help small- and mid-sized U.S. manufacturers become qualified suppliers through ISO certification, operational readiness, and supplier development.",
    benefits: ["OEM Supplier Qualification", "ISO/QMS Certification", "Industry 4.0 Ready"],
    primaryCta: { text: "Get Your Free Assessment", href: "/contact" },
    secondaryCta: { text: "See Success Stories", href: "/case-studies" },
    isPublished: true,
    order: 1,
    animation: { type: "fade", duration: 500, delay: 0 },
    overlay: { enabled: false, color: "#000000", opacity: 50 },
    leadMagnet: { enabled: false, type: "consultation" },
  },
];

interface HeroCarouselProps {
  slides?: HeroSlide[];
  autoPlayInterval?: number;
}

const getAnimationClass = (type?: string) => {
  switch (type) {
    case "slide-up":
      return "animate-in slide-in-from-bottom-4";
    case "slide-left":
      return "animate-in slide-in-from-right-4";
    case "zoom":
      return "animate-in zoom-in-95";
    case "fade":
      return "animate-in fade-in";
    case "none":
      return "";
    default:
      return "animate-in fade-in";
  }
};

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
  const hasBackgroundImage = currentSlide.backgroundImage?.url;
  const animationClass = getAnimationClass(currentSlide.animation?.type);
  const animationDuration = currentSlide.animation?.duration || 500;
  const animationDelay = currentSlide.animation?.delay || 0;

  return (
    <section className="relative overflow-hidden bg-black text-white">
      {hasBackgroundImage ? (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
            style={{
              backgroundImage: `url(${currentSlide.backgroundImage!.url})`,
            }}
          />
          {currentSlide.overlay?.enabled && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: currentSlide.overlay.color,
                opacity: (currentSlide.overlay.opacity || 50) / 100,
              }}
            />
          )}
        </>
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      )}
      
      <div className="relative py-20 md:py-32 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div 
            key={currentSlide.id} 
            className={cn(animationClass, "duration-500")}
            style={{
              animationDuration: `${animationDuration}ms`,
              animationDelay: `${animationDelay}ms`,
            }}
          >
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary">
              {currentSlide.badge}
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {currentSlide.headline}{" "}
              <span className="text-primary">{currentSlide.highlightedText}</span> Your Manufacturing.
            </h1>

            <p className="mt-6 text-lg text-gray-300 md:text-xl max-w-2xl mx-auto">
              {currentSlide.subheadline}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              {currentSlide.benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {currentSlide.leadMagnet?.enabled && currentSlide.leadMagnet.urgency && (
              <div className="mt-6">
                <Badge variant="destructive" className="text-sm px-4 py-2 animate-pulse">
                  <Clock className="h-4 w-4 mr-2" />
                  {currentSlide.leadMagnet.urgency}
                </Badge>
              </div>
            )}

            <div className="mt-10 flex justify-center">
              <Button size="lg" className="text-lg px-8" asChild>
                <Link href={currentSlide.primaryCta.href}>
                  {currentSlide.primaryCta.text}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>

          {publishedSlides.length > 1 && (
            <div className="mt-12 flex items-center justify-center gap-4">
              <button
                onClick={() => { goToPrev(); setIsAutoPlaying(false); }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

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

              <button
                onClick={() => { goToNext(); setIsAutoPlaying(false); }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-sm text-gray-400 mb-6">Certifications & Partnerships</p>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-white">ISO 9001</span>
                <span className="text-xs text-gray-400">Certified</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-white">IATF 16949</span>
                <span className="text-xs text-gray-400">Automotive</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-white">MEP</span>
                <span className="text-xs text-gray-400">Network Partner</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-white">Reshoring</span>
                <span className="text-xs text-gray-400">Initiative</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-bold text-white">NIST</span>
                <span className="text-xs text-gray-400">Aligned</span>
              </div>
            </div>
          </div>

          {hasBackgroundImage && currentSlide.backgroundImage?.photographer && (
            <div className="mt-8 text-xs text-gray-400">
              Photo by{" "}
              <a
                href={currentSlide.backgroundImage.photographerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {currentSlide.backgroundImage.photographer}
              </a>{" "}
              on {currentSlide.backgroundImage.source === "pexels" ? "Pexels" : "Unsplash"}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
