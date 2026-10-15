"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Plus,
  Edit,
  Check,
  Sparkles,
  DollarSign,
  Download,
  Eye,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  type Proposal,
  PROPOSAL_TYPES,
} from "@/lib/types/proposal";
import { DocumentWizardSelector, type DocumentType, type WizardData } from "@/components/proposal-creator/document-wizards";
import { ProposalWizard } from "@/components/proposal-creator/proposal-wizard";
import { ProposalViewer } from "@/components/proposal-creator/proposal-viewer";


const emptyProposal: Partial<Proposal> = {
  name: "",
  description: "",
  type: "statement_of_work",
  startDate: "",
  endDate: "",
  fundingSource: "",
  referenceNumber: "",
  totalBudget: 0,
  status: "draft",
  collaboratingEntities: [],
  dataCollectionMethods: [],
  projectMilestones: [],
  analysisRecommendations: [],
  formTemplates: [],
  datasets: [],
  dashboardMetrics: [],
  documents: [],
  entityRelationshipNotes: "",
};

export default function ProposalsPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [showDocumentWizard, setShowDocumentWizard] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const startNewProposal = () => {
    setShowWizard(true);
  };

  const viewProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowViewer(true);
  };

  const handleSaveProposal = (updated: Proposal) => {
    setProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedProposal(updated);
  };

  const handleDeleteProposal = (id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
    setSelectedProposal(null);
    setShowViewer(false);
  };

  const downloadProposal = (proposal: Proposal) => {
    const typeName = PROPOSAL_TYPES.find((t) => t.value === proposal.type)?.label || proposal.type;
    const lines: string[] = [];
    lines.push("═".repeat(60));
    lines.push("");
    lines.push(`  ${proposal.name.toUpperCase()}`);
    lines.push("");
    lines.push("═".repeat(60));
    lines.push("");
    lines.push(`Document Type:     ${typeName}`);
    lines.push(`Status:            ${proposal.status.replace(/_/g, " ")}`);
    if (proposal.fundingSource) lines.push(`Funding Source:    ${proposal.fundingSource}`);
    if (proposal.totalBudget) lines.push(`Total Budget:      $${proposal.totalBudget.toLocaleString()}`);
    if (proposal.startDate) lines.push(`Start Date:        ${proposal.startDate}`);
    if (proposal.endDate) lines.push(`End Date:          ${proposal.endDate}`);
    lines.push(`Created:           ${new Date(proposal.createdAt).toLocaleDateString()}`);
    lines.push("");
    if (proposal.description) {
      lines.push("─".repeat(60));
      lines.push("DESCRIPTION");
      lines.push("");
      lines.push(proposal.description);
      lines.push("");
    }
    if (proposal.sectionContent) {
      for (const [key, content] of Object.entries(proposal.sectionContent)) {
        if (content) {
          lines.push("─".repeat(60));
          lines.push(key.replace(/([A-Z])/g, " $1").toUpperCase().trim());
          lines.push("");
          lines.push(content);
          lines.push("");
        }
      }
    }
    lines.push("═".repeat(60));
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
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

  const handleDocumentWizardComplete = (type: DocumentType, data: WizardData) => {
    const newProposal: Proposal = {
      ...emptyProposal,
      id: `proposal-${Date.now()}`,
      name: (data as { name?: string }).name || "Untitled Document",
      type: type as Proposal["type"],
      description: (data as { description?: string }).description || (data as { purpose?: string }).purpose || "",
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Proposal;
    setProposals((prev) => [newProposal, ...prev]);
    toast.success("Document created successfully!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline"><Edit className="h-3 w-3 mr-1" />Draft</Badge>;
      case "pending_signature":
        return <Badge className="bg-sky-100 text-sky-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "active":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-700"><Check className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Proposal Creator
          </h1>
          <p className="text-muted-foreground">
            AI-powered document analysis and proposal management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowDocumentWizard(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Document Wizard
          </Button>
          <Button onClick={startNewProposal}>
            <Plus className="mr-2 h-4 w-4" />
            New Proposal
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Proposals</p>
                <p className="text-2xl font-bold">{proposals.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {proposals.filter((p) => p.status === "active").length}
                </p>
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
                <p className="text-2xl font-bold text-sky-600">
                  {proposals.filter((p) => p.status === "pending_signature").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-sky-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">
                  ${proposals.reduce((sum, p) => sum + (p.totalBudget || 0), 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proposals List */}
      {proposals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Proposals</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Funding Source</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((proposal) => (
                  <TableRow key={proposal.id}>
                    <TableCell>
                      <button
                        className="font-medium text-left hover:text-primary hover:underline cursor-pointer transition-colors"
                        onClick={() => viewProposal(proposal)}
                      >
                        {proposal.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PROPOSAL_TYPES.find((t) => t.value === proposal.type)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{proposal.fundingSource}</TableCell>
                    <TableCell>${proposal.totalBudget?.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                    <TableCell>{new Date(proposal.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => viewProposal(proposal)} title="View / Edit">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => downloadProposal(proposal)} title="Download">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Proposals Yet</h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Create your first proposal by uploading a document for AI analysis or start from scratch.
            </p>
            <Button onClick={startNewProposal}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Proposal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Proposal Wizard */}
      <ProposalWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onComplete={(proposal) => {
          const newProposal: Proposal = {
            ...emptyProposal,
            ...proposal,
            id: `proposal-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Proposal;
          setProposals((prev) => [newProposal, ...prev]);
        }}
      />

      {/* Document Wizard Selector */}
      <DocumentWizardSelector
        open={showDocumentWizard}
        onOpenChange={setShowDocumentWizard}
        onComplete={handleDocumentWizardComplete}
      />

      {/* Proposal Viewer / Editor */}
      <ProposalViewer
        proposal={selectedProposal}
        open={showViewer}
        onOpenChange={setShowViewer}
        onSave={handleSaveProposal}
        onDelete={handleDeleteProposal}
      />
    </div>
  );
}

