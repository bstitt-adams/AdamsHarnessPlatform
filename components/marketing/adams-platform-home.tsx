"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Inbox,
  MessageSquareText,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlasmaGlobe, SpaceBackground } from "./adams-platform-intro";

const INTERVIEW_TOPICS = [
  "Trigger",
  "Frequency",
  "Current steps",
  "People involved",
  "Systems used",
  "Copied data",
  "Pain points",
  "Desired process",
  "Notifications",
  "Completion evidence",
  "Timing & escalation",
  "Exceptions",
  "Compliance",
  "Integrations",
  "Human approvals",
];

const HOW_IT_WORKS = [
  {
    icon: Building2,
    title: "A department owns the process",
    body: "Every solution starts with a department and a named owner, so accountability is built in from the first question.",
  },
  {
    icon: MessageSquareText,
    title: "AI interviews the people who do the work",
    body: "A guided interview asks one focused question at a time and captures how the process really runs today.",
  },
  {
    icon: FileCheck2,
    title: "A specification is generated and approved",
    body: "The interview becomes a versioned specification that department owners review and approve before anything is built.",
  },
  {
    icon: Wrench,
    title: "The solution is built inside the portal",
    body: "Approved specifications are turned into working modules with an audit trail, running where our teams already work.",
  },
];

const SAFETY_INITIATIVES = [
  {
    icon: Inbox,
    title: "Safety Request Inbox",
    status: "Planned",
    body: "Capture safety superintendent requests that get lost in email and texts. Categorize each one, assign an owner, track due status, and notify the requester when the work is done.",
  },
  {
    icon: Truck,
    title: "Six-Month Vehicle Inspection",
    status: "Planned",
    body: "Recurring inspections with interior and exterior photos, VIN and plate capture, overdue reminders, supervisor escalation, and retained photo evidence of completion.",
  },
  {
    icon: CalendarDays,
    title: "Multi-Site Bilingual Safety Calendar",
    status: "Built, rollout pending",
    body: "A centrally managed English and Spanish calendar for job-site safety office displays, with role-based visibility and updates through chat.",
  },
  {
    icon: GraduationCap,
    title: "Training & Certification Tracker",
    status: "Planned",
    body: "Track training and certifications, send reminders before they expire, and let general contractors verify a worker's current credentials by QR code.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.7, ease: "easeOut" as const },
};

export function AdamsPlatformHome() {
  return (
    <div className="relative isolate text-white">
      <SpaceBackground />

      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden">
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[6%] w-[min(60vw,280px)] -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <PlasmaGlobe className="h-auto w-full" />
        </motion.div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-end px-6 pb-16 text-center sm:pb-24">
          <div className="max-w-3xl space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300/80 sm:text-sm">
              Adams Electric presents
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight drop-shadow-[0_0_30px_rgba(120,140,255,0.45)] sm:text-6xl md:text-7xl">
              Adams Platform
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-blue-100/85 sm:text-xl md:text-2xl">
              Streamlining how Adams Electric does business, using AI. Starting with the processes that keep our people safe.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="bg-primary text-primary-foreground shadow-[0_0_40px_rgba(59,130,246,0.45)] hover:bg-primary/90">
                <Link href="/interview">
                  Start an interview
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10 hover:text-white">
                <a href="#purpose">See how it works</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Purpose */}
      <section id="purpose" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 sm:py-28">
        <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300/80">Why Adams Platform exists</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Streamline Adams Electric&apos;s business processes with AI</h2>
          <p className="mt-6 text-lg leading-relaxed text-blue-100/80">
            Every department at Adams Electric runs on processes that live in email threads, text messages, spreadsheets, and
            the memory of the people who do the work. Adams Platform turns those processes into dependable digital workflows:
            interviewed by AI, written into a specification, approved by the department that owns them, and built inside one
            secure portal.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div
              key={step.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
            >
              <span className="absolute right-5 top-5 text-xs font-semibold text-blue-300/60">0{i + 1}</span>
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-blue-300">
                <step.icon className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-blue-100/70">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mission Critical Safety */}
      <section id="safety" className="relative border-y border-white/10 bg-white/[0.03] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div {...fadeUp} className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-blue-200">
                <ShieldCheck className="size-4" />
                Mission Critical Safety
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-5xl">Safety is where we start</h2>
              <p className="mt-6 text-lg leading-relaxed text-blue-100/80">
                Our Safety team protects crews on every job site, and much of that work still runs through email, texts,
                whiteboards, and paper. Mission Critical Safety is our plan to give every safety process a reliable system of
                record: no request lost, every task owned, every deadline tracked, every completion proven.
              </p>
              <ul className="mt-8 space-y-3 text-blue-100/80">
                {[
                  "The Safety department owns each process and approves what gets built.",
                  "Each initiative begins with a requirements interview, not an assumption.",
                  "Evidence, reminders, and escalation are designed in from the start.",
                  "Everything runs in the Adams portal with a full audit trail.",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-1 size-5 shrink-0 text-blue-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {SAFETY_INITIATIVES.map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: 0.15 + i * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-[#070a16]/70 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/20 text-blue-300">
                      <item.icon className="size-5" />
                    </div>
                    <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-200/80">{item.status}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-blue-100/65">{item.body}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* First initiative: the interview */}
      <section id="interview" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 sm:py-28">
        <motion.div {...fadeUp} className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300/80">First initiative</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Before we build anything, we listen</h2>
            <p className="mt-6 text-lg leading-relaxed text-blue-100/80">
              The first Mission Critical Safety initiative is the requirements interview. An AI interviewer sits down with the
              people who run a safety process and asks one focused question at a time, capturing how the work happens today,
              where it breaks down, and what done looks like.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-blue-100/80">
              As you answer, the facts are organized live and coverage is tracked across every required topic. When nothing is
              left unresolved, the interview produces a versioned specification for the department owner to review and
              approve. Nothing is built until it is approved.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="bg-primary text-primary-foreground shadow-[0_0_40px_rgba(59,130,246,0.45)] hover:bg-primary/90">
                <Link href="/interview">
                  Start an interview
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="text-sm text-blue-200/60">About 20 to 30 minutes. No sign-in required.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-blue-300">
                <Bot className="size-5" />
              </div>
              <div>
                <p className="font-semibold">Adams process interviewer</p>
                <p className="text-xs text-blue-200/60">One question at a time</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white/[0.08] px-4 py-3 text-blue-50/90">
                When a safety superintendent needs something from the office today, how does that request usually reach you?
              </div>
              <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-primary/30 px-4 py-3 text-blue-50">
                Mostly texts and emails. Some get forwarded, some get missed, and nobody knows who owns it.
              </div>
              <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white/[0.08] px-4 py-3 text-blue-50/90">
                Understood. Who should be notified when a request is picked up, and how do you know it is complete?
              </div>
            </div>
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-blue-300/70">
                <ClipboardList className="size-4" />
                Topics the interview covers
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {INTERVIEW_TOPICS.map((topic) => (
                  <span key={topic} className="rounded-full border border-white/10 bg-[#070a16]/70 px-3 py-1 text-xs text-blue-100/80">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-blue-200/50">
        Adams Electric · Build Trust Through Performance
      </footer>
    </div>
  );
}
