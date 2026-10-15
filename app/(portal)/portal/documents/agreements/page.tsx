"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileSignature,
  Plus,
  Search,
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Send,
  History,
  ArrowLeft,
  Upload,
  Calendar,
  User,
  Building,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Agreement {
  id: string;
  name: string;
  type: "msa" | "nda" | "consulting" | "partnership" | "sow" | "amendment" | "other";
  company: string;
  contact: string;
  status: "draft" | "pending_signature" | "signed" | "expired" | "terminated";
  version: number;
  createdDate: string;
  effectiveDate?: string;
  expirationDate?: string;
  signedDate?: string;
  signedBy?: string;
  notes?: string;
  documentUrl?: string;
}

const agreementTypes = [
  { value: "msa", label: "Master Service Agreement" },
  { value: "nda", label: "Non-Disclosure Agreement" },
  { value: "consulting", label: "Consulting Agreement" },
  { value: "partnership", label: "Partnership Agreement" },
  { value: "sow", label: "Statement of Work" },
  { value: "amendment", label: "Amendment" },
  { value: "other", label: "Other" },
];

const initialAgreements: Agreement[] = [
  {
    id: "1",
    name: "ABC Manufacturing - Master Service Agreement",
    type: "msa",
    company: "ABC Manufacturing",
    contact: "John Harrison",
    status: "signed",
    version: 1,
    createdDate: "2024-11-15",
    effectiveDate: "2024-12-01",
    expirationDate: "2025-11-30",
    signedDate: "2024-11-28",
    signedBy: "John Harrison (ABC), Brian Stitt (Adams)",
    notes: "Annual renewal clause included",
  },
  {
    id: "2",
    name: "XYZ Industries - NDA",
    type: "nda",
    company: "XYZ Industries",
    contact: "Sarah Chen",
    status: "signed",
    version: 2,
    createdDate: "2024-10-01",
    effectiveDate: "2024-10-15",
    expirationDate: "2026-10-15",
    signedDate: "2024-10-12",
    signedBy: "Sarah Chen (XYZ), Brian Stitt (Adams)",
    notes: "Revised to include technical specifications",
  },
  {
    id: "3",
    name: "Precision Parts - Consulting Agreement",
    type: "consulting",
    company: "Precision Parts Co.",
    contact: "Mike Roberts",
    status: "pending_signature",
    version: 3,
    createdDate: "2024-12-01",
    effectiveDate: "2025-01-01",
    notes: "Awaiting signature from client",
  },
  {
    id: "4",
    name: "Global Motors - Statement of Work",
    type: "sow",
    company: "Global Motors Inc.",
    contact: "Lisa Thompson",
    status: "draft",
    version: 1,
    createdDate: "2025-01-05",
    notes: "Phase 1: Supplier qualification assessment",
  },
  {
    id: "5",
    name: "TechParts LLC - NDA",
    type: "nda",
    company: "TechParts LLC",
    contact: "David Kim",
    status: "expired",
    version: 1,
    createdDate: "2023-01-15",
    effectiveDate: "2023-02-01",
    expirationDate: "2024-02-01",
    signedDate: "2023-01-28",
    signedBy: "David Kim (TechParts), Brian Stitt (Adams)",
    notes: "Needs renewal",
  },
];

type AgreementForm = Omit<Agreement, "id">;

const emptyAgreement: AgreementForm = {
  name: "",
  type: "msa",
  company: "",
  contact: "",
  status: "draft",
  version: 1,
  createdDate: new Date().toISOString().split("T")[0],
  notes: "",
};

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>(initialAgreements);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agreement | null>(null);
  const [formData, setFormData] = useState<AgreementForm>(emptyAgreement);

  const filteredAgreements = agreements.filter((agreement) => {
    const matchesSearch =
      agreement.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agreement.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agreement.contact.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || agreement.type === filterType;
    const matchesStatus = filterStatus === "all" || agreement.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: Agreement["status"]) => {
    switch (status) {
      case "signed":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Signed</Badge>;
      case "pending_signature":
        return <Badge className="bg-sky-100 text-sky-700"><Clock className="h-3 w-3 mr-1" />Pending Signature</Badge>;
      case "draft":
        return <Badge className="bg-blue-100 text-blue-700"><Edit className="h-3 w-3 mr-1" />Draft</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case "terminated":
        return <Badge className="bg-gray-100 text-gray-700"><XCircle className="h-3 w-3 mr-1" />Terminated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: Agreement["type"]) => {
    const typeConfig = agreementTypes.find((t) => t.value === type);
    return <Badge variant="outline">{typeConfig?.label || type}</Badge>;
  };

  const openAddForm = () => {
    setEditingAgreement(null);
    setFormData(emptyAgreement);
    setShowForm(true);
  };

  const openEditForm = (agreement: Agreement) => {
    setEditingAgreement(agreement);
    setFormData({
      name: agreement.name,
      type: agreement.type,
      company: agreement.company,
      contact: agreement.contact,
      status: agreement.status,
      version: agreement.version,
      createdDate: agreement.createdDate,
      effectiveDate: agreement.effectiveDate,
      expirationDate: agreement.expirationDate,
      signedDate: agreement.signedDate,
      signedBy: agreement.signedBy,
      notes: agreement.notes,
      documentUrl: agreement.documentUrl,
    });
    setShowForm(true);
  };

  const saveAgreement = () => {
    if (!formData.name || !formData.company) return;

    if (editingAgreement) {
      setAgreements((prev) =>
        prev.map((a) =>
          a.id === editingAgreement.id ? { ...a, ...formData } : a
        )
      );
    } else {
      const newAgreement: Agreement = {
        id: `agreement-${Date.now()}`,
        ...formData,
      };
      setAgreements((prev) => [newAgreement, ...prev]);
    }
    setShowForm(false);
    setFormData(emptyAgreement);
  };

  const confirmDelete = (agreement: Agreement) => {
    setDeleteTarget(agreement);
    setShowDeleteConfirm(true);
  };

  const executeDelete = () => {
    if (deleteTarget) {
      setAgreements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  const createRevision = (agreement: Agreement) => {
    const newRevision: Agreement = {
      ...agreement,
      id: `agreement-${Date.now()}`,
      version: agreement.version + 1,
      status: "draft",
      createdDate: new Date().toISOString().split("T")[0],
      signedDate: undefined,
      signedBy: undefined,
      notes: `Revision of v${agreement.version}. ${agreement.notes || ""}`,
    };
    setAgreements((prev) => [newRevision, ...prev]);
  };

  const stats = {
    total: agreements.length,
    signed: agreements.filter((a) => a.status === "signed").length,
    pending: agreements.filter((a) => a.status === "pending_signature").length,
    expired: agreements.filter((a) => a.status === "expired").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/portal/documents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileSignature className="h-8 w-8" />
              Agreements
            </h1>
            <p className="text-muted-foreground">
              Track and manage all agreements, revisions, and signatures
            </p>
          </div>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="mr-2 h-4 w-4" />
          New Agreement
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Agreements</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Signed</p>
                <p className="text-2xl font-bold text-green-600">{stats.signed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Signature</p>
                <p className="text-2xl font-bold text-sky-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-sky-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search agreements..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {agreementTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_signature">Pending Signature</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agreements Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agreement</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgreements.map((agreement) => (
                <TableRow key={agreement.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <FileSignature className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{agreement.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {agreement.contact}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {agreement.company}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(agreement.type)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">v{agreement.version}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(agreement.status)}</TableCell>
                  <TableCell>
                    {agreement.effectiveDate ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(agreement.effectiveDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {agreement.expirationDate ? (
                      <span
                        className={cn(
                          "flex items-center gap-1 text-sm",
                          new Date(agreement.expirationDate) < new Date() &&
                            "text-red-600 font-medium"
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        {new Date(agreement.expirationDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditForm(agreement)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Document
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => createRevision(agreement)}>
                          <History className="mr-2 h-4 w-4" />
                          Create Revision
                        </DropdownMenuItem>
                        {agreement.status === "draft" && (
                          <DropdownMenuItem>
                            <Send className="mr-2 h-4 w-4" />
                            Send for Signature
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => confirmDelete(agreement)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Agreement Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAgreement ? "Edit Agreement" : "New Agreement"}
            </DialogTitle>
            <DialogDescription>
              {editingAgreement
                ? "Update the agreement details"
                : "Add a new agreement to track"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Agreement Name *</Label>
                <Input
                  placeholder="e.g., ABC Manufacturing - MSA"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, type: v as Agreement["type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agreementTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company *</Label>
                <Input
                  placeholder="Company name"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  placeholder="Primary contact"
                  value={formData.contact}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData({ ...formData, status: v as Agreement["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_signature">Pending Signature</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.version}
                  onChange={(e) =>
                    setFormData({ ...formData, version: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Created Date</Label>
                <Input
                  type="date"
                  value={formData.createdDate}
                  onChange={(e) =>
                    setFormData({ ...formData, createdDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={formData.effectiveDate || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, effectiveDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <Input
                  type="date"
                  value={formData.expirationDate || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, expirationDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Signed Date</Label>
                <Input
                  type="date"
                  value={formData.signedDate || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, signedDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Signed By</Label>
              <Input
                placeholder="e.g., John Doe (Company), Brian Stitt (Adams)"
                value={formData.signedBy || ""}
                onChange={(e) =>
                  setFormData({ ...formData, signedBy: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes about this agreement..."
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={saveAgreement} disabled={!formData.name || !formData.company}>
              {editingAgreement ? "Update Agreement" : "Create Agreement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agreement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
