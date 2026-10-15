"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { adamsHeroSlides, adamsTrustIndicators } from "@/lib/adams-hero-slides";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";
import { getImage, base64ToDataUrl } from "@/lib/firebase-images";

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

interface AdamsHeroCarouselProps {
  slides?: HeroSlide[];
  autoPlayInterval?: number;
}

export function AdamsHeroCarousel({ 
  slides, 
  autoPlayInterval = 6000 
}: AdamsHeroCarouselProps) {
  const [firestoreSlides, setFirestoreSlides] = useState<HeroSlide[]>(slides || adamsHeroSlides);
  const [loading, setLoading] = useState(() => Boolean(db));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [autoBackgroundImages] = useState<Record<string, string>>({});

  // Fetch slides from Firestore
  useEffect(() => {
    if (!db) {
      return;
    }

    const slidesQuery = query(
      collection(db, COLLECTIONS.HERO_SLIDES),
      orderBy("order", "asc")
    );

    const unsubscribe = onSnapshot(slidesQuery, async (snapshot) => {
      if (snapshot.empty) {
        setFirestoreSlides(slides || adamsHeroSlides);
        setLoading(false);
        return;
      }

      const slidesData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let backgroundImage = data.backgroundImage;

          // Load image from Image Manager if imageId exists
          if (backgroundImage?.imageId && !backgroundImage.imageId.startsWith("pexels-") && !backgroundImage.imageId.startsWith("unsplash-")) {
            try {
              const image = await getImage(backgroundImage.imageId);
              if (image && image.base64Data && image.mimeType) {
                const dataUrl = base64ToDataUrl(image.base64Data, image.mimeType);
                if (dataUrl) {
                  backgroundImage = {
                    imageId: backgroundImage.imageId,
                    url: dataUrl,
                    name: image.name,
                  };
                }
              }
            } catch (error) {
              console.error("Failed to load image:", error);
            }
          }

          // If no background image from Firestore, try to get from default slides
          if (!backgroundImage?.url) {
            const defaultSlide = adamsHeroSlides.find(s => s.id === docSnap.id);
            if (defaultSlide?.backgroundImage?.url) {
              backgroundImage = defaultSlide.backgroundImage;
            }
          }

          return {
            id: docSnap.id,
            badge: data.badge,
            headline: data.headline,
            highlightedText: data.highlightedText,
            subheadline: data.subheadline,
            benefits: data.benefits,
            primaryCta: data.primaryCta,
            secondaryCta: data.secondaryCta,
            isPublished: data.isPublished,
            order: data.order,
            backgroundImage,
            animation: data.animation,
            overlay: data.overlay,
            leadMagnet: data.leadMagnet,
          };
        })
      );

      // Filter only published slides
      const publishedOnly = slidesData.filter(slide => slide.isPublished);
      setFirestoreSlides(publishedOnly);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching hero slides:", error);
      setFirestoreSlides(slides || adamsHeroSlides);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [slides]);

  const publishedSlides = firestoreSlides;

  // NOTE: Auto-fetch disabled - using hardcoded Pexels images from adamsHeroSlides
  // If you need dynamic image fetching in the future, re-enable this useEffect
  /*
  useEffect(() => {
    const fetchBackgroundImages = async () => {
      const newImages: Record<string, string> = {};
      
      for (const slide of publishedSlides) {
        // Skip if slide already has a background image
        if (slide.backgroundImage?.url) continue;
        
        // Skip if we already fetched an image for this slide
        if (autoBackgroundImages[slide.id]) continue;
        
        // Create search query from headline and highlighted text
        const searchQuery = `${slide.headline} ${slide.highlightedText}`.trim();
        
        try {
          // Try Pexels first
          const pexelsResponse = await fetch(`/api/images/pexels?query=${encodeURIComponent(searchQuery)}`);
          if (pexelsResponse.ok) {
            const pexelsData = await pexelsResponse.json();
            if (pexelsData.photos && pexelsData.photos.length > 0) {
              newImages[slide.id] = pexelsData.photos[0].src.large2x;
              continue;
            }
          }
          
          // Fallback to Unsplash
          const unsplashResponse = await fetch(`/api/images/unsplash?query=${encodeURIComponent(searchQuery)}`);
          if (unsplashResponse.ok) {
            const unsplashData = await unsplashResponse.json();
            if (unsplashData.results && unsplashData.results.length > 0) {
              newImages[slide.id] = unsplashData.results[0].urls.regular;
            }
          }
        } catch (error) {
          // Silently ignore network errors
        }
      }
      
      if (Object.keys(newImages).length > 0) {
        setAutoBackgroundImages(prev => ({ ...prev, ...newImages }));
      }
    };
    
    if (publishedSlides.length > 0) {
      fetchBackgroundImages();
    }
  }, [publishedSlides, autoBackgroundImages]);
  */

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

  if (loading) {
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <div className="relative py-20 md:py-32 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
          </div>
        </div>
      </section>
    );
  }

  if (publishedSlides.length === 0) {
    return null;
  }

  const currentSlide = publishedSlides[currentIndex];
  const backgroundImageUrl = currentSlide.backgroundImage?.url || autoBackgroundImages[currentSlide.id] || "";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white z-0">
      {/* Background Image */}
      {backgroundImageUrl && backgroundImageUrl.trim() !== "" && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backgroundImageUrl})` }}
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90" />
        </>
      )}
      
      {/* Background Pattern - Adams themed (only if no image) */}
      {!backgroundImageUrl && (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      )}
      
      {/* Accent gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10" />
      
      <div className="relative py-20 md:py-32 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Slide Content with Fade Animation */}
          <div key={currentSlide.id} className="animate-in fade-in duration-500">
            {/* Badge */}
            <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-400 bg-blue-500/10">
              {currentSlide.badge}
            </Badge>

            {/* Headline */}
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {currentSlide.headline}{" "}
              <span className="text-blue-400">{currentSlide.highlightedText}</span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-lg text-gray-300 md:text-xl max-w-2xl mx-auto">
              {currentSlide.subheadline}
            </p>

            {/* Key Benefits */}
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              {currentSlide.benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-400" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                size="lg" 
                className="text-lg px-8 bg-blue-500 hover:bg-blue-600 text-slate-900 font-semibold" 
                asChild
              >
                <Link href={currentSlide.primaryCta.href}>
                  {currentSlide.primaryCta.text}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              {currentSlide.secondaryCta.text && (
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 border-blue-400 text-blue-400 hover:bg-blue-400/20 hover:text-blue-300" 
                  asChild
                >
                  <Link href={currentSlide.secondaryCta.href}>
                    {currentSlide.secondaryCta.text}
                  </Link>
                </Button>
              )}
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
                        ? "bg-blue-400 w-8"
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

          {/* Trust Indicators - Adams Electric Specific */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-sm text-gray-400 mb-6">Why Business Owners Trust Adams Electric</p>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
              {adamsTrustIndicators.map((indicator) => (
                <div key={indicator.title} className="flex flex-col items-center text-center">
                  <span className="text-lg font-bold text-white">{indicator.title}</span>
                  <span className="text-xs text-gray-400">{indicator.subtitle}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
