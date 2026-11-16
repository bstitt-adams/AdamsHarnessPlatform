"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { CloudDownload, CloudUpload, Link2, Loader2, RefreshCcw, Trash2, Unlink2 } from "lucide-react";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { COLLECTIONS, type AssetExternalLinkDoc, type AssetProvider } from "@/lib/schema";
import type { RemoteAsset } from "@/lib/asset-integrations/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type RemoteType = AssetExternalLinkDoc["remoteType"];

function providerLabel(provider: AssetProvider) {
  return provider === "jamf" ? "Jamf Pro" : "NinjaOne";
}

function timestampText(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().toLocaleString();
  return "—";
}

export function AssetExternalLinksPanel({ assetId, onChanged }: { assetId: string; onChanged?: () => void }) {
  const [links, setLinks] = useState<AssetExternalLinkDoc[]>([]);
  const [provider, setProvider] = useState<AssetProvider>("jamf");
  const [remoteType, setRemoteType] = useState<RemoteType>("jamfComputer");
  const [remoteId, setRemoteId] = useState("");
  const [remoteAssets, setRemoteAssets] = useState<RemoteAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, COLLECTIONS.ASSET_EXTERNAL_LINKS), where("assetId", "==", assetId)));
      setLinks(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as AssetExternalLinkDoc));
    } catch (error) {
      console.error("Unable to load external links", error);
      toast.error("Unable to load external asset links");
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => { void load(); }, [load]);

  const adminFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    await auth?.authStateReady();
    const user = auth?.currentUser;
    if (!user) throw new Error("Please sign in again before syncing this asset");
    const token = await user.getIdToken();
    const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || data.result?.message || "Integration request failed"), { result: data });
    return data;
  }, []);

  const remoteChoices = useMemo(() => remoteAssets.map((remote) => ({
    value: `${remote.remoteType}|${remote.remoteId}`,
    label: `${remote.displayName || remote.remoteId} · ${remote.serialNumber || "no serial"}`,
    remote,
  })), [remoteAssets]);

  const providerTypes: RemoteType[] = provider === "jamf" ? ["jamfComputer", "jamfMobile"] : ["ninjaManaged", "ninjaStaged", "ninjaUnmanaged"];

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await action();
      await load();
      onChanged?.();
    } catch (error) {
      const result = error instanceof Error && "result" in error ? (error as Error & { result?: { remediation?: string[]; providerResults?: { remediation?: string[] }[] } }).result : undefined;
      const remediation = result?.remediation || result?.providerResults?.flatMap((item) => item.remediation || []) || [];
      toast.error(`${error instanceof Error ? error.message : "Integration request failed"}${remediation.length ? ` ${remediation[0]}` : ""}`);
    } finally {
      setBusy(null);
    }
  };

  const loadRemoteDevices = async () => {
    await run("loadRemote", async () => {
      const data = await adminFetch(`/api/admin/asset-integrations/${provider}/devices`);
      setRemoteAssets(data.devices || []);
      toast.success(`${data.devices?.length || 0} ${providerLabel(provider)} records loaded`);
    });
  };

  const link = async () => {
    if (!remoteId) return toast.error("Select or enter a remote record ID");
    await run("link", async () => {
      await adminFetch(`/api/admin/assets/${assetId}/integrations`, { method: "POST", body: JSON.stringify({ provider, remoteType, remoteId }) });
      setRemoteId("");
      toast.success("Remote asset linked");
    });
  };

  const sync = async (link: AssetExternalLinkDoc, direction: "inbound" | "outbound") => {
    await run(`${link.id}-${direction}`, async () => {
      const data = await adminFetch(`/api/admin/assets/${assetId}/sync`, { method: "POST", body: JSON.stringify({ provider: link.provider, direction }) });
      if (data.result?.status === "failed") throw Object.assign(new Error(data.result.message || "Asset sync failed"), { result: data.result });
      toast.success(data.result?.message || `Asset synchronized ${direction}`);
    });
  };

  const unlink = async (link: AssetExternalLinkDoc) => {
    await run(`${link.id}-unlink`, async () => {
      await adminFetch(`/api/admin/assets/${assetId}/integrations`, { method: "DELETE", body: JSON.stringify({ provider: link.provider }) });
      toast.success("Remote link marked for manual cleanup");
    });
  };

  const retire = async () => {
    if (!window.confirm("Retire this local asset and decommission/delete linked remote records using each vendor's safest lifecycle?")) return;
    await run("retire", async () => {
      const data = await adminFetch(`/api/admin/assets/${assetId}`, { method: "DELETE", body: JSON.stringify({ mode: "retire" }) });
      toast.success(data.ok ? "Asset retired and remote lifecycle completed" : "Asset retired with remote lifecycle warnings");
    });
  };

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" />External Management Links</CardTitle>
      <CardDescription>Link, synchronize, and retire this asset in Jamf Pro and NinjaOne. Vendors use their safest supported lifecycle when hard delete is unavailable.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {loading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : links.length ? <div className="space-y-3">{links.map((link) => <div key={link.id} className="rounded-lg border p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{providerLabel(link.provider)}</span><Badge variant={link.status === "synced" || link.status === "linked" ? "secondary" : link.status === "error" ? "destructive" : "outline"}>{link.status}</Badge><Badge variant="outline">{link.remoteType}</Badge></div>
            <div className="mt-1 text-sm text-muted-foreground">{link.remoteName || link.remoteId} · {link.remoteSerial || "No remote serial"}</div>
            <div className="text-xs text-muted-foreground">Last sync: {timestampText(link.lastSyncAt)} · {link.lastSyncDirection || "—"} · {link.lastSyncResult || "—"}</div>
            {link.lastSyncError ? <div className="mt-1 text-xs text-destructive">{link.lastSyncError}</div> : null}
            {link.remediation?.length ? <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">{link.remediation.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void sync(link, "outbound")}>{busy === `${link.id}-outbound` ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CloudUpload className="mr-2 h-3 w-3" />}Push</Button>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void sync(link, "inbound")}>{busy === `${link.id}-inbound` ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CloudDownload className="mr-2 h-3 w-3" />}Pull</Button>
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void unlink(link)}>{busy === `${link.id}-unlink` ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Unlink2 className="mr-2 h-3 w-3" />}Unlink</Button>
          </div>
        </div>
      </div>)}</div> : <p className="text-sm text-muted-foreground">No Jamf or NinjaOne records are linked to this asset yet.</p>}

      <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-5">
        <Select value={provider} onValueChange={(value: AssetProvider) => { setProvider(value); setRemoteType(value === "jamf" ? "jamfComputer" : "ninjaManaged"); setRemoteAssets([]); setRemoteId(""); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="jamf">Jamf Pro</SelectItem><SelectItem value="ninjaOne">NinjaOne</SelectItem></SelectContent>
        </Select>
        <Select value={remoteType} onValueChange={(value: RemoteType) => setRemoteType(value)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{providerTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={remoteId ? `${remoteType}|${remoteId}` : ""} onValueChange={(value) => { const [type, ...idParts] = value.split("|"); setRemoteType(type as RemoteType); setRemoteId(idParts.join("|")); }}>
          <SelectTrigger><SelectValue placeholder="Remote record" /></SelectTrigger>
          <SelectContent>{remoteChoices.map((choice) => <SelectItem key={choice.value} value={choice.value}>{choice.label}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={remoteId} onChange={(event) => setRemoteId(event.target.value)} placeholder="Remote ID" />
        <div className="flex gap-2"><Button type="button" variant="outline" disabled={busy !== null} onClick={() => void loadRemoteDevices()}>{busy === "loadRemote" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}Load</Button><Button type="button" disabled={busy !== null || !remoteId} onClick={() => void link()}>{busy === "link" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}Link</Button></div>
      </div>

      <div className="flex justify-end"><Button variant="destructive" disabled={busy !== null} onClick={() => void retire()}>{busy === "retire" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Retire Asset and Remote Records</Button></div>
    </CardContent>
  </Card>;
}
