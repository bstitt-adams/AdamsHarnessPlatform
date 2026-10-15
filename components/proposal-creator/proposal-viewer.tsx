"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
  Download,
  Edit,
  Save,
  X,
  Mail,
  Send,
  Check,
  Printer,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Proposal, type ProposalStatus, PROPOSAL_TYPES } from "@/lib/types/proposal";
import { DOCUMENT_TYPES, type DocumentTypeConfig } from "@/components/proposal-creator/proposal-wizard";

interface ProposalViewerProps {
  proposal: Proposal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: Proposal) => void;
  onDelete: (id: string) => void;
}

/**
 * Generates a plain-text document from proposal data for download/print.
 */
function generateDocumentText(proposal: Proposal, docConfig: DocumentTypeConfig | undefined): string {
  const lines: string[] = [];
  const divider = "═".repeat(60);
  const thinDivider = "─".repeat(60);

  lines.push(divider);
  lines.push("");
  lines.push(`  ${proposal.name.toUpperCase()}`);
  lines.push("");
  lines.push(divider);
  lines.push("");

  // Meta info
  lines.push(`Document Type:     ${docConfig?.title || PROPOSAL_TYPES.find((t) => t.value === proposal.type)?.label || proposal.type}`);
  lines.push(`Status:            ${proposal.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`);
  if (proposal.referenceNumber) lines.push(`Reference Number:  ${proposal.referenceNumber}`);
  if (proposal.fundingSource) lines.push(`Funding Source:    ${proposal.fundingSource}`);
  if (proposal.totalBudget) lines.push(`Total Budget:      $${proposal.totalBudget.toLocaleString()}`);
  if (proposal.startDate) lines.push(`Start Date:        ${proposal.startDate}`);
  if (proposal.endDate) lines.push(`End Date:          ${proposal.endDate}`);
  lines.push(`Created:           ${new Date(proposal.createdAt).toLocaleDateString()}`);
  lines.push(`Last Updated:      ${new Date(proposal.updatedAt).toLocaleDateString()}`);
  lines.push("");
  lines.push(thinDivider);

  // Description
  if (proposal.description) {
    lines.push("");
    lines.push("DESCRIPTION");
    lines.push("");
    lines.push(proposal.description);
    lines.push("");
    lines.push(thinDivider);
  }

  // Section content
  if (proposal.sectionContent && docConfig) {
    for (const section of docConfig.sections) {
      const content = proposal.sectionContent[section.id];
      if (content) {
        lines.push("");
        lines.push(section.title.toUpperCase());
        lines.push("");
        lines.push(content);
        lines.push("");
        lines.push(thinDivider);
      }
    }
  } else if (proposal.sectionContent) {
    for (const [key, content] of Object.entries(proposal.sectionContent)) {
      if (content) {
        lines.push("");
        lines.push(key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).toUpperCase());
        lines.push("");
        lines.push(content);
        lines.push("");
        lines.push(thinDivider);
      }
    }
  }

  // Form data details
  if (proposal.formData) {
    const relevantFields = Object.entries(proposal.formData).filter(
      ([, v]) => v && v.trim() !== ""
    );
    if (relevantFields.length > 0) {
      lines.push("");
      lines.push("ADDITIONAL DETAILS");
      lines.push("");
      for (const [key, value] of relevantFields) {
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase())
          .trim();
        lines.push(`${label}: ${value}`);
      }
      lines.push("");
      lines.push(thinDivider);
    }
  }

  lines.push("");
  lines.push(divider);
  lines.push(`  Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`);
  lines.push(divider);

  return lines.join("\n");
}

export function ProposalViewer({ proposal, open, onOpenChange, onSave, onDelete }: ProposalViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Proposal>>({});
  const [editSectionContent, setEditSectionContent] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("overview");

  if (!proposal) return null;

  const docConfig = DOCUMENT_TYPES.find((d) => d.type === proposal.type);
  const DocIcon = docConfig?.icon || FileText;

  const startEditing = () => {
    setEditData({
      name: proposal.name,
      description: proposal.description,
      status: proposal.status,
      fundingSource: proposal.fundingSource,
      referenceNumber: proposal.referenceNumber,
      totalBudget: proposal.totalBudget,
      startDate: proposal.startDate,
      endDate: proposal.endDate,
    });
    setEditSectionContent({ ...(proposal.sectionContent || {}) });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
    setEditSectionContent({});
  };

  const saveEdits = () => {
    const updated: Proposal = {
      ...proposal,
      ...editData,
      sectionContent: { ...proposal.sectionContent, ...editSectionContent },
      updatedAt: new Date(),
    };
    onSave(updated);
    setIsEditing(false);
    toast.success("Proposal updated successfully");
  };

  const handleDownloadText = () => {
    const text = generateDocumentText(proposal, docConfig);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${proposal.name.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Document downloaded");
  };

  const handlePrint = () => {
    const text = generateDocumentText(proposal, docConfig);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${proposal.name}</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; padding: 40px; white-space: pre-wrap; line-height: 1.6; }
              @media print { body { padding: 20px; } }
            </style>
          </head>
          <body>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleEmail = () => {
    const subject = `${proposal.name} - For Your Review`;
    const body = `Please find the attached document "${proposal.name}" for your review.\n\nDocument Type: ${docConfig?.title || proposal.type}\nStatus: ${proposal.status}\n\nPlease review and provide your feedback at your earliest convenience.\n\nBest regards`;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");
  };

  const handleDelete = () => {
    onDelete(proposal.id);
    onOpenChange(false);
    toast.success("Proposal deleted");
  };

  const sectionContent = proposal.sectionContent || {};
  const sections = docConfig?.sections || [];
  const completedSections = sections.filter((s) => sectionContent[s.id]);

  const statusOptions: { label: string; value: ProposalStatus }[] = [
    { label: "Draft", value: "draft" },
    { label: "Pending Signature", value: "pending_signature" },
    { label: "Active", value: "active" },
    { label: "Completed", value: "completed" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[90vw] !w-[1000px] max-h-[90vh] overflow-hidden flex flex-col p-0"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", docConfig?.bgColor || "bg-primary/10")}>
                  <DocIcon className={cn("h-5 w-5", docConfig?.color || "text-primary")} />
                </div>
                {isEditing ? (
                  <Input
                    value={editData.name || ""}
                    onChange={(e) => setEditData((prev) => ({ ...prev, name: e.target.value }))}
                    className="text-xl font-semibold h-auto py-1 px-2"
                  />
                ) : (
                  proposal.name
                )}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={cancelEditing}>
                      <X className="mr-1 h-4 w-4" />Cancel
                    </Button>
                    <Button size="sm" onClick={saveEdits}>
                      <Save className="mr-1 h-4 w-4" />Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={startEditing}>
                      <Edit className="mr-1 h-4 w-4" />Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadText}>
                      <Download className="mr-1 h-4 w-4" />Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                      <Printer className="mr-1 h-4 w-4" />Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleEmail}>
                      <Mail className="mr-1 h-4 w-4" />Email
                    </Button>
                  </>
                )}
              </div>
            </div>
            <DialogDescription className="mt-2">
              {docConfig?.title || PROPOSAL_TYPES.find((t) => t.value === proposal.type)?.label} &bull;{" "}
              Created {new Date(proposal.createdAt).toLocaleDateString()} &bull;{" "}
              {completedSections.length} of {sections.length || "?"} sections
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: "calc(90vh - 180px)" }}>
          <div className="px-6 py-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="content">Document Content</TabsTrigger>
                <TabsTrigger value="details">Details & Fields</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Status & Meta */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Document Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Status</Label>
                        {isEditing ? (
                          <Select
                            value={editData.status || proposal.status}
                            onValueChange={(v) => setEditData((prev) => ({ ...prev, status: v as ProposalStatus }))}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="capitalize">
                            {proposal.status.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Type</Label>
                        <span className="text-sm font-medium">{docConfig?.title || proposal.type}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Budget</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editData.totalBudget ?? proposal.totalBudget ?? 0}
                            onChange={(e) => setEditData((prev) => ({ ...prev, totalBudget: parseFloat(e.target.value) || 0 }))}
                            className="w-[180px]"
                          />
                        ) : (
                          <span className="text-sm font-medium">${(proposal.totalBudget || 0).toLocaleString()}</span>
                        )}
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Funding Source</Label>
                        {isEditing ? (
                          <Input
                            value={editData.fundingSource ?? proposal.fundingSource ?? ""}
                            onChange={(e) => setEditData((prev) => ({ ...prev, fundingSource: e.target.value }))}
                            className="w-[180px]"
                          />
                        ) : (
                          <span className="text-sm font-medium">{proposal.fundingSource || "—"}</span>
                        )}
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Reference #</Label>
                        {isEditing ? (
                          <Input
                            value={editData.referenceNumber ?? proposal.referenceNumber ?? ""}
                            onChange={(e) => setEditData((prev) => ({ ...prev, referenceNumber: e.target.value }))}
                            className="w-[180px]"
                          />
                        ) : (
                          <span className="text-sm font-medium">{proposal.referenceNumber || "—"}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dates & Sections */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Timeline & Sections</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">Start Date</Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editData.startDate ?? proposal.startDate ?? ""}
                            onChange={(e) => setEditData((prev) => ({ ...prev, startDate: e.target.value }))}
                            className="w-[180px]"
                          />
                        ) : (
                          <span className="text-sm font-medium">{proposal.startDate || "—"}</span>
                        )}
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <Label className="text-muted-foreground">End Date</Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editData.endDate ?? proposal.endDate ?? ""}
                            onChange={(e) => setEditData((prev) => ({ ...prev, endDate: e.target.value }))}
                            className="w-[180px]"
                          />
                        ) : (
                          <span className="text-sm font-medium">{proposal.endDate || "—"}</span>
                        )}
                      </div>
                      <Separator />
                      <div className="space-y-2 pt-2">
                        <Label className="text-muted-foreground">Section Completion</Label>
                        {sections.length > 0 ? (
                          sections.map((section) => (
                            <div key={section.id} className="flex items-center justify-between py-1">
                              <span className="text-sm">{section.title}</span>
                              {sectionContent[section.id] ? (
                                <Badge className="bg-green-100 text-green-700">
                                  <Check className="h-3 w-3 mr-1" />Complete
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">Empty</Badge>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No sections configured</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Description */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={editData.description ?? proposal.description ?? ""}
                        onChange={(e) => setEditData((prev) => ({ ...prev, description: e.target.value }))}
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {proposal.description || "No description provided."}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Document Content Tab */}
              <TabsContent value="content" className="space-y-6">
                {sections.length > 0 ? (
                  sections.map((section) => {
                    const content = isEditing
                      ? (editSectionContent[section.id] ?? sectionContent[section.id] ?? "")
                      : (sectionContent[section.id] || "");
                    return (
                      <Card key={section.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{section.title}</CardTitle>
                            {content ? (
                              <Badge className="bg-green-100 text-green-700">
                                <Check className="h-3 w-3 mr-1" />Complete
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">Empty</Badge>
                            )}
                          </div>
                          <CardDescription>{section.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {isEditing ? (
                            <Textarea
                              value={editSectionContent[section.id] ?? sectionContent[section.id] ?? ""}
                              onChange={(e) =>
                                setEditSectionContent((prev) => ({
                                  ...prev,
                                  [section.id]: e.target.value,
                                }))
                              }
                              rows={6}
                              className="font-mono text-sm"
                            />
                          ) : content ? (
                            <div className="bg-muted/50 rounded-lg p-4">
                              <p className="text-sm whitespace-pre-wrap leading-relaxed font-mono">
                                {content}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              No content for this section. Click Edit to add content.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No structured sections available for this document type.
                      </p>
                      {proposal.description && (
                        <div className="mt-4 bg-muted/50 rounded-lg p-4 w-full max-w-2xl">
                          <p className="text-sm whitespace-pre-wrap">{proposal.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
                {proposal.formData && Object.keys(proposal.formData).length > 0 ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Form Fields</CardTitle>
                      <CardDescription>Structured data entered during document creation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(proposal.formData)
                          .filter(([, v]) => v && v.trim() !== "")
                          .map(([key, value]) => {
                            const label = key
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (s) => s.toUpperCase())
                              .trim();
                            return (
                              <div key={key} className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{label}</Label>
                                <p className="text-sm font-medium">{value}</p>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No additional form data available.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex items-center justify-between w-full">
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-1 h-4 w-4" />Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {isEditing && (
                <Button onClick={saveEdits}>
                  <Save className="mr-1 h-4 w-4" />Save Changes
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
