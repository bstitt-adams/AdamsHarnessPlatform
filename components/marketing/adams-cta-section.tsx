"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Phone, ClipboardCheck } from "lucide-react";

export function AdamsCTASection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-50" />
      
      {/* Accent gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10" />

      <div className="container relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6">
            Your Project Deserves a Partner.{" "}
            <span className="text-blue-400">Let&apos;s Build It Together.</span>
          </h2>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            From preconstruction through post construction, Adams Electric delivers
            electrical work you can trust—throughout the Southeast.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Button 
              size="lg" 
              className="text-lg px-8 bg-blue-500 hover:bg-blue-600 text-slate-900 font-semibold" 
              asChild
            >
              <Link href="/contact">
                <ClipboardCheck className="mr-2 h-5 w-5" />
                Contact Our Team
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 border-blue-400 text-blue-400 hover:bg-blue-400/20 hover:text-blue-300" 
              asChild
            >
              <Link href="/schedule-a-call">
                <Phone className="mr-2 h-5 w-5" />
                Schedule a Call
              </Link>
            </Button>
          </div>

          {/* Trust Points */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Founded 1928</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Third-Generation Family Owned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Serving the Southeast</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
