"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Loader2, OctagonX, Paperclip, Truck, XCircle } from "lucide-react";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";
import { DAILY_CHECKLIST_ITEMS } from "@/lib/safety/vehicle-checklist";
import type { InspectionItemResult, VehicleInspectionDoc } from "@/lib/schema";

const OUTCOME_STYLES: Record<VehicleInspectionDoc["outcome"], { label: string; className: string }> = {
  passed: { label: "Passed", className: "bg-emerald-100 text-emerald-800" },
  defects: { label: "Defects found", className: "bg-amber-100 text-amber-800" },
  out_of_service: { label: "Out of service", className: "bg-red-100 text-red-800" },
};

async function authHeaders(): Promise<HeadersInit> {
  const token = await auth?.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function VehicleInspectionPage() {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vinOrPlate, setVinOrPlate] = useState("");
  const [mileage, setMileage] = useState("");
  const [checklist, setChecklist] = useState<Record<string, InspectionItemResult>>({});
  const [defectNotes, setDefectNotes] = useState("");
  const [outOfService, setOutOfService] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [inspections, setInspections] = useState<VehicleInspectionDoc[]>([]);
  const [isSafety, setIsSafety] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const loadInspections = useCallback(async () => {
    setLoadingList(true);
    try {
      const response = await fetch("/api/vehicle-inspections", { headers: await authHeaders(), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load");
      setInspections(data.inspections || []);
      setIsSafety(data.safety === true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load inspections");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadInspections();
  }, [loadInspections]);

  const failCount = Object.values(checklist).filter((v) => v === "fail").length;
  const allAnswered = DAILY_CHECKLIST_ITEMS.every((item) => checklist[item.id]);

  const submit = async () => {
    if (!vehicleNumber.trim()) {
      toast.error("Vehicle / unit number is required");
      return;
    }
    if (!allAnswered) {
      toast.error("Answer every checklist item (Pass / Fail / N/A)");
      return;
    }
    setSubmitting(true);
    try {
      const inspectionId = crypto.randomUUID();
      const photoPaths: string[] = [];
      if (storage && photos.length) {
        for (const file of photos.slice(0, 10)) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `vehicle-inspections/${inspectionId}/${safeName}`;
          await uploadBytes(ref(storage, path), file, { contentType: file.type || "image/jpeg" });
          photoPaths.push(path);
        }
      }
      const response = await fetch("/api/vehicle-inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          vehicleNumber: vehicleNumber.trim(),
          vinOrPlate: vinOrPlate.trim() || undefined,
          mileage: mileage ? Number(mileage) : undefined,
          checklist,
          defectNotes: defectNotes.trim() || undefined,
          photoPaths,
          outOfService,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed");
      toast.success(data.outcome === "passed" ? "Inspection recorded — passed" : "Inspection recorded — defects reported to Safety");
      setChecklist({});
      setDefectNotes("");
      setPhotos([]);
      setOutOfService(false);
      void loadInspections();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value: unknown) => {
    const ts = value as { toDate?: () => Date; seconds?: number } | undefined;
    const date = ts?.toDate?.() ?? (ts?.seconds ? new Date(ts.seconds * 1000) : null);
    return date ? date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          Vehicle Inspection
        </h1>
        <p className="text-muted-foreground mt-2">
          Daily pre-trip vehicle checklist for Adams Electric field crews.
        </p>
      </div>

      <Tabs defaultValue="inspect">
        <TabsList>
          <TabsTrigger value="inspect">New Inspection</TabsTrigger>
          <TabsTrigger value="history">{isSafety ? "All Inspections" : "My Inspections"}</TabsTrigger>
        </TabsList>

        <TabsContent value="inspect">
          <Card>
            <CardHeader>
              <CardTitle>Daily pre-trip checklist</CardTitle>
              <CardDescription>Mark each item Pass, Fail, or N/A. Any fail flags the vehicle for Safety review.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Vehicle / Unit # *</Label>
                  <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="e.g., AE-214" />
                </div>
                <div className="space-y-2">
                  <Label>VIN / Plate</Label>
                  <Input value={vinOrPlate} onChange={(e) => setVinOrPlate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mileage</Label>
                  <Input type="number" min={0} value={mileage} onChange={(e) => setMileage(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                {DAILY_CHECKLIST_ITEMS.map((item) => {
                  const value = checklist[item.id];
                  return (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                      <span className="text-sm">{item.label}</span>
                      <div className="flex gap-1">
                        {(["pass", "fail", "na"] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setChecklist((prev) => ({ ...prev, [item.id]: option }))}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                              value === option
                                ? option === "pass"
                                  ? "bg-emerald-600 text-white"
                                  : option === "fail"
                                    ? "bg-red-600 text-white"
                                    : "bg-slate-500 text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {option === "na" ? "N/A" : option[0].toUpperCase() + option.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label>Defect notes {failCount > 0 && <span className="text-red-600">(required — {failCount} item{failCount === 1 ? "" : "s"} failed)</span>}</Label>
                <Textarea value={defectNotes} onChange={(e) => setDefectNotes(e.target.value)} rows={3} placeholder="Describe any defects, damage, or concerns" />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                  <Paperclip className="mr-2 h-4 w-4" /> Photos ({photos.length})
                </Button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setPhotos(Array.from(e.target.files || []).slice(0, 10))}
                />
                <label className="flex items-center gap-2 text-sm font-medium text-red-700">
                  <input type="checkbox" checked={outOfService} onChange={(e) => setOutOfService(e.target.checked)} className="h-4 w-4" />
                  Unsafe to drive — take vehicle out of service
                </label>
              </div>

              <Button onClick={() => void submit()} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Submit Inspection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>{isSafety ? "Fleet inspection history" : "My inspection history"}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingList ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : inspections.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No inspections recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {inspections.map((inspection) => {
                    const outcome = OUTCOME_STYLES[inspection.outcome] || OUTCOME_STYLES.passed;
                    const fails = Object.values(inspection.checklist || {}).filter((v) => v === "fail").length;
                    return (
                      <div key={inspection.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          {inspection.outcome === "passed" ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : inspection.outcome === "out_of_service" ? (
                            <OctagonX className="h-5 w-5 text-red-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-amber-600" />
                          )}
                          <div>
                            <p className="font-medium">{inspection.vehicleNumber}{inspection.mileage ? ` · ${inspection.mileage.toLocaleString()} mi` : ""}</p>
                            <p className="text-xs text-muted-foreground">{inspection.driverName} · {formatDate(inspection.createdAt)}{fails ? ` · ${fails} failed item${fails === 1 ? "" : "s"}` : ""}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${outcome.className}`}>{outcome.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
