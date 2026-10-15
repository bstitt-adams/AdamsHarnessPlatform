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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Layers,
  Plus,
  MoreHorizontal,
  Trash2,
  Settings,
  Globe,
  Key,
  Users,
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
  Pause,
  Loader2,
  Search,
  RefreshCw,
  ExternalLink,
  Building2,
  Copy,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { 
  COLLECTIONS, 
  type WhiteLabelDeploymentDoc, 
  type DeploymentStatus,
  type LicenseType,
  type ToolType,
} from "@/lib/schema";
import { TOOL_DEFINITIONS } from "@/lib/software-keys";
import { toast } from "sonner";

const ALL_TOOLS: ToolType[] = Object.keys(TOOL_DEFINITIONS) as ToolType[];

const LICENSE_TYPES: { value: LicenseType; label: string; description: string }[] = [
  { value: 'trial', label: 'Trial', description: '14-day free trial' },
  { value: 'starter', label: 'Starter', description: 'Up to 5 users' },
  { value: 'professional', label: 'Professional', description: 'Up to 25 users' },
  { value: 'enterprise', label: 'Enterprise', description: 'Unlimited users' },
];

export default function WhiteLabelDeploymentsPage() {
  const [deployments, setDeployments] = useState<WhiteLabelDeploymentDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    companyName: "",
    shortName: "",
    initials: "",
    tagline: "",
    primaryColor: "#0066CC",
    secondaryColor: "#FF6600",
    primaryDomain: "",
    licenseType: "trial" as LicenseType,
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    ownerCompany: "",
    enabledTools: [] as ToolType[],
    notes: "",
  });

  useEffect(() => {
    fetchDeployments();
  }, []);

  const fetchDeployments = async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const deploymentsRef = collection(db, COLLECTIONS.WHITE_LABEL_DEPLOYMENTS);
      const snapshot = await getDocs(deploymentsRef);
      const deploymentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WhiteLabelDeploymentDoc[];
      setDeployments(deploymentsList);
    } catch (error) {
      console.error("Error fetching deployments:", error);
      toast.error("Failed to load deployments");
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleCreateDeployment = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a deployment name");
      return;
    }
    if (!formData.primaryDomain.trim()) {
      toast.error("Please enter a primary domain");
      return;
    }
    if (!formData.ownerEmail.trim()) {
      toast.error("Please enter owner email");
      return;
    }

    setIsCreating(true);
    try {
      const deploymentData: Omit<WhiteLabelDeploymentDoc, 'id'> = {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        status: 'pending',
        branding: {
          companyName: formData.companyName || formData.name,
          shortName: formData.shortName || formData.name.split(' ')[0],
          initials: formData.initials || formData.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3),
          tagline: formData.tagline,
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
        },
        domains: {
          primary: formData.primaryDomain,
          sslEnabled: true,
        },
        infrastructure: {
          provider: 'vercel',
        },
        license: {
          type: formData.licenseType,
          startDate: Timestamp.now(),
          endDate: formData.licenseType === 'trial' 
            ? Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
            : undefined,
          softwareKeys: [],
        },
        features: {
          enabledTools: formData.enabledTools.length > 0 ? formData.enabledTools : ['all-tools'],
        },
        owner: {
          name: formData.ownerName,
          email: formData.ownerEmail,
          phone: formData.ownerPhone,
          company: formData.ownerCompany,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        notes: formData.notes,
      };

      if (!db) throw new Error("Database not initialized");
      const docRef = await addDoc(collection(db, COLLECTIONS.WHITE_LABEL_DEPLOYMENTS), deploymentData);
      
      toast.success("Deployment created successfully");
      setDeployments(prev => [{ ...deploymentData, id: docRef.id } as WhiteLabelDeploymentDoc, ...prev]);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating deployment:", error);
      toast.error("Failed to create deployment");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      companyName: "",
      shortName: "",
      initials: "",
      tagline: "",
      primaryColor: "#0066CC",
      secondaryColor: "#FF6600",
      primaryDomain: "",
      licenseType: "trial",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      ownerCompany: "",
      enabledTools: [],
      notes: "",
    });
  };

  const handleStatusChange = async (deploymentId: string, newStatus: DeploymentStatus) => {
    if (!db) return;
    try {
      const docRef = doc(db, COLLECTIONS.WHITE_LABEL_DEPLOYMENTS, deploymentId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
        ...(newStatus === 'active' ? { provisionedAt: Timestamp.now() } : {}),
      });
      setDeployments(prev => prev.map(d => 
        d.id === deploymentId ? { ...d, status: newStatus, updatedAt: Timestamp.now() } : d
      ));
      toast.success(`Deployment status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteDeployment = async (deploymentId: string) => {
    if (!confirm("Are you sure you want to delete this deployment? This action cannot be undone.")) {
      return;
    }
    if (!db) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.WHITE_LABEL_DEPLOYMENTS, deploymentId));
      setDeployments(prev => prev.filter(d => d.id !== deploymentId));
      toast.success("Deployment deleted successfully");
    } catch (error) {
      console.error("Error deleting deployment:", error);
      toast.error("Failed to delete deployment");
    }
  };

  const handleToolToggle = (tool: ToolType) => {
    setFormData(prev => {
      if (tool === 'all-tools') {
        return { ...prev, enabledTools: prev.enabledTools.includes('all-tools') ? [] : ['all-tools'] };
      }
      const filtered = prev.enabledTools.filter(t => t !== 'all-tools');
      if (filtered.includes(tool)) {
        return { ...prev, enabledTools: filtered.filter(t => t !== tool) };
      }
      return { ...prev, enabledTools: [...filtered, tool] };
    });
  };

  const getStatusBadge = (status: DeploymentStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'provisioning':
        return <Badge className="bg-blue-100 text-blue-800"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Provisioning</Badge>;
      case 'suspended':
        return <Badge variant="outline" className="text-orange-600"><Pause className="h-3 w-3 mr-1" />Suspended</Badge>;
      case 'terminated':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Terminated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLicenseBadge = (type: LicenseType) => {
    const colors: Record<LicenseType, string> = {
      trial: "bg-sky-100 text-sky-800",
      starter: "bg-blue-100 text-blue-800",
      professional: "bg-purple-100 text-purple-800",
      enterprise: "bg-green-100 text-green-800",
    };
    return <Badge className={colors[type]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>;
  };

  // Filter deployments
  const filteredDeployments = deployments.filter(deployment => {
    const matchesSearch = 
      deployment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deployment.domains.primary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deployment.owner.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || deployment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: deployments.length,
    active: deployments.filter(d => d.status === 'active').length,
    trial: deployments.filter(d => d.license.type === 'trial').length,
    suspended: deployments.filter(d => d.status === 'suspended').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-8 w-8" />
            White-Label Deployments
          </h1>
          <p className="text-muted-foreground">Manage white-label platform deployments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Deployment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New White-Label Deployment</DialogTitle>
              <DialogDescription>
                Set up a new white-label platform instance
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Deployment Information
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Deployment Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Acme Manufacturing Platform"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          name: e.target.value,
                          slug: generateSlug(e.target.value),
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input
                      id="slug"
                      placeholder="acme-manufacturing"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Branding */}
              <div className="space-y-4">
                <h3 className="font-semibold">Branding</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="Acme Manufacturing"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shortName">Short Name</Label>
                    <Input
                      id="shortName"
                      placeholder="Acme"
                      value={formData.shortName}
                      onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initials">Initials</Label>
                    <Input
                      id="initials"
                      placeholder="AMF"
                      maxLength={4}
                      value={formData.initials}
                      onChange={(e) => setFormData(prev => ({ ...prev, initials: e.target.value.toUpperCase() }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    placeholder="Building Tomorrow's Supply Chain"
                    value={formData.tagline}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        className="w-12 h-10 p-1"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                      />
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        className="w-12 h-10 p-1"
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      />
                      <Input
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Domain */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Domain Configuration
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="primaryDomain">Primary Domain *</Label>
                  <Input
                    id="primaryDomain"
                    placeholder="acmemfg.com"
                    value={formData.primaryDomain}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryDomain: e.target.value }))}
                  />
                </div>
              </div>

              {/* License */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  License
                </h3>
                <div className="space-y-2">
                  <Label>License Type</Label>
                  <Select 
                    value={formData.licenseType} 
                    onValueChange={(value: LicenseType) => setFormData(prev => ({ ...prev, licenseType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSE_TYPES.map(lt => (
                        <SelectItem key={lt.value} value={lt.value}>
                          <div className="flex flex-col">
                            <span>{lt.label}</span>
                            <span className="text-xs text-muted-foreground">{lt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Owner */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Owner Information
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Name</Label>
                    <Input
                      id="ownerName"
                      placeholder="John Smith"
                      value={formData.ownerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail">Email *</Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      placeholder="john@acmemfg.com"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerPhone">Phone</Label>
                    <Input
                      id="ownerPhone"
                      placeholder="+1 (555) 123-4567"
                      value={formData.ownerPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerPhone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerCompany">Company</Label>
                    <Input
                      id="ownerCompany"
                      placeholder="Acme Manufacturing Inc."
                      value={formData.ownerCompany}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerCompany: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Tools */}
              <div className="space-y-4">
                <h3 className="font-semibold">Enabled Tools</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 border rounded-lg">
                  {ALL_TOOLS.map(tool => (
                    <div key={tool} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tool-${tool}`}
                        checked={formData.enabledTools.includes(tool) || (tool !== 'all-tools' && formData.enabledTools.includes('all-tools'))}
                        disabled={tool !== 'all-tools' && formData.enabledTools.includes('all-tools')}
                        onCheckedChange={() => handleToolToggle(tool)}
                      />
                      <Label 
                        htmlFor={`tool-${tool}`} 
                        className={`text-sm cursor-pointer ${tool === 'all-tools' ? 'font-semibold' : ''}`}
                      >
                        {TOOL_DEFINITIONS[tool].name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty or select "All Tools" to enable all features
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Internal notes about this deployment..."
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
              <Button onClick={handleCreateDeployment} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create Deployment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Deployments</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Trial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">{stats.trial}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.suspended}</div>
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
                placeholder="Search by name, domain, or owner..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="provisioning">Provisioning</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchDeployments}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deployments List */}
      <Card>
        <CardHeader>
          <CardTitle>Deployments</CardTitle>
          <CardDescription>
            {filteredDeployments.length} deployment{filteredDeployments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDeployments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No deployments found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Deployment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeployments.map((deployment) => (
                <Card key={deployment.id} className="border">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: deployment.branding.primaryColor }}
                        >
                          {deployment.branding.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{deployment.name}</h3>
                            {getStatusBadge(deployment.status)}
                            {getLicenseBadge(deployment.license.type)}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {deployment.domains.primary}
                            </span>
                            <span>•</span>
                            <span>{deployment.owner.email}</span>
                            {deployment.lastActivityAt && (
                              <>
                                <span>•</span>
                                <span>Last active: {deployment.lastActivityAt.toDate().toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                          {deployment.branding.tagline && (
                            <p className="text-sm text-muted-foreground mt-1 italic">
                              "{deployment.branding.tagline}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {deployment.infrastructure.deploymentUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={deployment.infrastructure.deploymentUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View Site
                            </a>
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Settings className="mr-2 h-4 w-4" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Globe className="mr-2 h-4 w-4" />
                              Domains
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Key className="mr-2 h-4 w-4" />
                              Software Keys
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Users className="mr-2 h-4 w-4" />
                              Users
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Analytics
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {deployment.status !== 'active' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(deployment.id, 'active')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            {deployment.status === 'active' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(deployment.id, 'suspended')}>
                                <Pause className="mr-2 h-4 w-4" />
                                Suspend
                              </DropdownMenuItem>
                            )}
                            {deployment.status === 'suspended' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(deployment.id, 'terminated')} className="text-orange-600">
                                <XCircle className="mr-2 h-4 w-4" />
                                Terminate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteDeployment(deployment.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
