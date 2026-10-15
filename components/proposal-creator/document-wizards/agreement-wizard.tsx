"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Users, Handshake, Check, ChevronRight, ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AIEnhancedField } from "@/components/proposal-creator/ai-enhanced-field";

interface AgreementWizardProps {
  onComplete: (data: AgreementData) => void;
  onCancel: () => void;
  initialData?: Partial<AgreementData>;
}

export interface AgreementData {
  name: string;
  agreementType: string;
  purpose: string;
  effectiveDate: string;
  expirationDate: string;
  responsibilities: string;
  terms: string;
  disputeResolution: string;
  governingLaw: string;
  parties: AgreementParty[];
}

interface AgreementParty {
  id: string;
  name: string;
  role: string;
  organization: string;
  email: string;
}

const STEPS = [
  { id: 1, title: "Basic Info", icon: FileText },
  { id: 2, title: "Parties", icon: Users },
  { id: 3, title: "Terms", icon: Handshake },
  { id: 4, title: "Review", icon: Check },
];

const emptyData: AgreementData = {
  name: "", agreementType: "service_agreement", purpose: "", effectiveDate: "", expirationDate: "",
  responsibilities: "", terms: "", disputeResolution: "", governingLaw: "", parties: [],
};

export function AgreementWizard({ onComplete, onCancel, initialData }: AgreementWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<AgreementData>({ ...emptyData, ...initialData });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = (updates: Partial<AgreementData>) => setData(prev => ({ ...prev, ...updates }));
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const addParty = () => {
    updateData({ parties: [...data.parties, { id: "party-" + Date.now(), name: "", role: "primary", organization: "", email: "" }] });
  };
  const updateParty = (id: string, updates: Partial<AgreementParty>) => {
    updateData({ parties: data.parties.map(p => p.id === id ? { ...p, ...updates } : p) });
  };
  const removeParty = (id: string) => updateData({ parties: data.parties.filter(p => p.id !== id) });

  const handleComplete = async () => {
    setIsSaving(true);
    try { await onComplete(data); } finally { setIsSaving(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <div key={step.id} className={cn("flex flex-col items-center gap-1 cursor-pointer transition-colors flex-1", isActive && "text-primary", isCompleted && "text-green-600", !isActive && !isCompleted && "text-muted-foreground")} onClick={() => setCurrentStep(step.id)}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2", isActive && "border-primary bg-primary/10", isCompleted && "border-green-600 bg-green-100", !isActive && !isCompleted && "border-muted-foreground/30")}>
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className="text-xs font-medium hidden lg:block">{step.title}</span>
            </div>
          );
        })}
      </div>

      <ScrollArea className="flex-1 p-6">
        {currentStep === 1 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Agreement Details</h2><p className="text-muted-foreground text-sm">Enter basic agreement information</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Agreement Name *</Label><Input placeholder="e.g., Partnership Agreement" value={data.name} onChange={(e) => updateData({ name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Agreement Type</Label>
                <Select value={data.agreementType} onValueChange={(v) => updateData({ agreementType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service_agreement">Service Agreement</SelectItem>
                    <SelectItem value="partnership">Partnership Agreement</SelectItem>
                    <SelectItem value="vendor">Vendor Agreement</SelectItem>
                    <SelectItem value="licensing">Licensing Agreement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <AIEnhancedField id="purpose" label="Purpose" value={data.purpose} onChange={(v) => updateData({ purpose: v })} placeholder="Describe the purpose of this agreement..." type="textarea" rows={4} documentType="agreement" fieldContext="purpose" additionalContext={{ name: data.name, type: data.agreementType }} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Effective Date</Label><Input type="date" value={data.effectiveDate} onChange={(e) => updateData({ effectiveDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Expiration Date</Label><Input type="date" value={data.expirationDate} onChange={(e) => updateData({ expirationDate: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Governing Law</Label><Input placeholder="e.g., State of New York" value={data.governingLaw} onChange={(e) => updateData({ governingLaw: e.target.value })} /></div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-semibold mb-1">Parties</h2><p className="text-muted-foreground text-sm">Add parties to this agreement</p></div>
              <Button onClick={addParty}><Plus className="mr-2 h-4 w-4" />Add Party</Button>
            </div>
            {data.parties.length === 0 ? (
              <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-8"><Users className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">No parties added yet</p><Button variant="outline" className="mt-4" onClick={addParty}><Plus className="mr-2 h-4 w-4" />Add First Party</Button></CardContent></Card>
            ) : (
              <div className="space-y-4">
                {data.parties.map((party, index) => (
                  <Card key={party.id}>
                    <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base">Party {index + 1}</CardTitle><Button variant="ghost" size="icon" onClick={() => removeParty(party.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Name</Label><Input placeholder="Full name" value={party.name} onChange={(e) => updateParty(party.id, { name: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Role</Label>
                          <Select value={party.role} onValueChange={(v) => updateParty(party.id, { role: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="primary">Primary Party</SelectItem><SelectItem value="secondary">Secondary Party</SelectItem><SelectItem value="witness">Witness</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Organization</Label><Input placeholder="Company name" value={party.organization} onChange={(e) => updateParty(party.id, { organization: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@company.com" value={party.email} onChange={(e) => updateParty(party.id, { email: e.target.value })} /></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Terms & Conditions</h2><p className="text-muted-foreground text-sm">Define the agreement terms</p></div>
            <AIEnhancedField id="responsibilities" label="Responsibilities" value={data.responsibilities} onChange={(v) => updateData({ responsibilities: v })} placeholder="Define responsibilities of each party..." type="textarea" rows={5} documentType="agreement" fieldContext="responsibilities" additionalContext={{ name: data.name }} />
            <AIEnhancedField id="terms" label="Terms & Conditions" value={data.terms} onChange={(v) => updateData({ terms: v })} placeholder="Specify terms and conditions..." type="textarea" rows={5} documentType="agreement" fieldContext="terms" additionalContext={{ name: data.name }} />
            <AIEnhancedField id="disputeResolution" label="Dispute Resolution" value={data.disputeResolution} onChange={(v) => updateData({ disputeResolution: v })} placeholder="How will disputes be resolved?" type="textarea" rows={4} documentType="agreement" fieldContext="dispute_resolution" additionalContext={{ name: data.name }} />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Review Your Agreement</h2><p className="text-muted-foreground text-sm">Review all information before completing</p></div>
            <Card>
              <CardHeader><CardTitle>{data.name || "Untitled Agreement"}</CardTitle><CardDescription>{data.agreementType.replace(/_/g, " ")} | {data.parties.length} parties</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-muted-foreground">Purpose</Label><p className="text-sm mt-1">{data.purpose || "Not defined"}</p></div>
                <div><Label className="text-muted-foreground">Responsibilities</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.responsibilities || "Not defined"}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">Effective Date</Label><p className="text-sm mt-1">{data.effectiveDate || "Not set"}</p></div>
                  <div><Label className="text-muted-foreground">Governing Law</Label><p className="text-sm mt-1">{data.governingLaw || "Not specified"}</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </ScrollArea>

      <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <div className="flex items-center gap-2">
          {currentStep > 1 && <Button variant="outline" onClick={prevStep}><ChevronLeft className="mr-2 h-4 w-4" />Previous</Button>}
          {currentStep < STEPS.length ? <Button onClick={nextStep}>Next<ChevronRight className="ml-2 h-4 w-4" /></Button> : <Button onClick={handleComplete} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Complete</Button>}
        </div>
      </div>
    </div>
  );
}
