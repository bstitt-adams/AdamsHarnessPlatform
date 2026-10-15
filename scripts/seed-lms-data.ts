/**
 * Seed LMS Data Script
 * 
 * Populates the LMS with initial categories, courses, workshops, and badges
 * based on the Adams Electric Academy electrical training content.
 * 
 * Run with: npx ts-node scripts/seed-lms-data.ts
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  Timestamp,
  getDocs,
} from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "adams-platform",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection names
const COLLECTIONS = {
  CATEGORIES: "lms_categories",
  COURSES: "lms_courses",
  COURSE_MODULES: "lms_course_modules",
  LESSONS: "lms_lessons",
  WORKSHOPS: "lms_workshops",
  BADGES: "lms_badges",
  SUBSCRIPTION_TIERS: "lms_subscription_tiers",
};

// Helper to generate slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Categories based on Adams Academy training tracks
const categories = [
  {
    name: "Safety",
    slug: "safety",
    description: "Jobsite safety, pre-task planning, and hazard awareness",
    icon: "🦺",
    color: "#0072BC",
    sortOrder: 1,
  },
  {
    name: "PreConstruction",
    slug: "preconstruction",
    description: "Estimating, budgeting, and constructability planning",
    icon: "📐",
    color: "#0284c7",
    sortOrder: 2,
  },
  {
    name: "BIM & Prefabrication",
    slug: "bim-prefab",
    description: "3D coordination, clash detection, and offsite fabrication",
    icon: "⚙️",
    color: "#0369a1",
    sortOrder: 3,
  },
  {
    name: "Workforce & Leadership",
    slug: "workforce-leadership",
    description: "Field leadership and crew development",
    icon: "👥",
    color: "#475569",
    sortOrder: 4,
  },
  {
    name: "Project Delivery",
    slug: "project-delivery",
    description: "Construction execution, closeout, and post-construction support",
    icon: "🏆",
    color: "#1e40af",
    sortOrder: 5,
  },
];

// Courses based on existing academy content
const courses = [
  {
    title: "Preconstruction Planning Fundamentals",
    shortDescription: "Estimating, budgeting, and constructability practices that set projects up before mobilization.",
    description: `This course takes you through the Adams Electric approach to preconstruction - the planning discipline that determines whether a project succeeds before crews ever mobilize.

You'll learn how to:
- Read scope and build accurate budgets
- Run constructability reviews that surface issues early
- Identify and track long-lead procurement items
- Create realistic schedules you can commit to

This course includes practical exercises and checklists you can apply immediately on your projects.`,
    categorySlug: "preconstruction",
    difficultyLevel: "intermediate",
    estimatedDurationMinutes: 480,
    isFeatured: true,
    tags: ["preconstruction", "estimating", "planning", "constructability"],
    learningOutcomes: [
      "Build accurate budgets from clear scope",
      "Run effective constructability reviews",
      "Identify and track long-lead procurement items",
      "Create realistic project schedules",
      "Document assumptions that prevent disputes",
    ],
    prerequisites: ["Working knowledge of electrical construction"],
    modules: [
      {
        title: "Preconstruction Foundations",
        description: "Why early planning determines project outcomes",
        lessons: [
          { title: "Welcome & Course Overview", contentType: "video", duration: 10 },
          { title: "The Adams Electric Approach", contentType: "video", duration: 15 },
          { title: "Preconstruction Process Overview", contentType: "video", duration: 20 },
          { title: "Self-Assessment: Where Are You Now?", contentType: "quiz", duration: 15 },
        ],
      },
      {
        title: "Estimating & Budgeting",
        description: "Building budgets that reflect real scope",
        lessons: [
          { title: "Reading the Scope", contentType: "video", duration: 20 },
          { title: "Labor Unit Fundamentals", contentType: "video", duration: 25 },
          { title: "Material Pricing & Quotes", contentType: "video", duration: 20 },
          { title: "General Conditions & Indirects", contentType: "video", duration: 25 },
          { title: "Basis of Estimate Exercise", contentType: "assignment", duration: 30 },
        ],
      },
      {
        title: "Constructability Review",
        description: "Finding installation problems before the field does",
        lessons: [
          { title: "What is Constructability?", contentType: "video", duration: 15 },
          { title: "Physical Fit & Code Clearances", contentType: "video", duration: 25 },
          { title: "Access & Maintainability", contentType: "video", duration: 20 },
          { title: "Constructability Review Exercise", contentType: "assignment", duration: 45 },
        ],
      },
      {
        title: "Procurement Planning",
        description: "Tracking long-lead items from day one",
        lessons: [
          { title: "Identifying Long-Lead Items", contentType: "video", duration: 20 },
          { title: "The Procurement Log", contentType: "video", duration: 20 },
          { title: "Submittals & Release Timing", contentType: "video", duration: 20 },
          { title: "Build Your Procurement List", contentType: "assignment", duration: 30 },
        ],
      },
      {
        title: "Schedule & Mobilization",
        description: "Committing to a schedule you can hold",
        lessons: [
          { title: "Building a Realistic Schedule", contentType: "video", duration: 20 },
          { title: "Sequencing & Crew Loading", contentType: "video", duration: 25 },
          { title: "Mobilization Checklist", contentType: "video", duration: 20 },
        ],
      },
    ],
  },
  {
    title: "Project Closeout Essentials",
    shortDescription: "Plan documentation from kickoff for a clean, complete project closeout.",
    description: `Closeout shouldn't be a scramble. This course teaches you how to plan documentation from kickoff, manage punch lists continuously, and hand over a building the owner can operate with confidence.

Learn the as-built, O&M, and commissioning practices that make turnover smooth.`,
    categorySlug: "project-delivery",
    difficultyLevel: "advanced",
    estimatedDurationMinutes: 240,
    isFeatured: false,
    tags: ["closeout", "documentation", "commissioning", "turnover"],
    learningOutcomes: [
      "Plan closeout documentation requirements at kickoff",
      "Manage punch lists continuously, not at the end",
      "Assemble complete as-builts and O&M manuals",
      "Support commissioning through turnover",
      "Deliver warranty and service handoffs cleanly",
    ],
    prerequisites: ["Field or project management experience"],
    modules: [
      {
        title: "Closeout Planning",
        description: "Starting closeout at kickoff",
        lessons: [
          { title: "Why Closeout Starts at Kickoff", contentType: "video", duration: 15 },
          { title: "Documentation Requirements Matrix", contentType: "video", duration: 20 },
          { title: "Assigning Closeout Owners", contentType: "video", duration: 15 },
        ],
      },
      {
        title: "Documentation During Construction",
        description: "Capturing records as the work happens",
        lessons: [
          { title: "As-Built Markup Practices", contentType: "video", duration: 25 },
          { title: "Concealed & Underground Documentation", contentType: "video", duration: 20 },
          { title: "Photo Documentation Standards", contentType: "video", duration: 20 },
        ],
      },
      {
        title: "Punch & Turnover",
        description: "Finishing strong",
        lessons: [
          { title: "Continuous Punch Management", contentType: "video", duration: 30 },
          { title: "Pre-Punch Walks", contentType: "video", duration: 25 },
          { title: "O&M Assembly", contentType: "video", duration: 20 },
          { title: "Commissioning Support", contentType: "video", duration: 25 },
        ],
      },
    ],
  },
  {
    title: "Field Leadership Essentials",
    shortDescription: "Develop the skills that turn foremen into confident field leaders.",
    description: `Great field leaders aren't born - they're developed. This course teaches the communication and decision-making skills that keep crews safe, productive, and on schedule.

From pre-task planning to mentoring to look-ahead routines, you'll learn practical leadership techniques you can apply on your next job.`,
    categorySlug: "workforce-leadership",
    difficultyLevel: "intermediate",
    estimatedDurationMinutes: 360,
    isFeatured: true,
    tags: ["leadership", "field leadership", "mentorship", "communication"],
    learningOutcomes: [
      "Make day-to-day field decisions with confidence",
      "Mentor and develop crew members",
      "Run effective look-ahead planning routines",
      "Communicate clearly with project teams",
      "Build crew capability deliberately",
    ],
    prerequisites: ["Currently leading or preparing to lead field crews"],
    modules: [
      {
        title: "Leadership Foundations",
        description: "From doing the work to leading the people who do it",
        lessons: [
          { title: "From Foreman to Field Leader", contentType: "video", duration: 20 },
          { title: "Your Leadership Style", contentType: "video", duration: 25 },
          { title: "Leadership Assessment", contentType: "quiz", duration: 20 },
        ],
      },
      {
        title: "Building Your Crew",
        description: "Developing the people who do the work",
        lessons: [
          { title: "Setting Clear Expectations", contentType: "video", duration: 20 },
          { title: "Coaching in the Moment", contentType: "video", duration: 30 },
          { title: "Mentoring Newer Workers", contentType: "video", duration: 25 },
          { title: "Delegation That Builds Capability", contentType: "video", duration: 25 },
        ],
      },
      {
        title: "Planning for the Field",
        description: "Look-ahead routines that remove blockers",
        lessons: [
          { title: "What is Look-Ahead Planning?", contentType: "video", duration: 15 },
          { title: "Making Work Ready", contentType: "video", duration: 25 },
          { title: "Daily Crew Communication", contentType: "video", duration: 20 },
          { title: "Look-Ahead Exercise", contentType: "assignment", duration: 30 },
        ],
      },
    ],
  },
  {
    title: "Jobsite Safety & Daily Planning",
    shortDescription: "Pre-task planning and hazard awareness that keeps crews safe every day.",
    description: `Safety is the foundation of every Adams Electric jobsite. This course teaches the daily practices - pre-task planning, hazard recognition, and open reporting - that protect crews and keep projects running.

Learn the habits that turn safety from a slogan into how work actually gets done.`,
    categorySlug: "safety",
    difficultyLevel: "beginner",
    estimatedDurationMinutes: 300,
    isFeatured: false,
    tags: ["safety", "pre-task planning", "hazard awareness", "jobsite"],
    learningOutcomes: [
      "Run effective pre-task planning huddles",
      "Recognize and communicate jobsite hazards",
      "Build a strong near-miss reporting culture",
      "Apply stop-work authority confidently",
      "Lead safety as a crew member and supervisor",
    ],
    prerequisites: [],
    modules: [
      {
        title: "The Safety Mindset",
        description: "Why safety is the foundation of performance",
        lessons: [
          { title: "Why Safety Matters", contentType: "video", duration: 15 },
          { title: "Everyone Goes Home", contentType: "video", duration: 20 },
          { title: "Hazard Recognition Basics", contentType: "video", duration: 25 },
        ],
      },
      {
        title: "Daily Planning Practices",
        description: "Pre-task planning done right",
        lessons: [
          { title: "Pre-Task Plan Fundamentals", contentType: "video", duration: 20 },
          { title: "Running the Daily Huddle", contentType: "video", duration: 30 },
          { title: "When to Stop Work", contentType: "video", duration: 20 },
          { title: "Write a Pre-Task Plan", contentType: "assignment", duration: 45 },
        ],
      },
      {
        title: "Reporting & Learning",
        description: "Building a culture that surfaces problems early",
        lessons: [
          { title: "Near-Miss Reporting", contentType: "video", duration: 25 },
          { title: "Incident Response Basics", contentType: "video", duration: 20 },
          { title: "Learning from Events", contentType: "video", duration: 20 },
        ],
      },
    ],
  },
  {
    title: "BIM Coordination Basics",
    shortDescription: "Resolve conflicts in the model before installation and reduce rework.",
    description: `BIM coordination finds clashes between trades before anyone installs anything. This course teaches the coordination workflow - modeling, clash detection, sign-off, and field release - plus how coordinated designs feed prefabrication.

Learn how to participate effectively in coordination and produce installation-ready results.`,
    categorySlug: "bim-prefab",
    difficultyLevel: "beginner",
    estimatedDurationMinutes: 360,
    isFeatured: false,
    tags: ["BIM", "coordination", "clash detection", "prefabrication"],
    learningOutcomes: [
      "Understand the BIM coordination workflow",
      "Participate effectively in clash resolution",
      "Produce prefabrication-ready designs",
      "Deliver accurate as-built documentation",
      "Connect coordination to field productivity",
    ],
    prerequisites: ["Basic familiarity with construction drawings"],
    modules: [
      {
        title: "Coordination Fundamentals",
        description: "Why coordination drives field productivity",
        lessons: [
          { title: "What is BIM Coordination?", contentType: "video", duration: 25 },
          { title: "Levels of Development", contentType: "video", duration: 20 },
          { title: "Coordination Roles & Sign-Off", contentType: "quiz", duration: 15 },
        ],
      },
      {
        title: "Clash Detection",
        description: "Finding and resolving conflicts",
        lessons: [
          { title: "Running Clash Detection", contentType: "video", duration: 25 },
          { title: "Prioritizing & Assigning Clashes", contentType: "video", duration: 30 },
          { title: "Coordination Meeting Practices", contentType: "video", duration: 20 },
        ],
      },
      {
        title: "From Model to Field",
        description: "Delivering coordinated work to crews",
        lessons: [
          { title: "Field Release Drawings", contentType: "video", duration: 25 },
          { title: "Layout Points & Verification", contentType: "video", duration: 20 },
          { title: "Prefabrication Interfaces", contentType: "video", duration: 20 },
        ],
      },
    ],
  },
  {
    title: "Prefabrication Workflows",
    shortDescription: "Design-for-fabrication practices, kitting, and logistics that compress field schedules.",
    description: `Prefabrication moves work from the jobsite into a controlled shop environment. This course teaches how to identify prefab candidates, design assemblies for repeatable fabrication, and manage kitting and delivery logistics.

Learn the workflows that make offsite fabrication pay for itself.`,
    categorySlug: "bim-prefab",
    difficultyLevel: "intermediate",
    estimatedDurationMinutes: 180,
    isFeatured: false,
    tags: ["prefabrication", "kitting", "logistics", "planning"],
    learningOutcomes: [
      "Identify strong prefabrication candidates",
      "Design assemblies for repeatable fabrication",
      "Plan kitting and delivery logistics",
      "Measure prefab impact on schedule and safety",
      "Integrate prefab with BIM coordination",
    ],
    prerequisites: [],
    modules: [
      {
        title: "Prefab Fundamentals",
        description: "Why offsite fabrication works",
        lessons: [
          { title: "The Case for Prefabrication", contentType: "video", duration: 20 },
          { title: "Identifying Prefab Candidates", contentType: "video", duration: 30 },
          { title: "Prefab Scoping Exercise", contentType: "assignment", duration: 30 },
        ],
      },
      {
        title: "Design for Fabrication",
        description: "Standardizing assemblies for the shop",
        lessons: [
          { title: "Standardization Principles", contentType: "video", duration: 20 },
          { title: "Connection Points & Tolerances", contentType: "video", duration: 25 },
          { title: "Transport & Lifting Design", contentType: "video", duration: 25 },
        ],
      },
      {
        title: "Kitting & Logistics",
        description: "Getting assemblies to the field ready to install",
        lessons: [
          { title: "Kit Design & Labeling", contentType: "video", duration: 20 },
          { title: "Delivery Sequencing", contentType: "video", duration: 20 },
          { title: "Tracking & Feedback Loops", contentType: "video", duration: 20 },
        ],
      },
    ],
  },
];

// Workshops
const workshops = [
  {
    title: "Preconstruction Kickoff Best Practices",
    shortDescription: "Set up budgets, schedules, and procurement tracking before mobilization.",
    description: "A hands-on workshop where you'll build a preconstruction kickoff checklist with guidance from Adams Electric.",
    workshopType: "live",
    categorySlug: "preconstruction",
    instructorName: "Adams Electric",
    scheduledStart: new Date("2025-01-15T14:00:00-05:00"),
    scheduledEnd: new Date("2025-01-15T16:00:00-05:00"),
    maxParticipants: 25,
    isFeatured: true,
  },
  {
    title: "Project Closeout Deep Dive",
    shortDescription: "A comprehensive workshop on planning documentation from kickoff for clean turnover.",
    description: "Learn the practices that make closeout documentation complete and turnover fast.",
    workshopType: "live",
    categorySlug: "project-delivery",
    instructorName: "Adams Electric",
    scheduledStart: new Date("2025-01-22T13:00:00-05:00"),
    scheduledEnd: new Date("2025-01-22T15:30:00-05:00"),
    maxParticipants: 20,
    isFeatured: false,
  },
  {
    title: "Field Leadership Roundtable",
    shortDescription: "Mentoring crew leaders and building field decision-making capacity.",
    description: "Discussion-based session on developing field leaders who keep projects moving safely and on schedule.",
    workshopType: "live",
    categorySlug: "workforce-leadership",
    instructorName: "Adams Electric",
    scheduledStart: new Date("2025-01-29T15:00:00-05:00"),
    scheduledEnd: new Date("2025-01-29T17:00:00-05:00"),
    maxParticipants: 30,
    isFeatured: false,
  },
  {
    title: "BIM Coordination Workflows",
    shortDescription: "Hands-on clash detection and coordination sign-off practices.",
    description: "Practice the coordination workflow that resolves conflicts before installation.",
    workshopType: "live",
    categorySlug: "bim-prefab",
    instructorName: "Adams Electric",
    scheduledStart: new Date("2025-02-05T14:00:00-05:00"),
    scheduledEnd: new Date("2025-02-05T16:00:00-05:00"),
    maxParticipants: 25,
    isFeatured: false,
  },
  {
    title: "Pre-Task Safety Planning",
    shortDescription: "Build daily planning routines that keep hazard awareness front and center.",
    description: "Learn to write and run pre-task plans that protect crews every day.",
    workshopType: "live",
    categorySlug: "safety",
    instructorName: "Adams Electric",
    scheduledStart: new Date("2025-02-12T13:00:00-05:00"),
    scheduledEnd: new Date("2025-02-12T15:00:00-05:00"),
    maxParticipants: 25,
    isFeatured: false,
  },
];

// Badges for gamification
const badges = [
  {
    name: "First Steps",
    description: "Complete your first lesson",
    iconEmoji: "🎯",
    category: "achievement",
    requirement: "Complete 1 lesson",
    pointsAwarded: 10,
  },
  {
    name: "Course Completer",
    description: "Complete your first course",
    iconEmoji: "🏆",
    category: "achievement",
    requirement: "Complete 1 course",
    pointsAwarded: 100,
  },
  {
    name: "Bookworm",
    description: "Complete 5 courses",
    iconEmoji: "📚",
    category: "milestone",
    requirement: "Complete 5 courses",
    pointsAwarded: 500,
  },
  {
    name: "7-Day Streak",
    description: "Learn for 7 days in a row",
    iconEmoji: "🔥",
    category: "streak",
    requirement: "7 consecutive days of learning",
    pointsAwarded: 50,
  },
  {
    name: "30-Day Streak",
    description: "Learn for 30 days in a row",
    iconEmoji: "⚡",
    category: "streak",
    requirement: "30 consecutive days of learning",
    pointsAwarded: 200,
  },
  {
    name: "Workshop Warrior",
    description: "Attend 5 live workshops",
    iconEmoji: "🎓",
    category: "milestone",
    requirement: "Attend 5 workshops",
    pointsAwarded: 250,
  },
  {
    name: "Certificate Collector",
    description: "Earn 3 certificates",
    iconEmoji: "🏅",
    category: "milestone",
    requirement: "Earn 3 certificates",
    pointsAwarded: 300,
  },
  {
    name: "Adams Academy Master",
    description: "Complete all Adams Academy training courses",
    iconEmoji: "👑",
    category: "special",
    requirement: "Complete all 5 category courses",
    pointsAwarded: 1000,
  },
  {
    name: "Early Adopter",
    description: "One of the first 100 academy members",
    iconEmoji: "🌟",
    category: "special",
    requirement: "Join within first 100 members",
    pointsAwarded: 100,
  },
  {
    name: "Top Learner",
    description: "Reach the monthly leaderboard top 10",
    iconEmoji: "🥇",
    category: "achievement",
    requirement: "Top 10 monthly points",
    pointsAwarded: 150,
  },
];

// Subscription tiers
const subscriptionTiers = [
  {
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
    sortOrder: 1,
  },
  {
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
    sortOrder: 2,
  },
  {
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
    sortOrder: 3,
  },
];

async function seedData() {
  console.log("🌱 Starting LMS data seeding...\n");

  try {
    // Check if data already exists
    const existingCategories = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
    if (!existingCategories.empty) {
      console.log("⚠️  Data already exists. Skipping seed to prevent duplicates.");
      console.log("   Delete existing data first if you want to re-seed.");
      process.exit(0);
    }

    // Seed categories
    console.log("📁 Creating categories...");
    const categoryMap: Record<string, string> = {};
    for (const cat of categories) {
      const docRef = doc(collection(db, COLLECTIONS.CATEGORIES));
      await setDoc(docRef, {
        id: docRef.id,
        ...cat,
        courseCount: 0,
        workshopCount: 0,
        createdAt: Timestamp.now(),
      });
      categoryMap[cat.slug] = docRef.id;
      console.log(`   ✓ ${cat.name}`);
    }

    // Seed courses with modules and lessons
    console.log("\n📚 Creating courses...");
    for (const course of courses) {
      const categoryId = categoryMap[course.categorySlug] || null;
      const courseRef = doc(collection(db, COLLECTIONS.COURSES));
      
      await setDoc(courseRef, {
        id: courseRef.id,
        title: course.title,
        slug: generateSlug(course.title),
        shortDescription: course.shortDescription,
        description: course.description,
        categoryId,
        instructorName: "Adams Electric",
        instructorBio: "Third-generation, family-owned electrical contractor serving the Southeast since 1928.",
        instructorImageUrl: null,
        difficultyLevel: course.difficultyLevel,
        estimatedDurationMinutes: course.estimatedDurationMinutes,
        minSubscriptionTierId: null,
        isFeatured: course.isFeatured,
        isPublished: true,
        publishedAt: Timestamp.now(),
        tags: course.tags,
        learningOutcomes: course.learningOutcomes,
        prerequisites: course.prerequisites,
        enrollmentCount: Math.floor(Math.random() * 150) + 50, // Random enrollment count
        thumbnailUrl: null,
        thumbnailImageId: null,
        previewVideoUrl: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update category course count
      if (categoryId) {
        const catRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
        const catSnap = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
        // Note: In production, use increment()
      }

      // Create modules and lessons
      let lessonSortOrder = 0;
      for (let moduleIndex = 0; moduleIndex < course.modules.length; moduleIndex++) {
        const module = course.modules[moduleIndex];
        const moduleRef = doc(collection(db, COLLECTIONS.COURSE_MODULES));
        
        await setDoc(moduleRef, {
          id: moduleRef.id,
          courseId: courseRef.id,
          title: module.title,
          description: module.description,
          sortOrder: moduleIndex,
          createdAt: Timestamp.now(),
        });

        // Create lessons
        for (let lessonIndex = 0; lessonIndex < module.lessons.length; lessonIndex++) {
          const lesson = module.lessons[lessonIndex];
          const lessonRef = doc(collection(db, COLLECTIONS.LESSONS));
          
          await setDoc(lessonRef, {
            id: lessonRef.id,
            moduleId: moduleRef.id,
            courseId: courseRef.id,
            title: lesson.title,
            slug: generateSlug(lesson.title),
            description: null,
            contentType: lesson.contentType,
            videoUrl: null,
            videoDurationSeconds: lesson.duration * 60,
            textContent: null,
            downloadUrl: null,
            isPreview: lessonIndex === 0 && moduleIndex === 0, // First lesson is preview
            sortOrder: lessonSortOrder++,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }
      }

      console.log(`   ✓ ${course.title} (${course.modules.length} modules)`);
    }

    // Seed workshops
    console.log("\n🎥 Creating workshops...");
    for (const workshop of workshops) {
      const categoryId = categoryMap[workshop.categorySlug] || null;
      const workshopRef = doc(collection(db, COLLECTIONS.WORKSHOPS));
      
      await setDoc(workshopRef, {
        id: workshopRef.id,
        title: workshop.title,
        slug: generateSlug(workshop.title),
        shortDescription: workshop.shortDescription,
        description: workshop.description,
        workshopType: workshop.workshopType,
        categoryId,
        instructorName: workshop.instructorName,
        scheduledStart: Timestamp.fromDate(workshop.scheduledStart),
        scheduledEnd: Timestamp.fromDate(workshop.scheduledEnd),
        timezone: "America/New_York",
        maxParticipants: workshop.maxParticipants,
        minSubscriptionTierId: null,
        meetingUrl: null,
        recordingUrl: null,
        materialsUrl: null,
        isFeatured: workshop.isFeatured,
        isPublished: true,
        registrationDeadline: null,
        registrationCount: Math.floor(Math.random() * 15) + 5,
        thumbnailUrl: null,
        thumbnailImageId: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`   ✓ ${workshop.title}`);
    }

    // Seed badges
    console.log("\n🏅 Creating badges...");
    for (const badge of badges) {
      const badgeRef = doc(collection(db, COLLECTIONS.BADGES));
      
      await setDoc(badgeRef, {
        id: badgeRef.id,
        name: badge.name,
        description: badge.description,
        iconUrl: null,
        iconEmoji: badge.iconEmoji,
        category: badge.category,
        requirement: badge.requirement,
        pointsAwarded: badge.pointsAwarded,
        isActive: true,
        createdAt: Timestamp.now(),
      });

      console.log(`   ✓ ${badge.iconEmoji} ${badge.name}`);
    }

    // Seed subscription tiers
    console.log("\n💳 Creating subscription tiers...");
    for (const tier of subscriptionTiers) {
      const tierRef = doc(collection(db, COLLECTIONS.SUBSCRIPTION_TIERS));
      
      await setDoc(tierRef, {
        id: tierRef.id,
        name: tier.name,
        slug: tier.slug,
        description: tier.description,
        priceMonthly: tier.priceMonthly,
        priceAnnual: tier.priceAnnual,
        features: tier.features,
        isActive: true,
        sortOrder: tier.sortOrder,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`   ✓ ${tier.name} ($${tier.priceMonthly}/mo)`);
    }

    console.log("\n✅ LMS data seeding complete!");
    console.log("\nSummary:");
    console.log(`   - ${categories.length} categories`);
    console.log(`   - ${courses.length} courses`);
    console.log(`   - ${workshops.length} workshops`);
    console.log(`   - ${badges.length} badges`);
    console.log(`   - ${subscriptionTiers.length} subscription tiers`);

  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }

  process.exit(0);
}

seedData();
