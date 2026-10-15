"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Save,
  Loader2,
  LayoutDashboard,
  Briefcase,
  Brain,
  Shield,
  Rocket,
  Wrench,
  Eye,
  EyeOff,
  RotateCcw,
  Users,
  User,
  UserCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  UserRole,
  FeatureKey,
  SectionKey,
  L83ToolKey,
  SIDEBAR_FEATURES,
  SECTIONS,
  L83_TOOLS,
  DEFAULT_ROLE_VISIBILITY,
  FeatureVisibilitySettings as FeatureVisibilitySettingsType,
  getFeatureVisibilitySettings,
  saveFeatureVisibilitySettings,
} from "@/lib/feature-visibility";
import { useUserProfile } from "@/contexts/user-profile-context";
import { isSuperAdmin } from "@/lib/permissions";

const ROLE_INFO: Record<UserRole, { label: string; icon: React.ElementType; description: string }> = {
  superadmin: { label: "SuperAdmin", icon: Shield, description: "Full access - cannot be restricted" },
  admin: { label: "Admin", icon: UserCheck, description: "Administrative users" },
  team: { label: "Team Member", icon: Users, description: "Internal team members" },
  affiliate: { label: "Affiliate", icon: User, description: "External partners" },
  consultant: { label: "Consultant", icon: Briefcase, description: "External consultants" },
};

const SECTION_ICONS: Record<SectionKey, React.ElementType> = {
  navigation: LayoutDashboard,
  work: Briefcase,
  intelligence: Brain,
  admin: Shield,
  initiatives: Rocket,
};

// Separate component to avoid button nesting in Collapsible
function SectionCollapsible({
  sectionKey,
  section,
  SectionIcon,
  counts,
  sectionEnabled,
  selectedRole,
  roleSettings,
  toggleSection,
  toggleAllInSection,
  toggleFeature,
}: {
  sectionKey: SectionKey;
  section: { label: string };
  SectionIcon: React.ElementType;
  counts: { visible: number; total: number };
  sectionEnabled: boolean;
  selectedRole: UserRole;
  roleSettings: {
    features: Record<FeatureKey, boolean>;
    sections: Record<SectionKey, boolean>;
    l83Tools: Record<L83ToolKey, boolean>;
  };
  toggleSection: (role: UserRole, sectionKey: SectionKey) => void;
  toggleAllInSection: (role: UserRole, sectionKey: SectionKey, enabled: boolean) => void;
  toggleFeature: (role: UserRole, featureKey: FeatureKey) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <SectionIcon className="h-4 w-4" />
          <span className="font-medium">{section.label}</span>
          <Badge variant={sectionEnabled ? "default" : "secondary"} className="text-xs">
            {counts.visible}/{counts.total}
          </Badge>
        </button>
        <Switch
          checked={sectionEnabled}
          onCheckedChange={() => toggleSection(selectedRole, sectionKey)}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-4 space-y-2">
          <div className="flex gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllInSection(selectedRole, sectionKey, true)}
              disabled={!sectionEnabled}
            >
              <Eye className="mr-1 h-3 w-3" />
              Show All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllInSection(selectedRole, sectionKey, false)}
              disabled={!sectionEnabled}
            >
              <EyeOff className="mr-1 h-3 w-3" />
              Hide All
            </Button>
          </div>
          {(Object.entries(SIDEBAR_FEATURES) as [FeatureKey, typeof SIDEBAR_FEATURES[FeatureKey]][])
            .filter(([, feature]) => feature.section === sectionKey)
            .map(([featureKey, feature]) => (
              <div
                key={featureKey}
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
              >
                <Label htmlFor={`${selectedRole}-${featureKey}`} className="cursor-pointer">
                  {feature.label}
                </Label>
                <Switch
                  id={`${selectedRole}-${featureKey}`}
                  checked={roleSettings.features[featureKey] && sectionEnabled}
                  onCheckedChange={() => toggleFeature(selectedRole, featureKey)}
                  disabled={!sectionEnabled}
                />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function FeatureVisibilitySettings() {
  const { linkedTeamMember } = useUserProfile();
  const currentUserRole = (linkedTeamMember?.role as UserRole) || "affiliate";
  const canEdit = isSuperAdmin(currentUserRole);

  const [settings, setSettings] = useState<FeatureVisibilitySettingsType>({
    roleVisibility: DEFAULT_ROLE_VISIBILITY,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("affiliate");

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getFeatureVisibilitySettings();
        setSettings(data);
      } catch (error) {
        console.error("Error loading settings:", error);
        toast.error("Failed to load visibility settings");
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Save settings
  const handleSave = async () => {
    if (!canEdit) {
      toast.error("You don't have permission to edit these settings");
      return;
    }

    setSaving(true);
    try {
      const success = await saveFeatureVisibilitySettings(
        settings,
        linkedTeamMember?.id || "unknown"
      );
      if (success) {
        toast.success("Visibility settings saved successfully");
        setHasChanges(false);
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults for a role
  const handleResetRole = (role: UserRole) => {
    if (!canEdit || role === "superadmin") return;
    
    setSettings((prev) => ({
      ...prev,
      roleVisibility: {
        ...prev.roleVisibility,
        [role]: DEFAULT_ROLE_VISIBILITY[role],
      },
    }));
    setHasChanges(true);
    toast.info(`Reset ${ROLE_INFO[role].label} to default settings`);
  };

  // Toggle a feature for a role
  const toggleFeature = (role: UserRole, featureKey: FeatureKey) => {
    if (!canEdit || role === "superadmin") return;

    setSettings((prev) => ({
      ...prev,
      roleVisibility: {
        ...prev.roleVisibility,
        [role]: {
          ...prev.roleVisibility[role],
          features: {
            ...prev.roleVisibility[role].features,
            [featureKey]: !prev.roleVisibility[role].features[featureKey],
          },
        },
      },
    }));
    setHasChanges(true);
  };

  // Toggle a section for a role
  const toggleSection = (role: UserRole, sectionKey: SectionKey) => {
    if (!canEdit || role === "superadmin") return;

    setSettings((prev) => ({
      ...prev,
      roleVisibility: {
        ...prev.roleVisibility,
        [role]: {
          ...prev.roleVisibility[role],
          sections: {
            ...prev.roleVisibility[role].sections,
            [sectionKey]: !prev.roleVisibility[role].sections[sectionKey],
          },
        },
      },
    }));
    setHasChanges(true);
  };

  // Toggle an L83 tool for a role
  const toggleL83Tool = (role: UserRole, toolKey: L83ToolKey) => {
    if (!canEdit || role === "superadmin") return;

    setSettings((prev) => ({
      ...prev,
      roleVisibility: {
        ...prev.roleVisibility,
        [role]: {
          ...prev.roleVisibility[role],
          l83Tools: {
            ...prev.roleVisibility[role].l83Tools,
            [toolKey]: !prev.roleVisibility[role].l83Tools[toolKey],
          },
        },
      },
    }));
    setHasChanges(true);
  };

  // Enable/disable all features in a section for a role
  const toggleAllInSection = (role: UserRole, sectionKey: SectionKey, enabled: boolean) => {
    if (!canEdit || role === "superadmin") return;

    const featuresInSection = (Object.entries(SIDEBAR_FEATURES) as [FeatureKey, typeof SIDEBAR_FEATURES[FeatureKey]][])
      .filter(([, feature]) => feature.section === sectionKey)
      .map(([key]) => key);

    setSettings((prev) => {
      const newFeatures = { ...prev.roleVisibility[role].features };
      featuresInSection.forEach((key) => {
        newFeatures[key] = enabled;
      });

      return {
        ...prev,
        roleVisibility: {
          ...prev.roleVisibility,
          [role]: {
            ...prev.roleVisibility[role],
            features: newFeatures,
          },
        },
      };
    });
    setHasChanges(true);
  };

  // Enable/disable all L83 tools for a role
  const toggleAllL83Tools = (role: UserRole, enabled: boolean) => {
    if (!canEdit || role === "superadmin") return;

    setSettings((prev) => {
      const newTools = { ...prev.roleVisibility[role].l83Tools };
      (Object.keys(L83_TOOLS) as L83ToolKey[]).forEach((key) => {
        newTools[key] = enabled;
      });

      return {
        ...prev,
        roleVisibility: {
          ...prev.roleVisibility,
          [role]: {
            ...prev.roleVisibility[role],
            l83Tools: newTools,
          },
        },
      };
    });
    setHasChanges(true);
  };

  if (!canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Feature Visibility
          </CardTitle>
          <CardDescription>
            Only SuperAdmin users can configure feature visibility settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const roleSettings = settings.roleVisibility[selectedRole];
  const RoleIcon = ROLE_INFO[selectedRole].icon;

  // Count visible features per section
  const getVisibleCount = (sectionKey: SectionKey) => {
    const featuresInSection = (Object.entries(SIDEBAR_FEATURES) as [FeatureKey, typeof SIDEBAR_FEATURES[FeatureKey]][])
      .filter(([, feature]) => feature.section === sectionKey);
    const visibleCount = featuresInSection.filter(([key]) => roleSettings.features[key]).length;
    return { visible: visibleCount, total: featuresInSection.length };
  };

  // Count visible L83 tools
  const getVisibleL83Count = () => {
    const total = Object.keys(L83_TOOLS).length;
    const visible = (Object.keys(L83_TOOLS) as L83ToolKey[]).filter(
      (key) => roleSettings.l83Tools[key]
    ).length;
    return { visible, total };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Feature Visibility
            </CardTitle>
            <CardDescription>
              Control which features are visible to each role. SuperAdmin always has full access.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                Unsaved Changes
              </Badge>
            )}
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Role Selector */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-3 block">Select Role to Configure</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ROLE_INFO) as UserRole[]).map((role) => {
              const info = ROLE_INFO[role];
              const Icon = info.icon;
              const isSelected = selectedRole === role;
              const isDisabled = role === "superadmin";

              return (
                <Button
                  key={role}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRole(role)}
                  disabled={isDisabled}
                  className={isDisabled ? "opacity-50" : ""}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {info.label}
                  {isDisabled && <Badge variant="secondary" className="ml-2 text-[10px]">Full Access</Badge>}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Selected Role Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RoleIcon className="h-5 w-5" />
              <h3 className="font-semibold">{ROLE_INFO[selectedRole].label} Settings</h3>
              <span className="text-sm text-muted-foreground">
                ({ROLE_INFO[selectedRole].description})
              </span>
            </div>
            {selectedRole !== "superadmin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetRole(selectedRole)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Defaults
              </Button>
            )}
          </div>

          {selectedRole === "superadmin" ? (
            <div className="p-4 bg-muted rounded-lg text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">
                SuperAdmin has full access to all features and cannot be restricted.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="sidebar" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sidebar">Sidebar Features</TabsTrigger>
                <TabsTrigger value="l83tools">L83 Tools</TabsTrigger>
              </TabsList>

              {/* Sidebar Features Tab */}
              <TabsContent value="sidebar" className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {(Object.entries(SECTIONS) as [SectionKey, typeof SECTIONS[SectionKey]][]).map(
                      ([sectionKey, section]) => {
                        const SectionIcon = SECTION_ICONS[sectionKey];
                        const counts = getVisibleCount(sectionKey);
                        const sectionEnabled = roleSettings.sections[sectionKey];

                        return (
                          <SectionCollapsible
                            key={sectionKey}
                            sectionKey={sectionKey}
                            section={section}
                            SectionIcon={SectionIcon}
                            counts={counts}
                            sectionEnabled={sectionEnabled}
                            selectedRole={selectedRole}
                            roleSettings={roleSettings}
                            toggleSection={toggleSection}
                            toggleAllInSection={toggleAllInSection}
                            toggleFeature={toggleFeature}
                          />
                        );
                      }
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* L83 Tools Tab */}
              <TabsContent value="l83tools" className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        <span className="font-medium">L83 Tools</span>
                        <Badge variant="outline">
                          {getVisibleL83Count().visible}/{getVisibleL83Count().total} enabled
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAllL83Tools(selectedRole, true)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Enable All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAllL83Tools(selectedRole, false)}
                        >
                          <EyeOff className="mr-1 h-3 w-3" />
                          Disable All
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {(Object.entries(L83_TOOLS) as [L83ToolKey, typeof L83_TOOLS[L83ToolKey]][]).map(
                        ([toolKey, tool]) => (
                          <div
                            key={toolKey}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <Label htmlFor={`${selectedRole}-l83-${toolKey}`} className="cursor-pointer font-medium">
                                {tool.label}
                              </Label>
                              <p className="text-xs text-muted-foreground">{tool.description}</p>
                            </div>
                            <Switch
                              id={`${selectedRole}-l83-${toolKey}`}
                              checked={roleSettings.l83Tools[toolKey]}
                              onCheckedChange={() => toggleL83Tool(selectedRole, toolKey)}
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
