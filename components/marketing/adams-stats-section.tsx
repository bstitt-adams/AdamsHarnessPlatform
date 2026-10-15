"use client";

import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";

const stats = [
  {
    value: 1928,
    suffix: "",
    label: "Founded",
    description: "Nearly a century of electrical work",
  },
  {
    value: 3,
    suffix: "",
    label: "Generations",
    description: "Family owned and operated",
  },
  {
    value: 6,
    suffix: "",
    label: "Service Lines",
    description: "PreCon through Post Construction",
  },
  {
    value: 1,
    suffix: "",
    label: "Mission",
    description: "Build Trust Through Performance",
  },
];

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2000;
          const steps = 60;
          const increment = value / steps;
          let current = 0;
          
          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setDisplayValue(value);
              clearInterval(timer);
            } else {
              setDisplayValue(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, hasAnimated]);

  return (
    <span ref={ref} className="text-4xl md:text-5xl font-bold text-blue-500">
      {displayValue}{suffix}
    </span>
  );
}

export function AdamsStatsSection() {
  return (
    <section className="py-16 md:py-24 bg-slate-900 text-white">
      <div className="container">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-blue-500/50 text-blue-400">
            Proven Results
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            The Adams Electric Difference
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            A third-generation, family-owned electrical contractor serving the Southeast.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              <div className="mt-2 text-lg font-semibold">{stat.label}</div>
              <div className="text-sm text-gray-400">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
