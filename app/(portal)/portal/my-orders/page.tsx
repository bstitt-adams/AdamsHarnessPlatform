"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COLLECTIONS, type UserOrderDoc } from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Plus, Search, Loader2 } from "lucide-react";

export default function MyOrdersPage() {
  const { linkedTeamMember, profile, isMasqueradingUser } = useUserProfile();
  const [orders, setOrders] = useState<UserOrderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    orderNumber: "",
    itemSummary: "",
    jobsite: "",
    vendor: "",
    quantity: "1",
    expectedDeliveryDate: "",
    notes: "",
  });

  const viewedName = linkedTeamMember
    ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}`.trim()
    : profile.firstName
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : profile.email || "Current User";

  const currentMemberId = linkedTeamMember?.id || "";
  const currentEmail = (linkedTeamMember?.emailPrimary || profile.email || "").toLowerCase();
  const currentUid = linkedTeamMember?.firebaseUid || auth?.currentUser?.uid || "";

  const loadOrders = useCallback(async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.USER_ORDERS));
      const all: UserOrderDoc[] = [];
      snap.forEach((d) => {
        all.push({ id: d.id, ...d.data() } as UserOrderDoc);
      });

      const mine = all.filter((o) => {
        if (currentMemberId && o.requesterTeamMemberId === currentMemberId) return true;
        if (currentEmail && (o.requesterEmail || "").toLowerCase() === currentEmail) return true;
        if (currentUid && o.requesterUid && o.requesterUid === currentUid) return true;
        return false;
      });
      setOrders(mine);
    } catch (err) {
      console.error("Failed to load user orders:", err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [currentMemberId, currentEmail, currentUid]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleCreateOrder = async () => {
    if (!db || !formData.itemSummary.trim() || !formData.jobsite.trim()) {
      toast.error("Please enter the material/item summary and jobsite");
      return;
    }
    setSaving(true);
    try {
      const poNumber =
        formData.orderNumber.trim() ||
        `PO-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

      await addDoc(collection(db, COLLECTIONS.USER_ORDERS), {
        requesterTeamMemberId: currentMemberId || currentUid,
        requesterName: viewedName,
        requesterEmail: currentEmail,
        requesterUid: currentUid,
        orderNumber: poNumber,
        itemSummary: formData.itemSummary.trim(),
        jobsite: formData.jobsite.trim(),
        vendor: formData.vendor.trim(),
        quantity: Math.max(1, Number(formData.quantity) || 1),
        status: "requested",
        expectedDeliveryDate: formData.expectedDeliveryDate || "",
        notes: formData.notes.trim(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      toast.success(`Submitted order ${poNumber}`);
      setFormData({
        orderNumber: "",
        itemSummary: "",
        jobsite: "",
        vendor: "",
        quantity: "1",
        expectedDeliveryDate: "",
        notes: "",
      });
      setDialogOpen(false);
      await loadOrders();
    } catch {
      toast.error("Failed to submit order");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.itemSummary.toLowerCase().includes(q) ||
        o.jobsite.toLowerCase().includes(q) ||
        (o.vendor || "").toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q)
    );
  }, [orders, search]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>My Mission Critical</span>
            <span>/</span>
            <span>My Orders</span>
            {isMasqueradingUser && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                Viewing as {viewedName}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            My Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Material and equipment orders requested by {viewedName}.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Request Material / Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>New Material / Equipment Order</DialogTitle>
              <DialogDescription>
                Submit a material or tool order tracked under {viewedName}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Material / Item Summary *</Label>
                <Input
                  value={formData.itemSummary}
                  onChange={(e) =>
                    setFormData({ ...formData, itemSummary: e.target.value })
                  }
                  placeholder="e.g. 500ft 3/4 EMT Conduit & Fittings"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Jobsite / Project *</Label>
                  <Input
                    value={formData.jobsite}
                    onChange={(e) =>
                      setFormData({ ...formData, jobsite: e.target.value })
                    }
                    placeholder="Charlotte Data Center"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>PO / Order # (optional)</Label>
                  <Input
                    value={formData.orderNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, orderNumber: e.target.value })
                    }
                    placeholder="Auto-generated if blank"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Supplier / Vendor</Label>
                  <Input
                    value={formData.vendor}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor: e.target.value })
                    }
                    placeholder="Graybar / Mayer Electric"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Needed By Date</Label>
                <Input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expectedDeliveryDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleCreateOrder()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Orders for {viewedName} ({filtered.length})</CardTitle>
            <CardDescription>
              Real-time status of your material and equipment requests.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search my orders..."
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No orders found for {viewedName}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Material / Item</TableHead>
                  <TableHead>Jobsite</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Needed By</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ord) => (
                  <TableRow key={ord.id}>
                    <TableCell className="font-mono text-xs">
                      {ord.orderNumber}
                    </TableCell>
                    <TableCell className="font-medium">{ord.itemSummary}</TableCell>
                    <TableCell>{ord.jobsite}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ord.vendor || "—"}
                    </TableCell>
                    <TableCell>{ord.quantity}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ord.expectedDeliveryDate || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {ord.status}
                      </Badge>
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
