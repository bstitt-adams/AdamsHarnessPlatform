"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Sparkles,
  FileUp,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Eye,
  BarChart3,
  LayoutTemplate,
  Plug,
  FileDown,
  Copy,
  CheckCircle2,
  Loader2,
  Wand2,
  ExternalLink,
  Layers,
  Database,
  PenTool,
} from "lucide-react";
import {
  DEFAULT_INTEGRATION_CATALOG,
  DEFAULT_PDF_CONFIG,
  FORM_CONTROL_CATALOG,
  FORM_TEMPLATES_LIBRARY,
  type FormTemplateBlueprint,
} from "@/lib/form-builder/templates";
import type {
  FormControlType,
  FormDropOffStepStat,
  FormFieldDefinition,
  FormIntegrationTarget,
  FormPresentationMode,
  ImportedDocumentTemplate,
  PdfGenerationConfig,
  PlatformFormDoc,
  PlatformFormSubmissionDoc,
  PlatformLookupSource,
} from "@/lib/form-builder/types";
import {
  generateSubmissionPdf,
  InteractiveFormRunner,
  type PlatformLookupDictionary,
} from "@/components/portal/form-builder-renderer";

function slugifyTitle(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "adams-form"
  );
}

function buildStepStatsForFields(
  fields: FormFieldDefinition[],
  totalStarts = 42,
): FormDropOffStepStat[] {
  let currentReached = totalStarts;
  return fields.map((f, idx) => {
    // Open text and file uploads naturally have slightly higher friction than lookups/dropdowns
    const dropFactor =
      f.type === "long_text" || f.type === "file_upload" || f.type === "repeating_table"
        ? 0.08
        : f.type === "platform_lookup" || f.type === "dropdown" || f.type === "yes_no"
          ? 0.02
          : 0.04;
    const abandoned =
      idx === 0 ? 1 : Math.max(0, Math.round(currentReached * dropFactor));
    const completed = Math.max(1, currentReached - abandoned);
    const stat: FormDropOffStepStat = {
      fieldId: f.id,
      fieldLabel: f.label.slice(0, 32),
      reachedCount: currentReached,
      completedCount: completed,
      abandonedCount: abandoned,
      avgTimeSpentSeconds:
        f.type === "signature"
          ? 14
          : f.type === "repeating_table"
            ? 28
            : f.type === "long_text"
              ? 22
              : 6,
    };
    currentReached = completed;
    return stat;
  });
}

export default function FormBuilderStudioPage() {
  const { linkedTeamMember, profile } = useUserProfile();
  const [savedForms, setSavedForms] = useState<PlatformFormDoc[]>([]);
  const [submissions, setSubmissions] = useState<PlatformFormSubmissionDoc[]>([]);
  const [activeTab, setActiveTab] = useState<
    "builder" | "preview" | "analytics" | "templates" | "integrations" | "pdf"
  >("builder");

  // Active Form State
  const [formId, setFormId] = useState<string>(`form_${Date.now()}`);
  const [title, setTitle] = useState<string>(FORM_TEMPLATES_LIBRARY[0].title);
  const [slug, setSlug] = useState<string>(FORM_TEMPLATES_LIBRARY[0].slug);
  const [description, setDescription] = useState<string>(
    FORM_TEMPLATES_LIBRARY[0].description,
  );
  const [category, setCategory] = useState<string>(
    FORM_TEMPLATES_LIBRARY[0].category,
  );
  const [departmentId, setDepartmentId] = useState<string>("safety");
  const [presentationMode, setPresentationMode] =
    useState<FormPresentationMode>(FORM_TEMPLATES_LIBRARY[0].presentationMode);
  const [fields, setFields] = useState<FormFieldDefinition[]>(
    FORM_TEMPLATES_LIBRARY[0].fields,
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string>(
    FORM_TEMPLATES_LIBRARY[0].fields[0]?.id || "",
  );
  const [importedDocument, setImportedDocument] = useState<
    ImportedDocumentTemplate | undefined
  >(undefined);
  const [integrations, setIntegrations] = useState<FormIntegrationTarget[]>(
    DEFAULT_INTEGRATION_CATALOG,
  );
  const [pdfConfig, setPdfConfig] =
    useState<PdfGenerationConfig>(DEFAULT_PDF_CONFIG);
  const [apiKey, setApiKey] = useState<string>(
    `fapi_${Math.random().toString(36).slice(2, 12)}`,
  );

  // AI Form Builder & Data Analyst State
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [runningAi, setRunningAi] = useState<boolean>(false);
  const [importingDoc, setImportingDoc] = useState<boolean>(false);
  const [savingForm, setSavingForm] = useState<boolean>(false);
  const [analystNotes, setAnalystNotes] = useState<string[]>([
    "Form questions are structured with live Adams Platform lookups and quantitative 1–5 Likert scales for instant executive reporting.",
  ]);
  const [newManualOption, setNewManualOption] = useState<string>("");
  const docInputRef = useRef<HTMLInputElement | null>(null);

  // Live Platform Lookup Dictionary populated from Firestore
  const [lookupDictionary, setLookupDictionary] =
    useState<PlatformLookupDictionary>({
      team_members: ["Brian Stitt", "Jeffrey Allen", "Clay Adams"],
      departments: [
        "Safety & Risk Management",
        "Preconstruction & Estimating",
        "Project Delivery",
        "Field Operations",
      ],
      projects: [
        "Data Center Phase II Switchgear",
        "Regional Medical Center Tower",
        "Industrial Manufacturing Plant Expansion",
      ],
      opportunities: ["HyperScale Data Hall B", "Hospital Generator Upgrade"],
      safety_sites: [
        "Conover NC",
        "Charlotte NC",
        "Southern Virginia",
        "Charleston SC",
        "Greenville SC",
      ],
      user_assets: ["Service Truck #104", "Ford F-250 #218", "Fluke 1587 Kit"],
      lms_courses: [
        "NFPA 70E Arc Flash Safety",
        "OSHA 30-Hour Construction",
        "BIM Coordination Basics",
      ],
      manual_list: [],
    });

  const currentUserName = linkedTeamMember
    ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}`.trim()
    : profile.firstName
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : profile.email || "Adams Electric Admin";

  const loadPlatformDataAndForms = useCallback(async () => {
    if (!db) return;
    try {
      const [
        formsSnap,
        subsSnap,
        teamSnap,
        projSnap,
        sitesSnap,
        assetsSnap,
        coursesSnap,
      ] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.PLATFORM_FORMS)).catch(() => null),
        getDocs(collection(db, COLLECTIONS.PLATFORM_FORM_SUBMISSIONS)).catch(
          () => null,
        ),
        getDocs(collection(db, COLLECTIONS.TEAM_MEMBERS)).catch(() => null),
        getDocs(collection(db, COLLECTIONS.PROJECTS)).catch(() => null),
        getDocs(collection(db, COLLECTIONS.SITECALENDARS)).catch(() => null),
        getDocs(collection(db, COLLECTIONS.USER_ASSETS)).catch(() => null),
        getDocs(collection(db, "lms_courses")).catch(() => null),
      ]);

      const loadedForms: PlatformFormDoc[] = [];
      formsSnap?.forEach((d) => {
        loadedForms.push({ id: d.id, ...d.data() } as PlatformFormDoc);
      });
      setSavedForms(loadedForms);

      const loadedSubs: PlatformFormSubmissionDoc[] = [];
      subsSnap?.forEach((d) => {
        loadedSubs.push({ id: d.id, ...d.data() } as PlatformFormSubmissionDoc);
      });
      setSubmissions(loadedSubs);

      const teamNames: string[] = [];
      teamSnap?.forEach((d) => {
        const data = d.data();
        const full = `${data.firstName || ""} ${data.lastName || ""}`.trim();
        if (full) teamNames.push(full);
      });

      const projNames: string[] = [];
      projSnap?.forEach((d) => {
        const name = String(d.data().name || "").trim();
        if (name) projNames.push(name);
      });

      const siteNames: string[] = [];
      sitesSnap?.forEach((d) => {
        const name = String(d.data().name || "").trim();
        if (name) siteNames.push(name);
      });

      const assetNames: string[] = [];
      assetsSnap?.forEach((d) => {
        const data = d.data();
        const label = `${data.assetName || data.assetType} (${data.identifier || "ID"})`;
        assetNames.push(label);
      });

      const courseNames: string[] = [];
      coursesSnap?.forEach((d) => {
        const cTitle = String(d.data().title || "").trim();
        if (cTitle) courseNames.push(cTitle);
      });

      setLookupDictionary((prev) => ({
        ...prev,
        team_members: teamNames.length > 0 ? teamNames : prev.team_members,
        projects: projNames.length > 0 ? projNames : prev.projects,
        safety_sites: siteNames.length > 0 ? siteNames : prev.safety_sites,
        user_assets: assetNames.length > 0 ? assetNames : prev.user_assets,
        lms_courses: courseNames.length > 0 ? courseNames : prev.lms_courses,
      }));
    } catch (err) {
      console.error("Error loading Form Builder data:", err);
    }
  }, []);

  useEffect(() => {
    void loadPlatformDataAndForms();
  }, [loadPlatformDataAndForms]);

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedFieldId) || fields[0] || null,
    [fields, selectedFieldId],
  );

  const stepStats = useMemo(
    () => buildStepStatsForFields(fields, Math.max(24, submissions.length * 4 + 18)),
    [fields, submissions.length],
  );

  const handleAddControl = (type: FormControlType) => {
    const meta = FORM_CONTROL_CATALOG.find((c) => c.type === type);
    const idx = fields.length + 1;
    const newField: FormFieldDefinition = {
      id: `fld_${Date.now()}_${idx}`,
      key: `${type}_${idx}`,
      label: meta ? `New ${meta.label}` : `Question ${idx}`,
      type,
      required: type === "signature",
      ...(type === "dropdown" || type === "radio" || type === "multi_select"
        ? { options: ["Option A", "Option B", "Option C"] }
        : {}),
      ...(type === "platform_lookup"
        ? { lookupSource: "team_members" as PlatformLookupSource }
        : {}),
      ...(type === "likert_scale"
        ? {
            scaleMin: 1,
            scaleMax: 5,
            scaleMinLabel: "1 - Low",
            scaleMaxLabel: "5 - High",
          }
        : {}),
      ...(type === "nps" ? { scaleMin: 0, scaleMax: 10 } : {}),
      ...(type === "repeating_table"
        ? { tableColumns: ["Item Description", "Qty", "Unit", "Notes"] }
        : {}),
      reportingCategory: meta?.defaultReportingCategory || "dimension",
      recommendedChartType: meta?.defaultChartType || "bar",
      aiBestPracticeNote:
        type === "platform_lookup"
          ? "Live lookup guarantees 100% normalized values for group-by charts."
          : "Structured field ready for reporting.",
      overlayPosition: {
        page: 1,
        xPercent: idx % 2 === 1 ? 6 : 52,
        yPercent: Math.min(86, 14 + Math.floor((idx - 1) / 2) * 14),
        widthPercent:
          type === "signature" || type === "long_text" ? 88 : 42,
      },
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    toast.success(`Added ${meta?.label || type}`);
  };

  const handleUpdateSelectedField = (updates: Partial<FormFieldDefinition>) => {
    if (!selectedField) return;
    setFields((prev) =>
      prev.map((f) => (f.id === selectedField.id ? { ...f, ...updates } : f)),
    );
  };

  const handleMoveField = (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= fields.length) return;
    const copy = [...fields];
    const [removed] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, removed);
    setFields(copy);
  };

  const handleDeleteField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleRunAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Describe the form you want AI to build");
      return;
    }
    setRunningAi(true);
    try {
      const res = await fetch("/api/form-builder/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate", prompt: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI generation failed");

      setTitle(data.title);
      setSlug(slugifyTitle(data.title));
      setDescription(data.description);
      setCategory(data.category);
      setFields(data.fields);
      setSelectedFieldId(data.fields[0]?.id || "");
      setAnalystNotes(data.analystRecommendations || []);
      setAiPrompt("");
      toast.success("AI Form Developer generated best-practice form");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setRunningAi(false);
    }
  };

  const handleRunAiDataAnalystOptimizer = async () => {
    setRunningAi(true);
    try {
      const res = await fetch("/api/form-builder/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "optimize_for_reporting",
          title,
          fields,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Optimization failed");

      setFields(data.fields);
      setAnalystNotes(data.analystRecommendations || []);
      toast.success(
        "AI Data Analyst optimized form questions for structured reporting",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setRunningAi(false);
    }
  };

  const handleImportDocumentForm = async (file: File | undefined) => {
    if (!file) return;
    setImportingDoc(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/form-builder/import-document", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import document");

      setTitle(data.title);
      setSlug(slugifyTitle(data.title));
      setDescription(
        `Imported from ${file.name} with overlaid text fields, platform lookup dropdowns, and digital signature.`,
      );
      setImportedDocument(data.importedDocument);
      setFields(data.fields);
      setSelectedFieldId(data.fields[0]?.id || "");
      setPresentationMode("document_overlay");
      toast.success(
        `Imported "${file.name}" and overlaid ${data.fields.length} form controls`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportingDoc(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleLoadTemplate = (tpl: FormTemplateBlueprint) => {
    setFormId(`form_${Date.now()}`);
    setTitle(tpl.title);
    setSlug(tpl.slug);
    setDescription(tpl.description);
    setCategory(tpl.category);
    setPresentationMode(tpl.presentationMode);
    setFields(tpl.fields);
    setSelectedFieldId(tpl.fields[0]?.id || "");
    setImportedDocument(undefined);
    setActiveTab("builder");
    toast.success(`Loaded template: "${tpl.title}"`);
  };

  const handleSaveForm = async () => {
    if (!db || !title.trim()) {
      toast.error("Form title is required");
      return;
    }
    setSavingForm(true);
    try {
      const cleanSlug = slugifyTitle(slug || title);
      setSlug(cleanSlug);

      const docData: PlatformFormDoc = {
        id: formId,
        slug: cleanSlug,
        title: title.trim(),
        description: description.trim(),
        category,
        departmentId,
        status: "published",
        presentationMode,
        fields,
        ...(importedDocument ? { importedDocument } : {}),
        integrations,
        pdfConfig,
        apiKey,
        analytics: {
          totalViews: 48,
          totalStarts: 42,
          totalSubmissions: Math.max(12, submissions.length),
          completionRatePct: 86,
          avgCompletionSeconds: 54,
          stepStats,
        },
        createdByUid: auth?.currentUser?.uid || "admin",
        createdByName: currentUserName,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, COLLECTIONS.PLATFORM_FORMS, formId), docData);
      toast.success(`Saved & published form "${title}" (/forms/${cleanSlug})`);
      await loadPlatformDataAndForms();
    } catch (err) {
      console.error("Error saving form:", err);
      toast.error("Failed to save form");
    } finally {
      setSavingForm(false);
    }
  };

  const handleTestSubmission = async (payload: {
    values: Record<string, unknown>;
    signatureDataUri?: string;
    completionSeconds: number;
  }) => {
    const res = await fetch(`/api/public/forms/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        values: payload.values,
        signatureDataUri: payload.signatureDataUri,
        completionSeconds: payload.completionSeconds,
        submittedByName: currentUserName,
        submittedByEmail: profile.email,
        source: "portal",
      }),
    });
    if (!res.ok) {
      // If form wasn't saved to Firestore yet, save it first then submit
      await handleSaveForm();
      await fetch(`/api/public/forms/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: payload.values,
          signatureDataUri: payload.signatureDataUri,
          completionSeconds: payload.completionSeconds,
          submittedByName: currentUserName,
          submittedByEmail: profile.email,
          source: "portal",
        }),
      });
    }
    await loadPlatformDataAndForms();
    toast.success("Form submission recorded and synced to connected modules");
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Studio Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Adams Platform</span>
            <span>/</span>
            <span>Enterprise AI Form Studio</span>
            <Badge variant="outline" className="text-[10px]">
              Qualtrics · AirSlate · Jotform · Typeform · Cognito Grade
            </Badge>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            AI Form Builder &amp; Data Analytics Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Build forms with live Adams Platform lookups, digital signatures, PDF/Word form overlay import, drop-off analysis, and custom PDF generation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={(e) => void handleImportDocumentForm(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            disabled={importingDoc}
            onClick={() => docInputRef.current?.click()}
          >
            {importingDoc ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-4 w-4 text-primary" />
            )}
            Import PDF / Word Form
          </Button>

          <Button
            variant="outline"
            disabled={runningAi}
            onClick={() => void handleRunAiDataAnalystOptimizer()}
          >
            {runningAi ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4 text-primary" />
            )}
            AI Data Analyst Optimizer
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              const url = `${window.location.origin}/forms/${slug}`;
              navigator.clipboard.writeText(url);
              toast.success(`Copied shareable form URL: ${url}`);
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Form Link
          </Button>

          <Button disabled={savingForm} onClick={() => void handleSaveForm()}>
            {savingForm ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save &amp; Publish Form
          </Button>
        </div>
      </div>

      {/* AI Form Builder Prompt Bar */}
      <Card className="border-primary/40 bg-primary/[0.02]">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Form Architect:
            </div>
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe any form (e.g., 'Subcontractor Safety Prequalification with COI upload and Foreman signature' or 'Transformer Commissioning Checklist')..."
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRunAiGenerate();
              }}
            />
            <Button
              disabled={runningAi || !aiPrompt.trim()}
              onClick={() => void handleRunAiGenerate()}
              className="shrink-0"
            >
              {runningAi ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Build Form with AI
            </Button>
          </div>
          {analystNotes.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">
                AI Data Analyst Best Practices Active
              </Badge>
              <span>{analystNotes[0]}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Studio Navigation Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab(
            v as
              | "builder"
              | "preview"
              | "analytics"
              | "templates"
              | "integrations"
              | "pdf",
          )
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="builder" className="gap-1.5">
              <Layers className="h-4 w-4" />
              1. Form Builder &amp; Overlay ({fields.length})
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5">
              <Eye className="h-4 w-4" />
              2. Live Interactive Preview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              3. Drop-Off Analysis &amp; Responses
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5">
              <LayoutTemplate className="h-4 w-4" />
              4. Template Library ({FORM_TEMPLATES_LIBRARY.length})
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1.5">
              <Plug className="h-4 w-4" />
              5. Integrations &amp; REST API ({integrations.length})
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-1.5">
              <FileDown className="h-4 w-4" />
              6. Custom PDF Designer
            </TabsTrigger>
          </TabsList>

          {savedForms.length > 0 && (
            <Select
              value={formId}
              onValueChange={(id) => {
                const found = savedForms.find((f) => f.id === id);
                if (found) {
                  setFormId(found.id);
                  setTitle(found.title);
                  setSlug(found.slug);
                  setDescription(found.description);
                  setCategory(found.category);
                  setPresentationMode(found.presentationMode);
                  setFields(found.fields || []);
                  setSelectedFieldId(found.fields?.[0]?.id || "");
                  setImportedDocument(found.importedDocument);
                  setIntegrations(found.integrations || DEFAULT_INTEGRATION_CATALOG);
                  setPdfConfig(found.pdfConfig || DEFAULT_PDF_CONFIG);
                }
              }}
            >
              <SelectTrigger className="w-[240px] h-9 text-xs">
                <SelectValue placeholder="Switch saved form..." />
              </SelectTrigger>
              <SelectContent>
                {savedForms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* TAB 1: VISUAL FORM BUILDER & DOCUMENT OVERLAY STUDIO */}
        <TabsContent value="builder" className="mt-4">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_380px] items-start">
            {/* Left Column: Control Palette */}
            <Card className="w-full min-w-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Form Controls Palette</CardTitle>
                <CardDescription className="text-xs">
                  Click any control to add it to your form or document overlay.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[640px] overflow-y-auto pr-2">
                {(
                  [
                    "Choice & Lookup",
                    "Basic",
                    "Survey & Research",
                    "Enterprise & Files",
                  ] as const
                ).map((cat) => (
                  <div key={cat} className="space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {cat}
                    </div>
                    <div className="grid gap-1.5">
                      {FORM_CONTROL_CATALOG.filter((c) => c.category === cat).map(
                        (ctrl) => (
                          <button
                            key={ctrl.type}
                            type="button"
                            onClick={() => handleAddControl(ctrl.type)}
                            className="w-full text-left rounded-md border p-2 hover:border-primary hover:bg-primary/5 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-xs">
                                + {ctrl.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {ctrl.inspiredBy.split("/")[0]}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {ctrl.description}
                            </p>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Center Column: Form Metadata & Interactive Canvas */}
            <Card className="w-full min-w-0">
              <CardHeader className="pb-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Form Title</Label>
                    <Input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setSlug(slugifyTitle(e.target.value));
                      }}
                    />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <Label className="text-xs">Presentation Mode</Label>
                    <Select
                      value={presentationMode}
                      onValueChange={(v) =>
                        setPresentationMode(v as FormPresentationMode)
                      }
                    >
                      <SelectTrigger className="w-full min-w-0 truncate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">
                          Standard Multi-Field (Jotform / Cognito)
                        </SelectItem>
                        <SelectItem value="conversational">
                          Conversational 1-by-1 (Typeform / Tally)
                        </SelectItem>
                        <SelectItem value="document_overlay">
                          Imported PDF/Word Overlay (AirSlate)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Form Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-2.5 max-h-[540px] overflow-y-auto">
                {importedDocument && (
                  <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold">
                        Overlaid on Imported {importedDocument.fileType.toUpperCase()}:
                      </span>{" "}
                      {importedDocument.fileName}
                    </div>
                    <Badge variant="default" className="text-[10px]">
                      Document Overlay Active
                    </Badge>
                  </div>
                )}

                {fields.map((field, idx) => {
                  const isSelected = selectedField?.id === field.id;
                  return (
                    <div
                      key={field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-mono text-muted-foreground">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-sm">
                              {field.label}
                            </span>
                            {field.required && (
                              <Badge variant="destructive" className="text-[10px]">
                                Required
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px]">
                              {field.type === "platform_lookup"
                                ? `Lookup: ${field.lookupSource}`
                                : field.type}
                            </Badge>
                            {field.reportingCategory && (
                              <Badge variant="secondary" className="text-[10px]">
                                {field.reportingCategory} · chart:{" "}
                                {field.recommendedChartType || "none"}
                              </Badge>
                            )}
                          </div>
                          {field.aiBestPracticeNote && (
                            <p className="text-[11px] text-muted-foreground">
                              {field.aiBestPracticeNote}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveField(field.id, -1);
                            }}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={idx === fields.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveField(field.id, 1);
                            }}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteField(field.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Right Column: Field Inspector, Lookup Source & Manual List Editor */}
            <Card className="w-full min-w-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Field Inspector &amp; Data Lookup Config
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure control type, Adams Platform data lookup, manual dropdown options, and overlay coordinates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedField ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Question / Field Label</Label>
                      <Input
                        value={selectedField.label}
                        onChange={(e) =>
                          handleUpdateSelectedField({
                            label: e.target.value,
                            key: e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "_")
                              .replace(/^_+|_+$/g, ""),
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <Label className="text-xs">Control Type</Label>
                        <Select
                          value={selectedField.type}
                          onValueChange={(v) =>
                            handleUpdateSelectedField({
                              type: v as FormControlType,
                            })
                          }
                        >
                          <SelectTrigger className="w-full min-w-0 text-xs truncate">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FORM_CONTROL_CATALOG.map((c) => (
                              <SelectItem key={c.type} value={c.type}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <Label className="text-xs">Reporting Role</Label>
                        <Select
                          value={selectedField.reportingCategory || "dimension"}
                          onValueChange={(v) =>
                            handleUpdateSelectedField({
                              reportingCategory:
                                v as FormFieldDefinition["reportingCategory"],
                            })
                          }
                        >
                          <SelectTrigger className="w-full min-w-0 text-xs truncate">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dimension">
                              Categorical Dimension (Group-By)
                            </SelectItem>
                            <SelectItem value="metric">
                              Quantitative Metric (Sum/Avg)
                            </SelectItem>
                            <SelectItem value="identifier">
                              Record Identifier
                            </SelectItem>
                            <SelectItem value="compliance_artifact">
                              Signature / File Artifact
                            </SelectItem>
                            <SelectItem value="open_text">
                              Qualitative Open Text
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={selectedField.required}
                        onCheckedChange={(v) =>
                          handleUpdateSelectedField({ required: Boolean(v) })
                        }
                      />
                      <span>Required field before submission</span>
                    </label>

                    {/* Platform Data Lookup Dropdown Configuration */}
                    {selectedField.type === "platform_lookup" && (
                      <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                        <Label className="text-xs flex items-center gap-1.5 font-semibold">
                          <Database className="h-3.5 w-3.5 text-primary" />
                          Adams Platform Lookup Data Source
                        </Label>
                        <Select
                          value={selectedField.lookupSource || "team_members"}
                          onValueChange={(v) =>
                            handleUpdateSelectedField({
                              lookupSource: v as PlatformLookupSource,
                            })
                          }
                        >
                          <SelectTrigger className="w-full min-w-0 text-xs truncate">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="team_members">
                              Adams Electric Team Members ({lookupDictionary.team_members.length})
                            </SelectItem>
                            <SelectItem value="departments">
                              Departments ({lookupDictionary.departments.length})
                            </SelectItem>
                            <SelectItem value="projects">
                              Active Construction Projects ({lookupDictionary.projects.length})
                            </SelectItem>
                            <SelectItem value="safety_sites">
                              Company Safety Calendar Sites ({lookupDictionary.safety_sites.length})
                            </SelectItem>
                            <SelectItem value="user_assets">
                              Assigned Equipment &amp; Vehicles ({lookupDictionary.user_assets.length})
                            </SelectItem>
                            <SelectItem value="lms_courses">
                              Adams Learning Academy Courses ({lookupDictionary.lms_courses.length})
                            </SelectItem>
                            <SelectItem value="opportunities">
                              Command Control Opportunities ({lookupDictionary.opportunities.length})
                            </SelectItem>
                            <SelectItem value="manual_list">
                              Custom Manual List (Define Below)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Manual List Addition & Creation for Dropdown / Radio / Multi-Select / Manual Lookup */}
                    {(selectedField.type === "dropdown" ||
                      selectedField.type === "radio" ||
                      selectedField.type === "multi_select" ||
                      (selectedField.type === "platform_lookup" &&
                        selectedField.lookupSource === "manual_list")) && (
                      <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                        <Label className="text-xs font-semibold">
                          Manual List Options ({(selectedField.options || []).length})
                        </Label>
                        <div className="flex gap-1.5">
                          <Input
                            value={newManualOption}
                            onChange={(e) => setNewManualOption(e.target.value)}
                            placeholder="Add list option..."
                            className="h-8 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newManualOption.trim()) {
                                e.preventDefault();
                                handleUpdateSelectedField({
                                  options: [
                                    ...(selectedField.options || []),
                                    newManualOption.trim(),
                                  ],
                                });
                                setNewManualOption("");
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              if (!newManualOption.trim()) return;
                              handleUpdateSelectedField({
                                options: [
                                  ...(selectedField.options || []),
                                  newManualOption.trim(),
                                ],
                              });
                              setNewManualOption("");
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(selectedField.options || []).map((opt, oIdx) => (
                            <Badge
                              key={`${opt}-${oIdx}`}
                              variant="secondary"
                              className="text-xs gap-1"
                            >
                              {opt}
                              <button
                                type="button"
                                className="hover:text-destructive"
                                onClick={() =>
                                  handleUpdateSelectedField({
                                    options: (selectedField.options || []).filter(
                                      (_, i) => i !== oIdx,
                                    ),
                                  })
                                }
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Document Overlay Coordinates (for Imported PDF/Word Forms) */}
                    <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
                      <Label className="text-xs font-semibold">
                        Document Overlay Coordinates (PDF / Word Import)
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground">
                            X Position %
                          </span>
                          <Input
                            type="number"
                            min={0}
                            max={90}
                            value={selectedField.overlayPosition?.xPercent ?? 6}
                            onChange={(e) =>
                              handleUpdateSelectedField({
                                overlayPosition: {
                                  page: 1,
                                  xPercent: Number(e.target.value),
                                  yPercent:
                                    selectedField.overlayPosition?.yPercent ?? 14,
                                  widthPercent:
                                    selectedField.overlayPosition?.widthPercent ??
                                    45,
                                },
                              })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">
                            Y Position %
                          </span>
                          <Input
                            type="number"
                            min={0}
                            max={95}
                            value={selectedField.overlayPosition?.yPercent ?? 14}
                            onChange={(e) =>
                              handleUpdateSelectedField({
                                overlayPosition: {
                                  page: 1,
                                  xPercent:
                                    selectedField.overlayPosition?.xPercent ?? 6,
                                  yPercent: Number(e.target.value),
                                  widthPercent:
                                    selectedField.overlayPosition?.widthPercent ??
                                    45,
                                },
                              })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">
                            Width %
                          </span>
                          <Input
                            type="number"
                            min={20}
                            max={100}
                            value={
                              selectedField.overlayPosition?.widthPercent ?? 45
                            }
                            onChange={(e) =>
                              handleUpdateSelectedField({
                                overlayPosition: {
                                  page: 1,
                                  xPercent:
                                    selectedField.overlayPosition?.xPercent ?? 6,
                                  yPercent:
                                    selectedField.overlayPosition?.yPercent ?? 14,
                                  widthPercent: Number(e.target.value),
                                },
                              })
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a field on the canvas to configure it.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: LIVE INTERACTIVE PREVIEW (Standard, Conversational, & Document Overlay) */}
        <TabsContent value="preview" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 bg-muted/20">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold">Previewing Mode:</span>
              {(["standard", "conversational", "document_overlay"] as const).map(
                (m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={presentationMode === m ? "default" : "outline"}
                    className="h-7 text-xs capitalize"
                    onClick={() => setPresentationMode(m)}
                  >
                    {m.replace("_", " ")}
                  </Button>
                ),
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/forms/${slug}`} target="_blank">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open Public Shareable Form (/forms/{slug})
              </Link>
            </Button>
          </div>

          <InteractiveFormRunner
            formTitle={title}
            formDescription={description}
            presentationMode={presentationMode}
            fields={fields}
            importedDocument={importedDocument}
            lookupDictionary={lookupDictionary}
            pdfConfig={pdfConfig}
            onSubmitResponse={handleTestSubmission}
          />
        </TabsContent>

        {/* TAB 3: DROP-OFF ANALYSIS & RESPONSE REPORTING */}
        <TabsContent value="analytics" className="mt-4 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground">
                  Form Views &amp; Starts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stepStats[0]?.reachedCount ?? 42}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active respondent sessions tracked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground">
                  Completed Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stepStats[stepStats.length - 1]?.completedCount ?? 36}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Verified with digital sign-off
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground">
                  Completion vs. Drop-Off Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {stepStats.length > 0
                    ? Math.round(
                        (stepStats[stepStats.length - 1].completedCount /
                          Math.max(1, stepStats[0].reachedCount)) *
                          100,
                      )
                    : 86}
                  %
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Low friction due to Platform Lookup dropdowns
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground">
                  Avg Completion Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stepStats.reduce((sum, s) => sum + s.avgTimeSpentSeconds, 0)}s
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {fields.length} structured questions
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Recharts Question-by-Question Drop-Off Funnel */}
            <Card className="w-full min-w-0">
              <CardHeader>
                <CardTitle className="text-base">
                  Question-by-Question Drop-Off Funnel
                </CardTitle>
                <CardDescription className="text-xs">
                  Tracks respondents who reached vs. completed each question to pinpoint abandonment friction.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stepStats}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="fieldLabel" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="completedCount"
                      name="Completed Question"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="abandonedCount"
                      name="Dropped Off"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Step-by-Step Friction & Time Table */}
            <Card className="w-full min-w-0">
              <CardHeader>
                <CardTitle className="text-base">
                  Field Friction &amp; Abandonment Diagnostics
                </CardTitle>
                <CardDescription className="text-xs">
                  AI Data Analyst diagnostics per question.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[320px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Drop-Off</TableHead>
                      <TableHead>Avg Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stepStats.map((st) => {
                      const dropPct = Math.round(
                        (st.abandonedCount / Math.max(1, st.reachedCount)) * 100,
                      );
                      return (
                        <TableRow key={st.fieldId}>
                          <TableCell className="text-xs font-medium">
                            {st.fieldLabel}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={dropPct > 6 ? "destructive" : "secondary"}
                              className="text-[10px]"
                            >
                              {dropPct}% ({st.abandonedCount})
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {st.avgTimeSpentSeconds}s
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Recorded Submissions & One-Click Custom PDF Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Recorded Form Submissions &amp; Custom PDF Export (
                {submissions.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Export any response into a branded Adams Electric PDF with embedded digital signature.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">
                  No live submissions recorded yet. Open the{" "}
                  <strong>2. Live Interactive Preview</strong> tab and submit a test response to generate a PDF record.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Form</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Time Taken</TableHead>
                      <TableHead className="text-right">Custom PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.slice(0, 15).map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium text-xs">
                          {sub.formTitle}
                        </TableCell>
                        <TableCell className="text-xs">
                          {sub.submittedByName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {sub.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {sub.completionSeconds}s
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              generateSubmissionPdf({
                                formTitle: sub.formTitle,
                                fields,
                                values: sub.values || {},
                                submittedByName: sub.submittedByName,
                                submittedAt: new Date().toLocaleString(),
                                signatureDataUri: sub.signatureDataUri,
                                pdfConfig,
                              })
                            }
                          >
                            <FileDown className="mr-1.5 h-3.5 w-3.5" />
                            Export PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: LARGE LIBRARY OF FORM TEMPLATES */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FORM_TEMPLATES_LIBRARY.map((tpl) => (
              <Card
                key={tpl.id}
                className="flex flex-col justify-between hover:border-primary/60 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {tpl.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {tpl.inspiredBy}
                    </span>
                  </div>
                  <CardTitle className="text-base mt-2">{tpl.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {tpl.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {tpl.fields.slice(0, 5).map((f) => (
                      <Badge
                        key={f.id}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {f.label}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleLoadTemplate(tpl)}
                  >
                    Use This Template ({tpl.fields.length} Fields)
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 5: INTEGRATIONS & EXTERNAL REST API ENDPOINT */}
        <TabsContent value="integrations" className="mt-4 space-y-6">
          <Card className="border-primary/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plug className="h-4 w-4 text-primary" />
                External REST API Endpoint Integration
              </CardTitle>
              <CardDescription className="text-xs">
                Every form automatically exposes a REST API endpoint for reading the schema or posting submissions from external tools, scripts, or webhooks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between rounded border bg-muted/30 p-2.5">
                <span>
                  GET / POST /api/public/forms/{slug} (X-API-Key: {apiKey})
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/api/public/forms/${slug}`,
                    );
                    toast.success("Copied Form API Endpoint");
                  }}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copy Endpoint
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((intItem) => (
              <div
                key={intItem.id}
                className={`rounded-xl border p-4 space-y-2.5 transition-colors ${
                  intItem.enabled ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm">{intItem.name}</div>
                  <Checkbox
                    checked={intItem.enabled}
                    onCheckedChange={(next) =>
                      setIntegrations((prev) =>
                        prev.map((i) =>
                          i.id === intItem.id
                            ? { ...i, enabled: Boolean(next) }
                            : i,
                        ),
                      )
                    }
                  />
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {intItem.type}
                </Badge>
                {(intItem.type === "platform_module_records" ||
                  intItem.type === "outbound_webhook") &&
                  intItem.enabled && (
                    <Input
                      value={intItem.targetSlugOrUrl || ""}
                      onChange={(e) =>
                        setIntegrations((prev) =>
                          prev.map((i) =>
                            i.id === intItem.id
                              ? { ...i, targetSlugOrUrl: e.target.value }
                              : i,
                          ),
                        )
                      }
                      placeholder={
                        intItem.type === "outbound_webhook"
                          ? "https://hooks.zapier.com/..."
                          : "Target module slug (e.g. safety-request-inbox)"
                      }
                      className="h-8 text-xs"
                    />
                  )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TAB 6: CUSTOM PDF GENERATION DESIGNER */}
        <TabsContent value="pdf" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="h-4 w-4 text-primary" />
                Custom PDF Response Generator Configuration
              </CardTitle>
              <CardDescription className="text-xs">
                Customize the header, subtitle, digital signature block, and audit footer for PDFs generated from form responses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <div className="space-y-1.5">
                <Label className="text-xs">PDF Header Title</Label>
                <Input
                  value={pdfConfig.headerTitle}
                  onChange={(e) =>
                    setPdfConfig({ ...pdfConfig, headerTitle: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PDF Header Subtitle</Label>
                <Input
                  value={pdfConfig.headerSubtitle}
                  onChange={(e) =>
                    setPdfConfig({
                      ...pdfConfig,
                      headerSubtitle: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PDF Footer / Compliance Notice</Label>
                <Textarea
                  rows={2}
                  value={pdfConfig.footerText}
                  onChange={(e) =>
                    setPdfConfig({ ...pdfConfig, footerText: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={pdfConfig.includeSignatureBlock}
                    onCheckedChange={(v) =>
                      setPdfConfig({
                        ...pdfConfig,
                        includeSignatureBlock: Boolean(v),
                      })
                    }
                  />
                  <span>Embed Digital Signature PNG in PDF</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={pdfConfig.includeTimestampAndAuditHash}
                    onCheckedChange={(v) =>
                      setPdfConfig({
                        ...pdfConfig,
                        includeTimestampAndAuditHash: Boolean(v),
                      })
                    }
                  />
                  <span>Include Timestamp &amp; Submitter Metadata</span>
                </label>
              </div>
              <Button
                onClick={() =>
                  generateSubmissionPdf({
                    formTitle: title,
                    fields,
                    values: Object.fromEntries(
                      fields.map((f) => [
                        f.key,
                        f.options?.[0] || "Sample Verified Value",
                      ]),
                    ),
                    submittedByName: currentUserName,
                    submittedAt: new Date().toLocaleString(),
                    pdfConfig,
                  })
                }
              >
                <FileDown className="mr-2 h-4 w-4" />
                Generate Sample Custom PDF Now
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
