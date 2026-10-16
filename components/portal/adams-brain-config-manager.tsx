"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Loader2,
  Plus,
  Upload,
  FileText,
  RefreshCw,
  GitBranch,
  Copy,
  Key,
  Database,
  CheckCircle2,
  Sparkles,
  Download,
} from "lucide-react";
import { adamsFetch, adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";
import type { GBrainPageType, GBrainRepoConfig } from "@/lib/adams-harness/types";
import { AdamsBrainImportWizard } from "@/components/portal/adams-brain-import-wizard";

type BrainItem = {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  audience: "department" | "admins";
  isActive: boolean;
  ownerIds: string[];
  gbrainRepo?: GBrainRepoConfig;
};

type BrainSource = {
  id: string;
  type: string;
  connector?: string;
  pageType?: GBrainPageType;
  slug?: string;
  tags?: string[];
  compiledTruth?: string;
  timelineNotes?: string;
  markdownContent?: string;
  title: string;
  version: number;
  status: string;
  chunkCount: number;
  refreshedAt?: string;
  failureReason?: string;
};

type Department = {
  id: string;
  name: string;
  ownerIds?: string[];
  memberIds?: string[];
};

type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  emailPrimary: string;
};

type BrainHealth = {
  storage?: { configured: boolean };
  hermes?: { configured: boolean; healthy: boolean };
  parsers?: { pdf: boolean; docx: boolean; text: boolean };
};

const CONNECTORS = [
  { id: "approved_specifications", label: "Approved Solution Specifications" },
  { id: "module_definitions", label: "Solution Module Schemas" },
  { id: "module_records", label: "Live Solution Module Records" },
  { id: "site_calendars", label: "Company Safety Calendars" },
  { id: "user_assets", label: "Assigned User Assets Inventory" },
  { id: "user_training_certs", label: "Workforce Training & Certifications" },
  { id: "command_control_projects", label: "Command Control Opportunities & Projects" },
  { id: "system_docs", label: "Platform System Documentation" },
];

const PAGE_TYPES: { value: GBrainPageType; label: string; desc: string }[] = [
  { value: "sop", label: "Standard Operating Procedure (SOP)", desc: "Step-by-step operational procedures" },
  { value: "faq", label: "Frequently Asked Question (FAQ)", desc: "Commonly asked questions and verified answers" },
  { value: "module_reference", label: "System / Module Reference", desc: "Documentation for a platform module or workflow" },
  { value: "entity", label: "Entity / Project / Vendor Profile", desc: "GBrain entity page with compiled truth + timeline" },
  { value: "document", label: "General Knowledge Document", desc: "General reference note or policy" },
];

export function AdamsBrainConfigManager() {
  const { isLoading, isAuthenticated } = useUserProfile();
  const [brains, setBrains] = useState<BrainItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selected, setSelected] = useState<BrainItem | null>(null);
  const [sources, setSources] = useState<BrainSource[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [health, setHealth] = useState<BrainHealth | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Create new Brain Repository form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newAudience, setNewAudience] = useState<"department" | "admins">("department");
  const [newOwners, setNewOwners] = useState<string[]>([]);
  const [newGithubRepo, setNewGithubRepo] = useState("bstitt-adams/AdamsHarnessPlatform");
  const [newBasePath, setNewBasePath] = useState("gbrain/safety");

  // Author GBrain SOP / FAQ / Markdown page form
  const [pageForm, setPageForm] = useState({
    title: "",
    slug: "",
    pageType: "sop" as GBrainPageType,
    tags: "",
    compiledTruth: "",
    timelineNotes: "",
  });

  // GBrain Repo Sync settings for selected brain
  const [repoSettings, setRepoSettings] = useState<GBrainRepoConfig>({
    enabled: true,
    githubRepo: "bstitt-adams/AdamsHarnessPlatform",
    branch: "main",
    basePath: "gbrain/general",
    hermesWorkspacePath: "",
    apiKey: "",
  });

  const departmentMembers = (() => {
    const dept = departments.find((d) => d.id === newDepartment);
    if (!dept) return teamMembers;
    const allowed = new Set([
      ...(dept.ownerIds ?? []),
      ...(dept.memberIds ?? []),
    ]);
    const filtered = teamMembers.filter((tm) => allowed.has(tm.id));
    return filtered.length > 0 ? filtered : teamMembers;
  })();

  const selectDepartment = (id: string) => {
    setNewDepartment(id);
    setNewBasePath(`gbrain/${id}`);
  };

  const loadBrains = useCallback(async () => {
    const data = await adamsFetchJson<{ brains: BrainItem[] }>(
      "/api/adams-harness/brains",
    );
    return data.brains;
  }, []);

  const loadBrainDetail = useCallback(async (id: string) => {
    const data = await adamsFetchJson<{
      brain: BrainItem;
      capabilities: { canQuery: boolean; canManage: boolean };
      sources: BrainSource[];
    }>(`/api/adams-harness/brains/${encodeURIComponent(id)}`);
    setSelected(data.brain);
    setSources(data.sources);
    setCanManage(data.capabilities.canManage);
    setRepoSettings({
      enabled: data.brain.gbrainRepo?.enabled ?? true,
      githubRepo:
        data.brain.gbrainRepo?.githubRepo || "bstitt-adams/AdamsHarnessPlatform",
      branch: data.brain.gbrainRepo?.branch || "main",
      basePath:
        data.brain.gbrainRepo?.basePath || `gbrain/${data.brain.departmentId}`,
      hermesWorkspacePath: data.brain.gbrainRepo?.hermesWorkspacePath || "",
      apiKey:
        data.brain.gbrainRepo?.apiKey ||
        `gbrain_${data.brain.id.slice(0, 8)}_secret`,
      lastSyncedAt: data.brain.gbrainRepo?.lastSyncedAt,
    });
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let cancelled = false;
    Promise.all([
      loadBrains(),
      adamsFetchJson<{ departments: Department[] }>(
        "/api/adams-harness/departments",
      ).catch(() => ({ departments: [] })),
      adamsFetchJson<{ teamMembers: TeamMember[] }>(
        "/api/adams-harness/team-members",
      ).catch(() => ({ teamMembers: [] })),
      adamsFetchJson<BrainHealth>("/api/adams-harness/brains/health")
        .then((h) => setHealth(h))
        .catch(() => {}),
    ])
      .then(async ([brainList, deptData, tmData]) => {
        if (cancelled) return;
        setBrains(brainList);
        setDepartments(deptData.departments);
        setTeamMembers(tmData.teamMembers);
        if (deptData.departments[0] && !newDepartment) {
          setNewDepartment(deptData.departments[0].id);
          setNewBasePath(`gbrain/${deptData.departments[0].id}`);
        }
        if (brainList[0]) {
          await loadBrainDetail(brainList[0].id).catch(() => {});
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load AdamsBrain");
        }
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, loadBrains, loadBrainDetail, newDepartment]);

  const handleCreateBrain = async () => {
    if (!newName.trim() || !newDepartment) {
      toast.error("Enter a repository name and select a department");
      return;
    }
    setBusy(true);
    try {
      const data = await adamsFetchJson<{ brain: BrainItem }>(
        "/api/adams-harness/brains",
        {
          method: "POST",
          body: JSON.stringify({
            name: newName.trim(),
            description: newDescription.trim(),
            departmentId: newDepartment,
            ownerIds: newOwners,
            audience: newAudience,
            isActive: true,
            gbrainRepo: {
              enabled: true,
              githubRepo: newGithubRepo.trim(),
              branch: "main",
              basePath: newBasePath.trim() || `gbrain/${newDepartment}`,
            },
          }),
        },
      );
      const list = await loadBrains();
      setBrains(list);
      setNewName("");
      setNewDescription("");
      setNewOwners([]);
      await loadBrainDetail(data.brain.id);
      toast.success(`Created AdamsBrain / GBrain repository "${data.brain.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create brain");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveGBrainPage = async () => {
    if (!selected) return;
    if (!pageForm.title.trim() || !pageForm.compiledTruth.trim()) {
      toast.error("Provide a title and Compiled Truth content");
      return;
    }
    setBusy(true);
    try {
      const tags = pageForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await adamsFetchJson(
        `/api/adams-harness/brains/${encodeURIComponent(selected.id)}/sources/gbrain-page`,
        {
          method: "POST",
          body: JSON.stringify({
            title: pageForm.title.trim(),
            slug: pageForm.slug.trim() || undefined,
            pageType: pageForm.pageType,
            tags,
            compiledTruth: pageForm.compiledTruth.trim(),
            timelineNotes: pageForm.timelineNotes.trim(),
          }),
        },
      );
      setPageForm({
        title: "",
        slug: "",
        pageType: "sop",
        tags: "",
        compiledTruth: "",
        timelineNotes: "",
      });
      await loadBrainDetail(selected.id);
      toast.success("GBrain page compiled, chunked, and indexed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save GBrain page");
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFile = async (file: File | undefined) => {
    if (!selected || !file) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await adamsFetch(
        `/api/adams-harness/brains/${encodeURIComponent(selected.id)}/sources/upload`,
        { method: "POST", body: formData },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body?.error === "string" ? body.error : "Upload failed",
        );
      }
      await loadBrainDetail(selected.id);
      toast.success(`Uploaded and indexed "${file.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshConnector = async (connector: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      const data = await adamsFetchJson<{ count: number }>(
        `/api/adams-harness/brains/${encodeURIComponent(selected.id)}/sources/platform`,
        { method: "POST", body: JSON.stringify({ connector }) },
      );
      await loadBrainDetail(selected.id);
      toast.success(`Synced ${connector.replace(/_/g, " ")} (${data.count} docs)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connector sync failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveRepoConfig = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await adamsFetchJson(
        `/api/adams-harness/brains/${encodeURIComponent(selected.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ gbrainRepo: repoSettings }),
        },
      );
      await loadBrainDetail(selected.id);
      toast.success("GBrain repository & Hermes API configuration saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setBusy(false);
    }
  };

  const handleSyncToGitHub = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const data = await adamsFetchJson<{
        ok: boolean;
        syncedAt: string;
        githubSyncedCount: number;
        pages: { path: string; title: string; content: string }[];
      }>(
        `/api/adams-harness/brains/${encodeURIComponent(selected.id)}/sync-github`,
        { method: "POST" },
      );

      // Also offer a downloadable JSON/Markdown bundle if GitHub token is not set
      if (data.githubSyncedCount > 0) {
        toast.success(
          `Synced ${data.githubSyncedCount} GBrain Markdown pages to GitHub (${repoSettings.githubRepo})`,
        );
      } else {
        const bundleText = data.pages
          .map((p) => `<!-- FILE: ${p.path} -->\n${p.content}`)
          .join("\n\n========================================\n\n");
        const blob = new Blob([bundleText], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selected.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-gbrain-bundle.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(
          `Compiled ${data.pages.length} GBrain pages (including RESOLVER.md) and downloaded bundle`,
        );
      }
      await loadBrainDetail(selected.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync GBrain pages");
    } finally {
      setBusy(false);
    }
  };

  const handleSyncToHermesHarness = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await adamsFetchJson<{
        pagesCount: number;
        chunksCount: number;
      }>(
        `/api/adams-harness/brains/${encodeURIComponent(selected.id)}/sync-hermes`,
        { method: "POST" },
      );
      await loadBrainDetail(selected.id);
      toast.success(
        `Stored ${res.pagesCount} page(s) (${res.chunksCount} chunks) in Hermes Harness`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync to Hermes");
    } finally {
      setBusy(false);
    }
  };

  const handleRetireSource = async (sourceId: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await adamsFetchJson(
        `/api/adams-harness/brains/${encodeURIComponent(selected.id)}/sources/${encodeURIComponent(sourceId)}`,
        { method: "PATCH", body: JSON.stringify({ status: "retired" }) },
      );
      await loadBrainDetail(selected.id);
      toast.success("Source retired");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retire source");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || (isAuthenticated && fetching)) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const gbrainEndpointUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/gbrain`
      : "/api/public/gbrain";

  return (
    <div className="space-y-6">
      {/* Header & Health Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AdamsBrain &amp; GBrain Configuration
          </h2>
          <p className="text-sm text-muted-foreground">
            Create GBrain repositories (<span className="font-mono text-xs">garrytan/gbrain</span> structure), author SOPs &amp; FAQs, upload documents, ingest live platform modules, and expose knowledge to Hermes Agent.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setWizardOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Data Import &amp; Hermes Wizard
          </Button>
          {selected && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void handleSyncToHermesHarness()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Store in Hermes Harness
            </Button>
          )}
          {health && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge variant={health.hermes?.healthy ? "default" : "secondary"}>
                Hermes: {health.hermes?.healthy ? "Connected" : "Direct Index Mode"}
              </Badge>
              <Badge variant="outline">PDF / DOCX / CSV / JSON / MD Ready</Badge>
            </div>
          )}
        </div>
      </div>

      <AdamsBrainImportWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        brains={brains}
        departments={departments}
        defaultBrainId={selected?.id || brains[0]?.id}
        onCompleted={async (targetId) => {
          const list = await loadBrains();
          setBrains(list);
          await loadBrainDetail(targetId);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Repositories List + Create New Brain */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                AdamsBrain / GBrain Repositories ({brains.length})
              </CardTitle>
              <CardDescription>
                Select a repository to manage SOPs, FAQs, uploads, and Hermes sync.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {brains.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => void loadBrainDetail(b.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selected?.id === b.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{b.name}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {b.departmentId}
                    </Badge>
                  </div>
                  {b.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {b.description}
                    </p>
                  )}
                </button>
              ))}
              {brains.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No AdamsBrain repositories created yet. Create one below.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Create New GBrain Repository
              </CardTitle>
              <CardDescription>
                Create a dedicated knowledge brain for FAQs, SOPs, or department modules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Repository Name *</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Safety SOPs & Field FAQs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Standard operating procedures and common questions"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Department *</Label>
                  <Select value={newDepartment} onValueChange={selectDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Audience</Label>
                  <Select
                    value={newAudience}
                    onValueChange={(v) => setNewAudience(v as "department" | "admins")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="department">All Department Users</SelectItem>
                      <SelectItem value="admins">Admins Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">GBrain Subfolder Path</Label>
                <Input
                  value={newBasePath}
                  onChange={(e) => setNewBasePath(e.target.value)}
                  placeholder="gbrain/safety"
                />
              </div>

              {departmentMembers.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Repository Owners (optional)</Label>
                  <div className="max-h-28 space-y-1 overflow-y-auto rounded border p-2">
                    {departmentMembers.map((tm) => (
                      <label key={tm.id} className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={newOwners.includes(tm.id)}
                          onCheckedChange={(checked) =>
                            setNewOwners((prev) =>
                              checked === true
                                ? [...prev, tm.id]
                                : prev.filter((id) => id !== tm.id),
                            )
                          }
                        />
                        {tm.firstName} {tm.lastName}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => void handleCreateBrain()}
                disabled={busy || !newName.trim() || !newDepartment}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create GBrain Repository
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right 8 Columns: Selected Repository Workspace */}
        <div className="lg:col-span-8">
          {!selected ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Select or create an AdamsBrain / GBrain repository on the left to configure SOPs, FAQs, document uploads, and Hermes integration.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="border-b">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{selected.name}</CardTitle>
                      <Badge variant={selected.isActive ? "default" : "secondary"}>
                        {selected.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {selected.description || `Department: ${selected.departmentId}`} · {sources.length} indexed knowledge sources
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void handleSyncToGitHub()}
                  >
                    <GitBranch className="mr-1.5 h-4 w-4" />
                    Compile &amp; Sync GBrain Markdown
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <Tabs defaultValue="author" className="space-y-6">
                  <TabsList className="flex-wrap h-auto gap-1">
                    <TabsTrigger value="author">
                      <FileText className="mr-1.5 h-4 w-4" />
                      Author SOP / FAQ Page
                    </TabsTrigger>
                    <TabsTrigger value="upload">
                      <Upload className="mr-1.5 h-4 w-4" />
                      Upload Documents &amp; Module Sync
                    </TabsTrigger>
                    <TabsTrigger value="sources">
                      <Database className="mr-1.5 h-4 w-4" />
                      Indexed Pages ({sources.length})
                    </TabsTrigger>
                    <TabsTrigger value="hermes-sync">
                      <Key className="mr-1.5 h-4 w-4" />
                      GBrain GitHub &amp; Hermes API
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Author GBrain SOP / FAQ / Entity Page */}
                  <TabsContent value="author" className="space-y-4">
                    <div className="rounded-lg border p-4 bg-muted/20 space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Create GBrain Structured Knowledge Page
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Follows the <span className="font-mono">garrytan/gbrain</span> opinionated Markdown convention: YAML frontmatter + <strong>Compiled Truth</strong> (current authoritative procedure/answer) + append-only <strong>Timeline &amp; Evidence</strong>.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Page Type *</Label>
                          <Select
                            value={pageForm.pageType}
                            onValueChange={(v) =>
                              setPageForm({ ...pageForm, pageType: v as GBrainPageType })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAGE_TYPES.map((pt) => (
                                <SelectItem key={pt.value} value={pt.value}>
                                  {pt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Tags (comma-separated)</Label>
                          <Input
                            value={pageForm.tags}
                            onChange={(e) =>
                              setPageForm({ ...pageForm, tags: e.target.value })
                            }
                            placeholder="sop, lockout-tagout, safety, faq"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-2 space-y-1.5">
                          <Label className="text-xs">Title / Question *</Label>
                          <Input
                            value={pageForm.title}
                            onChange={(e) =>
                              setPageForm({ ...pageForm, title: e.target.value })
                            }
                            placeholder="e.g. Lockout/Tagout (LOTO) Energized Panel Procedure"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Slug (optional)</Label>
                          <Input
                            value={pageForm.slug}
                            onChange={(e) =>
                              setPageForm({ ...pageForm, slug: e.target.value })
                            }
                            placeholder="loto-panel-procedure"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Compiled Truth (Authoritative SOP / Answer / Module Reference) *
                        </Label>
                        <Textarea
                          value={pageForm.compiledTruth}
                          onChange={(e) =>
                            setPageForm({ ...pageForm, compiledTruth: e.target.value })
                          }
                          placeholder="Write the authoritative SOP steps, FAQ answer, or module reference here..."
                          rows={6}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Timeline / Evidence / Source Notes (optional)
                        </Label>
                        <Textarea
                          value={pageForm.timelineNotes}
                          onChange={(e) =>
                            setPageForm({ ...pageForm, timelineNotes: e.target.value })
                          }
                          placeholder="e.g. Approved by Safety Director; references NFPA 70E 2024 edition."
                          rows={2}
                        />
                      </div>

                      <Button
                        onClick={() => void handleSaveGBrainPage()}
                        disabled={
                          busy ||
                          !pageForm.title.trim() ||
                          !pageForm.compiledTruth.trim()
                        }
                      >
                        {busy ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Save &amp; Index GBrain Page
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Tab 2: Upload Documents & Sync Platform Modules */}
                  <TabsContent value="upload" className="space-y-6">
                    <div className="rounded-lg border p-4 space-y-3">
                      <Label className="text-sm font-semibold">
                        Upload Documents (.pdf, .docx, .md, .txt)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Uploaded files are parsed, split into overlapping semantic chunks, and indexed in this GBrain repository.
                      </p>
                      <Input
                        type="file"
                        accept=".txt,.md,.pdf,.docx"
                        disabled={busy || !canManage}
                        onChange={(e) => void handleUploadFile(e.target.files?.[0])}
                      />
                    </div>

                    <div className="rounded-lg border p-4 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold">
                          Ingest Live Adams Platform Modules &amp; System Data
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          One-click connectors pull live records, specifications, calendars, assets, and system documentation directly into this GBrain repository so users and Hermes can query them.
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {CONNECTORS.map((c) => (
                          <Button
                            key={c.id}
                            variant="outline"
                            size="sm"
                            className="justify-start"
                            disabled={busy || !canManage}
                            onClick={() => void handleRefreshConnector(c.id)}
                          >
                            <RefreshCw className="mr-2 h-3.5 w-3.5 text-primary" />
                            Sync {c.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab 3: Indexed Pages & Sources */}
                  <TabsContent value="sources" className="space-y-3">
                    {sources.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        No documents or GBrain pages indexed in this repository yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sources.map((s) => (
                          <div
                            key={s.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3 text-sm"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{s.title}</span>
                                <Badge variant="outline">v{s.version}</Badge>
                                <Badge variant="secondary" className="uppercase text-[10px]">
                                  {s.pageType || s.connector || s.type}
                                </Badge>
                                <Badge
                                  variant={s.status === "ready" ? "default" : "outline"}
                                >
                                  {s.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {s.chunkCount} chunks
                                {s.slug ? ` · slug: ${s.slug}` : ""}
                                {s.tags?.length ? ` · tags: ${s.tags.join(", ")}` : ""}
                                {s.refreshedAt
                                  ? ` · updated ${new Date(s.refreshedAt).toLocaleString()}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {s.markdownContent && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const blob = new Blob([s.markdownContent!], {
                                      type: "text/markdown;charset=utf-8",
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `${s.slug || s.id}.md`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                >
                                  <Download className="h-3.5 w-3.5 mr-1" />
                                  .md
                                </Button>
                              )}
                              {canManage && s.status !== "retired" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => void handleRetireSource(s.id)}
                                >
                                  Retire
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab 4: GBrain GitHub Sync & Hermes API */}
                  <TabsContent value="hermes-sync" className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">GitHub GBrain Repository (owner/repo)</Label>
                        <Input
                          value={repoSettings.githubRepo || ""}
                          onChange={(e) =>
                            setRepoSettings({
                              ...repoSettings,
                              githubRepo: e.target.value,
                            })
                          }
                          placeholder="bstitt-adams/AdamsHarnessPlatform"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Branch</Label>
                        <Input
                          value={repoSettings.branch || "main"}
                          onChange={(e) =>
                            setRepoSettings({ ...repoSettings, branch: e.target.value })
                          }
                          placeholder="main"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Repository Folder Path</Label>
                        <Input
                          value={repoSettings.basePath || ""}
                          onChange={(e) =>
                            setRepoSettings({
                              ...repoSettings,
                              basePath: e.target.value,
                            })
                          }
                          placeholder={`gbrain/${selected.departmentId}`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Local Hermes GBrain Workspace Path (optional)
                        </Label>
                        <Input
                          value={repoSettings.hermesWorkspacePath || ""}
                          onChange={(e) =>
                            setRepoSettings({
                              ...repoSettings,
                              hermesWorkspacePath: e.target.value,
                            })
                          }
                          placeholder="C:\Users\BrianStitt\.hermes\gbrain"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Hermes / GBrain API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          value={repoSettings.apiKey || ""}
                          onChange={(e) =>
                            setRepoSettings({ ...repoSettings, apiKey: e.target.value })
                          }
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(repoSettings.apiKey || "");
                            toast.success("Copied GBrain API Key");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copy Key
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border p-3 bg-muted/40 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span>Query Endpoint: {gbrainEndpointUrl}?brainId={selected.id}&amp;q=...</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${gbrainEndpointUrl}?brainId=${selected.id}`,
                            );
                            toast.success("Copied GBrain endpoint URL");
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy URL
                        </Button>
                      </div>
                      <p className="text-muted-foreground font-sans">
                        Hermes Agent, Telegram, and Microsoft Teams use this endpoint with header <code className="font-mono">X-API-Key: {repoSettings.apiKey}</code> to query or write GBrain pages.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => void handleSaveRepoConfig()} disabled={busy}>
                        Save GBrain Config
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void handleSyncToGitHub()}
                        disabled={busy}
                      >
                        <GitBranch className="mr-2 h-4 w-4" />
                        Sync All Pages to GBrain Repo
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
