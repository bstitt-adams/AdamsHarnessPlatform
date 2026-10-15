"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wand2,
  Sparkles,
  Send,
  Save,
  Play,
  Clock,
  Mail,
  MessageSquare,
  Tag,
  ArrowRight,
  Loader2,
  FileText,
  Trash2,
} from "lucide-react";

// Types
interface WorkflowStep {
  type: 'email' | 'sms' | 'wait' | 'condition' | 'tag' | 'webhook' | 'internal_notification';
  delay?: number;
  delayUnit?: 'minutes' | 'hours' | 'days';
  subject?: string;
  content: string;
  tags?: string[];
}

interface GeneratedWorkflow {
  name: string;
  description: string;
  trigger: {
    type: string;
    config?: Record<string, unknown>;
  };
  steps: WorkflowStep[];
  estimatedDuration?: string;
  tags?: string[];
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultPrompt: string;
  suggestedType: string;
}

interface SavedWorkflow {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
}

export function AIWorkflowBuilder() {
  const [activeTab, setActiveTab] = useState("generate");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([]);
  
  // Generation form
  const [description, setDescription] = useState("");
  const [workflowType, setWorkflowType] = useState<string>("mixed");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customization, setCustomization] = useState("");
  const [industry, setIndustry] = useState("");
  
  // Generated workflow
  const [generatedWorkflow, setGeneratedWorkflow] = useState<GeneratedWorkflow | null>(null);
  
  // Conversation mode
  const [conversationMessages, setConversationMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [conversationInput, setConversationInput] = useState("");
  const [conversationWorkflow, setConversationWorkflow] = useState<GeneratedWorkflow | null>(null);

  // Fetch templates on mount
  useState(() => {
    fetchTemplates();
    fetchSavedWorkflows();
  });

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/ghl/generate-workflow");
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchSavedWorkflows = async () => {
    try {
      const response = await fetch("/api/ghl/workflows");
      const data = await response.json();
      if (data.success) {
        setSavedWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error("Error fetching workflows:", error);
    }
  };

  // Generate workflow
  const generateWorkflow = async () => {
    if (!description && !selectedTemplate) {
      alert("Please enter a description or select a template");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ghl/generate-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          type: workflowType,
          templateId: selectedTemplate || undefined,
          customization,
          industry,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedWorkflow(data.workflow);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // Save workflow
  const saveWorkflow = async () => {
    if (!generatedWorkflow) return;

    try {
      const response = await fetch("/api/ghl/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: generatedWorkflow.name,
          description: generatedWorkflow.description,
          workflow: generatedWorkflow,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert("Workflow saved successfully!");
        fetchSavedWorkflows();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Delete workflow
  const deleteWorkflow = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;

    try {
      const response = await fetch(`/api/ghl/workflows?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        fetchSavedWorkflows();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Conversation mode
  const sendConversationMessage = async () => {
    if (!conversationInput.trim()) return;

    const newMessage = { role: "user", content: conversationInput };
    const updatedMessages = [...conversationMessages, newMessage];
    setConversationMessages(updatedMessages);
    setConversationInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ghl/workflow-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          currentWorkflow: conversationWorkflow,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setConversationMessages([
          ...updatedMessages,
          { role: "assistant", content: data.response },
        ]);
        if (data.workflow) {
          setConversationWorkflow(data.workflow);
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // Get step icon
  const getStepIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />;
      case "sms": return <MessageSquare className="h-4 w-4" />;
      case "wait": return <Clock className="h-4 w-4" />;
      case "tag": return <Tag className="h-4 w-4" />;
      default: return <ArrowRight className="h-4 w-4" />;
    }
  };

  // Get step color
  const getStepColor = (type: string) => {
    switch (type) {
      case "email": return "bg-blue-100 text-blue-700 border-blue-200";
      case "sms": return "bg-green-100 text-green-700 border-green-200";
      case "wait": return "bg-sky-100 text-sky-700 border-sky-200";
      case "tag": return "bg-purple-100 text-purple-700 border-purple-200";
      case "condition": return "bg-orange-100 text-orange-700 border-orange-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6" />
            AI Workflow Builder
          </h2>
          <p className="text-muted-foreground">
            Generate GoHighLevel workflows using AI from plain language descriptions
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
          <TabsTrigger value="saved">Saved Workflows</TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Describe Your Workflow
                </CardTitle>
                <CardDescription>
                  Tell us what you want to automate and we'll generate a workflow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Template (Optional)</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Start from a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Create a 7-day email sequence for new leads that introduces our services and ends with a call-to-action to book a discovery call"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Workflow Type</Label>
                    <Select value={workflowType} onValueChange={setWorkflowType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email Only</SelectItem>
                        <SelectItem value="sms">SMS Only</SelectItem>
                        <SelectItem value="mixed">Mixed (Email + SMS)</SelectItem>
                        <SelectItem value="nurture">Nurture Sequence</SelectItem>
                        <SelectItem value="automation">Automation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry (Optional)</Label>
                    <Input
                      id="industry"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g., Manufacturing"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customization">Additional Requirements</Label>
                  <Textarea
                    id="customization"
                    value={customization}
                    onChange={(e) => setCustomization(e.target.value)}
                    placeholder="Any specific requirements or customizations..."
                    rows={2}
                  />
                </div>

                <Button
                  onClick={generateWorkflow}
                  disabled={loading || (!description && !selectedTemplate)}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Generate Workflow
                </Button>

                {/* Example prompts */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Example prompts:</p>
                  <div className="space-y-2">
                    {[
                      "Welcome series for new OEM prospects with 3 emails over 5 days",
                      "Abandoned quote follow-up with 3 reminders",
                      "Post-meeting follow-up sequence with next steps",
                      "Re-engagement campaign for inactive contacts",
                    ].map((example, i) => (
                      <button
                        key={i}
                        onClick={() => setDescription(example)}
                        className="block w-full text-left text-sm p-2 rounded bg-muted hover:bg-muted/80 transition-colors"
                      >
                        "{example}"
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generated Workflow Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generated Workflow
                </CardTitle>
                <CardDescription>
                  Preview and save your generated workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!generatedWorkflow ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Your generated workflow will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{generatedWorkflow.name}</h3>
                      <p className="text-sm text-muted-foreground">{generatedWorkflow.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        Trigger: {generatedWorkflow.trigger.type}
                      </Badge>
                      {generatedWorkflow.estimatedDuration && (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {generatedWorkflow.estimatedDuration}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Steps ({generatedWorkflow.steps.length})</p>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {generatedWorkflow.steps.map((step, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border ${getStepColor(step.type)}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {getStepIcon(step.type)}
                              <span className="font-medium capitalize">{step.type}</span>
                              {step.delay && (
                                <Badge variant="outline" className="ml-auto text-xs">
                                  Wait {step.delay} {step.delayUnit || 'hours'}
                                </Badge>
                              )}
                            </div>
                            {step.subject && (
                              <p className="text-sm font-medium">{step.subject}</p>
                            )}
                            <p className="text-sm opacity-80 line-clamp-2">{step.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button onClick={saveWorkflow} className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Save Workflow
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Play className="h-4 w-4 mr-2" />
                        Deploy to GHL
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conversation Tab */}
        <TabsContent value="conversation" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>Workflow Assistant</CardTitle>
                <CardDescription>
                  Chat with AI to build your workflow step by step
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {conversationMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Start a conversation to build your workflow</p>
                      <p className="text-sm mt-2">Try: "I need a welcome sequence for new leads"</p>
                    </div>
                  ) : (
                    conversationMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground ml-8"
                            : "bg-muted mr-8"
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={conversationInput}
                    onChange={(e) => setConversationInput(e.target.value)}
                    placeholder="Describe what you want..."
                    onKeyDown={(e) => e.key === "Enter" && sendConversationMessage()}
                  />
                  <Button onClick={sendConversationMessage} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>Current Workflow</CardTitle>
                <CardDescription>
                  Your workflow updates as you chat
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!conversationWorkflow ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Workflow will appear here as you build it</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-semibold">{conversationWorkflow.name}</h3>
                    <p className="text-sm text-muted-foreground">{conversationWorkflow.description}</p>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      {conversationWorkflow.steps.map((step, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${getStepColor(step.type)}`}
                        >
                          <div className="flex items-center gap-2">
                            {getStepIcon(step.type)}
                            <span className="font-medium capitalize">{step.type}</span>
                          </div>
                          <p className="text-sm mt-1 line-clamp-2">{step.content}</p>
                        </div>
                      ))}
                    </div>
                    <Button onClick={() => setGeneratedWorkflow(conversationWorkflow)} className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      Save This Workflow
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Saved Workflows Tab */}
        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Workflows</CardTitle>
              <CardDescription>
                Your saved AI-generated workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedWorkflows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No saved workflows yet</p>
                  <p className="text-sm mt-2">Generate and save a workflow to see it here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedWorkflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{workflow.name}</h4>
                        <p className="text-sm text-muted-foreground">{workflow.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{workflow.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Created: {new Date(workflow.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          Deploy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteWorkflow(workflow.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
