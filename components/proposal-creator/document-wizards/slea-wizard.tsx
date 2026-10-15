"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, MapPin, Shield, ClipboardCheck, Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIEnhancedField } from "@/components/proposal-creator/ai-enhanced-field";

interface SLEAWizardProps {
  onComplete: (data: SLEAData) => void;
  onCancel: () => void;
  initialData?: Partial<SLEAData>;
}

export interface SLEAData {
  name: string;
  agreementNumber: string;
  clientName: string;
  siteName: string;
  siteAddress: string;
  effectiveDate: string;
  endDate: string;
  masterAgreementRef: string;
  siteDescription: string;
  scopeOfServices: string;
  siteRequirements: string;
  safetyRequirements: string;
  environmentalCompliance: string;
  accessAndSecurity: string;
  performanceMetrics: string;
  reportingRequirements: string;
  escalationProcedures: string;
  paymentTerms: string;
  totalValue: number;
  insuranceRequirements: string;
  terminationConditions: string;
}

const STEPS = [
  { id: 1, title: "Site Info", icon: FileText },
  { id: 2, title: "Scope & Requirements", icon: MapPin },
  { id: 3, title: "Safety & Compliance", icon: Shield },
  { id: 4, title: "Performance & Terms", icon: ClipboardCheck },
  { id: 5, title: "Review", icon: Check },
];

const emptyData: SLEAData = {
  name: "", agreementNumber: "", clientName: "", siteName: "", siteAddress: "",
  effectiveDate: "", endDate: "", masterAgreementRef: "",
  siteDescription: "", scopeOfServices: "", siteRequirements: "",
  safetyRequirements: "", environmentalCompliance: "", accessAndSecurity: "",
  performanceMetrics: "", reportingRequirements: "", escalationProcedures: "",
  paymentTerms: "", totalValue: 0,
  insuranceRequirements: "", terminationConditions: "",
};

export function SLEAWizard({ onComplete, onCancel, initialData }: SLEAWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<SLEAData>({ ...emptyData, ...initialData });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = (updates: Partial<SLEAData>) => setData(prev => ({ ...prev, ...updates }));
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
            <div><h2 className="text-xl font-semibold mb-1">Site Level Execution Agreement</h2><p className="text-muted-foreground text-sm">Enter site and agreement information</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Agreement Name *</Label><Input placeholder="e.g., SLEA - Atlanta Facility" value={data.name} onChange={(e) => updateData({ name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Agreement Number</Label><Input placeholder="e.g., SLEA-2024-001" value={data.agreementNumber} onChange={(e) => updateData({ agreementNumber: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Client Name *</Label><Input placeholder="Client organization" value={data.clientName} onChange={(e) => updateData({ clientName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Master Agreement Reference</Label><Input placeholder="e.g., MSA-2024-001" value={data.masterAgreementRef} onChange={(e) => updateData({ masterAgreementRef: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Site Name *</Label><Input placeholder="e.g., Atlanta Manufacturing Facility" value={data.siteName} onChange={(e) => updateData({ siteName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Site Address</Label><Input placeholder="Full site address" value={data.siteAddress} onChange={(e) => updateData({ siteAddress: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Effective Date</Label><Input type="date" value={data.effectiveDate} onChange={(e) => updateData({ effectiveDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={data.endDate} onChange={(e) => updateData({ endDate: e.target.value })} /></div>
            </div>
            <AIEnhancedField id="siteDescription" label="Site Description" value={data.siteDescription} onChange={(v) => updateData({ siteDescription: v })} placeholder="Describe the site, its operations, and relevant details..." type="textarea" rows={4} documentType="slea" fieldContext="site_description" additionalContext={{ site: data.siteName, client: data.clientName }} />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Scope & Requirements</h2><p className="text-muted-foreground text-sm">Define services and site-specific requirements</p></div>
            <AIEnhancedField id="scopeOfServices" label="Scope of Services" value={data.scopeOfServices} onChange={(v) => updateData({ scopeOfServices: v })} placeholder="Describe the services to be performed at this site..." type="textarea" rows={6} documentType="slea" fieldContext="scope_of_services" additionalContext={{ site: data.siteName, client: data.clientName }} />
            <AIEnhancedField id="siteRequirements" label="Site-Specific Requirements" value={data.siteRequirements} onChange={(v) => updateData({ siteRequirements: v })} placeholder="List any site-specific requirements, conditions, or constraints..." type="textarea" rows={4} documentType="slea" fieldContext="site_requirements" additionalContext={{ site: data.siteName, scope: data.scopeOfServices }} />
            <AIEnhancedField id="accessAndSecurity" label="Access & Security Protocols" value={data.accessAndSecurity} onChange={(v) => updateData({ accessAndSecurity: v })} placeholder="Describe site access procedures, security clearances, and protocols..." type="textarea" rows={4} documentType="slea" fieldContext="access_security" additionalContext={{ site: data.siteName }} />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Safety & Compliance</h2><p className="text-muted-foreground text-sm">Define safety and environmental requirements</p></div>
            <AIEnhancedField id="safetyRequirements" label="Safety Requirements" value={data.safetyRequirements} onChange={(v) => updateData({ safetyRequirements: v })} placeholder="Describe safety protocols, PPE requirements, training, and incident reporting..." type="textarea" rows={5} documentType="slea" fieldContext="safety_requirements" additionalContext={{ site: data.siteName, client: data.clientName }} />
            <AIEnhancedField id="environmentalCompliance" label="Environmental Compliance" value={data.environmentalCompliance} onChange={(v) => updateData({ environmentalCompliance: v })} placeholder="Address environmental regulations, waste management, and sustainability..." type="textarea" rows={4} documentType="slea" fieldContext="environmental_compliance" additionalContext={{ site: data.siteName }} />
            <AIEnhancedField id="insuranceRequirements" label="Insurance Requirements" value={data.insuranceRequirements} onChange={(v) => updateData({ insuranceRequirements: v })} placeholder="Specify required insurance coverage types and minimum amounts..." type="textarea" rows={3} documentType="slea" fieldContext="insurance_requirements" additionalContext={{ site: data.siteName, client: data.clientName }} />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Performance & Terms</h2><p className="text-muted-foreground text-sm">Define metrics, reporting, and payment terms</p></div>
            <AIEnhancedField id="performanceMetrics" label="Performance Metrics & KPIs" value={data.performanceMetrics} onChange={(v) => updateData({ performanceMetrics: v })} placeholder="Define key performance indicators and measurement criteria..." type="textarea" rows={4} documentType="slea" fieldContext="performance_metrics" additionalContext={{ site: data.siteName, scope: data.scopeOfServices }} />
            <AIEnhancedField id="reportingRequirements" label="Reporting Requirements" value={data.reportingRequirements} onChange={(v) => updateData({ reportingRequirements: v })} placeholder="Define reporting frequency, format, and distribution..." type="textarea" rows={3} documentType="slea" fieldContext="reporting_requirements" additionalContext={{ site: data.siteName }} />
            <AIEnhancedField id="escalationProcedures" label="Escalation Procedures" value={data.escalationProcedures} onChange={(v) => updateData({ escalationProcedures: v })} placeholder="Define escalation paths for issues and disputes..." type="textarea" rows={3} documentType="slea" fieldContext="escalation_procedures" additionalContext={{ site: data.siteName, client: data.clientName }} />
            <div className="space-y-2">
              <Label>Total Value ($)</Label>
              <Input type="number" placeholder="0.00" value={data.totalValue || ""} onChange={(e) => updateData({ totalValue: parseFloat(e.target.value) || 0 })} />
            </div>
            <AIEnhancedField id="paymentTerms" label="Payment Terms" value={data.paymentTerms} onChange={(v) => updateData({ paymentTerms: v })} placeholder="Define payment schedule, invoicing, and terms..." type="textarea" rows={3} documentType="slea" fieldContext="payment_terms" additionalContext={{ site: data.siteName, totalValue: String(data.totalValue) }} />
            <AIEnhancedField id="terminationConditions" label="Termination Conditions" value={data.terminationConditions} onChange={(v) => updateData({ terminationConditions: v })} placeholder="Define conditions under which this SLEA may be terminated..." type="textarea" rows={3} documentType="slea" fieldContext="termination" additionalContext={{ site: data.siteName }} />
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Review SLEA</h2><p className="text-muted-foreground text-sm">Review all information before completing</p></div>
            <Card>
              <CardHeader><CardTitle>{data.name || "Untitled SLEA"}</CardTitle><CardDescription>{data.siteName} | {data.clientName} | ${data.totalValue?.toLocaleString() || "0"}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-muted-foreground">Site</Label><p className="text-sm mt-1">{data.siteName} — {data.siteAddress || "No address"}</p></div>
                <div><Label className="text-muted-foreground">Scope of Services</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.scopeOfServices || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Safety Requirements</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.safetyRequirements || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Performance Metrics</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.performanceMetrics || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Payment Terms</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.paymentTerms || "Not provided"}</p></div>
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
