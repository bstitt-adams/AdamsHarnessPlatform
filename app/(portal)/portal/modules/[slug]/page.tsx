"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Search,
  Settings,
  Plus,
  Sparkles,
  Eye,
  BarChart3,
  Filter,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type {
  ModuleDefinition,
  ModuleField,
} from "@/lib/modules/contract";
import type {
  ModuleAppSettingsDoc,
  ModuleChartConfig,
  ModuleCustomMetric,
} from "@/lib/adams-harness/types";
import { adamsFetch, adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";

type ModuleRecord = {
  id: string;
  recordTypeId: string;
  formId?: string;
  status: "active" | "completed" | "archived";
  dueAt?: string;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
  tags?: string[];
  data: Record<string, string | number | boolean | null>;
  extendedData?: Record<string, string | number | boolean | null>;
};

const CHART_COLORS = [
  "#0072BC",
  "#10b981",
  "#f59e0b",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
];

function PhotoInput({
  slug,
  fieldId,
  initialId,
  onUploaded,
}: {
  slug: string;
  fieldId: string;
  initialId?: string | null;
  onUploaded: (id: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(initialId ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("fieldId", fieldId);
      formData.append("file", file);
      const response = await adamsFetch(
        `/api/adams-harness/modules/${encodeURIComponent(slug)}/uploads`,
        { method: "POST", body: formData },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body?.error === "string" ? body.error : "Upload failed");
      }
      const id = body.upload.id as string;
      setUploadId(id);
      onUploaded(id);
      const imageResponse = await adamsFetch(
        `/api/adams-harness/modules/${encodeURIComponent(slug)}/uploads/${encodeURIComponent(id)}`,
      );
      if (imageResponse.ok) {
        const blob = await imageResponse.blob();
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        disabled={uploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="Uploaded evidence" className="h-24 rounded border object-cover" />
      )}
      {uploadId && !previewUrl && (
        <p className="text-xs text-muted-foreground">Photo attached.</p>
      )}
    </div>
  );
}

function FieldInput({
  slug,
  field,
  value,
  onChange,
}: {
  slug: string;
  field: ModuleField;
  value: string | number | boolean | null;
  onChange: (value: string | number | boolean | null) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <span className="text-sm text-muted-foreground">{field.label}</span>
      </div>
    );
  }
  if (field.type === "select" || field.type === "radio") {
    return (
      <Select
        value={typeof value === "string" ? value : ""}
        onValueChange={(v) => onChange(v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (field.type === "textarea") {
    return (
      <Textarea
        value={typeof value === "string" ? value : ""}
        maxLength={field.maxLength ?? 10000}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === "photo") {
    return (
      <PhotoInput
        slug={slug}
        fieldId={field.id}
        initialId={typeof value === "string" ? value : null}
        onUploaded={onChange}
      />
    );
  }
  if (field.type === "number") {
    return (
      <Input
        type="number"
        value={typeof value === "number" ? value : ""}
        min={field.min}
        max={field.max}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
      />
    );
  }
  if (field.type === "date") {
    return (
      <Input
        type="date"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === "datetime") {
    return (
      <Input
        type="datetime-local"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <Input
      type="text"
      value={typeof value === "string" ? value : ""}
      maxLength={field.maxLength ?? 2000}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function computeMetricValue(metric: ModuleCustomMetric, records: ModuleRecord[]): string {
  const scoped = metric.filterStatus
    ? records.filter((r) => r.status === metric.filterStatus)
    : records;

  if (metric.aggregation === "count") {
    return String(scoped.length);
  }
  if (metric.aggregation === "active_count") {
    return String(records.filter((r) => r.status === "active").length);
  }
  if (metric.aggregation === "completed_rate") {
    if (records.length === 0) return "0%";
    const completed = records.filter((r) => r.status === "completed").length;
    return `${Math.round((completed / records.length) * 100)}%`;
  }
  if (metric.aggregation === "overdue_count") {
    const now = Date.now();
    const overdue = records.filter(
      (r) => r.status === "active" && r.dueAt && new Date(r.dueAt).getTime() < now
    );
    return String(overdue.length);
  }
  if (metric.aggregation === "field_sum" && metric.fieldId) {
    const total = scoped.reduce((sum, r) => {
      const val = Number(r.data[metric.fieldId!] ?? 0);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
    return total.toLocaleString();
  }
  return String(scoped.length);
}

function buildChartData(chart: ModuleChartConfig, records: ModuleRecord[]) {
  const groups = new Map<string, { sum: number; count: number }>();

  for (const record of records) {
    const rawGroup =
      chart.groupByField === "status"
        ? record.status
        : record.data[chart.groupByField] ?? "Unspecified";
    const key = String(rawGroup || "Unspecified");
    const entry = groups.get(key) ?? { sum: 0, count: 0 };
    entry.count += 1;
    if (chart.valueField) {
      const num = Number(record.data[chart.valueField] ?? 0);
      if (Number.isFinite(num)) entry.sum += num;
    } else {
      entry.sum += 1;
    }
    groups.set(key, entry);
  }

  if (groups.size === 0) {
    return [{ name: "No Data Yet", value: 0 }];
  }

  return Array.from(groups.entries()).map(([name, stats]) => ({
    name,
    value:
      chart.metric === "sum"
        ? stats.sum
        : chart.metric === "avg"
          ? Math.round((stats.sum / Math.max(1, stats.count)) * 10) / 10
          : stats.count,
  }));
}

function SolutionChartCard({
  chart,
  records,
}: {
  chart: ModuleChartConfig;
  records: ModuleRecord[];
}) {
  const data = useMemo(() => buildChartData(chart, records), [chart, records]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {chart.title}
          </CardTitle>
          {chart.aiRecommended && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              AI Recommended
            </Badge>
          )}
        </div>
        {chart.description && (
          <CardDescription className="text-xs">{chart.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chart.chartType === "pie" ? (
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label
                >
                  {data.map((_, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : chart.chartType === "line" ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0072BC"
                  strokeWidth={2}
                />
              </LineChart>
            ) : chart.chartType === "area" ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0072BC"
                  fill="#0072BC"
                  fillOpacity={0.2}
                />
              </AreaChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0072BC" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GeneratedModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { isLoading: profileLoading, isAuthenticated } = useUserProfile();
  const [definition, setDefinition] = useState<ModuleDefinition | null>(null);
  const [appSettings, setAppSettings] = useState<ModuleAppSettingsDoc | null>(null);
  const [records, setRecords] = useState<ModuleRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [denied, setDenied] = useState(false);

  // Global search & column filters
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Create item dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string | number | boolean | null>>({});
  const [submitting, setSubmitting] = useState(false);

  // Quick AI chart/metric prompt bar
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const load = useCallback(async () => {
    const [modRes, recRes] = await Promise.all([
      adamsFetchJson<{ module: ModuleDefinition; settings: ModuleAppSettingsDoc }>(
        `/api/adams-harness/modules/${encodeURIComponent(slug)}`,
      ),
      adamsFetchJson<{ records: ModuleRecord[] }>(
        `/api/adams-harness/modules/${encodeURIComponent(slug)}/records`,
      ),
    ]);
    return {
      module: modRes.module,
      settings: modRes.settings,
      records: recRes.records,
    };
  }, [slug]);

  useEffect(() => {
    if (profileLoading || !isAuthenticated) return;
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setDefinition(data.module);
        setAppSettings(data.settings);
        setRecords(data.records);
      })
      .catch(() => {
        if (!cancelled) setDenied(true);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileLoading, isAuthenticated, load]);

  const reload = async () => {
    try {
      const data = await load();
      setDefinition(data.module);
      setAppSettings(data.settings);
      setRecords(data.records);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reload");
    }
  };

  const primaryRecordType = definition?.recordTypes[0];
  const primaryForm = definition?.forms[0];

  const visibleFields = useMemo(() => {
    if (!primaryRecordType) return [];
    const configured = appSettings?.visibleColumns ?? [];
    if (configured.length === 0) return primaryRecordType.fields;
    const filtered = primaryRecordType.fields.filter((f) => configured.includes(f.id));
    return filtered.length > 0 ? filtered : primaryRecordType.fields;
  }, [primaryRecordType, appSettings]);

  const filteredRecords = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return records.filter((rec) => {
      if (statusFilter !== "all" && rec.status !== statusFilter) {
        return false;
      }

      // Column-specific filters
      for (const [colId, filterVal] of Object.entries(columnFilters)) {
        const trimmedFilter = filterVal.trim().toLowerCase();
        if (!trimmedFilter || trimmedFilter === "__all__") continue;
        const cellVal = String(rec.data[colId] ?? "").toLowerCase();
        if (!cellVal.includes(trimmedFilter)) return false;
      }

      // Global search across all fields, id, status, notes, and extendedData
      if (!q) return true;
      if (rec.id.toLowerCase().includes(q)) return true;
      if (rec.status.toLowerCase().includes(q)) return true;
      if (rec.notes && rec.notes.toLowerCase().includes(q)) return true;
      for (const val of Object.values(rec.data || {})) {
        if (val !== null && val !== undefined && String(val).toLowerCase().includes(q)) {
          return true;
        }
      }
      for (const val of Object.values(rec.extendedData || {})) {
        if (val !== null && val !== undefined && String(val).toLowerCase().includes(q)) {
          return true;
        }
      }
      return false;
    });
  }, [records, globalSearch, statusFilter, columnFilters]);

  const handleCreateRecord = async () => {
    if (!definition || !primaryForm || !primaryRecordType) return;
    const fields = primaryRecordType.fields.filter((f) =>
      primaryForm.fields.includes(f.id)
    );
    for (const field of fields) {
      if (field.required) {
        const v = formValues[field.id];
        if (v === undefined || v === null || v === "") {
          toast.error(`"${field.label}" is required`);
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      await adamsFetchJson(
        `/api/adams-harness/modules/${encodeURIComponent(slug)}/records`,
        {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({ formId: primaryForm.id, data: formValues }),
        }
      );
      toast.success("Item created");
      setFormValues({});
      setCreateOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAiChart = async () => {
    if (!aiPrompt.trim() || !appSettings) return;
    setAiGenerating(true);
    try {
      const res = await adamsFetchJson<{ chart: ModuleChartConfig }>(
        `/api/adams-harness/modules/${encodeURIComponent(slug)}/ai`,
        {
          method: "POST",
          body: JSON.stringify({ mode: "chart", prompt: aiPrompt.trim() }),
        }
      );
      const nextCharts = [...(appSettings.charts || []), res.chart];
      const saved = await adamsFetchJson<{ settings: ModuleAppSettingsDoc }>(
        `/api/adams-harness/modules/${encodeURIComponent(slug)}/settings`,
        {
          method: "PUT",
          body: JSON.stringify({ charts: nextCharts }),
        }
      );
      setAppSettings(saved.settings);
      setAiPrompt("");
      toast.success(`Added AI chart: "${res.chart.title}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate chart");
    } finally {
      setAiGenerating(false);
    }
  };

  if (profileLoading || (isAuthenticated && fetching)) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please sign in to view this solution.</p>
      </div>
    );
  }

  if (!definition || !appSettings) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">
          {denied ? "Solution unavailable" : "Solution not found"}
        </h1>
        <p className="text-muted-foreground">
          {denied
            ? "You do not have access to this module."
            : `No solution module exists for "${slug}" yet.`}
        </p>
        <Link className="text-primary underline" href="/portal/modules">
          Back to Solutions &amp; Modules
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Settings Link & New Item Dialog */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/portal/solutions" className="hover:underline">
              Solutions
            </Link>
            <span>/</span>
            <Link href="/portal/modules" className="hover:underline">
              Modules
            </Link>
            <span>/</span>
            <span>{definition.name}</span>
          </div>
          <h1 className="text-2xl font-bold">{definition.name}</h1>
          <p className="text-sm text-muted-foreground">{definition.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/portal/modules/${encodeURIComponent(slug)}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              App Settings &amp; API
            </Link>
          </Button>

          {primaryForm && primaryRecordType && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {primaryForm.submitLabel || "New Item"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{primaryForm.title}</DialogTitle>
                  {primaryForm.description && (
                    <DialogDescription>{primaryForm.description}</DialogDescription>
                  )}
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {primaryRecordType.fields
                    .filter((f) => primaryForm.fields.includes(f.id))
                    .map((field) => (
                      <div key={field.id} className="space-y-1">
                        {field.type !== "checkbox" && (
                          <Label>
                            {field.label}
                            {field.required ? " *" : ""}
                          </Label>
                        )}
                        <FieldInput
                          slug={slug}
                          field={field}
                          value={formValues[field.id] ?? null}
                          onChange={(val) =>
                            setFormValues((prev) => ({ ...prev, [field.id]: val }))
                          }
                        />
                      </div>
                    ))}
                  <Button
                    onClick={() => void handleCreateRecord()}
                    disabled={submitting}
                    className="w-full"
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {primaryForm.submitLabel || "Submit"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Data Metrics Dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {appSettings.customMetrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {computeMetricValue(metric, records)}
              </div>
              {metric.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {metric.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Recommended Charts & Quick AI Chart Customizer */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">
              AI Recommended Charts &amp; Analytics
            </h2>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask AI to add a chart (e.g. 'Pie chart by priority')..."
              className="h-8 text-xs sm:w-80"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleQuickAiChart();
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleQuickAiChart()}
              disabled={aiGenerating || !aiPrompt.trim()}
            >
              {aiGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1" />
              )}
              Add Chart
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {appSettings.charts.map((chart) => (
            <SolutionChartCard key={chart.id} chart={chart} records={records} />
          ))}
        </div>
      </div>

      {/* Global Search + Filterable Table */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Solution Items ({filteredRecords.length})</CardTitle>
              <CardDescription>
                Search across any field, filter by column, or open an item&apos;s detail page for extended notes and history.
              </CardDescription>
            </div>
            {(globalSearch || statusFilter !== "all" || Object.values(columnFilters).some(Boolean)) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setGlobalSearch("");
                  setStatusFilter("all");
                  setColumnFilters({});
                }}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Global Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Global search across all fields, notes, tags, and IDs..."
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  {visibleFields.map((field) => (
                    <TableHead key={field.id} className="min-w-[150px]">
                      <div className="space-y-1.5 py-1">
                        <span>{field.label}</span>
                        {field.type === "select" && field.options ? (
                          <Select
                            value={columnFilters[field.id] || "__all__"}
                            onValueChange={(val) =>
                              setColumnFilters((prev) => ({
                                ...prev,
                                [field.id]: val === "__all__" ? "" : val,
                              }))
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">All</SelectItem>
                              {field.options.map((opt) => (
                                <SelectItem key={opt} value={opt.toLowerCase()}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={columnFilters[field.id] || ""}
                            onChange={(e) =>
                              setColumnFilters((prev) => ({
                                ...prev,
                                [field.id]: e.target.value,
                              }))
                            }
                            placeholder={`Filter ${field.label}...`}
                            className="h-7 text-xs"
                          />
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleFields.length + 3}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No matching items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>
                        <Badge
                          variant={
                            rec.status === "completed"
                              ? "default"
                              : rec.status === "archived"
                                ? "secondary"
                                : "outline"
                          }
                          className="capitalize"
                        >
                          {rec.status}
                        </Badge>
                      </TableCell>
                      {visibleFields.map((field) => {
                        const val = rec.data[field.id];
                        return (
                          <TableCell key={field.id} className="text-sm">
                            {val === null || val === undefined || val === ""
                              ? "—"
                              : typeof val === "boolean"
                                ? val
                                  ? "Yes"
                                  : "No"
                                : String(val)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-xs text-muted-foreground">
                        {rec.dueAt
                          ? new Date(rec.dueAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link
                            href={`/portal/modules/${encodeURIComponent(slug)}/records/${encodeURIComponent(rec.id)}`}
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
