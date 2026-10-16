"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getTeamMemberByAuthUid, findAndLinkTeamMember, updateTeamMemberProfile, getTeamMemberById } from "@/lib/auth-team-member-link";
import type { TeamMemberDoc } from "@/lib/schema";

// User profile fields
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  jobTitle: string;
  location: string;
  bio: string;
  avatarUrl: string;
  role: "admin" | "affiliate" | "customer" | "team_member" | "client";
  
  // Affiliate-specific fields
  isAffiliate: boolean;
  isClient: boolean;
  affiliateOnboardingComplete: boolean;
  affiliateAgreementSigned: boolean;
  affiliateAgreementDate: string | null;
  
  // Networking profile (for affiliates)
  networkingProfile: {
    expertise: string[];
    categories: string[];
    idealReferralPartner: string;
    topReferralSources: string;
    goalsThisQuarter: string;
    uniqueValueProposition: string;
    targetClientProfile: string;
    problemsYouSolve: string;
    successStory: string;
    // Extended networking fields
    businessType: string;
    industry: string[];
    servicesOffered: string;
    targetCustomers: string;
    geographicFocus: string[];
    networkingGoals: string[];
    meetingFrequency: string;
  };
  
  // Profile completion tracking
  profileCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Default empty profile
const defaultProfile: UserProfile = {
  id: "",
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  company: "",
  jobTitle: "",
  location: "",
  bio: "",
  avatarUrl: "",
  role: "team_member",
  isAffiliate: false,
  isClient: false,
  affiliateOnboardingComplete: false,
  affiliateAgreementSigned: false,
  affiliateAgreementDate: null,
  networkingProfile: {
    expertise: [],
    categories: [],
    idealReferralPartner: "",
    topReferralSources: "",
    goalsThisQuarter: "",
    uniqueValueProposition: "",
    targetClientProfile: "",
    problemsYouSolve: "",
    successStory: "",
    // Extended networking fields
    businessType: "",
    industry: [],
    servicesOffered: "",
    targetCustomers: "",
    geographicFocus: [],
    networkingGoals: [],
    meetingFrequency: "monthly",
  },
  profileCompletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Calculate profile completion percentage
export function calculateProfileCompletion(profile: UserProfile): number {
  const requiredFields = [
    profile.firstName,
    profile.lastName,
    profile.email,
    profile.phone,
    profile.company,
    profile.jobTitle,
    profile.location,
    profile.bio,
  ];
  
  const completedFields = requiredFields.filter((field) => field && field.trim() !== "").length;
  return Math.round((completedFields / requiredFields.length) * 100);
}

// Calculate affiliate networking profile completion
export function calculateNetworkingCompletion(profile: UserProfile): number {
  if (!profile.isAffiliate) return 100;
  
  const networkingFields = [
    profile.networkingProfile.expertise.length > 0,
    profile.networkingProfile.categories.length > 0,
    profile.networkingProfile.idealReferralPartner,
    profile.networkingProfile.topReferralSources,
    profile.networkingProfile.goalsThisQuarter,
    profile.networkingProfile.uniqueValueProposition,
    profile.networkingProfile.targetClientProfile,
    profile.networkingProfile.problemsYouSolve,
  ];
  
  const completedFields = networkingFields.filter((field) => {
    if (typeof field === "boolean") return field;
    return field && String(field).trim() !== "";
  }).length;
  
  return Math.round((completedFields / networkingFields.length) * 100);
}

// Check if profile is complete
export function isProfileComplete(profile: UserProfile): boolean {
  return calculateProfileCompletion(profile) === 100;
}

// Check if affiliate onboarding is needed
export function needsAffiliateOnboarding(profile: UserProfile): boolean {
  return profile.isAffiliate && !profile.affiliateOnboardingComplete;
}

// Map TeamMemberDoc to UserProfile
function mapTeamMemberToProfile(teamMember: TeamMemberDoc): Partial<UserProfile> {
  return {
    id: teamMember.id,
    email: teamMember.emailPrimary || "",
    firstName: teamMember.firstName || "",
    lastName: teamMember.lastName || "",
    phone: teamMember.mobile || "",
    company: teamMember.company || "",
    jobTitle: teamMember.title || "",
    location: teamMember.location || "",
    bio: teamMember.bio || "",
    avatarUrl: teamMember.avatar || "",
    role: teamMember.role === "admin" ? "admin" : 
          teamMember.role === "affiliate" ? "affiliate" : 
          teamMember.role === "consultant" ? "affiliate" :
          teamMember.role === "client" ? "client" : "team_member",
    isAffiliate: teamMember.role === "affiliate" || teamMember.role === "consultant",
    isClient: teamMember.role === "client" || teamMember.isClient,
  };
}

// Context type
interface UserProfileContextType {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  saveProfileToFirestore: (updates: Partial<UserProfile>) => Promise<boolean>;
  refreshLinkedTeamMember: () => Promise<void>;
  setViewAsTeamMemberId: (teamMemberId: string | null) => Promise<void>;
  isMasqueradingUser: boolean;
  profileCompletion: number;
  networkingCompletion: number;
  isComplete: boolean;
  needsOnboarding: boolean;
  showProfileWizard: boolean;
  setShowProfileWizard: (show: boolean) => void;
  showAffiliateOnboarding: boolean;
  setShowAffiliateOnboarding: (show: boolean) => void;
  showNetworkingWizard: boolean;
  setShowNetworkingWizard: (show: boolean) => void;
  getDisplayName: () => string;
  getInitials: () => string;
  isLoading: boolean;
  isAuthenticated: boolean;
  linkedTeamMember: TeamMemberDoc | null;
  actualTeamMember: TeamMemberDoc | null;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [showAffiliateOnboarding, setShowAffiliateOnboarding] = useState(false);
  const [showNetworkingWizard, setShowNetworkingWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [linkedTeamMember, setLinkedTeamMember] = useState<TeamMemberDoc | null>(null);
  const [actualTeamMember, setActualTeamMember] = useState<TeamMemberDoc | null>(null);

  const profileCompletion = calculateProfileCompletion(profile);
  const networkingCompletion = calculateNetworkingCompletion(profile);
  const isComplete = isProfileComplete(profile);
  const needsOnboarding = needsAffiliateOnboarding(profile);

  // Listen to Firebase Auth state and fetch linked Team Member
  useEffect(() => {
    if (!auth) {
      console.warn("Firebase Auth not initialized");
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setIsLoading(true);
      
      if (firebaseUser) {
        setIsAuthenticated(true);
        console.log("User authenticated:", firebaseUser.uid, firebaseUser.email);
        
        try {
          // Try to find and link Team Member by UID first, then by email
          let teamMember = await getTeamMemberByAuthUid(firebaseUser.uid);
          
          if (!teamMember && firebaseUser.email) {
            // Try to find and link by email
            teamMember = await findAndLinkTeamMember(firebaseUser.email, firebaseUser.uid);
          }
          
          if (teamMember) {
            console.log("Linked Team Member found:", teamMember.id, teamMember.firstName, teamMember.lastName);
            setActualTeamMember(teamMember);
            let viewedTeamMember = teamMember;
            const previewId = sessionStorage.getItem("adams_view_as_team_member");
            if ((teamMember.role === "admin" || teamMember.role === "superadmin") && previewId) {
              const previewMember = await getTeamMemberById(previewId);
              if (previewMember) viewedTeamMember = previewMember;
            }
            setLinkedTeamMember(viewedTeamMember);
            
            // Map Team Member data to profile
            const mappedProfile = mapTeamMemberToProfile(viewedTeamMember);
            setProfile((prev) => ({
              ...prev,
              ...mappedProfile,
              updatedAt: new Date().toISOString(),
            }));
          } else {
            console.log("No linked Team Member found for user:", firebaseUser.email);
            setActualTeamMember(null);
            setLinkedTeamMember(null);
            if (process.env.NODE_ENV === "production") {
              await auth?.signOut();
              setIsAuthenticated(false);
              setProfile(defaultProfile);
              setIsLoading(false);
              return;
            }
            // Set basic profile from Firebase Auth
            setProfile((prev) => ({
              ...prev,
              id: firebaseUser.uid,
              email: firebaseUser.email || "",
              firstName: firebaseUser.displayName?.split(" ")[0] || "",
              lastName: firebaseUser.displayName?.split(" ").slice(1).join(" ") || "",
              avatarUrl: firebaseUser.photoURL || "",
              updatedAt: new Date().toISOString(),
            }));
          }
        } catch (error) {
          console.error("Error fetching Team Member:", error);
        }
      } else {
        const demoRole = sessionStorage.getItem("adams_demo_role");
        if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true" && demoRole) {
          const isDemoAdmin = demoRole === "admin";
          const demoMember = {
            id: isDemoAdmin ? "demo-admin" : "demo-user",
            firstName: isDemoAdmin ? "Demo" : "Demo",
            lastName: isDemoAdmin ? "Admin" : "User",
            emailPrimary: isDemoAdmin ? "demo-admin@adams-electric.com" : "demo-user@adams-electric.com",
            expertise: "",
            role: isDemoAdmin ? "admin" : "team",
            status: "active",
          } as TeamMemberDoc;
          setIsAuthenticated(true);
          setActualTeamMember(demoMember);
          setLinkedTeamMember(demoMember);
          setProfile((prev) => ({
            ...prev,
            id: demoMember.id,
            email: demoMember.emailPrimary,
            firstName: demoMember.firstName,
            lastName: demoMember.lastName,
            role: isDemoAdmin ? "admin" : "team_member",
            updatedAt: new Date().toISOString(),
          }));
        } else {
          setIsAuthenticated(false);
          setActualTeamMember(null);
          setLinkedTeamMember(null);
          setProfile(defaultProfile);
        }
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Check if wizards should be shown after profile is loaded
  useEffect(() => {
    // Don't show wizard while loading or if not authenticated
    if (isLoading || !isAuthenticated) {
      return;
    }
    
    // Only show profile wizard if profile is incomplete
    if (!isComplete) {
      setShowProfileWizard(true);
    } else if (needsOnboarding) {
      setShowAffiliateOnboarding(true);
    }
  }, [isLoading, isAuthenticated, isComplete, needsOnboarding]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  };

  const getDisplayName = () => {
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    if (profile.firstName) return profile.firstName;
    if (profile.email) return profile.email.split("@")[0];
    return "User";
  };

  const getInitials = () => {
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
    }
    if (profile.firstName) return profile.firstName[0].toUpperCase();
    if (profile.email) return profile.email[0].toUpperCase();
    return "U";
  };

  // Save profile updates to Firestore (linked TeamMember document)
  const saveProfileToFirestore = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!linkedTeamMember) {
      console.warn("No linked Team Member to update");
      return false;
    }

    // Map UserProfile fields to TeamMemberDoc fields
    const teamMemberUpdates: Parameters<typeof updateTeamMemberProfile>[1] = {};
    
    if (updates.firstName !== undefined) teamMemberUpdates.firstName = updates.firstName;
    if (updates.lastName !== undefined) teamMemberUpdates.lastName = updates.lastName;
    if (updates.email !== undefined) teamMemberUpdates.emailPrimary = updates.email;
    if (updates.phone !== undefined) teamMemberUpdates.mobile = updates.phone;
    if (updates.company !== undefined) teamMemberUpdates.company = updates.company;
    if (updates.jobTitle !== undefined) teamMemberUpdates.title = updates.jobTitle;
    if (updates.location !== undefined) teamMemberUpdates.location = updates.location;
    if (updates.bio !== undefined) teamMemberUpdates.bio = updates.bio;
    if (updates.avatarUrl !== undefined) teamMemberUpdates.avatar = updates.avatarUrl;

    const success = await updateTeamMemberProfile(linkedTeamMember.id, teamMemberUpdates);
    
    if (success) {
      // Also update local state
      updateProfile(updates);
    }
    
    return success;
  };

  // Refresh the linked Team Member data from Firestore
  const refreshLinkedTeamMember = async (): Promise<void> => {
    if (!linkedTeamMember) return;
    
    const refreshedMember = await getTeamMemberById(linkedTeamMember.id);
    if (refreshedMember) {
      setLinkedTeamMember(refreshedMember);
      const mappedProfile = mapTeamMemberToProfile(refreshedMember);
      setProfile((prev) => ({
        ...prev,
        ...mappedProfile,
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  // Masquerade as another Team Member without logging out
  const setViewAsTeamMemberId = async (teamMemberId: string | null): Promise<void> => {
    if (!actualTeamMember || (actualTeamMember.role !== "admin" && actualTeamMember.role !== "superadmin")) {
      return;
    }

    if (!teamMemberId || teamMemberId === "actual" || teamMemberId === actualTeamMember.id) {
      sessionStorage.removeItem("adams_view_as_team_member");
      setLinkedTeamMember(actualTeamMember);
      const mappedProfile = mapTeamMemberToProfile(actualTeamMember);
      setProfile((prev) => ({
        ...prev,
        ...mappedProfile,
        updatedAt: new Date().toISOString(),
      }));
      return;
    }

    sessionStorage.setItem("adams_view_as_team_member", teamMemberId);
    const previewMember = await getTeamMemberById(teamMemberId);
    if (previewMember) {
      setLinkedTeamMember(previewMember);
      const mappedProfile = mapTeamMemberToProfile(previewMember);
      setProfile((prev) => ({
        ...prev,
        ...mappedProfile,
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  const isMasqueradingUser = Boolean(
    actualTeamMember && linkedTeamMember && actualTeamMember.id !== linkedTeamMember.id
  );

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        setProfile,
        updateProfile,
        saveProfileToFirestore,
        refreshLinkedTeamMember,
        setViewAsTeamMemberId,
        isMasqueradingUser,
        profileCompletion,
        networkingCompletion,
        isComplete,
        needsOnboarding,
        showProfileWizard,
        setShowProfileWizard,
        showAffiliateOnboarding,
        setShowAffiliateOnboarding,
        showNetworkingWizard,
        setShowNetworkingWizard,
        getDisplayName,
        getInitials,
        isLoading,
        isAuthenticated,
        linkedTeamMember,
        actualTeamMember,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
}
