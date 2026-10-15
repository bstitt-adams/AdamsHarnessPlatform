"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, Play } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-black text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      <div className="relative py-20 md:py-32 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <Badge variant="outline" className="mb-6 border-primary/50 text-primary">
            Introducing EDGE-X™ — Next-Gen Business Intelligence
          </Badge>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Grow Your Business.{" "}
            <span className="text-primary">Transform</span> Your Operations.
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg text-gray-300 md:text-xl max-w-2xl mx-auto">
            We help businesses achieve strategic goals through expert consulting, 
            process optimization, digital transformation, and operational readiness.
          </p>

          {/* Key Benefits */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span>Strategic Growth Planning</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span>Quality & Compliance</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span>Digital Transformation</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="text-lg px-8" asChild>
              <Link href="/contact">
                Get Your Free Assessment
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-white/20 hover:bg-white/10" asChild>
              <Link href="/case-studies">
                <Play className="mr-2 h-5 w-5" />
                See Success Stories
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-sm text-gray-400 mb-6">Trusted by businesses across the United States</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              {/* Placeholder for client logos */}
              <div className="h-8 w-24 bg-white/20 rounded" />
              <div className="h-8 w-28 bg-white/20 rounded" />
              <div className="h-8 w-20 bg-white/20 rounded" />
              <div className="h-8 w-32 bg-white/20 rounded" />
              <div className="h-8 w-24 bg-white/20 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
