import { Search, Map, Rocket, Award } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Discovery Assessment",
    description:
      "We evaluate your current operations, identify gaps, and understand your OEM qualification goals.",
    icon: Search,
  },
  {
    number: "02",
    title: "Readiness Roadmap",
    description:
      "Receive a customized transformation plan with clear milestones, timelines, and ROI projections.",
    icon: Map,
  },
  {
    number: "03",
    title: "Implementation",
    description:
      "Our expert team and affiliate network execute the plan with hands-on support and real-time tracking.",
    icon: Rocket,
  },
  {
    number: "04",
    title: "OEM Qualification",
    description:
      "Achieve supplier certification, win contracts, and establish long-term OEM partnerships.",
    icon: Award,
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A proven four-step process to transform your manufacturing operations 
            and become an OEM-qualified supplier.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-border" />

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Step Card */}
                <div className="bg-card rounded-lg p-6 shadow-sm border relative z-10">
                  {/* Number Badge */}
                  <div className="absolute -top-4 left-6 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mt-4 mb-4">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>

                {/* Arrow (hidden on last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-24 -right-4 z-20">
                    <div className="w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
