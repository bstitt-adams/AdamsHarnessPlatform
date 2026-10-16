"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  FeatureVisibilitySettings,
  UserRole,
  FeatureKey,
  SectionKey,
  L83ToolKey,
  DEFAULT_ROLE_VISIBILITY,
  subscribeToFeatureVisibility,
  isFeatureVisible,
  isSectionVisible,
  isL83ToolVisible,
} from "@/lib/feature-visibility";
import { useUserProfile } from "@/contexts/user-profile-context";
import { isAdminRole } from "@/lib/permissions";

interface FeatureVisibilityContextType {
  settings: FeatureVisibilitySettings;
  isLoading: boolean;
  // Current effective role (actual role or preview role)
  effectiveRole: UserRole;
  // Preview mode for SuperAdmin
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
  isPreviewMode: boolean;
  // Visibility checks
  canSeeFeature: (featureKey: FeatureKey) => boolean;
  canSeeSection: (sectionKey: SectionKey) => boolean;
  canSeeL83Tool: (toolKey: L83ToolKey) => boolean;
  // Refresh settings
  refreshSettings: () => void;
}

const FeatureVisibilityContext = createContext<FeatureVisibilityContextType | undefined>(undefined);

export function FeatureVisibilityProvider({ children }: { children: React.ReactNode }) {
  const { linkedTeamMember, actualTeamMember, isAuthenticated, isMasqueradingUser } = useUserProfile();
  const actualRole = (actualTeamMember?.role as UserRole) || (linkedTeamMember?.role as UserRole) || "affiliate";
  const viewedRole = (linkedTeamMember?.role as UserRole) || "affiliate";
  const canMasquerade = isAdminRole(actualRole);

  const [settings, setSettings] = useState<FeatureVisibilitySettings>({
    roleVisibility: DEFAULT_ROLE_VISIBILITY,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);

  // Effective role is explicit previewRole first, otherwise the viewed user's role
  const effectiveRole = previewRole || viewedRole;
  const isPreviewMode = (previewRole !== null || isMasqueradingUser) && canMasquerade;

  // Subscribe to settings changes only when authenticated with Firebase
  useEffect(() => {
    const unsubscribe = subscribeToFeatureVisibility((newSettings) => {
      setSettings(newSettings);
      setIsLoading(false);
    }, isAuthenticated);

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Clear preview role if user is no longer admin/superadmin
  useEffect(() => {
    if (!canMasquerade && previewRole) {
      setPreviewRole(null);
    }
  }, [canMasquerade, previewRole]);

  const canSeeFeature = useCallback(
    (featureKey: FeatureKey): boolean => {
      // SuperAdmin always sees everything when effectiveRole is superadmin
      if (effectiveRole === "superadmin") {
        return true;
      }
      return isFeatureVisible(featureKey, effectiveRole, settings);
    },
    [effectiveRole, settings]
  );

  const canSeeSection = useCallback(
    (sectionKey: SectionKey): boolean => {
      if (effectiveRole === "superadmin") {
        return true;
      }
      return isSectionVisible(sectionKey, effectiveRole, settings);
    },
    [effectiveRole, settings]
  );

  const canSeeL83Tool = useCallback(
    (toolKey: L83ToolKey): boolean => {
      if (effectiveRole === "superadmin") {
        return true;
      }
      return isL83ToolVisible(toolKey, effectiveRole, settings);
    },
    [effectiveRole, settings]
  );

  const refreshSettings = useCallback(() => {
    setIsLoading(true);
    // The subscription will automatically update
  }, []);

  const handleSetPreviewRole = useCallback(
    (role: UserRole | null) => {
      if (!canMasquerade) return;
      setPreviewRole(role);
    },
    [canMasquerade]
  );

  return (
    <FeatureVisibilityContext.Provider
      value={{
        settings,
        isLoading,
        effectiveRole,
        previewRole,
        setPreviewRole: handleSetPreviewRole,
        isPreviewMode,
        canSeeFeature,
        canSeeSection,
        canSeeL83Tool,
        refreshSettings,
      }}
    >
      {children}
    </FeatureVisibilityContext.Provider>
  );
}

export function useFeatureVisibility() {
  const context = useContext(FeatureVisibilityContext);
  if (context === undefined) {
    throw new Error("useFeatureVisibility must be used within a FeatureVisibilityProvider");
  }
  return context;
}
