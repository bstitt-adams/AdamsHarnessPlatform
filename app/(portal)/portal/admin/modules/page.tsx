"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, RefreshCw, Rocket } from "lucide-react";
import { toast } from "sonner";
import { adamsFetch, adamsFetchJson } from "@/lib/adams-harness/client-api";
import type { ModuleDefinition } from "@/lib/modules/contract";
import { useUserProfile } from "@/contexts/user-profile-context";

interface ModuleBuildCheck {
  name: string;
  status: string;
  conclusion: string | null;
  url?: string;
}

interface ModuleBuild {
  id: string;
  slug: string;
  status: string;
  specificationId: string;
  specificationVersion: number;
  specificationHash: string;
  departmentId: string;
  branch: string;
  baseBranch: string;
  headSha?: string;
  pullRequestNumber?: number;
  pullRequestUrl?: string;
  previewUrl?: string;
  productionUrl?: string;
  mergeCommitSha?: string;
  changedFiles: string[];
  checks: ModuleBuildCheck[];
  failureReason?: string;
  deployedSha?: string;
  createdAt?: string;
  updatedAt?: string;
  deployedAt?: string;
}

interface PlatformHealth {
  firebaseAdmin?: { configured: boolean };
  hermes?: { configured: boolean; healthy: boolean; model?: string };
  github?: { configured: boolean; repository?: string };
  webhookSecretConfigured?: boolean;
  cronSecretConfigured?: boolean;
  hermesWorkspaceConfigured?: boolean;
}

const statusVariant = (status: string) =>
  status === "deployed"
    ? "default"
    : status === "failed"
      ? "destructive"
      : status === "preview_ready"
        ? "secondary"
        : "outline";

function AdminModulesContent() {
  const searchParams = useSearchParams();
  const { isLoading: profileLoading } = useUserProfile();
  const [builds, setBuilds] = useState<ModuleBuild[]>([]);
  const [modules, setModules] = useState<ModuleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("build"),
  );
  const [busy, setBusy] = useState(false);
  const [confirmDeploy, setConfirmDeploy] = useState(false);
  const [health, setHealth] = useState<PlatformHealth | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adamsFetchJson<{ builds: ModuleBuild[] }>(
        "/api/adams-harness/module-builds",
      );
      setBuilds(data.builds);
      const mods = await adamsFetchJson<{ modules: ModuleDefinition[] }>(
        "/api/adams-harness/modules",
      );
      setModules(mods.modules);
      adamsFetchJson<PlatformHealth>("/api/adams-harness/health")
        .then(setHealth)
        .catch(() => setHealth(null));
    } catch {
      toast.error("Failed to load module builds.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profileLoading) void load();
  }, [profileLoading, load]);

  const selected = builds.find((b) => b.id === selectedId) ?? null;

  const reconcile = async (id: string) => {
    setBusy(true);
    try {
      const res = await adamsFetch(
        `/api/adams-harness/module-builds/${id}/reconcile`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reconcile failed.");
      setBuilds((prev) =>
        prev.map((b) => (b.id === id ? data.build : b)),
      );
      toast.success("Build reconciled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reconcile failed.");
    } finally {
      setBusy(false);
    }
  };

  const deploy = async (id: string) => {
    setBusy(true);
    try {
      const res = await adamsFetch(
        `/api/adams-harness/module-builds/${id}/deploy`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deploy failed.");
      setBuilds((prev) =>
        prev.map((b) => (b.id === id ? data.build : b)),
      );
      toast.success(
        "Merge accepted; production deployment pending Vercel confirmation.",
      );
      setConfirmDeploy(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deploy failed.");
    } finally {
      setBusy(false);
    }
  };

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Admin Modules</h1>

      {health && (
        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            <Badge variant={health.firebaseAdmin?.configured ? "default" : "destructive"}>
              Firebase Admin: {health.firebaseAdmin?.configured ? "configured" : "missing"}
            </Badge>
            <Badge variant={health.hermes?.healthy ? "default" : "destructive"}>
              Hermes:{" "}
              {health.hermes?.configured
                ? health.hermes.healthy
                  ? `healthy${health.hermes.model ? ` (${health.hermes.model})` : ""}`
                  : "unreachable"
                : "not configured"}
            </Badge>
            <Badge variant={health.github?.configured ? "default" : "outline"}>
              GitHub:{" "}
              {health.github?.configured
                ? health.github.repository ?? "configured"
                : "not configured"}
            </Badge>
            <Badge variant={health.webhookSecretConfigured ? "default" : "outline"}>
              Webhook secret: {health.webhookSecretConfigured ? "set" : "unset"}
            </Badge>
            <Badge variant={health.cronSecretConfigured ? "default" : "outline"}>
              Cron secret: {health.cronSecretConfigured ? "set" : "unset"}
            </Badge>
            <Badge variant={health.hermesWorkspaceConfigured ? "default" : "outline"}>
              Hermes workspace:{" "}
              {health.hermesWorkspaceConfigured ? "set" : "unset"}
            </Badge>
            <Badge variant="outline">
              Email notifications: not configured (in-app active)
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Deployed Module Definitions</CardTitle>
          <CardDescription>
            Generated modules currently registered in the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No generated modules are registered yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((m) => (
                  <TableRow key={m.slug}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell className="font-mono text-xs">{m.slug}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {m.departmentId}
                    </TableCell>
                    <TableCell>
                      <Link
                        className="text-primary underline"
                        href={`/portal/modules/${m.slug}`}
                      >
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module Builds</CardTitle>
        </CardHeader>
        <CardContent>
          {builds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No builds yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Spec v</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {builds.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.slug}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(b.status)}>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{b.specificationVersion}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {b.branch}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setSelectedId(selectedId === b.id ? null : b.id)
                        }
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle>Build {selected.id}</CardTitle>
            <CardDescription className="font-mono text-xs">
              spec {selected.specificationId} v{selected.specificationVersion}{" "}
              hash {selected.specificationHash}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <span className="font-medium">Branch:</span>{" "}
                <span className="font-mono text-xs">{selected.branch}</span>
              </div>
              <div>
                <span className="font-medium">Head SHA:</span>{" "}
                <span className="font-mono text-xs">
                  {selected.headSha ?? "pending"}
                </span>
              </div>
              <div>
                <span className="font-medium">Pull request:</span>{" "}
                {selected.pullRequestUrl ? (
                  <a
                    className="text-primary underline"
                    href={selected.pullRequestUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    #{selected.pullRequestNumber}
                  </a>
                ) : selected.pullRequestNumber ? (
                  `#${selected.pullRequestNumber}`
                ) : (
                  "none"
                )}
              </div>
              <div>
                <span className="font-medium">Preview:</span>{" "}
                {selected.previewUrl ? (
                  <a
                    className="text-primary underline"
                    href={selected.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selected.previewUrl}
                  </a>
                ) : (
                  "none"
                )}
              </div>
              <div>
                <span className="font-medium">Production:</span>{" "}
                {selected.productionUrl ? (
                  <a
                    className="text-primary underline"
                    href={selected.productionUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selected.productionUrl}
                  </a>
                ) : selected.mergeCommitSha ? (
                  <span className="font-mono text-xs">
                    merge {selected.mergeCommitSha.slice(0, 10)} pending
                  </span>
                ) : (
                  "none"
                )}
              </div>
            </div>

            {selected.failureReason ? (
              <p className="rounded border border-destructive/50 bg-destructive/10 p-2 text-destructive">
                {selected.failureReason}
              </p>
            ) : null}

            <div>
              <p className="mb-1 font-medium">Changed files</p>
              {selected.changedFiles.length === 0 ? (
                <p className="text-muted-foreground">None recorded.</p>
              ) : (
                <ul className="list-inside list-disc font-mono text-xs">
                  {selected.changedFiles.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-1 font-medium">Checks</p>
              {selected.checks.length === 0 ? (
                <p className="text-muted-foreground">None reported.</p>
              ) : (
                <ul className="space-y-1">
                  {selected.checks.map((c, i) => (
                    <li key={`${c.name}-${i}`} className="flex items-center gap-2">
                      <Badge variant="outline">
                        {c.status}
                        {c.conclusion ? ` / ${c.conclusion}` : ""}
                      </Badge>
                      {c.url ? (
                        <a
                          className="text-primary underline"
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {c.name}
                        </a>
                      ) : (
                        <span>{c.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => reconcile(selected.id)}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Reconcile
              </Button>
              {selected.status === "preview_ready" ? (
                <Button disabled={busy} onClick={() => setConfirmDeploy(true)}>
                  <Rocket className="mr-2 h-4 w-4" /> Deploy
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={confirmDeploy} onOpenChange={setConfirmDeploy}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy module build</DialogTitle>
            <DialogDescription>
              This will merge the pull request and deploy the module at exact
              commit{" "}
              <span className="font-mono">{selected?.headSha ?? "unknown"}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeploy(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              disabled={busy || !selected}
              onClick={() => selected && deploy(selected.id)}
            >
              {busy ? "Deploying..." : `Deploy ${selected?.headSha?.slice(0, 7) ?? ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminModulesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <AdminModulesContent />
    </Suspense>
  );
}
