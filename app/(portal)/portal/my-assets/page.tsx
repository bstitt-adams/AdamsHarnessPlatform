"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  COLLECTIONS,
  type TeamMemberDoc,
  type UserAssetDoc,
} from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
import { useFeatureVisibility } from "@/contexts/feature-visibility-context";
import { isAdminRole } from "@/lib/permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Laptop,
  Smartphone,
  Tablet,
  Truck,
  Wifi,
  Package,
  Plus,
  Pencil,
  Trash2,
  Settings,
  Search,
  Loader2,
  X,
} from "lucide-react";

const DEFAULT_ASSET_TYPES = [
  "laptop",
  "cell phone",
  "ipad",
  "vehicle",
  "hotspot",
];

function getAssetTypeIcon(assetType: string) {
  const lower = assetType.toLowerCase();
  if (lower.includes("laptop") || lower.includes("computer")) return Laptop;
  if (lower.includes("phone") || lower.includes("mobile")) return Smartphone;
  if (lower.includes("ipad") || lower.includes("tablet")) return Tablet;
  if (lower.includes("vehicle") || lower.includes("truck") || lower.includes("van")) return Truck;
  if (lower.includes("hotspot") || lower.includes("wifi")) return Wifi;
  return Package;
}

export default function MyAssetsPage() {
  const {
    linkedTeamMember,
    actualTeamMember,
    profile,
    isMasqueradingUser,
  } = useUserProfile();
  const { effectiveRole } = useFeatureVisibility();

  // Check if the logged-in user is an admin (unless previewing a non-admin role)
  const actualRole = actualTeamMember?.role || linkedTeamMember?.role || "team";
  const isAdmin = isAdminRole(actualRole) && isAdminRole(effectiveRole);

  const [assets, setAssets] = useState<UserAssetDoc[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberDoc[]>([]);
  const [assetTypes, setAssetTypes] = useState<string[]>(DEFAULT_ASSET_TYPES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAllUsersForAdmin, setShowAllUsersForAdmin] = useState(false);

  // Assign / Edit Asset Dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<UserAssetDoc | null>(null);
  const [savingAsset, setSavingAsset] = useState(false);
  const [assetForm, setAssetForm] = useState({
    assignedToTeamMemberId: "",
    assetType: "laptop",
    assetName: "",
    identifier: "",
    status: "active" as UserAssetDoc["status"],
    notes: "",
  });

  // Manage Asset Types Dialog
  const [typesOpen, setTypesOpen] = useState(false);
  const [newAssetType, setNewAssetType] = useState("");
  const [savingTypes, setSavingTypes] = useState(false);

  const loadData = useCallback(async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [assetsSnap, membersSnap, typesSnap] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.USER_ASSETS)),
        getDocs(collection(db, COLLECTIONS.TEAM_MEMBERS)),
        getDoc(doc(db, COLLECTIONS.PLATFORM_SETTINGS, "asset-types")),
      ]);

      const loadedAssets: UserAssetDoc[] = [];
      assetsSnap.forEach((docSnap) => {
        loadedAssets.push({ id: docSnap.id, ...docSnap.data() } as UserAssetDoc);
      });
      setAssets(loadedAssets);

      const loadedMembers: TeamMemberDoc[] = [];
      membersSnap.forEach((docSnap) => {
        loadedMembers.push({ id: docSnap.id, ...docSnap.data() } as TeamMemberDoc);
      });
      loadedMembers.sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      );
      setTeamMembers(loadedMembers);

      if (typesSnap.exists()) {
        const storedTypes = typesSnap.data()?.items;
        if (Array.isArray(storedTypes) && storedTypes.length > 0) {
          setAssetTypes(storedTypes);
        }
      }
    } catch (err) {
      console.error("Failed to load assets:", err);
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Filter assets to the currently viewed / signed-in user unless admin toggles "All Company Assets"
  const currentTeamMemberId = linkedTeamMember?.id || "";
  const currentEmail = (linkedTeamMember?.emailPrimary || profile.email || "").toLowerCase();
  const currentUid = linkedTeamMember?.firebaseUid || auth?.currentUser?.uid || "";

  const scopedAssets = useMemo(() => {
    const base =
      isAdmin && showAllUsersForAdmin
        ? assets
        : assets.filter((a) => {
            if (currentTeamMemberId && a.assignedToTeamMemberId === currentTeamMemberId) {
              return true;
            }
            if (currentEmail && (a.assignedToEmail || "").toLowerCase() === currentEmail) {
              return true;
            }
            if (currentUid && a.assignedToUid && a.assignedToUid === currentUid) {
              return true;
            }
            return false;
          });

    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (a) =>
        a.assetType.toLowerCase().includes(q) ||
        a.assetName.toLowerCase().includes(q) ||
        a.identifier.toLowerCase().includes(q) ||
        a.assignedToName.toLowerCase().includes(q) ||
        (a.notes || "").toLowerCase().includes(q)
    );
  }, [
    assets,
    isAdmin,
    showAllUsersForAdmin,
    currentTeamMemberId,
    currentEmail,
    currentUid,
    search,
  ]);

  const handleOpenAssign = () => {
    setEditingAsset(null);
    setAssetForm({
      assignedToTeamMemberId: linkedTeamMember?.id || teamMembers[0]?.id || "",
      assetType: assetTypes[0] || "laptop",
      assetName: "",
      identifier: "",
      status: "active",
      notes: "",
    });
    setAssignOpen(true);
  };

  const handleOpenEdit = (asset: UserAssetDoc) => {
    setEditingAsset(asset);
    setAssetForm({
      assignedToTeamMemberId: asset.assignedToTeamMemberId,
      assetType: asset.assetType,
      assetName: asset.assetName,
      identifier: asset.identifier,
      status: asset.status,
      notes: asset.notes || "",
    });
    setAssignOpen(true);
  };

  const handleSaveAsset = async () => {
    if (!db) return;
    if (!assetForm.assignedToTeamMemberId || !assetForm.assetName.trim()) {
      toast.error("Select a user and enter an asset name/model");
      return;
    }
    const targetMember = teamMembers.find(
      (m) => m.id === assetForm.assignedToTeamMemberId
    );
    if (!targetMember) {
      toast.error("Selected team member not found");
      return;
    }

    setSavingAsset(true);
    try {
      const payload = {
        assignedToTeamMemberId: targetMember.id,
        assignedToName: `${targetMember.firstName} ${targetMember.lastName}`.trim(),
        assignedToEmail: targetMember.emailPrimary || "",
        assignedToUid: targetMember.firebaseUid || "",
        assetType: assetForm.assetType,
        assetName: assetForm.assetName.trim(),
        identifier: assetForm.identifier.trim(),
        status: assetForm.status,
        notes: assetForm.notes.trim(),
        assignedByUid: auth?.currentUser?.uid || "",
        assignedByName: actualTeamMember
          ? `${actualTeamMember.firstName} ${actualTeamMember.lastName}`
          : profile.email || "Admin",
        updatedAt: Timestamp.now(),
      };

      if (editingAsset) {
        await updateDoc(doc(db, COLLECTIONS.USER_ASSETS, editingAsset.id), payload);
        toast.success("Asset assignment updated");
      } else {
        await addDoc(collection(db, COLLECTIONS.USER_ASSETS), {
          ...payload,
          assignedAt: Timestamp.now(),
        });
        toast.success(`Assigned ${assetForm.assetType} to ${payload.assignedToName}`);
      }
      setAssignOpen(false);
      await loadData();
    } catch (err) {
      console.error("Failed to save asset:", err);
      toast.error("Failed to save asset assignment");
    } finally {
      setSavingAsset(false);
    }
  };

  const handleDeleteAsset = async (asset: UserAssetDoc) => {
    if (!db) return;
    if (!confirm(`Remove "${asset.assetName}" assigned to ${asset.assignedToName}?`)) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.USER_ASSETS, asset.id));
      toast.success("Asset removed");
      await loadData();
    } catch {
      toast.error("Failed to remove asset");
    }
  };

  const handleSaveAssetTypes = async (nextTypes: string[]) => {
    if (!db) return;
    setSavingTypes(true);
    try {
      await setDoc(
        doc(db, COLLECTIONS.PLATFORM_SETTINGS, "asset-types"),
        {
          id: "asset-types",
          items: nextTypes,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      setAssetTypes(nextTypes);
      toast.success("Tracked asset types updated");
    } catch {
      toast.error("Failed to update tracked asset types");
    } finally {
      setSavingTypes(false);
    }
  };

  const handleAddAssetType = async () => {
    const clean = newAssetType.trim().toLowerCase();
    if (!clean) return;
    if (assetTypes.some((t) => t.toLowerCase() === clean)) {
      toast.error("That asset type already exists");
      return;
    }
    const next = [...assetTypes, clean];
    setNewAssetType("");
    await handleSaveAssetTypes(next);
  };

  const handleRemoveAssetType = async (typeToRemove: string) => {
    const next = assetTypes.filter((t) => t !== typeToRemove);
    await handleSaveAssetTypes(next);
  };

  const viewedName = linkedTeamMember
    ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}`
    : profile.firstName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.email || "Current User";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>My Mission Critical</span>
            <span>/</span>
            <span>My Assets</span>
            {isMasqueradingUser && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                Viewing as {viewedName}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Laptop className="h-6 w-6 text-primary" />
            My Assets
          </h1>
          <p className="text-sm text-muted-foreground">
            Equipment, vehicles, and devices assigned to {viewedName}.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={showAllUsersForAdmin ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllUsersForAdmin((v) => !v)}
            >
              {showAllUsersForAdmin ? "Showing All Users" : "Showing My Assets Only"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTypesOpen(true)}>
              <Settings className="mr-1.5 h-4 w-4" />
              Manage Tracked Asset Types
            </Button>
            <Button size="sm" onClick={handleOpenAssign}>
              <Plus className="mr-1.5 h-4 w-4" />
              Assign Asset to User
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards by Tracked Asset Type */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {assetTypes.map((type) => {
          const Icon = getAssetTypeIcon(type);
          const count = scopedAssets.filter(
            (a) => a.assetType.toLowerCase() === type.toLowerCase() && a.status === "active"
          ).length;
          return (
            <Card key={type}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground capitalize">
                  {type}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">Active assigned</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>
                {showAllUsersForAdmin
                  ? `All Assigned Company Assets (${scopedAssets.length})`
                  : `Assets Assigned to ${viewedName} (${scopedAssets.length})`}
              </CardTitle>
              <CardDescription>
                Tracked laptops, cell phones, iPads, vehicles, hotspots, and custom equipment.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assets, serial #, vehicle..."
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : scopedAssets.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No assets currently assigned to {viewedName}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset / Model</TableHead>
                    <TableHead>Serial / Phone / VIN / Tag</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedAssets.map((asset) => {
                    const Icon = getAssetTypeIcon(asset.assetType);
                    return (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 capitalize font-medium">
                            <Icon className="h-4 w-4 text-primary" />
                            {asset.assetType}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{asset.assetName}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {asset.identifier || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{asset.assignedToName}</div>
                          <div className="text-xs text-muted-foreground">
                            {asset.assignedToEmail}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={asset.status === "active" ? "default" : "secondary"}
                            className="capitalize"
                          >
                            {asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {asset.notes || "—"}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(asset)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleDeleteAsset(asset)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Dialog: Assign or Edit Asset */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? "Edit Assigned Asset" : "Assign Asset to Team Member"}
            </DialogTitle>
            <DialogDescription>
              Assign a laptop, cell phone, iPad, vehicle, hotspot, or custom tracked item to a user.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="space-y-1.5">
              <Label>Assign to User *</Label>
              <Select
                value={assetForm.assignedToTeamMemberId}
                onValueChange={(v) =>
                  setAssetForm({ ...assetForm, assignedToTeamMemberId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.emailPrimary})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Asset Type *</Label>
                <Select
                  value={assetForm.assetType}
                  onValueChange={(v) => setAssetForm({ ...assetForm, assetType: v })}
                >
                  <SelectTrigger className="capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypes.map((type) => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={assetForm.status}
                  onValueChange={(v) =>
                    setAssetForm({
                      ...assetForm,
                      status: v as UserAssetDoc["status"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Asset Name / Model / Description *</Label>
              <Input
                value={assetForm.assetName}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, assetName: e.target.value })
                }
                placeholder="e.g. Dell Latitude 5540 / iPhone 16 Pro / Ford F-250 #42"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Serial Number / Phone Number / VIN / Asset Tag</Label>
              <Input
                value={assetForm.identifier}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, identifier: e.target.value })
                }
                placeholder="e.g. SN-98412A / (704) 555-0192 / Plate NC-8821"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={assetForm.notes}
                onChange={(e) =>
                  setAssetForm({ ...assetForm, notes: e.target.value })
                }
                placeholder="Condition, accessories, carrier, or return date..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveAsset()} disabled={savingAsset}>
              {savingAsset ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingAsset ? "Update Asset" : "Assign Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Dialog: Modify Tracked Asset Types */}
      <Dialog open={typesOpen} onOpenChange={setTypesOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Manage Tracked Asset Types</DialogTitle>
            <DialogDescription>
              Add or remove categories of equipment and assets tracked across Adams Electric.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                value={newAssetType}
                onChange={(e) => setNewAssetType(e.target.value)}
                placeholder="Add new asset type (e.g. two-way radio, tool kit)..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAddAssetType();
                }}
              />
              <Button
                onClick={() => void handleAddAssetType()}
                disabled={savingTypes || !newAssetType.trim()}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {assetTypes.map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="px-3 py-1 text-xs capitalize flex items-center gap-1.5"
                >
                  {type}
                  <button
                    type="button"
                    onClick={() => void handleRemoveAssetType(type)}
                    className="hover:text-destructive"
                    aria-label={`Remove ${type}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTypesOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
