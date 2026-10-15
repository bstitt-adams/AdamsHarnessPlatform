"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle,
  Plug,
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  Clock,
  Loader2,
  Sparkles,
  Wand2,
  Download,
  Upload,
  MessageSquare,
  Mail,
  Phone,
  Workflow,
  Play,
  Eye,
  Copy,
  Send,
  FileText,
  Zap,
  Users,
  Target,
  ArrowRight,
} from "lucide-react";
import { showSuccess, showError, showInfo } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { COLLECTIONS, type PlatformSettingsDoc } from "@/lib/schema";

// Types
interface GHLIntegration {
  id: string;
  name: string;
  description?: string;
  locationId: string;
  apiToken: string;
  isActive: boolean;
  syncContacts: boolean;
  syncOpportunities: boolean;
  syncCalendars: boolean;
  syncPipelines: boolean;
  syncCampaigns: boolean;
  lastSyncStatus: 'success' | 'error' | 'pending' | 'never';
  lastSyncAt?: string;
  lastSyncError?: string;
  totalContactsSynced: number;
  totalOpportunitiesSynced: number;
  createdAt: string;
  updatedAt: string;
}

interface SyncLog {
  id: string;
  integrationId: string;
  syncType: string;
  status: string;
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  errors: Array<{ error: string }>;
}

interface WorkflowStep {
  type: 'email' | 'sms' | 'wait' | 'condition' | 'tag';
  delay?: number;
  delayUnit?: string;
  subject?: string;
  content: string;
  tags?: string[];
}

interface GeneratedWorkflow {
  name: string;
  description: string;
  trigger: {
    type: string;
    config?: Record<string, string>;
  };
  steps: WorkflowStep[];
  estimatedDuration?: string;
}

interface SavedWorkflow {
  id: string;
  name: string;
  description: string;
  workflow: GeneratedWorkflow;
  status: 'draft' | 'deployed' | 'archived';
  ghlWorkflowId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ImportedWorkflow {
  id: string;
  ghlWorkflowId: string;
  name: string;
  description: string;
  status: string;
  plainLanguagePrompt?: string;
  importedAt: string;
}

// Workflow Templates for Adams Electric
const WORKFLOW_TEMPLATES = [
  {
    id: 'supplier_onboarding',
    name: 'Supplier Onboarding',
    description: 'Welcome new suppliers to the Adams Electric network with a comprehensive onboarding sequence',
    category: 'onboarding',
    defaultPrompt: 'Create a supplier onboarding sequence for Adams Electric that welcomes new manufacturing suppliers, introduces our services, and guides them through the certification process over 7 days',
    suggestedType: 'email',
  },
  {
    id: 'workshop_nurture',
    name: 'Workshop Lead Nurture',
    description: 'Nurture leads interested in Supplier Success Workshops',
    category: 'nurture',
    defaultPrompt: 'Create a 5-day nurture sequence for manufacturers interested in Adams Electric Supplier Success Workshops, highlighting benefits of becoming OEM-ready and CMMC certified',
    suggestedType: 'mixed',
  },
  {
    id: 'cmmc_readiness',
    name: 'CMMC Readiness Campaign',
    description: 'Guide defense suppliers through CMMC certification preparation',
    category: 'nurture',
    defaultPrompt: 'Create an educational sequence about CMMC certification requirements for defense supply chain manufacturers, with calls to action for Adams Electric readiness assessments',
    suggestedType: 'email',
  },
  {
    id: 'oem_opportunity',
    name: 'OEM Opportunity Follow-up',
    description: 'Follow up with suppliers matched to OEM opportunities',
    category: 'sales',
    defaultPrompt: 'Create a follow-up sequence for suppliers who have been matched with an OEM opportunity, encouraging them to complete their readiness assessment',
    suggestedType: 'mixed',
  },
  {
    id: 'event_reminder',
    name: 'Event/Webinar Reminder',
    description: 'Remind registrants about upcoming Adams Electric events and webinars',
    category: 'event',
    defaultPrompt: 'Create an event reminder sequence with confirmations 1 week before, 1 day before, and 1 hour before the event, plus a follow-up after',
    suggestedType: 'email',
  },
  {
    id: 'reengagement',
    name: 'Supplier Re-engagement',
    description: 'Re-engage inactive suppliers in the Adams Electric network',
    category: 'reengagement',
    defaultPrompt: 'Create a re-engagement campaign for suppliers who haven\'t engaged with Adams Electric in 90 days, highlighting new OEM opportunities and success stories',
    suggestedType: 'mixed',
  },
];

export default function GoHighLevelPage() {
  const [activeTab, setActiveTab] = useState("integrations");
  const [integrations, setIntegrations] = useState<GHLIntegration[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([]);
  const [importedWorkflows, setImportedWorkflows] = useState<ImportedWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showWorkflowPreview, setShowWorkflowPreview] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<GHLIntegration | null>(null);
  
  // Form state for integrations
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    apiToken: "",
    locationId: "",
    agencyId: "",
    syncContacts: true,
    syncOpportunities: true,
    syncCalendars: false,
    syncPipelines: false,
    syncCampaigns: false,
  });

  // AI Workflow Builder state
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [workflowPrompt, setWorkflowPrompt] = useState("");
  const [workflowType, setWorkflowType] = useState<string>("mixed");
  const [generatedWorkflow, setGeneratedWorkflow] = useState<GeneratedWorkflow | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string; content: string}>>([]);

  // Action states
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  
  // Delete confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Fetch integrations
  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch("/api/gohighlevel/integrations");
      const data = await response.json();
      if (data.success) {
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error("Error fetching integrations:", error);
    }
  }, []);

  // Fetch saved workflows
  const fetchWorkflows = useCallback(async () => {
    try {
      const response = await fetch("/api/ghl/workflows");
      const data = await response.json();
      if (data.success) {
        setSavedWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error("Error fetching workflows:", error);
    }
  }, []);

  // Fetch imported workflows
  const fetchImportedWorkflows = useCallback(async () => {
    try {
      const response = await fetch("/api/ghl/import-workflows");
      const data = await response.json();
      if (data.success) {
        setImportedWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error("Error fetching imported workflows:", error);
    }
  }, []);

  // Load any GoHighLevel API credentials saved in Settings and create a working integration
  const seedIntegrationFromSettings = useCallback(async () => {
    if (!db) return;
    try {
      const settingsRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, "global");
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) return;

      const settings = settingsSnap.data() as PlatformSettingsDoc;
      const ghl = settings.integrations?.gohighlevel;
      if (!ghl?.apiKey || !ghl?.locationId) return;

      const response = await fetch("/api/gohighlevel/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Adams Electric GoHighLevel",
          description: "Auto-configured from Settings > Integrations",
          apiToken: ghl.apiKey,
          locationId: ghl.locationId,
          agencyId: ghl.agencyId || "",
          syncContacts: true,
          syncOpportunities: true,
          syncCalendars: true,
          syncPipelines: false,
          syncCampaigns: false,
        }),
      });
      const data = await response.json();
      if (data.success) {
        console.log("GoHighLevel integration auto-created from Settings");
        await fetchIntegrations();
      } else {
        console.error("Failed to auto-create GoHighLevel integration:", data.error);
      }
    } catch (error) {
      console.error("Error seeding GoHighLevel integration from settings:", error);
    }
  }, [fetchIntegrations]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchIntegrations(),
        fetchWorkflows(),
        fetchImportedWorkflows(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchIntegrations, fetchWorkflows, fetchImportedWorkflows]);

  useEffect(() => {
    if (!loading && integrations.length === 0 && db) {
      seedIntegrationFromSettings();
    }
  }, [loading, integrations.length, db, seedIntegrationFromSettings]);

  // Test connection
  const testConnection = async (id: string) => {
    setTestingConnection(id);
    try {
      const response = await fetch(`/api/gohighlevel/test-connection/${id}`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        showSuccess("Connection successful!", { description: `Location: ${data.locationName}` });
      } else {
        showError("Connection failed", { description: data.error });
      }
    } catch (error) {
      showError("Connection error", { description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setTestingConnection(null);
    }
  };

  // Trigger sync
  const triggerSync = async (id: string, syncType: string = "full") => {
    setSyncing(id);
    try {
      const response = await fetch(`/api/gohighlevel/sync/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncType }),
      });
      const data = await response.json();
      if (data.success) {
        showSuccess("Sync completed!", { description: `Records processed: ${data.summary?.recordsProcessed || 0}, Successful: ${data.summary?.recordsSuccessful || 0}` });
        fetchIntegrations();
      } else {
        showError("Sync failed", { description: data.error });
      }
    } catch (error) {
      showError("Sync error", { description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setSyncing(null);
    }
  };

  // Create integration
  const createIntegration = async () => {
    try {
      const response = await fetch("/api/gohighlevel/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        setShowAddDialog(false);
        resetForm();
        fetchIntegrations();
        showSuccess("Integration created successfully");
      } else {
        showError("Failed to create integration", { description: data.error });
      }
    } catch (error) {
      showError("Error creating integration", { description: error instanceof Error ? error.message : "Unknown error" });
    }
  };

  // Update integration
  const updateIntegration = async () => {
    if (!selectedIntegration) return;
    try {
      const response = await fetch(`/api/gohighlevel/integrations/${selectedIntegration.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        setShowEditDialog(false);
        setSelectedIntegration(null);
        resetForm();
        fetchIntegrations();
        showSuccess("Integration updated successfully");
      } else {
        showError("Failed to update integration", { description: data.error });
      }
    } catch (error) {
      showError("Error updating integration", { description: error instanceof Error ? error.message : "Unknown error" });
    }
  };

  // Delete integration
  const deleteIntegration = async (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  };

  // Confirm delete integration
  const confirmDeleteIntegration = async () => {
    if (!pendingDeleteId) return;
    try {
      const response = await fetch(`/api/gohighlevel/integrations/${pendingDeleteId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        fetchIntegrations();
        showSuccess("Integration deleted");
      } else {
        showError("Failed to delete integration", { description: data.error });
      }
    } catch (error) {
      showError("Error deleting integration", { description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setPendingDeleteId(null);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      apiToken: "",
      locationId: "",
      agencyId: "",
      syncContacts: true,
      syncOpportunities: true,
      syncCalendars: false,
      syncPipelines: false,
      syncCampaigns: false,
    });
  };

  // Open edit dialog
  const openEditDialog = (integration: GHLIntegration) => {
    setSelectedIntegration(integration);
    setFormData({
      name: integration.name,
      description: integration.description || "",
      apiToken: "",
      locationId: integration.locationId,
      agencyId: "",
      syncContacts: integration.syncContacts,
      syncOpportunities: integration.syncOpportunities,
      syncCalendars: integration.syncCalendars,
      syncPipelines: integration.syncPipelines,
      syncCampaigns: integration.syncCampaigns,
    });
    setShowEditDialog(true);
  };

  // Generate workflow with AI
  const generateWorkflow = async () => {
    if (!workflowPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ghl/generate-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: workflowPrompt,
          type: workflowType,
          industry: "manufacturing",
        }),
      });
      const data = await response.json();
      if (data.success && data.workflow) {
        setGeneratedWorkflow(data.workflow);
        setShowWorkflowPreview(true);
      } else {
        showError("Error generating workflow", { description: data.error || "Unknown error" });
      }
    } catch (error) {
      showError("Workflow generation failed", { description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Save workflow
  const saveWorkflow = async () => {
    if (!generatedWorkflow) return;
    
    try {
      const response = await fetch("/api/ghl/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: generatedWorkflow.name,
          description: generatedWorkflow.description,
          workflow: generatedWorkflow,
        }),
      });
      const data = await response.json();
      if (data.success) {
        showSuccess("Workflow saved successfully!");
        fetchWorkflows();
        setShowWorkflowPreview(false);
        setGeneratedWorkflow(null);
        setWorkflowPrompt("");
      } else {
        showError("Failed to save workflow", { description: data.error });
      }
    } catch (error) {
      showError("Error saving workflow", { description: error instanceof Error ? error.message : "Unknown error" });
    }
  };

  // Delete workflow
  const deleteWorkflow = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    try {
      const response = await fetch(`/api/ghl/workflows?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        fetchWorkflows();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Import workflows from GHL
  const importWorkflows = async () => {
    setImporting(true);
    try {
      const response = await fetch("/api/ghl/import-workflows", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Imported ${data.imported || 0} workflows from GoHighLevel`);
        fetchImportedWorkflows();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setImporting(false);
    }
  };

  // Convert workflow to plain language
  const convertWorkflow = async (workflowId: string) => {
    setConverting(workflowId);
    try {
      const response = await fetch("/api/ghl/convert-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Workflow converted successfully!");
        fetchImportedWorkflows();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setConverting(null);
    }
  };

  // Select template
  const selectTemplate = (templateId: string) => {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setWorkflowPrompt(template.defaultPrompt);
      setWorkflowType(template.suggestedType);
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
      case "completed":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case "error":
      case "failed":
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      case "pending":
      case "in_progress":
        return <Badge className="bg-sky-100 text-sky-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "deployed":
        return <Badge className="bg-blue-100 text-blue-700"><Zap className="h-3 w-3 mr-1" />Deployed</Badge>;
      default:
        return <Badge variant="outline">Never Synced</Badge>;
    }
  };

  // Get step icon
  const getStepIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <Phone className="h-4 w-4" />;
      case 'wait':
        return <Clock className="h-4 w-4" />;
      case 'condition':
        return <Target className="h-4 w-4" />;
      case 'tag':
        return <Users className="h-4 w-4" />;
      default:
        return <Workflow className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
              <Plug className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                GoHighLevel Integration
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Workflows
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage CRM integrations and AI-powered marketing automation for Adams Electric
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b px-6">
            <TabsList className="h-12">
              <TabsTrigger value="integrations" className="gap-2">
                <Plug className="h-4 w-4" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="ai-builder" className="gap-2">
                <Wand2 className="h-4 w-4" />
                AI Workflow Builder
              </TabsTrigger>
              <TabsTrigger value="workflows" className="gap-2">
                <Workflow className="h-4 w-4" />
                Saved Workflows
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-2">
                <Download className="h-4 w-4" />
                Import from GHL
              </TabsTrigger>
              <TabsTrigger value="sync-logs" className="gap-2">
                <FileText className="h-4 w-4" />
                Sync Logs
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">CRM Integrations</h2>
                    <p className="text-sm text-muted-foreground">Connect your GoHighLevel accounts to sync contacts and opportunities</p>
                  </div>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Integration
                  </Button>
                </div>

                {integrations.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Integrations</h3>
                      <p className="text-muted-foreground mb-4">
                        Add your first GoHighLevel integration to start syncing supplier data
                      </p>
                      <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Integration
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {integrations.map((integration) => (
                      <Card key={integration.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                {integration.name}
                                {integration.isActive ? (
                                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                                ) : (
                                  <Badge variant="outline">Inactive</Badge>
                                )}
                              </CardTitle>
                              <CardDescription>
                                Location ID: {integration.locationId}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => testConnection(integration.id)}
                                disabled={testingConnection === integration.id}
                              >
                                {testingConnection === integration.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Plug className="h-4 w-4" />
                                )}
                                <span className="ml-2">Test</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => triggerSync(integration.id)}
                                disabled={syncing === integration.id}
                              >
                                {syncing === integration.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                <span className="ml-2">Sync</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(integration)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteIntegration(integration.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Last Sync:</span>
                              <div className="mt-1">{getStatusBadge(integration.lastSyncStatus)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Contacts Synced:</span>
                              <div className="font-medium mt-1">{integration.totalContactsSynced}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Opportunities Synced:</span>
                              <div className="font-medium mt-1">{integration.totalOpportunitiesSynced}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Sync Settings:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {integration.syncContacts && <Badge variant="outline" className="text-xs">Contacts</Badge>}
                                {integration.syncOpportunities && <Badge variant="outline" className="text-xs">Opportunities</Badge>}
                                {integration.syncCalendars && <Badge variant="outline" className="text-xs">Calendars</Badge>}
                                {integration.syncPipelines && <Badge variant="outline" className="text-xs">Pipelines</Badge>}
                              </div>
                            </div>
                          </div>
                          {integration.lastSyncError && (
                            <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                              <AlertCircle className="h-4 w-4 inline mr-1" />
                              {integration.lastSyncError}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI Workflow Builder Tab */}
          <TabsContent value="ai-builder" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 max-w-4xl mx-auto space-y-6">
                {/* Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-orange-500" />
                      Workflow Templates for Adams Electric
                    </CardTitle>
                    <CardDescription>
                      Select a template to get started or write your own description
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {WORKFLOW_TEMPLATES.map((template) => (
                        <Button
                          key={template.id}
                          variant={selectedTemplate === template.id ? "default" : "outline"}
                          className="h-auto py-3 px-4 flex flex-col items-start text-left"
                          onClick={() => selectTemplate(template.id)}
                        >
                          <span className="font-medium">{template.name}</span>
                          <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Prompt Input */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wand2 className="h-5 w-5" />
                      Describe Your Workflow
                    </CardTitle>
                    <CardDescription>
                      Describe what you want the workflow to do in plain language
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={workflowPrompt}
                      onChange={(e) => setWorkflowPrompt(e.target.value)}
                      placeholder="e.g., Create a 5-day email sequence for new suppliers that introduces Adams Electric services, explains the certification process, and schedules a discovery call..."
                      rows={4}
                    />
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label>Workflow Type</Label>
                        <Select value={workflowType} onValueChange={setWorkflowType}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email Only</SelectItem>
                            <SelectItem value="sms">SMS Only</SelectItem>
                            <SelectItem value="mixed">Mixed (Email + SMS)</SelectItem>
                            <SelectItem value="nurture">Lead Nurture</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={generateWorkflow}
                          disabled={!workflowPrompt.trim() || isGenerating}
                          className="bg-gradient-to-r from-orange-500 to-orange-600"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate Workflow
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Example Prompts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Example Prompts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <button 
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                        onClick={() => setWorkflowPrompt("Create a welcome sequence for new manufacturing suppliers joining the Adams Electric network. Include an introduction to our services, information about OEM opportunities, and a call to schedule a Supplier Success Workshop.")}
                      >
                        <span className="font-medium">Supplier Welcome Series</span>
                        <p className="text-muted-foreground mt-1">Welcome new suppliers with Adams Electric services overview and workshop invitation</p>
                      </button>
                      <button 
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                        onClick={() => setWorkflowPrompt("Create a CMMC certification awareness campaign for defense supply chain manufacturers. Explain the requirements, timeline, and how Adams Electric can help them achieve compliance.")}
                      >
                        <span className="font-medium">CMMC Awareness Campaign</span>
                        <p className="text-muted-foreground mt-1">Educate defense suppliers about CMMC requirements and Adams Electric certification services</p>
                      </button>
                      <button 
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                        onClick={() => setWorkflowPrompt("Create a follow-up sequence for suppliers who attended a Adams Electric webinar but haven't scheduled a consultation. Include case studies and success stories from similar manufacturers.")}
                      >
                        <span className="font-medium">Webinar Follow-up</span>
                        <p className="text-muted-foreground mt-1">Convert webinar attendees with case studies and consultation offers</p>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Saved Workflows Tab */}
          <TabsContent value="workflows" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">Saved Workflows</h2>
                    <p className="text-sm text-muted-foreground">AI-generated workflows ready to deploy to GoHighLevel</p>
                  </div>
                </div>

                {savedWorkflows.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Saved Workflows</h3>
                      <p className="text-muted-foreground mb-4">
                        Use the AI Workflow Builder to create your first workflow
                      </p>
                      <Button onClick={() => setActiveTab("ai-builder")}>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Create Workflow
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {savedWorkflows.map((workflow) => (
                      <Card key={workflow.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                {workflow.name}
                                {getStatusBadge(workflow.status)}
                              </CardTitle>
                              <CardDescription>{workflow.description}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Button variant="outline" size="sm">
                                <Upload className="h-4 w-4 mr-1" />
                                Deploy
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteWorkflow(workflow.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Created: {new Date(workflow.createdAt).toLocaleDateString()}</span>
                            {workflow.ghlWorkflowId && (
                              <span>GHL ID: {workflow.ghlWorkflowId}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Import from GHL Tab */}
          <TabsContent value="import" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">Import Workflows from GoHighLevel</h2>
                    <p className="text-sm text-muted-foreground">Import existing workflows and convert them to plain language descriptions</p>
                  </div>
                  <Button onClick={importWorkflows} disabled={importing}>
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Import from GHL
                      </>
                    )}
                  </Button>
                </div>

                {importedWorkflows.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Imported Workflows</h3>
                      <p className="text-muted-foreground mb-4">
                        Import workflows from your GoHighLevel account to view and convert them
                      </p>
                      <Button onClick={importWorkflows} disabled={importing}>
                        <Download className="h-4 w-4 mr-2" />
                        Import Workflows
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {importedWorkflows.map((workflow) => (
                      <Card key={workflow.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                {workflow.name}
                                <Badge variant="outline">{workflow.status}</Badge>
                              </CardTitle>
                              <CardDescription>
                                GHL ID: {workflow.ghlWorkflowId}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => convertWorkflow(workflow.id)}
                                disabled={converting === workflow.id}
                              >
                                {converting === workflow.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MessageSquare className="h-4 w-4" />
                                )}
                                <span className="ml-2">Convert to Plain Language</span>
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        {workflow.plainLanguagePrompt && (
                          <CardContent>
                            <div className="bg-muted p-3 rounded-lg text-sm">
                              <span className="font-medium">Plain Language:</span>
                              <p className="mt-1">{workflow.plainLanguagePrompt}</p>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Sync Logs Tab */}
          <TabsContent value="sync-logs" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sync History</CardTitle>
                    <CardDescription>View recent synchronization logs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {syncLogs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No sync logs yet. Trigger a sync to see logs here.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Records</TableHead>
                            <TableHead>Duration</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {syncLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>{new Date(log.startedAt).toLocaleString()}</TableCell>
                              <TableCell>{log.syncType}</TableCell>
                              <TableCell>{getStatusBadge(log.status)}</TableCell>
                              <TableCell>
                                {log.recordsSuccessful}/{log.recordsProcessed}
                              </TableCell>
                              <TableCell>
                                {log.duration ? `${(log.duration / 1000).toFixed(1)}s` : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Integration Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add GoHighLevel Integration</DialogTitle>
            <DialogDescription>
              Connect a GoHighLevel account to sync supplier data with Adams Electric
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Integration Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Adams Electric Main Account"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiToken">API Token *</Label>
              <Input
                id="apiToken"
                type="password"
                value={formData.apiToken}
                onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                placeholder="Your GHL API token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationId">Location ID *</Label>
              <Input
                id="locationId"
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                placeholder="GHL Location ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agencyId">Agency ID (Optional)</Label>
              <Input
                id="agencyId"
                value={formData.agencyId}
                onChange={(e) => setFormData({ ...formData, agencyId: e.target.value })}
                placeholder="GHL Agency ID"
              />
            </div>
            <div className="space-y-3">
              <Label>Sync Settings</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Contacts (Suppliers)</span>
                  <Switch
                    checked={formData.syncContacts}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncContacts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Opportunities (Deals)</span>
                  <Switch
                    checked={formData.syncOpportunities}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncOpportunities: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Calendars</span>
                  <Switch
                    checked={formData.syncCalendars}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncCalendars: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Pipelines</span>
                  <Switch
                    checked={formData.syncPipelines}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncPipelines: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Campaigns</span>
                  <Switch
                    checked={formData.syncCampaigns}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncCampaigns: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={createIntegration} disabled={!formData.name || !formData.apiToken || !formData.locationId}>
              Create Integration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Integration Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Integration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Integration Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-apiToken">API Token (leave blank to keep current)</Label>
              <Input
                id="edit-apiToken"
                type="password"
                value={formData.apiToken}
                onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                placeholder="Enter new token to update"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-locationId">Location ID *</Label>
              <Input
                id="edit-locationId"
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <Label>Sync Settings</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Contacts (Suppliers)</span>
                  <Switch
                    checked={formData.syncContacts}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncContacts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Opportunities (Deals)</span>
                  <Switch
                    checked={formData.syncOpportunities}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncOpportunities: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Calendars</span>
                  <Switch
                    checked={formData.syncCalendars}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncCalendars: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Pipelines</span>
                  <Switch
                    checked={formData.syncPipelines}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncPipelines: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Campaigns</span>
                  <Switch
                    checked={formData.syncCampaigns}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncCampaigns: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedIntegration(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={updateIntegration} disabled={!formData.name || !formData.locationId}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow Preview Dialog */}
      <Dialog open={showWorkflowPreview} onOpenChange={setShowWorkflowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated Workflow Preview</DialogTitle>
            <DialogDescription>
              Review the AI-generated workflow before saving or deploying
            </DialogDescription>
          </DialogHeader>
          {generatedWorkflow && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{generatedWorkflow.name}</h3>
                <p className="text-sm text-muted-foreground">{generatedWorkflow.description}</p>
              </div>
              
              <div className="bg-muted p-3 rounded-lg">
                <span className="text-sm font-medium">Trigger:</span>
                <p className="text-sm">{generatedWorkflow.trigger.type.replace(/_/g, ' ')}</p>
              </div>

              <div>
                <span className="text-sm font-medium">Workflow Steps:</span>
                <div className="mt-2 space-y-2">
                  {generatedWorkflow.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600">
                        {getStepIcon(step.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{step.type}</Badge>
                          {step.delay && (
                            <span className="text-xs text-muted-foreground">
                              Wait {step.delay} {step.delayUnit || 'hours'}
                            </span>
                          )}
                        </div>
                        {step.subject && (
                          <p className="text-sm font-medium mt-1">{step.subject}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {step.content}
                        </p>
                      </div>
                      {index < generatedWorkflow.steps.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground mt-2" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {generatedWorkflow.estimatedDuration && (
                <div className="text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Estimated duration: {generatedWorkflow.estimatedDuration}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkflowPreview(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={() => {
              if (generatedWorkflow) {
                navigator.clipboard.writeText(JSON.stringify(generatedWorkflow, null, 2));
                toast.success("Workflow JSON copied to clipboard!");
              }
            }}>
              <Copy className="h-4 w-4 mr-2" />
              Copy JSON
            </Button>
            <Button onClick={saveWorkflow}>
              <FileText className="h-4 w-4 mr-2" />
              Save Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Integration"
        description="Are you sure you want to delete this integration? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteIntegration}
      />
    </div>
  );
}
