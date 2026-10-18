"use client";

import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
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
  CheckCircle2,
  Eraser,
  FileDown,
  Loader2,
  PenTool,
  Plus,
  Send,
  Star,
  Trash2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import type {
  FormFieldDefinition,
  FormPresentationMode,
  ImportedDocumentTemplate,
  PdfGenerationConfig,
  PlatformLookupSource,
} from "@/lib/form-builder/types";

export interface PlatformLookupDictionary {
  team_members: string[];
  departments: string[];
  projects: string[];
  opportunities: string[];
  safety_sites: string[];
  user_assets: string[];
  lms_courses: string[];
  manual_list: string[];
}

export function SignaturePadControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (dataUri: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [typedName, setTypedName] = useState("");

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setDrawing(true);
  };

  const moveDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setTypedName("");
    onChange("");
  };

  const applyTypedSignature = (name: string) => {
    setTypedName(name);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!name.trim()) {
      onChange("");
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.font = "italic 26px Georgia, serif";
    ctx.fillText(name.trim(), 20, 62);
    onChange(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <PenTool className="h-3.5 w-3.5 text-primary" />
          Sign in the box below or type your full legal name
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={clearPad}
        >
          <Eraser className="mr-1 h-3 w-3" />
          Clear
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        width={480}
        height={100}
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        className="w-full h-[100px] rounded border bg-white cursor-crosshair"
      />
      <div className="flex items-center gap-2">
        <Input
          value={typedName}
          onChange={(e) => applyTypedSignature(e.target.value)}
          placeholder="Or type your full name to generate signature..."
          className="h-8 text-xs"
        />
        {value && (
          <Badge variant="default" className="text-[10px] shrink-0">
            Signature Captured
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * Generates a custom branded Adams Electric PDF from any form submission.
 */
export function generateSubmissionPdf(params: {
  formTitle: string;
  fields: FormFieldDefinition[];
  values: Record<string, unknown>;
  submittedByName: string;
  submittedAt: string;
  signatureDataUri?: string;
  pdfConfig?: PdfGenerationConfig;
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 44;

  // Header Banner
  doc.setFillColor(10, 25, 47);
  doc.rect(0, 0, pageWidth, 78, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(
    params.pdfConfig?.headerTitle ||
      "ADAMS ELECTRIC COMPANY — OFFICIAL FORM RECORD",
    40,
    34,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    params.pdfConfig?.headerSubtitle ||
      "Build Trust Through Performance · Verified Digital Submission",
    40,
    52,
  );
  doc.text(`Form: ${params.formTitle}`, 40, 66);

  y = 104;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Submitted By: ${params.submittedByName}`, 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`Timestamp: ${params.submittedAt}`, pageWidth - 220, y);

  y += 14;
  doc.setDrawColor(203, 213, 225);
  doc.line(40, y, pageWidth - 40, y);
  y += 20;

  for (const field of params.fields) {
    if (y > 680) {
      doc.addPage();
      y = 50;
    }

    const rawVal = params.values[field.key];
    let formattedVal = "—";
    if (field.type === "signature") {
      formattedVal =
        typeof rawVal === "string" && rawVal.startsWith("data:image")
          ? "[Digital Signature Attached Below]"
          : String(rawVal || "Signed");
    } else if (Array.isArray(rawVal)) {
      formattedVal = rawVal
        .map((item) =>
          typeof item === "object" ? JSON.stringify(item) : String(item),
        )
        .join(", ");
    } else if (rawVal !== undefined && rawVal !== null && rawVal !== "") {
      formattedVal = String(rawVal);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`${field.label}:`, 40, y);
    y += 13;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const wrapped = doc.splitTextToSize(formattedVal, pageWidth - 80);
    doc.text(wrapped, 48, y);
    y += wrapped.length * 13 + 8;
  }

  // Embed Digital Signature PNG if present
  const sigUri =
    params.signatureDataUri ||
    (Object.values(params.values).find(
      (v) => typeof v === "string" && v.startsWith("data:image/png"),
    ) as string | undefined);

  if (sigUri && sigUri.startsWith("data:image")) {
    if (y > 610) {
      doc.addPage();
      y = 50;
    }
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Verified Digital Signature:", 40, y);
    y += 8;
    try {
      doc.addImage(sigUri, "PNG", 40, y, 200, 50);
      y += 60;
    } catch {
      // ignore image decode error
    }
  }

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    params.pdfConfig?.footerText ||
      "Generated by Adams Platform Enterprise Form Studio · Build Trust Through Performance",
    40,
    760,
  );

  const safeName = params.formTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 45);
  doc.save(`${safeName}-response.pdf`);
  toast.success("Downloaded custom PDF response report");
}

export function InteractiveFormRunner({
  formTitle,
  formDescription,
  presentationMode,
  fields,
  importedDocument,
  lookupDictionary,
  pdfConfig,
  onSubmitResponse,
  onFieldInteraction,
}: {
  formTitle: string;
  formDescription: string;
  presentationMode: FormPresentationMode;
  fields: FormFieldDefinition[];
  importedDocument?: ImportedDocumentTemplate;
  lookupDictionary: PlatformLookupDictionary;
  pdfConfig?: PdfGenerationConfig;
  onSubmitResponse: (payload: {
    values: Record<string, unknown>;
    signatureDataUri?: string;
    completionSeconds: number;
  }) => Promise<void>;
  onFieldInteraction?: (fieldId: string) => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [formTitle]);

  const setFieldValue = (field: FormFieldDefinition, val: unknown) => {
    setValues((prev) => ({ ...prev, [field.key]: val }));
    onFieldInteraction?.(field.id);
  };

  const getLookupOptions = (source?: PlatformLookupSource, manual?: string[]) => {
    if (!source || source === "manual_list") return manual || [];
    const list = lookupDictionary[source] || [];
    return list.length > 0 ? list : manual || ["Conover NC", "Charlotte NC", "Greenville SC"];
  };

  const renderControlInput = (field: FormFieldDefinition) => {
    const val = values[field.key];

    switch (field.type) {
      case "short_text":
      case "email":
      case "phone":
        return (
          <Input
            type={
              field.type === "email"
                ? "email"
                : field.type === "phone"
                  ? "tel"
                  : "text"
            }
            value={String(val ?? "")}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
            onChange={(e) => setFieldValue(field, e.target.value)}
          />
        );

      case "number":
      case "currency":
        return (
          <Input
            type="number"
            step={field.type === "currency" ? "0.01" : "1"}
            value={String(val ?? "")}
            placeholder={field.type === "currency" ? "0.00" : "0"}
            onChange={(e) => setFieldValue(field, e.target.value)}
          />
        );

      case "date":
      case "datetime":
        return (
          <Input
            type={field.type === "datetime" ? "datetime-local" : "date"}
            value={String(val ?? "")}
            onChange={(e) => setFieldValue(field, e.target.value)}
          />
        );

      case "long_text":
        return (
          <Textarea
            rows={3}
            value={String(val ?? "")}
            placeholder={field.placeholder || "Enter details..."}
            onChange={(e) => setFieldValue(field, e.target.value)}
          />
        );

      case "dropdown":
      case "platform_lookup": {
        const opts =
          field.type === "platform_lookup"
            ? getLookupOptions(field.lookupSource, field.options)
            : field.options || ["Option 1", "Option 2"];
        return (
          <Select
            value={String(val ?? "")}
            onValueChange={(v) => setFieldValue(field, v)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  field.type === "platform_lookup"
                    ? `Select from Adams Platform (${field.lookupSource?.replace("_", " ")})...`
                    : "Select an option..."
                }
              />
            </SelectTrigger>
            <SelectContent>
              {opts.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case "radio": {
        const opts = field.options || ["Option 1", "Option 2"];
        return (
          <div className="flex flex-wrap gap-2">
            {opts.map((opt) => (
              <Button
                key={opt}
                type="button"
                size="sm"
                variant={val === opt ? "default" : "outline"}
                onClick={() => setFieldValue(field, opt)}
              >
                {opt}
              </Button>
            ))}
          </div>
        );
      }

      case "yes_no":
        return (
          <div className="flex gap-2">
            {["Yes", "No"].map((choice) => (
              <Button
                key={choice}
                type="button"
                size="sm"
                variant={val === choice ? "default" : "outline"}
                className="w-24"
                onClick={() => setFieldValue(field, choice)}
              >
                {choice}
              </Button>
            ))}
          </div>
        );

      case "multi_select": {
        const opts = field.options || ["Item 1", "Item 2"];
        const selectedArr = Array.isArray(val) ? (val as string[]) : [];
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            {opts.map((opt) => {
              const checked = selectedArr.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2 rounded-md border p-2 text-xs cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) => {
                      const updated = next
                        ? [...selectedArr, opt]
                        : selectedArr.filter((i) => i !== opt);
                      setFieldValue(field, updated);
                    }}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case "likert_scale":
      case "nps": {
        const min = field.scaleMin ?? (field.type === "nps" ? 0 : 1);
        const max = field.scaleMax ?? (field.type === "nps" ? 10 : 5);
        const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              {nums.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={Number(val) === n ? "default" : "outline"}
                  className="h-9 w-10 font-semibold"
                  onClick={() => setFieldValue(field, n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            {(field.scaleMinLabel || field.scaleMaxLabel) && (
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{field.scaleMinLabel}</span>
                <span>{field.scaleMaxLabel}</span>
              </div>
            )}
          </div>
        );
      }

      case "rating_stars": {
        const max = field.scaleMax ?? 5;
        const current = Number(val ?? 0);
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFieldValue(field, star)}
                className="p-1"
              >
                <Star
                  className={`h-6 w-6 ${
                    star <= current
                      ? "text-amber-400 fill-amber-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
        );
      }

      case "repeating_table": {
        const cols = field.tableColumns || ["Description", "Qty", "Notes"];
        const rows = Array.isArray(val)
          ? (val as Record<string, string>[])
          : [{}];
        return (
          <div className="space-y-2 rounded-lg border p-3">
            {rows.map((row, rIdx) => (
              <div key={rIdx} className="flex items-center gap-2">
                {cols.map((col) => (
                  <Input
                    key={col}
                    value={row[col] || ""}
                    placeholder={col}
                    className="h-8 text-xs"
                    onChange={(e) => {
                      const nextRows = [...rows];
                      nextRows[rIdx] = {
                        ...nextRows[rIdx],
                        [col]: e.target.value,
                      };
                      setFieldValue(field, nextRows);
                    }}
                  />
                ))}
                {rows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setFieldValue(
                        field,
                        rows.filter((_, idx) => idx !== rIdx),
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFieldValue(field, [...rows, {}])}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Row
            </Button>
          </div>
        );
      }

      case "file_upload":
        return (
          <div className="space-y-1">
            <Input
              type="file"
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setFieldValue(field, file.name);
                };
                reader.readAsDataURL(file);
              }}
            />
            {Boolean(val) && (
              <p className="text-xs text-green-600">Attached: {String(val)}</p>
            )}
          </div>
        );

      case "signature":
        return (
          <SignaturePadControl
            value={String(val ?? "")}
            onChange={(uri) => setFieldValue(field, uri)}
          />
        );

      default:
        return (
          <Input
            value={String(val ?? "")}
            onChange={(e) => setFieldValue(field, e.target.value)}
          />
        );
    }
  };

  const handleSubmit = async () => {
    // Check required fields
    for (const f of fields) {
      if (f.required) {
        const v = values[f.key];
        if (
          v === undefined ||
          v === null ||
          v === "" ||
          (Array.isArray(v) && v.length === 0)
        ) {
          toast.error(`Please complete required field: "${f.label}"`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const elapsedSec = Math.max(
        5,
        Math.round((Date.now() - startTimeRef.current) / 1000),
      );
      const sigField = fields.find((f) => f.type === "signature");
      const sigUri = sigField ? String(values[sigField.key] || "") : undefined;

      await onSubmitResponse({
        values,
        signatureDataUri: sigUri,
        completionSeconds: elapsedSec,
      });
      setSubmittedSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-8 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
        <h3 className="text-xl font-bold">Form Response Submitted &amp; Recorded</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Your response to <strong>{formTitle}</strong> has been logged, indexed for analytics, and routed to connected Adams Platform modules.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() =>
              generateSubmissionPdf({
                formTitle,
                fields,
                values,
                submittedByName: String(
                  values.submitted_by_team_member ||
                    values.foreman_name ||
                    values.driver_name ||
                    "Authorized User",
                ),
                submittedAt: new Date().toLocaleString(),
                pdfConfig,
              })
            }
          >
            <FileDown className="mr-2 h-4 w-4" />
            Download Custom PDF Record
          </Button>
          <Button
            onClick={() => {
              setValues({});
              setCurrentStepIdx(0);
              setSubmittedSuccess(false);
            }}
          >
            Submit Another Response
          </Button>
        </div>
      </div>
    );
  }

  // MODE 1: Conversational One-Question-at-a-Time (Typeform / Tally style)
  if (presentationMode === "conversational" && fields.length > 0) {
    const activeField = fields[Math.min(currentStepIdx, fields.length - 1)];
    const pct = Math.round(((currentStepIdx + 1) / fields.length) * 100);
    return (
      <div className="rounded-2xl border p-6 sm:p-10 space-y-6 bg-card shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Question {currentStepIdx + 1} of {fields.length}
            </span>
            <span>{pct}% complete</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="py-6 space-y-4">
          <Label className="text-lg font-semibold block">
            {currentStepIdx + 1}. {activeField.label}{" "}
            {activeField.required && <span className="text-destructive">*</span>}
          </Label>
          {activeField.helpText && (
            <p className="text-xs text-muted-foreground">{activeField.helpText}</p>
          )}
          {renderControlInput(activeField)}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            disabled={currentStepIdx === 0}
            onClick={() => setCurrentStepIdx((i) => Math.max(0, i - 1))}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Previous
          </Button>

          {currentStepIdx < fields.length - 1 ? (
            <Button
              type="button"
              onClick={() =>
                setCurrentStepIdx((i) => Math.min(fields.length - 1, i + 1))
              }
            >
              Next Question
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Form
            </Button>
          )}
        </div>
      </div>
    );
  }

  // MODE 2: Document Overlay Mode (Imported PDF / Word Document Form with Positioned Overlay Fields)
  if (presentationMode === "document_overlay") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-white dark:bg-slate-950 p-6 shadow-inner space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <Badge variant="default" className="mb-1">
                Imported Document Overlay Mode ({importedDocument?.fileType?.toUpperCase() || "PDF/DOCX"})
              </Badge>
              <h3 className="font-bold text-lg">{formTitle}</h3>
              <p className="text-xs text-muted-foreground">
                {importedDocument?.fileName
                  ? `Source Document: ${importedDocument.fileName}`
                  : formDescription}
              </p>
            </div>
          </div>

          {importedDocument?.extractedText && (
            <div className="rounded border bg-muted/20 p-3 text-xs font-mono text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap">
              {importedDocument.extractedText.slice(0, 800)}
            </div>
          )}

          {/* Visual 2-Column Document Overlay Grid */}
          <div className="grid gap-4 sm:grid-cols-12 pt-2">
            {fields.map((field) => {
              const spanFull =
                (field.overlayPosition?.widthPercent ?? 45) > 60 ||
                field.type === "signature" ||
                field.type === "long_text" ||
                field.type === "repeating_table";
              return (
                <div
                  key={field.id}
                  className={`${
                    spanFull ? "sm:col-span-12" : "sm:col-span-6"
                  } rounded-lg border border-primary/25 bg-primary/[0.02] p-3 space-y-1.5`}
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      {field.label}{" "}
                      {field.required && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    <Badge variant="outline" className="text-[10px]">
                      {field.type === "platform_lookup"
                        ? `Lookup: ${field.lookupSource}`
                        : field.type}
                    </Badge>
                  </div>
                  {renderControlInput(field)}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              generateSubmissionPdf({
                formTitle,
                fields,
                values,
                submittedByName: "Preview User",
                submittedAt: new Date().toLocaleString(),
                pdfConfig,
              })
            }
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export Filled PDF
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submit Overlay Form
          </Button>
        </div>
      </div>
    );
  }

  // MODE 3: Standard Multi-Field Form (Jotform / Formstack / Cognito style)
  return (
    <div className="rounded-xl border p-6 space-y-5 bg-card">
      <div className="border-b pb-4">
        <h3 className="text-xl font-bold">{formTitle}</h3>
        <p className="text-sm text-muted-foreground mt-1">{formDescription}</p>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {field.label}{" "}
                {field.required && <span className="text-destructive">*</span>}
              </Label>
              {field.type === "platform_lookup" && (
                <Badge variant="secondary" className="text-[10px]">
                  Live Lookup: {field.lookupSource?.replace("_", " ")}
                </Badge>
              )}
            </div>
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
            {renderControlInput(field)}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            generateSubmissionPdf({
              formTitle,
              fields,
              values,
              submittedByName: "Current User",
              submittedAt: new Date().toLocaleString(),
              pdfConfig,
            })
          }
        >
          <FileDown className="mr-2 h-4 w-4" />
          Generate Custom PDF
        </Button>

        <Button
          type="button"
          disabled={submitting}
          onClick={() => void handleSubmit()}
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Submit Form
        </Button>
      </div>
    </div>
  );
}
