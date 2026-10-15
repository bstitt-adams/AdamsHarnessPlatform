"use client";

import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What services does Adams Electric provide?",
    answer: "Adams Electric provides full-lifecycle electrical construction services: PreConstruction, Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication, Construction, and Post Construction support.",
  },
  {
    question: "Where does Adams Electric work?",
    answer: "Adams Electric operates throughout the Southeast, supporting commercial, industrial, and institutional electrical construction projects.",
  },
  {
    question: "How long has Adams Electric been in business?",
    answer: "Adams Electric was founded in 1928 and remains a third-generation, family-owned company.",
  },
  {
    question: "What is the Adams Platform?",
    answer: "The Adams Platform is Adams Electric's internal platform for project coordination, team tools, communication, and workforce development.",
  },
  {
    question: "What is the difference between Design-Build and Design-Assist?",
    answer: "In Design-Build delivery, Adams Electric takes responsibility for both design and construction. In Design-Assist, we collaborate with the design team early so drawings reflect how the work will actually be installed.",
  },
  {
    question: "How does Adams Electric approach safety?",
    answer: "Safety is the foundation of how we build. Our crews plan work around hazards, maintain a strong reporting culture, and invest in ongoing training and mentorship.",
  },
  {
    question: "What is prefabrication and why does it matter?",
    answer: "PreFabrication moves repeatable electrical assemblies into a controlled shop environment, improving quality and safety while compressing field schedules.",
  },
  {
    question: "How do I start a project with Adams Electric?",
    answer: "Reach out through our contact page or schedule a call. Our team will discuss your project scope, timeline, and the right delivery approach for your needs.",
  },
];

export function AdamsFAQSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 border-blue-500/50 text-blue-600">
            Common Questions
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Get answers to the most common questions about working with Adams Electric.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-lg font-medium hover:text-blue-600">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Additional Help */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Still have questions?{" "}
            <a href="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
              Contact us
            </a>{" "}
            or{" "}
            <a href="/schedule-a-call" className="text-blue-600 hover:text-blue-700 font-medium">
              schedule a free call
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
