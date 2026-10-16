"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Loader2,
  Send,
  Sparkles,
  Database,
  FileText,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Bot,
  Copy,
  Settings,
  Layers,
} from "lucide-react";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";
import { AdamsBrainImportWizard } from "@/components/portal/adams-brain-import-wizard";
import type { GBrainRepoConfig } from "@/lib/adams-harness/types";

type Brain = {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  audience: "department" | "admins";
  gbrainRepo?: GBrainRepoConfig;
};

type BrainSource = {
  id: string;
  title: string;
  type: string;
  pageType?: string;
  connector?: string;
  version: number;
  status: string;
  chunkCount: number;
  compiledTruth?: string;
};

type Department = {
  id: string;
  name: string;
};

type Citation = {
  id: string;
  sourceId: string;
  chunkId: string;
  title: string;
  version: number;
  excerpt: string;
};

type Turn = {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  insufficientEvidence: boolean;
  model?: string;
  repoName: string;
};

export default function AdamsBrainPage() {
  const { isLoading, isAuthenticated } = useUserProfile();
  const [brains, setBrains] = useState<Brain[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [brainId, setBrainId] = useState<string>("");
  const [sources, setSources] = useState<BrainSource[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [syncingHermes, setSyncingHermes] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "sources" | "channels">("chat");
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  const loadBrainsList = useCallback(async () => {
    const [bRes, dRes] = await Promise.all([
      adamsFetchJson<{ brains: Brain[] }>("/api/adams-harness/brains").catch(
        () => ({ brains: [] }),
      ),
      adamsFetchJson<{ departments: Department[] }>(
        "/api/adams-harness/departments",
      ).catch(() => ({ departments: [] })),
    ]);
    setBrains(bRes.brains || []);
    setDepartments(
      dRes.departments && dRes.departments.length > 0
        ? dRes.departments
        : [
            { id: "safety", name: "Safety & Risk Management" },
            { id: "precon", name: "Preconstruction & Estimating" },
            { id: "field-ops", name: "Field Operations" },
            { id: "it-automation", name: "IT & Platform Automation" },
          ],
    );
    return bRes.brains || [];
  }, []);

  const loadSelectedSources = useCallback(async (id: string) => {
    if (!id || id === "__all__") {
      setSources([]);
      return;
    }
    try {
      const detail = await adamsFetchJson<{
        brain: Brain;
        sources: BrainSource[];
      }>(`/api/adams-harness/brains/${encodeURIComponent(id)}`);
      setSources(detail.sources || []);
      setBrains((prev) =>
        prev.map((b) => (b.id === detail.brain.id ? detail.brain : b)),
      );
    } catch {
      setSources([]);
    }
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let cancelled = false;
    loadBrainsList()
      .then((list) => {
        if (cancelled) return;
        const initialId = list[0]?.id || "";
        setBrainId((prev) => prev || initialId);
        if (initialId) {
          void loadSelectedSources(initialId);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load AdamsBrain repositories.");
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, loadBrainsList, loadSelectedSources]);

  const handleSelectBrain = (id: string) => {
    setBrainId(id);
    void loadSelectedSources(id);
  };

  const selectedBrain = brains.find((b) => b.id === brainId) || null;
  const activeRepoName =
    brainId === "__all__"
      ? "All Active Repositories"
      : selectedBrain?.name || "Repository";

  const ask = async (customPrompt?: string) => {
    const q = (customPrompt ?? question).trim();
    if (!q || !brainId) return;
    setAsking(true);
    setError(null);
    try {
      const result = await adamsFetchJson<{
        id: string;
        answer: string;
        citations: Citation[];
        insufficientEvidence: boolean;
        model?: string;
      }>(`/api/adams-harness/brains/${encodeURIComponent(brainId)}/query`, {
        method: "POST",
        body: JSON.stringify({ question: q }),
      });
      setTurns((prev) => [
        ...prev,
        {
          id: result.id,
          question: q,
          answer: result.answer,
          citations: result.citations,
          insufficientEvidence: result.insufficientEvidence,
          model: result.model,
          repoName: activeRepoName,
        },
      ]);
      if (!customPrompt) setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setAsking(false);
    }
  };

  const handleSyncToHermes = async () => {
    if (!selectedBrain) return;
    setSyncingHermes(true);
    try {
      const res = await adamsFetchJson<{
        pagesCount: number;
        chunksCount: number;
      }>(
        `/api/adams-harness/brains/${encodeURIComponent(selectedBrain.id)}/sync-hermes`,
        { method: "POST" },
      );
      toast.success(
        `Stored ${res.pagesCount} page(s) (${res.chunksCount} chunks) in Hermes Harness`,
      );
      await loadSelectedSources(selectedBrain.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sync to Hermes",
      );
    } finally {
      setSyncingHermes(false);
    }
  };

  const suggestedPrompts = [
    "Summarize the key documents and SOPs stored in this repository.",
    ...(sources.slice(0, 2).map((s) => `What are the key details in "${s.title}"?`)),
    "What safety procedures, assets, or specifications are available here?",
  ];

  if (isLoading || (isAuthenticated && fetching)) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please sign in to use AdamsBrain.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AdamsBrain (ABrAIn / GBrain) Knowledge Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Import operational datasets into Hermes-backed GBrain repositories, chat with any repository, and ground Telegram &amp; Microsoft Teams.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setWizardOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Data Import &amp; Hermes Wizard
          </Button>
          {selectedBrain && (
            <Button
              variant="outline"
              disabled={syncingHermes}
              onClick={() => void handleSyncToHermes()}
            >
              {syncingHermes ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Repo to Hermes
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/portal/admin/adams-brain">
              <Settings className="mr-2 h-4 w-4" />
              Manage Repositories
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Layout: Left Repository Selector + Right Chat & Explorer */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Data Repositories */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Data Repositories ({brains.length})
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setWizardOpen(true)}
                >
                  + Import Data
                </Button>
              </div>
              <CardDescription className="text-xs">
                Select a repository to chat with or import new data into Hermes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {brains.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleSelectBrain("__all__")}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    brainId === "__all__"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-primary" />
                      All Active Repositories
                    </span>
                    <Badge variant="default" className="text-[10px]">
                      Global Search
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Query across all {brains.length} AdamsBrain / GBrain repositories at once.
                  </p>
                </button>
              )}

              {brains.length === 0 ? (
                <div className="py-6 text-center space-y-3">
                  <p className="text-xs text-muted-foreground">
                    No AdamsBrain repositories created yet.
                  </p>
                  <Button size="sm" onClick={() => setWizardOpen(true)}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Launch Data Import Wizard
                  </Button>
                </div>
              ) : (
                brains.map((b) => {
                  const synced = b.gbrainRepo?.hermesSyncStatus === "synced";
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBrain(b.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        brainId === b.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm truncate">
                          {b.name}
                        </span>
                        <Badge
                          variant={synced ? "default" : "outline"}
                          className="text-[10px] shrink-0"
                        >
                          {synced ? "Hermes Synced" : b.departmentId}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {b.description}
                      </p>
                      {b.gbrainRepo?.hermesSyncedPagesCount !== undefined && (
                        <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                          <span>
                            {b.gbrainRepo.hermesSyncedPagesCount} pages
                          </span>
                          <span>•</span>
                          <span>
                            {b.gbrainRepo.hermesSyncedChunksCount ?? 0} chunks
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interactive Chat, Stored Sources, & Telegram/Teams Info */}
        <div className="lg:col-span-8 space-y-4">
          {brainId ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(v as "chat" | "sources" | "channels")
              }
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <TabsList>
                  <TabsTrigger value="chat" className="gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    Chat with Repo
                  </TabsTrigger>
                  {brainId !== "__all__" && (
                    <TabsTrigger value="sources" className="gap-1.5">
                      <FileText className="h-4 w-4" />
                      Stored Sources ({sources.length})
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="channels" className="gap-1.5">
                    <Bot className="h-4 w-4" />
                    Hermes / Telegram / Teams
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Hermes Harness Ready
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Telegram &amp; Teams Grounded
                  </Badge>
                </div>
              </div>

              {/* TAB 1: Interactive Repository Chat */}
              <TabsContent value="chat" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Chatting with: {activeRepoName}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Ask questions about SOPs, uploaded documents, CSV/JSON datasets, or synced Adams Platform modules.
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setWizardOpen(true)}
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Import More Data
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Suggested Prompts */}
                    {turns.length === 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Try asking this repository:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {suggestedPrompts.map((prompt, i) => (
                            <Button
                              key={i}
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="text-xs h-auto py-1.5 px-3"
                              onClick={() => void ask(prompt)}
                              disabled={asking}
                            >
                              {prompt}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Conversation History */}
                    {turns.length > 0 && (
                      <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                        {turns.map((turn) => (
                          <div
                            key={turn.id}
                            className="rounded-lg border p-4 space-y-3 bg-muted/10"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-semibold text-sm">
                                Q: {turn.question}
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                {turn.repoName}
                              </Badge>
                            </div>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed bg-background rounded-md border p-3">
                              {turn.answer}
                            </div>
                            {turn.citations.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                                  Cited Repository Sources ({turn.citations.length})
                                </span>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {turn.citations.map((c) => (
                                    <div
                                      key={c.id}
                                      className="rounded border border-dashed p-2.5 text-xs bg-background"
                                    >
                                      <div className="font-medium flex items-center justify-between">
                                        <span className="truncate">{c.title}</span>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] ml-2"
                                        >
                                          v{c.version}
                                        </Badge>
                                      </div>
                                      <p className="text-muted-foreground line-clamp-3 mt-1 text-[11px]">
                                        {c.excerpt}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {error && (
                      <p className="text-xs text-destructive">{error}</p>
                    )}

                    {/* Input Box */}
                    <div className="space-y-2 pt-2 border-t">
                      <Textarea
                        value={question}
                        maxLength={4000}
                        rows={3}
                        placeholder={`Ask a question about ${activeRepoName}... (Press Ctrl+Enter to send)`}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                            e.preventDefault();
                            void ask();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          Grounded in Hermes Harness &amp; indexed GBrain chunks
                        </span>
                        <Button
                          onClick={() => void ask()}
                          disabled={asking || !question.trim()}
                        >
                          {asking ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Ask Repository
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 2: Stored Repository Sources */}
              <TabsContent value="sources" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Stored Sources in {selectedBrain?.name} ({sources.length})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        All documents, SOPs, FAQs, datasets, and platform connectors indexed in this repository.
                      </CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setWizardOpen(true)}>
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Import Data via Wizard
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {sources.length === 0 ? (
                      <div className="py-8 text-center space-y-3">
                        <p className="text-sm text-muted-foreground">
                          This repository has no indexed sources yet. Use the{" "}
                          <strong>Data Import &amp; Hermes Wizard</strong> to upload files or sync platform modules.
                        </p>
                        <Button size="sm" onClick={() => setWizardOpen(true)}>
                          <Sparkles className="mr-1.5 h-4 w-4" />
                          Open Data Import Wizard
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {sources.map((src) => (
                          <div
                            key={src.id}
                            className="rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                          >
                            <div>
                              <div className="font-medium text-sm flex items-center gap-2">
                                {src.title}
                                <Badge variant="outline" className="text-[10px]">
                                  {src.pageType || src.connector || src.type}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Version {src.version} · {src.chunkCount} chunks · Status:{" "}
                                <span className="font-medium text-green-600">
                                  {src.status}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setActiveTab("chat");
                                void ask(`Summarize "${src.title}" and its key points.`);
                              }}
                            >
                              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                              Ask About This Source
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 3: Hermes Harness, Telegram & Microsoft Teams Access */}
              <TabsContent value="channels" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Hermes Harness, Telegram &amp; Microsoft Teams Integration
                    </CardTitle>
                    <CardDescription className="text-xs">
                      How Hermes Agent, Telegram, and Microsoft Teams access this repository.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    <div className="rounded-lg border p-3.5 space-y-2 bg-muted/20">
                      <div className="font-semibold text-sm">
                        1. Hermes Harness Memory &amp; REST API
                      </div>
                      <p className="text-muted-foreground">
                        Every time you run the <strong>Data Import &amp; Hermes Wizard</strong> or click{" "}
                        <strong>Sync Repo to Hermes</strong>, AdamsBrain compiles{" "}
                        <code>RESOLVER.md</code> and <code>HERMES_MEMORY.json</code> into your Hermes workspace and exposes the REST endpoint below:
                      </p>
                      <div className="flex items-center gap-2 font-mono bg-background border rounded p-2">
                        <span className="truncate flex-1">
                          POST /api/public/gbrain (Brain ID: {selectedBrain?.id || "__all__"})
                        </span>
                        {selectedBrain?.gbrainRepo?.apiKey && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                selectedBrain.gbrainRepo?.apiKey || "",
                              );
                              toast.success("Copied Repository X-API-Key");
                            }}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy X-API-Key
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border p-3.5 space-y-2 bg-muted/20">
                      <div className="font-semibold text-sm">
                        2. Querying via Telegram &amp; Microsoft Teams
                      </div>
                      <p className="text-muted-foreground">
                        Active AdamsBrain / GBrain repositories are automatically connected to the Telegram and Microsoft Teams Hermes webhooks (`queryAnyActiveBrain`). Any authorized team member linked in{" "}
                        <Link
                          href="/portal/settings?tab=telegram"
                          className="text-primary underline"
                        >
                          Settings → Integrations → Telegram / Microsoft Teams
                        </Link>{" "}
                        can ask questions in natural language and receive cited answers from this repository.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </div>

      {/* 4-Step Data Import & Hermes Storage Wizard */}
      <AdamsBrainImportWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        brains={brains}
        departments={departments}
        defaultBrainId={brainId === "__all__" ? brains[0]?.id : brainId}
        onCompleted={async (targetId) => {
          await loadBrainsList();
          setBrainId(targetId);
          await loadSelectedSources(targetId);
          setActiveTab("chat");
        }}
      />
    </div>
  );
}
