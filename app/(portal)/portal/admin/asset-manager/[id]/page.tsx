"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { addDoc, collection, doc, getDoc, getDocs, Timestamp, updateDoc } from "firebase/firestore";
import { ArrowLeft, Brain, Calendar, DollarSign, History, Laptop, Loader2, MapPin, Phone, SearchCheck, Shield, UserCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberDoc, type UserAssetDoc } from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AssetHistoryDoc {
  id: string;
  assetId?: string;
  action?: string;
  teamMemberId?: string;
  teamMemberName?: string;
  performedByName?: string;
  createdAt?: Timestamp;
}

interface AssignmentSuggestion {
  memberId: string;
  memberName: string;
  email: string;
  confidence: number;
  rationale: string;
}

function displayTimestamp(value?: Timestamp) {
  return value?.toDate ? value.toDate().toLocaleString() : "—";
}

function Detail({ label, value }: { label: string; value?: string | number }) {
  return <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 break-words font-medium">{value || "—"}</div></div>;
}

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  const assetId = params.id;
  const { linkedTeamMember, profile } = useUserProfile();
  const [asset, setAsset] = useState<UserAssetDoc | null>(null);
  const [members, setMembers] = useState<TeamMemberDoc[]>([]);
  const [history, setHistory] = useState<AssetHistoryDoc[]>([]);
  const [manualMemberId, setManualMemberId] = useState("");
  const [suggestions, setSuggestions] = useState<AssignmentSuggestion[]>([]);
  const [suggestion, setSuggestion] = useState<AssignmentSuggestion | null>(null);
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!db || !assetId) return;
    setLoading(true);
    try {
      const [assetSnap, memberSnap, historySnap] = await Promise.all([
        getDoc(doc(db, COLLECTIONS.USER_ASSETS, assetId)),
        getDocs(collection(db, COLLECTIONS.TEAM_MEMBERS)),
        getDocs(collection(db, COLLECTIONS.ASSET_HISTORY)),
      ]);
      if (!assetSnap.exists()) {
        setAsset(null);
        return;
      }
      const nextAsset = { id: assetSnap.id, ...assetSnap.data() } as UserAssetDoc;
      setAsset(nextAsset);
      setManualMemberId(nextAsset.assignedToTeamMemberId || "");
      setMembers(memberSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as TeamMemberDoc).sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)));
      setHistory(historySnap.docs
        .map((item) => ({ id: item.id, ...item.data() }) as AssetHistoryDoc)
        .filter((item) => item.assetId === assetId)
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)));
    } catch {
      toast.error("Unable to load asset details");
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => { void load(); }, [load]);

  const assignedMember = useMemo(() => members.find((member) => member.id === asset?.assignedToTeamMemberId), [asset?.assignedToTeamMemberId, members]);

  const assignMember = async (teamMemberId: string) => {
    if (!db || !asset) return;
    const member = members.find((item) => item.id === teamMemberId);
    const assignedToName = member ? `${member.firstName} ${member.lastName}`.trim() : "Unassigned";
    const now = Timestamp.now();
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.USER_ASSETS, asset.id), {
        assignedToTeamMemberId: member?.id || "",
        assignedToName,
        assignedToEmail: member?.emailPrimary || "",
        assignedToUid: member?.firebaseUid || "",
        assignmentMatchStatus: member ? "matched" : "not_applicable",
        assignmentReturnedAt: member ? null : now,
        status: member ? (asset.status === "available" || asset.status === "returned" ? "active" : asset.status) : "available",
        updatedAt: now,
      });
      await addDoc(collection(db, COLLECTIONS.ASSET_HISTORY), {
        assetId: asset.id,
        action: member ? "assigned" : "unassigned",
        teamMemberId: member?.id || "",
        teamMemberName: assignedToName,
        performedByUid: auth?.currentUser?.uid || "",
        performedByName: linkedTeamMember ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}` : profile.email || "Administrator",
        createdAt: now,
      });
      toast.success(member ? `Assigned to ${assignedToName}` : "Asset unassigned");
      await load();
    } catch {
      toast.error("Unable to update asset assignment");
    } finally {
      setSaving(false);
    }
  };

  const analyzeTitle = async () => {
    if (!auth?.currentUser) return toast.error("Please sign in again");
    setAnalyzing(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/admin/assets/${assetId}/suggest-assignment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setSuggestion(data.suggestion);
      setSuggestions(data.candidates || []);
      setProvider(data.provider || "AI");
      if (data.suggestion) toast.success(`Suggested match: ${data.suggestion.memberName}`);
      else toast.info("No credible Team Member name was found in the asset title");
    } catch {
      toast.error("Unable to analyze this asset title");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!asset) return <div className="space-y-4 p-6"><Button asChild variant="ghost"><Link href="/portal/admin/asset-manager"><ArrowLeft className="mr-2 h-4 w-4" />Asset Manager</Link></Button><p>Asset not found.</p></div>;

  return <div className="space-y-6 p-6">
    <Button asChild variant="ghost" className="-ml-3"><Link href="/portal/admin/asset-manager"><ArrowLeft className="mr-2 h-4 w-4" />Asset Manager</Link></Button>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Laptop className="h-6 w-6 text-primary" />{asset.assetName}</h1>
        <p className="text-sm text-muted-foreground">{asset.assetType} · {[asset.manufacturer, asset.model].filter(Boolean).join(" ") || "No manufacturer/model"}</p>
      </div>
      <Badge variant="outline" className="text-base capitalize">{asset.status}</Badge>
    </div>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Asset Details</CardTitle><CardDescription>Identifiers, hardware, cellular, purchase, warranty, and source information.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Asset tag" value={asset.assetTag} />
            <Detail label="Serial number" value={asset.serialNumber} />
            <Detail label="Identifier" value={asset.identifier} />
            <Detail label="Manufacturer" value={asset.manufacturer} />
            <Detail label="Model" value={asset.model} />
            <Detail label="Condition" value={asset.condition} />
            <Detail label="Phone number" value={asset.phoneNumber || asset.rawPhoneNumber} />
            <Detail label="Carrier" value={asset.carrier} />
            <Detail label="Plan" value={asset.plan} />
            <Detail label="IMEI" value={asset.imei} />
            <Detail label="Purchase date" value={asset.purchaseDate} />
            <Detail label="Purchase cost" value={asset.purchaseCost ? `$${asset.purchaseCost.toLocaleString()}` : ""} />
            <Detail label="Warranty expiration" value={asset.warrantyExpiration} />
            <Detail label="Next inspection" value={asset.nextInspectionDate} />
            <Detail label="Ownership" value={asset.ownershipType} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Source and Notes</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Detail label="Source workbook" value={asset.sourceWorkbook} />
            <Detail label="Source sheet" value={asset.sourceSheet} />
            <Detail label="Source row" value={asset.sourceRow} />
            <Detail label="Source label" value={asset.sourceLabel} />
            <div className="rounded-md border p-3 sm:col-span-2"><div className="text-xs text-muted-foreground">Notes</div><div className="mt-1 whitespace-pre-wrap">{asset.notes || "—"}</div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Assignment History</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 && <p className="text-sm text-muted-foreground">No assignment history has been recorded.</p>}
            {history.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div><div className="font-medium capitalize">{item.action || "updated"}</div><div className="text-sm text-muted-foreground">{item.teamMemberName || "Unassigned"} · {item.performedByName || "System"}</div></div>
              <div className="text-sm text-muted-foreground">{displayTimestamp(item.createdAt)}</div>
            </div>)}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" />Assignment</CardTitle><CardDescription>Review the current owner, AI title match, or assign manually.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4">
              <div className="text-xs text-muted-foreground">Currently assigned to</div>
              {assignedMember ? <Link className="mt-1 block font-semibold text-primary hover:underline" href={`/portal/admin/team-members/${assignedMember.id}`}>{assignedMember.firstName} {assignedMember.lastName}</Link> : <div className="mt-1 font-semibold">{asset.assignedToName || "Unassigned"}</div>}
              <div className="mt-1 text-sm text-muted-foreground">{asset.assignedToEmail || "No Team Member selected"}</div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Manual assignment</div>
              <Select value={manualMemberId || "unassigned"} onValueChange={(value) => setManualMemberId(value === "unassigned" ? "" : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.firstName} {member.lastName}</SelectItem>)}</SelectContent>
              </Select>
              <Button className="w-full" disabled={saving || manualMemberId === (asset.assignedToTeamMemberId || "")} onClick={() => void assignMember(manualMemberId)}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}Save Assignment</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />AI Title Match</CardTitle><CardDescription>Analyzes the asset title for a Team Member name and returns a confidence-ranked suggestion.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" variant="outline" disabled={analyzing} onClick={() => void analyzeTitle()}>{analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCheck className="mr-2 h-4 w-4" />}Analyze Asset Title</Button>
            {provider && <p className="text-xs text-muted-foreground">Match provider: {provider}</p>}
            {suggestion && <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-2"><div className="font-semibold">{suggestion.memberName}</div><Badge>{Math.round(suggestion.confidence * 100)}%</Badge></div>
              <div className="mt-1 text-sm text-muted-foreground">{suggestion.email}</div>
              <p className="mt-3 text-sm">{suggestion.rationale}</p>
              <Button className="mt-4 w-full" disabled={saving || asset.assignedToTeamMemberId === suggestion.memberId} onClick={() => void assignMember(suggestion.memberId)}>Assign to {suggestion.memberName}</Button>
            </div>}
            {suggestions.length > 1 && <div className="space-y-2"><div className="text-sm font-medium">Other candidates</div>{suggestions.filter((item) => item.memberId !== suggestion?.memberId).slice(0, 5).map((item) => <div key={item.memberId} className="flex items-center justify-between gap-3 rounded-md border p-3"><div><div className="text-sm font-medium">{item.memberName}</div><div className="text-xs text-muted-foreground">{item.rationale}</div></div><Button size="sm" variant="outline" onClick={() => void assignMember(item.memberId)}>{Math.round(item.confidence * 100)}%</Button></div>)}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Lifecycle</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />Assigned {displayTimestamp(asset.assignedAt)}</div>
            <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" />Created {displayTimestamp(asset.createdAt)}</div>
            <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-muted-foreground" />Updated {displayTimestamp(asset.updatedAt)}</div>
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" />Match status {asset.assignmentMatchStatus || "not reviewed"}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />Returned {displayTimestamp(asset.assignmentReturnedAt)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>;
}
