"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { adamsFetch, adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";

type Brain = {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  audience: string;
  isActive: boolean;
  ownerIds: string[];
};

type BrainSource = {
  id: string;
  type: string;
  connector?: string;
  title: string;
  version: number;
  status: string;
  chunkCount: number;
  refreshedAt?: string;
  failureReason?: string;
};

type Department = {
  id: string;
  name: string;
  ownerIds?: string[];
  memberIds?: string[];
};
type TeamMember = { id: string; firstName: string; lastName: string; emailPrimary: string };

type BrainHealth = {
  storage?: { configured: boolean };
  hermes?: { configured: boolean; healthy: boolean };
  parsers?: { pdf: boolean; docx: boolean; text: boolean };
};

const CONNECTORS = [
  { id: "approved_specifications", label: "Approved Specifications" },
  { id: "site_calendars", label: "Company Safety Calendars" },
  { id: "module_definitions", label: "Module Definitions" },
];

export default function AdamsBrainAdminPage() {
  const { isLoading, isAuthenticated } = useUserProfile();
  const [brains, setBrains] = useState<Brain[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selected, setSelected] = useState<Brain | null>(null);
  const [sources, setSources] = useState<BrainSource[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [health, setHealth] = useState<BrainHealth | null>(null);

  const [newName, setNewName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newAudience, setNewAudience] = useState("department");
  const [newOwners, setNewOwners] = useState<string[]>([]);

  const departmentMembers = (() => {
    const dept = departments.find((d) => d.id === newDepartment);
    if (!dept) return teamMembers;
    const allowed = new Set([
      ...(dept.ownerIds ?? []),
      ...(dept.memberIds ?? []),
    ]);
    return teamMembers.filter((tm) => allowed.has(tm.id));
  })();

  const selectDepartment = (id: string) => {
    setNewDepartment(id);
    const dept = departments.find((d) => d.id === id);
    if (dept) {
      const allowed = new Set([
        ...(dept.ownerIds ?? []),
        ...(dept.memberIds ?? []),
      ]);
      setNewOwners((prev) => prev.filter((o) => allowed.has(o)));
    }
  };

  const loadBrains = useCallback(async () => {
    const data = await adamsFetchJson<{ brains: Brain[] }>(
      "/api/adams-harness/brains",
    );
    return data.brains;
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let cancelled = false;
    Promise.all([
      loadBrains(),
      adamsFetchJson<{ departments: Department[] }>(
        "/api/adams-harness/departments",
      ).catch(() => ({ departments: [] })),
      adamsFetchJson<{ teamMembers: TeamMember[] }>(
        "/api/adams-harness/team-members",
      ).catch(() => ({ teamMembers: [] })),
      adamsFetchJson<BrainHealth>("/api/adams-harness/brains/health")
        .then((h) => setHealth(h))
        .catch(() => {}),
    ])
      .then(([brainList, deptData, tmData]) => {
        if (cancelled) return;
        setBrains(brainList);
        setDepartments(deptData.departments);
        setTeamMembers(tmData.teamMembers);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, loadBrains]);

  const loadBrainDetail = async (id: string) => {
    const data = await adamsFetchJson<{
      brain: Brain;
      capabilities: { canQuery: boolean; canManage: boolean };
      sources: BrainSource[];
    }>(`/api/adams-harness/brains/${encodeURIComponent(id)}`);
    setSelected(data.brain);
    setSources(data.sources);
    setCanManage(data.capabilities.canManage);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const createBrain = () =>
    run(async () => {
      const data = await adamsFetchJson<{ brain: Brain }>(
        "/api/adams-harness/brains",
        {
          method: "POST",
          body: JSON.stringify({
            name: newName,
            description: "",
            departmentId: newDepartment,
            ownerIds: newOwners,
            audience: newAudience,
            isActive: true,
          }),
        },
      );
      setBrains(await loadBrains());
      setNewName("");
      setNewOwners([]);
      setMessage(`Brain "${data.brain.name}" created.`);
    });

  const refreshConnector = (connector: string) =>
    run(async () => {
      if (!selected) return;
      const data = await adamsFetchJson<{ count: number }>(
        `/api/adams-harness/brains/${encodeURIComponent(selected.id)}/sources/platform`,
        { method: "POST", body: JSON.stringify({ connector }) },
      );
      setMessage(`Refreshed ${connector}: ${data.count} documents.`);
      await loadBrainDetail(selected.id);
    });

  const retireSource = (sourceId: string) =>
    run(async () => {
      if (!selected) return;
      await adamsFetchJson(
        `/api/adams-harness/brains/${encodeURIComponent(selected.id)}/sources/${encodeURIComponent(sourceId)}`,
        { method: "PATCH", body: JSON.stringify({ status: "retired" }) },
      );
      await loadBrainDetail(selected.id);
    });

  const toggleActive = () =>
    run(async () => {
      if (!selected) return;
      await adamsFetchJson(
        `/api/adams-harness/brains/${encodeURIComponent(selected.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: !selected.isActive }),
        },
      );
      await loadBrainDetail(selected.id);
      setBrains(await loadBrains());
    });

  const uploadFile = (file: File | undefined) =>
    run(async () => {
      if (!selected || !file) return;
      const formData = new FormData();
      formData.append("file", file);
      const response = await adamsFetch(
        `/api/adams-harness/brains/${encodeURIComponent(selected.id)}/sources/upload`,
        { method: "POST", body: formData },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body?.error === "string" ? body.error : "Upload failed",
        );
      }
      setMessage("Source ingested.");
      await loadBrainDetail(selected.id);
    });

  if (isLoading || (isAuthenticated && fetching)) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please sign in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">AdamsBrain Admin</h1>
      {health && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant={health.storage?.configured ? "default" : "destructive"}>
            Storage: {health.storage?.configured ? "configured" : "missing"}
          </Badge>
          <Badge variant={health.hermes?.healthy ? "default" : "destructive"}>
            Hermes:{" "}
            {health.hermes?.configured
              ? health.hermes.healthy
                ? "healthy"
                : "unreachable"
              : "not configured"}
          </Badge>
          <Badge variant="outline">PDF: {health.parsers?.pdf ? "ready" : "off"}</Badge>
          <Badge variant="outline">DOCX: {health.parsers?.docx ? "ready" : "off"}</Badge>
          <Badge variant="outline">Text: {health.parsers?.text ? "ready" : "off"}</Badge>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brains</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {brains.map((b) => (
              <button
                key={b.id}
                className={`block w-full rounded border p-2 text-left text-sm ${
                  selected?.id === b.id ? "border-primary" : ""
                }`}
                onClick={() =>
                  void loadBrainDetail(b.id).catch((err) =>
                    setError(err instanceof Error ? err.message : "Failed"),
                  )
                }
              >
                <span className="font-medium">{b.name}</span>{" "}
                <Badge variant="outline">{b.audience}</Badge>{" "}
                {!b.isActive && <Badge variant="outline">inactive</Badge>}
              </button>
            ))}
            {brains.length === 0 && (
              <p className="text-sm text-muted-foreground">No brains yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Brain</CardTitle>
            <CardDescription>Admin only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={newDepartment} onValueChange={selectDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Audience</Label>
              <Select value={newAudience} onValueChange={setNewAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="admins">Admins only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Owners</Label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded border p-2">
                {departmentMembers.map((tm) => (
                  <label key={tm.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={newOwners.includes(tm.id)}
                      onCheckedChange={(checked) =>
                        setNewOwners((prev) =>
                          checked === true
                            ? [...prev, tm.id]
                            : prev.filter((id) => id !== tm.id),
                        )
                      }
                    />
                    {tm.firstName} {tm.lastName}
                  </label>
                ))}
              </div>
            </div>
            <Button
              onClick={() => void createBrain()}
              disabled={busy || !newName.trim() || !newDepartment}
            >
              Create
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? selected.name : "Select a brain"}
            </CardTitle>
            {selected && (
              <CardDescription>{selected.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {selected && canManage && (
              <>
                <div className="flex flex-wrap gap-2">
                  {CONNECTORS.map((c) => (
                    <Button
                      key={c.id}
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void refreshConnector(c.id)}
                    >
                      Refresh {c.label}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void toggleActive()}
                  >
                    {selected.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label>Upload document</Label>
                  <Input
                    type="file"
                    accept=".txt,.md,.pdf,.docx"
                    disabled={busy}
                    onChange={(e) => void uploadFile(e.target.files?.[0])}
                  />
                </div>
              </>
            )}
            {selected && (
              <div className="space-y-2">
                <Label>Sources</Label>
                {sources.length === 0 && (
                  <p className="text-sm text-muted-foreground">No sources.</p>
                )}
                {sources.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded border p-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{s.title}</span>{" "}
                      <Badge variant="outline">v{s.version}</Badge>{" "}
                      <Badge variant="outline">{s.status}</Badge>{" "}
                      <Badge variant="outline">{s.type}</Badge>
                      <p className="text-xs text-muted-foreground">
                        {s.chunkCount} chunks
                        {s.refreshedAt
                          ? ` | refreshed ${new Date(s.refreshedAt).toLocaleString()}`
                          : ""}
                        {s.failureReason ? ` | ${s.failureReason}` : ""}
                      </p>
                    </div>
                    {canManage && s.status !== "retired" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void retireSource(s.id)}
                      >
                        Retire
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
