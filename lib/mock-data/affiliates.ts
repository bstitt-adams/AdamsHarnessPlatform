/**
 * Mock Affiliate Data for Affiliate Networking
 */

import { Timestamp } from "firebase/firestore";
import type {
  AffiliateBiographyDoc,
  GainsProfileDoc,
  ContactSphereDoc,
  PreviousCustomersDoc,
  OneToOneMeetingDoc,
  ReferralDoc,
  AffiliateStatsDoc,
} from "../schema";

// Helper to create timestamps
const now = () => Timestamp.now();
const daysAgo = (days: number) => Timestamp.fromDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
const daysFromNow = (days: number) => Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));

// ============================================================================
// Mock Users (Affiliates)
// ============================================================================

export const mockAffiliateUsers = [
  // Sarah Mitchell - Professional woman, 40s
  { id: "aff-001", email: "sarah.mitchell@precisionmfg.com", name: "Sarah Mitchell", role: "affiliate" as const, avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face" },
  // Marcus Chen - Asian man, 40s-50s
  { id: "aff-002", email: "marcus.chen@qualityfirst.com", name: "Marcus Chen", role: "affiliate" as const, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" },
  // Jennifer Rodriguez - Latina woman, 30s-40s
  { id: "aff-003", email: "jennifer.rodriguez@leanops.com", name: "Jennifer Rodriguez", role: "affiliate" as const, avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face" },
  // David Thompson - Professional man, 50s
  { id: "aff-004", email: "david.thompson@automatesolutions.com", name: "David Thompson", role: "affiliate" as const, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face" },
  // Lisa Patel - South Asian woman, 30s-40s
  { id: "aff-005", email: "lisa.patel@workforcedev.com", name: "Lisa Patel", role: "affiliate" as const, avatar: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&fit=crop&crop=face" },
  // Robert Jackson - Professional man, 40s-50s
  { id: "aff-006", email: "robert.jackson@supplychainpro.com", name: "Robert Jackson", role: "affiliate" as const, avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face" },
  // Amanda Foster - Professional woman, 30s
  { id: "aff-007", email: "amanda.foster@digitaltransform.com", name: "Amanda Foster", role: "affiliate" as const, avatar: "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=200&h=200&fit=crop&crop=face" },
  // Michael Wright - Older professional man, 50s-60s
  { id: "aff-008", email: "michael.wright@isocertify.com", name: "Michael Wright", role: "affiliate" as const, avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face" },
];

// ============================================================================
// Affiliate Biographies (Member Bio Sheets)
// ============================================================================

export const mockBiographies: AffiliateBiographyDoc[] = [
  {
    id: "bio-001", affiliateId: "aff-001", businessName: "Precision Manufacturing Consulting", profession: "Manufacturing Process Engineer",
    location: "Charlotte, NC", yearsInBusiness: 12, previousJobs: ["Senior Engineer at Boeing", "Process Lead at Caterpillar", "Quality Manager at Siemens"],
    spouse: "Tom Mitchell", children: "Two daughters (ages 8 and 12)", pets: "Golden Retriever named Max",
    hobbies: ["Golf", "Wine tasting", "Hiking"], activitiesOfInterest: ["Chamber of Commerce", "Women in Manufacturing", "Rotary Club"],
    cityOfResidence: "Charlotte, NC", yearsInCity: 8, burningDesire: "To help 100 small manufacturers achieve operational excellence by 2026",
    uniqueFact: "Holds 3 patents in automated assembly processes", createdAt: daysAgo(180), updatedAt: daysAgo(5),
  },
  {
    id: "bio-002", affiliateId: "aff-002", businessName: "Quality First Consulting", profession: "ISO Certification Specialist",
    location: "Raleigh, NC", yearsInBusiness: 15, previousJobs: ["Quality Director at John Deere", "Lead Auditor at BSI", "QA Manager at Honeywell"],
    spouse: "Emily Chen", children: "One son (age 15)", pets: "Two cats",
    hobbies: ["Photography", "Cooking", "Chess"], activitiesOfInterest: ["ASQ", "Manufacturing Extension Partnership", "Local Business Alliance"],
    cityOfResidence: "Raleigh, NC", yearsInCity: 10, burningDesire: "To make ISO certification accessible and affordable for every manufacturer",
    uniqueFact: "Has audited facilities in 23 countries", createdAt: daysAgo(200), updatedAt: daysAgo(10),
  },
  {
    id: "bio-003", affiliateId: "aff-003", businessName: "LeanOps Solutions", profession: "Lean Manufacturing Consultant",
    location: "Greensboro, NC", yearsInBusiness: 9, previousJobs: ["Lean Manager at Toyota", "Operations Lead at GE Aviation", "Continuous Improvement at Volvo"],
    spouse: "Carlos Rodriguez", children: "Three children (ages 5, 9, and 14)", pets: "Family dog named Buddy",
    hobbies: ["Running marathons", "Gardening", "Reading"], activitiesOfInterest: ["AME", "Lean Enterprise Institute", "Local running club"],
    cityOfResidence: "Greensboro, NC", yearsInCity: 6, burningDesire: "To eliminate waste and create sustainable manufacturing practices",
    uniqueFact: "Completed 15 marathons including Boston", createdAt: daysAgo(150), updatedAt: daysAgo(3),
  },
  {
    id: "bio-004", affiliateId: "aff-004", businessName: "Automate Solutions Inc", profession: "Industrial Automation Engineer",
    location: "Durham, NC", yearsInBusiness: 18, previousJobs: ["Automation Director at Fanuc", "Robotics Lead at ABB", "Systems Engineer at Rockwell"],
    spouse: "Karen Thompson", children: "Two sons (ages 19 and 22)", pets: "None",
    hobbies: ["Building robots", "3D printing", "Fishing"], activitiesOfInterest: ["IEEE", "Robotics Industry Association", "Local maker space"],
    cityOfResidence: "Durham, NC", yearsInCity: 15, burningDesire: "To help manufacturers embrace Industry 4.0 affordably",
    uniqueFact: "Built his first robot at age 14", createdAt: daysAgo(220), updatedAt: daysAgo(8),
  },
  {
    id: "bio-005", affiliateId: "aff-005", businessName: "Workforce Development Partners", profession: "Manufacturing Training Specialist",
    location: "Winston-Salem, NC", yearsInBusiness: 11, previousJobs: ["Training Director at Caterpillar", "HR Manager at Michelin", "Learning Lead at Cummins"],
    spouse: "Raj Patel", children: "One daughter (age 11)", pets: "Parrot named Echo",
    hobbies: ["Yoga", "Painting", "Traveling"], activitiesOfInterest: ["SHRM", "ATD", "Community college advisory board"],
    cityOfResidence: "Winston-Salem, NC", yearsInCity: 7, burningDesire: "To close the manufacturing skills gap in North Carolina",
    uniqueFact: "Speaks four languages fluently", createdAt: daysAgo(160), updatedAt: daysAgo(12),
  },
  {
    id: "bio-006", affiliateId: "aff-006", businessName: "Supply Chain Pro Consulting", profession: "Supply Chain Optimization Expert",
    location: "Charlotte, NC", yearsInBusiness: 14, previousJobs: ["VP Supply Chain at Ingersoll Rand", "Logistics Director at FedEx", "Procurement Lead at Lowe's"],
    spouse: "Divorced", children: "Twin daughters (age 16)", pets: "Labrador named Duke",
    hobbies: ["Golf", "Bourbon collecting", "College football"], activitiesOfInterest: ["APICS", "Council of Supply Chain Management", "Alumni association"],
    cityOfResidence: "Charlotte, NC", yearsInCity: 20, burningDesire: "To help manufacturers build resilient, domestic supply chains",
    uniqueFact: "Managed supply chains worth over $2B annually", createdAt: daysAgo(190), updatedAt: daysAgo(7),
  },
  {
    id: "bio-007", affiliateId: "aff-007", businessName: "Digital Transform LLC", profession: "Manufacturing Technology Consultant",
    location: "Raleigh, NC", yearsInBusiness: 7, previousJobs: ["Digital Lead at Siemens", "IT Director at Schneider Electric", "Tech Manager at Cisco"],
    spouse: "Brian Foster", children: "No children", pets: "Two rescue dogs",
    hobbies: ["Tech meetups", "Mountain biking", "Podcasting"], activitiesOfInterest: ["Tech Triangle", "Women in Tech", "Startup Grind"],
    cityOfResidence: "Raleigh, NC", yearsInCity: 5, burningDesire: "To democratize digital transformation for small manufacturers",
    uniqueFact: "Hosts a podcast on manufacturing technology with 50K subscribers", createdAt: daysAgo(120), updatedAt: daysAgo(2),
  },
  {
    id: "bio-008", affiliateId: "aff-008", businessName: "ISO Certify Solutions", profession: "Quality Management Systems Consultant",
    location: "Greensboro, NC", yearsInBusiness: 20, previousJobs: ["Quality VP at Parker Hannifin", "Lead Assessor at DNV", "QMS Director at Eaton"],
    spouse: "Patricia Wright", children: "Three children (ages 24, 26, and 28)", pets: "Cat named Whiskers",
    hobbies: ["Woodworking", "History books", "Grandchildren"], activitiesOfInterest: ["ASQ", "AIAG", "Church leadership"],
    cityOfResidence: "Greensboro, NC", yearsInCity: 25, burningDesire: "To mentor the next generation of quality professionals",
    uniqueFact: "Has helped over 200 companies achieve ISO certification", createdAt: daysAgo(250), updatedAt: daysAgo(15),
  },
];

export { daysAgo, daysFromNow, now };
