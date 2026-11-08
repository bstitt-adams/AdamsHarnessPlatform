"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDoc, collection, doc, getDocs, Timestamp, updateDoc } from "firebase/firestore";
import { Award, BellRing, Bot, Download, FileWarning, Loader2, Search, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberDoc, type UserTrainingCertDoc } from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const FAR_FUTURE = "9999-12-31";
type MetricFilter = "all" | "current" | "dueSoon" | "expired" | "artifact" | "unmatched";

function daysUntil(value: string) {
  if (!value || value === FAR_FUTURE) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const due = new Date(year, month - 1, day);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
}

function certStatus(item: UserTrainingCertDoc) {
  if (item.governingCertification) return { key: "current" as const, label: `Governed by ${item.governingCertification}`, variant: "secondary" as const };
  const days = daysUntil(item.expirationDate);
  if (days === null) return { key: "current" as const, label: "No expiration", variant: "secondary" as const };
  if (days < 0) return { key: "expired" as const, label: `Expired ${Math.abs(days)}d ago`, variant: "destructive" as const };
  if (days <= 60) return { key: "dueSoon" as const, label: `Due in ${days}d`, variant: "outline" as const };
  return { key: "current" as const, label: "Current", variant: "default" as const };
}

function artifactLabel(item: UserTrainingCertDoc) {
  if (item.artifactBase64) return { label: "Artifact attached", variant: "default" as const };
  if (item.artifactStatus === "needs_review") return { label: "Needs review", variant: "secondary" as const };
  return { label: "Missing artifact", variant: "outline" as const };
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function CertificationTrackerPage() {
  const { linkedTeamMember, profile } = useUserProfile();
  const [certs, setCerts] = useState<UserTrainingCertDoc[]>([]);
  const [members, setMembers] = useState<TeamMemberDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all");

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const [certSnap, memberSnap] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.USER_TRAINING_CERTS)),
        getDocs(collection(db, COLLECTIONS.TEAM_MEMBERS)),
      ]);
      setCerts(certSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as UserTrainingCertDoc));
      setMembers(memberSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as TeamMemberDoc));
    } catch (error) {
      console.error("Unable to load certification tracker", error);
      toast.error("Unable to load certification tracker");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const certificationTypes = useMemo(() => Array.from(new Set(certs.map((item) => item.certificationType || item.trainingTitle))).sort(), [certs]);

  const metrics = useMemo(() => ({
    total: certs.length,
    current: certs.filter((item) => certStatus(item).key === "current").length,
    dueSoon: certs.filter((item) => certStatus(item).key === "dueSoon").length,
    expired: certs.filter((item) => certStatus(item).key === "expired").length,
    artifact: certs.filter((item) => !item.artifactBase64).length,
    unmatched: certs.filter((item) => item.teamMemberId.startsWith("unmatched-")).length,
  }), [certs]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return certs.filter((item) => {
      const status = certStatus(item).key;
      if (metricFilter !== "all") {
        if (metricFilter === "artifact" && item.artifactBase64) return false;
        if (metricFilter === "unmatched" && !item.teamMemberId.startsWith("unmatched-")) return false;
        if (["current", "dueSoon", "expired"].includes(metricFilter) && status !== metricFilter) return false;
      }
      if (typeFilter !== "all" && (item.certificationType || item.trainingTitle) !== typeFilter) return false;
      if (!term) return true;
      return [item.userName, item.trainingTitle, item.certificationType, item.jobsite, item.issuingOrganization, item.authorizedTrainer, item.credentialId, item.sourceSheet, item.followUpRequirement]
        .some((value) => String(value || "").toLowerCase().includes(term));
    }).sort((a, b) => {
      const aDays = daysUntil(a.expirationDate) ?? 99999;
      const bDays = daysUntil(b.expirationDate) ?? 99999;
      return aDays - bDays || a.userName.localeCompare(b.userName);
    });
  }, [certs, metricFilter, search, typeFilter]);

  const exportReport = () => {
    const rows = [
      ["Employee", "Team Member ID", "Certification", "Jobsite", "Completion", "Refresh/Expiration", "Status", "Artifact", "Provider", "Trainer", "Card #", "Follow-up Requirement", "Source"],
      ...filtered.map((item) => {
        const status = certStatus(item);
        return [item.userName, item.teamMemberId, item.trainingTitle, item.jobsite, item.completionDate, item.expirationDate === FAR_FUTURE ? "No expiration" : item.expirationDate, status.label, artifactLabel(item).label, item.issuingOrganization, item.authorizedTrainer, item.credentialId, item.followUpRequirement, item.source];
      }),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `adams-certification-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const enableHermesManagement = async () => {
    if (!db) return;
    setSaving(true);
    try {
      const now = Timestamp.now();
      const actor = linkedTeamMember ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}` : profile.email || "Administrator";
      const automationRef = await addDoc(collection(db, COLLECTIONS.PLATFORM_AUTOMATIONS), {
        name: "Certification expiration and artifact management",
        prompt: "Every day at 7:00 AM, evaluate certification expiration dates, DOL card receipt status, missing artifacts, and open follow-up requirements. Notify the employee, their supervisor, and Safety through every configured channel (email, Microsoft Teams, Telegram, in-app tasks, and Master Calendar). Escalate expired certifications, missing OSHA artifacts, and unresolved follow-ups to Safety management. Update each certification notificationStatus, lastNotificationAt, nextFollowUpAt, and followUpStatus without duplicating reminders.",
        triggerType: "lms_expiration",
        schedule: "Daily at 7:00 AM",
        actions: [
          { type: "hermes", configuration: { mode: "triage_and_escalate", reportTo: "managers_and_safety" } },
          { type: "lms_reminder", configuration: { reminders: "60d,30d,7d,due,overdue" } },
          { type: "email", configuration: { recipients: "employee,supervisor,safety" } },
          { type: "teams", configuration: { recipients: "supervisor,safety" } },
          { type: "telegram", configuration: { recipients: "safety" } },
          { type: "task", configuration: { assignTo: "supervisor" } },
          { type: "calendar", configuration: { reminderDays: "90,60,30,7,0" } },
        ],
        status: "active",
        requiresApproval: true,
        nextRunAt: now,
        createdByUid: auth?.currentUser?.uid || "",
        createdByName: actor,
        createdAt: now,
        updatedAt: now,
      });
      await addDoc(collection(db, COLLECTIONS.AUTOMATION_RUNS), {
        automationId: automationRef.id,
        automationName: "Certification expiration and artifact management",
        action: "hermes",
        instruction: "Initial certification follow-up triage: evaluate expired, due-soon, missing-artifact, and unmatched records; queue all configured channels; report unresolved items to managers and Safety.",
        configuration: { recipients: "employee,supervisor,safety", channels: "all_configured" },
        status: "queued",
        createdAt: now,
        runByUid: auth?.currentUser?.uid || "",
      });
      await Promise.all(certs.filter((item) => !item.artifactBase64 || certStatus(item).key !== "current").map((item) => updateDoc(doc(db!, COLLECTIONS.USER_TRAINING_CERTS, item.id), { notificationStatus: "queued", updatedAt: now })));
      toast.success("Hermes certification management activated");
      await load();
    } catch (error) {
      console.error("Unable to enable certification automation", error);
      toast.error("Unable to enable Hermes certification management");
    } finally {
      setSaving(false);
    }
  };

  const metricCards: Array<{ key: MetricFilter; label: string; value: number; icon: typeof Award }> = [
    { key: "all", label: "Total Records", value: metrics.total, icon: Award },
    { key: "current", label: "Current", value: metrics.current, icon: ShieldCheck },
    { key: "dueSoon", label: "Due Soon", value: metrics.dueSoon, icon: BellRing },
    { key: "expired", label: "Expired", value: metrics.expired, icon: FileWarning },
    { key: "artifact", label: "Artifact Needed", value: metrics.artifact, icon: FileWarning },
    { key: "unmatched", label: "Unmatched", value: metrics.unmatched, icon: Users },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Award className="h-6 w-6 text-primary" />Certification Tracker</h1>
          <p className="text-sm text-muted-foreground">Company-wide LMS certification status, artifact follow-up, Hermes escalation, and management reporting.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportReport}><Download className="mr-2 h-4 w-4" />Export Management Report</Button><Button disabled={saving} onClick={() => void enableHermesManagement()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}Enable Hermes Management</Button></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{metricCards.map((metric) => <button key={metric.key} type="button" onClick={() => setMetricFilter(metric.key)}><Card className={metricFilter === metric.key ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"}><CardHeader className="pb-1"><CardDescription className="flex items-center gap-1"><metric.icon className="h-3.5 w-3.5" />{metric.label}</CardDescription></CardHeader><CardContent className="text-3xl font-bold">{metric.value}</CardContent></Card></button>)}</div>

      <Card>
        <CardHeader>
          <CardTitle>Management Report</CardTitle>
          <CardDescription>Showing {filtered.length} of {certs.length} certification records. Expiration dates are sorted by urgency.</CardDescription>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, certification, jobsite, provider, trainer, card, or follow-up..." /></div><Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All certification types</SelectItem>{certificationTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : <Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Certification</TableHead><TableHead>Jobsite</TableHead><TableHead>Completed / Expires</TableHead><TableHead>Status</TableHead><TableHead>Artifact</TableHead><TableHead>Follow-up</TableHead></TableRow></TableHeader><TableBody>{filtered.map((item) => {
            const status = certStatus(item);
            const artifact = artifactLabel(item);
            const member = memberById.get(item.teamMemberId);
            return <TableRow key={item.id}><TableCell><div className="font-medium">{item.userName}</div><div className="text-xs text-muted-foreground">{member?.workforceDepartmentName || item.teamMemberId}</div></TableCell><TableCell><div className="font-medium">{item.trainingTitle}</div><div className="text-xs text-muted-foreground">{item.issuingOrganization}{item.authorizedTrainer ? ` · ${item.authorizedTrainer}` : ""}</div>{item.credentialId ? <div className="font-mono text-xs text-muted-foreground">{item.credentialId}</div> : null}</TableCell><TableCell>{item.jobsite || "—"}</TableCell><TableCell><div className="text-sm">{item.completionDate || "—"}</div><div className="text-xs text-muted-foreground">{item.expirationDate === FAR_FUTURE ? "No expiration" : item.expirationDate}</div></TableCell><TableCell><Badge variant={status.variant}>{status.label}</Badge>{item.dolCardReceived === "no" ? <div className="mt-1 text-xs text-amber-700">DOL card pending</div> : null}</TableCell><TableCell><Badge variant={artifact.variant}>{artifact.label}</Badge>{item.certificateFile ? <div className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground" title={item.certificateFile}>{item.certificateFile}</div> : null}</TableCell><TableCell><div className="max-w-[260px] text-sm">{item.followUpRequirement || "—"}</div>{item.notificationStatus ? <div className="mt-1 text-xs capitalize text-muted-foreground">Hermes: {item.notificationStatus}</div> : null}{member?.id ? <Button asChild variant="link" size="sm" className="h-auto p-0"><Link href={`/portal/admin/team-members/${member.id}`}>Open profile</Link></Button> : null}</TableCell></TableRow>;
          })}</TableBody></Table>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Self-managed certification workflow</CardTitle><CardDescription>Hermes is configured to manage the process using the imported tracker fields.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border p-3"><strong>1. Monitor</strong><p className="text-muted-foreground">Track expiration, DOL card status, missing artifacts, unmatched people, and open follow-ups.</p></div>
          <div className="rounded-lg border p-3"><strong>2. Remind</strong><p className="text-muted-foreground">Notify employees and supervisors at 60, 30, and 7 days before renewal or when an artifact is missing.</p></div>
          <div className="rounded-lg border p-3"><strong>3. Escalate</strong><p className="text-muted-foreground">Escalate expired certifications, blocked artifacts, and unresolved follow-ups to Safety management.</p></div>
          <div className="rounded-lg border p-3"><strong>4. Resolve</strong><p className="text-muted-foreground">When an artifact is uploaded or certification renewed, mark follow-up resolved and return to monitoring.</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
