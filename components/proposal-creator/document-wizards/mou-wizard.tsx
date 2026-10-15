"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Target, Users, Check, ChevronRight, ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIEnhancedField } from "@/components/proposal-creator/ai-enhanced-field";

interface MOUWizardProps {
  onComplete: (data: MOUData) => void;
  onCancel: () => void;
  initialData?: Partial<MOUData>;
}

export interface MOUData {
  name: string;
  background: string;
  objectives: string;
  commitments: string;
  governance: string;
  resources: string;
  effectiveDate: string;
  duration: string;
  reviewPeriod: string;
  parties: MOUParty[];
}

interface MOUParty {
  id: string;
  name: string;
  organization: string;
  role: string;
  contactName: string;
  contactEmail: string;
}

const STEPS = [
  { id: 1, title: "Basic Info", icon: FileText },
  { id: 2, title: "Objectives", icon: Target },
  { id: 3, title: "Parties", icon: Users },
  { id: 4, title: "Review", icon: Check },
];

const emptyData: MOUData = {
  name: "", background: "", objectives: "", commitments: "", governance: "", resources: "",
  effectiveDate: "", duration: "1 year", reviewPeriod: "annually", parties: [],
};

export function MOUWizard({ onComplete, onCancel, initialData }: MOUWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<MOUData>({ ...emptyData, ...initialData });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = (updates: Partial<MOUData>) => setData(prev => ({ ...prev, ...updates }));
  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const addParty = () => {
    updateData({ parties: [...data.parties, { id: "party-" + Date.now(), name: "", organization: "", role: "", contactName: "", contactEmail: "" }] });
  };
  const updateParty = (id: string, updates: Partial<MOUParty>) => {
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
            <div><h2 className="text-xl font-semibold mb-1">Memorandum of Understanding</h2><p className="text-muted-foreground text-sm">Enter basic MOU information</p></div>
            <div className="space-y-2"><Label>MOU Name *</Label><Input placeholder="e.g., Strategic Partnership MOU" value={data.name} onChange={(e) => updateData({ name: e.target.value })} /></div>
            <AIEnhancedField id="background" label="Background" value={data.background} onChange={(v) => updateData({ background: v })} placeholder="Provide context and background for this MOU..." type="textarea" rows={4} documentType="mou" fieldContext="background" additionalContext={{ name: data.name }} />
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Effective Date</Label><Input type="date" value={data.effectiveDate} onChange={(e) => updateData({ effectiveDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Duration</Label><Input placeholder="e.g., 2 years" value={data.duration} onChange={(e) => updateData({ duration: e.target.value })} /></div>
              <div className="space-y-2"><Label>Review Period</Label><Input placeholder="e.g., annually" value={data.reviewPeriod} onChange={(e) => updateData({ reviewPeriod: e.target.value })} /></div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Objectives & Commitments</h2><p className="text-muted-foreground text-sm">Define shared objectives and commitments</p></div>
            <AIEnhancedField id="objectives" label="Shared Objectives" value={data.objectives} onChange={(v) => updateData({ objectives: v })} placeholder="Define the shared objectives of this MOU..." type="textarea" rows={5} documentType="mou" fieldContext="objectives" additionalContext={{ name: data.name, background: data.background }} />
            <AIEnhancedField id="commitments" label="Commitments" value={data.commitments} onChange={(v) => updateData({ commitments: v })} placeholder="Define commitments from each party..." type="textarea" rows={5} documentType="mou" fieldContext="commitments" additionalContext={{ name: data.name, objectives: data.objectives }} />
            <AIEnhancedField id="governance" label="Governance Structure" value={data.governance} onChange={(v) => updateData({ governance: v })} placeholder="Describe how the partnership will be governed..." type="textarea" rows={4} documentType="mou" fieldContext="governance" additionalContext={{ name: data.name }} />
            <AIEnhancedField id="resources" label="Resource Commitments" value={data.resources} onChange={(v) => updateData({ resources: v })} placeholder="Specify resources each party will contribute..." type="textarea" rows={4} documentType="mou" fieldContext="resources" additionalContext={{ name: data.name }} />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-semibold mb-1">Parties</h2><p className="text-muted-foreground text-sm">Add parties to this MOU</p></div>
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
                        <div className="space-y-2"><Label>Organization Name</Label><Input placeholder="Organization name" value={party.organization} onChange={(e) => updateParty(party.id, { organization: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Role in MOU</Label><Input placeholder="e.g., Lead Partner" value={party.role} onChange={(e) => updateParty(party.id, { role: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Contact Name</Label><Input placeholder="Primary contact" value={party.contactName} onChange={(e) => updateParty(party.id, { contactName: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Contact Email</Label><Input type="email" placeholder="email@org.com" value={party.contactEmail} onChange={(e) => updateParty(party.id, { contactEmail: e.target.value })} /></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div><h2 className="text-xl font-semibold mb-1">Review Your MOU</h2><p className="text-muted-foreground text-sm">Review all information before completing</p></div>
            <Card>
              <CardHeader><CardTitle>{data.name || "Untitled MOU"}</CardTitle><CardDescription>{data.duration} | {data.parties.length} parties</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-muted-foreground">Background</Label><p className="text-sm mt-1">{data.background || "Not provided"}</p></div>
                <div><Label className="text-muted-foreground">Objectives</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.objectives || "Not defined"}</p></div>
                <div><Label className="text-muted-foreground">Commitments</Label><p className="text-sm mt-1 whitespace-pre-wrap">{data.commitments || "Not defined"}</p></div>
              </CardContent>
            </Card>
            {data.parties.length > 0 && (
              <Card><CardHeader><CardTitle className="text-base">Parties ({data.parties.length})</CardTitle></CardHeader><CardContent><div className="space-y-2">{data.parties.map((party) => (<div key={party.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"><span className="font-medium">{party.organization || "Unnamed"}</span><span className="text-muted-foreground">{party.role}</span></div>))}</div></CardContent></Card>
            )}
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
