"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Scale, Shield, DollarSign, Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIEnhancedField } from "@/components/proposal-creator/ai-enhanced-field";

interface MSAWizardProps {
  onComplete: (data: MSAData) => void;
  onCancel: () => void;
  initialData?: Partial<MSAData>;
}

export interface MSAData {
  name: string;
  agreementNumber: string;
  clientName: string;
  clientAddress: string;
  providerName: string;
  providerAddress: string;
  effectiveDate: string;
  initialTerm: string;
  renewalTerms: string;
  servicesDescription: string;
  serviceStandards: string;
  orderingProcess: string;
  paymentTerms: string;
  rateSchedule: string;
  invoicingProcedure: string;
  intellectualProperty: string;
  confidentiality: string;
  dataProtection: string;
  indemnification: string;
  limitationOfLiability: string;
  insurance: string;
  termination: string;
  disputeResolution: string;
  governingLaw: string;
  forceMAjeure: string;
  amendments: string;
}

const STEPS = [
  { id: 1, title: "Parties & Term", icon: FileText },
  { id: 2, title: "Services", icon: Scale },
  { id: 3, title: "Financial Terms", icon: DollarSign },
  { id: 4, title: "Legal Provisions", icon: Shield },
  { id: 5, title: "Review", icon: Check },
];

const emptyData: MSAData = {
  name: "", agreementNumber: "", clientName: "", clientAddress: "",
  providerName: "", providerAddress: "",
  effectiveDate: "", initialTerm: "", renewalTerms: "",
  servicesDescription: "", serviceStandards: "", orderingProcess: "",
  paymentTerms: "", rateSchedule: "", invoicingProcedure: "",
  intellectualProperty: "", confidentiality: "", dataProtection: "",
  indemnification: "", limitationOfLiability: "", insurance: "",
  termination: "", disputeResolution: "", governingLaw: "",
  forceMAjeure: "", amendments: "",
};

export function MSAWizard({ onComplete, onCancel, initialData }: MSAWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<MSAData>({ ...emptyData, ...initialData });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = (updates: Partial<MSAData>) => setData(prev => ({ ...prev, ...updates }));
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
            <div><h2 className="text-xl font-semibold mb-1">Master Service Agreement</h2><p className="text-muted-foreground text-sm">Define the parties and agreement term</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Agreement Name *</Label><Input placeholder="e.g., MSA - ABC Corporation" value={data.name} onChange={(e) => updateData({ name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Agreement Number</Label><Input placeholder="e.g., MSA-2024-001" value={data.agreementNumber} onChange={(e) => updateData({ agreementNumber: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Client Name *</Label><Input placeholder="Client organization" value={data.clientName} onChange={(e) => updateData({ clientName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Client Address</Label><Input placeholder="Client address" value={data.clientAddress} onChange={(e) => updateData({ clientAddress: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Provider Name *</Label><Input placeholder="Service provider name" value={data.providerName} onChange={(e) => updateData({ providerName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Provider Address</Label><Input placeholder="Provider address" value={data.providerAddress} onChange={(e) => updateData({ providerAddress: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Effective Date</Label><Input type="date" value={data.effectiveDate} onChange={(e) => updateData({ effectiveDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Initial Term</Label><Input placeholder="e.g., 3 years" value={data.initialTerm} onChange={(e) => updateData({ initialTerm: e.target.value })} /></div>
              <div className="space-y-2"><Label>Renewal Terms</Label><Input placeholder="e.g., Auto-renew 1 year" value={data.renewalTerms} onChange={(e) => updateData({ renewalTerms: e.target.value })} /></div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Services</h2><p className="text-muted-foreground text-sm">Define the services covered under this MSA</p></div>
            <AIEnhancedField id="servicesDescription" label="Description of Services" value={data.servicesDescription} onChange={(v) => updateData({ servicesDescription: v })} placeholder="Describe the general categories of services covered by this MSA..." type="textarea" rows={6} documentType="msa" fieldContext="services_description" additionalContext={{ client: data.clientName, provider: data.providerName }} />
            <AIEnhancedField id="serviceStandards" label="Service Standards & SLAs" value={data.serviceStandards} onChange={(v) => updateData({ serviceStandards: v })} placeholder="Define service level agreements, quality standards, and performance expectations..." type="textarea" rows={5} documentType="msa" fieldContext="service_standards" additionalContext={{ client: data.clientName, services: data.servicesDescription }} />
            <AIEnhancedField id="orderingProcess" label="Ordering Process (SOW/Work Orders)" value={data.orderingProcess} onChange={(v) => updateData({ orderingProcess: v })} placeholder="Describe how individual work orders or SOWs are initiated under this MSA..." type="textarea" rows={4} documentType="msa" fieldContext="ordering_process" additionalContext={{ client: data.clientName, provider: data.providerName }} />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Financial Terms</h2><p className="text-muted-foreground text-sm">Define payment, rates, and invoicing</p></div>
            <AIEnhancedField id="paymentTerms" label="Payment Terms" value={data.paymentTerms} onChange={(v) => updateData({ paymentTerms: v })} placeholder="Define payment terms (e.g., Net 30, Net 45)..." type="textarea" rows={3} documentType="msa" fieldContext="payment_terms" additionalContext={{ client: data.clientName }} />
            <AIEnhancedField id="rateSchedule" label="Rate Schedule" value={data.rateSchedule} onChange={(v) => updateData({ rateSchedule: v })} placeholder="Define hourly rates, fixed fees, or rate card for services..." type="textarea" rows={4} documentType="msa" fieldContext="rate_schedule" additionalContext={{ services: data.servicesDescription }} />
            <AIEnhancedField id="invoicingProcedure" label="Invoicing Procedure" value={data.invoicingProcedure} onChange={(v) => updateData({ invoicingProcedure: v })} placeholder="Describe invoicing frequency, format, and submission process..." type="textarea" rows={3} documentType="msa" fieldContext="invoicing_procedure" additionalContext={{ paymentTerms: data.paymentTerms }} />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Legal Provisions</h2><p className="text-muted-foreground text-sm">Define legal terms and protections</p></div>
            <AIEnhancedField id="intellectualProperty" label="Intellectual Property" value={data.intellectualProperty} onChange={(v) => updateData({ intellectualProperty: v })} placeholder="Define IP ownership, licensing, and work product rights..." type="textarea" rows={4} documentType="msa" fieldContext="intellectual_property" additionalContext={{ client: data.clientName, provider: data.providerName }} />
            <AIEnhancedField id="confidentiality" label="Confidentiality" value={data.confidentiality} onChange={(v) => updateData({ confidentiality: v })} placeholder="Define confidentiality obligations and exceptions..." type="textarea" rows={4} documentType="msa" fieldContext="confidentiality" additionalContext={{ client: data.clientName, provider: data.providerName }} />
            <AIEnhancedField id="dataProtection" label="Data Protection" value={data.dataProtection} onChange={(v) => updateData({ dataProtection: v })} placeholder="Address data privacy, GDPR/CCPA compliance, and data handling..." type="textarea" rows={3} documentType="msa" fieldContext="data_protection" additionalContext={{ client: data.clientName }} />
            <AIEnhancedField id="indemnification" label="Indemnification" value={data.indemnification} onChange={(v) => updateData({ indemnification: v })} placeholder="Define indemnification obligations for each party..." type="textarea" rows={3} documentType="msa" fieldContext="indemnification" additionalContext={{ client: data.clientName, provider: data.providerName }} />
            <AIEnhancedField id="limitationOfLiability" label="Limitation of Liability" value={data.limitationOfLiability} onChange={(v) => updateData({ limitationOfLiability: v })} placeholder="Define liability caps and exclusions..." type="textarea" rows={3} documentType="msa" fieldContext="limitation_of_liability" />
            <AIEnhancedField id="termination" label="Termination" value={data.termination} onChange={(v) => updateData({ termination: v })} placeholder="Define termination rights, notice periods, and wind-down procedures..." type="textarea" rows={3} documentType="msa" fieldContext="termination" additionalContext={{ initialTerm: data.initialTerm }} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Governing Law</Label><Input placeholder="e.g., State of North Carolina" value={data.governingLaw} onChange={(e) => updateData({ governingLaw: e.target.value })} /></div>
              <div className="space-y-2"><Label>Dispute Resolution</Label><Input placeholder="e.g., Binding arbitration" value={data.disputeResolution} onChange={(e) => updateData({ disputeResolution: e.target.value })} /></div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Review MSA</h2><p className="text-muted-foreground text-sm">Review all information before completing</p></div>
            <Card>
              <CardHeader><CardTitle>{data.name || "Untitled MSA"}</CardTitle><CardDescription>{data.clientName} &amp; {data.providerName} | Term: {data.initialTerm || "Not set"}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-muted-foreground">Services</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.servicesDescription || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Service Standards</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.serviceStandards || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Payment Terms</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.paymentTerms || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">IP Rights</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.intellectualProperty || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Confidentiality</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.confidentiality || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Governing Law</Label><p className="text-sm mt-1">{data.governingLaw || "Not specified"}</p></div>
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
