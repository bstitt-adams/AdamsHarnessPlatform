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
  MessageSquare,
  Settings,
} from "lucide-react";
import type { ModuleDefinition } from "@/lib/modules/contract";
import type {
  ModuleAppSettingsDoc,
  ModuleRecordComment,
} from "@/lib/adams-harness/types";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";

type DetailedRecord = {
  id: string;
  moduleSlug: string;
  recordTypeId: string;
  formId?: string;
  status: "active" | "completed" | "archived";
  data: Record<string, string | number | boolean | null>;
  extendedData?: Record<string, string | number | boolean | null>;
  notes?: string;
  tags?: string[];
  comments?: ModuleRecordComment[];
  dueAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  version: number;
};

export default function ModuleRecordDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const { isLoading: profileLoading, isAuthenticated } = useUserProfile();
  const [definition, setDefinition] = useState<ModuleDefinition | null>(null);
  const [appSettings, setAppSettings] = useState<ModuleAppSettingsDoc | null>(null);
  const [record, setRecord] = useState<DetailedRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dataValues, setDataValues] = useState<Record<string, string | number | boolean | null>>({});
  const [extendedValues, setExtendedValues] = useState<Record<string, string | number | boolean | null>>({});
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [status, setStatus] = useState<"active" | "completed" | "archived">("active");
  const [newComment, setNewComment] = useState("");

  // Add custom ad-hoc key-value field on the detail page
  const [customKey, setCustomKey] = useState("");
  const [customVal, setCustomVal] = useState("");

  const load = useCallback(async () => {
    const [recRes, modRes] = await Promise.all([
      adamsFetchJson<{ record: DetailedRecord; module: ModuleDefinition }>(
        `/api/adams-harness/modules/${encodeURIComponent(slug)}/records/${encodeURIComponent(id)}`
      ),
      adamsFetchJson<{ module: ModuleDefinition; settings: ModuleAppSettingsDoc }>(
        `/api/adams-harness/modules/${encodeURIComponent(slug)}`
      ),
    ]);
    setRecord(recRes.record);
    setDefinition(recRes.module);
    setAppSettings(modRes.settings);
    setDataValues(recRes.record.data || {});
    setExtendedValues(recRes.record.extendedData || {});
    setNotes(recRes.record.notes || "");
    setTagsInput((recRes.record.tags || []).join(", "));
    setStatus(recRes.record.status);
  }, [slug, id]);

  useEffect(() => {
    if (profileLoading || !isAuthenticated) return;
    load()
      .catch(() => toast.error("Failed to load item details"))
      .finally(() => setLoading(false));
  }, [profileLoading, isAuthenticated, load]);

  const handleSave = async (commentToPost?: string) => {
    if (!record) return;
    setSaving(true);
    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await adamsFetchJson<{ record: DetailedRecord }>(
        `/api/adams-harness/modules/${encodeURIComponent(slug)}/records/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({
            data: dataValues,
            extendedData: extendedValues,
            notes,
            tags: parsedTags,
            status,
            ...(commentToPost ? { comment: commentToPost } : {}),
          }),
        }
      );
      setRecord(res.record);
      if (commentToPost) setNewComment("");
      toast.success("Item details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomAttribute = () => {
    const key = customKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    if (!key) return;
    setExtendedValues((prev) => ({ ...prev, [key]: customVal }));
    setCustomKey("");
    setCustomVal("");
  };

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!record || !definition) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-muted-foreground">Item not found.</p>
        <Button asChild variant="outline">
          <Link href={`/portal/modules/${encodeURIComponent(slug)}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {slug}
          </Link>
        </Button>
      </div>
    );
  }

  const recordType =
    definition.recordTypes.find((r) => r.id === record.recordTypeId) ||
    definition.recordTypes[0];
  const configuredDetailFields = appSettings?.detailFields ?? [];

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
              {definition.name}
            </Link>
            <span>/</span>
            <span className="font-mono">{record.id}</span>
          </div>
          <h1 className="text-2xl font-bold">
            {String(dataValues.title || dataValues.vehicle_number || record.id)}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Version {record.version} · Created{" "}
            {record.createdAt ? new Date(record.createdAt).toLocaleString() : "—"} · Updated{" "}
            {record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "—"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as "active" | "completed" | "archived")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" asChild>
            <Link href={`/portal/modules/${encodeURIComponent(slug)}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>

          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Details
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 columns: Primary Fields + Extended Detail-Only Fields */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Primary Item Fields</CardTitle>
              <CardDescription>
                Core fields defined by the solution specification.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {(recordType?.fields ?? []).map((field) => (
                <div
                  key={field.id}
                  className={field.type === "textarea" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}
                >
                  <Label>{field.label}</Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      value={String(dataValues[field.id] ?? "")}
                      onChange={(e) =>
                        setDataValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      rows={3}
                    />
                  ) : field.type === "select" && field.options ? (
                    <Select
                      value={String(dataValues[field.id] ?? "")}
                      onValueChange={(val) =>
                        setDataValues((prev) => ({ ...prev, [field.id]: val }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={
                        field.type === "number"
                          ? "number"
                          : field.type === "date"
                            ? "date"
                            : "text"
                      }
                      value={String(dataValues[field.id] ?? "")}
                      onChange={(e) =>
                        setDataValues((prev) => ({
                          ...prev,
                          [field.id]:
                            field.type === "number"
                              ? e.target.value === ""
                                ? null
                                : Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Additional Detail-Only Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Detail Information</CardTitle>
              <CardDescription>
                Extended fields, root-cause notes, tags, and custom attributes stored on this item (not shown in the summary list table).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {configuredDetailFields.map((df) => (
                <div key={df.id} className="space-y-1.5">
                  <Label>{df.label}</Label>
                  {df.type === "textarea" ? (
                    <Textarea
                      value={String(extendedValues[df.id] ?? "")}
                      onChange={(e) =>
                        setExtendedValues((prev) => ({ ...prev, [df.id]: e.target.value }))
                      }
                      rows={3}
                    />
                  ) : (
                    <Input
                      type={df.type === "number" ? "number" : df.type === "date" ? "date" : "text"}
                      value={String(extendedValues[df.id] ?? "")}
                      onChange={(e) =>
                        setExtendedValues((prev) => ({ ...prev, [df.id]: e.target.value }))
                      }
                    />
                  )}
                </div>
              ))}

              {/* Any extra custom keys added to extendedValues */}
              {Object.entries(extendedValues)
                .filter(([k]) => !configuredDetailFields.some((df) => df.id === k))
                .map(([key, val]) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
                    <Input
                      value={String(val ?? "")}
                      onChange={(e) =>
                        setExtendedValues((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}

              <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                <Label className="text-xs font-semibold">Add Custom Detail Attribute</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="Field name (e.g. subcontractor_contact)"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={customVal}
                    onChange={(e) => setCustomVal(e.target.value)}
                    placeholder="Value"
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddCustomAttribute}
                    disabled={!customKey.trim()}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Field
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Detailed Internal Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add comprehensive notes, links, findings, or follow-up details..."
                  rows={5}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="safety, urgent, jobsite-charlotte"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Activity & Comments */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Activity &amp; Updates
              </CardTitle>
              <CardDescription>
                Log progress updates and notes for this item.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {(record.comments ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No comments logged yet.
                  </p>
                ) : (
                  (record.comments ?? []).map((c) => (
                    <div key={c.id} className="rounded-lg border p-3 text-sm space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{c.authorName}</span>
                        <span>{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write an update or comment..."
                  rows={3}
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={saving || !newComment.trim()}
                  onClick={() => void handleSave(newComment.trim())}
                >
                  Post Update
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
