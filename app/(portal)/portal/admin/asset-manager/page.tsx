"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDoc, collection, doc, getDocs, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { Download, FileSpreadsheet, Laptop, Loader2, Pencil, Plus, Search, Upload, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { strFromU8, unzipSync } from "fflate";
import { db, auth } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberDoc, type UserAssetDoc } from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssetIntegrationsPanel } from "@/components/admin/asset-integrations-panel";

const fields = ["assetTag", "assetType", "assetName", "manufacturer", "model", "serialNumber", "identifier", "status", "condition", "assignedToEmail", "phoneNumber", "carrier", "plan", "imei", "purchaseDate", "purchaseCost", "warrantyExpiration", "nextInspectionDate", "notes"] as const;
type ImportField = (typeof fields)[number];
type ImportRow = Record<string, string>;
type MetricFilter = "all" | "assigned" | "unassigned" | "attention";

const emptyForm = {
  assetTag: "", assetType: "laptop", assetName: "", manufacturer: "", model: "", serialNumber: "", identifier: "", status: "available" as UserAssetDoc["status"], condition: "good" as NonNullable<UserAssetDoc["condition"]>, assignedToTeamMemberId: "", phoneNumber: "", carrier: "", plan: "", imei: "", purchaseDate: "", purchaseCost: "", warrantyExpiration: "", nextInspectionDate: "", notes: "",
};

function decodeXml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}

function parseXlsx(buffer: ArrayBuffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const sharedXml = files["xl/sharedStrings.xml"] ? strFromU8(files["xl/sharedStrings.xml"]) : "";
  const shared = Array.from(sharedXml.matchAll(/<si[\s>][\s\S]*?<\/si>/g)).map((match) => decodeXml(Array.from(match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((part) => part[1]).join("")));
  const sheetKey = Object.keys(files).filter((key) => /^xl\/worksheets\/sheet\d+\.xml$/.test(key)).sort()[0];
  if (!sheetKey) throw new Error("Workbook has no worksheets");
  const xml = strFromU8(files[sheetKey]);
  const rows = Array.from(xml.matchAll(/<row[\s>][\s\S]*?<\/row>/g)).map((rowMatch) => {
    const values: string[] = [];
    for (const cell of rowMatch[0].matchAll(/<c[^>]*r="([A-Z]+)\d+"[^>]*?(?:t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g)) {
      const column = cell[1].split("").reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
      const raw = cell[3].match(/<v>([\s\S]*?)<\/v>/)?.[1] || cell[3].match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] || "";
      values[column] = cell[2] === "s" ? shared[Number(raw)] || "" : decodeXml(raw);
    }
    return values.map((value) => value || "");
  });
  const headers = rows.shift() || [];
  return { headers, rows: rows.filter((row) => row.some(Boolean)).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]))) };
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && text[i + 1] === '"' && quoted) { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[i + 1] === "\n") i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift() || [];
  return { headers, rows: rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]))) };
}

export default function AssetManagerPage() {
  const { linkedTeamMember, profile } = useUserProfile();
  const [assets, setAssets] = useState<UserAssetDoc[]>([]);
  const [members, setMembers] = useState<TeamMemberDoc[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [assignDialogAsset, setAssignDialogAsset] = useState<UserAssetDoc | null>(null);
  const [editingAsset, setEditingAsset] = useState<UserAssetDoc | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<ImportField, string>>(Object.fromEntries(fields.map((field) => [field, ""])) as Record<ImportField, string>);

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const [assetSnap, memberSnap] = await Promise.all([getDocs(collection(db, COLLECTIONS.USER_ASSETS)), getDocs(collection(db, COLLECTIONS.TEAM_MEMBERS))]);
      setAssets(assetSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as UserAssetDoc));
      setMembers(memberSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as TeamMemberDoc).sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
    } catch { toast.error("Unable to load asset inventory"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveAsset = async () => {
    if (!db || !form.assetName.trim()) return toast.error("Asset name is required");
    setSaving(true);
    try {
      const member = members.find((item) => item.id === form.assignedToTeamMemberId);
      const now = Timestamp.now();
      const ref = doc(collection(db, COLLECTIONS.USER_ASSETS));
      const assignedToName = member ? `${member.firstName} ${member.lastName}`.trim() : "Unassigned";
      await setDoc(ref, { ...form, id: ref.id, identifier: form.identifier || form.serialNumber || form.assetTag, assignedToTeamMemberId: member?.id || "", assignedToName, assignedToEmail: member?.emailPrimary || "", assignedToUid: member?.firebaseUid || "", purchaseCost: Number(form.purchaseCost || 0), assignedByUid: auth?.currentUser?.uid || "", assignedByName: linkedTeamMember ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}` : profile.email || "Administrator", assignedAt: now, createdAt: now, updatedAt: now });
      addDoc(collection(db, COLLECTIONS.ASSET_HISTORY), { assetId: ref.id, action: member ? "assigned" : "created", teamMemberId: member?.id || "", teamMemberName: assignedToName, performedByUid: auth?.currentUser?.uid || "", createdAt: now }).catch((error) => console.warn("Unable to write asset history", error));
      setForm(emptyForm); toast.success("Asset added"); await load();
    } catch { toast.error("Unable to save asset"); } finally { setSaving(false); }
  };

  const assignAsset = async (asset: UserAssetDoc, teamMemberId: string) => {
    if (!db) return;
    const member = members.find((item) => item.id === teamMemberId);
    const assignedToName = member ? `${member.firstName} ${member.lastName}`.trim() : "Unassigned";
    const previousTeamMemberId = asset.assignedToTeamMemberId || "";
    const previousTeamMemberName = asset.assignedToName || "Unassigned";
    const performedByName = linkedTeamMember ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}` : profile.email || "Administrator";
    const action = member ? (previousTeamMemberId && previousTeamMemberId !== member.id ? "reassigned" : "assigned") : "unassigned";
    const now = Timestamp.now();
    try {
      await updateDoc(doc(db, COLLECTIONS.USER_ASSETS, asset.id), {
        assignedToTeamMemberId: member?.id || "",
        assignedToName,
        assignedToEmail: member?.emailPrimary || "",
        assignedToUid: member?.firebaseUid || "",
        assignmentMatchStatus: member ? "matched" : "not_applicable",
        assignmentReturnedAt: member ? null : now,
        status: member ? (asset.status === "available" || asset.status === "returned" ? "active" : asset.status) : "available",
        lastAssignmentAction: action,
        lastReassignedAt: now,
        lastReassignedByUid: auth?.currentUser?.uid || "",
        lastReassignedByName: performedByName,
        lastReassignedFromTeamMemberId: previousTeamMemberId,
        lastReassignedFromTeamMemberName: previousTeamMemberName,
        lastReassignedToTeamMemberId: member?.id || "",
        lastReassignedToTeamMemberName: assignedToName,
        updatedAt: now,
      });
      addDoc(collection(db, COLLECTIONS.ASSET_HISTORY), {
        assetId: asset.id,
        action,
        teamMemberId: member?.id || "",
        teamMemberName: assignedToName,
        fromTeamMemberId: previousTeamMemberId,
        fromTeamMemberName: previousTeamMemberName,
        toTeamMemberId: member?.id || "",
        toTeamMemberName: assignedToName,
        reassignedByUid: auth?.currentUser?.uid || "",
        reassignedByName: performedByName,
        performedByUid: auth?.currentUser?.uid || "",
        performedByName,
        createdAt: now,
      }).catch((error) => console.warn("Unable to write asset history", error));
      toast.success(member ? `${asset.assetName} assigned to ${assignedToName}` : `${asset.assetName} unassigned`);
      setAssets((current) => current.map((item) => item.id === asset.id ? {
        ...item,
        assignedToTeamMemberId: member?.id || "",
        assignedToName,
        assignedToEmail: member?.emailPrimary || "",
        assignedToUid: member?.firebaseUid || "",
        assignmentMatchStatus: member ? "matched" : "not_applicable",
        assignmentReturnedAt: member ? undefined : now,
        status: member ? (asset.status === "available" || asset.status === "returned" ? "active" : asset.status) : "available",
        lastAssignmentAction: action,
        lastReassignedAt: now,
        lastReassignedByUid: auth?.currentUser?.uid || "",
        lastReassignedByName: performedByName,
        lastReassignedFromTeamMemberId: previousTeamMemberId,
        lastReassignedFromTeamMemberName: previousTeamMemberName,
        lastReassignedToTeamMemberId: member?.id || "",
        lastReassignedToTeamMemberName: assignedToName,
        updatedAt: now,
      } : item));
    } catch (error) {
      console.error("Unable to update asset assignment", error);
      toast.error("Unable to update asset assignment");
    }
  };

  const openEditAsset = (asset: UserAssetDoc) => {
    setEditingAsset(asset);
    setEditForm({
      ...emptyForm,
      assetTag: asset.assetTag || "",
      assetType: asset.assetType || "other",
      assetName: asset.assetName || "",
      manufacturer: asset.manufacturer || "",
      model: asset.model || "",
      serialNumber: asset.serialNumber || "",
      identifier: asset.identifier || "",
      status: asset.status || "available",
      condition: asset.condition || "good",
      assignedToTeamMemberId: asset.assignedToTeamMemberId || "",
      phoneNumber: asset.phoneNumber || "",
      carrier: asset.carrier || "",
      plan: asset.plan || "",
      imei: asset.imei || "",
      purchaseDate: asset.purchaseDate || "",
      purchaseCost: String(asset.purchaseCost || ""),
      warrantyExpiration: asset.warrantyExpiration || "",
      nextInspectionDate: asset.nextInspectionDate || "",
      notes: asset.notes || "",
    });
  };

  const saveAssetChanges = async () => {
    if (!db || !editingAsset || !editForm.assetName.trim()) return toast.error("Asset name is required");
    setSaving(true);
    const updated = {
      ...editForm,
      assetName: editForm.assetName.trim(),
      identifier: editForm.identifier || editForm.serialNumber || editForm.assetTag,
      purchaseCost: Number(editForm.purchaseCost || 0),
      updatedAt: Timestamp.now(),
    };
    try {
      await updateDoc(doc(db, COLLECTIONS.USER_ASSETS, editingAsset.id), updated);
      setAssets((current) => current.map((item) => item.id === editingAsset.id ? { ...item, ...updated } : item));
      setEditingAsset(null);
      toast.success("Asset updated");
    } catch (error) {
      console.error("Unable to update asset", error);
      toast.error("Unable to update asset");
    } finally {
      setSaving(false);
    }
  };

  const handleSpreadsheet = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = file.name.toLowerCase().endsWith(".xlsx") ? parseXlsx(await file.arrayBuffer()) : parseCsv(await file.text());
      setHeaders(parsed.headers); setImportRows(parsed.rows);
      setMapping(Object.fromEntries(fields.map((field) => [field, parsed.headers.find((header) => header.toLowerCase().replace(/[^a-z]/g, "") === field.toLowerCase()) || ""])) as Record<ImportField, string>);
      if (parsed.rows.length === 0) toast.error("No data rows were found in the spreadsheet");
    } catch {
      toast.error("Unable to read this spreadsheet. Upload an .xlsx or .csv file.");
    }
  };

  const runImport = async () => {
    if (!db || !mapping.assetName || importRows.length === 0) return toast.error("Map Asset Name before importing");
    setSaving(true);
    try {
      const existing = new Map(assets.flatMap((asset) => [asset.assetTag, asset.serialNumber, asset.identifier].filter(Boolean).map((key) => [String(key).toLowerCase(), asset.id])));
      let imported = 0;
      for (const row of importRows) {
        const value = (field: ImportField) => mapping[field] ? String(row[mapping[field]] || "").trim() : "";
        const member = members.find((item) => item.emailPrimary.toLowerCase() === value("assignedToEmail").toLowerCase());
        const key = (value("assetTag") || value("serialNumber") || value("identifier")).toLowerCase();
        const ref = key && existing.has(key) ? doc(db, COLLECTIONS.USER_ASSETS, existing.get(key)!) : doc(collection(db, COLLECTIONS.USER_ASSETS));
        const now = Timestamp.now();
        await setDoc(ref, { id: ref.id, assetTag: value("assetTag"), assetType: value("assetType") || "other", assetName: value("assetName"), manufacturer: value("manufacturer"), model: value("model"), serialNumber: value("serialNumber"), identifier: value("identifier") || key, status: value("status") || (member ? "active" : "available"), condition: value("condition") || "good", assignedToTeamMemberId: member?.id || "", assignedToName: member ? `${member.firstName} ${member.lastName}`.trim() : "Unassigned", assignedToEmail: member?.emailPrimary || value("assignedToEmail"), assignedToUid: member?.firebaseUid || "", phoneNumber: value("phoneNumber"), carrier: value("carrier"), plan: value("plan"), imei: value("imei"), purchaseDate: value("purchaseDate"), purchaseCost: Number(value("purchaseCost") || 0), warrantyExpiration: value("warrantyExpiration"), nextInspectionDate: value("nextInspectionDate"), notes: value("notes"), assignedByUid: auth?.currentUser?.uid || "", assignedByName: profile.email || "Administrator", assignedAt: now, createdAt: now, updatedAt: now }, { merge: true });
        imported++;
      }
      toast.success(`${imported} assets imported or updated`); setImportRows([]); setHeaders([]); await load();
    } catch { toast.error("Asset import failed"); } finally { setSaving(false); }
  };

  const downloadTemplate = () => {
    const csv = `${fields.join(",")}\nAE-1001,laptop,Dell Latitude,Dell,Latitude 7450,SN123,SN123,active,good,user@adams-electric.com,,,,,2026-01-15,1599,2029-01-15,Example asset`;
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "adams-asset-import-template.csv"; link.click(); URL.revokeObjectURL(link.href);
  };

  const filtered = useMemo(() => {
    const metricFiltered = assets.filter((asset) => {
      if (metricFilter === "assigned") return Boolean(asset.assignedToTeamMemberId);
      if (metricFilter === "unassigned") return !asset.assignedToTeamMemberId;
      if (metricFilter === "attention") return asset.status === "maintenance" || asset.status === "lost";
      return true;
    });
    const term = deferredSearch.trim().toLowerCase();
    if (!term) return metricFiltered;
    return metricFiltered.filter((asset) => [asset.assetName, asset.assetTag, asset.serialNumber, asset.identifier, asset.assignedToName, asset.assignedToEmail, asset.carrier, asset.status, asset.assetType, asset.phoneNumber].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [assets, deferredSearch, metricFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, metricFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedAssets = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const firstVisible = paginatedAssets.length ? (safePage - 1) * pageSize + 1 : 0;
  const lastVisible = (safePage - 1) * pageSize + paginatedAssets.length;
  const count = (status: UserAssetDoc["status"]) => assets.filter((asset) => asset.status === status).length;
  const assignedCount = assets.filter((asset) => Boolean(asset.assignedToTeamMemberId)).length;
  const unassignedCount = assets.length - assignedCount;

  return <div className="space-y-6 p-6">
    <div><h1 className="flex items-center gap-2 text-2xl font-bold"><Laptop className="h-6 w-6 text-primary" />Asset Manager</h1><p className="text-sm text-muted-foreground">Manage the full lifecycle of Adams Electric phones, laptops, iPads, hotspots, and other assigned equipment.</p></div>
    <AssetIntegrationsPanel onInventoryChanged={() => void load()} />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      { label: "Total", value: assets.length, filter: "all" as MetricFilter },
      { label: "Assigned", value: assignedCount, filter: "assigned" as MetricFilter },
      { label: "Unassigned", value: unassignedCount, filter: "unassigned" as MetricFilter },
      { label: "Attention", value: count("maintenance") + count("lost"), filter: "attention" as MetricFilter },
    ].map((metric) => <button key={metric.filter} type="button" className="text-left" onClick={() => setMetricFilter(metric.filter)}><Card className={metricFilter === metric.filter ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"}><CardHeader className="pb-1"><CardDescription>{metric.label}</CardDescription></CardHeader><CardContent className="text-3xl font-bold">{metric.value}</CardContent></Card></button>)}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card><CardHeader><CardTitle>Company Asset Inventory</CardTitle><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search asset, serial, tag, employee, carrier..." /></div><div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><span>Showing {firstVisible}-{lastVisible} of {filtered.length} filtered assets · {assets.length} total{metricFilter !== "all" ? ` · ${metricFilter}` : ""}</span><div className="flex flex-wrap items-center gap-2">{metricFilter !== "all" ? <Button variant="ghost" size="sm" onClick={() => setMetricFilter("all")}>Clear filter</Button> : null}<Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}><SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger><SelectContent>{[5, 10, 20].map((size) => <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>)}</SelectContent></Select><Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Previous</Button><span className="min-w-16 text-center">Page {safePage} of {totalPages}</span><Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Next</Button></div></div></CardHeader><CardContent className="overflow-x-auto">{loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : <Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Tag / Serial</TableHead><TableHead>Assigned To</TableHead><TableHead>Status</TableHead><TableHead>Warranty</TableHead><TableHead className="min-w-[220px]">Assign</TableHead></TableRow></TableHeader><TableBody>{paginatedAssets.map((asset) => <TableRow key={asset.id}><TableCell><Link className="font-medium text-primary hover:underline" href={`/portal/admin/asset-manager/${asset.id}`}>{asset.assetName}</Link><div className="text-xs text-muted-foreground">{asset.assetType} · {[asset.manufacturer, asset.model].filter(Boolean).join(" ")}</div><Button type="button" variant="link" size="sm" className="mt-1 h-auto p-0" onClick={() => openEditAsset(asset)}><Pencil className="mr-1 h-3 w-3" />Edit</Button></TableCell><TableCell>{asset.assetTag || asset.serialNumber || asset.identifier || "—"}</TableCell><TableCell>{asset.assignedToTeamMemberId ? <Link className="text-primary hover:underline" href={`/portal/admin/team-members/${asset.assignedToTeamMemberId}`}>{asset.assignedToName}</Link> : "Unassigned"}{asset.lastReassignedByName ? <div className="mt-1 text-xs text-muted-foreground">{asset.lastAssignmentAction === "reassigned" ? "Reassigned" : asset.lastAssignmentAction === "unassigned" ? "Unassigned" : "Assigned"} by {asset.lastReassignedByName}{asset.lastReassignedAt?.toDate ? ` · ${asset.lastReassignedAt.toDate().toLocaleString()}` : ""}</div> : null}</TableCell><TableCell><Badge variant="outline" className="capitalize">{asset.status}</Badge></TableCell><TableCell>{asset.warrantyExpiration || "—"}</TableCell><TableCell><Button variant="outline" size="sm" onClick={() => setAssignDialogAsset(asset)}><UserCheck className="mr-2 h-4 w-4" />{asset.assignedToTeamMemberId ? "Reassign" : "Assign"}</Button></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Add and Assign Asset</CardTitle><CardDescription>Capture inventory, lifecycle, ownership, cellular, purchase, and warranty details.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
        <div><Label>Asset type</Label><Select value={form.assetType} onValueChange={(assetType) => setForm({ ...form, assetType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["laptop", "cell phone", "ipad", "hotspot", "tablet", "other"].map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Asset name *</Label><Input value={form.assetName} onChange={(e) => setForm({ ...form, assetName: e.target.value })} /></div>
        {["assetTag", "serialNumber", "manufacturer", "model", "phoneNumber", "carrier", "plan", "imei", "purchaseDate", "purchaseCost", "warrantyExpiration", "nextInspectionDate"].map((key) => <div key={key}><Label className="capitalize">{key.replace(/([A-Z])/g, " $1")}</Label><Input type={key.toLowerCase().includes("date") || key === "warrantyExpiration" ? "date" : key === "purchaseCost" ? "number" : "text"} value={String(form[key as keyof typeof form])} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></div>)}
        <div><Label>Status</Label><Select value={form.status} onValueChange={(status) => setForm({ ...form, status: status as UserAssetDoc["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["available", "active", "maintenance", "returned", "retired", "lost"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Assign Team Member</Label><Select value={form.assignedToTeamMemberId || "unassigned"} onValueChange={(id) => setForm({ ...form, assignedToTeamMemberId: id === "unassigned" ? "" : id, status: id === "unassigned" ? "available" : "active" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.firstName} {member.lastName}</SelectItem>)}</SelectContent></Select></div>
        <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div><Button className="sm:col-span-2" disabled={saving} onClick={() => void saveAsset()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Add Asset</Button>
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Spreadsheet Import and Column Mapping</CardTitle><CardDescription>Download the Adams template or upload an Excel or CSV spreadsheet, preview columns, map fields, and upsert by asset tag, serial number, or identifier.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Download Template</Button><label className="inline-flex cursor-pointer items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"><Upload className="mr-2 h-4 w-4" />Upload Spreadsheet<input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="hidden" onChange={(e) => void handleSpreadsheet(e.target.files?.[0])} /></label></div>{headers.length > 0 && <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{fields.map((field) => <div key={field}><Label className="capitalize">{field.replace(/([A-Z])/g, " $1")}</Label><Select value={mapping[field] || "skip"} onValueChange={(value) => setMapping({ ...mapping, [field]: value === "skip" ? "" : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="skip">Do not import</SelectItem>{headers.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}</SelectContent></Select></div>)}</div><p className="text-sm text-muted-foreground">Ready to import {importRows.length} rows. Existing matching assets will be updated.</p><Button disabled={saving || !mapping.assetName} onClick={() => void runImport()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Import Assets</Button></>}</CardContent></Card>
    <Dialog open={Boolean(assignDialogAsset)} onOpenChange={(open) => !open && setAssignDialogAsset(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>{assignDialogAsset?.assignedToTeamMemberId ? "Reassign Asset" : "Assign Asset"}</DialogTitle><DialogDescription>{assignDialogAsset?.assetName}</DialogDescription></DialogHeader>
        <Select value={assignDialogAsset?.assignedToTeamMemberId || "unassigned"} onValueChange={(teamMemberId) => { if (assignDialogAsset) void assignAsset(assignDialogAsset, teamMemberId); setAssignDialogAsset(null); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.firstName} {member.lastName}</SelectItem>)}</SelectContent>
        </Select>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(editingAsset)} onOpenChange={(open) => !open && setEditingAsset(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>Edit Asset</DialogTitle><DialogDescription>Update inventory, lifecycle, cellular, purchase, warranty, and notes for {editingAsset?.assetName}.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Asset type</Label><Select value={editForm.assetType} onValueChange={(assetType) => setEditForm({ ...editForm, assetType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["laptop", "cell phone", "ipad", "hotspot", "tablet", "other"].map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Asset name *</Label><Input value={editForm.assetName} onChange={(e) => setEditForm({ ...editForm, assetName: e.target.value })} /></div>
          {["assetTag", "serialNumber", "identifier", "manufacturer", "model", "phoneNumber", "carrier", "plan", "imei", "purchaseDate", "purchaseCost", "warrantyExpiration", "nextInspectionDate"].map((key) => <div key={key}><Label className="capitalize">{key.replace(/([A-Z])/g, " $1")}</Label><Input type={key.toLowerCase().includes("date") || key === "warrantyExpiration" ? "date" : key === "purchaseCost" ? "number" : "text"} value={String(editForm[key as keyof typeof editForm])} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} /></div>)}
          <div><Label>Status</Label><Select value={editForm.status} onValueChange={(status) => setEditForm({ ...editForm, status: status as UserAssetDoc["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["available", "active", "maintenance", "returned", "retired", "lost"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Condition</Label><Select value={editForm.condition} onValueChange={(condition) => setEditForm({ ...editForm, condition: condition as NonNullable<UserAssetDoc["condition"]> })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["new", "good", "fair", "damaged"].map((condition) => <SelectItem key={condition} value={condition}>{condition}</SelectItem>)}</SelectContent></Select></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditingAsset(null)}>Cancel</Button><Button disabled={saving} onClick={() => void saveAssetChanges()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}Save Changes</Button></div>
      </DialogContent>
    </Dialog>
  </div>;
}
