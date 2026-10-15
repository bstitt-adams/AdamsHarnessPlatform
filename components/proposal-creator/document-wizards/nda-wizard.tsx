"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Shield,
  Users,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AIEnhancedField } from "@/components/proposal-creator/ai-enhanced-field";

interface NDAWizardProps {
  onComplete: (data: NDAData) => void;
  onCancel: () => void;
  initialData?: Partial<NDAData>;
}

export interface NDAData {
  name: string;
  ndaType: "unilateral" | "bilateral" | "multilateral";
  purpose: string;
  confidentialInfo: string;
  obligations: string;
  exceptions: string;
  term: string;
  termDuration: string;
  effectiveDate: string;
  expirationDate: string;
  governingLaw: string;
  parties: NDAParty[];
}

interface NDAParty {
  id: string;
  name: string;
  role: "disclosing" | "receiving" | "both";
  organization: string;
  email: string;
  address: string;
}

const STEPS = [
  { id: 1, title: "Basic Info", icon: FileText },
  { id: 2, title: "Confidentiality", icon: Shield },
  { id: 3, title: "Parties", icon: Users },
  { id: 4, title: "Terms", icon: Clock },
  { id: 5, title: "Review", icon: Check },
];

const emptyData: NDAData = {
  name: "",
  ndaType: "bilateral",
  purpose: "",
  confidentialInfo: "",
  obligations: "",
  exceptions: "",
  term: "",
  termDuration: "2 years",
  effectiveDate: "",
  expirationDate: "",
  governingLaw: "",
  parties: [],
};

export function NDAWizard({ onComplete, onCancel, initialData }: NDAWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<NDAData>({ ...emptyData, ...initialData });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = (updates: Partial<NDAData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const addParty = () => {
    const newParty: NDAParty = {
      id: "party-" + Date.now(),
      name: "",
      role: "both",
      organization: "",
      email: "",
      address: "",
    };
    updateData({ parties: [...data.parties, newParty] });
  };

  const updateParty = (id: string, updates: Partial<NDAParty>) => {
    updateData({
      parties: data.parties.map(p => p.id === id ? { ...p, ...updates } : p),
    });
  };

  const removeParty = (id: string) => {
    updateData({ parties: data.parties.filter(p => p.id !== id) });
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      await onComplete(data);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress Steps */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <div
              key={step.id}
              className={cn(
                "flex flex-col items-center gap-1 cursor-pointer transition-colors flex-1",
                isActive && "text-primary",
                isCompleted && "text-green-600",
                !isActive && !isCompleted && "text-muted-foreground"
              )}
              onClick={() => setCurrentStep(step.id)}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2",
                  isActive && "border-primary bg-primary/10",
                  isCompleted && "border-green-600 bg-green-100",
                  !isActive && !isCompleted && "border-muted-foreground/30"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className="text-xs font-medium hidden lg:block">{step.title}</span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <ScrollArea className="flex-1 p-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-semibold mb-1">Non-Disclosure Agreement</h2>
              <p className="text-muted-foreground text-sm">Enter basic NDA information</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NDA Name *</Label>
                <Input
                  placeholder="e.g., Project Alpha NDA"
                  value={data.name}
                  onChange={(e) => updateData({ name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>NDA Type</Label>
                <Select value={data.ndaType} onValueChange={(v: "unilateral" | "bilateral" | "multilateral") => updateData({ ndaType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unilateral">Unilateral (One-way)</SelectItem>
                    <SelectItem value="bilateral">Bilateral (Mutual)</SelectItem>
                    <SelectItem value="multilateral">Multilateral (Multiple parties)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AIEnhancedField
              id="purpose"
              label="Purpose"
              value={data.purpose}
              onChange={(v) => updateData({ purpose: v })}
              placeholder="Describe the purpose of this NDA..."
              type="textarea"
              rows={4}
              documentType="nda"
              fieldContext="purpose"
              additionalContext={{ name: data.name, ndaType: data.ndaType }}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={data.effectiveDate}
                  onChange={(e) => updateData({ effectiveDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Governing Law</Label>
                <Input
                  placeholder="e.g., State of Delaware"
                  value={data.governingLaw}
                  onChange={(e) => updateData({ governingLaw: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Confidentiality */}
        {currentStep === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-semibold mb-1">Confidentiality Terms</h2>
              <p className="text-muted-foreground text-sm">Define what information is protected</p>
            </div>

            <AIEnhancedField
              id="confidentialInfo"
              label="Definition of Confidential Information"
              value={data.confidentialInfo}
              onChange={(v) => updateData({ confidentialInfo: v })}
              placeholder="Define what constitutes confidential information..."
              type="textarea"
              rows={5}
              documentType="nda"
              fieldContext="confidential_info"
              additionalContext={{ name: data.name, purpose: data.purpose }}
            />

            <AIEnhancedField
              id="obligations"
              label="Obligations of Receiving Party"
              value={data.obligations}
              onChange={(v) => updateData({ obligations: v })}
              placeholder="Describe the obligations for handling confidential information..."
              type="textarea"
              rows={5}
              documentType="nda"
              fieldContext="obligations"
              additionalContext={{ name: data.name }}
            />

            <AIEnhancedField
              id="exceptions"
              label="Exceptions to Confidentiality"
              value={data.exceptions}
              onChange={(v) => updateData({ exceptions: v })}
              placeholder="List exceptions where confidentiality does not apply..."
              type="textarea"
              rows={4}
              documentType="nda"
              fieldContext="exceptions"
              additionalContext={{ name: data.name }}
            />
          </div>
        )}

        {/* Step 3: Parties */}
        {currentStep === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">Parties to the Agreement</h2>
                <p className="text-muted-foreground text-sm">Add all parties involved in this NDA</p>
              </div>
              <Button onClick={addParty}>
                <Plus className="mr-2 h-4 w-4" />
                Add Party
              </Button>
            </div>

            {data.parties.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No parties added yet</p>
                  <Button variant="outline" className="mt-4" onClick={addParty}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Party
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.parties.map((party, index) => (
                  <Card key={party.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Party {index + 1}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => removeParty(party.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            placeholder="Full legal name"
                            value={party.name}
                            onChange={(e) => updateParty(party.id, { name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select 
                            value={party.role} 
                            onValueChange={(v: "disclosing" | "receiving" | "both") => updateParty(party.id, { role: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="disclosing">Disclosing Party</SelectItem>
                              <SelectItem value="receiving">Receiving Party</SelectItem>
                              <SelectItem value="both">Both (Mutual)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Organization</Label>
                          <Input
                            placeholder="Company name"
                            value={party.organization}
                            onChange={(e) => updateParty(party.id, { organization: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            placeholder="email@company.com"
                            value={party.email}
                            onChange={(e) => updateParty(party.id, { email: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Input
                          placeholder="Full address"
                          value={party.address}
                          onChange={(e) => updateParty(party.id, { address: e.target.value })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Terms */}
        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-semibold mb-1">Term & Duration</h2>
              <p className="text-muted-foreground text-sm">Define the duration and termination conditions</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={data.termDuration} onValueChange={(v) => updateData({ termDuration: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 year">1 Year</SelectItem>
                    <SelectItem value="2 years">2 Years</SelectItem>
                    <SelectItem value="3 years">3 Years</SelectItem>
                    <SelectItem value="5 years">5 Years</SelectItem>
                    <SelectItem value="indefinite">Indefinite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <Input
                  type="date"
                  value={data.expirationDate}
                  onChange={(e) => updateData({ expirationDate: e.target.value })}
                />
              </div>
            </div>

            <AIEnhancedField
              id="term"
              label="Term & Termination Conditions"
              value={data.term}
              onChange={(v) => updateData({ term: v })}
              placeholder="Describe the term and how the agreement can be terminated..."
              type="textarea"
              rows={5}
              documentType="nda"
              fieldContext="term"
              additionalContext={{ name: data.name, duration: data.termDuration }}
            />
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-semibold mb-1">Review Your NDA</h2>
              <p className="text-muted-foreground text-sm">Review all information before completing</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{data.name || "Untitled NDA"}</CardTitle>
                <CardDescription>
                  {data.ndaType === "unilateral" ? "Unilateral" : data.ndaType === "bilateral" ? "Bilateral (Mutual)" : "Multilateral"} NDA | {data.termDuration}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Purpose</Label>
                  <p className="text-sm mt-1">{data.purpose || "No purpose provided"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Confidential Information</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{data.confidentialInfo || "Not defined"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Effective Date</Label>
                    <p className="text-sm mt-1">{data.effectiveDate || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Governing Law</Label>
                    <p className="text-sm mt-1">{data.governingLaw || "Not specified"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {data.parties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Parties ({data.parties.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.parties.map((party) => (
                      <div key={party.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <span className="font-medium">{party.name || "Unnamed"}</span>
                        <span className="text-muted-foreground capitalize">{party.role} Party</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          )}
          {currentStep < STEPS.length ? (
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
