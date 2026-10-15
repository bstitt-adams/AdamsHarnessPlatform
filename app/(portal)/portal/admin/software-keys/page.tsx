"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Key,
  Plus,
  Copy,
  MoreHorizontal,
  Trash2,
  Ban,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Search,
  RefreshCw,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS, type SoftwareKeyDoc, type ToolType } from "@/lib/schema";
import { 
  createSoftwareKey, 
  TOOL_DEFINITIONS,
  updateKeyStatus,
  deleteSoftwareKey,
} from "@/lib/software-keys";
import { toast } from "sonner";

const ALL_TOOLS: ToolType[] = Object.keys(TOOL_DEFINITIONS) as ToolType[];

export default function SoftwareKeysPage() {
  const [keys, setKeys] = useState<SoftwareKeyDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tools: [] as ToolType[],
    expiresAt: "",
    maxActivations: "",
    assignedToName: "",
    assignedToEmail: "",
    assignmentType: "user" as "user" | "organization" | "affiliate",
    notes: "",
  });

  // Fetch keys on mount
  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const keysRef = collection(db, COLLECTIONS.SOFTWARE_KEYS);
      const snapshot = await getDocs(keysRef);
      const keysList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SoftwareKeyDoc[];
      setKeys(keysList);
    } catch (error) {
      console.error("Error fetching keys:", error);
      toast.error("Failed to load software keys");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    if (formData.tools.length === 0) {
      toast.error("Please select at least one tool");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createSoftwareKey({
        name: formData.name,
        description: formData.description,
        tools: formData.tools,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined,
        maxActivations: formData.maxActivations ? parseInt(formData.maxActivations) : undefined,
        assignedToName: formData.assignedToName || undefined,
        assignedToEmail: formData.assignedToEmail || undefined,
        assignmentType: formData.assignmentType,
        createdBy: "admin", // TODO: Get from auth context
        notes: formData.notes || undefined,
      });

      if (result.success && result.key) {
        toast.success("Software key created successfully");
        setKeys(prev => [result.key!, ...prev]);
        setIsCreateDialogOpen(false);
        resetForm();
      } else {
        toast.error(result.error || "Failed to create key");
      }
    } catch (error) {
      console.error("Error creating key:", error);
      toast.error("Failed to create software key");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      tools: [],
      expiresAt: "",
      maxActivations: "",
      assignedToName: "",
      assignedToEmail: "",
      assignmentType: "user",
      notes: "",
    });
  };

  const handleToolToggle = (tool: ToolType) => {
    setFormData(prev => {
      if (tool === 'all-tools') {
        // If selecting all-tools, clear others and just use all-tools
        return { ...prev, tools: prev.tools.includes('all-tools') ? [] : ['all-tools'] };
      }
      // Remove all-tools if selecting individual tools
      const filtered = prev.tools.filter(t => t !== 'all-tools');
      if (filtered.includes(tool)) {
        return { ...prev, tools: filtered.filter(t => t !== tool) };
      }
      return { ...prev, tools: [...filtered, tool] };
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Key copied to clipboard");
  };

  const handleStatusChange = async (keyId: string, newStatus: SoftwareKeyDoc['status']) => {
    const success = await updateKeyStatus(keyId, newStatus);
    if (success) {
      setKeys(prev => prev.map(k => 
        k.id === keyId ? { ...k, status: newStatus, updatedAt: Timestamp.now() } : k
      ));
      toast.success(`Key status updated to ${newStatus}`);
    } else {
      toast.error("Failed to update key status");
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this key? This action cannot be undone.")) {
      return;
    }
    
    const success = await deleteSoftwareKey(keyId);
    if (success) {
      setKeys(prev => prev.filter(k => k.id !== keyId));
      toast.success("Key deleted successfully");
    } else {
      toast.error("Failed to delete key");
    }
  };

  const getStatusBadge = (status: SoftwareKeyDoc['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Inactive</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-orange-600"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'revoked':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter keys
  const filteredKeys = keys.filter(key => {
    const matchesSearch = 
      key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (key.assignedToName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (key.assignedToEmail?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || key.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: keys.length,
    active: keys.filter(k => k.status === 'active').length,
    expired: keys.filter(k => k.status === 'expired').length,
    revoked: keys.filter(k => k.status === 'revoked').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Key className="h-8 w-8" />
            Software Keys
          </h1>
          <p className="text-muted-foreground">Generate and manage license keys for tool access</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate New Software Key</DialogTitle>
              <DialogDescription>
                Create a new license key to enable tool access
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Key Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Key Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Acme Corp - Enterprise License"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional description..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Tool Selection */}
              <div className="space-y-2">
                <Label>Tools to Enable *</Label>
                <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg max-h-60 overflow-y-auto">
                  {ALL_TOOLS.map(tool => (
                    <div key={tool} className="flex items-center space-x-2">
                      <Checkbox
                        id={tool}
                        checked={formData.tools.includes(tool) || (tool !== 'all-tools' && formData.tools.includes('all-tools'))}
                        disabled={tool !== 'all-tools' && formData.tools.includes('all-tools')}
                        onCheckedChange={() => handleToolToggle(tool)}
                      />
                      <Label 
                        htmlFor={tool} 
                        className={`text-sm cursor-pointer ${tool === 'all-tools' ? 'font-semibold' : ''}`}
                      >
                        {TOOL_DEFINITIONS[tool].name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignment */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assignedToName">Assigned To (Name)</Label>
                  <Input
                    id="assignedToName"
                    placeholder="e.g., John Smith"
                    value={formData.assignedToName}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignedToName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedToEmail">Assigned To (Email)</Label>
                  <Input
                    id="assignedToEmail"
                    type="email"
                    placeholder="e.g., john@example.com"
                    value={formData.assignedToEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignedToEmail: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignmentType">Assignment Type</Label>
                <Select 
                  value={formData.assignmentType} 
                  onValueChange={(value: "user" | "organization" | "affiliate") => 
                    setFormData(prev => ({ ...prev, assignmentType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Individual User</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="affiliate">Affiliate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Limits */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expiration Date</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxActivations">Max Activations</Label>
                  <Input
                    id="maxActivations"
                    type="number"
                    placeholder="Unlimited"
                    value={formData.maxActivations}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxActivations: e.target.value }))}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Internal notes (not visible to key holder)..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateKey} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Key className="mr-2 h-4 w-4" />
                )}
                Generate Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revoked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.revoked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, key, or assignee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchKeys}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>License Keys</CardTitle>
          <CardDescription>
            {filteredKeys.length} key{filteredKeys.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No software keys found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate Your First Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Tools</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {key.key}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(key.key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{key.name}</p>
                        {key.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-48">
                            {key.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.tools.includes('all-tools') ? (
                          <Badge variant="secondary">All Tools</Badge>
                        ) : (
                          key.tools.slice(0, 2).map(tool => (
                            <Badge key={tool} variant="outline" className="text-xs">
                              {TOOL_DEFINITIONS[tool]?.name || tool}
                            </Badge>
                          ))
                        )}
                        {key.tools.length > 2 && !key.tools.includes('all-tools') && (
                          <Badge variant="outline" className="text-xs">
                            +{key.tools.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.assignedToName || key.assignedToEmail ? (
                        <div>
                          <p className="text-sm">{key.assignedToName}</p>
                          {key.assignedToEmail && (
                            <p className="text-xs text-muted-foreground">{key.assignedToEmail}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(key.status)}</TableCell>
                    <TableCell>
                      {key.expiresAt ? (
                        <span className="text-sm">
                          {key.expiresAt.toDate().toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => copyToClipboard(key.key)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Key
                          </DropdownMenuItem>
                          {key.status !== 'active' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(key.id, 'active')}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {key.status === 'active' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(key.id, 'inactive')}>
                              <Clock className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          {key.status !== 'revoked' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(key.id, 'revoked')}
                              className="text-orange-600"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Revoke
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteKey(key.id)}
                            className="text-destructive"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
