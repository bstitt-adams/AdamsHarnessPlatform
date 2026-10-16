"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
  Sparkles,
  Copy,
  Key,
  Columns,
  Zap,
  BarChart3,
  Webhook,
} from "lucide-react";
import type { ModuleDefinition } from "@/lib/modules/contract";
import type {
  ModuleAppSettingsDoc,
  ModuleChartConfig,
  ModuleCustomMetric,
  ModuleTriggerRule,
  ModuleApiEndpointConfig,
} from "@/lib/adams-harness/types";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";

export default function ModuleSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { isLoading: profileLoading, isAuthenticated } = useUserProfile();
  const [definition, setDefinition] = useState<ModuleDefinition | null>(null);
  const [settings, setSettings] = useState<ModuleAppSettingsDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // AI prompt inputs
  const [aiChartPrompt, setAiChartPrompt] = useState("");
  const [aiMetricPrompt, setAiMetricPrompt] = useState("");
  const [aiAutomationPrompt, setAiAutomationPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState<"chart" | "metric" | "automation" | null>(null);

  // Manual trigger form
  const [newTrigger, setNewTrigger] = useState({
    name: "",
    event: "record_created" as ModuleTriggerRule["event"],
    conditionField: "",
    conditionOperator: "equals" as NonNullable<ModuleTriggerRule["conditionOperator"]>,
    conditionValue: "",
    actionType: "in_app_notification" as ModuleTriggerRule["actionType"],
    messageTemplate: "",
    webhookUrl: "",
  });

  // New API endpoint form
  const [newEndpointName, setNewEndpointName] = useState("");
  const [newEndpointMethods, setNewEndpointMethods] = useState<("GET" | "POST" | "PATCH")[]>([
    "GET",
    "POST",
  ]);

  const load = useCallback(async () => {
    const res = await adamsFetchJson<{
      module: ModuleDefinition;
      settings: ModuleAppSettingsDoc;
    }>(`/api/adams-harness/modules/${encodeURIComponent(slug)}/settings`);
    setDefinition(res.module);
    setSettings(res.settings);
  }, [slug]);

  useEffect(() => {
    if (profileLoading || !isAuthenticated) return;
    load()
      .catch(() => toast.error("Failed to load app settings"))
      .finally(() => setLoading(false));
  }, [profileLoading, isAuthenticated, load]);

  const saveAllSettings = async (next: ModuleAppSettingsDoc) => {
    setSaving(true);
    try {
      const res = await adamsFetchJson<{ settings: ModuleAppSettingsDoc }>(
        `/api/adams-harness/modules/${encodeURIComponent(slug)}/settings`,
        {
          method: "PUT",
          body: JSON.stringify({
            visibleColumns: next.visibleColumns,
            customMetrics: next.customMetrics,
            charts: next.charts,
            triggers: next.triggers,
            apiEndpoints: next.apiEndpoints,
            detailFields: next.detailFields,
          }),
        }
      );
      setSettings(res.settings);
      toast.success("Solution app settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleColumn = (fieldId: string) => {
    if (!settings) return;
    const exists = settings.visibleColumns.includes(fieldId);
    const nextCols = exists
      ? settings.visibleColumns.filter((c) => c !== fieldId)
      : [...settings.visibleColumns, fieldId];
    setSettings({ ...settings, visibleColumns: nextCols });
  };

  const runAiPrompt = async (mode: "chart" | "metric" | "automation") => {
    if (!settings) return;
    const prompt =
      mode === "chart"
        ? aiChartPrompt.trim()
        : mode === "metric"
          ? aiMetricPrompt.trim()
          : aiAutomationPrompt.trim();
    if (!prompt) return;

    setAiBusy(mode);
    try {
      const res = await adamsFetchJson<{
        chart?: ModuleChartConfig;
        metric?: ModuleCustomMetric;
        trigger?: ModuleTriggerRule;
      }>(`/api/adams-harness/modules/${encodeURIComponent(slug)}/ai`, {
        method: "POST",
        body: JSON.stringify({ mode, prompt }),
      });

      if (mode === "chart" && res.chart) {
        const next = { ...settings, charts: [...settings.charts, res.chart] };
        await saveAllSettings(next);
        setAiChartPrompt("");
      } else if (mode === "metric" && res.metric) {
        const next = {
          ...settings,
          customMetrics: [...settings.customMetrics, res.metric],
        };
        await saveAllSettings(next);
        setAiMetricPrompt("");
      } else if (mode === "automation" && res.trigger) {
        const next = { ...settings, triggers: [...settings.triggers, res.trigger] };
        await saveAllSettings(next);
        setAiAutomationPrompt("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setAiBusy(null);
    }
  };

  const handleAddManualTrigger = () => {
    if (!settings || !newTrigger.name.trim() || !newTrigger.messageTemplate.trim()) {
      toast.error("Please provide a trigger name and message template");
      return;
    }
    const rule: ModuleTriggerRule = {
      id: `trg_${Date.now()}`,
      name: newTrigger.name.trim(),
      enabled: true,
      event: newTrigger.event,
      ...(newTrigger.conditionField
        ? {
            conditionField: newTrigger.conditionField,
            conditionOperator: newTrigger.conditionOperator,
            conditionValue: newTrigger.conditionValue,
          }
        : {}),
      actionType: newTrigger.actionType,
      messageTemplate: newTrigger.messageTemplate.trim(),
      ...(newTrigger.webhookUrl ? { webhookUrl: newTrigger.webhookUrl.trim() } : {}),
    };
    const next = { ...settings, triggers: [...settings.triggers, rule] };
    setSettings(next);
    setNewTrigger({
      name: "",
      event: "record_created",
      conditionField: "",
      conditionOperator: "equals",
      conditionValue: "",
      actionType: "in_app_notification",
      messageTemplate: "",
      webhookUrl: "",
    });
  };

  const handleCreateApiEndpoint = () => {
    if (!settings || !newEndpointName.trim()) {
      toast.error("Enter an API endpoint name");
      return;
    }
    const randomKey = `adams_${slug.replace(/[^a-z0-9]/g, "").slice(0, 12)}_${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 24)}`;
    const primaryFields = definition?.recordTypes[0]?.fields.map((f) => f.id) ?? [];

    const ep: ModuleApiEndpointConfig = {
      id: `ep_${Date.now()}`,
      name: newEndpointName.trim(),
      slug,
      enabled: true,
      methods: newEndpointMethods.length ? newEndpointMethods : ["GET"],
      apiKey: randomKey,
      exposedFields: primaryFields,
      createdAt: new Date().toISOString(),
    };
    setSettings({ ...settings, apiEndpoints: [...settings.apiEndpoints, ep] });
    setNewEndpointName("");
  };

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!definition || !settings) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Solution settings unavailable.</p>
      </div>
    );
  }

  const primaryFields = definition.recordTypes[0]?.fields ?? [];
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/modules/${encodeURIComponent(slug)}`
      : `/api/public/modules/${encodeURIComponent(slug)}`;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link
              href={`/portal/modules/${encodeURIComponent(slug)}`}
              className="hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to {definition.name}
            </Link>
          </div>
          <h1 className="text-2xl font-bold">{definition.name} — App Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure visible table columns, AI metrics &amp; charts, action triggers, and external API endpoints.
          </p>
        </div>

        <Button onClick={() => void saveAllSettings(settings)} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save All Settings
        </Button>
      </div>

      <Tabs defaultValue="columns" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="columns">
            <Columns className="mr-1.5 h-4 w-4" />
            Table Columns &amp; Detail Fields
          </TabsTrigger>
          <TabsTrigger value="metrics-charts">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            AI Metrics &amp; Charts
          </TabsTrigger>
          <TabsTrigger value="triggers">
            <Zap className="mr-1.5 h-4 w-4" />
            Triggers &amp; AI Automations
          </TabsTrigger>
          <TabsTrigger value="api">
            <Webhook className="mr-1.5 h-4 w-4" />
            API Endpoints
          </TabsTrigger>
        </TabsList>

        {/* 1. Visible Columns */}
        <TabsContent value="columns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visible Table Columns</CardTitle>
              <CardDescription>
                Choose which fields are displayed in the main solution list table. Unchecked fields remain accessible on each item&apos;s detail page.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {primaryFields.map((field) => {
                const checked = settings.visibleColumns.includes(field.id);
                return (
                  <div
                    key={field.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{field.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {field.id} ({field.type})
                      </p>
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={() => toggleColumn(field.id)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. AI Metrics & Charts */}
        <TabsContent value="metrics-charts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Customize Data Metrics with AI Prompts
              </CardTitle>
              <CardDescription>
                Describe a KPI metric in plain English and AI will add it to the solution dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={aiMetricPrompt}
                  onChange={(e) => setAiMetricPrompt(e.target.value)}
                  placeholder="e.g. 'Show totaloverdue items' or 'Percentage of completed requests'..."
                />
                <Button
                  onClick={() => void runAiPrompt("metric")}
                  disabled={aiBusy === "metric" || !aiMetricPrompt.trim()}
                >
                  {aiBusy === "metric" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Metric with AI
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {settings.customMetrics.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{m.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Aggregation: {m.aggregation}
                        {m.fieldId ? ` (${m.fieldId})` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          customMetrics: settings.customMetrics.filter((x) => x.id !== m.id),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Customize Charts &amp; Graphs with AI Prompts
              </CardTitle>
              <CardDescription>
                Prompt AI to create bar, line, pie, or area charts tailored to your solution data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={aiChartPrompt}
                  onChange={(e) => setAiChartPrompt(e.target.value)}
                  placeholder="e.g. 'Create a bar chart of items by priority' or 'Pie chart by category'..."
                />
                <Button
                  onClick={() => void runAiPrompt("chart")}
                  disabled={aiBusy === "chart" || !aiChartPrompt.trim()}
                >
                  {aiBusy === "chart" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Chart with AI
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {settings.charts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{c.title}</p>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {c.chartType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Group by: {c.groupByField} · Metric: {c.metric}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          charts: settings.charts.filter((x) => x.id !== c.id),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Triggers & AI Automations */}
        <TabsContent value="triggers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Automation &amp; Notification Builder
              </CardTitle>
              <CardDescription>
                Describe when an automation or notification should fire and AI will build the trigger rule.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={aiAutomationPrompt}
                  onChange={(e) => setAiAutomationPrompt(e.target.value)}
                  placeholder="e.g. 'When a Critical item is created, send a Telegram notification to safety supervisor'..."
                />
                <Button
                  onClick={() => void runAiPrompt("automation")}
                  disabled={aiBusy === "automation" || !aiAutomationPrompt.trim()}
                >
                  {aiBusy === "automation" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Create with AI
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configured Action Triggers</CardTitle>
              <CardDescription>
                Define event triggers, field conditions, and automated actions/notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {settings.triggers.map((trg) => (
                  <div
                    key={trg.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{trg.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {trg.event}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {trg.actionType.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Template: {trg.messageTemplate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={trg.enabled}
                        onCheckedChange={(checked) =>
                          setSettings({
                            ...settings,
                            triggers: settings.triggers.map((t) =>
                              t.id === trg.id ? { ...t, enabled: checked } : t
                            ),
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            triggers: settings.triggers.filter((t) => t.id !== trg.id),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
                <h4 className="text-sm font-semibold">Add Manual Trigger Rule</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Rule Name</Label>
                    <Input
                      value={newTrigger.name}
                      onChange={(e) =>
                        setNewTrigger({ ...newTrigger, name: e.target.value })
                      }
                      placeholder="Escalate high priority"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">When Event Occurs</Label>
                    <Select
                      value={newTrigger.event}
                      onValueChange={(v) =>
                        setNewTrigger({
                          ...newTrigger,
                          event: v as ModuleTriggerRule["event"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="record_created">Record Created</SelectItem>
                        <SelectItem value="record_updated">Record Updated</SelectItem>
                        <SelectItem value="status_completed">Status Completed</SelectItem>
                        <SelectItem value="overdue">Record Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Action Type</Label>
                    <Select
                      value={newTrigger.actionType}
                      onValueChange={(v) =>
                        setNewTrigger({
                          ...newTrigger,
                          actionType: v as ModuleTriggerRule["actionType"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_app_notification">In-App Notification</SelectItem>
                        <SelectItem value="telegram_notification">Telegram Notification</SelectItem>
                        <SelectItem value="teams_notification">Microsoft Teams Notification</SelectItem>
                        <SelectItem value="webhook">Outbound Webhook POST</SelectItem>
                        <SelectItem value="mark_completed">Auto-Mark Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newTrigger.actionType === "webhook" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Outbound Webhook URL</Label>
                    <Input
                      value={newTrigger.webhookUrl}
                      onChange={(e) =>
                        setNewTrigger({ ...newTrigger, webhookUrl: e.target.value })
                      }
                      placeholder="https://example.com/webhook"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">
                    Notification / Payload Message Template (supports {"{{record.title}}"}, {"{{record.id}}"})
                  </Label>
                  <Textarea
                    value={newTrigger.messageTemplate}
                    onChange={(e) =>
                      setNewTrigger({ ...newTrigger, messageTemplate: e.target.value })
                    }
                    placeholder="Alert: {{record.title}} requires review."
                    rows={2}
                  />
                </div>

                <Button type="button" variant="secondary" onClick={handleAddManualTrigger}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Trigger Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. External API Endpoints */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expose Data via API Endpoints</CardTitle>
              <CardDescription>
                Create authenticated REST API endpoints so external applications, scripts, or BI tools can read or write records for this solution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="space-y-1 flex-1">
                  <Label>Endpoint Name / Consumer Application</Label>
                  <Input
                    value={newEndpointName}
                    onChange={(e) => setNewEndpointName(e.target.value)}
                    placeholder="e.g. PowerBI Connector / ERP Sync / Mobile Field App"
                  />
                </div>
                <div className="flex items-center gap-3 pb-2">
                  {(["GET", "POST"] as const).map((m) => (
                    <label key={m} className="flex items-center gap-1.5 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={newEndpointMethods.includes(m)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewEndpointMethods([...newEndpointMethods, m]);
                          } else {
                            setNewEndpointMethods(newEndpointMethods.filter((x) => x !== m));
                          }
                        }}
                      />
                      {m}
                    </label>
                  ))}
                </div>
                <Button onClick={handleCreateApiEndpoint}>
                  <Key className="mr-2 h-4 w-4" />
                  Generate API Endpoint
                </Button>
              </div>

              {settings.apiEndpoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No external API endpoints created yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {settings.apiEndpoints.map((ep) => (
                    <div
                      key={ep.id}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{ep.name}</span>
                          {ep.methods.map((m) => (
                            <Badge key={m} variant="outline" className="text-[10px]">
                              {m}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={ep.enabled}
                            onCheckedChange={(checked) =>
                              setSettings({
                                ...settings,
                                apiEndpoints: settings.apiEndpoints.map((x) =>
                                  x.id === ep.id ? { ...x, enabled: checked } : x
                                ),
                              })
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setSettings({
                                ...settings,
                                apiEndpoints: settings.apiEndpoints.filter(
                                  (x) => x.id !== ep.id
                                ),
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-2 text-xs font-mono bg-muted p-3 rounded">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">URL: {baseUrl}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(baseUrl);
                              toast.success("Copied endpoint URL");
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy URL
                          </Button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">X-API-Key: {ep.apiKey}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(ep.apiKey);
                              toast.success("Copied API Key");
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Key
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
