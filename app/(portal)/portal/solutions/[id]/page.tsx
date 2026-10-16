"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Send,
  Sparkles,
  Rocket,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";

function slugifySolutionTitle(title: string, idSuffix?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 45);
  const suffix = idSuffix ? `-${idSuffix.slice(0, 6).toLowerCase()}` : "";
  return `${base || "solution-app"}${suffix}`;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Specification {
  id: string;
  version: number;
  status: string;
  canonicalHash: string;
  title: string;
  createdByUid: string;
  approval?: {
    approvedByName: string;
    approvedByRole: string;
    approvedAt: string;
    canonicalHash: string;
  };
  sections: {
    summary: string;
    currentProcess: string;
    futureProcess: string;
    painPoints: string[];
    roles: { role: string; responsibilities: string }[];
    dataEntities: { name: string; description: string }[];
    forms: { name: string; description: string }[];
    notifications: { name: string; description: string }[];
    integrations: { name: string; description: string }[];
    approvals: { step: string; approver: string; condition: string }[];
    permissions: string;
    auditRequirements: string[];
    acceptanceCriteria: string[];
    risks: string[];
    outOfScope: string[];
  };
}

interface Interview {
  id: string;
  title: string;
  status: string;
  createdByUid: string;
  departmentId: string;
  messages: Message[];
  coverage: Record<string, boolean>;
  unresolvedQuestions: string[];
  readyForSpecification: boolean;
}

const COVERAGE_LABELS: Record<string, string> = {
  department: "Department",
  task: "Task",
  trigger: "Trigger & Frequency",
  currentSteps: "Current Steps",
  actors: "Actors",
  systems: "Systems",
  painPoints: "Pain Points",
  desiredProcess: "Desired Process",
  notifications: "Notifications",
  completionEvidence: "Completion Evidence",
  timingEscalation: "Timing & Escalation",
  exceptions: "Exceptions",
  compliance: "Compliance",
  integrations: "Integrations",
  humanApprovals: "Human Approvals",
};

function List({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">None captured.</p>;
  return (
    <ul className="list-disc pl-5 space-y-1 text-sm">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function NamedList({ items }: { items: { name: string; description: string }[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">None captured.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item, i) => (
        <li key={i}>
          <span className="font-medium">{item.name}</span>
          {item.description && (
            <span className="text-muted-foreground">  -  {item.description}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function SpecView({ spec }: { spec: Specification }) {
  const s = spec.sections;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Badge variant={spec.status === "approved" ? "default" : "secondary"}>
          v{spec.version}  |  {spec.status.replace("_", " ")}
        </Badge>
        <span className="text-xs text-muted-foreground font-mono">
          hash {spec.canonicalHash.slice(0, 12)}...
        </span>
      </div>
      {spec.approval && (
        <p className="text-sm text-green-700 dark:text-green-400">
          Approved by {spec.approval.approvedByName} ({spec.approval.approvedByRole}) on{" "}
          {new Date(spec.approval.approvedAt).toLocaleString()}
        </p>
      )}
      {s.summary && (
        <section>
          <h3 className="font-semibold mb-1">Summary</h3>
          <p className="text-sm whitespace-pre-wrap">{s.summary}</p>
        </section>
      )}
      {s.currentProcess && (
        <section>
          <h3 className="font-semibold mb-1">Current Process</h3>
          <p className="text-sm whitespace-pre-wrap">{s.currentProcess}</p>
        </section>
      )}
      {s.futureProcess && (
        <section>
          <h3 className="font-semibold mb-1">Future Process</h3>
          <p className="text-sm whitespace-pre-wrap">{s.futureProcess}</p>
        </section>
      )}
      <section>
        <h3 className="font-semibold mb-1">Pain Points</h3>
        <List items={s.painPoints} />
      </section>
      <section>
        <h3 className="font-semibold mb-1">Roles & Responsibilities</h3>
        {s.roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">None captured.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {s.roles.map((r, i) => (
              <li key={i}>
                <span className="font-medium">{r.role}</span>
                {r.responsibilities && (
                  <span className="text-muted-foreground">  -  {r.responsibilities}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="font-semibold mb-1">Data</h3>
        <NamedList items={s.dataEntities} />
      </section>
      <section>
        <h3 className="font-semibold mb-1">Forms</h3>
        <NamedList items={s.forms} />
      </section>
      <section>
        <h3 className="font-semibold mb-1">Notifications</h3>
        <NamedList items={s.notifications} />
      </section>
      <section>
        <h3 className="font-semibold mb-1">Integrations</h3>
        <NamedList items={s.integrations} />
      </section>
      <section>
        <h3 className="font-semibold mb-1">Approvals</h3>
        {s.approvals.length === 0 ? (
          <p className="text-sm text-muted-foreground">None captured.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {s.approvals.map((a, i) => (
              <li key={i}>
                <span className="font-medium">{a.step}</span>
                <span className="text-muted-foreground">
                  {" "} -  {a.approver}
                  {a.condition ? ` (${a.condition})` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {s.permissions && (
        <section>
          <h3 className="font-semibold mb-1">Permissions</h3>
          <p className="text-sm whitespace-pre-wrap">{s.permissions}</p>
        </section>
      )}
      <section>
        <h3 className="font-semibold mb-1">Audit Requirements</h3>
        <List items={s.auditRequirements} />
      </section>
      <section>
        <h3 className="font-semibold mb-1">Acceptance Criteria</h3>
        <List items={s.acceptanceCriteria} />
      </section>
      <section>
        <h3 className="font-semibold mb-1">Risks</h3>
        <List items={s.risks} />
      </section>
      <section>
        <h3 className="font-semibold mb-1">Out of Scope</h3>
        <List items={s.outOfScope} />
      </section>
    </div>
  );
}

interface Capabilities {
  isOwner: boolean;
  canApprove: boolean;
  canRevise: boolean;
}

export default function SolutionInterviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [spec, setSpec] = useState<Specification | null>(null);
  const [caps, setCaps] = useState<Capabilities>({
    isOwner: false,
    canApprove: false,
    canRevise: false,
  });
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [acting, setActing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await adamsFetchJson<{
        interview: Interview;
        department: { name: string } | null;
        capabilities: Capabilities;
      }>(`/api/adams-harness/interviews/${id}`);
      setInterview(data.interview);
      setDepartmentName(data.department?.name || "");
      setCaps(data.capabilities);

      const specData = await adamsFetchJson<{
        latest: Specification | null;
        capabilities?: Capabilities;
      }>(`/api/adams-harness/interviews/${id}/specification`).catch(
        (): { latest: Specification | null; capabilities?: Capabilities } => ({
          latest: null,
        }),
      );
      setSpec(specData.latest);
      if (specData.capabilities) setCaps(specData.capabilities);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load interview");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interview?.messages.length]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const data = await adamsFetchJson<{ interview: Interview }>(
        `/api/adams-harness/interviews/${id}/messages`,
        { method: "POST", body: JSON.stringify({ content }) },
      );
      setInterview(data.interview);
      setInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const generateSpec = async () => {
    setGenerating(true);
    try {
      const data = await adamsFetchJson<{ specification: Specification }>(
        `/api/adams-harness/interviews/${id}/specification`,
        { method: "POST" },
      );
      setSpec(data.specification);
      toast.success(`Specification v${data.specification.version} generated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const generateModule = async () => {
    if (!spec) return;
    setBuilding(true);
    try {
      const data = await adamsFetchJson<{ build: { id: string } }>(
        `/api/adams-harness/specifications/${spec.id}/build`,
        { method: "POST" },
      );
      setBuildId(data.build.id);
      toast.success("Module build started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Build failed");
    } finally {
      setBuilding(false);
    }
  };

  const act = async (action: "submit_review" | "request_changes" | "approve") => {
    if (!spec) return;
    setActing(true);
    try {
      const data = await adamsFetchJson<{ specification: Specification }>(
        `/api/adams-harness/specifications/${spec.id}/approve`,
        {
          method: "POST",
          body: JSON.stringify({ action, canonicalHash: spec.canonicalHash }),
        },
      );
      setSpec(data.specification);
      toast.success("Specification updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Interview not found</CardTitle>
            <CardDescription>
              It may not exist or you may not have access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const coverageKeys = Object.keys(COVERAGE_LABELS);
  const covered = coverageKeys.filter((k) => interview.coverage[k]).length;
  const coveragePct = Math.round((covered / coverageKeys.length) * 100);
  const { isOwner, canApprove } = caps;
  const interviewOpen = interview.status !== "completed";
  const solutionAppSlug = slugifySolutionTitle(spec?.title || interview.title, interview.id);

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{interview.title}</h1>
            <p className="text-muted-foreground">
              {departmentName && `${departmentName} | `}
              <Badge variant="secondary" className="ml-1">
                {interview.status.replace("_", " ")}
              </Badge>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="default" size="sm">
              <Link href={`/portal/modules/${encodeURIComponent(solutionAppSlug)}`}>
                <Rocket className="mr-1.5 h-4 w-4" />
                Open Solution Workspace
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/portal/modules/${encodeURIComponent(solutionAppSlug)}/settings`}>
                <Settings className="mr-1.5 h-4 w-4" />
                App Settings &amp; API
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Interview</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] pr-4">
              <div className="space-y-4">
                {interview.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
            {interviewOpen && (
              <>
                <Separator className="my-4" />
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Answer the interviewer's question..."
                    rows={2}
                    maxLength={10000}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <Button onClick={send} disabled={sending || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {interview.readyForSpecification && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> Solution Specification
              </CardTitle>
              <CardDescription>
                All required topics are covered. Generate the specification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={generateSpec} disabled={generating}>
                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {spec ? "Regenerate Specification" : "Generate Specification"}
              </Button>
            </CardContent>
          </Card>
        )}

        {spec && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> {spec.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SpecView spec={spec} />
              <Separator />
              <div className="flex gap-2">
                {(spec.status === "draft" || spec.status === "changes_requested") &&
                  (isOwner || canApprove) && (
                    <Button onClick={() => act("submit_review")} disabled={acting}>
                      Submit for Review
                    </Button>
                  )}
                {spec.status === "user_review" && canApprove && (
                  <>
                    <Button onClick={() => act("approve")} disabled={acting}>
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => act("request_changes")}
                      disabled={acting}
                    >
                      Request Changes
                    </Button>
                  </>
                )}
                {spec.status === "user_review" && isOwner && !canApprove && (
                  <Button
                    variant="outline"
                    onClick={() => act("request_changes")}
                    disabled={acting}
                  >
                    Request Changes
                  </Button>
                )}
                {acting && <Loader2 className="h-4 w-4 animate-spin self-center" />}
                {spec.status === "approved" && canApprove && (
                  <Button onClick={generateModule} disabled={building}>
                    {building ? "Starting..." : "Generate Module"}
                  </Button>
                )}
                {buildId && (
                  <Link
                    className="self-center text-sm text-primary underline"
                    href={`/portal/admin/modules?build=${buildId}`}
                  >
                    View build
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Coverage</CardTitle>
            <CardDescription>
              {covered} of {coverageKeys.length} topics ({coveragePct}%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={coveragePct} />
            <ul className="space-y-2">
              {coverageKeys.map((key) => (
                <li key={key} className="flex items-center gap-2 text-sm">
                  {interview.coverage[key] ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {COVERAGE_LABELS[key]}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {interview.unresolvedQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Unresolved Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <List items={interview.unresolvedQuestions} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
