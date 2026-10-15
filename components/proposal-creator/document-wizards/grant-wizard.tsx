"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Building,
  Target,
  DollarSign,
  Users,
  BarChart3,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AIEnhancedField } from "@/components/proposal-creator/ai-enhanced-field";
import { FUNDING_SOURCES, ENTITY_ROLES, COLLECTION_FREQUENCIES } from "@/lib/types/proposal";

interface GrantWizardProps {
  onComplete: (data: GrantData) => void;
  onCancel: () => void;
  initialData?: Partial<GrantData>;
}

export interface GrantData {
  name: string;
  description: string;
  objectives: string;
  methodology: string;
  impact: string;
  sustainability: string;
  fundingSource: string;
  referenceNumber: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  budgetJustification: string;
  entities: GrantEntity[];
  milestones: GrantMilestone[];
  dataCollection: DataCollectionMethod[];
}

interface GrantEntity {
  id: string;
  name: string;
  role: string;
  description: string;
  contactName: string;
  contactEmail: string;
}

interface GrantMilestone {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  deliverables: string;
}

interface DataCollectionMethod {
  id: string;
  name: string;
  description: string;
  frequency: string;
  responsibleEntity: string;
}

const STEPS = [
  { id: 1, title: "Basic Info", icon: FileText },
  { id: 2, title: "Objectives & Methodology", icon: Target },
  { id: 3, title: "Budget", icon: DollarSign },
  { id: 4, title: "Entities", icon: Building },
  { id: 5, title: "Milestones", icon: BarChart3 },
  { id: 6, title: "Data Collection", icon: Users },
  { id: 7, title: "Review", icon: Check },
];

const emptyData: GrantData = {
  name: "",
  description: "",
  objectives: "",
  methodology: "",
  impact: "",
  sustainability: "",
  fundingSource: "",
  referenceNumber: "",
  startDate: "",
  endDate: "",
  totalBudget: 0,
  budgetJustification: "",
  entities: [],
  milestones: [],
  dataCollection: [],
};

export function GrantWizard({ onComplete, onCancel, initialData }: GrantWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<GrantData>({ ...emptyData, ...initialData });
  const [isSaving, setIsSaving] = useState(false);

  const updateData = (updates: Partial<GrantData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const addEntity = () => {
    const newEntity: GrantEntity = {
      id: "entity-" + Date.now(),
      name: "",
      role: "partner",
      description: "",
      contactName: "",
      contactEmail: "",
    };
    updateData({ entities: [...data.entities, newEntity] });
  };

  const updateEntity = (id: string, updates: Partial<GrantEntity>) => {
    updateData({
      entities: data.entities.map(e => e.id === id ? { ...e, ...updates } : e),
    });
  };

  const removeEntity = (id: string) => {
    updateData({ entities: data.entities.filter(e => e.id !== id) });
  };

  const addMilestone = () => {
    const newMilestone: GrantMilestone = {
      id: "milestone-" + Date.now(),
      name: "",
      description: "",
      dueDate: "",
      deliverables: "",
    };
    updateData({ milestones: [...data.milestones, newMilestone] });
  };

  const updateMilestone = (id: string, updates: Partial<GrantMilestone>) => {
    updateData({
      milestones: data.milestones.map(m => m.id === id ? { ...m, ...updates } : m),
    });
  };

  const removeMilestone = (id: string) => {
    updateData({ milestones: data.milestones.filter(m => m.id !== id) });
  };

  const addDataMethod = () => {
    const newMethod: DataCollectionMethod = {
      id: "method-" + Date.now(),
      name: "",
      description: "",
      frequency: "monthly",
      responsibleEntity: "",
    };
    updateData({ dataCollection: [...data.dataCollection, newMethod] });
  };

  const updateDataMethod = (id: string, updates: Partial<DataCollectionMethod>) => {
    updateData({
      dataCollection: data.dataCollection.map(m => m.id === id ? { ...m, ...updates } : m),
    });
  };

  const removeDataMethod = (id: string) => {
    updateData({ dataCollection: data.dataCollection.filter(m => m.id !== id) });
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
        {STEPS.map((step, index) => {
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
              <h2 className="text-xl font-semibold mb-1">Grant Application Details</h2>
              <p className="text-muted-foreground text-sm">Enter the basic information about your grant application</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grant Name *</Label>
                <Input
                  placeholder="Enter grant name"
                  value={data.name}
                  onChange={(e) => updateData({ name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  placeholder="Grant/RFP number"
                  value={data.referenceNumber}
                  onChange={(e) => updateData({ referenceNumber: e.target.value })}
                />
              </div>
            </div>

            <AIEnhancedField
              id="description"
              label="Project Description"
              value={data.description}
              onChange={(v) => updateData({ description: v })}
              placeholder="Describe the project and its goals..."
              type="textarea"
              rows={4}
              documentType="grant"
              fieldContext="description"
              additionalContext={{ name: data.name }}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Funding Source</Label>
                <Select value={data.fundingSource} onValueChange={(v) => updateData({ fundingSource: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select funding source" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNDING_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Budget ($)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={data.totalBudget || ""}
                  onChange={(e) => updateData({ totalBudget: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={data.startDate}
                  onChange={(e) => updateData({ startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={data.endDate}
                  onChange={(e) => updateData({ endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Objectives & Methodology */}
        {currentStep === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-semibold mb-1">Objectives & Methodology</h2>
              <p className="text-muted-foreground text-sm">Define your project objectives and approach</p>
            </div>

            <AIEnhancedField
              id="objectives"
              label="Project Objectives"
              value={data.objectives}
              onChange={(v) => updateData({ objectives: v })}
              placeholder="List your SMART objectives..."
              type="textarea"
              rows={5}
              documentType="grant"
              fieldContext="objectives"
              additionalContext={{ name: data.name, description: data.description }}
              helpText="Use SMART criteria: Specific, Measurable, Achievable, Relevant, Time-bound"
            />

            <AIEnhancedField
              id="methodology"
              label="Methodology"
              value={data.methodology}
              onChange={(v) => updateData({ methodology: v })}
              placeholder="Describe your approach and methods..."
              type="textarea"
              rows={5}
              documentType="grant"
              fieldContext="methodology"
              additionalContext={{ name: data.name, objectives: data.objectives }}
            />

            <AIEnhancedField
              id="impact"
              label="Expected Impact"
              value={data.impact}
              onChange={(v) => updateData({ impact: v })}
              placeholder="Describe the expected outcomes and impact..."
              type="textarea"
              rows={4}
              documentType="grant"
              fieldContext="impact"
              additionalContext={{ name: data.name, objectives: data.objectives }}
            />

            <AIEnhancedField
              id="sustainability"
              label="Sustainability Plan"
              value={data.sustainability}
              onChange={(v) => updateData({ sustainability: v })}
              placeholder="How will the project continue after funding ends?"
              type="textarea"
              rows={4}
              documentType="grant"
              fieldContext="sustainability"
              additionalContext={{ name: data.name }}
            />
          </div>
        )}

        {/* Step 3: Budget */}
        {currentStep === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-semibold mb-1">Budget Details</h2>
              <p className="text-muted-foreground text-sm">Provide budget breakdown and justification</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  ${data.totalBudget.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <AIEnhancedField
              id="budgetJustification"
              label="Budget Justification"
              value={data.budgetJustification}
              onChange={(v) => updateData({ budgetJustification: v })}
              placeholder="Explain how funds will be allocated and why..."
              type="textarea"
              rows={6}
              documentType="grant"
              fieldContext="budget_justification"
              additionalContext={{ 
                name: data.name, 
                budget: data.totalBudget.toString(),
                objectives: data.objectives,
              }}
              helpText="Include personnel, equipment, supplies, travel, and other costs"
            />
          </div>
        )}

        {/* Step 4: Entities */}
        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">Collaborating Entities</h2>
                <p className="text-muted-foreground text-sm">Add organizations involved in the project</p>
              </div>
              <Button onClick={addEntity}>
                <Plus className="mr-2 h-4 w-4" />
                Add Entity
              </Button>
            </div>

            {data.entities.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Building className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No entities added yet</p>
                  <Button variant="outline" className="mt-4" onClick={addEntity}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Entity
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.entities.map((entity, index) => (
                  <Card key={entity.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Entity {index + 1}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => removeEntity(entity.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Organization Name</Label>
                          <Input
                            placeholder="Organization name"
                            value={entity.name}
                            onChange={(e) => updateEntity(entity.id, { name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select 
                            value={entity.role} 
                            onValueChange={(v) => updateEntity(entity.id, { role: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ENTITY_ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <AIEnhancedField
                        id={"entity-desc-" + entity.id}
                        label="Responsibilities"
                        value={entity.description}
                        onChange={(v) => updateEntity(entity.id, { description: v })}
                        placeholder="Describe their role and responsibilities..."
                        type="textarea"
                        rows={2}
                        documentType="grant"
                        fieldContext="entity_responsibilities"
                        additionalContext={{ name: entity.name, role: entity.role }}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Contact Name</Label>
                          <Input
                            placeholder="Contact person"
                            value={entity.contactName}
                            onChange={(e) => updateEntity(entity.id, { contactName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Contact Email</Label>
                          <Input
                            type="email"
                            placeholder="email@organization.com"
                            value={entity.contactEmail}
                            onChange={(e) => updateEntity(entity.id, { contactEmail: e.target.value })}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Milestones */}
        {currentStep === 5 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">Project Milestones</h2>
                <p className="text-muted-foreground text-sm">Define key milestones and deliverables</p>
              </div>
              <Button onClick={addMilestone}>
                <Plus className="mr-2 h-4 w-4" />
                Add Milestone
              </Button>
            </div>

            {data.milestones.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No milestones added yet</p>
                  <Button variant="outline" className="mt-4" onClick={addMilestone}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Milestone
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.milestones.map((milestone, index) => (
                  <Card key={milestone.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Milestone {index + 1}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => removeMilestone(milestone.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Milestone Name</Label>
                          <Input
                            placeholder="Milestone name"
                            value={milestone.name}
                            onChange={(e) => updateMilestone(milestone.id, { name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Due Date</Label>
                          <Input
                            type="date"
                            value={milestone.dueDate}
                            onChange={(e) => updateMilestone(milestone.id, { dueDate: e.target.value })}
                          />
                        </div>
                      </div>

                      <AIEnhancedField
                        id={"milestone-desc-" + milestone.id}
                        label="Description"
                        value={milestone.description}
                        onChange={(v) => updateMilestone(milestone.id, { description: v })}
                        placeholder="Describe this milestone..."
                        type="textarea"
                        rows={2}
                        documentType="grant"
                        fieldContext="milestone_description"
                        additionalContext={{ name: milestone.name }}
                      />

                      <AIEnhancedField
                        id={"milestone-deliv-" + milestone.id}
                        label="Deliverables"
                        value={milestone.deliverables}
                        onChange={(v) => updateMilestone(milestone.id, { deliverables: v })}
                        placeholder="List expected deliverables..."
                        type="textarea"
                        rows={2}
                        documentType="grant"
                        fieldContext="milestone_deliverables"
                        additionalContext={{ name: milestone.name, description: milestone.description }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 6: Data Collection */}
        {currentStep === 6 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">Data Collection Methods</h2>
                <p className="text-muted-foreground text-sm">Define how project data will be collected</p>
              </div>
              <Button onClick={addDataMethod}>
                <Plus className="mr-2 h-4 w-4" />
                Add Method
              </Button>
            </div>

            {data.dataCollection.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No data collection methods added yet</p>
                  <Button variant="outline" className="mt-4" onClick={addDataMethod}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Method
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.dataCollection.map((method, index) => (
                  <Card key={method.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Method {index + 1}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => removeDataMethod(method.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Method Name</Label>
                          <Input
                            placeholder="e.g., Survey, Interview, Observation"
                            value={method.name}
                            onChange={(e) => updateDataMethod(method.id, { name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select 
                            value={method.frequency} 
                            onValueChange={(v) => updateDataMethod(method.id, { frequency: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COLLECTION_FREQUENCIES.map((freq) => (
                                <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <AIEnhancedField
                        id={"method-desc-" + method.id}
                        label="Description"
                        value={method.description}
                        onChange={(v) => updateDataMethod(method.id, { description: v })}
                        placeholder="Describe this data collection method..."
                        type="textarea"
                        rows={2}
                        documentType="grant"
                        fieldContext="data_collection_description"
                        additionalContext={{ name: method.name, frequency: method.frequency }}
                      />

                      <div className="space-y-2">
                        <Label>Responsible Entity</Label>
                        <Select 
                          value={method.responsibleEntity} 
                          onValueChange={(v) => updateDataMethod(method.id, { responsibleEntity: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select responsible entity" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.entities.map((entity) => (
                              <SelectItem key={entity.id} value={entity.id}>{entity.name || "Unnamed Entity"}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 7: Review */}
        {currentStep === 7 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-semibold mb-1">Review Your Grant Application</h2>
              <p className="text-muted-foreground text-sm">Review all information before submitting</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{data.name || "Untitled Grant"}</CardTitle>
                <CardDescription>{data.fundingSource} | ${data.totalBudget.toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{data.description || "No description provided"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Objectives</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{data.objectives || "No objectives provided"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Start Date</Label>
                    <p className="text-sm mt-1">{data.startDate || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">End Date</Label>
                    <p className="text-sm mt-1">{data.endDate || "Not set"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{data.entities.length}</p>
                      <p className="text-xs text-muted-foreground">Entities</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{data.milestones.length}</p>
                      <p className="text-xs text-muted-foreground">Milestones</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{data.dataCollection.length}</p>
                      <p className="text-xs text-muted-foreground">Data Methods</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {data.entities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Collaborating Entities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.entities.map((entity) => (
                      <Badge key={entity.id} variant="secondary">
                        {entity.name || "Unnamed"} - {entity.role}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.milestones.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Project Milestones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.milestones.map((milestone, index) => (
                      <div key={milestone.id} className="flex items-center justify-between text-sm">
                        <span>{index + 1}. {milestone.name || "Unnamed Milestone"}</span>
                        <span className="text-muted-foreground">{milestone.dueDate || "No date"}</span>
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
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
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
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
