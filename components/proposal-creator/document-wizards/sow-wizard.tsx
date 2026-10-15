"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Target, ListChecks, Calendar, Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIEnhancedField } from "@/components/proposal-creator/ai-enhanced-field";

interface SOWWizardProps {
  onComplete: (data: SOWData) => void;
  onCancel: () => void;
  initialData?: Partial<SOWData>;
}

export interface SOWData {
  name: string;
  projectName: string;
  clientName: string;
  contractReference: string;
  effectiveDate: string;
  completionDate: string;
  projectBackground: string;
  objectives: string;
  scopeOfWork: string;
  outOfScope: string;
  deliverables: string;
  milestones: string;
  acceptanceCriteria: string;
  assumptions: string;
  constraints: string;
  paymentSchedule: string;
  totalValue: number;
  changeManagement: string;
  communicationPlan: string;
}

const STEPS = [
  { id: 1, title: "Project Info", icon: FileText },
  { id: 2, title: "Scope & Objectives", icon: Target },
  { id: 3, title: "Deliverables & Milestones", icon: ListChecks },
  { id: 4, title: "Terms & Schedule", icon: Calendar },
  { id: 5, title: "Review", icon: Check },
];

const emptyData: SOWData = {
  name: "", projectName: "", clientName: "", contractReference: "",
  effectiveDate: "", completionDate: "",
  projectBackground: "", objectives: "", scopeOfWork: "", outOfScope: "",
  deliverables: "", milestones: "", acceptanceCriteria: "",
  assumptions: "", constraints: "",
  paymentSchedule: "", totalValue: 0,
  changeManagement: "", communicationPlan: "",
};

export function SOWWizard({ onComplete, onCancel, initialData }: SOWWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<SOWData>({ ...emptyData, ...initialData });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = (updates: Partial<SOWData>) => setData(prev => ({ ...prev, ...updates }));
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
            <div><h2 className="text-xl font-semibold mb-1">Statement of Work</h2><p className="text-muted-foreground text-sm">Enter project and client information</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Document Name *</Label><Input placeholder="e.g., Website Redesign SOW" value={data.name} onChange={(e) => updateData({ name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Project Name *</Label><Input placeholder="Project name" value={data.projectName} onChange={(e) => updateData({ projectName: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Client Name *</Label><Input placeholder="Client organization" value={data.clientName} onChange={(e) => updateData({ clientName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Contract Reference</Label><Input placeholder="e.g., MSA-2024-001" value={data.contractReference} onChange={(e) => updateData({ contractReference: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Effective Date</Label><Input type="date" value={data.effectiveDate} onChange={(e) => updateData({ effectiveDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Completion Date</Label><Input type="date" value={data.completionDate} onChange={(e) => updateData({ completionDate: e.target.value })} /></div>
            </div>
            <AIEnhancedField id="projectBackground" label="Project Background" value={data.projectBackground} onChange={(v) => updateData({ projectBackground: v })} placeholder="Provide context and background for this project..." type="textarea" rows={4} documentType="statement_of_work" fieldContext="project_background" additionalContext={{ project: data.projectName, client: data.clientName }} />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Scope & Objectives</h2><p className="text-muted-foreground text-sm">Define what is and isn&apos;t included</p></div>
            <AIEnhancedField id="objectives" label="Project Objectives" value={data.objectives} onChange={(v) => updateData({ objectives: v })} placeholder="List the key objectives this project aims to achieve..." type="textarea" rows={4} documentType="statement_of_work" fieldContext="objectives" additionalContext={{ project: data.projectName, client: data.clientName }} />
            <AIEnhancedField id="scopeOfWork" label="Scope of Work" value={data.scopeOfWork} onChange={(v) => updateData({ scopeOfWork: v })} placeholder="Describe the detailed scope of work to be performed..." type="textarea" rows={6} documentType="statement_of_work" fieldContext="scope" additionalContext={{ project: data.projectName, client: data.clientName, objectives: data.objectives }} />
            <AIEnhancedField id="outOfScope" label="Out of Scope" value={data.outOfScope} onChange={(v) => updateData({ outOfScope: v })} placeholder="Explicitly state what is NOT included in this SOW..." type="textarea" rows={3} documentType="statement_of_work" fieldContext="out_of_scope" additionalContext={{ project: data.projectName, scope: data.scopeOfWork }} />
            <AIEnhancedField id="assumptions" label="Assumptions" value={data.assumptions} onChange={(v) => updateData({ assumptions: v })} placeholder="List assumptions made in preparing this SOW..." type="textarea" rows={3} documentType="statement_of_work" fieldContext="assumptions" additionalContext={{ project: data.projectName }} />
            <AIEnhancedField id="constraints" label="Constraints" value={data.constraints} onChange={(v) => updateData({ constraints: v })} placeholder="Identify known constraints (budget, timeline, resources)..." type="textarea" rows={3} documentType="statement_of_work" fieldContext="constraints" additionalContext={{ project: data.projectName }} />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Deliverables & Milestones</h2><p className="text-muted-foreground text-sm">Define what will be delivered and when</p></div>
            <AIEnhancedField id="deliverables" label="Deliverables" value={data.deliverables} onChange={(v) => updateData({ deliverables: v })} placeholder="List all deliverables with descriptions..." type="textarea" rows={6} documentType="statement_of_work" fieldContext="deliverables" additionalContext={{ project: data.projectName, scope: data.scopeOfWork }} />
            <AIEnhancedField id="milestones" label="Milestones & Timeline" value={data.milestones} onChange={(v) => updateData({ milestones: v })} placeholder="Define project milestones with target dates..." type="textarea" rows={5} documentType="statement_of_work" fieldContext="milestones" additionalContext={{ project: data.projectName, deliverables: data.deliverables }} />
            <AIEnhancedField id="acceptanceCriteria" label="Acceptance Criteria" value={data.acceptanceCriteria} onChange={(v) => updateData({ acceptanceCriteria: v })} placeholder="Define criteria for accepting each deliverable..." type="textarea" rows={4} documentType="statement_of_work" fieldContext="acceptance_criteria" additionalContext={{ project: data.projectName, deliverables: data.deliverables }} />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Terms & Schedule</h2><p className="text-muted-foreground text-sm">Payment, change management, and communication</p></div>
            <div className="space-y-2">
              <Label>Total Value ($)</Label>
              <Input type="number" placeholder="0.00" value={data.totalValue || ""} onChange={(e) => updateData({ totalValue: parseFloat(e.target.value) || 0 })} />
            </div>
            <AIEnhancedField id="paymentSchedule" label="Payment Schedule" value={data.paymentSchedule} onChange={(v) => updateData({ paymentSchedule: v })} placeholder="Define payment milestones and schedule..." type="textarea" rows={4} documentType="statement_of_work" fieldContext="payment_schedule" additionalContext={{ project: data.projectName, totalValue: String(data.totalValue), milestones: data.milestones }} />
            <AIEnhancedField id="changeManagement" label="Change Management Process" value={data.changeManagement} onChange={(v) => updateData({ changeManagement: v })} placeholder="Describe the process for handling scope changes..." type="textarea" rows={4} documentType="statement_of_work" fieldContext="change_management" additionalContext={{ project: data.projectName }} />
            <AIEnhancedField id="communicationPlan" label="Communication Plan" value={data.communicationPlan} onChange={(v) => updateData({ communicationPlan: v })} placeholder="Define communication cadence, stakeholders, and reporting..." type="textarea" rows={4} documentType="statement_of_work" fieldContext="communication_plan" additionalContext={{ project: data.projectName, client: data.clientName }} />
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Review Statement of Work</h2><p className="text-muted-foreground text-sm">Review all information before completing</p></div>
            <Card>
              <CardHeader><CardTitle>{data.name || "Untitled SOW"}</CardTitle><CardDescription>{data.projectName} | {data.clientName} | ${data.totalValue?.toLocaleString() || "0"}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-muted-foreground">Background</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.projectBackground || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Objectives</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.objectives || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Scope of Work</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.scopeOfWork || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Deliverables</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.deliverables || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Milestones</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.milestones || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Payment Schedule</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.paymentSchedule || "Not provided"}</p></div>
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
