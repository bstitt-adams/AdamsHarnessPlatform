"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  GitBranch,
  Loader2,
  RefreshCw,
  Rocket,
  Save,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { adamsFetch, adamsFetchJson } from "@/lib/adams-harness/client-api";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface InterviewMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Interview {
  id: string;
  title: string;
  status: string;
  source?: string;
  departmentId: string;
  respondentName?: string;
  createdByName?: string;
  task?: string;
  messages: InterviewMessage[];
  unresolvedQuestions: string[];
  readyForSpecification: boolean;
  updatedAt?: string;
  createdAt?: string;
}

interface DataSharingRecommendation {
  appSlug: string;
  appName: string;
  direction: "read" | "write" | "bidirectional";
  dataEntities: string[];
  recommendation: string;
  benefit: string;
}

interface InterviewPrd {
  id: string;
  interviewId: string;
  departmentId: string;
  title: string;
  version: number;
  status: "draft" | "in_review" | "staged" | "deploying" | "deployed" | "superseded" | "archived";
  requestKind: "new_app" | "existing_app_enhancement" | "uncertain";
  targetApp?: {
    slug: string | null;
    name: string | null;
    reason: string;
    confidence: number;
  } | null;
  classificationReason: string;
  executiveSummary: string;
  content: string;
  dataSharingOpportunities: DataSharingRecommendation[];
  integrationRecommendations: { name: string; description: string }[];
  adminNotes?: string;
  requiresRegeneration?: boolean;
  canonicalHash: string;
  specificationId?: string;
  latestBuildId?: string;
  moduleSlug?: string;
  productionUrl?: string;
  deployedAt?: string;
  model?: string;
  updatedAt?: string;
}

interface AdminInterviewPayload {
  interviews: Interview[];
  departments: Department[];
  prds: InterviewPrd[];
  latestPrds: Record<string, InterviewPrd>;
}

const requestKindLabels: Record<InterviewPrd["requestKind"], string> = {
  new_app: "New App",
  existing_app_enhancement: "Enhancement",
  uncertain: "Needs Review",
};

const statusLabels: Record<InterviewPrd["status"], string> = {
  draft: "Draft",
  in_review: "In Review",
  staged: "Staged",
  deploying: "Deploying",
  deployed: "Deployed",
  superseded: "Superseded",
  archived: "Archived",
};

function statusVariant(status: InterviewPrd["status"]) {
  if (status === "deployed") return "default" as const;
  if (status === "staged") return "secondary" as const;
  if (status === "superseded" || status === "archived") return "outline" as const;
  return "secondary" as const;
}

function requestKindVariant(kind: InterviewPrd["requestKind"]) {
  if (kind === "new_app") return "default" as const;
  if (kind === "existing_app_enhancement") return "secondary" as const;
  return "outline" as const;
}

export default function AdminInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [departments, setDepartments] = useState<Map<string, Department>>(new Map());
  const [prds, setPrds] = useState<InterviewPrd[]>([]);
  const [latestPrds, setLatestPrds] = useState<Record<string, InterviewPrd>>({});
  const [selectedInterviewId, setSelectedInterviewId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [prdTitle, setPrdTitle] = useState("");
  const [prdContent, setPrdContent] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [regenerationInstructions, setRegenerationInstructions] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adamsFetchJson<AdminInterviewPayload>("/api/admin/interview-prds");
      setInterviews(data.interviews);
      setDepartments(new Map(data.departments.map((department) => [department.id, department])));
      setPrds(data.prds);
      setLatestPrds(data.latestPrds);
      if (!selectedInterviewId && data.interviews.length > 0) {
        setSelectedInterviewId(data.interviews[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  }, [selectedInterviewId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredInterviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    return interviews.filter((interview) => {
      const prd = latestPrds[interview.id];
      if (statusFilter === "with_prd" && !prd) return false;
      if (statusFilter === "without_prd" && prd) return false;
      if (statusFilter !== "all" && statusFilter !== "with_prd" && statusFilter !== "without_prd" && prd?.status !== statusFilter) {
        return false;
      }
      if (!query) return true;
      const departmentName = departments.get(interview.departmentId)?.name || interview.departmentId;
      return [
        interview.title,
        interview.respondentName,
        interview.createdByName,
        departmentName,
        interview.task,
        prd?.title,
        prd?.targetApp?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [departments, interviews, latestPrds, search, statusFilter]);

  const selectedInterview = interviews.find((interview) => interview.id === selectedInterviewId) || null;
  const selectedPrd = selectedInterview ? latestPrds[selectedInterview.id] || null : null;
  const selectedVersions = selectedInterview
    ? prds.filter((prd) => prd.interviewId === selectedInterview.id).sort((a, b) => b.version - a.version)
    : [];
  const stagedPrds = useMemo(
    () =>
      prds
        .filter((prd) => prd.status === "staged" || prd.status === "deploying" || prd.status === "deployed")
        .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")),
    [prds],
  );

  useEffect(() => {
    setPrdTitle(selectedPrd?.title || "");
    setPrdContent(selectedPrd?.content || "");
    setAdminNotes(selectedPrd?.adminNotes || "");
    setRegenerationInstructions("");
  }, [selectedPrd?.id, selectedPrd?.version]);

  const departmentName = (id: string) => departments.get(id)?.name || id;

  const generatePrd = async (interviewId: string) => {
    setBusyAction("generate");
    try {
      const data = await adamsFetchJson<{ prd: InterviewPrd }>("/api/admin/interview-prds", {
        method: "POST",
        body: JSON.stringify({ interviewId }),
      });
      toast.success(`Generated PRD v${data.prd.version}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate PRD");
    } finally {
      setBusyAction(null);
    }
  };

  const persistPrdEdits = async () => {
    if (!selectedPrd) return null;
    const data = await adamsFetchJson<{ prd: InterviewPrd }>(
      `/api/admin/interview-prds/${selectedPrd.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          title: prdTitle,
          content: prdContent,
          adminNotes,
        }),
      },
    );
    setPrds((current) => current.map((prd) => (prd.id === data.prd.id ? data.prd : prd)));
    setLatestPrds((current) => ({ ...current, [data.prd.interviewId]: data.prd }));
    return data.prd;
  };

  const savePrd = async () => {
    if (!selectedPrd) return;
    setBusyAction("save");
    try {
      await persistPrdEdits();
      toast.success("PRD changes saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save PRD");
    } finally {
      setBusyAction(null);
    }
  };

  const regeneratePrd = async () => {
    if (!selectedPrd) return;
    setBusyAction("regenerate");
    try {
      const savedPrd = await persistPrdEdits();
      if (!savedPrd) return;
      const data = await adamsFetchJson<{ prd: InterviewPrd }>(
        `/api/admin/interview-prds/${savedPrd.id}/regenerate`,
        {
          method: "POST",
          body: JSON.stringify({ instructions: regenerationInstructions }),
        },
      );
      toast.success(`Regenerated PRD as v${data.prd.version}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate PRD");
    } finally {
      setBusyAction(null);
    }
  };

  const stagePrd = async (prd: InterviewPrd) => {
    setBusyAction(`stage-${prd.id}`);
    try {
      const data = await adamsFetchJson<{ prd: InterviewPrd }>(
        `/api/admin/interview-prds/${prd.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "staged" }),
        },
      );
      toast.success(`Staged ${data.prd.title} for deployment`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to stage PRD");
    } finally {
      setBusyAction(null);
    }
  };

  const deployPrd = async (prd: InterviewPrd) => {
    if (!window.confirm(`Deploy ${prd.title} to production?`)) return;
    setBusyAction(`deploy-${prd.id}`);
    try {
      const data = await adamsFetchJson<{ prd: InterviewPrd; build: { productionUrl?: string; status: string } }>(
        `/api/admin/interview-prds/${prd.id}/deploy`,
        { method: "POST" },
      );
      toast.success(
        data.build.productionUrl
          ? `Deployed to ${data.build.productionUrl}`
          : `Deployment started (${data.build.status})`,
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to deploy PRD");
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bot className="h-6 w-6 text-primary" /> Interview PRD Manager
          </h1>
          <p className="text-sm text-muted-foreground">
            Review submitted interviews, generate platform-aware requirements, stage accepted designs, and deploy solution apps.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Submitted Interviews</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{interviews.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Generated PRDs</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{prds.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Staged / Deploying</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {prds.filter((prd) => prd.status === "staged" || prd.status === "deploying").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Deployed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{prds.filter((prd) => prd.status === "deployed").length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <Card className="min-h-[700px]">
          <CardHeader>
            <CardTitle>Submitted Interviews</CardTitle>
            <CardDescription>Organize, analyze, and select an interview for PRD generation.</CardDescription>
            <div className="grid gap-2 pt-2 sm:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, respondent, app..."
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Filter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All interviews</SelectItem>
                  <SelectItem value="without_prd">No PRD</SelectItem>
                  <SelectItem value="with_prd">Has PRD</SelectItem>
                  <SelectItem value="draft">Draft PRD</SelectItem>
                  <SelectItem value="in_review">In review</SelectItem>
                  <SelectItem value="staged">Staged</SelectItem>
                  <SelectItem value="deployed">Deployed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[590px]">
              <div className="divide-y">
                {filteredInterviews.map((interview) => {
                  const prd = latestPrds[interview.id];
                  const selected = interview.id === selectedInterviewId;
                  return (
                    <button
                      key={interview.id}
                      type="button"
                      onClick={() => setSelectedInterviewId(interview.id)}
                      className={`w-full space-y-2 p-4 text-left transition-colors ${selected ? "bg-primary/10" : "hover:bg-muted/50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{interview.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {interview.respondentName || interview.createdByName || "Unknown respondent"} · {departmentName(interview.departmentId)}
                          </p>
                        </div>
                        <Badge variant={interview.readyForSpecification ? "default" : "secondary"}>
                          {interview.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {prd ? (
                          <>
                            <Badge variant={statusVariant(prd.status)}>PRD v{prd.version} · {statusLabels[prd.status]}</Badge>
                            <Badge variant={requestKindVariant(prd.requestKind)}>
                              {requestKindLabels[prd.requestKind]}
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="outline">No PRD yet</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {interview.updatedAt ? new Date(interview.updatedAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {filteredInterviews.length === 0 && (
                  <p className="p-8 text-center text-sm text-muted-foreground">No interviews match this filter.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selectedInterview ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>{selectedInterview.title}</CardTitle>
                    <CardDescription>
                      {selectedInterview.respondentName || selectedInterview.createdByName || "Unknown respondent"} · {departmentName(selectedInterview.departmentId)} · {selectedInterview.messages.length} messages
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <Link href={`/portal/solutions/${selectedInterview.id}`}>Open Interview</Link>
                    </Button>
                    <Button
                      onClick={() => void generatePrd(selectedInterview.id)}
                      disabled={busyAction !== null}
                    >
                      {busyAction === "generate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      {selectedPrd ? "Generate New Version" : "Generate PRD"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="mb-2 text-sm font-medium">Captured request</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {selectedInterview.task || "No seeded task was provided."}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="mb-2 text-sm font-medium">Interview state</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Ready for specification</span><Badge variant={selectedInterview.readyForSpecification ? "default" : "outline"}>{selectedInterview.readyForSpecification ? "Yes" : "No"}</Badge></div>
                    <div className="flex justify-between"><span>Source</span><span className="text-muted-foreground">{selectedInterview.source || "portal"}</span></div>
                    <div className="flex justify-between"><span>Versions</span><span className="text-muted-foreground">{selectedVersions.length}</span></div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="mb-2 text-sm font-medium">Open questions</p>
                  {selectedInterview.unresolvedQuestions.length ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {selectedInterview.unresolvedQuestions.slice(0, 4).map((question) => <li key={question}>{question}</li>)}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">None recorded.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Select an interview to begin.</CardContent></Card>
          )}

          {selectedPrd ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(selectedPrd.status)}>{statusLabels[selectedPrd.status]}</Badge>
                      <Badge variant="outline">v{selectedPrd.version}</Badge>
                      {selectedPrd.requiresRegeneration && <Badge variant="destructive">Needs Regeneration</Badge>}
                      <Badge variant={requestKindVariant(selectedPrd.requestKind)}>
                        {requestKindLabels[selectedPrd.requestKind]}
                      </Badge>
                      <Badge variant="outline" className="font-mono">hash {selectedPrd.canonicalHash.slice(0, 10)}</Badge>
                    </div>
                    <CardTitle>AI Requirements Document</CardTitle>
                    <CardDescription>{selectedPrd.executiveSummary}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => void savePrd()} disabled={busyAction !== null || selectedPrd.status === "deployed"}>
                      {busyAction === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Edits
                    </Button>
                    {selectedPrd.status !== "staged" && selectedPrd.status !== "deploying" && selectedPrd.status !== "deployed" && (
                      <Button onClick={() => void stagePrd(selectedPrd)} disabled={busyAction !== null || selectedPrd.requiresRegeneration}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Accept &amp; Stage
                      </Button>
                    )}
                    {selectedPrd.status === "staged" && (
                      <Button onClick={() => void deployPrd(selectedPrd)} disabled={busyAction !== null}>
                        {busyAction?.startsWith("deploy") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                        Deploy App
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium"><GitBranch className="h-4 w-4" /> App Classification</p>
                    <p className="text-sm font-semibold">{requestKindLabels[selectedPrd.requestKind]}</p>
                    {selectedPrd.targetApp?.name && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Target: {selectedPrd.targetApp.name} ({selectedPrd.targetApp.slug}) · {Math.round((selectedPrd.targetApp.confidence || 0) * 100)}% confidence
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">{selectedPrd.classificationReason}</p>
                  </div>
                  <div className="rounded-lg border p-4 lg:col-span-2">
                    <p className="mb-2 text-sm font-medium">Data Sharing Recommendations</p>
                    {selectedPrd.dataSharingOpportunities.length ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {selectedPrd.dataSharingOpportunities.map((item) => (
                          <div key={`${item.appSlug}-${item.direction}`} className="rounded-md border p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{item.appName}</span>
                              <Badge variant="outline">{item.direction}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{item.recommendation}</p>
                            {item.dataEntities.length > 0 && (
                              <p className="mt-2 text-xs">Shared: {item.dataEntities.slice(0, 5).join(", ")}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No high-confidence sharing opportunities identified.</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="prd-title">PRD title</Label>
                      <Input id="prd-title" value={prdTitle} onChange={(event) => setPrdTitle(event.target.value)} disabled={selectedPrd.status === "deployed"} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prd-content">Editable PRD Markdown</Label>
                      <Textarea
                        id="prd-content"
                        value={prdContent}
                        onChange={(event) => setPrdContent(event.target.value)}
                        rows={24}
                        className="min-h-[560px] font-mono text-xs leading-5"
                        disabled={selectedPrd.status === "deployed"}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <Label htmlFor="admin-notes">Admin context / corrections</Label>
                      <Textarea
                        id="admin-notes"
                        value={adminNotes}
                        onChange={(event) => setAdminNotes(event.target.value)}
                        rows={7}
                        placeholder="Clarify anything the AI should preserve or change in the next regeneration."
                        disabled={selectedPrd.status === "deployed"}
                      />
                    </div>
                    <div className="rounded-lg border p-4">
                      <Label htmlFor="regenerate-instructions">Regeneration instructions</Label>
                      <Textarea
                        id="regenerate-instructions"
                        value={regenerationInstructions}
                        onChange={(event) => setRegenerationInstructions(event.target.value)}
                        rows={6}
                        placeholder="Example: treat this as an enhancement to Asset Manager and reuse Team Members, departments, and vehicle records."
                        disabled={selectedPrd.status === "deployed"}
                      />
                      <Button
                        className="mt-3 w-full"
                        variant="outline"
                        onClick={() => void regeneratePrd()}
                        disabled={busyAction !== null || selectedPrd.status === "deployed"}
                      >
                        {busyAction === "regenerate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Regenerate with Context
                      </Button>
                    </div>
                    <div className="rounded-lg border p-4 text-sm">
                      <p className="font-medium">Deployment</p>
                      <div className="mt-2 space-y-1 text-muted-foreground">
                        <p>Module: {selectedPrd.moduleSlug || "not deployed"}</p>
                        <p>Build: {selectedPrd.latestBuildId || "not started"}</p>
                        {selectedPrd.productionUrl ? (
                          <Link href={selectedPrd.productionUrl} className="text-primary underline">
                            Open production app <ArrowRight className="inline h-3 w-3" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : selectedInterview ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> No PRD generated</CardTitle>
                <CardDescription>
                  Generate a platform-aware requirements document to classify the request and prepare it for staging.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => void generatePrd(selectedInterview.id)} disabled={busyAction !== null}>
                  {busyAction === "generate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate Requirements Document
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deployment Staging</CardTitle>
          <CardDescription>Accepted PRDs waiting for production deployment or recently deployed.</CardDescription>
        </CardHeader>
        <CardContent>
          {stagedPrds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No PRDs are staged yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PRD</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target / Module</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stagedPrds.map((prd) => (
                  <TableRow key={prd.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{prd.title}</p>
                        <p className="text-xs text-muted-foreground">v{prd.version} · {departmentName(prd.departmentId)}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={requestKindVariant(prd.requestKind)}>{requestKindLabels[prd.requestKind]}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{prd.targetApp?.slug || prd.moduleSlug || "new module"}</TableCell>
                    <TableCell><Badge variant={statusVariant(prd.status)}>{statusLabels[prd.status]}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{prd.updatedAt ? new Date(prd.updatedAt).toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedInterviewId(prd.interviewId)}>Review</Button>
                        {prd.status === "staged" && (
                          <Button size="sm" onClick={() => void deployPrd(prd)} disabled={busyAction !== null}>
                            {busyAction === `deploy-${prd.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                            Deploy
                          </Button>
                        )}
                        {prd.productionUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={prd.productionUrl}>Open</Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Separator />
    </div>
  );
}
