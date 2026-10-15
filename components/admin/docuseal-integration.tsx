"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  FileSignature,
  RefreshCw,
  Send,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Users,
  Loader2,
  ExternalLink,
  Plus,
} from "lucide-react";

// Types
interface DocuSealTemplate {
  id: string;
  docusealId: number;
  name: string;
  category: string;
  submitterRoles: string[];
  isActive: boolean;
  lastSyncedAt: string;
}

interface DocuSealSubmission {
  id: string;
  docusealSubmissionId: number;
  templateName: string;
  status: string;
  organizationName?: string;
  submitters: Array<{
    email: string;
    name: string;
    role: string;
    status: string;
    completedAt?: string;
  }>;
  combinedDocumentUrl?: string;
  createdAt: string;
  completedAt?: string;
}

interface NewSubmissionForm {
  templateId: string;
  templateName: string;
  organizationName: string;
  submitters: Array<{
    role: string;
    email: string;
    name: string;
  }>;
}

export function DocuSealIntegration() {
  const [activeTab, setActiveTab] = useState("submissions");
  const [templates, setTemplates] = useState<DocuSealTemplate[]>([]);
  const [submissions, setSubmissions] = useState<DocuSealSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // New submission dialog
  const [showNewSubmission, setShowNewSubmission] = useState(false);
  const [newSubmission, setNewSubmission] = useState<NewSubmissionForm>({
    templateId: "",
    templateName: "",
    organizationName: "",
    submitters: [{ role: "", email: "", name: "" }],
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch data
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch("/api/docuseal/templates");
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      const response = await fetch("/api/docuseal/submissions");
      const data = await response.json();
      if (data.success) {
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchSubmissions();
  }, [fetchTemplates, fetchSubmissions]);

  // Sync templates from DocuSeal
  const syncTemplates = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/docuseal/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        fetchTemplates();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSyncing(false);
    }
  };

  // Create new submission
  const createSubmission = async () => {
    if (!newSubmission.templateId || newSubmission.submitters.length === 0) {
      alert("Please select a template and add at least one submitter");
      return;
    }

    const validSubmitters = newSubmission.submitters.filter((s) => s.email);
    if (validSubmitters.length === 0) {
      alert("Please add at least one submitter with an email");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/docuseal/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: parseInt(newSubmission.templateId),
          templateName: newSubmission.templateName,
          organizationName: newSubmission.organizationName,
          submitters: validSubmitters,
          sendEmail: true,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert("✅ Document sent for signing!");
        setShowNewSubmission(false);
        setNewSubmission({
          templateId: "",
          templateName: "",
          organizationName: "",
          submitters: [{ role: "", email: "", name: "" }],
        });
        fetchSubmissions();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Add submitter to form
  const addSubmitter = () => {
    setNewSubmission({
      ...newSubmission,
      submitters: [...newSubmission.submitters, { role: "", email: "", name: "" }],
    });
  };

  // Update submitter in form
  const updateSubmitter = (index: number, field: string, value: string) => {
    const updated = [...newSubmission.submitters];
    updated[index] = { ...updated[index], [field]: value };
    setNewSubmission({ ...newSubmission, submitters: updated });
  };

  // Remove submitter from form
  const removeSubmitter = (index: number) => {
    if (newSubmission.submitters.length > 1) {
      const updated = newSubmission.submitters.filter((_, i) => i !== index);
      setNewSubmission({ ...newSubmission, submitters: updated });
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "pending":
        return <Badge className="bg-sky-100 text-sky-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-700"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case "viewed":
      case "opened":
        return <Badge className="bg-purple-100 text-purple-700"><Eye className="h-3 w-3 mr-1" />Viewed</Badge>;
      case "declined":
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-700"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Category badge
  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      nda: "bg-purple-100 text-purple-700",
      engagement: "bg-blue-100 text-blue-700",
      supplier_qualification: "bg-green-100 text-green-700",
      msa: "bg-orange-100 text-orange-700",
      sow: "bg-sky-100 text-sky-700",
      other: "bg-gray-100 text-gray-700",
    };
    return <Badge className={colors[category] || colors.other}>{category.replace("_", " ")}</Badge>;
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
            <FileSignature className="h-6 w-6" />
            DocuSeal Integration
          </h2>
          <p className="text-muted-foreground">
            Manage document templates and electronic signatures
          </p>
        </div>
        <Button onClick={() => setShowNewSubmission(true)}>
          <Send className="h-4 w-4 mr-2" />
          Send Document
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Document Submissions</CardTitle>
                  <CardDescription>Track documents sent for signature</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSubmissions}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No document submissions yet</p>
                  <Button className="mt-4" onClick={() => setShowNewSubmission(true)}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Your First Document
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Signers</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          {submission.templateName}
                        </TableCell>
                        <TableCell>{submission.organizationName || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{submission.submitters.length}</span>
                            <div className="flex -space-x-1 ml-2">
                              {submission.submitters.slice(0, 3).map((s, i) => (
                                <div
                                  key={i}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                    s.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                  title={`${s.name || s.email}: ${s.status}`}
                                >
                                  {(s.name || s.email).charAt(0).toUpperCase()}
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell>
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {submission.combinedDocumentUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(submission.combinedDocumentUrl, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Document Templates</CardTitle>
                  <CardDescription>Templates available for signing</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={syncTemplates} disabled={syncing}>
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync from DocuSeal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates synced yet</p>
                  <Button className="mt-4" variant="outline" onClick={syncTemplates} disabled={syncing}>
                    {syncing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sync Templates
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <Card key={template.id} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          {getCategoryBadge(template.category)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{template.submitterRoles.length} signer roles</span>
                          </div>
                          {template.submitterRoles.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {template.submitterRoles.map((role, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          className="w-full mt-4"
                          size="sm"
                          onClick={() => {
                            setNewSubmission({
                              templateId: template.docusealId.toString(),
                              templateName: template.name,
                              organizationName: "",
                              submitters: template.submitterRoles.map((role) => ({
                                role,
                                email: "",
                                name: "",
                              })),
                            });
                            setShowNewSubmission(true);
                          }}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Submission Dialog */}
      <Dialog open={showNewSubmission} onOpenChange={setShowNewSubmission}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Document for Signing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                value={newSubmission.templateId}
                onValueChange={(value) => {
                  const template = templates.find((t) => t.docusealId.toString() === value);
                  setNewSubmission({
                    ...newSubmission,
                    templateId: value,
                    templateName: template?.name || "",
                    submitters: template?.submitterRoles.map((role) => ({
                      role,
                      email: "",
                      name: "",
                    })) || [{ role: "", email: "", name: "" }],
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.docusealId.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Organization Name (Optional)</Label>
              <Input
                value={newSubmission.organizationName}
                onChange={(e) => setNewSubmission({ ...newSubmission, organizationName: e.target.value })}
                placeholder="Company name"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Signers</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSubmitter}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Signer
                </Button>
              </div>
              {newSubmission.submitters.map((submitter, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {submitter.role || `Signer ${index + 1}`}
                    </span>
                    {newSubmission.submitters.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSubmitter(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Email *"
                      type="email"
                      value={submitter.email}
                      onChange={(e) => updateSubmitter(index, "email", e.target.value)}
                    />
                    <Input
                      placeholder="Name"
                      value={submitter.name}
                      onChange={(e) => updateSubmitter(index, "name", e.target.value)}
                    />
                  </div>
                  {!submitter.role && (
                    <Input
                      placeholder="Role (e.g., Client, Vendor)"
                      value={submitter.role}
                      onChange={(e) => updateSubmitter(index, "role", e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSubmission(false)}>
              Cancel
            </Button>
            <Button onClick={createSubmission} disabled={submitting || !newSubmission.templateId}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send for Signing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
