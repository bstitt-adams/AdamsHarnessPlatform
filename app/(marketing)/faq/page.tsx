import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  HelpCircle,
  MessageCircle,
  Phone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about Adams Electric's electrical construction services, project delivery, and how to work with our team.",
};

const faqCategories = [
  {
    title: "About Adams Electric",
    faqs: [
      {
        question: "What is Adams Electric?",
        answer:
          "Adams Electric is an electrical construction company founded in 1928. Now in its third generation of family ownership, we deliver electrical projects throughout the Southeast with a mission to Build Trust Through Performance.",
      },
      {
        question: "Where does Adams Electric work?",
        answer:
          "Adams Electric operates throughout the Southeast, serving commercial, industrial, and institutional projects across the region.",
      },
      {
        question: "What is the Adams Platform?",
        answer:
          "The Adams Platform is the digital system behind our project delivery—connecting estimating, coordination, scheduling, and project communication so teams and partners work from the same information.",
      },
      {
        question: "How long has Adams Electric been in business?",
        answer:
          "Adams Electric was founded in 1928 and has remained family owned for three generations.",
      },
    ],
  },
  {
    title: "Services & Capabilities",
    faqs: [
      {
        question: "What services does Adams Electric offer?",
        answer:
          "We provide full-lifecycle electrical services: PreConstruction, Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication, Construction, and Post Construction support.",
      },
      {
        question: "What is design-build electrical delivery?",
        answer:
          "Design-build puts electrical design and construction under a single accountable team. Design-assist brings our constructibility input into the design team's process early. Both approaches reduce RFIs, change orders, and schedule risk.",
      },
      {
        question: "What does BIM / Virtual Design include?",
        answer:
          "Our virtual design team models electrical systems in 3D, coordinates with other trades to resolve clashes before installation, and produces fabrication-ready drawings and as-built documentation.",
      },
      {
        question: "Why does prefabrication matter?",
        answer:
          "Building electrical assemblies offsite improves quality control, shortens field schedules, and reduces the amount of work performed overhead or in congested spaces—which makes jobsites safer.",
      },
    ],
  },
  {
    title: "Working Together",
    faqs: [
      {
        question: "How do I start a project with Adams Electric?",
        answer:
          "Contact our team through the website or schedule a call. We'll discuss your project scope, schedule, and delivery requirements and connect you with the right people.",
      },
      {
        question: "When should we bring Adams Electric into a project?",
        answer:
          "Earlier is better. Preconstruction involvement lets us contribute budgeting, constructability review, and procurement planning while decisions are still inexpensive to change.",
      },
      {
        question: "Who will we work with on a project?",
        answer:
          "Each project is supported by dedicated project management, field supervision, and—where applicable—virtual design and prefabrication teams, all coordinated through the Adams Platform.",
      },
      {
        question: "How do you approach jobsite safety?",
        answer:
          "Safety is foundational to how we work. Daily planning, task-level hazard analysis, mentorship, and a strong reporting culture protect our crews and our project partners.",
      },
    ],
  },
  {
    title: "Careers & Training",
    faqs: [
      {
        question: "Does Adams Electric offer training programs?",
        answer:
          "Yes. The Adams Academy provides training resources for our workforce, covering safety, technical skills, project management, and leadership development for field and office roles.",
      },
      {
        question: "How can I apply to work at Adams Electric?",
        answer:
          "Visit our Careers page or contact us to learn about current openings for electricians, apprentices, project managers, and support roles across the Southeast.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-400">
              Frequently Asked Questions
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Got Questions?{" "}
              <span className="text-blue-400">We&apos;ve Got Answers</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
              Everything you need to know about Adams Electric, our services,
              and how we deliver electrical construction projects.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-16">
            {faqCategories.map((category) => (
              <div key={category.title}>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <HelpCircle className="h-6 w-6 text-blue-500" />
                  {category.title}
                </h2>
                <Accordion type="single" collapsible className="space-y-4">
                  {category.faqs.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`${category.title}-${index}`}
                      className="border rounded-lg px-6 shadow-sm"
                    >
                      <AccordionTrigger className="text-left hover:no-underline py-4">
                        <span className="font-medium">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-6 text-blue-500" />
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Still Have Questions?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              We&apos;re here to help. Reach out directly and we&apos;ll get back to you within 24 hours.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-white rounded-xl p-6 shadow-lg text-center">
                <Phone className="h-8 w-8 mx-auto mb-4 text-blue-500" />
                <h3 className="font-semibold mb-2">Visit Us Online</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Learn more at our website
                </p>
                <a
                  href="https://adams-electric.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-medium hover:underline"
                >
                  adams-electric.com
                </a>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg text-center">
                <MessageCircle className="h-8 w-8 mx-auto mb-4 text-blue-500" />
                <h3 className="font-semibold mb-2">Email Us</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  We&apos;ll respond within 24 hours
                </p>
                <a
                  href="mailto:info@adams-electric.com"
                  className="text-blue-600 font-medium hover:underline"
                >
                  info@adams-electric.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Talk to our team about your next electrical construction project.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Button
              size="lg"
              className="text-lg px-8 bg-blue-600 hover:bg-blue-700 text-white"
              asChild
            >
              <Link href="/schedule-a-call">
                Schedule a Call
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 border-white/30 hover:bg-white/10"
              asChild
            >
              <Link href="/services">
                Explore Our Services
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
