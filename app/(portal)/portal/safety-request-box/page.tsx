"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Loader2, Paperclip, Send } from "lucide-react";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytes } from "firebase/storage";
import type { SafetyRequestDoc, SafetyRequestStatus, SafetyRequestType } from "@/lib/schema";

const TYPE_LABELS: Record<SafetyRequestType, string> = {
  request: "Request",
  observation: "Observation",
  near_miss: "Near Miss",
  hazard: "Hazard",
};

const STATUS_LABELS: Record<SafetyRequestStatus, string> = {
  open: "Open",
  triaged: "Triaged",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_COLORS: Record<SafetyRequestStatus, string> = {
  open: "bg-amber-100 text-amber-800",
  triaged: "bg-blue-100 text-blue-800",
  in_progress: "bg-violet-100 text-violet-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-100 text-slate-700",
};

async function authHeaders(): Promise<HeadersInit> {
  await auth?.authStateReady();
  const token = await auth?.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SafetyRequestBoxPage() {
  const [type, setType] = useState<SafetyRequestType>("request");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [jobsite, setJobsite] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [requests, setRequests] = useState<SafetyRequestDoc[]>([]);
  const [isSafety, setIsSafety] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const loadRequests = useCallback(async () => {
    setLoadingList(true);
    try {
      const response = await fetch("/api/safety/requests", { headers: await authHeaders(), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load");
      setRequests(data.requests || []);
      setIsSafety(data.safety === true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load requests");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      const requestId = crypto.randomUUID();
      const photoPaths: string[] = [];
      if (storage && photos.length) {
        for (const file of photos.slice(0, 10)) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `safety-requests/${requestId}/${safeName}`;
          await uploadBytes(ref(storage, path), file, { contentType: file.type || "image/jpeg" });
          photoPaths.push(path);
        }
      }
      const response = await fetch("/api/safety/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          jobsite: jobsite.trim() || undefined,
          anonymous,
          photoPaths,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed");
      toast.success("Safety request submitted");
      setTitle("");
      setDescription("");
      setJobsite("");
      setAnonymous(false);
      setPhotos([]);
      void loadRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: SafetyRequestStatus) => {
    try {
      const response = await fetch(`/api/safety/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Update failed");
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(`Marked ${STATUS_LABELS[status]}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  };

  const updatePriority = async (id: string, priority: string) => {
    try {
      const response = await fetch(`/api/safety/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ priority }),
      });
      if (!response.ok) throw new Error("Update failed");
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, priority: priority as SafetyRequestDoc["priority"] } : r)));
    } catch {
      toast.error("Failed to set priority");
    }
  };

  const formatDate = (value: unknown) => {
    const ts = value as { toDate?: () => Date; seconds?: number } | undefined;
    const date = ts?.toDate?.() ?? (ts?.seconds ? new Date(ts.seconds * 1000) : null);
    return date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          Safety Request Box
        </h1>
        <p className="text-muted-foreground mt-2">
          Submit safety requests, observations, and near-miss reports for Adams Electric jobsites.
        </p>
      </div>

      <Tabs defaultValue="submit">
        <TabsList>
          <TabsTrigger value="submit">Submit</TabsTrigger>
          <TabsTrigger value="requests">{isSafety ? "All Requests" : "My Requests"}</TabsTrigger>
        </TabsList>

        <TabsContent value="submit">
          <Card>
            <CardHeader>
              <CardTitle>New safety submission</CardTitle>
              <CardDescription>Routed to the Safety team. For urgent hazards, contact your foreman immediately.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as SafetyRequestType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jobsite / Location</Label>
                  <Input value={jobsite} onChange={(e) => setJobsite(e.target.value)} placeholder="e.g., Site 42 — Building B" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="What did you see? Who/what is affected? Any immediate action taken?" />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                  <Paperclip className="mr-2 h-4 w-4" /> Attach photos ({photos.length})
                </Button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setPhotos(Array.from(e.target.files || []).slice(0, 10))}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-4 w-4" />
                  Submit anonymously (identity hidden from listings)
                </label>
              </div>
              <Button onClick={() => void submit()} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit to Safety
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>{isSafety ? "All safety submissions" : "My submissions"}</CardTitle>
              <CardDescription>{isSafety ? "Triage and update status." : "Track the status of your reports."}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingList ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : requests.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No submissions yet.</p>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div key={req.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{TYPE_LABELS[req.type] || req.type}</Badge>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[req.status] || ""}`}>{STATUS_LABELS[req.status] || req.status}</span>
                            {req.priority && req.priority !== "normal" && <Badge variant="secondary">{req.priority}</Badge>}
                          </div>
                          <p className="mt-1 font-medium">{req.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{req.description}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {req.jobsite ? `${req.jobsite} · ` : ""}{req.submittedByName || "Unknown"} · {formatDate(req.createdAt)}
                            {req.photoPaths?.length ? ` · ${req.photoPaths.length} photo${req.photoPaths.length === 1 ? "" : "s"}` : ""}
                          </p>
                        </div>
                        {isSafety && (
                          <div className="flex items-center gap-2">
                            <Select value={req.priority || "normal"} onValueChange={(v) => void updatePriority(req.id, v)}>
                              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["low", "normal", "high", "urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={req.status} onValueChange={(v) => void updateStatus(req.id, v as SafetyRequestStatus)}>
                              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
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
