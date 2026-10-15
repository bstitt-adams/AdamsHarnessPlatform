"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Factory, Shield, Truck, Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIEnhancedField } from "@/components/proposal-creator/ai-enhanced-field";

interface OEMSupplierWizardProps {
  onComplete: (data: OEMSupplierData) => void;
  onCancel: () => void;
  initialData?: Partial<OEMSupplierData>;
}

export interface OEMSupplierData {
  name: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  capabilities: string;
  qualitySystems: string;
  certifications: string;
  capacity: string;
  leadTimes: string;
  compliance: string;
  supplyChain: string;
  continuousImprovement: string;
  riskManagement: string;
}

const STEPS = [
  { id: 1, title: "Company Info", icon: FileText },
  { id: 2, title: "Capabilities", icon: Factory },
  { id: 3, title: "Quality & Compliance", icon: Shield },
  { id: 4, title: "Supply Chain", icon: Truck },
  { id: 5, title: "Review", icon: Check },
];

const emptyData: OEMSupplierData = {
  name: "", companyName: "", contactName: "", contactEmail: "",
  capabilities: "", qualitySystems: "", certifications: "", capacity: "", leadTimes: "",
  compliance: "", supplyChain: "", continuousImprovement: "", riskManagement: "",
};

export function OEMSupplierWizard({ onComplete, onCancel, initialData }: OEMSupplierWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OEMSupplierData>({ ...emptyData, ...initialData });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = (updates: Partial<OEMSupplierData>) => setData(prev => ({ ...prev, ...updates }));
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
            <div><h2 className="text-xl font-semibold mb-1">OEM Supplier Readiness Assessment</h2><p className="text-muted-foreground text-sm">Enter company information</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Assessment Name *</Label><Input placeholder="e.g., Q1 2024 Supplier Assessment" value={data.name} onChange={(e) => updateData({ name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Company Name *</Label><Input placeholder="Supplier company name" value={data.companyName} onChange={(e) => updateData({ companyName: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contact Name</Label><Input placeholder="Primary contact" value={data.contactName} onChange={(e) => updateData({ contactName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Contact Email</Label><Input type="email" placeholder="email@supplier.com" value={data.contactEmail} onChange={(e) => updateData({ contactEmail: e.target.value })} /></div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Manufacturing Capabilities</h2><p className="text-muted-foreground text-sm">Describe manufacturing capabilities and capacity</p></div>
            <AIEnhancedField id="capabilities" label="Manufacturing Capabilities" value={data.capabilities} onChange={(v) => updateData({ capabilities: v })} placeholder="Describe manufacturing capabilities, equipment, and expertise..." type="textarea" rows={5} documentType="oem_supplier_readiness" fieldContext="capabilities" additionalContext={{ company: data.companyName }} />
            <AIEnhancedField id="capacity" label="Production Capacity" value={data.capacity} onChange={(v) => updateData({ capacity: v })} placeholder="Specify production volumes, capacity, and scalability..." type="textarea" rows={4} documentType="oem_supplier_readiness" fieldContext="capacity" additionalContext={{ company: data.companyName }} />
            <AIEnhancedField id="leadTimes" label="Lead Times" value={data.leadTimes} onChange={(v) => updateData({ leadTimes: v })} placeholder="Typical lead times for various order types..." type="textarea" rows={3} documentType="oem_supplier_readiness" fieldContext="lead_times" additionalContext={{ company: data.companyName }} />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Quality & Compliance</h2><p className="text-muted-foreground text-sm">Describe quality systems and compliance</p></div>
            <AIEnhancedField id="qualitySystems" label="Quality Management Systems" value={data.qualitySystems} onChange={(v) => updateData({ qualitySystems: v })} placeholder="Describe quality management systems and processes..." type="textarea" rows={5} documentType="oem_supplier_readiness" fieldContext="quality_systems" additionalContext={{ company: data.companyName }} />
            <div className="space-y-2"><Label>Certifications</Label><Input placeholder="e.g., ISO 9001:2015, IATF 16949, AS9100" value={data.certifications} onChange={(e) => updateData({ certifications: e.target.value })} /></div>
            <AIEnhancedField id="compliance" label="Regulatory Compliance" value={data.compliance} onChange={(v) => updateData({ compliance: v })} placeholder="Address regulatory compliance and standards met..." type="textarea" rows={4} documentType="oem_supplier_readiness" fieldContext="compliance" additionalContext={{ company: data.companyName, certifications: data.certifications }} />
            <AIEnhancedField id="continuousImprovement" label="Continuous Improvement Programs" value={data.continuousImprovement} onChange={(v) => updateData({ continuousImprovement: v })} placeholder="Describe lean, Six Sigma, or other improvement initiatives..." type="textarea" rows={4} documentType="oem_supplier_readiness" fieldContext="continuous_improvement" additionalContext={{ company: data.companyName }} />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Supply Chain & Risk</h2><p className="text-muted-foreground text-sm">Describe supply chain management and risk mitigation</p></div>
            <AIEnhancedField id="supplyChain" label="Supply Chain Management" value={data.supplyChain} onChange={(v) => updateData({ supplyChain: v })} placeholder="Describe supply chain management and supplier relationships..." type="textarea" rows={5} documentType="oem_supplier_readiness" fieldContext="supply_chain" additionalContext={{ company: data.companyName }} />
            <AIEnhancedField id="riskManagement" label="Risk Management" value={data.riskManagement} onChange={(v) => updateData({ riskManagement: v })} placeholder="Describe risk identification and mitigation strategies..." type="textarea" rows={5} documentType="oem_supplier_readiness" fieldContext="risk_management" additionalContext={{ company: data.companyName }} />
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Review Assessment</h2><p className="text-muted-foreground text-sm">Review all information before completing</p></div>
            <Card>
              <CardHeader><CardTitle>{data.name || "Untitled Assessment"}</CardTitle><CardDescription>{data.companyName} | {data.contactEmail}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-muted-foreground">Capabilities</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.capabilities || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Quality Systems</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.qualitySystems || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Certifications</Label><p className="text-sm mt-1">{data.certifications || "None listed"}</p></div>
                <div><Label className="text-muted-foreground">Supply Chain</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.supplyChain || "Not provided"}</p></div>
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
