/**
 * Mock Data Index - Export all mock data for Affiliate Networking
 */

// Affiliates and Biographies
export { mockAffiliateUsers, mockBiographies, daysAgo, daysFromNow, now } from "./affiliates";

// GAINS Profiles
export { mockGainsProfiles } from "./gains-profiles";

// Contact Spheres
export { mockContactSpheres } from "./contact-spheres";

// Meetings, Referrals, and Stats
export { mockOneToOneMeetings, mockReferrals, mockAffiliateStats } from "./meetings-referrals";

// Re-export types for convenience
export type {
  AffiliateBiographyDoc,
  GainsProfileDoc,
  ContactSphereDoc,
  PreviousCustomersDoc,
  OneToOneMeetingDoc,
  ReferralDoc,
  AffiliateStatsDoc,
  AiMatchSuggestionDoc,
} from "../schema";
