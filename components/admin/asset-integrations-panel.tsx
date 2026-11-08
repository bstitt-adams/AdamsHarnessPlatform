"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudDownload, CloudUpload, Loader2, RefreshCcw, ShieldCheck, TestTube2 } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import type { ProviderCapabilities } from "@/lib/asset-integrations/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProviderKey = "jamf" | "ninjaOne";

type PublicIntegrationConfig = {
  jamf: {
    enabled: boolean;
    configured: boolean;
    baseUrl: string;
    syncComputers: boolean;
    syncMobileDevices: boolean;
    allowLegacyMobileWriteApi: boolean;
    importUnmatched: boolean;
    clientIdConfigured: boolean;
    clientSecretConfigured: boolean;
  };
  ninjaOne: {
    enabled: boolean;
    configured: boolean;
    region: string;
    baseUrl: string;
    organizationId?: number;
    locationId?: number;
    unmanagedRoleId?: number;
    createMode: "linkOnly" | "unmanaged" | "staged";
    importUnmatched: boolean;
    clientIdConfigured: boolean;
    clientSecretConfigured: boolean;
  };
};

interface IntegrationForm {
  jamf: {
    enabled: boolean;
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    syncComputers: boolean;
    syncMobileDevices: boolean;
    allowLegacyMobileWriteApi: boolean;
    importUnmatched: boolean;
  };
  ninjaOne: {
    enabled: boolean;
    region: string;
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    organizationId: string;
    locationId: string;
    unmanagedRoleId: string;
    createMode: "linkOnly" | "unmanaged" | "staged";
    importUnmatched: boolean;
  };
}

interface ActionResult {
  ok?: boolean;
  error?: string;
  message?: string;
  remediation?: string[];
  errors?: { error?: string; remediation?: string[] }[];
  capabilities?: ProviderCapabilities[];
  succeeded?: number;
  failed?: number;
  createdAssets?: number;
  updatedAssets?: number;
  results?: { status?: string; message?: string; remediation?: string[] }[];
}

const emptyForm: IntegrationForm = {
  jamf: {
    enabled: false,
    baseUrl: "",
    clientId: "",
    clientSecret: "",
    syncComputers: true,
    syncMobileDevices: true,
    allowLegacyMobileWriteApi: false,
    importUnmatched: true,
  },
  ninjaOne: {
    enabled: false,
    region: "app",
    baseUrl: "",
    clientId: "",
    clientSecret: "",
    organizationId: "",
    locationId: "",
    unmanagedRoleId: "",
    createMode: "unmanaged",
    importUnmatched: true,
  },
};

function toForm(config?: PublicIntegrationConfig): IntegrationForm {
  return {
    jamf: { ...emptyForm.jamf, ...config?.jamf, clientId: "", clientSecret: "" },
    ninjaOne: {
      ...emptyForm.ninjaOne,
      ...config?.ninjaOne,
      clientId: "",
      clientSecret: "",
      organizationId: config?.ninjaOne.organizationId ? String(config.ninjaOne.organizationId) : "",
      locationId: config?.ninjaOne.locationId ? String(config.ninjaOne.locationId) : "",
      unmanagedRoleId: config?.ninjaOne.unmanagedRoleId ? String(config.ninjaOne.unmanagedRoleId) : "",
    },
  };
}

function numberOrUndefined(value: string) {
  const number = Number(value);
  return value.trim() && Number.isFinite(number) && number > 0 ? number : undefined;
}

function remediationFrom(result: ActionResult) {
  return [...new Set([
    ...(result.remediation || []),
    ...(result.errors?.flatMap((item) => item.remediation || []) || []),
    ...(result.results?.flatMap((item) => item.remediation || []) || []),
  ])].filter(Boolean);
}

export function AssetIntegrationsPanel({ onInventoryChanged }: { onInventoryChanged?: () => void }) {
  const [config, setConfig] = useState<PublicIntegrationConfig | null>(null);
  const [capabilities, setCapabilities] = useState<Record<ProviderKey, ProviderCapabilities[]>>({ jamf: [], ninjaOne: [] });
  const [form, setForm] = useState<IntegrationForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ provider: ProviderKey; action: string; result: ActionResult } | null>(null);

  const adminFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const user = auth?.currentUser;
    if (!user) throw new Error("Please sign in again before managing integrations");
    const token = await user.getIdToken();
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || data.message || "Integration request failed"), { result: data });
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch("/api/admin/asset-integrations");
      setConfig(data.config);
      setCapabilities(data.capabilities || { jamf: [], ninjaOne: [] });
      setForm(toForm(data.config));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load asset integrations");
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setBusy("save");
    try {
      const data = await adminFetch("/api/admin/asset-integrations", {
        method: "POST",
        body: JSON.stringify({
          jamf: { ...form.jamf },
          ninjaOne: {
            ...form.ninjaOne,
            organizationId: numberOrUndefined(form.ninjaOne.organizationId),
            locationId: numberOrUndefined(form.ninjaOne.locationId),
            unmanagedRoleId: numberOrUndefined(form.ninjaOne.unmanagedRoleId),
          },
        }),
      });
      setConfig(data.config);
      setForm(toForm(data.config));
      toast.success("Asset integrations saved. Client secrets were stored server-side.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save integrations");
    } finally {
      setBusy(null);
    }
  };

  const runAction = async (provider: ProviderKey, action: string, path: string, body: Record<string, unknown>) => {
    const key = `${provider}-${action}`;
    setBusy(key);
    try {
      const result = await adminFetch(path, { method: "POST", body: JSON.stringify(body) }) as ActionResult;
      setLastResult({ provider, action, result });
      if (action === "inbound") onInventoryChanged?.();
      toast.success(result.message || `${provider === "jamf" ? "Jamf" : "NinjaOne"} ${action} completed`);
    } catch (error) {
      const result = error instanceof Error && "result" in error ? (error as Error & { result?: ActionResult }).result : undefined;
      setLastResult({ provider, action, result: result || { error: error instanceof Error ? error.message : "Request failed" } });
      toast.error(result?.error || result?.message || (error instanceof Error ? error.message : "Integration request failed"));
    } finally {
      setBusy(null);
    }
  };

  const providerActions = (provider: ProviderKey) => {
    const configured = provider === "jamf" ? config?.jamf.configured : config?.ninjaOne.configured;
    const enabled = provider === "jamf" ? config?.jamf.enabled : config?.ninjaOne.enabled;
    const isBusy = (action: string) => busy === `${provider}-${action}`;
    return <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={!enabled || !configured || busy !== null} onClick={() => void runAction(provider, "connectivity", `/api/admin/asset-integrations/${provider}/test`, { mode: "connectivity" })}>{isBusy("connectivity") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}Test</Button>
      <Button type="button" size="sm" variant="outline" disabled={!enabled || !configured || busy !== null} onClick={() => void runAction(provider, "capability", `/api/admin/asset-integrations/${provider}/test`, { mode: "capability" })}>{isBusy("capability") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Check CRUD</Button>
      <Button type="button" size="sm" variant="outline" disabled={!enabled || !configured || busy !== null} onClick={() => void runAction(provider, "crud", `/api/admin/asset-integrations/${provider}/test`, { mode: "crud" })}>{isBusy("crud") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}CRUD Smoke</Button>
      <Button type="button" size="sm" variant="outline" disabled={!enabled || !configured || busy !== null} onClick={() => void runAction(provider, "inbound", `/api/admin/asset-integrations/${provider}/sync`, { direction: "inbound" })}>{isBusy("inbound") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudDownload className="mr-2 h-4 w-4" />}Pull Assets</Button>
      <Button type="button" size="sm" variant="outline" disabled={!enabled || !configured || busy !== null} onClick={() => void runAction(provider, "outbound", `/api/admin/asset-integrations/${provider}/sync`, { direction: "outbound" })}>{isBusy("outbound") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}Push Assets</Button>
    </div>;
  };

  const capabilityList = (provider: ProviderKey) => capabilities[provider]?.map((item) => <div key={`${item.provider}-${item.remoteType}`} className="rounded-md border p-2 text-xs">
    <div className="mb-1 flex items-center justify-between gap-2"><span className="font-medium">{item.remoteType}</span><div className="flex gap-1">{Object.entries(item.capabilities).map(([name, supported]) => <Badge key={name} variant={supported ? "secondary" : "outline"}>{name}</Badge>)}</div></div>
    {item.notes.map((note) => <p key={note} className="text-muted-foreground">{note}</p>)}
  </div>);

  if (loading) return <Card><CardContent className="flex min-h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>;

  return <Card>
    <CardHeader>
      <CardTitle>Jamf and NinjaOne Integrations</CardTitle>
      <CardDescription>Configure OAuth clients, test platform capabilities, and synchronize assets. Client secrets are stored in platform secrets and are never shown here after saving.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between"><div><h3 className="font-semibold">Jamf Pro</h3><p className="text-xs text-muted-foreground">Computers and mobile devices</p></div><Badge variant={config?.jamf.configured ? "secondary" : "outline"}>{config?.jamf.configured ? "Configured" : "Not configured"}</Badge></div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.jamf.enabled} onCheckedChange={(checked) => setForm({ ...form, jamf: { ...form.jamf, enabled: checked === true } })} />Enabled</label>
          <div><Label>Tenant URL</Label><Input placeholder="https://company.jamfcloud.com" value={form.jamf.baseUrl} onChange={(e) => setForm({ ...form, jamf: { ...form.jamf, baseUrl: e.target.value } })} /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label>Client ID{config?.jamf.clientIdConfigured ? " (saved)" : ""}</Label><Input value={form.jamf.clientId} onChange={(e) => setForm({ ...form, jamf: { ...form.jamf, clientId: e.target.value } })} placeholder={config?.jamf.clientIdConfigured ? "Saved — enter to replace" : "OAuth client ID"} /></div><div><Label>Client Secret{config?.jamf.clientSecretConfigured ? " (saved)" : ""}</Label><Input type="password" value={form.jamf.clientSecret} onChange={(e) => setForm({ ...form, jamf: { ...form.jamf, clientSecret: e.target.value } })} placeholder={config?.jamf.clientSecretConfigured ? "Saved — enter to replace" : "OAuth client secret"} /></div></div>
          <div className="grid gap-2 text-sm"><label className="flex items-center gap-2"><Checkbox checked={form.jamf.syncComputers} onCheckedChange={(checked) => setForm({ ...form, jamf: { ...form.jamf, syncComputers: checked === true } })} />Sync computers</label><label className="flex items-center gap-2"><Checkbox checked={form.jamf.syncMobileDevices} onCheckedChange={(checked) => setForm({ ...form, jamf: { ...form.jamf, syncMobileDevices: checked === true } })} />Sync mobile devices</label><label className="flex items-center gap-2"><Checkbox checked={form.jamf.importUnmatched} onCheckedChange={(checked) => setForm({ ...form, jamf: { ...form.jamf, importUnmatched: checked === true } })} />Import unmatched vendor assets</label></div>
          <div className="space-y-2">{capabilityList("jamf")}</div>
          {providerActions("jamf")}
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between"><div><h3 className="font-semibold">NinjaOne</h3><p className="text-xs text-muted-foreground">Managed, staged, and unmanaged ITAM devices</p></div><Badge variant={config?.ninjaOne.configured ? "secondary" : "outline"}>{config?.ninjaOne.configured ? "Configured" : "Not configured"}</Badge></div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.ninjaOne.enabled} onCheckedChange={(checked) => setForm({ ...form, ninjaOne: { ...form.ninjaOne, enabled: checked === true } })} />Enabled</label>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label>Region</Label><Select value={form.ninjaOne.region} onValueChange={(region) => setForm({ ...form, ninjaOne: { ...form.ninjaOne, region } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["app", "us2", "us3", "eu", "ca", "oc"].map((region) => <SelectItem key={region} value={region}>{region}</SelectItem>)}</SelectContent></Select></div><div><Label>Custom base URL</Label><Input placeholder="Optional override" value={form.ninjaOne.baseUrl} onChange={(e) => setForm({ ...form, ninjaOne: { ...form.ninjaOne, baseUrl: e.target.value } })} /></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label>Client ID{config?.ninjaOne.clientIdConfigured ? " (saved)" : ""}</Label><Input value={form.ninjaOne.clientId} onChange={(e) => setForm({ ...form, ninjaOne: { ...form.ninjaOne, clientId: e.target.value } })} placeholder={config?.ninjaOne.clientIdConfigured ? "Saved — enter to replace" : "OAuth client ID"} /></div><div><Label>Client Secret{config?.ninjaOne.clientSecretConfigured ? " (saved)" : ""}</Label><Input type="password" value={form.ninjaOne.clientSecret} onChange={(e) => setForm({ ...form, ninjaOne: { ...form.ninjaOne, clientSecret: e.target.value } })} placeholder={config?.ninjaOne.clientSecretConfigured ? "Saved — enter to replace" : "OAuth client secret"} /></div></div>
          <div className="grid gap-3 sm:grid-cols-3"><div><Label>Organization ID</Label><Input value={form.ninjaOne.organizationId} onChange={(e) => setForm({ ...form, ninjaOne: { ...form.ninjaOne, organizationId: e.target.value } })} /></div><div><Label>Location ID</Label><Input value={form.ninjaOne.locationId} onChange={(e) => setForm({ ...form, ninjaOne: { ...form.ninjaOne, locationId: e.target.value } })} /></div><div><Label>Unmanaged Role ID</Label><Input value={form.ninjaOne.unmanagedRoleId} onChange={(e) => setForm({ ...form, ninjaOne: { ...form.ninjaOne, unmanagedRoleId: e.target.value } })} /></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label>Create mode</Label><Select value={form.ninjaOne.createMode} onValueChange={(createMode: IntegrationForm["ninjaOne"]["createMode"]) => setForm({ ...form, ninjaOne: { ...form.ninjaOne, createMode } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unmanaged">Unmanaged ITAM CRUD</SelectItem><SelectItem value="staged">Staged device</SelectItem><SelectItem value="linkOnly">Link only</SelectItem></SelectContent></Select></div><label className="mt-6 flex items-center gap-2 text-sm"><Checkbox checked={form.ninjaOne.importUnmatched} onCheckedChange={(checked) => setForm({ ...form, ninjaOne: { ...form.ninjaOne, importUnmatched: checked === true } })} />Import unmatched vendor assets</label></div>
          <div className="space-y-2">{capabilityList("ninjaOne")}</div>
          {providerActions("ninjaOne")}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2"><Button disabled={busy !== null} onClick={() => void save()}>{busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Integration Settings</Button><Button variant="outline" disabled={busy !== null} onClick={() => void load()}>Reload</Button></div>

      {lastResult ? <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <div className="mb-2 flex items-center justify-between"><span className="font-medium">{lastResult.provider === "jamf" ? "Jamf" : "NinjaOne"} · {lastResult.action}</span><Badge variant={lastResult.result.ok === false || lastResult.result.error ? "destructive" : "secondary"}>{lastResult.result.ok === false || lastResult.result.error ? "Attention" : "Success"}</Badge></div>
        {(lastResult.result.error || lastResult.result.message) ? <p className="mb-2">{lastResult.result.error || lastResult.result.message}</p> : null}
        {remediationFrom(lastResult.result).length ? <div><div className="mb-1 font-medium">Correct in the target platform</div><ol className="list-decimal space-y-1 pl-5">{remediationFrom(lastResult.result).map((item) => <li key={item}>{item}</li>)}</ol></div> : null}
      </div> : null}
    </CardContent>
  </Card>;
}
