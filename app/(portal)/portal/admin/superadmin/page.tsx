"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/contexts/user-profile-context";
import { isSuperAdmin } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  LayoutDashboard,
  Target,
  FolderKanban,
  Users,
  Building,
  Calendar,
  CalendarDays,
  CheckSquare,
  FileText,
  Sparkles,
  Settings,
  Activity,
  Handshake,
  Phone,
  Wrench,
  Mic,
  Image,
  Camera,
  Youtube,
  Volume2,
  Globe,
  FileSearch,
  Save,
  Loader2,
  AlertTriangle,
  Network,
  Key,
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";

// SuperAdmin setup constants
const SUPERADMIN_EMAIL = "bstitt@adams-electric.com";
const SUPERADMIN_UID = "EXeWJ63xxWTxWCpeSYgBtd0a9Qy1";

const SETTINGS_DOC_ID = "platform-settings";

// Sidebar items configuration
const sidebarItems = [
  { key: "commandCenter", label: "Command Center", icon: LayoutDashboard, section: "navigation" },
  { key: "opportunities", label: "Opportunities", icon: Target, section: "navigation" },
  { key: "projects", label: "Projects", icon: FolderKanban, section: "navigation" },
  { key: "affiliates", label: "Affiliates", icon: Users, section: "navigation" },
  { key: "organizations", label: "Organizations", icon: Building, section: "navigation" },
  { key: "calendar", label: "Calendar", icon: Calendar, section: "work" },
  { key: "meetings", label: "Meetings", icon: CalendarDays, section: "work" },
  { key: "rocks", label: "Rocks", icon: CheckSquare, section: "work" },
  { key: "proposals", label: "Proposals", icon: FileText, section: "work" },
  { key: "goHighLevel", label: "GoHighLevel", icon: Sparkles, section: "work" },
  { key: "askAdamsBrain", label: "Ask AdamsBrain", icon: Sparkles, section: "intelligence" },
  { key: "teamMembers", label: "Team Members", icon: Users, section: "admin" },
  { key: "strategicPartners", label: "Strategic Partners", icon: Handshake, section: "admin" },
  { key: "settings", label: "Settings", icon: Settings, section: "admin" },
  { key: "safetyCalendarAdmin", label: "Safety Calendar Admin", icon: Calendar, section: "admin" },
  { key: "activityLog", label: "Activity Log", icon: Activity, section: "admin" },
];

// L83 Tools configuration
const l83Tools = [
  { key: "transcription", label: "Audio Transcription", icon: Mic, description: "Convert audio/video to text" },
  { key: "imageGen", label: "Image Generation", icon: Image, description: "Create images from text" },
  { key: "headshot", label: "AI Headshot Generator", icon: Camera, description: "Create professional headshots" },
  { key: "youtube", label: "YouTube Transcriber", icon: Youtube, description: "Extract YouTube transcripts" },
  { key: "tts", label: "Text-to-Speech", icon: Volume2, description: "Transform text to audio" },
  { key: "crawler", label: "Web Crawler", icon: Globe, description: "Crawl and extract web data" },
  { key: "pdfOcr", label: "PDF Handwriting OCR", icon: FileSearch, description: "Convert handwritten PDFs" },
];

export default function SuperAdminPage() {
  const router = useRouter();
  const { linkedTeamMember } = useUserProfile();
  const currentUserRole = linkedTeamMember?.role || "affiliate";
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Sidebar visibility state
  const [sidebarVisibility, setSidebarVisibility] = useState<Record<string, boolean>>({
    navigation: true,
    work: true,
    intelligence: true,
    admin: true,
    initiatives: true,
    commandCenter: true,
    opportunities: true,
    projects: true,
    affiliates: true,
    organizations: true,
    calendar: true,
    meetings: true,
    rocks: true,
    proposals: true,
    goHighLevel: true,
    askAdamsBrain: true,
    teamMembers: true,
    strategicPartners: true,
    settings: true,
    safetyCalendarAdmin: true,
    activityLog: true,
  });
  
  // L83 Tools visibility state
  const [l83ToolsVisibility, setL83ToolsVisibility] = useState<Record<string, boolean>>({
    transcription: true,
    imageGen: true,
    headshot: true,
    youtube: true,
    tts: true,
    crawler: true,
    pdfOcr: true,
  });

  // API Keys for integrations
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    alignable: "",
    alignableAccessToken: "",
  });

  // Check if user is superadmin
  useEffect(() => {
    if (!isSuperAdmin(currentUserRole)) {
      toast.error("Access denied. SuperAdmin privileges required.");
      router.push("/portal");
    }
  }, [currentUserRole, router]);

  // Load settings from Firebase
  useEffect(() => {
    const loadSettings = async () => {
      if (!db) {
        setLoading(false);
        return;
      }
      
      try {
        const docRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.sidebarVisibility) {
            setSidebarVisibility(prev => ({ ...prev, ...data.sidebarVisibility }));
          }
          if (data.l83ToolsVisibility) {
            setL83ToolsVisibility(prev => ({ ...prev, ...data.l83ToolsVisibility }));
          }
          if (data.apiKeys) {
            setApiKeys(prev => ({ ...prev, ...data.apiKeys }));
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        toast.error("Error loading settings");
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Save settings to Firebase
  const saveSettings = async () => {
    if (!db) {
      toast.error("Firebase not initialized");
      return;
    }
    
    setSaving(true);
    try {
      const docRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, SETTINGS_DOC_ID);
      await setDoc(docRef, {
        sidebarVisibility,
        l83ToolsVisibility,
        apiKeys,
        updatedAt: Timestamp.now(),
        updatedBy: linkedTeamMember?.id || "unknown",
      }, { merge: true });
      
      setHasChanges(false);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  // Toggle sidebar item visibility
  const toggleSidebarItem = (key: string) => {
    setSidebarVisibility(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  // Toggle L83 tool visibility
  const toggleL83Tool = (key: string) => {
    setL83ToolsVisibility(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  // Toggle all items in a section
  const toggleSection = (section: string, enabled: boolean) => {
    const sectionItems = sidebarItems.filter(item => item.section === section);
    const updates: Record<string, boolean> = { [section]: enabled };
    sectionItems.forEach(item => {
      updates[item.key] = enabled;
    });
    setSidebarVisibility(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  // Toggle all L83 tools
  const toggleAllL83Tools = (enabled: boolean) => {
    const updates: Record<string, boolean> = {};
    l83Tools.forEach(tool => {
      updates[tool.key] = enabled;
    });
    setL83ToolsVisibility(updates);
    setHasChanges(true);
  };

  // Update API key
  const updateApiKey = (key: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Setup SuperAdmin function
  const setupSuperAdmin = async () => {
    if (!db) {
      toast.error("Firebase not initialized");
      return;
    }

    // Check if current user is the designated superadmin
    const currentUser = auth?.currentUser;
    if (!currentUser || currentUser.email !== SUPERADMIN_EMAIL) {
      toast.error("Only bstitt@adams-electric.com can set up SuperAdmin");
      return;
    }

    setSaving(true);
    try {
      const now = Timestamp.now();

      // 1. Create/update user document with SuperAdmin role
      const userRef = doc(db, "users", SUPERADMIN_UID);
      await setDoc(userRef, {
        email: SUPERADMIN_EMAIL,
        role: "superadmin",
        isSuperAdmin: true,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });

      // 2. Find existing team member by email
      const teamMembersRef = collection(db, COLLECTIONS.TEAM_MEMBERS);
      const emailQuery = query(teamMembersRef, where("emailPrimary", "==", SUPERADMIN_EMAIL));
      const snapshot = await getDocs(emailQuery);

      if (!snapshot.empty) {
        // Update existing team member
        const teamMemberDoc = snapshot.docs[0];
        await updateDoc(doc(db, COLLECTIONS.TEAM_MEMBERS, teamMemberDoc.id), {
          authUid: SUPERADMIN_UID,
          role: "admin",
          isSuperAdmin: true,
          updatedAt: now,
        });
        toast.success("SuperAdmin setup complete! Team member linked. Please refresh the page.");
      } else {
        // Create new team member
        const newTeamMemberRef = doc(collection(db, COLLECTIONS.TEAM_MEMBERS));
        await setDoc(newTeamMemberRef, {
          authUid: SUPERADMIN_UID,
          emailPrimary: SUPERADMIN_EMAIL,
          firstName: "Brian",
          lastName: "Stitt",
          role: "admin",
          isSuperAdmin: true,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
        toast.success("SuperAdmin setup complete! New team member created. Please refresh the page.");
      }

    } catch (error) {
      console.error("Error setting up SuperAdmin:", error);
      toast.error(`Error: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  // Check if current user is the designated superadmin email but not yet set up
  const isDesignatedSuperAdmin = auth?.currentUser?.email === SUPERADMIN_EMAIL;

  if (!isSuperAdmin(currentUserRole)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You need SuperAdmin privileges to access this page.
            </p>
            {isDesignatedSuperAdmin && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                  You are logged in as {SUPERADMIN_EMAIL}. Click below to set up your SuperAdmin account.
                </p>
                <Button onClick={setupSuperAdmin} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Setup SuperAdmin Account
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">SuperAdmin Controls</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Configure platform visibility and access controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              Unsaved Changes
            </Badge>
          )}
          <Button onClick={saveSettings} disabled={saving || !hasChanges}>
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

      <Tabs defaultValue="sidebar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sidebar">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Sidebar Visibility
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Wrench className="h-4 w-4 mr-2" />
            L83 Tools
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Key className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* Sidebar Visibility Tab */}
        <TabsContent value="sidebar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sidebar Navigation Visibility</CardTitle>
              <CardDescription>
                Control which navigation items are visible to all users in the portal sidebar.
                Disabled items will be hidden from the sidebar for everyone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Navigation Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Navigation</h3>
                    <Badge variant="outline">
                      {sidebarItems.filter(i => i.section === "navigation" && sidebarVisibility[i.key]).length}/
                      {sidebarItems.filter(i => i.section === "navigation").length} visible
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleSection("navigation", true)}>
                      Enable All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleSection("navigation", false)}>
                      Disable All
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sidebarItems.filter(item => item.section === "navigation").map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <Label htmlFor={item.key}>{item.label}</Label>
                      </div>
                      <Switch
                        id={item.key}
                        checked={sidebarVisibility[item.key]}
                        onCheckedChange={() => toggleSidebarItem(item.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Work Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Work</h3>
                    <Badge variant="outline">
                      {sidebarItems.filter(i => i.section === "work" && sidebarVisibility[i.key]).length}/
                      {sidebarItems.filter(i => i.section === "work").length} visible
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleSection("work", true)}>
                      Enable All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleSection("work", false)}>
                      Disable All
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sidebarItems.filter(item => item.section === "work").map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <Label htmlFor={item.key}>{item.label}</Label>
                      </div>
                      <Switch
                        id={item.key}
                        checked={sidebarVisibility[item.key]}
                        onCheckedChange={() => toggleSidebarItem(item.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Admin Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Admin</h3>
                    <Badge variant="outline">
                      {sidebarItems.filter(i => i.section === "admin" && sidebarVisibility[i.key]).length}/
                      {sidebarItems.filter(i => i.section === "admin").length} visible
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleSection("admin", true)}>
                      Enable All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleSection("admin", false)}>
                      Disable All
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sidebarItems.filter(item => item.section === "admin").map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <Label htmlFor={item.key}>{item.label}</Label>
                      </div>
                      <Switch
                        id={item.key}
                        checked={sidebarVisibility[item.key]}
                        onCheckedChange={() => toggleSidebarItem(item.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* L83 Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>L83 Tools Visibility</CardTitle>
              <CardDescription>
                Control which L83 Tools are available to users. Disabled tools will be hidden
                from the tools section in user profiles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline">
                  {Object.values(l83ToolsVisibility).filter(Boolean).length}/{l83Tools.length} tools enabled
                </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleAllL83Tools(true)}>
                    Enable All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleAllL83Tools(false)}>
                    Disable All
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {l83Tools.map(tool => (
                  <div key={tool.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <tool.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label htmlFor={tool.key} className="font-medium">{tool.label}</Label>
                        <p className="text-sm text-muted-foreground">{tool.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={tool.key}
                      checked={l83ToolsVisibility[tool.key]}
                      onCheckedChange={() => toggleL83Tool(tool.key)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Alignable Integration
              </CardTitle>
              <CardDescription>
                Configure API credentials for Alignable business networking platform.
                These keys enable connection with the Alignable API for content exchange and networking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="alignable-api-key">Alignable API Key</Label>
                  <Input
                    id="alignable-api-key"
                    type="password"
                    placeholder="Enter your Alignable API key"
                    value={apiKeys.alignable}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateApiKey("alignable", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API key from the{" "}
                    <a 
                      href="https://developers.alignable.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Alignable Developer Portal
                    </a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alignable-access-token">Alignable Access Token (OAuth)</Label>
                  <Input
                    id="alignable-access-token"
                    type="password"
                    placeholder="Enter OAuth access token (optional)"
                    value={apiKeys.alignableAccessToken}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateApiKey("alignableAccessToken", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    OAuth token provides full access including posting and messaging. Required for complete integration.
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Integration Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Business profile synchronization</li>
                    <li>• Network connection management</li>
                    <li>• Content posting and engagement</li>
                    <li>• Recommendation exchange</li>
                    <li>• Direct messaging capabilities</li>
                    <li>• Analytics and insights</li>
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium">Connection Status</p>
                    <p className="text-xs text-muted-foreground">
                      {apiKeys.alignable || apiKeys.alignableAccessToken 
                        ? "Credentials configured. Test connection in the Alignable admin panel."
                        : "No credentials configured. Add API key to enable integration."}
                    </p>
                  </div>
                  <Badge variant={apiKeys.alignable || apiKeys.alignableAccessToken ? "default" : "secondary"}>
                    {apiKeys.alignable || apiKeys.alignableAccessToken ? "Configured" : "Not Configured"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Placeholder for future integrations */}
          <Card className="opacity-75">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Future Integrations
              </CardTitle>
              <CardDescription>
                Additional third-party integrations coming soon.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { name: "LinkedIn API", status: "Planned", desc: "Professional networking and content sharing" },
                  { name: "Facebook Business", status: "Planned", desc: "Social media management and analytics" },
                  { name: "Twitter/X API", status: "Planned", desc: "Social engagement and monitoring" },
                  { name: "Yelp API", status: "Planned", desc: "Review management and business listings" },
                  { name: "Google Business", status: "Planned", desc: "Business profile and review management" },
                  { name: "HubSpot", status: "Planned", desc: "CRM and marketing automation" },
                ].map((integration) => (
                  <div key={integration.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{integration.name}</span>
                      <Badge variant="outline">{integration.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{integration.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
