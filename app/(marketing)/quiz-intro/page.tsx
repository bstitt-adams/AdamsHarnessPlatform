"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  Clock, 
  Target, 
  Lightbulb, 
  TrendingUp,
  CheckCircle,
  Users,
  Settings,
  ArrowRightLeft
} from "lucide-react";

const quizBenefits = [
  {
    icon: Target,
    title: "Identify Your Gaps",
    description: "Discover where planning, coordination, and field execution are breaking down.",
  },
  {
    icon: Lightbulb,
    title: "Get Personalized Insights",
    description: "Receive actionable recommendations tailored to your project delivery practices.",
  },
  {
    icon: TrendingUp,
    title: "Create Your Roadmap",
    description: "Understand the next steps toward safer, more predictable project outcomes.",
  },
];

const quizAreas = [
  { icon: Target, label: "Preconstruction Planning" },
  { icon: Users, label: "Field Leadership" },
  { icon: Settings, label: "Coordination & BIM" },
  { icon: ArrowRightLeft, label: "Procurement & Closeout" },
];

export default function QuizIntroPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-600">
              Free 2-Minute Assessment
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
              Discover Your{" "}
              <span className="text-blue-500">Project Readiness Score</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Find out where your project delivery stands—and get a personalized
              roadmap for stronger planning, coordination, and execution.
            </p>

            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-10">
              <Clock className="h-5 w-5" />
              <span>Takes only 2 minutes</span>
              <span className="mx-2">•</span>
              <span>100% Free</span>
              <span className="mx-2">•</span>
              <span>Instant Results</span>
            </div>

            <Button 
              size="lg" 
              className="text-lg px-10 py-6 bg-blue-500 hover:bg-blue-600 text-slate-900 font-semibold"
              asChild
            >
              <Link href="/quiz">
                Start the Quiz Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* What You'll Learn Section */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              What You'll Discover
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {quizBenefits.map((benefit) => (
                <Card key={benefit.title} className="border-0 shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                      <benefit.icon className="h-7 w-7 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quiz Areas Section */}
      <section className="py-16 bg-slate-50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              The Quiz Covers 4 Key Areas
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Our assessment evaluates the critical dimensions of electrical project delivery.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {quizAreas.map((area) => (
                <div key={area.label} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-3">
                    <area.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="font-medium">{area.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What Happens Next Section */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              What Happens After the Quiz?
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Get Your Score</h3>
                  <p className="text-muted-foreground">
                    Receive your Project Readiness score across all dimensions immediately after completing the quiz.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Review Your Insights</h3>
                  <p className="text-muted-foreground">
                    Get personalized recommendations based on your specific answers and business situation.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">Optional: Talk to Our Team</h3>
                  <p className="text-muted-foreground">
                    If you'd like to discuss your results and explore how Adams Electric can help, schedule a call with our team.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">
              Build Trust Through Performance
            </h2>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div>
                <div className="text-4xl font-bold text-blue-400 mb-2">1928</div>
                <div className="text-gray-400">Founded</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-400 mb-2">3rd Gen</div>
                <div className="text-gray-400">Family Owned</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-400 mb-2">Southeast</div>
                <div className="text-gray-400">Region Served</div>
              </div>
            </div>

            <p className="text-xl text-gray-300 mb-6">
              Adams Electric has delivered electrical construction across the Southeast for
              three generations—backed by preconstruction discipline, BIM coordination,
              and prefabrication.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Discover Your Project Readiness Score?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Take 2 minutes to find out where your project delivery stands.
            </p>
            
            <Button 
              size="lg" 
              className="text-lg px-10 py-6 bg-blue-500 hover:bg-blue-600 text-slate-900 font-semibold"
              asChild
            >
              <Link href="/quiz">
                Start the Free Quiz
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span>No email required to start</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span>Instant results</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span>100% free</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
