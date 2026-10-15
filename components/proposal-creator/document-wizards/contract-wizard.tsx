"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Target, DollarSign, Shield, Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIEnhancedField } from "@/components/proposal-creator/ai-enhanced-field";

interface ContractWizardProps {
  onComplete: (data: ContractData) => void;
  onCancel: () => void;
  initialData?: Partial<ContractData>;
}

export interface ContractData {
  name: string;
  contractNumber: string;
  clientName: string;
  effectiveDate: string;
  endDate: string;
  scope: string;
  deliverables: string;
  paymentTerms: string;
  totalValue: number;
  warranties: string;
  liability: string;
  termination: string;
  governingLaw: string;
}

const STEPS = [
  { id: 1, title: "Basic Info", icon: FileText },
  { id: 2, title: "Scope & Deliverables", icon: Target },
  { id: 3, title: "Payment", icon: DollarSign },
  { id: 4, title: "Legal Terms", icon: Shield },
  { id: 5, title: "Review", icon: Check },
];

const emptyData: ContractData = {
  name: "", contractNumber: "", clientName: "", effectiveDate: "", endDate: "",
  scope: "", deliverables: "", paymentTerms: "", totalValue: 0,
  warranties: "", liability: "", termination: "", governingLaw: "",
};

export function ContractWizard({ onComplete, onCancel, initialData }: ContractWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<ContractData>({ ...emptyData, ...initialData });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = (updates: Partial<ContractData>) => setData(prev => ({ ...prev, ...updates }));
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

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
            <div><h2 className="text-xl font-semibold mb-1">Contract Details</h2><p className="text-muted-foreground text-sm">Enter basic contract information</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contract Name *</Label><Input placeholder="e.g., Service Agreement" value={data.name} onChange={(e) => updateData({ name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Contract Number</Label><Input placeholder="Contract reference" value={data.contractNumber} onChange={(e) => updateData({ contractNumber: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Client/Party Name</Label><Input placeholder="Other party name" value={data.clientName} onChange={(e) => updateData({ clientName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Governing Law</Label><Input placeholder="e.g., State of California" value={data.governingLaw} onChange={(e) => updateData({ governingLaw: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Effective Date</Label><Input type="date" value={data.effectiveDate} onChange={(e) => updateData({ effectiveDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={data.endDate} onChange={(e) => updateData({ endDate: e.target.value })} /></div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Scope & Deliverables</h2><p className="text-muted-foreground text-sm">Define what will be delivered</p></div>
            <AIEnhancedField id="scope" label="Scope of Work" value={data.scope} onChange={(v) => updateData({ scope: v })} placeholder="Define the scope of work..." type="textarea" rows={6} documentType="contract" fieldContext="scope" additionalContext={{ name: data.name, client: data.clientName }} />
            <AIEnhancedField id="deliverables" label="Deliverables" value={data.deliverables} onChange={(v) => updateData({ deliverables: v })} placeholder="List all deliverables and acceptance criteria..." type="textarea" rows={6} documentType="contract" fieldContext="deliverables" additionalContext={{ name: data.name, scope: data.scope }} />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Payment Terms</h2><p className="text-muted-foreground text-sm">Define payment structure</p></div>
            <div className="space-y-2"><Label>Total Contract Value ($)</Label><Input type="number" placeholder="0" value={data.totalValue || ""} onChange={(e) => updateData({ totalValue: parseFloat(e.target.value) || 0 })} /></div>
            <AIEnhancedField id="paymentTerms" label="Payment Terms" value={data.paymentTerms} onChange={(v) => updateData({ paymentTerms: v })} placeholder="Define payment schedule and terms..." type="textarea" rows={5} documentType="contract" fieldContext="terms" additionalContext={{ name: data.name, value: data.totalValue.toString() }} />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Legal Terms</h2><p className="text-muted-foreground text-sm">Define warranties, liability, and termination</p></div>
            <AIEnhancedField id="warranties" label="Warranties & Representations" value={data.warranties} onChange={(v) => updateData({ warranties: v })} placeholder="Define warranties and representations..." type="textarea" rows={4} documentType="contract" fieldContext="warranties" additionalContext={{ name: data.name }} />
            <AIEnhancedField id="liability" label="Liability & Indemnification" value={data.liability} onChange={(v) => updateData({ liability: v })} placeholder="Define liability limits and indemnification..." type="textarea" rows={4} documentType="contract" fieldContext="liability" additionalContext={{ name: data.name }} />
            <AIEnhancedField id="termination" label="Termination Conditions" value={data.termination} onChange={(v) => updateData({ termination: v })} placeholder="Define termination conditions..." type="textarea" rows={4} documentType="contract" fieldContext="termination" additionalContext={{ name: data.name }} />
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Review Your Contract</h2><p className="text-muted-foreground text-sm">Review all information before completing</p></div>
            <Card>
              <CardHeader><CardTitle>{data.name || "Untitled Contract"}</CardTitle><CardDescription>{data.clientName} | ${data.totalValue.toLocaleString()}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-muted-foreground">Scope</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.scope || "Not defined"}</p></div>
                <div><Label className="text-muted-foreground">Deliverables</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.deliverables || "Not defined"}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">Effective Date</Label><p className="text-sm mt-1">{data.effectiveDate || "Not set"}</p></div>
                  <div><Label className="text-muted-foreground">End Date</Label><p className="text-sm mt-1">{data.endDate || "Not set"}</p></div>
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
