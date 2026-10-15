"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Shield,
  FileSignature,
  Handshake,
  Building2,
  Sparkles,
  ClipboardList,
  MapPin,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NDAWizard, type NDAData } from "./nda-wizard";
import { ContractWizard, type ContractData } from "./contract-wizard";
import { AgreementWizard, type AgreementData } from "./agreement-wizard";
import { MOUWizard, type MOUData } from "./mou-wizard";
import { SOWWizard, type SOWData } from "./sow-wizard";
import { SLEAWizard, type SLEAData } from "./slea-wizard";
import { MSAWizard, type MSAData } from "./msa-wizard";

export type DocumentType = "nda" | "contract" | "agreement" | "mou" | "statement_of_work" | "slea" | "msa";

export type WizardData = NDAData | ContractData | AgreementData | MOUData | SOWData | SLEAData | MSAData;

interface DocumentWizardSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (type: DocumentType, data: WizardData) => void;
}

const documentTypes = [
  {
    type: "statement_of_work" as DocumentType,
    title: "Statement of Work",
    description: "Create a detailed SOW with scope, deliverables, milestones, acceptance criteria, and payment schedule.",
    icon: ClipboardList,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    type: "slea" as DocumentType,
    title: "Site Level Execution Agreement (SLEA)",
    description: "Create a site-specific execution agreement with scope, safety requirements, performance metrics, and compliance.",
    icon: MapPin,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    type: "msa" as DocumentType,
    title: "Master Service Agreement (MSA)",
    description: "Create an MSA defining the overarching terms, service standards, financial terms, and legal provisions between parties.",
    icon: Scale,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    type: "contract" as DocumentType,
    title: "Contract",
    description: "Create a service or project contract with scope, deliverables, payment terms, and legal provisions.",
    icon: FileSignature,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    type: "nda" as DocumentType,
    title: "Non-Disclosure Agreement",
    description: "Create an NDA to protect confidential information shared between parties.",
    icon: Shield,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    type: "agreement" as DocumentType,
    title: "Agreement",
    description: "Create a general agreement between parties with terms, responsibilities, and dispute resolution.",
    icon: Handshake,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
  },
  {
    type: "mou" as DocumentType,
    title: "Memorandum of Understanding",
    description: "Create an MOU to formalize a partnership with shared objectives, commitments, and governance.",
    icon: Building2,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
];

export function DocumentWizardSelector({ open, onOpenChange, onComplete }: DocumentWizardSelectorProps) {
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);

  const handleComplete = (data: WizardData) => {
    if (selectedType) {
      onComplete(selectedType, data);
      setSelectedType(null);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedType(null);
  };

  const handleClose = () => {
    setSelectedType(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[95vw] !w-[1200px] max-h-[90vh] overflow-hidden flex flex-col p-0" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        {!selectedType ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-primary" />
                Create New Document
              </DialogTitle>
              <DialogDescription>
                Select a document type to start the AI-enhanced wizard
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documentTypes.map((doc) => {
                  const Icon = doc.icon;
                  return (
                    <Card
                      key={doc.type}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                        "group"
                      )}
                      onClick={() => setSelectedType(doc.type)}
                    >
                      <CardHeader className="pb-2">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-2", doc.bgColor)}>
                          <Icon className={cn("h-5 w-5", doc.color)} />
                        </div>
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                          {doc.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm">
                          {doc.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="flex justify-end px-6 py-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col h-[85vh]">
            {selectedType === "statement_of_work" && (
              <SOWWizard onComplete={handleComplete} onCancel={handleCancel} />
            )}
            {selectedType === "slea" && (
              <SLEAWizard onComplete={handleComplete} onCancel={handleCancel} />
            )}
            {selectedType === "msa" && (
              <MSAWizard onComplete={handleComplete} onCancel={handleCancel} />
            )}
            {selectedType === "contract" && (
              <ContractWizard onComplete={handleComplete} onCancel={handleCancel} />
            )}
            {selectedType === "nda" && (
              <NDAWizard onComplete={handleComplete} onCancel={handleCancel} />
            )}
            {selectedType === "agreement" && (
              <AgreementWizard onComplete={handleComplete} onCancel={handleCancel} />
            )}
            {selectedType === "mou" && (
              <MOUWizard onComplete={handleComplete} onCancel={handleCancel} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
