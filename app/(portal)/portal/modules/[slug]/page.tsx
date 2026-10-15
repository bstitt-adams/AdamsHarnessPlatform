"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import type {
  ModuleDefinition,
  ModuleField,
  ModuleRecordType,
} from "@/lib/modules/contract";
import { adamsFetch, adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";

type ModuleRecord = {
  id: string;
  recordTypeId: string;
  formId?: string;
  status: string;
  dueAt?: string;
  data: Record<string, string | number | boolean | null>;
};

type DashboardValue = {
  label: string;
  type: string;
  value?: number;
  breakdown?: Record<string, number>;
  records?: { id: string; dueAt?: string; status: string }[];
};

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

function RecordForm({
  slug,
  definition,
  formId,
  record,
  onSubmitted,
}: {
  slug: string;
  definition: ModuleDefinition;
  formId: string;
  record?: ModuleRecord | null;
  onSubmitted: () => void;
}) {
  const form = definition.forms.find((f) => f.id === formId);
  const recordType = definition.recordTypes.find(
    (r) => r.id === form?.recordTypeId,
  );
  const [values, setValues] = useState<Record<string, string | number | boolean | null>>(
    record?.data ?? {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID());

  if (!form || !recordType) return null;
  const fields = recordType.fields.filter((f) => form.fields.includes(f.id));

  const submit = async () => {
    for (const field of fields) {
      if (field.required) {
        const v = values[field.id];
        if (v === undefined || v === null || v === "") {
          setError(`"${field.label}" is required`);
          return;
        }
      }
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (record) {
        await adamsFetchJson(
          `/api/adams-harness/modules/${encodeURIComponent(slug)}/records/${encodeURIComponent(record.id)}`,
          {
            method: "PATCH",
            headers: { "Idempotency-Key": idemKey },
            body: JSON.stringify({
              formId: form.id,
              data: values,
              status: "completed",
            }),
          },
        );
        setMessage("Record completed.");
      } else {
        await adamsFetchJson(
          `/api/adams-harness/modules/${encodeURIComponent(slug)}/records`,
          {
            method: "POST",
            headers: { "Idempotency-Key": idemKey },
            body: JSON.stringify({ formId: form.id, data: values }),
          },
        );
        setValues({});
        setResetToken((t) => t + 1);
        setMessage("Record submitted.");
      }
      setIdemKey(crypto.randomUUID());
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{form.title}</CardTitle>
        {form.description ? (
          <CardDescription>{form.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1">
            {field.type !== "checkbox" && (
              <Label>
                {field.label}
                {field.required ? " *" : ""}
              </Label>
            )}
            <FieldInput
              key={`${field.id}:${resetToken}`}
              slug={slug}
              field={field}
              value={values[field.id] ?? null}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
            />
            {field.helpText ? (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            ) : null}
          </div>
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <Button onClick={() => void submit()} disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : record ? (
            "Complete Record"
          ) : (
            form.submitLabel
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function DashboardWidget({ widget }: { widget: DashboardValue }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{widget.label}</CardTitle>
      </CardHeader>
      <CardContent>
        {widget.type === "count" && (
          <p className="text-3xl font-bold">{widget.value ?? 0}</p>
        )}
        {widget.type === "status_breakdown" && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(widget.breakdown ?? {}).map(([status, count]) => (
              <Badge key={status} variant="outline">
                {status}: {count}
              </Badge>
            ))}
            {Object.keys(widget.breakdown ?? {}).length === 0 && (
              <p className="text-sm text-muted-foreground">No records yet.</p>
            )}
          </div>
        )}
        {widget.type === "due_list" && (
          <ul className="space-y-1 text-sm">
            {(widget.records ?? []).map((r) => (
              <li key={r.id}>
                {r.dueAt ? new Date(r.dueAt).toLocaleDateString() : "-"}{" "}
                <Badge variant="outline">{r.status}</Badge>
              </li>
            ))}
            {(widget.records ?? []).length === 0 && (
              <li className="text-muted-foreground">Nothing due.</li>
            )}
          </ul>
        )}
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
  const [records, setRecords] = useState<ModuleRecord[]>([]);
  const [dashboards, setDashboards] = useState<DashboardValue[]>([]);
  const [fetching, setFetching] = useState(true);
  const [denied, setDenied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await adamsFetchJson<{ module: ModuleDefinition }>(
      `/api/adams-harness/modules/${encodeURIComponent(slug)}`,
    );
    const recordData = await adamsFetchJson<{
      records: ModuleRecord[];
      dashboards: DashboardValue[];
    }>(`/api/adams-harness/modules/${encodeURIComponent(slug)}/records`);
    return { module: data.module, ...recordData };
  }, [slug]);

  useEffect(() => {
    if (profileLoading || !isAuthenticated) return;
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled) return;
        setDefinition(data.module);
        setRecords(data.records);
        setDashboards(data.dashboards);
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
    const data = await load();
    setDefinition(data.module);
    setRecords(data.records);
    setDashboards(data.dashboards);
  };

  const reloadSafely = async () => {
    try {
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to reload");
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
        <p className="text-muted-foreground">Please sign in to view this module.</p>
      </div>
    );
  }
  if (!definition) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">
          {denied ? "Module unavailable" : "Module not found"}
        </h1>
        <p className="text-muted-foreground">
          {denied
            ? "You do not have access to this module."
            : `No deployed module exists for "${slug}" yet.`}
        </p>
        <Link className="text-primary underline" href="/portal/modules">
          Back to Modules
        </Link>
      </div>
    );
  }

  const recordTypeLabels = new Map(
    definition.recordTypes.map((r: ModuleRecordType) => [r.id, r.label]),
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{definition.name}</h1>
        <p className="text-muted-foreground">{definition.description}</p>
      </div>

      {dashboards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {dashboards.map((widget) => (
            <DashboardWidget key={widget.label} widget={widget} />
          ))}
        </div>
      )}

      {actionError && (
        <p className="text-sm text-destructive">{actionError}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {definition.forms.map((form) => (
          <RecordForm
            key={form.id}
            slug={slug}
            definition={definition}
            formId={form.id}
            onSubmitted={() => void reloadSafely()}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Records</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records yet.</p>
          ) : (
            <div className="space-y-2">
              {records.map((record) => {
                const editableForm = record.formId
                  ? definition.forms.find((f) => f.id === record.formId)
                  : undefined;
                return (
                  <div
                    key={record.id}
                    className="rounded border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {recordTypeLabels.get(record.recordTypeId) ?? record.recordTypeId}
                          </span>
                          <Badge variant="outline">{record.status}</Badge>
                        </div>
                        {record.dueAt && (
                          <p className="text-muted-foreground">
                            Due {new Date(record.dueAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {record.status === "active" && editableForm && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditingId((prev) =>
                              prev === record.id ? null : record.id,
                            )
                          }
                        >
                          {editingId === record.id ? "Close" : "Complete / Edit"}
                        </Button>
                      )}
                    </div>
                    {editingId === record.id && editableForm && (
                      <div className="mt-3">
                        <RecordForm
                          slug={slug}
                          definition={definition}
                          formId={editableForm.id}
                          record={record}
                          onSubmitted={() => {
                            setEditingId(null);
                            void reloadSafely();
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
