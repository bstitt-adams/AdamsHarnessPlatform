"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSignature,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Check,
  ArrowLeft,
  Building,
  User,
  Calendar,
  DollarSign,
  Send,
  Download,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  type Agreement,
  type AgreementParty,
  type Signer,
  AGREEMENT_TYPES,
} from "@/lib/types/proposal";

const WIZARD_STEPS = [
  { id: 1, title: "Agreement Details", description: "Basic agreement information" },
  { id: 2, title: "Parties", description: "Add parties to the agreement" },
  { id: 3, title: "Terms", description: "Agreement terms and conditions" },
  { id: 4, title: "Signers", description: "Configure signers" },
  { id: 5, title: "Review & Send", description: "Review and send for signature" },
];

const emptyAgreement: Partial<Agreement> = {
  name: "",
  type: "service_agreement",
  description: "",
  parties: [],
  effectiveDate: "",
  expirationDate: "",
  terms: "",
  totalValue: 0,
  status: "draft",
  signatureStatus: "not_sent",
  signers: [],
};

export default function NewAgreementPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [agreementData, setAgreementData] = useState<Partial<Agreement>>(emptyAgreement);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const addParty = () => {
    const newParty: AgreementParty = {
      id: `party-${Date.now()}`,
      name: "",
      role: "primary",
      email: "",
    };
    setAgreementData((prev) => ({
      ...prev,
      parties: [...(prev.parties || []), newParty],
    }));
  };

  const addSigner = () => {
    const newSigner: Signer = {
      id: `signer-${Date.now()}`,
      name: "",
      email: "",
      role: "",
      status: "pending",
    };
    setAgreementData((prev) => ({
      ...prev,
      signers: [...(prev.signers || []), newSigner],
    }));
  };

  const saveAgreement = () => {
    // In production, save to database
    console.log("Saving agreement:", agreementData);
    router.push("/portal/documents/agreements");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/portal/documents/agreements">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileSignature className="h-8 w-8" />
            Create Agreement
          </h1>
          <p className="text-muted-foreground">
            Step {currentStep} of 5: {WIZARD_STEPS[currentStep - 1].description}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between px-4">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2",
                index < WIZARD_STEPS.length - 1 && "flex-1"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm font-medium",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  isCompleted && "border-green-600 bg-green-600 text-white",
                  !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span className={cn(
                "text-sm font-medium hidden md:block",
                isActive && "text-primary",
                isCompleted && "text-green-600",
                !isActive && !isCompleted && "text-muted-foreground"
              )}>
                {step.title}
              </span>
              {index < WIZARD_STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-4",
                  isCompleted ? "bg-green-600" : "bg-muted"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          <ScrollArea className="h-[500px] pr-4">
            {/* Step 1: Agreement Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Agreement Name *</Label>
                    <Input
                      placeholder="e.g., ABC Manufacturing - Service Agreement"
                      value={agreementData.name || ""}
                      onChange={(e) => setAgreementData({ ...agreementData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Agreement Type *</Label>
                    <Select
                      value={agreementData.type}
                      onValueChange={(v) => setAgreementData({ ...agreementData, type: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AGREEMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of the agreement"
                    value={agreementData.description || ""}
                    onChange={(e) => setAgreementData({ ...agreementData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Effective Date</Label>
                    <Input
                      type="date"
                      value={agreementData.effectiveDate || ""}
                      onChange={(e) => setAgreementData({ ...agreementData, effectiveDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiration Date</Label>
                    <Input
                      type="date"
                      value={agreementData.expirationDate || ""}
                      onChange={(e) => setAgreementData({ ...agreementData, expirationDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Value ($)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={agreementData.totalValue || ""}
                      onChange={(e) => setAgreementData({ ...agreementData, totalValue: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Parties */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Agreement Parties</h3>
                    <p className="text-sm text-muted-foreground">Add all parties involved in this agreement</p>
                  </div>
                  <Button onClick={addParty}>
                    <Plus className="mr-2 h-4 w-4" />Add Party
                  </Button>
                </div>

                {agreementData.parties?.map((party, index) => (
                  <Card key={party.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-4">
                        <Badge variant="outline">Party {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setAgreementData({
                              ...agreementData,
                              parties: agreementData.parties?.filter((p) => p.id !== party.id),
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={party.name}
                            onChange={(e) => {
                              const updated = agreementData.parties?.map((p) =>
                                p.id === party.id ? { ...p, name: e.target.value } : p
                              );
                              setAgreementData({ ...agreementData, parties: updated });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select
                            value={party.role}
                            onValueChange={(v) => {
                              const updated = agreementData.parties?.map((p) =>
                                p.id === party.id ? { ...p, role: v as any } : p
                              );
                              setAgreementData({ ...agreementData, parties: updated });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">Primary Party</SelectItem>
                              <SelectItem value="secondary">Secondary Party</SelectItem>
                              <SelectItem value="witness">Witness</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Organization</Label>
                          <Input
                            value={party.organizationName || ""}
                            onChange={(e) => {
                              const updated = agreementData.parties?.map((p) =>
                                p.id === party.id ? { ...p, organizationName: e.target.value } : p
                              );
                              setAgreementData({ ...agreementData, parties: updated });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            value={party.email}
                            onChange={(e) => {
                              const updated = agreementData.parties?.map((p) =>
                                p.id === party.id ? { ...p, email: e.target.value } : p
                              );
                              setAgreementData({ ...agreementData, parties: updated });
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(!agreementData.parties || agreementData.parties.length === 0) && (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Building className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No parties added yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 3: Terms */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Agreement Terms</h3>
                  <p className="text-sm text-muted-foreground">Enter the terms and conditions of the agreement</p>
                </div>

                <div className="space-y-2">
                  <Label>Terms & Conditions</Label>
                  <Textarea
                    placeholder="Enter the full terms and conditions of this agreement..."
                    value={agreementData.terms || ""}
                    onChange={(e) => setAgreementData({ ...agreementData, terms: e.target.value })}
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Tip:</strong> You can paste your standard agreement template here, or use the AI to generate terms based on the agreement type.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Signers */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Signers</h3>
                    <p className="text-sm text-muted-foreground">Configure who needs to sign this agreement</p>
                  </div>
                  <Button onClick={addSigner}>
                    <Plus className="mr-2 h-4 w-4" />Add Signer
                  </Button>
                </div>

                {agreementData.signers?.map((signer, index) => (
                  <Card key={signer.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-4">
                        <Badge variant="outline">Signer {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setAgreementData({
                              ...agreementData,
                              signers: agreementData.signers?.filter((s) => s.id !== signer.id),
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={signer.name}
                            onChange={(e) => {
                              const updated = agreementData.signers?.map((s) =>
                                s.id === signer.id ? { ...s, name: e.target.value } : s
                              );
                              setAgreementData({ ...agreementData, signers: updated });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            value={signer.email}
                            onChange={(e) => {
                              const updated = agreementData.signers?.map((s) =>
                                s.id === signer.id ? { ...s, email: e.target.value } : s
                              );
                              setAgreementData({ ...agreementData, signers: updated });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role/Title</Label>
                          <Input
                            placeholder="e.g., CEO, Client"
                            value={signer.role}
                            onChange={(e) => {
                              const updated = agreementData.signers?.map((s) =>
                                s.id === signer.id ? { ...s, role: e.target.value } : s
                              );
                              setAgreementData({ ...agreementData, signers: updated });
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(!agreementData.signers || agreementData.signers.length === 0) && (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <User className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No signers added yet</p>
                    </CardContent>
                  </Card>
                )}

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>DocuSeal Integration:</strong> Signers will receive an email with a link to sign the document electronically.
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Review & Send */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Agreement Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <p className="font-medium">{agreementData.name || "Not specified"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Type</Label>
                        <p className="font-medium">
                          {AGREEMENT_TYPES.find((t) => t.value === agreementData.type)?.label}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Effective Date</Label>
                        <p className="font-medium">{agreementData.effectiveDate || "Not specified"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Total Value</Label>
                        <p className="font-medium">${agreementData.totalValue?.toLocaleString() || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="h-5 w-5 text-primary" />
                        <span className="font-medium">Parties</span>
                      </div>
                      <p className="text-2xl font-bold">{agreementData.parties?.length || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-5 w-5 text-primary" />
                        <span className="font-medium">Signers</span>
                      </div>
                      <p className="text-2xl font-bold">{agreementData.signers?.length || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" className="h-16">
                        <Eye className="mr-2 h-5 w-5" />
                        Preview Document
                      </Button>
                      <Button variant="outline" className="h-16">
                        <Download className="mr-2 h-5 w-5" />
                        Download PDF
                      </Button>
                    </div>
                    <Button className="w-full h-16" disabled={!agreementData.signers?.length}>
                      <Send className="mr-2 h-5 w-5" />
                      Send for Signature
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/portal/documents/agreements">Cancel</Link>
          </Button>
          {currentStep === 5 ? (
            <Button onClick={saveAgreement}>
              <Check className="mr-2 h-4 w-4" />
              Save Agreement
            </Button>
          ) : (
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
