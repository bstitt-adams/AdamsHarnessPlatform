/**
 * Firebase Academy Seed Script
 * Run with: npx ts-node scripts/seed-firebase-academy.ts
 * 
 * Seeds the Firestore database with initial Adams Electric Academy data
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

// Initialize Firebase Admin
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE;
if (!serviceAccountJson && !serviceAccountFile) {
  console.error("Missing Firebase service account configuration");
  process.exit(1);
}

const serviceAccount = serviceAccountJson || readFileSync(serviceAccountFile!, "utf8");
const app = initializeApp({
  credential: cert(JSON.parse(serviceAccount)),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app);

// ============================================================================
// SEED DATA
// ============================================================================

const subscriptionTiers = [
  {
    id: "adams-starter",
    name: "Adams Starter",
    slug: "adams-starter",
    description: "Essential training resources for team members building foundational skills",
    priceMonthly: 49,
    priceAnnual: 470,
    features: [
      "Access to Insights articles",
      "Monthly newsletter",
      "Community forum access",
      "1 free workshop per quarter",
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "adams-builder",
    name: "Adams Builder",
    slug: "adams-builder",
    description: "Comprehensive training for growing field and office leaders",
    priceMonthly: 149,
    priceAnnual: 1430,
    features: [
      "All Starter features",
      "Full course library access",
      "Weekly group sessions",
      "Pre/Post assessments",
      "Certificate programs",
      "Priority workshop registration",
    ],
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "adams-master",
    name: "Adams Master",
    slug: "adams-master",
    description: "Premium access with personalized development support and exclusive resources",
    priceMonthly: 349,
    priceAnnual: 3350,
    features: [
      "All Builder features",
      "Monthly 1-on-1 session",
      "Custom learning paths",
      "Leadership peer group access",
      "Annual training event invitation",
      "White-glove onboarding",
    ],
    isActive: true,
    sortOrder: 3,
  },
];

const courseCategories = [
  {
    id: "safety",
    name: "Safety",
    slug: "safety",
    description: "Jobsite safety, pre-task planning, and hazard awareness",
    icon: "Target",
    color: "blue",
    sortOrder: 1,
  },
  {
    id: "preconstruction",
    name: "PreConstruction",
    slug: "preconstruction",
    description: "Estimating, budgeting, and constructability planning",
    icon: "TrendingUp",
    color: "blue",
    sortOrder: 2,
  },
  {
    id: "bim-prefab",
    name: "BIM & Prefabrication",
    slug: "bim-prefab",
    description: "3D coordination, clash detection, and offsite fabrication",
    icon: "Settings",
    color: "blue",
    sortOrder: 3,
  },
  {
    id: "workforce-leadership",
    name: "Workforce & Leadership",
    slug: "workforce-leadership",
    description: "Field leadership and crew development",
    icon: "Users",
    color: "purple",
    sortOrder: 4,
  },
  {
    id: "project-delivery",
    name: "Project Delivery",
    slug: "project-delivery",
    description: "Construction execution, closeout, and post-construction support",
    icon: "ArrowRightLeft",
    color: "orange",
    sortOrder: 5,
  },
];

const courses = [
  {
    id: "preconstruction-planning-fundamentals",
    title: "Preconstruction Planning Fundamentals",
    slug: "preconstruction-planning-fundamentals",
    description: "Master the Adams Electric approach to preconstruction: accurate estimating, constructability review, and early procurement planning that sets projects up for predictable delivery.",
    shortDescription: "Estimating, budgeting, and constructability practices that set projects up before mobilization.",
    categoryId: "preconstruction",
    instructorName: "Adams Electric",
    instructorBio: "Third-generation, family-owned electrical contractor serving the Southeast since 1928.",
    difficultyLevel: "intermediate",
    estimatedDurationMinutes: 480,
    minSubscriptionTierId: "adams-builder",
    isFeatured: true,
    isPublished: true,
    tags: ["Adams Academy", "preconstruction", "estimating", "planning"],
    learningOutcomes: [
      "Build accurate budgets from clear scope",
      "Run effective constructability reviews",
      "Identify and track long-lead procurement items",
      "Create realistic project schedules",
    ],
    prerequisites: [],
  },
  {
    id: "project-closeout-essentials",
    title: "Project Closeout Essentials",
    slug: "project-closeout-essentials",
    description: "Plan documentation from kickoff so turnover is clean and fast. Learn as-built, O&M, and commissioning practices that leave owners confident at handoff.",
    shortDescription: "Plan documentation from kickoff for a clean, complete project closeout.",
    categoryId: "project-delivery",
    instructorName: "Adams Electric",
    difficultyLevel: "advanced",
    estimatedDurationMinutes: 240,
    minSubscriptionTierId: "adams-builder",
    isFeatured: false,
    isPublished: true,
    tags: ["closeout", "documentation", "commissioning", "turnover"],
    learningOutcomes: [
      "Plan closeout documentation requirements at kickoff",
      "Manage punch lists continuously, not at the end",
      "Assemble complete as-builts and O&M manuals",
      "Support commissioning through turnover",
    ],
    prerequisites: [],
  },
  {
    id: "field-leadership-essentials",
    title: "Field Leadership Essentials",
    slug: "field-leadership-essentials",
    description: "Develop the communication and decision-making skills that turn foremen into confident field leaders who keep projects moving safely and on schedule.",
    shortDescription: "Develop leadership skills that empower crews and keep projects moving.",
    categoryId: "workforce-leadership",
    instructorName: "Adams Electric",
    difficultyLevel: "intermediate",
    estimatedDurationMinutes: 360,
    minSubscriptionTierId: "adams-builder",
    isFeatured: false,
    isPublished: true,
    tags: ["leadership", "field leadership", "mentorship", "communication"],
    learningOutcomes: [
      "Make day-to-day field decisions with confidence",
      "Mentor and develop crew members",
      "Run effective look-ahead planning routines",
      "Communicate clearly with project teams",
    ],
    prerequisites: [],
  },
  {
    id: "jobsite-safety-daily-planning",
    title: "Jobsite Safety & Daily Planning",
    slug: "jobsite-safety-daily-planning",
    description: "Pre-task planning, hazard awareness, and reporting culture that keeps crews safe on every jobsite, every day.",
    shortDescription: "Pre-task planning and hazard awareness that keeps crews safe every day.",
    categoryId: "safety",
    instructorName: "Adams Electric",
    difficultyLevel: "beginner",
    estimatedDurationMinutes: 300,
    minSubscriptionTierId: "adams-builder",
    isFeatured: false,
    isPublished: true,
    tags: ["safety", "pre-task planning", "hazard awareness", "jobsite"],
    learningOutcomes: [
      "Run effective pre-task planning huddles",
      "Recognize and communicate jobsite hazards",
      "Build a strong reporting culture",
      "Lead safety as a crew member and supervisor",
    ],
    prerequisites: [],
  },
  {
    id: "bim-coordination-basics",
    title: "BIM Coordination Basics",
    slug: "bim-coordination-basics",
    description: "How 3D modeling and clash detection resolve conflicts before installation, reducing rework and improving field productivity.",
    shortDescription: "Resolve conflicts in the model before installation and reduce rework.",
    categoryId: "bim-prefab",
    instructorName: "Adams Electric",
    difficultyLevel: "beginner",
    estimatedDurationMinutes: 360,
    minSubscriptionTierId: "adams-builder",
    isFeatured: false,
    isPublished: true,
    tags: ["BIM", "coordination", "clash detection", "prefabrication"],
    learningOutcomes: [
      "Understand the BIM coordination workflow",
      "Participate effectively in clash resolution",
      "Produce prefabrication-ready designs",
      "Deliver accurate as-built documentation",
    ],
    prerequisites: [],
  },
];

const workshops = [
  {
    id: "precon-kickoff-best-practices",
    title: "Preconstruction Kickoff Best Practices",
    slug: "precon-kickoff-best-practices",
    description: "Learn how to set up budgets, schedules, and long-lead procurement tracking before mobilization.",
    shortDescription: "Set up budgets, schedules, and procurement tracking before mobilization.",
    workshopType: "live",
    categoryId: "preconstruction",
    instructorName: "Adams Electric",
    scheduledStart: Timestamp.fromDate(new Date("2025-01-15T14:00:00-05:00")),
    scheduledEnd: Timestamp.fromDate(new Date("2025-01-15T16:00:00-05:00")),
    timezone: "America/New_York",
    maxParticipants: 25,
    minSubscriptionTierId: "adams-builder",
    isFeatured: true,
    isPublished: true,
  },
  {
    id: "project-closeout-deep-dive",
    title: "Project Closeout Deep Dive",
    slug: "project-closeout-deep-dive",
    description: "A comprehensive workshop on planning documentation from kickoff so turnover is clean and fast.",
    shortDescription: "Plan documentation from kickoff for a clean, fast turnover.",
    workshopType: "live",
    categoryId: "project-delivery",
    instructorName: "Adams Electric",
    scheduledStart: Timestamp.fromDate(new Date("2025-01-22T13:00:00-05:00")),
    scheduledEnd: Timestamp.fromDate(new Date("2025-01-22T15:30:00-05:00")),
    timezone: "America/New_York",
    maxParticipants: 20,
    minSubscriptionTierId: "adams-builder",
    isFeatured: false,
    isPublished: true,
  },
  {
    id: "field-leadership-roundtable",
    title: "Field Leadership Roundtable",
    slug: "field-leadership-roundtable",
    description: "Discussion-based session on mentoring crew leaders and building field decision-making capacity.",
    shortDescription: "Mentoring crew leaders and building field decision-making capacity.",
    workshopType: "live",
    categoryId: "workforce-leadership",
    instructorName: "Adams Electric",
    scheduledStart: Timestamp.fromDate(new Date("2025-01-29T15:00:00-05:00")),
    scheduledEnd: Timestamp.fromDate(new Date("2025-01-29T17:00:00-05:00")),
    timezone: "America/New_York",
    maxParticipants: 30,
    minSubscriptionTierId: "adams-builder",
    isFeatured: false,
    isPublished: true,
  },
];

const blogCategories = [
  { id: "leadership", name: "Leadership", slug: "leadership", sortOrder: 1 },
  { id: "preconstruction", name: "Preconstruction", slug: "preconstruction", sortOrder: 2 },
  { id: "project-delivery", name: "Project Delivery", slug: "project-delivery", sortOrder: 3 },
  { id: "safety", name: "Safety", slug: "safety", sortOrder: 4 },
  { id: "adams-stories", name: "Adams Stories", slug: "adams-stories", sortOrder: 5 },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedCollection(collectionName: string, data: Record<string, unknown>[]) {
  console.log(`Seeding ${collectionName}...`);
  const batch = db.batch();
  
  for (const item of data) {
    const id = String(item.id);
    const { id: _ignoredId, ...docData } = item;
    const ref = db.collection(collectionName).doc(id);
    batch.set(ref, {
      ...docData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
  
  await batch.commit();
  console.log(`✓ Seeded ${data.length} documents to ${collectionName}`);
}

async function main() {
  console.log("🌱 Starting Firebase Academy seed...\n");
  
  try {
    await seedCollection("lms_subscription_tiers", subscriptionTiers);
    await seedCollection("lms_categories", courseCategories);
    await seedCollection("lms_courses", courses);
    await seedCollection("lms_workshops", workshops);
    
    console.log("\n✅ Firebase Academy seed completed successfully!");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
