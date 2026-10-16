"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Upload,
  FileText,
  Database,
  Sparkles,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Bot,
  FolderPlus,
} from "lucide-react";
import { adamsFetch, adamsFetchJson } from "@/lib/adams-harness/client-api";
import type { GBrainPageType } from "@/lib/adams-harness/types";

export interface WizardBrainOption {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  audience: "department" | "admins";
}

export interface WizardDepartmentOption {
  id: string;
  name: string;
}

interface AdamsBrainImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brains: WizardBrainOption[];
  departments: WizardDepartmentOption[];
  defaultBrainId?: string;
  onCompleted: (brainId: string) => Promise<void> | void;
}

const PLATFORM_CONNECTORS = [
  {
    id: "approved_specifications",
    label: "Approved Solution Specifications",
    desc: "All approved 15-topic process specifications for this department",
  },
  {
    id: "module_definitions",
    label: "Solution Module Schemas",
    desc: "Fields, forms, and workflows for deployed Solution App Workspaces",
  },
  {
    id: "module_records",
    label: "Live Solution Module Records",
    desc: "Active records, extended attributes, and notes inside Solution Apps",
  },
  {
    id: "site_calendars",
    label: "Company Safety Calendars",
    desc: "Bilingual jobsite safety calendar schedules and events",
  },
  {
    id: "user_assets",
    label: "Assigned Equipment & User Assets",
    desc: "Company-wide laptops, cell phones, iPads, vehicles, and hotspots",
  },
  {
    id: "user_training_certs",
    label: "Workforce Training & Certifications",
    desc: "Uploaded training records, issuing organizations, and expiration dates",
  },
  {
    id: "command_control_projects",
    label: "Command Control Opportunities & Projects",
    desc: "Active pipeline pursuits, values, stages, and construction projects",
  },
  {
    id: "system_docs",
    label: "Platform System Documentation",
    desc: "Complete Adams Platform architecture and step-by-step usage guides",
  },
];

export function AdamsBrainImportWizard({
  open,
  onOpenChange,
  brains,
  departments,
  defaultBrainId,
  onCompleted,
}: AdamsBrainImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Repository selection or creation
  const [repoMode, setRepoMode] = useState<"existing" | "new">(
    brains.length > 0 ? "existing" : "new",
  );
  const [selectedBrainId, setSelectedBrainId] = useState<string>(
    defaultBrainId || brains[0]?.id || "",
  );
  const [newRepoForm, setNewRepoForm] = useState({
    name: "",
    description: "",
    departmentId: departments[0]?.id || "safety",
    audience: "department" as "department" | "admins",
    hermesWorkspacePath: "",
  });

  // Step 2: Data Import Sources
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [includePastedPage, setIncludePastedPage] = useState(false);
  const [pastedPage, setPastedPage] = useState({
    title: "",
    pageType: "sop" as GBrainPageType,
    tags: "hermes, adams-electric",
    compiledTruth: "",
    timelineNotes: "",
  });
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>([]);

  // Step 3: Hermes & Channel Grounding Options
  const [syncToHermesHarness, setSyncToHermesHarness] = useState(true);
  const [enableTelegramGrounding, setEnableTelegramGrounding] = useState(true);
  const [enableTeamsGrounding, setEnableTeamsGrounding] = useState(true);

  // Step 4: Execution & Results
  const [running, setRunning] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [completedResult, setCompletedResult] = useState<{
    brainId: string;
    brainName: string;
    importedSources: number;
    totalPagesInHermes: number;
    totalChunksInHermes: number;
    hermesWorkspacePath?: string | null;
  } | null>(null);

  const resetWizard = () => {
    setStep(1);
    setFilesToUpload([]);
    setIncludePastedPage(false);
    setPastedPage({
      title: "",
      pageType: "sop",
      tags: "hermes, adams-electric",
      compiledTruth: "",
      timelineNotes: "",
    });
    setSelectedConnectors([]);
    setProgressValue(0);
    setProgressLogs([]);
    setCompletedResult(null);
  };

  const toggleConnector = (id: string) => {
    setSelectedConnectors((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const canProceedStep1 =
    repoMode === "existing"
      ? Boolean(selectedBrainId)
      : Boolean(newRepoForm.name.trim() && newRepoForm.departmentId);

  const totalSelectedSources =
    filesToUpload.length +
    (includePastedPage &&
    pastedPage.title.trim() &&
    pastedPage.compiledTruth.trim()
      ? 1
      : 0) +
    selectedConnectors.length;

  const handleRunImportAndSync = async () => {
    setStep(4);
    setRunning(true);
    setProgressValue(10);
    setProgressLogs([]);
    const appendLog = (msg: string) =>
      setProgressLogs((prev) => [...prev, msg]);

    try {
      let targetBrainId = selectedBrainId;
      let targetBrainName =
        brains.find((b) => b.id === selectedBrainId)?.name || "Repository";

      // 1. Create repository if "new" mode was chosen
      if (repoMode === "new") {
        appendLog(`Creating new ABrAIn / GBrain repository "${newRepoForm.name.trim()}"...`);
        const slug = newRepoForm.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
        const created = await adamsFetchJson<{
          brain: { id: string; name: string };
        }>("/api/adams-harness/brains", {
          method: "POST",
          body: JSON.stringify({
            name: newRepoForm.name.trim(),
            description:
              newRepoForm.description.trim() ||
              `AdamsBrain / GBrain repository for ${newRepoForm.name.trim()}`,
            departmentId: newRepoForm.departmentId,
            audience: newRepoForm.audience,
            ownerIds: [],
            gbrainRepo: {
              enabled: true,
              githubRepo: "bstitt-adams/AdamsHarnessPlatform",
              branch: "main",
              basePath: `gbrain/${slug || newRepoForm.departmentId}`,
              hermesWorkspacePath: newRepoForm.hermesWorkspacePath.trim(),
              telegramEnabled: enableTelegramGrounding,
              teamsEnabled: enableTeamsGrounding,
            },
          }),
        });
        targetBrainId = created.brain.id;
        targetBrainName = created.brain.name;
        setSelectedBrainId(targetBrainId);
        appendLog(`Created repository "${targetBrainName}" (${targetBrainId}).`);
      }

      setProgressValue(25);
      let importedCount = 0;

      // 2. Upload files (.pdf, .docx, .md, .txt, .csv, .json)
      for (const file of filesToUpload) {
        appendLog(`Uploading & chunking file "${file.name}"...`);
        const form = new FormData();
        form.append("file", file);
        const res = await adamsFetch(
          `/api/adams-harness/brains/${encodeURIComponent(targetBrainId)}/sources/upload`,
          { method: "POST", body: form },
        );
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          appendLog(
            `Warning: Could not ingest "${file.name}": ${errBody.error || res.status}`,
          );
        } else {
          importedCount++;
          appendLog(`Indexed "${file.name}" into GBrain chunks.`);
        }
      }

      setProgressValue(50);

      // 3. Save pasted SOP / FAQ / Knowledge page
      if (
        includePastedPage &&
        pastedPage.title.trim() &&
        pastedPage.compiledTruth.trim()
      ) {
        appendLog(`Indexing structured GBrain page "${pastedPage.title.trim()}"...`);
        await adamsFetchJson(
          `/api/adams-harness/brains/${encodeURIComponent(targetBrainId)}/sources/gbrain-page`,
          {
            method: "POST",
            body: JSON.stringify({
              title: pastedPage.title.trim(),
              pageType: pastedPage.pageType,
              tags: pastedPage.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
              compiledTruth: pastedPage.compiledTruth.trim(),
              timelineNotes: pastedPage.timelineNotes.trim() || undefined,
            }),
          },
        );
        importedCount++;
        appendLog(`Saved GBrain page "${pastedPage.title.trim()}".`);
      }

      setProgressValue(75);

      // 4. Import selected Adams Platform connectors
      for (const connector of selectedConnectors) {
        const label =
          PLATFORM_CONNECTORS.find((c) => c.id === connector)?.label || connector;
        appendLog(`Importing live platform dataset: ${label}...`);
        const res = await adamsFetchJson<{ synced: number }>(
          `/api/adams-harness/brains/${encodeURIComponent(targetBrainId)}/sources/platform`,
          {
            method: "POST",
            body: JSON.stringify({ connector }),
          },
        );
        importedCount += res.synced || 0;
        appendLog(`Synced ${res.synced || 0} document(s) from ${label}.`);
      }

      setProgressValue(90);

      // 5. Compile & Store in Hermes Harness
      let totalPagesInHermes = importedCount;
      let totalChunksInHermes = 0;
      let hermesWorkspacePath: string | null = null;

      if (syncToHermesHarness) {
        appendLog(
          "Compiling RESOLVER.md + HERMES_MEMORY.json and storing repository in Hermes Harness...",
        );
        const syncRes = await adamsFetchJson<{
          pagesCount: number;
          chunksCount: number;
          hermesWorkspacePath?: string | null;
        }>(
          `/api/adams-harness/brains/${encodeURIComponent(targetBrainId)}/sync-hermes`,
          { method: "POST" },
        );
        totalPagesInHermes = syncRes.pagesCount;
        totalChunksInHermes = syncRes.chunksCount;
        hermesWorkspacePath = syncRes.hermesWorkspacePath || null;
        appendLog(
          `Stored ${syncRes.pagesCount} GBrain page(s) (${syncRes.chunksCount} chunks) in Hermes Harness.`,
        );
      }

      setProgressValue(100);
      setCompletedResult({
        brainId: targetBrainId,
        brainName: targetBrainName,
        importedSources: importedCount,
        totalPagesInHermes,
        totalChunksInHermes,
        hermesWorkspacePath,
      });
      toast.success(
        `Repository "${targetBrainName}" imported and stored in Hermes Harness`,
      );
      await onCompleted(targetBrainId);
    } catch (error) {
      console.error("Wizard import error:", error);
      appendLog(
        `Error: ${error instanceof Error ? error.message : "Import failed"}`,
      );
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetWizard();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[740px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-5 w-5 text-primary" />
            AdamsBrain (ABrAIn / GBrain) Data Import &amp; Hermes Wizard
          </DialogTitle>
          <DialogDescription>
            Step {step} of 4 — Import documents, datasets, or live platform modules into a GBrain repository and store them in Hermes for instant chat, Telegram, and Microsoft Teams access.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator Pills */}
        <div className="grid grid-cols-4 gap-2 py-2 border-b text-xs">
          {[
            { num: 1, label: "1. Repository" },
            { num: 2, label: "2. Import Sources" },
            { num: 3, label: "3. Hermes & Channels" },
            { num: 4, label: "4. Store & Chat" },
          ].map((s) => (
            <div
              key={s.num}
              className={`rounded-md px-2.5 py-1.5 font-medium text-center ${
                step === s.num
                  ? "bg-primary text-primary-foreground"
                  : step > s.num
                    ? "bg-green-500/15 text-green-700 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* STEP 1: Select or Create Repository */}
        {step === 1 && (
          <div className="space-y-4 py-3">
            <div className="flex gap-2">
              {brains.length > 0 && (
                <Button
                  type="button"
                  variant={repoMode === "existing" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRepoMode("existing")}
                >
                  <Database className="mr-1.5 h-4 w-4" />
                  Use Existing Repository ({brains.length})
                </Button>
              )}
              <Button
                type="button"
                variant={repoMode === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setRepoMode("new")}
              >
                <FolderPlus className="mr-1.5 h-4 w-4" />
                Create New Repository
              </Button>
            </div>

            {repoMode === "existing" && brains.length > 0 ? (
              <div className="space-y-3">
                <Label>Select Target ABrAIn / GBrain Repository</Label>
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {brains.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBrainId(b.id)}
                      className={`text-left rounded-lg border p-3 transition-colors ${
                        selectedBrainId === b.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{b.name}</span>
                        <Badge variant="outline">{b.departmentId}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {b.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                <div className="space-y-1.5">
                  <Label>New Repository Name *</Label>
                  <Input
                    value={newRepoForm.name}
                    onChange={(e) =>
                      setNewRepoForm({ ...newRepoForm, name: e.target.value })
                    }
                    placeholder="e.g. Safety SOPs & OSHA Field Manual, Preconstruction Specs, Equipment Data"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Owning Department *</Label>
                    <Select
                      value={newRepoForm.departmentId}
                      onValueChange={(v) =>
                        setNewRepoForm({ ...newRepoForm, departmentId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
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
                  <div className="space-y-1.5">
                    <Label>Access Audience</Label>
                    <Select
                      value={newRepoForm.audience}
                      onValueChange={(v) =>
                        setNewRepoForm({
                          ...newRepoForm,
                          audience: v as "department" | "admins",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department">
                          All Department Members + Hermes / Telegram / Teams
                        </SelectItem>
                        <SelectItem value="admins">Admins Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Repository Description</Label>
                  <Textarea
                    rows={2}
                    value={newRepoForm.description}
                    onChange={(e) =>
                      setNewRepoForm({
                        ...newRepoForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe the SOPs, datasets, or procedures stored in this repository..."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Choose Data Sources to Import */}
        {step === 2 && (
          <div className="space-y-5 py-3">
            {/* Option A: File Upload */}
            <div className="space-y-2 border rounded-lg p-3.5">
              <div className="flex items-center justify-between">
                <Label className="font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  1. Upload Files &amp; Datasets (.pdf, .docx, .md, .txt, .csv, .json)
                </Label>
                {filesToUpload.length > 0 && (
                  <Badge>{filesToUpload.length} file(s) queued</Badge>
                )}
              </div>
              <Input
                type="file"
                multiple
                accept=".pdf,.docx,.md,.txt,.csv,.json"
                onChange={(e) => {
                  const list = e.target.files ? Array.from(e.target.files) : [];
                  setFilesToUpload(list);
                }}
              />
              {filesToUpload.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {filesToUpload.map((f, idx) => (
                    <Badge key={`${f.name}-${idx}`} variant="secondary" className="text-xs">
                      {f.name} ({Math.round(f.size / 1024)} KB)
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Option B: Paste Structured SOP / FAQ / Raw Knowledge */}
            <div className="space-y-3 border rounded-lg p-3.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 font-semibold text-sm cursor-pointer">
                  <Checkbox
                    checked={includePastedPage}
                    onCheckedChange={(v) => setIncludePastedPage(Boolean(v))}
                  />
                  <FileText className="h-4 w-4 text-primary" />
                  2. Paste SOP, FAQ, or Raw Data Entry
                </label>
              </div>
              {includePastedPage && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Page / Entry Title *</Label>
                      <Input
                        value={pastedPage.title}
                        onChange={(e) =>
                          setPastedPage({ ...pastedPage, title: e.target.value })
                        }
                        placeholder="e.g. Lockout/Tagout SOP or Vendor Contacts"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">GBrain Page Type</Label>
                      <Select
                        value={pastedPage.pageType}
                        onValueChange={(v) =>
                          setPastedPage({
                            ...pastedPage,
                            pageType: v as GBrainPageType,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sop">
                            Standard Operating Procedure (SOP)
                          </SelectItem>
                          <SelectItem value="faq">
                            Frequently Asked Question (FAQ)
                          </SelectItem>
                          <SelectItem value="module_reference">
                            System / Module Reference
                          </SelectItem>
                          <SelectItem value="entity">
                            Entity / Project / Dataset
                          </SelectItem>
                          <SelectItem value="document">
                            General Knowledge Document
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Compiled Truth / Content (Markdown, Steps, Q&amp;A, or JSON) *
                    </Label>
                    <Textarea
                      rows={4}
                      value={pastedPage.compiledTruth}
                      onChange={(e) =>
                        setPastedPage({
                          ...pastedPage,
                          compiledTruth: e.target.value,
                        })
                      }
                      placeholder="Paste your SOP steps, FAQ answers, or structured reference data..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Option C: Live Adams Platform Datasets */}
            <div className="space-y-2.5 border rounded-lg p-3.5">
              <div className="flex items-center justify-between">
                <Label className="font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  3. Import Live Adams Platform Datasets into Repository
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    setSelectedConnectors(
                      selectedConnectors.length === PLATFORM_CONNECTORS.length
                        ? []
                        : PLATFORM_CONNECTORS.map((c) => c.id),
                    )
                  }
                >
                  {selectedConnectors.length === PLATFORM_CONNECTORS.length
                    ? "Clear All"
                    : "Select All 8 Datasets"}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {PLATFORM_CONNECTORS.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-start gap-2.5 rounded-md border p-2.5 text-xs cursor-pointer transition-colors ${
                      selectedConnectors.includes(c.id)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <Checkbox
                      checked={selectedConnectors.includes(c.id)}
                      onCheckedChange={() => toggleConnector(c.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium">{c.label}</div>
                      <div className="text-muted-foreground text-[11px]">
                        {c.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Configure Hermes Harness & Telegram / Teams Grounding */}
        {step === 3 && (
          <div className="space-y-4 py-3">
            <div className="rounded-lg border p-4 bg-muted/20 space-y-2">
              <div className="text-sm font-semibold">Import Summary</div>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>
                  • <strong>Target Repository:</strong>{" "}
                  {repoMode === "new"
                    ? `${newRepoForm.name} (New — ${newRepoForm.departmentId})`
                    : brains.find((b) => b.id === selectedBrainId)?.name}
                </li>
                <li>
                  • <strong>Files Queued:</strong> {filesToUpload.length} file(s)
                </li>
                <li>
                  • <strong>Structured GBrain Entry:</strong>{" "}
                  {includePastedPage && pastedPage.title.trim()
                    ? pastedPage.title
                    : "None"}
                </li>
                <li>
                  • <strong>Platform Datasets Selected:</strong>{" "}
                  {selectedConnectors.length} connector(s)
                </li>
              </ul>
            </div>

            <div className="space-y-3 border rounded-lg p-4">
              <div className="font-semibold text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Hermes Harness &amp; Messaging Channel Grounding
              </div>

              <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                <Checkbox
                  checked={syncToHermesHarness}
                  onCheckedChange={(v) => setSyncToHermesHarness(Boolean(v))}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium">
                    Compile &amp; Store in Hermes Harness (`RESOLVER.md` + `HERMES_MEMORY.json`)
                  </div>
                  <div className="text-muted-foreground">
                    Automatically compiles all repository pages into the opinionated GBrain format, writes to the Hermes memory directory when local, and exposes `/api/public/gbrain` for the Hermes Harness.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                <Checkbox
                  checked={enableTelegramGrounding}
                  onCheckedChange={(v) => setEnableTelegramGrounding(Boolean(v))}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium">
                    Enable Telegram Bot Grounding
                  </div>
                  <div className="text-muted-foreground">
                    Allows linked Adams Electric Telegram users to query this repository directly in chat.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                <Checkbox
                  checked={enableTeamsGrounding}
                  onCheckedChange={(v) => setEnableTeamsGrounding(Boolean(v))}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium">
                    Enable Microsoft Teams Grounding
                  </div>
                  <div className="text-muted-foreground">
                    Allows Microsoft Teams users to ask questions grounded in this repository via Hermes.
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* STEP 4: Execution & Completion */}
        {step === 4 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>
                  {running
                    ? "Importing data & syncing with Hermes Harness..."
                    : "Import & Hermes Sync Complete"}
                </span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>

            <div className="rounded-lg border bg-black/90 text-emerald-400 font-mono text-xs p-3 max-h-48 overflow-y-auto space-y-1">
              {progressLogs.map((log, i) => (
                <div key={i}>&gt; {log}</div>
              ))}
              {running && (
                <div className="flex items-center gap-2 text-sky-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing...
                </div>
              )}
            </div>

            {completedResult && (
              <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Stored in Hermes Harness: {completedResult.brainName}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total Indexed Sources:{" "}
                  <strong>{completedResult.totalPagesInHermes}</strong> · Total
                  GBrain Chunks:{" "}
                  <strong>{completedResult.totalChunksInHermes}</strong>
                  {completedResult.hermesWorkspacePath
                    ? ` · Local Hermes Path: ${completedResult.hermesWorkspacePath}`
                    : ""}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between gap-2">
          {step > 1 && step < 4 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step === 1 && (
              <Button
                type="button"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
              >
                Next: Select Data Sources
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                disabled={totalSelectedSources === 0 && repoMode === "existing"}
                onClick={() => setStep(3)}
              >
                Next: Hermes &amp; Channel Settings
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}

            {step === 3 && (
              <Button
                type="button"
                onClick={() => void handleRunImportAndSync()}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Import &amp; Store in Hermes
              </Button>
            )}

            {step === 4 && !running && (
              <Button
                type="button"
                onClick={() => {
                  resetWizard();
                  onOpenChange(false);
                }}
              >
                <MessageSquare className="mr-1.5 h-4 w-4" />
                Chat with Repository Now
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
