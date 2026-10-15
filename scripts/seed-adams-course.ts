/**
 * Seed Script: Adams Academy Framework Course
 * Run with: npx tsx scripts/seed-adams-course.ts
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, Timestamp } from "firebase/firestore";

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

const LMS_COLLECTIONS = {
  COURSES: "lms_courses",
  COURSE_MODULES: "lms_course_modules",
  LESSONS: "lms_lessons",
};

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function seedAdamsCourse() {
  console.log("🌱 Starting Adams Academy Course Seed...\n");

  // Create Course
  const courseRef = doc(collection(db, LMS_COLLECTIONS.COURSES));
  const courseData = {
    id: courseRef.id,
    title: "Adams Academy: Electrical Project Delivery Fundamentals",
    slug: "adams-academy-fundamentals",
    description: "Master the Adams Electric approach to electrical project delivery. This comprehensive course covers safety leadership, preconstruction planning, BIM coordination, prefabrication, field leadership, and project closeout—building the skills that deliver projects on time and on budget.",
    shortDescription: "Master the Adams Electric approach to safe, coordinated electrical project delivery.",
    thumbnailUrl: null,
    thumbnailImageId: null,
    previewVideoUrl: null,
    categoryId: null,
    instructorName: "Adams Electric",
    instructorBio: "Third-generation, family-owned electrical contractor serving the Southeast since 1928.",
    instructorImageUrl: null,
    difficultyLevel: "intermediate",
    estimatedDurationMinutes: 480,
    minSubscriptionTierId: null,
    isFeatured: true,
    isPublished: true,
    publishedAt: Timestamp.now(),
    tags: ["electrical construction", "safety", "preconstruction", "Adams Academy"],
    learningOutcomes: [
      "Apply daily pre-task safety planning on every jobsite",
      "Contribute to preconstruction estimating, budgeting, and constructability review",
      "Coordinate work using BIM and clash detection workflows",
      "Plan prefabrication opportunities that compress field schedules",
      "Deliver clean project closeout with complete documentation"
    ],
    prerequisites: ["Working knowledge of electrical construction", "Commitment to applying new practices in the field"],
    enrollmentCount: 0,
    priceInCents: 49700,
    compareAtPriceInCents: 99700,
    isFree: false,
    stripePriceId: null,
    stripeProductId: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(courseRef, courseData);
  console.log(`✅ Created course: ${courseData.title}`);

  // Define modules and lessons
  const modules = [
    {
      title: "Introduction to Adams Academy",
      description: "Understand the foundation of Adams Electric project delivery",
      lessons: [
        { title: "Welcome to Adams Academy", type: "video", preview: true },
        { title: "Build Trust Through Performance", type: "text", preview: true },
        { title: "Assessing Your Current Practices", type: "assignment", preview: false },
        { title: "Module 1 Quiz", type: "quiz", preview: false },
      ]
    },
    {
      title: "Safety Leadership",
      description: "Daily planning and hazard awareness that protects every crew member",
      lessons: [
        { title: "Pre-Task Planning Fundamentals", type: "text", preview: false },
        { title: "Hazard Recognition & Reporting", type: "video", preview: false },
        { title: "Safety Communication on the Jobsite", type: "text", preview: false },
        { title: "Leading Safety as a Foreman", type: "video", preview: false },
        { title: "Module 2 Quiz", type: "quiz", preview: false },
      ]
    },
    {
      title: "Preconstruction Planning",
      description: "Estimating, budgeting, and constructability review before mobilization",
      lessons: [
        { title: "Reading Scope & Building Accurate Budgets", type: "text", preview: false },
        { title: "Constructability Reviews", type: "video", preview: false },
        { title: "Long-Lead Procurement Planning", type: "text", preview: false },
        { title: "Module 3 Quiz", type: "quiz", preview: false },
      ]
    },
    {
      title: "BIM & Prefabrication",
      description: "Coordinate digitally and build offsite to compress field schedules",
      lessons: [
        { title: "Clash Detection & Coordination Workflows", type: "text", preview: false },
        { title: "Designing for Prefabrication", type: "video", preview: false },
        { title: "Kitting & Jobsite Logistics", type: "text", preview: false },
        { title: "Module 4 Quiz", type: "quiz", preview: false },
      ]
    },
    {
      title: "Field Leadership & Workforce",
      description: "Develop crew leaders who keep projects moving safely and on schedule",
      lessons: [
        { title: "From Foreman to Field Leader", type: "text", preview: false },
        { title: "Mentoring & Developing Your Crew", type: "video", preview: false },
        { title: "Look-Ahead Planning for Field Teams", type: "text", preview: false },
        { title: "Module 5 Quiz", type: "quiz", preview: false },
      ]
    },
    {
      title: "Project Closeout & Turnover",
      description: "Plan documentation from kickoff for a clean, fast closeout",
      lessons: [
        { title: "As-Builts & O&M Documentation", type: "text", preview: false },
        { title: "Punch List Management", type: "video", preview: false },
        { title: "Commissioning Support", type: "text", preview: false },
        { title: "Module 6 Quiz", type: "quiz", preview: false },
      ]
    },
    {
      title: "Final Assessment & Certification",
      description: "Demonstrate your mastery of Adams project delivery fundamentals",
      lessons: [
        { title: "Course Review & Key Takeaways", type: "text", preview: false },
        { title: "Final Exam: Adams Academy Certification", type: "quiz", preview: false },
        { title: "Your Project Delivery Action Plan", type: "assignment", preview: false },
      ]
    },
  ];

  // Create modules and lessons
  for (let mi = 0; mi < modules.length; mi++) {
    const mod = modules[mi];
    const moduleRef = doc(collection(db, LMS_COLLECTIONS.COURSE_MODULES));
    
    await setDoc(moduleRef, {
      id: moduleRef.id,
      courseId: courseRef.id,
      title: mod.title,
      description: mod.description,
      sortOrder: mi,
      createdAt: Timestamp.now(),
    });
    
    console.log(`  📁 Created module: ${mod.title}`);

    for (let li = 0; li < mod.lessons.length; li++) {
      const lesson = mod.lessons[li];
      const lessonRef = doc(collection(db, LMS_COLLECTIONS.LESSONS));
      
      await setDoc(lessonRef, {
        id: lessonRef.id,
        moduleId: moduleRef.id,
        courseId: courseRef.id,
        title: lesson.title,
        slug: generateSlug(lesson.title),
        description: null,
        contentType: lesson.type,
        videoUrl: null,
        videoDurationSeconds: lesson.type === "video" ? 900 : null,
        textContent: null,
        downloadUrl: null,
        imageId: null,
        imageUrl: null,
        isPreview: lesson.preview,
        sortOrder: li,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      console.log(`    📄 Created lesson: ${lesson.title}`);
    }
  }

  console.log("\n✅ Adams Academy Course seed completed!");
  console.log(`   Course ID: ${courseRef.id}`);
}

seedAdamsCourse().catch(console.error);
