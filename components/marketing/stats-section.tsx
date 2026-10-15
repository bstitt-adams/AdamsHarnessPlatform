"use client";

import { useEffect, useState } from "react";
import { Factory, Users, Award, TrendingUp } from "lucide-react";

const stats = [
  {
    label: "Years Experience",
    value: 50,
    suffix: "+",
    icon: Award,
    description: "Combined team expertise in manufacturing",
  },
  {
    label: "Industry Sectors",
    value: 12,
    suffix: "+",
    icon: Factory,
    description: "Automotive, aerospace, medical & more",
  },
  {
    label: "Expert Affiliates",
    value: 25,
    suffix: "+",
    icon: Users,
    description: "Nationwide network of specialists",
  },
  {
    label: "Certifications",
    value: 15,
    suffix: "+",
    icon: TrendingUp,
    description: "ISO, IATF, AS9100 & more",
  },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  return (
    <section className="py-16 bg-black text-white">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-4">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="font-semibold mb-1">{stat.label}</div>
              <div className="text-sm text-gray-400">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
