import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  DollarSign,
  Globe,
  Factory,
  TrendingUp,
  Award,
  Bot,
  Users,
  Handshake,
  Target,
  CheckCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Core Team",
  description:
    "Meet the Adams Electric team - veteran experts with complementary expertise in business consulting, finance, international business, and technology.",
};

const expertiseAreas = [
  {
    icon: DollarSign,
    title: "Finance & Accounting Excellence",
    description:
      "Streamline cost structures, manage budgets, and improve financial health with consultants who understand the intricate dynamics of manufacturing economics. Establish finance & accounting systems to capture R&D tax credits.",
  },
  {
    icon: Globe,
    title: "International Business Expertise",
    description:
      "Navigate the complexities of global markets, from supply chain challenges to cross-border expansion strategies. Two of our advisors are fluent in Mandarin.",
  },
  {
    icon: Factory,
    title: "Operations Leaders",
    description:
      "Optimize processes, implement lean principles, and enhance efficiency with insights from operations veterans who have led high-performing organizations.",
  },
  {
    icon: TrendingUp,
    title: "Sales & Marketing Strategists",
    description:
      "Drive growth and expand market reach with targeted strategies tailored to the competitive landscape of your industry.",
  },
  {
    icon: Award,
    title: "ISO 9001 Compliance Professionals",
    description:
      "Ensure quality, consistency, and compliance with ISO standards to meet regulatory requirements and exceed customer expectations.",
  },
  {
    icon: Bot,
    title: "AI & Automation Visionaries",
    description:
      "Revolutionize operations with cutting-edge technologies like AI-driven insights, robotics, and smart factory systems, enabling you to stay ahead in the era of Industry 4.0.",
  },
];

const values = [
  {
    icon: Users,
    title: "Veteran Experience, Proven Results",
    description:
      "Every member of our team is a veteran consultant who has worked extensively with manufacturing companies. We've faced the same challenges you're experiencing and have a proven track record of delivering results that matter.",
  },
  {
    icon: Handshake,
    title: "Seamless Collaboration",
    description:
      "Our team operates as a cohesive unit, ensuring every project benefits from the full spectrum of our expertise. With access to critical resources and a shared commitment to success, we deliver comprehensive, actionable solutions.",
  },
  {
    icon: Target,
    title: "Dedication to Your Success",
    description:
      "We don't just consult—we partner with you. Our team is deeply invested in your success, and we take pride in seeing your business thrive. With Adams Electric, you gain trusted advisors committed to driving your business forward.",
  },
];

export default function CompanyPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-black text-white">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary">
              Our Core Team
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Expertise that{" "}
              <span className="text-primary">Drives Results</span>
            </h1>
            <p className="mt-6 text-xl text-gray-300 font-medium">
              A Team of Veteran Experts. A Unified Vision. A Commitment to Excellence and Adding Value.
            </p>
            <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto">
              Our greatest strength lies in our team—a vetted collection of seasoned consultants 
              who bring a wealth of experience, specialized knowledge, and a shared passion for 
              transforming businesses.
            </p>
          </div>
        </div>
      </section>

      {/* Key Capabilities */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-6 text-center">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">Six Sigma & Process Optimization</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">Supply Chain</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">Finance & Accounting</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">International Business</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">Sales & Marketing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">ISO Compliance</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">AI Technologies</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">Automation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Complementary Expertise */}
      <section className="py-20 md:py-28">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Complementary Expertise, Unified Impact
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
              Our advisors come from varied professional backgrounds, ensuring a holistic approach 
              to problem-solving. While each member specializes in a core discipline, we work 
              seamlessly together, leveraging our collective skills to create tailored, innovative solutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {expertiseAreas.map((area) => (
              <Card key={area.title} className="h-full">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <area.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{area.title}</h3>
                  <p className="text-muted-foreground">{area.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value) => (
              <Card key={value.title} className="border-2 border-primary/10">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <value.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Get Started for Free Today!
          </h2>
          <p className="mt-4 text-lg opacity-90 max-w-2xl mx-auto">
            Schedule a Free Impact Session to discover new opportunities for increasing 
            profitability and reducing business risk with our dedicated and insightful advisors.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-8 text-lg px-8 bg-white text-primary hover:bg-white/90"
            asChild
          >
            <Link href="/contact">
              Book Your Free Session Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 text-sm opacity-80">No risk and no obligation</p>
        </div>
      </section>
    </>
  );
}
