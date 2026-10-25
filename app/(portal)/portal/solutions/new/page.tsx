"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { adamsFetch, adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

interface Interview {
  id: string;
}

const STARTER_TEMPLATES = [
  {
    key: "custom",
    name: "Custom Process",
    title: "",
    task: "",
  },
  {
    key: "safety-request-inbox",
    name: "Safety Request Inbox",
    title: "Safety Request Inbox",
    task: "Capture safety superintendent requests that currently get lost in email and text messages. Categorize each request, assign an owner, track due status, and notify the requester when work is completed.",
  },
  {
    key: "vehicle-inspection",
    name: "Six-Month Vehicle Inspection",
    title: "Six-Month Vehicle Inspection",
    task: "Run a recurring six-month vehicle inspection capturing interior and exterior photos, VIN, license plate, and standard condition questions. Trigger every six months, send a reminder after 7 days overdue, escalate to the supervisor, and retain photo evidence of completion.",
  },
  {
    key: "bilingual-calendar",
    name: "Multi-Site Bilingual Safety Calendar",
    title: "Multi-Site Bilingual Safety Calendar",
    task: "Provide a portal-administered safety calendar covering multiple sites with English and Spanish text, role-based visibility, and updates shared through chat.",
  },
  {
    key: "training-tracker",
    name: "Training & Certification Tracker",
    title: "Training & Certification Tracker",
    task: "Track employee training and certifications with LMS integration, reminders before certifications expire, and a privacy-minimal public QR verification so general contractors can confirm a worker's current certifications.",
  },
] as const;

export default function NewSolutionInterviewPage() {
  const router = useRouter();
  const { profile } = useUserProfile();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentId, setDepartmentId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [respondentName, setRespondentName] = useState("");
  const [title, setTitle] = useState("");
  const [task, setTask] = useState("");
  const [templateKey, setTemplateKey] = useState<string>("custom");
  const [initialAttachment, setInitialAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = departments.find((d) => d.id === departmentId);

  useEffect(() => {
    adamsFetchJson<{ departments: Department[] }>("/api/adams-harness/departments")
      .then((data) => setDepartments(data.departments.filter((d) => d.isActive)))
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Failed to load departments"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const profileName = `${profile.firstName} ${profile.lastName}`.trim();
    if (!respondentName && (profileName || profile.email)) {
      setRespondentName(profileName || profile.email);
    }
  }, [profile, respondentName]);

  const submit = async () => {
    if (!departmentId || !title.trim() || !respondentName.trim()) {
      toast.error("Enter your name, choose a department, and give the interview a title");
      return;
    }
    setSubmitting(true);
    try {
      const data = await adamsFetchJson<{ interview: Interview }>(
        "/api/adams-harness/interviews",
        {
          method: "POST",
          body: JSON.stringify({
            departmentId,
            title: title.trim(),
            task: task.trim(),
            respondentName: respondentName.trim(),
          }),
        },
      );
      if (initialAttachment) {
        const form = new FormData();
        form.append("file", initialAttachment);
        await adamsFetch(
          `/api/adams-harness/interviews/${data.interview.id}/attachments`,
          { method: "POST", body: form },
        ).catch(() => {});
      }
      router.push(`/portal/solutions/${data.interview.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start interview");
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Solution Interview</h1>

      <Card>
        <CardHeader>
          <CardTitle>1. Choose a department</CardTitle>
          <CardDescription>
            The interview defines a solution for a process owned by a department.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : departments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You are not a member of any active department. Ask an admin to add you.
            </p>
          ) : (
            <>
              <Select
                value={departmentId}
                onValueChange={(v) => {
                  setDepartmentId(v);
                  setConfirmed(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{selected.name}</p>
                  {selected.description && (
                    <p className="text-muted-foreground">{selected.description}</p>
                  )}
                  <Button
                    variant={confirmed ? "secondary" : "outline"}
                    size="sm"
                    className="mt-2"
                    onClick={() => setConfirmed(true)}
                  >
                    {confirmed ? "Department confirmed" : "Confirm department"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {confirmed && (
        <Card>
          <CardHeader>
            <CardTitle>2. Describe the task</CardTitle>
            <CardDescription>
              Seed the interview with the process you want to capture.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="respondent-name">Your name</Label>
              <Input
                id="respondent-name"
                placeholder="Full name of the person providing requirements"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                maxLength={200}
                required
              />
              <p className="text-xs text-muted-foreground">
                Saved with the interview so reviewers know who supplied the requirements.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Start from a template</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {STARTER_TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setTemplateKey(t.key);
                      setTitle(t.title);
                      setTask(t.task);
                    }}
                    className={`rounded-md border p-3 text-left text-sm transition-colors ${
                      templateKey === t.key
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Incident reporting intake"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task">Task / process seed</Label>
              <Textarea
                id="task"
                placeholder="Describe the manual process this solution should replace or support."
                value={task}
                onChange={(e) => setTask(e.target.value)}
                maxLength={4000}
                rows={5}
              />
            </div>
            <div className="space-y-2 rounded-md border p-3 bg-muted/20">
              <Label htmlFor="initial-attachment" className="flex items-center gap-1.5">
                <Paperclip className="h-4 w-4 text-primary" />
                Upload &amp; Analyze Process Attachment (Optional)
              </Label>
              <p className="text-xs text-muted-foreground">
                Attach an existing Excel spreadsheet (.xlsx, .xls, .csv), PowerPoint (.pptx, .ppt), Word document (.docx, .doc), Adobe PDF (.pdf), Markdown (.md), or Text (.txt) file. The AI interviewer will analyze the columns/content and ask follow-up questions about how it works.
              </p>
              <Input
                id="initial-attachment"
                type="file"
                accept=".xlsx,.xls,.csv,.pptx,.ppt,.docx,.doc,.pdf,.md,.txt"
                onChange={(e) => setInitialAttachment(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Interview
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
