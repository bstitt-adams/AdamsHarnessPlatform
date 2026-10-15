"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Brain,
  Sparkles,
  Send,
  Loader2,
  Crown,
  Building2,
  Factory,
  DollarSign,
  Target,
  Users,
  TrendingUp,
  ClipboardList,
  CheckCircle,
  Play,
  FileText,
  Download,
  Share2,
  Bot,
  Zap,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Lightbulb,
  BarChart3,
  Settings,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mary the Adams Analyst - AI Facilitator Configuration
const MARY_CONFIG = {
  name: "Mary",
  title: "Business Analyst",
  avatar: "👩‍💼",
  color: "#8b5cf6",
  description: "Your AI-powered strategic planning facilitator who guides structured brainstorming sessions and generates actionable insights.",
  systemPrompt: `You are Mary, the Adams Electric Analyst - an expert AI facilitator specializing in strategic business planning. Your role is to:

1. FACILITATE structured brainstorming sessions by asking probing questions
2. GATHER comprehensive information through guided discovery
3. ANALYZE responses to identify patterns, risks, and opportunities
4. SYNTHESIZE findings into actionable recommendations
5. GENERATE detailed reports with clear action items

Your communication style is:
- Professional yet approachable
- Asks one focused question at a time
- Provides context for why each question matters
- Summarizes key points before moving to new topics
- Offers insights and recommendations based on best practices

Always structure your facilitation around:
- Current state assessment
- Goal identification
- Gap analysis
- Resource evaluation
- Risk assessment
- Action planning
- Success metrics`,
};

// Planning Tool Categories and Types
const PLANNING_CATEGORIES = [
  {
    id: "c-suite",
    name: "C-Suite Planning Tools",
    description: "Strategic planning tools for executive leadership",
    icon: Crown,
    color: "bg-purple-500",
    tools: [
      {
        id: "ceo-planning",
        name: "CEO Planning Tool",
        description: "Vision, strategy, and organizational leadership planning",
        icon: Crown,
        color: "#8b5cf6",
        focusAreas: ["Vision & Mission", "Strategic Direction", "Stakeholder Management", "Culture & Values", "Board Relations"],
        sampleQuestions: [
          "What is your 3-5 year vision for the organization?",
          "What are the key strategic priorities for this quarter?",
          "How do you measure organizational success?",
        ],
      },
      {
        id: "coo-planning",
        name: "COO Planning Tool",
        description: "Operations excellence and process optimization planning",
        icon: Settings,
        color: "#06b6d4",
        focusAreas: ["Operational Efficiency", "Process Optimization", "Resource Allocation", "Quality Management", "Supply Chain"],
        sampleQuestions: [
          "What are your current operational bottlenecks?",
          "How do you measure operational efficiency?",
          "What processes need immediate improvement?",
        ],
      },
      {
        id: "cro-planning",
        name: "CRO Planning Tool",
        description: "Revenue growth and sales strategy planning",
        icon: TrendingUp,
        color: "#10b981",
        focusAreas: ["Revenue Targets", "Sales Strategy", "Market Expansion", "Customer Acquisition", "Pricing Strategy"],
        sampleQuestions: [
          "What are your revenue targets for this fiscal year?",
          "Which market segments show the most growth potential?",
          "What is your current customer acquisition cost?",
        ],
      },
      {
        id: "cto-planning",
        name: "CTO Planning Tool",
        description: "Technology strategy and digital transformation planning",
        icon: Zap,
        color: "#f59e0b",
        focusAreas: ["Technology Roadmap", "Digital Transformation", "Infrastructure", "Security & Compliance", "Innovation"],
        sampleQuestions: [
          "What is your technology modernization priority?",
          "How does technology support business objectives?",
          "What are your biggest technical debt items?",
        ],
      },
    ],
  },
  {
    id: "finance",
    name: "Finance Planning Tools",
    description: "Financial planning and analysis tools",
    icon: DollarSign,
    color: "bg-green-500",
    tools: [
      {
        id: "financial-planning",
        name: "Financial Planning & Analysis",
        description: "Budgeting, forecasting, and financial strategy",
        icon: BarChart3,
        color: "#22c55e",
        focusAreas: ["Budget Planning", "Cash Flow Management", "Financial Forecasting", "Cost Optimization", "Investment Analysis"],
        sampleQuestions: [
          "What are your key financial objectives for this period?",
          "How do you approach budget variance analysis?",
          "What are your major cost drivers?",
        ],
      },
      {
        id: "treasury-planning",
        name: "Treasury & Cash Management",
        description: "Liquidity and working capital optimization",
        icon: DollarSign,
        color: "#14b8a6",
        focusAreas: ["Cash Position", "Working Capital", "Debt Management", "Investment Strategy", "Risk Hedging"],
        sampleQuestions: [
          "What is your target cash reserve level?",
          "How do you optimize working capital?",
          "What are your debt covenant requirements?",
        ],
      },
      {
        id: "controller-planning",
        name: "Controller Planning Tool",
        description: "Accounting operations and compliance planning",
        icon: ClipboardList,
        color: "#0ea5e9",
        focusAreas: ["Close Process", "Compliance", "Internal Controls", "Audit Preparation", "Reporting Accuracy"],
        sampleQuestions: [
          "What is your current close cycle time?",
          "What compliance requirements are most challenging?",
          "How do you ensure reporting accuracy?",
        ],
      },
    ],
  },
];

// Session phases for structured brainstorming
const SESSION_PHASES = [
  { id: "discovery", name: "Discovery", description: "Understanding current state and context" },
  { id: "goals", name: "Goal Setting", description: "Defining objectives and success criteria" },
  { id: "analysis", name: "Analysis", description: "Identifying gaps, risks, and opportunities" },
  { id: "planning", name: "Action Planning", description: "Developing actionable strategies" },
  { id: "review", name: "Review & Refine", description: "Finalizing recommendations" },
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  phase?: string;
  actionItems?: ActionItem[];
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  assignTo?: string;
  dueDate?: string;
  status: "pending" | "in_progress" | "completed";
  aiWorkforceAgent?: string;
}

interface PlanningSession {
  id: string;
  toolId: string;
  toolName: string;
  startedAt: Date;
  currentPhase: string;
  messages: ChatMessage[];
  actionItems: ActionItem[];
  report?: string;
  status: "active" | "completed" | "paused";
}

export default function BusinessPlanningPage() {
  const [activeTab, setActiveTab] = useState("tools");
  const [selectedTool, setSelectedTool] = useState<typeof PLANNING_CATEGORIES[0]["tools"][0] | null>(null);
  const [currentSession, setCurrentSession] = useState<PlanningSession | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showHandoffDialog, setShowHandoffDialog] = useState(false);
  const [selectedActionItem, setSelectedActionItem] = useState<ActionItem | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages]);

  const startSession = (tool: typeof PLANNING_CATEGORIES[0]["tools"][0]) => {
    setSelectedTool(tool);
    const newSession: PlanningSession = {
      id: `session-${Date.now()}`,
      toolId: tool.id,
      toolName: tool.name,
      startedAt: new Date(),
      currentPhase: "discovery",
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: `Hello! I'm Mary, your BMad Business Analyst. I'll be facilitating your ${tool.name} session today.

**Our session will cover these key areas:**
${tool.focusAreas.map((area, i) => `${i + 1}. ${area}`).join("\n")}

We'll work through a structured process:
1. **Discovery** - Understanding your current state
2. **Goal Setting** - Defining what success looks like
3. **Analysis** - Identifying gaps and opportunities
4. **Action Planning** - Creating actionable strategies
5. **Review** - Finalizing recommendations

Let's begin with Discovery. ${tool.sampleQuestions[0]}`,
          timestamp: new Date(),
          phase: "discovery",
        },
      ],
      actionItems: [],
      status: "active",
    };
    setCurrentSession(newSession);
    setActiveTab("session");
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
      phase: currentSession.currentPhase,
    };

    setCurrentSession((prev) => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage],
    } : null);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Build context for Mary
      const systemPrompt = `${MARY_CONFIG.systemPrompt}

Current Planning Tool: ${selectedTool?.name}
Focus Areas: ${selectedTool?.focusAreas.join(", ")}
Current Phase: ${currentSession.currentPhase}
Session Context: This is a ${selectedTool?.description} session.

Based on the conversation, continue facilitating the brainstorming session. Ask follow-up questions, provide insights, and when appropriate, suggest action items. Format action items as:
[ACTION ITEM] Title: Description | Priority: high/medium/low

When you identify that a phase is complete, indicate readiness to move to the next phase.`;

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          systemPrompt,
          conversationHistory: currentSession.messages.slice(-10),
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      const responseContent = data.response || "I apologize, but I couldn't generate a response. Please try again.";

      // Parse action items from response
      const actionItemRegex = /\[ACTION ITEM\]\s*(.+?):\s*(.+?)\s*\|\s*Priority:\s*(high|medium|low)/gi;
      const newActionItems: ActionItem[] = [];
      let match;
      while ((match = actionItemRegex.exec(responseContent)) !== null) {
        newActionItems.push({
          id: `action-${Date.now()}-${newActionItems.length}`,
          title: match[1].trim(),
          description: match[2].trim(),
          priority: match[3].toLowerCase() as "high" | "medium" | "low",
          status: "pending",
        });
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-response`,
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
        phase: currentSession.currentPhase,
        actionItems: newActionItems.length > 0 ? newActionItems : undefined,
      };

      setCurrentSession((prev) => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMessage],
        actionItems: [...prev.actionItems, ...newActionItems],
      } : null);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: "I apologize, but I encountered an error. Please check your LLM configuration in Settings and try again.",
        timestamp: new Date(),
      };
      setCurrentSession((prev) => prev ? {
        ...prev,
        messages: [...prev.messages, errorMessage],
      } : null);
    } finally {
      setIsLoading(false);
    }
  };

  const advancePhase = () => {
    if (!currentSession) return;
    const currentIndex = SESSION_PHASES.findIndex((p) => p.id === currentSession.currentPhase);
    if (currentIndex < SESSION_PHASES.length - 1) {
      const nextPhase = SESSION_PHASES[currentIndex + 1];
      setCurrentSession((prev) => prev ? {
        ...prev,
        currentPhase: nextPhase.id,
        messages: [
          ...prev.messages,
          {
            id: `msg-${Date.now()}-phase`,
            role: "system",
            content: `--- Moving to ${nextPhase.name} Phase ---\n${nextPhase.description}`,
            timestamp: new Date(),
            phase: nextPhase.id,
          },
        ],
      } : null);
    }
  };

  const generateReport = async () => {
    if (!currentSession) return;
    setIsLoading(true);

    try {
      const reportPrompt = `Based on the following planning session, generate a comprehensive executive report:

Tool: ${currentSession.toolName}
Session Duration: ${Math.round((new Date().getTime() - currentSession.startedAt.getTime()) / 60000)} minutes

Conversation Summary:
${currentSession.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n")}

Action Items Identified:
${currentSession.actionItems.map((a) => `- [${a.priority.toUpperCase()}] ${a.title}: ${a.description}`).join("\n")}

Generate a structured report with:
1. Executive Summary
2. Key Findings
3. Recommendations
4. Action Items with Priorities
5. Next Steps
6. Success Metrics`;

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Generate the planning session report",
          systemPrompt: reportPrompt,
          conversationHistory: [],
        }),
      });

      if (!response.ok) throw new Error("Failed to generate report");

      const data = await response.json();
      setCurrentSession((prev) => prev ? {
        ...prev,
        report: data.response,
        status: "completed",
      } : null);
      setShowReportDialog(true);
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handoffToAIWorkforce = (actionItem: ActionItem) => {
    setSelectedActionItem(actionItem);
    setShowHandoffDialog(true);
  };

  const executeHandoff = async (agentType: string) => {
    if (!selectedActionItem) return;

    // Update action item with assigned agent
    setCurrentSession((prev) => prev ? {
      ...prev,
      actionItems: prev.actionItems.map((a) =>
        a.id === selectedActionItem.id
          ? { ...a, aiWorkforceAgent: agentType, status: "in_progress" as const }
          : a
      ),
    } : null);

    setShowHandoffDialog(false);
    setSelectedActionItem(null);

    // In a real implementation, this would create a task in the AI Workforce system
    // and potentially trigger automated workflows
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/portal/adams-tools">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-7 w-7 text-purple-500" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Business Planning Tools
              </h1>
            </div>
            <p className="text-muted-foreground">
              AI-facilitated strategic planning with Mary, your Adams Business Analyst
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
            <span className="text-2xl">{MARY_CONFIG.avatar}</span>
            <div>
              <p className="text-sm font-medium text-purple-700">{MARY_CONFIG.name}</p>
              <p className="text-xs text-purple-500">{MARY_CONFIG.title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tools">Planning Tools</TabsTrigger>
          <TabsTrigger value="session" disabled={!currentSession}>
            Active Session
            {currentSession && <Badge variant="secondary" className="ml-2">Live</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history">Session History</TabsTrigger>
          <TabsTrigger value="integration">AI Workforce Integration</TabsTrigger>
        </TabsList>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-8">
          {PLANNING_CATEGORIES.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.color} text-white`}>
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{category.name}</h2>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {category.tools.map((tool) => {
                    const ToolIcon = tool.icon;
                    return (
                      <Card key={tool.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div
                              className="p-2 rounded-lg text-white"
                              style={{ backgroundColor: tool.color }}
                            >
                              <ToolIcon className="h-5 w-5" />
                            </div>
                            <Badge variant="outline">AI Facilitated</Badge>
                          </div>
                          <CardTitle className="mt-3 text-lg">{tool.name}</CardTitle>
                          <CardDescription>{tool.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Focus Areas:</p>
                            <div className="flex flex-wrap gap-1">
                              {tool.focusAreas.slice(0, 3).map((area) => (
                                <Badge key={area} variant="secondary" className="text-xs">
                                  {area}
                                </Badge>
                              ))}
                              {tool.focusAreas.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{tool.focusAreas.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button className="w-full" onClick={() => startSession(tool)}>
                            <Play className="mr-2 h-4 w-4" />
                            Start Planning Session
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Active Session Tab */}
        <TabsContent value="session" className="space-y-4">
          {currentSession && selectedTool && (
            <div className="grid grid-cols-12 gap-4 h-[calc(100vh-280px)]">
              {/* Session Info & Progress */}
              <div className="col-span-3 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Session Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {SESSION_PHASES.map((phase, index) => {
                      const currentIndex = SESSION_PHASES.findIndex(
                        (p) => p.id === currentSession.currentPhase
                      );
                      const isComplete = index < currentIndex;
                      const isCurrent = phase.id === currentSession.currentPhase;

                      return (
                        <div
                          key={phase.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg text-sm",
                            isCurrent && "bg-purple-50 border border-purple-200",
                            isComplete && "text-green-600"
                          )}
                        >
                          {isComplete ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : isCurrent ? (
                            <div className="h-4 w-4 rounded-full bg-purple-500 animate-pulse" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted" />
                          )}
                          <span className={cn(isCurrent && "font-medium")}>{phase.name}</span>
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={advancePhase}
                      disabled={currentSession.currentPhase === "review"}
                    >
                      <ArrowRight className="mr-2 h-3 w-3" />
                      Next Phase
                    </Button>
                  </CardContent>
                </Card>

                {/* Action Items */}
                <Card className="flex-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Action Items
                      <Badge variant="secondary">{currentSession.actionItems.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      {currentSession.actionItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Action items will appear here as they are identified
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {currentSession.actionItems.map((item) => (
                            <div
                              key={item.id}
                              className="p-2 border rounded-lg text-sm space-y-1"
                            >
                              <div className="flex items-start justify-between">
                                <span className="font-medium">{item.title}</span>
                                <Badge
                                  variant={
                                    item.priority === "high"
                                      ? "destructive"
                                      : item.priority === "medium"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {item.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                              {item.aiWorkforceAgent ? (
                                <Badge variant="outline" className="text-xs">
                                  <Bot className="h-3 w-3 mr-1" />
                                  {item.aiWorkforceAgent}
                                </Badge>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => handoffToAIWorkforce(item)}
                                >
                                  <Share2 className="h-3 w-3 mr-1" />
                                  Assign to AI
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Session Actions */}
                <div className="space-y-2">
                  <Button className="w-full" onClick={generateReport} disabled={isLoading}>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Export Session
                  </Button>
                </div>
              </div>

              {/* Chat Area */}
              <div className="col-span-9">
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${MARY_CONFIG.color}20` }}
                        >
                          {MARY_CONFIG.avatar}
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {MARY_CONFIG.name}
                            <Badge variant="outline" className="text-purple-600 border-purple-300">
                              {selectedTool.name}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {MARY_CONFIG.title} • {SESSION_PHASES.find((p) => p.id === currentSession.currentPhase)?.name} Phase
                          </CardDescription>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {currentSession.messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3",
                            message.role === "user" && "justify-end",
                            message.role === "system" && "justify-center"
                          )}
                        >
                          {message.role === "system" ? (
                            <div className="text-center text-sm text-muted-foreground py-2 px-4 bg-muted rounded-lg">
                              {message.content}
                            </div>
                          ) : (
                            <>
                              {message.role === "assistant" && (
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                                  style={{ backgroundColor: `${MARY_CONFIG.color}20` }}
                                >
                                  {MARY_CONFIG.avatar}
                                </div>
                              )}
                              <div
                                className={cn(
                                  "max-w-[80%] rounded-lg p-4",
                                  message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                )}
                              >
                                <div className="whitespace-pre-wrap text-sm">
                                  {message.content}
                                </div>
                              </div>
                              {message.role === "user" && (
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                  <Users className="h-4 w-4 text-primary-foreground" />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                            style={{ backgroundColor: `${MARY_CONFIG.color}20` }}
                          >
                            {MARY_CONFIG.avatar}
                          </div>
                          <div className="bg-muted rounded-lg p-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <Textarea
                        placeholder="Share your thoughts with Mary..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        className="min-h-[60px] max-h-[120px] resize-none"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="h-[60px] w-[60px]"
                        disabled={!inputMessage.trim() || isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </Button>
                    </form>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
              <CardDescription>View and continue previous planning sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No previous sessions found</p>
                <p className="text-sm">Start a planning session to see it here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Workforce Integration Tab */}
        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Workforce Integration
              </CardTitle>
              <CardDescription>
                How planning outputs connect to AI Workforce agents for continuous execution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Integration Flow */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-3">Speed of Thought Execution Flow</h3>
                <div className="flex items-center justify-between gap-4">
                  {[
                    { icon: Brain, label: "Planning Session", desc: "Mary facilitates" },
                    { icon: Lightbulb, label: "Action Items", desc: "Auto-extracted" },
                    { icon: Bot, label: "AI Assignment", desc: "Agent handoff" },
                    { icon: Zap, label: "Execution", desc: "Automated tasks" },
                    { icon: CheckCircle, label: "Review", desc: "Human approval" },
                  ].map((step, i) => (
                    <div key={i} className="flex-1 text-center">
                      <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-2">
                        <step.icon className="h-6 w-6 text-purple-600" />
                      </div>
                      <p className="text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                      {i < 4 && (
                        <ArrowRight className="h-4 w-4 mx-auto mt-2 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent Prompts */}
              <div>
                <h3 className="font-semibold mb-3">AI Workforce Agent Prompts for Task Execution</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    {
                      agent: "CFO Agent",
                      prompt: `You are an AI CFO assistant. When receiving action items from planning sessions:
1. INGEST: Parse the action item, context, and priority
2. INTERPRET: Analyze financial implications and dependencies
3. RECOMMEND: Suggest specific financial actions with ROI estimates
4. EXECUTE: Prepare financial models, reports, or analyses
5. REPORT: Provide status updates and request approvals for significant decisions`,
                    },
                    {
                      agent: "Operations Agent",
                      prompt: `You are an AI Operations assistant. When receiving action items:
1. INGEST: Understand the operational requirement and timeline
2. INTERPRET: Map to existing processes and identify impacts
3. RECOMMEND: Propose implementation steps with resource needs
4. EXECUTE: Create SOPs, schedules, or process documentation
5. REPORT: Track progress and flag blockers for human review`,
                    },
                    {
                      agent: "HR Agent",
                      prompt: `You are an AI HR assistant. When receiving action items:
1. INGEST: Identify people-related requirements
2. INTERPRET: Assess workforce implications and compliance needs
3. RECOMMEND: Suggest HR actions with policy considerations
4. EXECUTE: Draft communications, policies, or training materials
5. REPORT: Summarize actions taken and pending approvals`,
                    },
                    {
                      agent: "Marketing Agent",
                      prompt: `You are an AI Marketing assistant. When receiving action items:
1. INGEST: Understand marketing objectives and target audience
2. INTERPRET: Analyze market context and competitive landscape
3. RECOMMEND: Propose campaigns, messaging, or content strategies
4. EXECUTE: Create marketing assets, copy, or campaign plans
5. REPORT: Provide performance projections and seek approval`,
                    },
                  ].map((item) => (
                    <Card key={item.agent}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{item.agent}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                          {item.prompt}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Execution Buttons */}
              <div>
                <h3 className="font-semibold mb-3">One-Click Execution Actions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  When AI agents generate recommendations, these action buttons appear for instant execution:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve & Execute
                  </Button>
                  <Button size="sm" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Document
                  </Button>
                  <Button size="sm" variant="outline">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Meeting
                  </Button>
                  <Button size="sm" variant="outline">
                    <Send className="mr-2 h-4 w-4" />
                    Send Communication
                  </Button>
                  <Button size="sm" variant="outline">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Run Analysis
                  </Button>
                  <Button size="sm" variant="destructive">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Escalate to Human
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Planning Session Report</DialogTitle>
            <DialogDescription>
              Generated report from your {currentSession?.toolName} session
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
              {currentSession?.report}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Close
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handoff Dialog */}
      <Dialog open={showHandoffDialog} onOpenChange={setShowHandoffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to AI Workforce</DialogTitle>
            <DialogDescription>
              Select an AI agent to handle this action item
            </DialogDescription>
          </DialogHeader>
          {selectedActionItem && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedActionItem.title}</p>
                <p className="text-sm text-muted-foreground">{selectedActionItem.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["CFO Agent", "HR Agent", "Legal Agent", "Marketing Agent", "Sales Agent", "Operations Agent"].map(
                  (agent) => (
                    <Button
                      key={agent}
                      variant="outline"
                      className="justify-start"
                      onClick={() => executeHandoff(agent)}
                    >
                      <Bot className="mr-2 h-4 w-4" />
                      {agent}
                    </Button>
                  )
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHandoffDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
