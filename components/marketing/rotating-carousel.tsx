"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RotatingCarouselSlide {
  id: string;
  label: string;
  badge?: string;
  content: ReactNode;
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

  return (
    <div
      className="flex h-full w-full flex-col justify-between px-6 py-4 sm:px-12 sm:py-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Carousel Section Navigation Pills */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 border-b border-white/10 pb-3">
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

      {/* Active Slide Content Area (Centered, No Scroll) */}
      <div className="mx-auto flex flex-1 w-full max-w-6xl items-center justify-center overflow-hidden py-4">
        <div key={activeSlide.id} className="w-full">
          {activeSlide.content}
        </div>
      </div>

      {/* Bottom Footer & Slide Dots */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between border-t border-white/10 pt-3 text-xs text-blue-200/60">
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
