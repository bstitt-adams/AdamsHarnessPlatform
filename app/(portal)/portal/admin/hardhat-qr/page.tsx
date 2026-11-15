"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldOff,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { adamsFetch, adamsFetchJson } from "@/lib/adams-harness/client-api";

type QrStatus = "active" | "inactive" | "revoked";

interface QrCodeRow {
  id: string;
  teamMemberId: string;
  teamMemberName: string;
  teamMemberEmail?: string;
  status: QrStatus;
  tokenVersion: number;
  scanCount: number;
  printCount: number;
  lastScannedAt?: string;
  updatedAt?: string;
}

interface MemberOption {
  id: string;
  name: string;
  email?: string;
  missionCritical?: boolean;
}

function statusVariant(status: QrStatus) {
  if (status === "active") return "default" as const;
  if (status === "revoked") return "destructive" as const;
  return "secondary" as const;
}

export default function HardhatQrAdminPage() {
  const [codes, setCodes] = useState<QrCodeRow[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generateMemberId, setGenerateMemberId] = useState("");
  const [batching, setBatching] = useState(false);
  const [mcOnly, setMcOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adamsFetchJson<{ codes: QrCodeRow[]; members: MemberOption[] }>(
        "/api/admin/hardhat-qr",
      );
      setCodes(data.codes ?? []);
      setMembers(data.members ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load QR codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const membersWithActive = useMemo(
    () => new Set(codes.filter((c) => c.status !== "revoked").map((c) => c.teamMemberId)),
    [codes],
  );

  const membersWithoutCode = useMemo(
    () => members
      .filter((member) => !membersWithActive.has(member.id))
      .filter((member) => !mcOnly || member.missionCritical),
    [members, membersWithActive, mcOnly],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return codes.filter((code) => {
      if (statusFilter !== "all" && code.status !== statusFilter) return false;
      if (!term) return true;
      return (
        code.teamMemberName?.toLowerCase().includes(term) ||
        code.teamMemberEmail?.toLowerCase().includes(term) ||
        code.id.toLowerCase().includes(term)
      );
    });
  }, [codes, search, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runAction = async (codeId: string, action: string) => {
    setBusy(`${action}-${codeId}`);
    try {
      await adamsFetch(`/api/admin/hardhat-qr/${codeId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      toast.success(`QR code ${action === "rotate" ? "rotated" : `${action}d`}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} QR code`);
    } finally {
      setBusy(null);
    }
  };

  const issueCode = async (teamMemberId: string) => {
    await adamsFetch("/api/admin/hardhat-qr", {
      method: "POST",
      body: JSON.stringify({ teamMemberId }),
    });
  };

  const generateOne = async () => {
    if (!generateMemberId) return;
    setBusy("generate");
    try {
      await issueCode(generateMemberId);
      toast.success("QR code issued");
      setGenerateMemberId("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to issue QR code");
    } finally {
      setBusy(null);
    }
  };

  const batchGenerate = async () => {
    if (selected.size === 0) return;
    setBatching(true);
    let issued = 0;
    let failed = 0;
    for (const memberId of Array.from(selected)) {
      try {
        await issueCode(memberId);
        issued += 1;
      } catch {
        failed += 1;
      }
    }
    toast.success(`Issued ${issued} QR code${issued === 1 ? "" : "s"}${failed ? ` (${failed} failed)` : ""}`);
    setSelected(new Set());
    setBatching(false);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <QrCode className="h-6 w-6 text-primary" /> Hardhat QR Codes
          </h1>
          <p className="text-sm text-muted-foreground">
            Central console for secure worker QR codes — issue, rotate, deactivate, revoke, and audit scans.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {(["active", "inactive", "revoked"] as const).map((status) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{status}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{codes.filter((c) => c.status === status).length}</div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Total Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{codes.reduce((sum, c) => sum + (c.scanCount || 0), 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issue QR codes</CardTitle>
          <CardDescription>Generate a secure QR token for a Team Member, or batch-issue to members who don't have an active code yet.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Select value={generateMemberId} onValueChange={setGenerateMemberId}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Select a Team Member…" /></SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}{member.email ? ` — ${member.email}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => void generateOne()} disabled={!generateMemberId || busy === "generate"}>
            {busy === "generate" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Issue Code
          </Button>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span>{membersWithoutCode.length} member{membersWithoutCode.length === 1 ? "" : "s"} without an active code</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members without a QR code</CardTitle>
          <CardDescription>Select members to batch-issue codes.</CardDescription>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mcOnly} onChange={(e) => setMcOnly(e.target.checked)} className="h-4 w-4" />
            Mission Critical employees only
          </label>
        </CardHeader>
        <CardContent className="space-y-3">
          {membersWithoutCode.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every Team Member already has an active or inactive code.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {membersWithoutCode.slice(0, 60).map((member) => (
                  <label key={member.id} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                    <Checkbox
                      checked={selected.has(member.id)}
                      onCheckedChange={() => toggleSelect(member.id)}
                    />
                    {member.name}
                  </label>
                ))}
                {membersWithoutCode.length > 60 && (
                  <span className="self-center text-xs text-muted-foreground">+{membersWithoutCode.length - 60} more</span>
                )}
              </div>
              <Button onClick={() => void batchGenerate()} disabled={selected.size === 0 || batching}>
                {batching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                Issue {selected.size || ""} selected
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Issued codes</CardTitle>
            <CardDescription>{filtered.length} of {codes.length} codes</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="w-56 pl-8" placeholder="Search member or code…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">No QR codes match.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>v</TableHead>
                  <TableHead>Scans</TableHead>
                  <TableHead>Prints</TableHead>
                  <TableHead>Last scanned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <div className="font-medium">{code.teamMemberName}</div>
                      <div className="text-xs text-muted-foreground">{code.teamMemberEmail || code.teamMemberId}</div>
                    </TableCell>
                    <TableCell><Badge variant={statusVariant(code.status)}>{code.status}</Badge></TableCell>
                    <TableCell>{code.tokenVersion}</TableCell>
                    <TableCell>{code.scanCount}</TableCell>
                    <TableCell>{code.printCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {code.lastScannedAt ? new Date(code.lastScannedAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/worker/${code.id}`} target="_blank"><Eye className="h-4 w-4" /></Link>
                      </Button>
                      {code.status !== "active" && code.status !== "revoked" && (
                        <Button variant="ghost" size="sm" onClick={() => void runAction(code.id, "activate")} disabled={busy !== null}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {code.status === "active" && (
                        <Button variant="ghost" size="sm" onClick={() => void runAction(code.id, "deactivate")} disabled={busy !== null}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => void runAction(code.id, "rotate")} disabled={busy !== null || code.status === "revoked"} title="Rotate token">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void runAction(code.id, "printed")} disabled={busy !== null} title="Log print">
                        <Printer className="h-4 w-4" />
                      </Button>
                      {code.status !== "revoked" && (
                        <Button variant="ghost" size="sm" onClick={() => void runAction(code.id, "revoke")} disabled={busy !== null} title="Revoke">
                          <ShieldOff className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
