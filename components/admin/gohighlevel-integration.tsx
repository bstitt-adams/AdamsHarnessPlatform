"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  AlertCircle,
  CheckCircle,
  Plug,
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  Play,
  Clock,
  Loader2,
} from "lucide-react";

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

export function GoHighLevelIntegration() {
  const [integrations, setIntegrations] = useState<GHLIntegration[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("integrations");
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<GHLIntegration | null>(null);
  
  // Form state
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

  // Action states
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Test connection
  const testConnection = async (id: string) => {
    setTestingConnection(id);
    try {
      const response = await fetch(`/api/gohighlevel/test-connection/${id}`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ Connection successful!\nLocation: ${data.locationName}`);
      } else {
        alert(`❌ Connection failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
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
        alert(`✅ Sync completed!\nRecords processed: ${data.summary.recordsProcessed}\nSuccessful: ${data.summary.recordsSuccessful}`);
        fetchIntegrations();
      } else {
        alert(`❌ Sync failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
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
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
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
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Delete integration
  const deleteIntegration = async (id: string) => {
    if (!confirm("Are you sure you want to delete this integration?")) return;
    try {
      const response = await fetch(`/api/gohighlevel/integrations/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        fetchIntegrations();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
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
      apiToken: "", // Don't pre-fill token for security
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

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      case "pending":
        return <Badge className="bg-sky-100 text-sky-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">Never Synced</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="h-6 w-6" />
            GoHighLevel Integration
          </h2>
          <p className="text-muted-foreground">
            Manage your GoHighLevel CRM integrations and sync settings
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="sync-logs">Sync Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Integrations</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first GoHighLevel integration to start syncing data
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
        </TabsContent>

        <TabsContent value="sync-logs">
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
        </TabsContent>
      </Tabs>

      {/* Add Integration Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add GoHighLevel Integration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Integration Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My GHL Account"
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
                  <span className="text-sm">Sync Contacts</span>
                  <Switch
                    checked={formData.syncContacts}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncContacts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Opportunities</span>
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
                  <span className="text-sm">Sync Contacts</span>
                  <Switch
                    checked={formData.syncContacts}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncContacts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sync Opportunities</span>
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
    </div>
  );
}
