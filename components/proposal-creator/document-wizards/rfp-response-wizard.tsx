"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Target,
  DollarSign,
  Award,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AIEnhancedField } from "@/components/proposal-creator/ai-enhanced-field";

interface RFPResponseWizardProps {
  onComplete: (data: RFPResponseData) => void;
  onCancel: () => void;
  initialData?: Partial<RFPResponseData>;
}

export interface RFPResponseData {
  name: string;
  rfpNumber: string;
  clientName: string;
  dueDate: string;
  executiveSummary: string;
  understanding: string;
  approach: string;
  qualifications: string;
  differentiators: string;
  timeline: string;
  pricing: string;
  pricingRationale: string;
  totalPrice: number;
  references: string;
}

const STEPS = [
  { id: 1, title: "Basic Info", icon: FileText },
  { id: 2, title: "Understanding", icon: Target },
  { id: 3, title: "Approach", icon: Award },
  { id: 4, title: "Pricing", icon: DollarSign },
  { id: 5, title: "Review", icon: Check },
];

const emptyData: RFPResponseData = {
  name: "",
  rfpNumber: "",
  clientName: "",
  dueDate: "",
  executiveSummary: "",
  understanding: "",
  approach: "",
  qualifications: "",
  differentiators: "",
  timeline: "",
  pricing: "",
  pricingRationale: "",
  totalPrice: 0,
  references: "",
};

export function RFPResponseWizard({ onComplete, onCancel, initialData }: RFPResponseWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<RFPResponseData>({ ...emptyData, ...initialData });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = (updates: Partial<RFPResponseData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

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
            <div>
              <h2 className="text-xl font-semibold mb-1">RFP Response Details</h2>
              <p className="text-muted-foreground text-sm">Enter basic information about the RFP</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Response Name *</Label>
                <Input placeholder="e.g., ABC Corp IT Services Proposal" value={data.name} onChange={(e) => updateData({ name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>RFP Number</Label>
                <Input placeholder="RFP reference number" value={data.rfpNumber} onChange={(e) => updateData({ rfpNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input placeholder="Issuing organization" value={data.clientName} onChange={(e) => updateData({ clientName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={data.dueDate} onChange={(e) => updateData({ dueDate: e.target.value })} />
              </div>
            </div>
            <AIEnhancedField id="executiveSummary" label="Executive Summary" value={data.executiveSummary} onChange={(v) => updateData({ executiveSummary: v })} placeholder="Provide a compelling executive summary..." type="textarea" rows={5} documentType="rfp_response" fieldContext="executive_summary" additionalContext={{ name: data.name, client: data.clientName }} />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-semibold mb-1">Understanding & Qualifications</h2>
              <p className="text-muted-foreground text-sm">Demonstrate your understanding and qualifications</p>
            </div>
            <AIEnhancedField id="understanding" label="Understanding of Requirements" value={data.understanding} onChange={(v) => updateData({ understanding: v })} placeholder="Demonstrate your understanding of the client's needs..." type="textarea" rows={5} documentType="rfp_response" fieldContext="understanding" additionalContext={{ name: data.name, client: data.clientName }} />
            <AIEnhancedField id="qualifications" label="Qualifications & Experience" value={data.qualifications} onChange={(v) => updateData({ qualifications: v })} placeholder="Highlight relevant qualifications and experience..." type="textarea" rows={5} documentType="rfp_response" fieldContext="qualifications" additionalContext={{ name: data.name }} />
            <AIEnhancedField id="differentiators" label="Key Differentiators" value={data.differentiators} onChange={(v) => updateData({ differentiators: v })} placeholder="What sets your proposal apart from competitors?" type="textarea" rows={4} documentType="rfp_response" fieldContext="differentiators" additionalContext={{ name: data.name }} />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-semibold mb-1">Approach & Timeline</h2>
              <p className="text-muted-foreground text-sm">Describe your proposed approach</p>
            </div>
            <AIEnhancedField id="approach" label="Proposed Approach" value={data.approach} onChange={(v) => updateData({ approach: v })} placeholder="Describe your methodology and approach..." type="textarea" rows={6} documentType="rfp_response" fieldContext="approach" additionalContext={{ name: data.name, understanding: data.understanding }} />
            <AIEnhancedField id="timeline" label="Project Timeline" value={data.timeline} onChange={(v) => updateData({ timeline: v })} placeholder="Outline the project timeline and milestones..." type="textarea" rows={4} documentType="rfp_response" fieldContext="timeline" additionalContext={{ name: data.name }} />
            <AIEnhancedField id="references" label="References" value={data.references} onChange={(v) => updateData({ references: v })} placeholder="List relevant references and past projects..." type="textarea" rows={3} documentType="rfp_response" fieldContext="references" additionalContext={{ name: data.name }} />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-semibold mb-1">Pricing</h2>
              <p className="text-muted-foreground text-sm">Provide pricing details and justification</p>
            </div>
            <div className="space-y-2">
              <Label>Total Price ($)</Label>
              <Input type="number" placeholder="0" value={data.totalPrice || ""} onChange={(e) => updateData({ totalPrice: parseFloat(e.target.value) || 0 })} />
            </div>
            <AIEnhancedField id="pricing" label="Pricing Breakdown" value={data.pricing} onChange={(v) => updateData({ pricing: v })} placeholder="Provide detailed pricing breakdown..." type="textarea" rows={5} documentType="rfp_response" fieldContext="pricing" additionalContext={{ name: data.name, total: data.totalPrice.toString() }} />
            <AIEnhancedField id="pricingRationale" label="Pricing Rationale" value={data.pricingRationale} onChange={(v) => updateData({ pricingRationale: v })} placeholder="Justify your pricing..." type="textarea" rows={4} documentType="rfp_response" fieldContext="pricing_rationale" additionalContext={{ name: data.name, total: data.totalPrice.toString() }} />
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-semibold mb-1">Review Your RFP Response</h2>
              <p className="text-muted-foreground text-sm">Review all information before completing</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{data.name || "Untitled RFP Response"}</CardTitle>
                <CardDescription>{data.clientName} | RFP #{data.rfpNumber} | ${data.totalPrice.toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-muted-foreground">Executive Summary</Label><p className="text-sm mt-1">{data.executiveSummary || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Approach</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.approach || "Not provided"}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">Due Date</Label><p className="text-sm mt-1">{data.dueDate || "Not set"}</p></div>
                  <div><Label className="text-muted-foreground">Total Price</Label><p className="text-sm mt-1 font-bold text-primary">${data.totalPrice.toLocaleString()}</p></div>
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
          {currentStep < STEPS.length ? (
            <Button onClick={nextStep}>Next<ChevronRight className="ml-2 h-4 w-4" /></Button>
          ) : (
            <Button onClick={handleComplete} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Complete</Button>
          )}
        </div>
      </div>
    </div>
  );
}
