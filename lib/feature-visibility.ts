/**
 * Feature Visibility System
 *
 * Controls which features are visible to each role.
 * SuperAdmin can configure visibility per role.
 */

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";

export type UserRole = "superadmin" | "admin" | "team" | "affiliate" | "consultant";

// All available features that can be toggled
export const SIDEBAR_FEATURES = {
  // Navigation
  commandCenter: { label: "Command Center", section: "navigation", href: "/portal/command-center" },
  opportunities: { label: "Command Control", section: "navigation", href: "/portal/opportunities" },
  projects: { label: "Projects", section: "navigation", href: "/portal/projects" },
  affiliates: { label: "Affiliates", section: "navigation", href: "/portal/affiliates" },
  customers: { label: "Customers", section: "navigation", href: "/portal/customers" },

  // Work
  apolloSearch: { label: "Apollo Search", section: "work", href: "/portal/apollo-search" },
  supplierSearch: { label: "Supplier Search", section: "work", href: "/portal/supplier-search" },
  documents: { label: "Documents", section: "work", href: "/portal/documents" },
  calendar: { label: "Adams Master Calendar", section: "work", href: "/portal/calendar" },
  availability: { label: "Availability", section: "work", href: "/portal/availability" },
  meetings: { label: "Meetings", section: "work", href: "/portal/meetings" },
  rocks: { label: "Action Items", section: "work", href: "/portal/rocks" },
  networking: { label: "Networking", section: "work", href: "/portal/networking" },
  deals: { label: "Deals", section: "work", href: "/portal/deals" },
  linkedinContent: { label: "LinkedIn Content", section: "work", href: "/portal/linkedin-content" },
  eos2: { label: "EOS2 Dashboard", section: "work", href: "/portal/eos2" },
  docuseal: { label: "DocuSeal", section: "work", href: "/portal/docuseal" },
  aiWorkforce: { label: "AI Workforce", section: "work", href: "/portal/ai-workforce" },
  proposals: { label: "Proposal Creator", section: "work", href: "/portal/proposals" },
  gohighlevel: { label: "GoHighLevel", section: "admin", href: "/portal/gohighlevel" },
  ghlMigration: { label: "GHL Integration", section: "admin", href: "/portal/admin/ghl-migration" },
  bugTracker: { label: "Bug Tracker", section: "work", href: "/portal/bug-tracker" },
  adamsTools: { label: "Adams Tools", section: "work", href: "/portal/adams-tools" },
  systemDocs: { label: "System Documentation", section: "work", href: "/portal/system-docs" },
  solutions: { label: "Solutions", section: "work", href: "/portal/solutions" },
  modules: { label: "Modules", section: "work", href: "/portal/modules" },
  moduleNotifications: { label: "Module Alerts", section: "work", href: "/portal/module-notifications" },
  formBuilder: { label: "AI Form Builder", section: "work", href: "/portal/form-builder" },

  // Intelligence
  askAdamsBrain: { label: "AdamsBrain", section: "work", href: "/portal/adams-brain" },
  academy: { label: "Academy", section: "work", href: "/academy" },
  safetyCalendarAdmin: { label: "Safety Calendar Admin", section: "admin", href: "/calendar-admin" },

  // Admin
  teamMembers: { label: "Team Members", section: "admin", href: "/portal/admin/team-members" },
  strategicPartners: { label: "Strategic Partners", section: "admin", href: "/portal/admin/strategic-partners" },
  heroManagement: { label: "Hero Carousel", section: "admin", href: "/portal/admin/hero" },
  contactPopup: { label: "Contact Popup", section: "admin", href: "/portal/admin/popup" },
  events: { label: "Events", section: "admin", href: "/portal/admin/events" },
  growthIqQuiz: { label: "Growth IQ Quiz", section: "admin", href: "/portal/admin/quiz" },
  imageManager: { label: "Image Manager", section: "admin", href: "/portal/admin/images" },
  bookACall: { label: "Book a Call", section: "admin", href: "/portal/admin/book-a-call" },
  successStories: { label: "Success Stories", section: "admin", href: "/portal/admin/success-stories" },
  academyAdmin: { label: "Academy Admin", section: "admin", href: "/portal/admin/academy" },
  revenueConfig: { label: "Revenue Config", section: "admin", href: "/portal/admin/revenue" },
  alignable: { label: "Alignable", section: "admin", href: "/portal/admin/alignable" },
  pageDesigner: { label: "Page Designer", section: "admin", href: "/portal/admin/page-designer" },
  mailAdmin: { label: "Mail", section: "admin", href: "/portal/admin/mail" },
  navigationManager: { label: "Navigation Manager", section: "admin", href: "/portal/admin/navigation" },
  backups: { label: "Backup & Restore", section: "admin", href: "/portal/admin/backups" },
  departments: { label: "Departments", section: "admin", href: "/portal/admin/departments" },
  moduleBuilds: { label: "Module Builds", section: "admin", href: "/portal/admin/modules" },
  adamsBrainAdmin: { label: "AdamsBrain Admin", section: "admin", href: "/portal/admin/adams-brain" },
  platformDevelopment: { label: "Platform Development", section: "admin", href: "/portal/admin/platform-development" },
  superadminControls: { label: "SuperAdmin Controls", section: "admin", href: "/portal/admin/superadmin" },
  settings: { label: "Settings", section: "admin", href: "/portal/settings" },

  // Initiatives
  initiatives: { label: "Initiatives", section: "initiatives", href: "/portal/admin/initiatives" },
  tbmncSuppliers: { label: "TBMNC Suppliers", section: "initiatives", href: "/portal/admin/initiatives/tbmnc" },

  // Mission Critical
  safetyCalendar: { label: "Safety Calendar", section: "missionCritical", href: "/safety-calendar" },
  adamsLearningAcademy: { label: "Adams Learning Academy", section: "missionCritical", href: "/academy" },
  certificationTracker: { label: "Certification Tracker", section: "missionCritical", href: "/portal/admin/academy/certificates" },
  vehicleInspection: { label: "Vehicle Inspection", section: "missionCritical", href: "/portal/vehicle-inspection" },
  safetyRequestBox: { label: "Safety Request Box", section: "missionCritical", href: "/portal/safety-request-box" },
  orderTracking: { label: "Order Tracking", section: "missionCritical", href: "/portal/order-tracking" },
  mindchukClone: { label: "MindChuk Clone", section: "missionCritical", href: "/portal/mindchuk-clone" },

  // My Mission Critical (User-scoped)
  myTasks: { label: "My Tasks", section: "myMissionCritical", href: "/portal/my-tasks" },
  myAssets: { label: "My Assets", section: "myMissionCritical", href: "/portal/my-assets" },
  myTrainingAndCerts: { label: "My Training and Certs", section: "myMissionCritical", href: "/portal/my-training" },
  myOrders: { label: "My Orders", section: "myMissionCritical", href: "/portal/my-orders" },
  myIdeas: { label: "My Ideas", section: "myMissionCritical", href: "/portal/my-ideas" },
} as const;

export type FeatureKey = keyof typeof SIDEBAR_FEATURES;

// L83 Tools that can be toggled
export const L83_TOOLS = {
  transcription: { label: "Audio Transcription", description: "Convert audio/video to text" },
  imageGen: { label: "Image Generation", description: "Create images from text" },
  headshot: { label: "AI Headshot Generator", description: "Create professional headshots" },
  youtube: { label: "YouTube Transcriber", description: "Extract YouTube transcripts" },
  tts: { label: "Text-to-Speech", description: "Transform text to audio" },
  crawler: { label: "Web Crawler", description: "Crawl and extract web data" },
  pdfOcr: { label: "PDF Handwriting OCR", description: "Convert handwritten PDFs" },
} as const;

export type L83ToolKey = keyof typeof L83_TOOLS;

// Sections that can be toggled
export const SECTIONS = {
  navigation: { label: "Navigation" },
  work: { label: "Work" },
  intelligence: { label: "Intelligence" },
  admin: { label: "Admin" },
  initiatives: { label: "Initiatives" },
  missionCritical: { label: "Mission Critical" },
  myMissionCritical: { label: "My Mission Critical" },
} as const;

export type SectionKey = keyof typeof SECTIONS;

// Default visibility settings per role
export const DEFAULT_ROLE_VISIBILITY: Record<UserRole, {
  features: Record<FeatureKey, boolean>;
  sections: Record<SectionKey, boolean>;
  l83Tools: Record<L83ToolKey, boolean>;
}> = {
  superadmin: {
    features: Object.keys(SIDEBAR_FEATURES).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<FeatureKey, boolean>),
    sections: Object.keys(SECTIONS).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<SectionKey, boolean>),
    l83Tools: Object.keys(L83_TOOLS).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<L83ToolKey, boolean>),
  },
  admin: {
    features: Object.keys(SIDEBAR_FEATURES).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<FeatureKey, boolean>),
    sections: Object.keys(SECTIONS).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<SectionKey, boolean>),
    l83Tools: Object.keys(L83_TOOLS).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<L83ToolKey, boolean>),
  },
  team: {
    features: {
      ...Object.keys(SIDEBAR_FEATURES).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<FeatureKey, boolean>),
      // Hide some admin features for team
      safetyCalendarAdmin: false,
      heroManagement: false,
      contactPopup: false,
      growthIqQuiz: false,
      mailAdmin: false,
      departments: false,
      moduleBuilds: false,
      adamsBrainAdmin: false,
      platformDevelopment: false,
      superadminControls: false,
      settings: false,
    },
    sections: Object.keys(SECTIONS).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<SectionKey, boolean>),
    l83Tools: Object.keys(L83_TOOLS).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<L83ToolKey, boolean>),
  },
  affiliate: {
    features: {
      commandCenter: true,
      opportunities: true,
      projects: false,
      affiliates: false,
      customers: false,
      apolloSearch: false,
      supplierSearch: false,
      documents: true,
      calendar: true,
      availability: true,
      meetings: true,
      rocks: false,
      networking: true,
      deals: true,
      linkedinContent: false,
      eos2: false,
      docuseal: true,
      aiWorkforce: false,
      proposals: true,
      gohighlevel: false,
      ghlMigration: false,
      bugTracker: false,
      adamsTools: false,
      systemDocs: false,
      solutions: true,
      modules: true,
      moduleNotifications: true,
      formBuilder: true,
      askAdamsBrain: true,
      teamMembers: false,
      strategicPartners: false,
      heroManagement: false,
      contactPopup: false,
      events: false,
      growthIqQuiz: false,
      imageManager: false,
      bookACall: false,
      successStories: false,
      academy: true,
      safetyCalendarAdmin: false,
      academyAdmin: false,
      revenueConfig: false,
      alignable: false,
      pageDesigner: false,
      mailAdmin: false,
      navigationManager: false,
      backups: false,
      departments: false,
      moduleBuilds: false,
      adamsBrainAdmin: false,
      platformDevelopment: false,
      superadminControls: false,
      settings: false,
      initiatives: false,
      tbmncSuppliers: false,
      safetyCalendar: true,
      adamsLearningAcademy: true,
      certificationTracker: false,
      vehicleInspection: true,
      safetyRequestBox: true,
      orderTracking: true,
      mindchukClone: true,
      myTasks: true,
      myAssets: true,
      myTrainingAndCerts: true,
      myOrders: true,
      myIdeas: true,
    },
    sections: {
      navigation: true,
      work: true,
      intelligence: true,
      admin: false,
      initiatives: false,
      missionCritical: true,
      myMissionCritical: true,
    },
    l83Tools: {
      transcription: true,
      imageGen: false,
      headshot: true,
      youtube: true,
      tts: false,
      crawler: false,
      pdfOcr: true,
    },
  },
  consultant: {
    features: {
      commandCenter: true,
      opportunities: true,
      projects: true,
      affiliates: false,
      customers: true,
      apolloSearch: true,
      supplierSearch: true,
      documents: true,
      calendar: true,
      availability: true,
      meetings: true,
      rocks: true,
      networking: true,
      deals: true,
      linkedinContent: true,
      eos2: true,
      docuseal: true,
      aiWorkforce: true,
      proposals: true,
      gohighlevel: false,
      ghlMigration: false,
      bugTracker: false,
      adamsTools: true,
      systemDocs: true,
      solutions: true,
      modules: true,
      moduleNotifications: true,
      formBuilder: true,
      askAdamsBrain: true,
      teamMembers: false,
      strategicPartners: false,
      heroManagement: false,
      contactPopup: false,
      events: false,
      growthIqQuiz: false,
      imageManager: false,
      bookACall: false,
      successStories: false,
      academy: true,
      safetyCalendarAdmin: false,
      academyAdmin: false,
      revenueConfig: false,
      alignable: false,
      pageDesigner: false,
      mailAdmin: false,
      navigationManager: false,
      backups: false,
      departments: false,
      moduleBuilds: false,
      adamsBrainAdmin: false,
      platformDevelopment: false,
      superadminControls: false,
      settings: false,
      initiatives: false,
      tbmncSuppliers: false,
      safetyCalendar: true,
      adamsLearningAcademy: true,
      certificationTracker: true,
      vehicleInspection: true,
      safetyRequestBox: true,
      orderTracking: true,
      mindchukClone: true,
      myTasks: true,
      myAssets: true,
      myTrainingAndCerts: true,
      myOrders: true,
      myIdeas: true,
    },
    sections: {
      navigation: true,
      work: true,
      intelligence: true,
      admin: false,
      initiatives: false,
      missionCritical: true,
      myMissionCritical: true,
    },
    l83Tools: Object.keys(L83_TOOLS).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<L83ToolKey, boolean>),
  },
};

export interface FeatureVisibilitySettings {
  roleVisibility: Record<UserRole, {
    features: Record<FeatureKey, boolean>;
    sections: Record<SectionKey, boolean>;
    l83Tools: Record<L83ToolKey, boolean>;
  }>;
  updatedAt?: Date;
  updatedBy?: string;
}

const SETTINGS_DOC_ID = "feature-visibility";

function mergeWithDefaults(
  saved?: Partial<FeatureVisibilitySettings["roleVisibility"]>
): FeatureVisibilitySettings["roleVisibility"] {
  const result = { ...DEFAULT_ROLE_VISIBILITY };
  if (!saved) return result;

  (Object.keys(DEFAULT_ROLE_VISIBILITY) as UserRole[]).forEach((role) => {
    const savedRole = saved[role];
    if (savedRole) {
      result[role] = {
        features: { ...DEFAULT_ROLE_VISIBILITY[role].features, ...(savedRole.features || {}) },
        sections: { ...DEFAULT_ROLE_VISIBILITY[role].sections, ...(savedRole.sections || {}) },
        l83Tools: { ...DEFAULT_ROLE_VISIBILITY[role].l83Tools, ...(savedRole.l83Tools || {}) },
      };
    }
  });
  return result;
}

// Get feature visibility settings from Firestore
export async function getFeatureVisibilitySettings(): Promise<FeatureVisibilitySettings> {
  if (!db) {
    return { roleVisibility: DEFAULT_ROLE_VISIBILITY };
  }

  try {
    const docRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        roleVisibility: mergeWithDefaults(data.roleVisibility),
        updatedAt: data.updatedAt?.toDate(),
        updatedBy: data.updatedBy,
      };
    }
  } catch (error) {
    console.error("Error fetching feature visibility settings:", error);
  }

  return { roleVisibility: DEFAULT_ROLE_VISIBILITY };
}

// Save feature visibility settings to Firestore
export async function saveFeatureVisibilitySettings(
  settings: FeatureVisibilitySettings,
  updatedBy: string
): Promise<boolean> {
  if (!db) {
    console.error("Firebase not initialized");
    return false;
  }

  try {
    const docRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, SETTINGS_DOC_ID);
    await setDoc(docRef, {
      roleVisibility: settings.roleVisibility,
      updatedAt: Timestamp.now(),
      updatedBy,
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving feature visibility settings:", error);
    return false;
  }
}

// Subscribe to feature visibility settings changes
export function subscribeToFeatureVisibility(
  callback: (settings: FeatureVisibilitySettings) => void,
  enabled = true
): () => void {
  if (!db || !enabled) {
    callback({ roleVisibility: DEFAULT_ROLE_VISIBILITY });
    return () => {};
  }

  const docRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, SETTINGS_DOC_ID);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        roleVisibility: mergeWithDefaults(data.roleVisibility),
        updatedAt: data.updatedAt?.toDate(),
        updatedBy: data.updatedBy,
      });
    } else {
      callback({ roleVisibility: DEFAULT_ROLE_VISIBILITY });
    }
  }, (error) => {
    console.warn("Feature visibility subscription unavailable, using defaults:", error?.message || error);
    callback({ roleVisibility: DEFAULT_ROLE_VISIBILITY });
  });
}

// Check if a feature is visible for a role
export function isFeatureVisible(
  featureKey: FeatureKey,
  role: UserRole,
  settings: FeatureVisibilitySettings
): boolean {
  const roleSettings = settings.roleVisibility[role];
  if (!roleSettings) return true;

  // Check if the section is visible first
  const feature = SIDEBAR_FEATURES[featureKey];
  const sectionKey = feature.section as SectionKey;
  if (!roleSettings.sections[sectionKey]) return false;

  return roleSettings.features[featureKey] ?? true;
}

// Check if a section is visible for a role
export function isSectionVisible(
  sectionKey: SectionKey,
  role: UserRole,
  settings: FeatureVisibilitySettings
): boolean {
  const roleSettings = settings.roleVisibility[role];
  if (!roleSettings) return true;
  return roleSettings.sections[sectionKey] ?? true;
}

// Check if an L83 tool is visible for a role
export function isL83ToolVisible(
  toolKey: L83ToolKey,
  role: UserRole,
  settings: FeatureVisibilitySettings
): boolean {
  const roleSettings = settings.roleVisibility[role];
  if (!roleSettings) return true;
  return roleSettings.l83Tools[toolKey] ?? true;
}

// Get all visible features for a role
export function getVisibleFeatures(
  role: UserRole,
  settings: FeatureVisibilitySettings
): FeatureKey[] {
  return (Object.keys(SIDEBAR_FEATURES) as FeatureKey[]).filter(
    (key) => isFeatureVisible(key, role, settings)
  );
}

// Get all visible L83 tools for a role
export function getVisibleL83Tools(
  role: UserRole,
  settings: FeatureVisibilitySettings
): L83ToolKey[] {
  return (Object.keys(L83_TOOLS) as L83ToolKey[]).filter(
    (key) => isL83ToolVisible(key, role, settings)
  );
}
