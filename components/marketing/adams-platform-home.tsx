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
    image:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80",
    body: "Every solution starts with a department and a named owner, so accountability is built in from the first question.",
  },
  {
    icon: MessageSquareText,
    title: "AI interviews the people who do the work",
    image:
      "https://images.pexels.com/photos/3862130/pexels-photo-3862130.jpeg?auto=compress&cs=tinysrgb&w=400",
    body: "A guided interview asks one focused question at a time and captures how the process really runs today.",
  },
  {
    icon: FileCheck2,
    title: "A specification is generated and approved",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80",
    body: "The interview becomes a versioned specification that department owners review and approve before anything is built.",
  },
  {
    icon: Wrench,
    title: "The solution is built inside the portal",
    image:
      "https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=400",
    body: "Approved specifications are turned into working modules with an audit trail, running where our teams already work.",
  },
];

const SAFETY_INITIATIVES = [
  {
    icon: Inbox,
    title: "Safety Request Inbox",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80",
    body: "Capture safety superintendent requests, categorize each one, assign an owner, track due dates, and notify the requester on completion.",
  },
  {
    icon: Truck,
    title: "Six-Month Vehicle Inspection",
    status: "Active",
    image:
      "https://images.pexels.com/photos/2244746/pexels-photo-2244746.jpeg?auto=compress&cs=tinysrgb&w=400",
    body: "Recurring inspections with interior/exterior photos, VIN & plate capture, overdue reminders, and supervisor escalation.",
  },
  {
    icon: CalendarDays,
    title: "Multi-Site Bilingual Safety Calendar",
    status: "Live",
    image:
      "https://images.unsplash.com/photo-1541888946425-d09bb18086f6?auto=format&fit=crop&w=400&q=80",
    body: "Centrally managed English and Spanish jobsite safety displays with role-based visibility and instant updates.",
  },
  {
    icon: GraduationCap,
    title: "Training & Certification Tracker",
    status: "Live",
    image:
      "https://images.pexels.com/photos/8961065/pexels-photo-8961065.jpeg?auto=compress&cs=tinysrgb&w=400",
    body: "Upload Base64 training artifacts, track required expiration dates, and complete Adams Learning Academy courses.",
  },
];

const PLATFORM_BENEFITS = [
  {
    icon: LayoutDashboard,
    title: "Standardized Solution App Workspaces",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80",
    body: "Every approved specification launches a workspace with live KPI dashboards, AI-generated Recharts graphs, global search, and REST APIs.",
  },
  {
    icon: Brain,
    title: "AdamsBrain (ABrAIn / GBrain) Knowledge Hub",
    image:
      "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=400",
    body: "4-step Data Import Wizard stores SOPs, FAQs, PDFs, CSV/JSON datasets, and live platform records in Hermes for cited Q&A.",
  },
  {
    icon: Sparkles,
    title: "MindChuk Feed & My Mission Critical",
    image:
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80",
    body: "Personal workspace for My Tasks & MindChuk thought capture, My Assets, My Training & Certs, My Orders, and My Ideas.",
  },
  {
    icon: Bot,
    title: "Hermes, Telegram & Microsoft Teams",
    image:
      "https://images.pexels.com/photos/442150/pexels-photo-442150.jpeg?auto=compress&cs=tinysrgb&w=400",
    body: "Multi-user AI assistant grounded in your department repositories, accessible inside the portal, Telegram, and Microsoft Teams.",
  },
];

export function AdamsPlatformHome() {
  const slides: RotatingCarouselSlide[] = [
    {
      id: "overview",
      label: "Adams Platform",
      title: "Adams Platform Overview",
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
      title: "How It Works — Streamline Business Processes",
      content: (
        <div className="space-y-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300/80">
              Why Adams Platform exists
            </p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
              Streamline Adams Electric&apos;s business processes with AI
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-blue-100/80 sm:text-sm">
              Adams Platform turns email threads, texts, and spreadsheets into
              dependable digital workflows inside one secure portal.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.title}
                className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={step.image}
                  alt={step.title}
                  className="h-20 w-24 shrink-0 rounded-xl object-cover border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-blue-300">
                      Step 0{i + 1}
                    </span>
                    <step.icon className="size-4 text-blue-300" />
                  </div>
                  <h3 className="mt-1 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-blue-100/70 line-clamp-2">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "safety",
      label: "Mission Critical Safety",
      title: "Mission Critical Safety",
      content: (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200">
                <ShieldCheck className="size-3.5" />
                Mission Critical Safety
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Safety is where we start
              </h2>
            </div>
            <p className="max-w-md text-xs text-blue-100/75">
              No request lost, every task owned, every deadline tracked, and
              every completion proven with a full audit trail.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {SAFETY_INITIATIVES.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-[#070a16] p-3.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-20 w-24 shrink-0 rounded-xl object-cover border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <item.icon className="size-4 text-blue-300" />
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-blue-200/80">
                      {item.status}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-blue-100/65 line-clamp-2">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "interview",
      label: "AI Process Interview",
      title: "AI Process Interview & Discovery",
      content: (
        <div className="grid items-center gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300/80">
              Guided Discovery
            </p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Before we build anything, we listen
            </h2>
            <p className="text-xs leading-relaxed text-blue-100/80 sm:text-sm">
              An AI interviewer sits down with the people who run a process and
              asks one focused question at a time—capturing how the work happens
              today, where it breaks down, and what done looks like.
            </p>
            <ul className="space-y-1.5 text-xs text-blue-100/80">
              {[
                "Organizes facts live across 15 operational topics",
                "Compiles a versioned, SHA-256 hashed specification",
                "Requires Department Owner approval before deployment",
              ].map((pt) => (
                <li key={pt} className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-blue-300 shrink-0" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
            <div className="pt-1">
              <Button
                asChild
                size="default"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/interview">
                  Start an interview
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/20 text-blue-300">
                <Bot className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold">
                  Adams process interviewer
                </p>
                <p className="text-[11px] text-blue-200/60">
                  One question at a time
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="rounded-xl bg-white/[0.08] px-3 py-2 text-blue-50/90">
                When a safety superintendent needs something from the office
                today, how does that request usually reach you?
              </div>
              <div className="ml-auto max-w-[92%] rounded-xl bg-primary/30 px-3 py-2 text-blue-50">
                Mostly texts and emails. Some get forwarded, some get missed,
                and nobody knows who owns it.
              </div>
            </div>
            <div className="mt-3 border-t border-white/10 pt-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300/70">
                <ClipboardList className="size-3" />
                15 Topics Covered Automatically
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {INTERVIEW_TOPICS.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-white/10 bg-[#070a16] px-2 py-0.5 text-[10px] text-blue-100/80"
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
      title: "Platform Features & Benefits",
      content: (
        <div className="space-y-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-300/80">
              Platform Capabilities
            </p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
              Built for Adams Electric Field &amp; Office Teams
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {PLATFORM_BENEFITS.map((feat) => (
              <div
                key={feat.title}
                className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={feat.image}
                  alt={feat.title}
                  className="h-20 w-24 shrink-0 rounded-xl object-cover border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <feat.icon className="size-4 text-blue-300 shrink-0" />
                    <h3 className="text-sm font-semibold truncate">
                      {feat.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-blue-100/70 line-clamp-2">
                    {feat.body}
                  </p>
                </div>
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
