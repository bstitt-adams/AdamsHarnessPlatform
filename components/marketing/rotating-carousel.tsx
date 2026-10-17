"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SideImageInfo {
  url: string;
  caption: string;
  provider: "Unsplash" | "Pexels";
}

export interface RotatingCarouselSlide {
  id: string;
  label: string;
  title?: string;
  badge?: string;
  leftImage?: SideImageInfo;
  rightImage?: SideImageInfo;
  content: ReactNode;
}

/**
 * Resolves paired Unsplash (left) and Pexels (right) side images based on slide title/label.
 */
export function getSideImagesForTitle(title: string): {
  left: SideImageInfo;
  right: SideImageInfo;
} {
  const lower = title.toLowerCase();

  if (lower.includes("safety") || lower.includes("mission critical")) {
    return {
      left: {
        url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
        caption: "Jobsite Safety & Compliance",
        provider: "Unsplash",
      },
      right: {
        url: "https://images.pexels.com/photos/8961065/pexels-photo-8961065.jpeg?auto=compress&cs=tinysrgb&w=900",
        caption: "Electrical Crew Protection",
        provider: "Pexels",
      },
    };
  }

  if (lower.includes("interview") || lower.includes("listen") || lower.includes("discovery")) {
    return {
      left: {
        url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80",
        caption: "Field & Engineering Discovery",
        provider: "Unsplash",
      },
      right: {
        url: "https://images.pexels.com/photos/3862130/pexels-photo-3862130.jpeg?auto=compress&cs=tinysrgb&w=900",
        caption: "Process Specification Review",
        provider: "Pexels",
      },
    };
  }

  if (lower.includes("how it works") || lower.includes("streamline") || lower.includes("purpose")) {
    return {
      left: {
        url: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=900&q=80",
        caption: "Electrical Systems Engineering",
        provider: "Unsplash",
      },
      right: {
        url: "https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=900",
        caption: "Switchgear & Power Distribution",
        provider: "Pexels",
      },
    };
  }

  if (lower.includes("feature") || lower.includes("benefit") || lower.includes("capabilities")) {
    return {
      left: {
        url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80",
        caption: "Mission Critical Data Center",
        provider: "Unsplash",
      },
      right: {
        url: "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=900",
        caption: "AI-Driven Field Operations",
        provider: "Pexels",
      },
    };
  }

  // Default: Adams Platform Overview
  return {
    left: {
      url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80",
      caption: "Industrial Electrical Construction",
      provider: "Unsplash",
    },
    right: {
      url: "https://images.pexels.com/photos/442150/pexels-photo-442150.jpeg?auto=compress&cs=tinysrgb&w=900",
      caption: "High-Voltage Infrastructure",
      provider: "Pexels",
    },
  };
}

interface RotatingCarouselProps {
  slides: RotatingCarouselSlide[];
  autoPlayIntervalMs?: number;
}

export function RotatingCarousel({
  slides,
  autoPlayIntervalMs = 8000,
}: RotatingCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const total = slides.length;

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (!isPlaying || isHovered || total <= 1) return;
    const timer = setInterval(nextSlide, autoPlayIntervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, isHovered, total, autoPlayIntervalMs, nextSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  if (total === 0) return null;
  const activeSlide = slides[activeIndex];
  const sidePair = getSideImagesForTitle(
    activeSlide.title || activeSlide.label,
  );
  const leftImg = activeSlide.leftImage || sidePair.left;
  const rightImg = activeSlide.rightImage || sidePair.right;

  return (
    <div
      className="flex h-full w-full flex-col justify-between px-4 py-3 sm:px-8 sm:py-5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Carousel Section Navigation Pills */}
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {slides.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-white/[0.04] text-blue-200/70 hover:bg-white/[0.1] hover:text-white"
                }`}
              >
                <span className="mr-1.5 opacity-60">0{idx + 1}</span>
                {slide.label}
              </button>
            );
          })}
        </div>

        <div className="hidden items-center gap-1.5 sm:flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-200/70 hover:bg-white/10 hover:text-white"
            onClick={() => setIsPlaying((p) => !p)}
            title={isPlaying ? "Pause carousel" : "Auto-rotate carousel"}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-200/70 hover:bg-white/10 hover:text-white"
            onClick={prevSlide}
            title="Previous section"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-200/70 hover:bg-white/10 hover:text-white"
            onClick={nextSlide}
            title="Next section"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main 3-Column Viewport Area: Left Unsplash Image | Center Slide Content | Right Pexels Image */}
      <div className="mx-auto grid flex-1 w-full max-w-[1600px] grid-cols-1 items-center gap-6 overflow-hidden py-3 lg:grid-cols-[230px_1fr_230px] xl:grid-cols-[270px_1fr_270px]">
        {/* Left Side Image (Unsplash, matched to slide title) */}
        <div className="hidden h-full max-h-[540px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#070a16] lg:flex">
          <div className="relative flex-1 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={leftImg.url}
              alt={leftImg.caption}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030409] via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <span className="inline-block rounded-full border border-white/15 bg-black/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-200">
                {leftImg.provider}
              </span>
              <p className="mt-1.5 text-xs font-semibold text-white drop-shadow">
                {leftImg.caption}
              </p>
            </div>
          </div>
        </div>

        {/* Active Slide Content */}
        <div
          key={activeSlide.id}
          className="flex h-full w-full items-center justify-center overflow-hidden px-1"
        >
          <div className="w-full">{activeSlide.content}</div>
        </div>

        {/* Right Side Image (Pexels, matched to slide title) */}
        <div className="hidden h-full max-h-[540px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#070a16] lg:flex">
          <div className="relative flex-1 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rightImg.url}
              alt={rightImg.caption}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030409] via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <span className="inline-block rounded-full border border-white/15 bg-black/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-200">
                {rightImg.provider}
              </span>
              <p className="mt-1.5 text-xs font-semibold text-white drop-shadow">
                {rightImg.caption}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer & Slide Dots */}
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between border-t border-white/10 pt-3 text-xs text-blue-200/60">
        <span>Adams Electric · Build Trust Through Performance</span>

        <div className="flex items-center gap-2">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to ${slide.label}`}
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === activeIndex
                  ? "w-7 bg-primary"
                  : "w-2 bg-white/25 hover:bg-white/50"
              }`}
            />
          ))}
        </div>

        <span className="hidden sm:inline">
          Slide {activeIndex + 1} of {total}
        </span>
      </div>
    </div>
  );
}
