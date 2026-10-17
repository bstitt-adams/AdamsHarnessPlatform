"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Brain,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  RotatingCarousel,
  type RotatingCarouselSlide,
} from "@/components/marketing/rotating-carousel";

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
    status: "Active",
    body: "Capture safety superintendent requests, categorize each one, assign an owner, track due dates, and notify the requester on completion.",
  },
  {
    icon: Truck,
    title: "Six-Month Vehicle Inspection",
    status: "Active",
    body: "Recurring inspections with interior/exterior photos, VIN & plate capture, overdue reminders, and supervisor escalation.",
  },
  {
    icon: CalendarDays,
    title: "Multi-Site Bilingual Safety Calendar",
    status: "Live",
    body: "Centrally managed English and Spanish jobsite safety displays with role-based visibility and instant updates.",
  },
  {
    icon: GraduationCap,
    title: "Training & Certification Tracker",
    status: "Live",
    body: "Upload Base64 training artifacts, track required expiration dates, and complete Adams Learning Academy courses.",
  },
];

const PLATFORM_BENEFITS = [
  {
    icon: LayoutDashboard,
    title: "Standardized Solution App Workspaces",
    body: "Every approved specification launches a workspace with live KPI dashboards, AI-generated Recharts graphs, global search, and REST APIs.",
  },
  {
    icon: Brain,
    title: "AdamsBrain (ABrAIn / GBrain) Knowledge Hub",
    body: "4-step Data Import Wizard stores SOPs, FAQs, PDFs, CSV/JSON datasets, and live platform records in Hermes for cited Q&A.",
  },
  {
    icon: Sparkles,
    title: "MindChuk Feed & My Mission Critical",
    body: "Personal workspace for My Tasks & MindChuk thought capture, My Assets, My Training & Certs, My Orders, and My Ideas.",
  },
  {
    icon: Bot,
    title: "Hermes, Telegram & Microsoft Teams",
    body: "Multi-user AI assistant grounded in your department repositories, accessible inside the portal, Telegram, and Microsoft Teams.",
  },
];

export function AdamsPlatformHome() {
  const slides: RotatingCarouselSlide[] = [
    {
      id: "overview",
      label: "Adams Platform",
      content: (
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300/80 sm:text-sm">
            Adams Electric presents
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            Adams Platform
          </h1>
          <p className="mx-auto max-w-2xl text-base text-blue-100/85 sm:text-xl md:text-2xl">
            Streamlining how Adams Electric does business, using AI. Starting
            with the processes that keep our people safe.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/interview">
                Start an interview
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/sign-in">Sign in to Portal</Link>
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "purpose",
      label: "How It Works",
      content: (
        <div className="space-y-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300/80">
              Why Adams Platform exists
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
              Streamline Adams Electric&apos;s business processes with AI
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-blue-100/80 sm:text-base">
              Adams Platform turns email threads, texts, and spreadsheets into
              dependable digital workflows: interviewed by AI, written into a
              specification, approved by the owning department, and built inside
              one secure portal.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <span className="absolute right-4 top-4 text-xs font-semibold text-blue-300/60">
                  0{i + 1}
                </span>
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-blue-300">
                  <step.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-blue-100/70 sm:text-sm">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "safety",
      label: "Mission Critical Safety",
      content: (
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-blue-200">
              <ShieldCheck className="size-4" />
              Mission Critical Safety
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
              Safety is where we start
            </h2>
            <p className="text-sm leading-relaxed text-blue-100/80 sm:text-base">
              Mission Critical Safety gives every Adams Electric safety process
              a reliable system of record: no request lost, every task owned,
              every deadline tracked, every completion proven.
            </p>
            <ul className="space-y-2 text-xs text-blue-100/80 sm:text-sm">
              {[
                "The Safety department owns each process and approves what gets built.",
                "Each initiative begins with a requirements interview, not an assumption.",
                "Evidence, reminders, and escalation are designed in from the start.",
                "Everything runs in the Adams portal with a full audit trail.",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {SAFETY_INITIATIVES.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-[#070a16] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-blue-300">
                    <item.icon className="size-4" />
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-medium text-blue-200/80">
                    {item.status}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-blue-100/65">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "interview",
      label: "AI Process Interview",
      content: (
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300/80">
              Guided Discovery
            </p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
              Before we build anything, we listen
            </h2>
            <p className="text-sm leading-relaxed text-blue-100/80 sm:text-base">
              An AI interviewer sits down with the people who run a process and
              asks one focused question at a time—capturing how the work happens
              today, where it breaks down, and what done looks like.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/interview">
                  Start an interview
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <span className="text-xs text-blue-200/60">
                15 structured topics · Generates SHA-256 versioned specification
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-blue-300">
                <Bot className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Adams process interviewer</p>
                <p className="text-xs text-blue-200/60">One question at a time</p>
              </div>
            </div>
            <div className="mt-4 space-y-2.5 text-xs sm:text-sm">
              <div className="max-w-[92%] rounded-xl bg-white/[0.08] px-3.5 py-2.5 text-blue-50/90">
                When a safety superintendent needs something from the office
                today, how does that request usually reach you?
              </div>
              <div className="ml-auto max-w-[92%] rounded-xl bg-primary/30 px-3.5 py-2.5 text-blue-50">
                Mostly texts and emails. Some get forwarded, some get missed,
                and nobody knows who owns it.
              </div>
            </div>
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300/70">
                <ClipboardList className="size-3.5" />
                15 Topics Covered Automatically
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {INTERVIEW_TOPICS.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-white/10 bg-[#070a16] px-2.5 py-0.5 text-[11px] text-blue-100/80"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "benefits",
      label: "Features & Benefits",
      content: (
        <div className="space-y-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300/80">
              Platform Capabilities
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
              Built for Adams Electric Field &amp; Office Teams
            </h2>
            <p className="mt-2 text-sm text-blue-100/80 sm:text-base">
              Unified AI knowledge, instant task &amp; thought capture,
              standardized solution apps, and real-time operational visibility.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_BENEFITS.map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-blue-300">
                  <feat.icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{feat.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-blue-100/70 sm:text-sm">
                  {feat.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] w-screen overflow-hidden bg-[#030409] text-white">
      <RotatingCarousel slides={slides} autoPlayIntervalMs={8000} />
    </div>
  );
}
