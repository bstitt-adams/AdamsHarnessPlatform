"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Target,
  Sparkles,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Trash2,
  Edit,
  Calendar,
  Clock,
  Users,
  ListTodo,
  Mountain,
  Compass,
  Flag,
  Award,
  UserCheck,
  Send,
  Loader2,
  Play,
  Save,
  X,
  AlertTriangle,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTractionData,
  Rock,
  ScorecardMetric,
  Issue,
  Todo,
  Meeting,
  TeamMember,
} from "@/lib/hooks/use-eos2-data";
import { PlaybookGenerator } from "@/components/mattermost/playbook-generator";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
  actions?: { label: string; value: string }[];
}

// Empty form states
type RockForm = Omit<Rock, "id" | "ownerId"> & { ownerId?: string };
type MetricForm = Omit<ScorecardMetric, "id" | "ownerId"> & { ownerId?: string };
type IssueForm = Omit<Issue, "id" | "ownerId"> & { ownerId?: string };
type TodoForm = Omit<Todo, "id" | "ownerId"> & { ownerId?: string };
type MeetingForm = Omit<Meeting, "id">;
type TeamMemberForm = Omit<TeamMember, "id">;

const emptyRock: RockForm = { title: "", description: "", owner: "", dueDate: "", status: "on-track", progress: 0, quarter: "Q1 2025" };
const emptyMetric: MetricForm = { name: "", goal: 0, actual: 0, owner: "", trend: "flat", unit: "" };
const emptyIssue: IssueForm = { title: "", description: "", priority: "medium", identifiedDate: new Date().toISOString().split("T")[0], owner: "", status: "open" };
const emptyTodo: TodoForm = { title: "", description: "", owner: "", dueDate: "", status: "not-started", createdDate: new Date().toISOString().split("T")[0] };
const emptyMeeting: MeetingForm = { date: new Date().toISOString().split("T")[0], startTime: "09:00", endTime: "10:30", attendees: [], rating: 8, issuesSolved: 0, rocksReviewed: false, scorecardReviewed: false, todoCompletionRate: 0 };
const emptyTeamMember: TeamMemberForm = { name: "", role: "", category: "team", getsIt: null, wantsIt: null, capacityToDoIt: null, rightSeat: null };

export default function TractionDashboardPage() {
  // Use Firestore data hook
  const {
    rocks,
    metrics,
    issues,
    todos,
    meetings,
    team,
    loading,
    error,
    isFirebaseConfigured,
    addRock: addRockToDb,
    updateRock: updateRockInDb,
    deleteRock: deleteRockFromDb,
    addMetric: addMetricToDb,
    updateMetric: updateMetricInDb,
    deleteMetric: deleteMetricFromDb,
    addIssue: addIssueToDb,
    updateIssue: updateIssueInDb,
    deleteIssue: deleteIssueFromDb,
    addTodo: addTodoToDb,
    updateTodo: updateTodoInDb,
    deleteTodo: deleteTodoFromDb,
    addMeeting: addMeetingToDb,
    updateMeeting: updateMeetingInDb,
    deleteMeeting: deleteMeetingFromDb,
    addTeamMember: addTeamMemberToDb,
    updateTeamMember: updateTeamMemberInDb,
    deleteTeamMember: deleteTeamMemberFromDb,
  } = useTractionData();

  const [activeTab, setActiveTab] = useState("overview");
  const [currentQuarter, setCurrentQuarter] = useState("Q1 2025");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [playbookPhase, setPlaybookPhase] = useState<string>("intro");
  const [showPlaybookChat, setShowPlaybookChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Form dialog states
  const [showRockForm, setShowRockForm] = useState(false);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showTeamMemberForm, setShowTeamMemberForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit states
  const [editingRock, setEditingRock] = useState<Rock | null>(null);
  const [editingMetric, setEditingMetric] = useState<ScorecardMetric | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);

  // Form data states
  const [rockForm, setRockForm] = useState<RockForm>(emptyRock);
  const [metricForm, setMetricForm] = useState<MetricForm>(emptyMetric);
  const [issueForm, setIssueForm] = useState<IssueForm>(emptyIssue);
  const [todoForm, setTodoForm] = useState<TodoForm>(emptyTodo);
  const [meetingForm, setMeetingForm] = useState<MeetingForm>(emptyMeeting);
  const [teamMemberForm, setTeamMemberForm] = useState<TeamMemberForm>(emptyTeamMember);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // Main team members from teamMembers collection (filtered for role "team")
  const [mainTeamMembers, setMainTeamMembers] = useState<{ id: string; name: string }[]>([]);

  // Load team members from main teamMembers collection
  useEffect(() => {
    const loadMainTeamMembers = async () => {
      if (!db) return;
      try {
        const teamRef = collection(db, COLLECTIONS.TEAM_MEMBERS);
        const teamQuery = query(teamRef, orderBy("firstName"));
        const snapshot = await getDocs(teamQuery);
        
        const members: { id: string; name: string }[] = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as TeamMemberDoc;
          // Only include members with role "team"
          if (data.role === "team") {
            const firstName = data.firstName || "";
            const lastName = data.lastName || "";
            members.push({
              id: doc.id,
              name: `${firstName} ${lastName}`.trim() || "Unknown",
            });
          }
        });
        setMainTeamMembers(members);
      } catch (error) {
        console.error("Error loading main team members:", error);
      }
    };
    
    loadMainTeamMembers();
  }, []);

  // Team member names for dropdowns - use main team members if available, fallback to traction team
  const teamMemberNames = mainTeamMembers.length > 0 
    ? mainTeamMembers.map(t => t.name)
    : team.filter(t => t.category === "team").map(t => t.name);

  const calculateOverallHealth = () => {
    if (rocks.length === 0 || metrics.length === 0) return 0;
    const rockScore = rocks.filter(r => r.status === "on-track" || r.status === "complete").length / rocks.length * 10;
    const metricScore = metrics.filter(m => m.actual >= m.goal).length / metrics.length * 10;
    return Math.round((rockScore + metricScore) / 2 * 10) / 10;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-track": case "complete": return "text-green-600 bg-green-100";
      case "at-risk": return "text-sky-600 bg-sky-100";
      case "off-track": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "on-track": case "complete": return <CheckCircle className="h-4 w-4" />;
      case "at-risk": return <AlertCircle className="h-4 w-4" />;
      case "off-track": return <XCircle className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down": return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700";
      case "medium": return "bg-sky-100 text-sky-700";
      default: return "bg-blue-100 text-blue-700";
    }
  };

  // CRUD Operations for Rocks
  const openAddRock = () => {
    setEditingRock(null);
    setRockForm({ ...emptyRock, quarter: currentQuarter, dueDate: getQuarterEndDate(currentQuarter) });
    setShowRockForm(true);
  };

  const openEditRock = (rock: Rock) => {
    setEditingRock(rock);
    setRockForm({ title: rock.title, description: rock.description, owner: rock.owner, ownerId: rock.ownerId, dueDate: rock.dueDate, status: rock.status, progress: rock.progress, quarter: rock.quarter });
    setShowRockForm(true);
  };

  const saveRock = async () => {
    if (!rockForm.description || !rockForm.owner) return;
    if (editingRock) {
      await updateRockInDb(editingRock.id, { ...rockForm, ownerId: rockForm.ownerId || "" });
    } else {
      await addRockToDb({ ...rockForm, ownerId: rockForm.ownerId || "" });
    }
    setShowRockForm(false);
    setRockForm(emptyRock);
  };

  const deleteRock = async (id: string) => {
    await deleteRockFromDb(id);
  };

  // CRUD Operations for Metrics
  const openAddMetric = () => {
    setEditingMetric(null);
    setMetricForm(emptyMetric);
    setShowMetricForm(true);
  };

  const openEditMetric = (metric: ScorecardMetric) => {
    setEditingMetric(metric);
    setMetricForm({ name: metric.name, goal: metric.goal, actual: metric.actual, owner: metric.owner, ownerId: metric.ownerId, trend: metric.trend, unit: metric.unit });
    setShowMetricForm(true);
  };

  const saveMetric = async () => {
    if (!metricForm.name || !metricForm.owner) return;
    if (editingMetric) {
      await updateMetricInDb(editingMetric.id, { ...metricForm, ownerId: metricForm.ownerId || "" });
    } else {
      await addMetricToDb({ ...metricForm, ownerId: metricForm.ownerId || "" });
    }
    setShowMetricForm(false);
    setMetricForm(emptyMetric);
  };

  const deleteMetric = async (id: string) => {
    await deleteMetricFromDb(id);
  };

  // CRUD Operations for Issues
  const openAddIssue = () => {
    setEditingIssue(null);
    setIssueForm({ ...emptyIssue, identifiedDate: new Date().toISOString().split("T")[0] });
    setShowIssueForm(true);
  };

  const openEditIssue = (issue: Issue) => {
    setEditingIssue(issue);
    setIssueForm({ title: issue.title, description: issue.description, priority: issue.priority, identifiedDate: issue.identifiedDate, owner: issue.owner, ownerId: issue.ownerId, status: issue.status });
    setShowIssueForm(true);
  };

  const saveIssue = async () => {
    if (!issueForm.description || !issueForm.owner) return;
    if (editingIssue) {
      await updateIssueInDb(editingIssue.id, { ...issueForm, ownerId: issueForm.ownerId || "" });
    } else {
      await addIssueToDb({ ...issueForm, ownerId: issueForm.ownerId || "" });
    }
    setShowIssueForm(false);
    setIssueForm(emptyIssue);
  };

  const solveIssue = async (id: string) => {
    await updateIssueInDb(id, { status: "solved" });
  };

  const deleteIssue = async (id: string) => {
    await deleteIssueFromDb(id);
  };

  // CRUD Operations for Todos
  const openAddTodo = () => {
    setEditingTodo(null);
    setTodoForm({ ...emptyTodo, createdDate: new Date().toISOString().split("T")[0] });
    setShowTodoForm(true);
  };

  const openEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setTodoForm({ title: todo.title, description: todo.description, owner: todo.owner, ownerId: todo.ownerId, dueDate: todo.dueDate, status: todo.status, createdDate: todo.createdDate });
    setShowTodoForm(true);
  };

  const saveTodo = async () => {
    if (!todoForm.description || !todoForm.owner) return;
    if (editingTodo) {
      await updateTodoInDb(editingTodo.id, { ...todoForm, ownerId: todoForm.ownerId || "" });
    } else {
      await addTodoToDb({ ...todoForm, ownerId: todoForm.ownerId || "" });
    }
    setShowTodoForm(false);
    setTodoForm(emptyTodo);
  };

  const toggleTodoComplete = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      await updateTodoInDb(id, { status: todo.status === "complete" ? "not-started" : "complete" });
    }
  };

  const deleteTodo = async (id: string) => {
    await deleteTodoFromDb(id);
  };

  // CRUD Operations for Meetings
  const openAddMeeting = () => {
    setEditingMeeting(null);
    setMeetingForm({ ...emptyMeeting, date: new Date().toISOString().split("T")[0], attendees: teamMemberNames });
    setShowMeetingForm(true);
  };

  const openEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setMeetingForm({ date: meeting.date, startTime: meeting.startTime, endTime: meeting.endTime, attendees: meeting.attendees, rating: meeting.rating, issuesSolved: meeting.issuesSolved, rocksReviewed: meeting.rocksReviewed, scorecardReviewed: meeting.scorecardReviewed, todoCompletionRate: meeting.todoCompletionRate });
    setShowMeetingForm(true);
  };

  const saveMeeting = async () => {
    if (!meetingForm.date) return;
    if (editingMeeting) {
      await updateMeetingInDb(editingMeeting.id, meetingForm);
    } else {
      await addMeetingToDb(meetingForm);
    }
    setShowMeetingForm(false);
    setMeetingForm(emptyMeeting);
  };

  const deleteMeeting = async (id: string) => {
    await deleteMeetingFromDb(id);
  };

  // CRUD Operations for Team Members
  const openAddTeamMember = () => {
    setEditingTeamMember(null);
    setTeamMemberForm(emptyTeamMember);
    setShowTeamMemberForm(true);
  };

  const openEditTeamMember = (member: TeamMember) => {
    setEditingTeamMember(member);
    setTeamMemberForm({ name: member.name, role: member.role, category: member.category, getsIt: member.getsIt, wantsIt: member.wantsIt, capacityToDoIt: member.capacityToDoIt, rightSeat: member.rightSeat });
    setShowTeamMemberForm(true);
  };

  const saveTeamMember = async () => {
    if (!teamMemberForm.name || !teamMemberForm.role) return;
    if (editingTeamMember) {
      await updateTeamMemberInDb(editingTeamMember.id, teamMemberForm);
    } else {
      await addTeamMemberToDb(teamMemberForm);
    }
    setShowTeamMemberForm(false);
    setTeamMemberForm(emptyTeamMember);
  };

  const deleteTeamMember = async (id: string) => {
    await deleteTeamMemberFromDb(id);
  };

  // Delete confirmation
  const confirmDelete = (type: string, id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    switch (deleteTarget.type) {
      case "rock": await deleteRock(deleteTarget.id); break;
      case "metric": await deleteMetric(deleteTarget.id); break;
      case "issue": await deleteIssue(deleteTarget.id); break;
      case "todo": await deleteTodo(deleteTarget.id); break;
      case "meeting": await deleteMeeting(deleteTarget.id); break;
      case "team": await deleteTeamMember(deleteTarget.id); break;
    }
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  // Helper function to get quarter end date
  const getQuarterEndDate = (quarter: string) => {
    const year = quarter.split(" ")[1];
    const q = quarter.split(" ")[0];
    switch (q) {
      case "Q1": return `${year}-03-31`;
      case "Q2": return `${year}-06-30`;
      case "Q3": return `${year}-09-30`;
      case "Q4": return `${year}-12-31`;
      default: return `${year}-03-31`;
    }
  };

  const startPlaybookChat = () => {
    setShowPlaybookChat(true);
    setChatMessages([{
      id: "msg-1",
      role: "assistant",
      content: `👋 Hi! I'm your Traction Assistant. I'll help you create a customized Mattermost Playbook to execute your quarterly rocks and track your EOS metrics.\n\nThis will take about 5-10 minutes. Ready to get started?\n\n**What quarter are we planning for?**`,
      timestamp: new Date(),
      actions: [
        { label: "Q1 2025", value: "Q1 2025" },
        { label: "Q2 2025", value: "Q2 2025" },
      ],
    }]);
    setPlaybookPhase("intro");
  };

  const sendChatMessage = async (message: string) => {
    if (!message.trim()) return;
    setChatMessages(prev => [...prev, { id: `msg-${Date.now()}`, role: "user", content: message, timestamp: new Date() }]);
    setChatInput("");
    setIsAiThinking(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    let aiResponse: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    if (playbookPhase === "intro") {
      aiResponse.content = `Great! Planning for **${message}**.\n\nI see you have **${rocks.length} rocks** defined. Would you like to use these existing rocks for the playbook?`;
      aiResponse.actions = [{ label: "Use existing rocks", value: "use_existing" }, { label: "Start fresh", value: "fresh" }];
      setPlaybookPhase("rocks");
    } else if (playbookPhase === "rocks") {
      aiResponse.content = `Perfect! Using your ${rocks.length} rocks.\n\n📊 You have **${metrics.length} scorecard metrics**. Include all in the playbook?`;
      aiResponse.actions = [{ label: "Include all metrics", value: "all_metrics" }];
      setPlaybookPhase("scorecard");
    } else if (playbookPhase === "scorecard") {
      aiResponse.content = `Excellent! Including all metrics.\n\n📅 **When do you hold Level 10 meetings?**`;
      aiResponse.actions = [{ label: "Monday 9:00 AM", value: "Monday 9:00 AM" }, { label: "Tuesday 9:00 AM", value: "Tuesday 9:00 AM" }];
      setPlaybookPhase("meetings");
    } else if (playbookPhase === "meetings") {
      aiResponse.content = `✅ **Playbook Ready!**\n\n- Quarter: ${currentQuarter}\n- Rocks: ${rocks.length}\n- Metrics: ${metrics.length}\n- Level 10: ${message}\n\n**Generate your Mattermost Playbook?**`;
      aiResponse.actions = [{ label: "✅ Generate Playbook", value: "generate" }];
      setPlaybookPhase("review");
    } else if (playbookPhase === "review") {
      aiResponse.content = `🎉 **Playbook Generated!**\n\nYour "Traction ${currentQuarter} Execution" playbook is ready with:\n- ${rocks.length * 13} Rock update tasks\n- ${metrics.length * 13} Scorecard reviews\n- 13 Level 10 meeting checklists`;
      aiResponse.actions = [{ label: "📋 Copy JSON", value: "copy" }, { label: "⬇️ Download", value: "download" }];
      setPlaybookPhase("complete");
    }

    setChatMessages(prev => [...prev, aiResponse]);
    setIsAiThinking(false);
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const overallHealth = calculateOverallHealth();

  // Show loading state
  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <p className="text-muted-foreground">Loading Traction data...</p>
        </div>
      </div>
    );
  }

  // Show error/setup state if Firebase not configured
  if (!isFirebaseConfigured || error) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <AlertTriangle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Database Not Connected</CardTitle>
                <CardDescription>Configure Firebase to enable data persistence</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error || "The Traction Dashboard requires Firebase to store your EOS data. Please configure your Firebase credentials in Settings to get started."}
            </p>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">To connect Firebase:</p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Go to Settings → Integrations</li>
                <li>Add your Firebase project credentials</li>
                <li>Refresh this page</li>
              </ol>
            </div>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/portal/settings"}>
              <Database className="h-4 w-4 mr-2" />Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  Traction Dashboard
                  <Badge variant="secondary" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />EOS</Badge>
                </h1>
                <p className="text-sm text-muted-foreground">Adams Electric • {currentQuarter}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Overall Health</p>
                <p className={cn("text-2xl font-bold", overallHealth >= 8 ? "text-green-600" : overallHealth >= 6 ? "text-sky-600" : "text-red-600")}>{overallHealth}/10</p>
              </div>
              <Button onClick={startPlaybookChat} className="bg-purple-600 hover:bg-purple-700">
                <Play className="h-4 w-4 mr-2" />Generate Playbook
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="border-b px-4">
            <TabsList className="h-10">
              <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" />Overview</TabsTrigger>
              <TabsTrigger value="insights" className="gap-2"><Sparkles className="h-4 w-4" />EOS Insights</TabsTrigger>
              <TabsTrigger value="vto" className="gap-2"><Compass className="h-4 w-4" />V/TO</TabsTrigger>
              <TabsTrigger value="rocks" className="gap-2"><Mountain className="h-4 w-4" />Rocks ({rocks.length})</TabsTrigger>
              <TabsTrigger value="scorecard" className="gap-2"><BarChart3 className="h-4 w-4" />Scorecard</TabsTrigger>
              <TabsTrigger value="issues" className="gap-2"><Flag className="h-4 w-4" />Issues ({issues.filter(i => i.status !== "solved").length})</TabsTrigger>
              <TabsTrigger value="meetings" className="gap-2"><Calendar className="h-4 w-4" />Meetings</TabsTrigger>
              <TabsTrigger value="todos" className="gap-2"><ListTodo className="h-4 w-4" />To-Dos ({todos.filter(t => t.status !== "complete").length})</TabsTrigger>
              <TabsTrigger value="people" className="gap-2"><Users className="h-4 w-4" />People</TabsTrigger>
              <TabsTrigger value="playbooks" className="gap-2"><Play className="h-4 w-4" />Playbooks</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Rocks On Track</p><p className="text-2xl font-bold">{rocks.filter(r => r.status === "on-track" || r.status === "complete").length}/{rocks.length}</p></div><Mountain className="h-8 w-8 text-purple-600" /></div></CardContent></Card>
                  <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Scorecard At Goal</p><p className="text-2xl font-bold">{metrics.filter(m => m.actual >= m.goal).length}/{metrics.length}</p></div><BarChart3 className="h-8 w-8 text-blue-600" /></div></CardContent></Card>
                  <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Open Issues</p><p className="text-2xl font-bold">{issues.filter(i => i.status !== "solved").length}</p></div><Flag className="h-8 w-8 text-orange-600" /></div></CardContent></Card>
                  <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Avg Meeting Rating</p><p className="text-2xl font-bold">{(meetings.reduce((sum, m) => sum + m.rating, 0) / meetings.length).toFixed(1)}</p></div><Award className="h-8 w-8 text-green-600" /></div></CardContent></Card>
                </div>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Mountain className="h-5 w-5" />Quarterly Rocks - {currentQuarter}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {rocks.map(rock => (
                        <div key={rock.id} className="flex items-center gap-4">
                          <Badge className={cn("w-24 justify-center", getStatusColor(rock.status))}>{getStatusIcon(rock.status)}<span className="ml-1 capitalize">{rock.status.replace("-", " ")}</span></Badge>
                          <div className="flex-1"><p className="font-medium">{rock.description}</p><p className="text-sm text-muted-foreground">{rock.owner}</p></div>
                          <div className="w-32"><Progress value={rock.progress} className="h-2" /><p className="text-xs text-muted-foreground text-right mt-1">{rock.progress}%</p></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Weekly Scorecard</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead>Owner</TableHead><TableHead className="text-right">Goal</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-center">Trend</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {metrics.map(metric => (
                          <TableRow key={metric.id}>
                            <TableCell className="font-medium">{metric.name}</TableCell>
                            <TableCell>{metric.owner}</TableCell>
                            <TableCell className="text-right">{metric.unit}{metric.goal.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{metric.unit}{metric.actual.toLocaleString()}</TableCell>
                            <TableCell className="text-center">{getTrendIcon(metric.trend)}</TableCell>
                            <TableCell className="text-center">{metric.actual >= metric.goal ? <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : <XCircle className="h-5 w-5 text-red-600 mx-auto" />}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* EOS Insights Tab - Consolidated View */}
          <TabsContent value="insights" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Off-Track Rocks</p>
                          <p className="text-3xl font-bold text-red-600">{rocks.filter(r => r.status === "off-track").length}</p>
                        </div>
                        <Mountain className="h-8 w-8 text-red-200" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Overdue To-Dos</p>
                          <p className="text-3xl font-bold text-orange-600">{todos.filter(t => t.status !== "complete" && new Date(t.dueDate) < new Date()).length}</p>
                        </div>
                        <ListTodo className="h-8 w-8 text-orange-200" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-sky-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Unresolved Issues</p>
                          <p className="text-3xl font-bold text-sky-600">{issues.filter(i => i.status !== "solved").length}</p>
                        </div>
                        <Flag className="h-8 w-8 text-sky-200" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Off-Track Measurables</p>
                          <p className="text-3xl font-bold text-purple-600">{metrics.filter(m => m.actual < m.goal).length}</p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-purple-200" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Scorecard Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Scorecard
                      </CardTitle>
                      <Button size="sm" onClick={openAddMetric}>
                        <Plus className="h-4 w-4 mr-1" />Add Metric
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Measurable</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead className="text-right">Goal</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-center">Trend</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.map(metric => (
                          <TableRow key={metric.id}>
                            <TableCell className="font-medium">{metric.name}</TableCell>
                            <TableCell>{metric.owner}</TableCell>
                            <TableCell className="text-right">{metric.unit}{metric.goal.toLocaleString()}</TableCell>
                            <TableCell className={cn("text-right font-medium", metric.actual >= metric.goal ? "text-green-600" : "text-red-600")}>
                              {metric.unit}{metric.actual.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">{getTrendIcon(metric.trend)}</TableCell>
                            <TableCell className="text-center">
                              {metric.actual >= metric.goal ? (
                                <Badge className="bg-green-100 text-green-700">✓</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700">✗</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditMetric(metric)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => confirmDelete("metric", metric.id, metric.name)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Rocks Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Mountain className="h-5 w-5" />
                        Rocks - {currentQuarter}
                      </CardTitle>
                      <Button size="sm" onClick={openAddRock}>
                        <Plus className="h-4 w-4 mr-1" />Add Rock
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead>Rock</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead className="text-center">Progress</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-right w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rocks.map(rock => (
                          <TableRow key={rock.id}>
                            <TableCell>
                              <Badge className={cn("w-full justify-center", getStatusColor(rock.status))}>
                                {getStatusIcon(rock.status)}
                                <span className="ml-1 capitalize text-xs">{rock.status.replace("-", " ")}</span>
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{rock.description}</TableCell>
                            <TableCell>{rock.owner}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={rock.progress} className="h-2 w-20" />
                                <span className="text-xs text-muted-foreground">{rock.progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell>{new Date(rock.dueDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditRock(rock)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => confirmDelete("rock", rock.id, rock.description.substring(0, 30))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Issues Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Flag className="h-5 w-5" />
                        Issues
                      </CardTitle>
                      <Button size="sm" onClick={openAddIssue}>
                        <Plus className="h-4 w-4 mr-1" />Add Issue
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Priority</TableHead>
                          <TableHead>Issue</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {issues.map(issue => (
                          <TableRow key={issue.id}>
                            <TableCell>
                              <Badge className={getPriorityColor(issue.priority)}>{issue.priority.toUpperCase()}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{issue.description}</TableCell>
                            <TableCell>{issue.owner}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{issue.status.replace("-", " ")}</Badge>
                            </TableCell>
                            <TableCell>{new Date(issue.identifiedDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditIssue(issue)}><Edit className="h-4 w-4" /></Button>
                              {issue.status !== "solved" && (
                                <Button variant="ghost" size="icon" className="text-green-600" onClick={() => solveIssue(issue.id)}><CheckCircle className="h-4 w-4" /></Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => confirmDelete("issue", issue.id, issue.description.substring(0, 30))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* To-Dos Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <ListTodo className="h-5 w-5" />
                        To-Dos
                      </CardTitle>
                      <Button size="sm" onClick={openAddTodo}>
                        <Plus className="h-4 w-4 mr-1" />Add To-Do
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>To-Do</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-right w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {todos.map(todo => (
                          <TableRow key={todo.id} className={todo.status === "complete" ? "opacity-50" : ""}>
                            <TableCell>
                              <Checkbox 
                                checked={todo.status === "complete"} 
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    updateTodoInDb(todo.id, { status: "complete" });
                                  } else {
                                    updateTodoInDb(todo.id, { status: "in-progress" });
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className={cn("font-medium", todo.status === "complete" && "line-through")}>{todo.description}</TableCell>
                            <TableCell>{todo.owner}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                "capitalize",
                                todo.status === "complete" && "bg-green-100 text-green-700",
                                todo.status === "in-progress" && "bg-blue-100 text-blue-700",
                                new Date(todo.dueDate) < new Date() && todo.status !== "complete" && "bg-red-100 text-red-700"
                              )}>
                                {new Date(todo.dueDate) < new Date() && todo.status !== "complete" ? "Overdue" : todo.status.replace("-", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn(new Date(todo.dueDate) < new Date() && todo.status !== "complete" && "text-red-600 font-medium")}>
                              {new Date(todo.dueDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditTodo(todo)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => confirmDelete("todo", todo.id, todo.description.substring(0, 30))}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="vto" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold">VISION/TRACTION ORGANIZER®</h1>
                    <p className="text-muted-foreground">Adams VTO Dec25</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Draft</Badge>
                    <Button variant="outline" size="sm">Make Final</Button>
                    <Button size="sm"><Edit className="h-4 w-4 mr-2" />Edit</Button>
                  </div>
                </div>

                {/* Vision / Traction Tabs */}
                <Tabs defaultValue="vision" className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="vision" className="px-8">Vision</TabsTrigger>
                    <TabsTrigger value="traction" className="px-8">Traction®</TabsTrigger>
                  </TabsList>

                  <TabsContent value="vision">
                    <div className="grid grid-cols-3 gap-6">
                      {/* Left Column - Main Vision Content */}
                      <div className="col-span-2 space-y-4">
                        {/* Core Values */}
                        <Card className="border-l-4 border-l-orange-500">
                          <CardContent className="pt-4">
                            <div className="flex gap-4">
                              <div className="bg-orange-500 text-white px-3 py-2 text-center min-w-[100px]">
                                <div className="font-bold text-sm">CORE</div>
                                <div className="font-bold text-sm">VALUES</div>
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold mb-2">Core Values</h3>
                                <ol className="list-decimal list-inside space-y-1 text-sm">
                                  <li>Excellence</li>
                                  <li>Commitment</li>
                                  <li>Teamwork</li>
                                  <li>Innovative</li>
                                </ol>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Core Focus */}
                        <Card className="border-l-4 border-l-orange-500">
                          <CardContent className="pt-4">
                            <div className="flex gap-4">
                              <div className="bg-orange-500 text-white px-3 py-2 text-center min-w-[100px]">
                                <div className="font-bold text-sm">CORE</div>
                                <div className="font-bold text-sm">FOCUS™</div>
                              </div>
                              <div className="flex-1 space-y-3">
                                <div>
                                  <h4 className="font-semibold text-sm">Purpose:</h4>
                                  <p className="text-sm">Enriching Lives. Enhancing Security. Serving Manufacturers.</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm">Our Niche:</h4>
                                  <p className="text-sm">Supply Chain Ecosystem Development</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* 10-Year Target */}
                        <Card className="border-l-4 border-l-teal-600">
                          <CardContent className="pt-4">
                            <div className="flex gap-4">
                              <div className="bg-teal-600 text-white px-3 py-2 text-center min-w-[100px]">
                                <div className="font-bold text-sm">10-YEAR</div>
                                <div className="font-bold text-sm">TARGET™</div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">10-Year Target:</h4>
                                <p className="text-sm">1000 Customers served annually. $50M annual revenue.</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Marketing Strategy */}
                        <Card className="border-l-4 border-l-blue-600">
                          <CardContent className="pt-4">
                            <div className="flex gap-4">
                              <div className="bg-blue-600 text-white px-3 py-2 text-center min-w-[100px]">
                                <div className="font-bold text-sm">MARKETING</div>
                                <div className="font-bold text-sm">STRATEGY</div>
                              </div>
                              <div className="flex-1 space-y-3">
                                <div>
                                  <h4 className="font-semibold text-sm">Target Market/&quot;The List&quot;:</h4>
                                  <p className="text-sm">OEMs</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm">3 Uniques™:</h4>
                                  <ol className="list-decimal list-inside space-y-1 text-sm">
                                    <li>We implement <span className="text-blue-600 underline">our data-driven business-coupled solutions</span></li>
                                    <li>We are Question Architects TM</li>
                                    <li></li>
                                  </ol>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Right Column - 3-Year Picture */}
                      <div className="col-span-1">
                        <Card className="border-t-4 border-t-teal-600">
                          <CardHeader className="bg-teal-600 text-white py-2">
                            <CardTitle className="text-center text-sm font-bold">3-YEAR PICTURE™</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4 space-y-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Future Date:</span>
                                <span className="text-sm">December 16, 2028</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Revenue:</span>
                                <span className="text-sm font-semibold">$7M</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Profit:</span>
                                <span className="text-sm font-semibold">$1.75M</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-orange-600">100 customers</span>
                              </div>
                            </div>

                            <div className="pt-4 border-t">
                              <h4 className="font-semibold text-sm mb-2">What does it look like?</h4>
                              <ul className="text-xs space-y-1 text-muted-foreground">
                                <li>• 25% Margin, CFO, HR, Legal Counsel, IT Leader, CMO, Salesforce, Automation, AI</li>
                                <li>• employees</li>
                                <li>•</li>
                                <li>•</li>
                                <li>•</li>
                                <li>•</li>
                              </ul>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="traction">
                    <div className="grid grid-cols-3 gap-6">
                      {/* 1-Year Plan */}
                      <Card className="border-t-4 border-t-orange-500">
                        <CardHeader className="bg-orange-500 text-white py-2">
                          <CardTitle className="text-center text-sm font-bold">1-YEAR PLAN</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center border-b pb-2">
                              <span className="text-sm font-medium">Future Date:</span>
                              <span className="text-sm text-blue-600">December 12, 2026</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                              <span className="text-sm font-medium">Revenue:</span>
                              <span className="text-sm font-semibold">$1M</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                              <span className="text-sm font-medium">Profit:</span>
                              <span className="text-sm font-semibold">$250K</span>
                            </div>
                          </div>
                          <div className="pt-2">
                            <h4 className="font-semibold text-sm mb-3">Goals for the Year:</h4>
                            <div className="space-y-2">
                              <div className="flex items-start gap-2 text-sm border-b pb-2">
                                <span className="font-medium">1.</span>
                                <span className="text-blue-600 underline cursor-pointer">20 customers</span>
                              </div>
                              <div className="flex items-start gap-2 text-sm border-b pb-2">
                                <span className="font-medium">2.</span>
                                <span className="text-blue-600 underline cursor-pointer">10 customer journeys</span>
                              </div>
                              <div className="flex items-start gap-2 text-sm border-b pb-2">
                                <span className="font-medium">3.</span>
                                <span className="text-blue-600 underline cursor-pointer">$1M revenue</span>
                              </div>
                              <div className="flex items-start gap-2 text-sm border-b pb-2">
                                <span className="font-medium">4.</span>
                                <span className="text-blue-600 underline cursor-pointer">150 qualified leads</span>
                              </div>
                              <div className="flex items-start gap-2 text-sm border-b pb-2">
                                <span className="font-medium">5.</span>
                                <span className="text-blue-600 underline cursor-pointer">10 Biz Dev Toolbox sales</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Rocks */}
                      <Card className="border-t-4 border-t-teal-600">
                        <CardHeader className="bg-teal-600 text-white py-2">
                          <CardTitle className="text-center text-sm font-bold">ROCKS</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center border-b pb-2">
                              <span className="text-sm font-medium">Future Date:</span>
                              <span className="text-sm text-blue-600">March 27, 2026</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                              <span className="text-sm font-medium">Revenue:</span>
                              <span className="text-sm font-semibold text-blue-600">$100K</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                              <span className="text-sm font-medium">Profit:</span>
                              <span className="text-sm font-semibold">$25K</span>
                            </div>
                          </div>
                          <div className="pt-2">
                            <h4 className="font-semibold text-sm mb-3">Rocks for the Quarter:</h4>
                            <div className="space-y-3">
                              <div className="border-b pb-2">
                                <div className="flex items-start gap-2 text-sm">
                                  <span className="font-medium">1.</span>
                                  <span className="text-blue-600 underline cursor-pointer">100K Revenue</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 ml-4">
                                  <span className="text-xs text-muted-foreground">Who:</span>
                                  <Badge variant="secondary" className="text-xs bg-sky-100 text-sky-800">NV</Badge>
                                </div>
                              </div>
                              <div className="border-b pb-2">
                                <div className="flex items-start gap-2 text-sm">
                                  <span className="font-medium">2.</span>
                                  <span>3 new customers</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 ml-4">
                                  <span className="text-xs text-muted-foreground">Who:</span>
                                  <Badge variant="secondary" className="text-xs bg-sky-100 text-sky-800">NV</Badge>
                                </div>
                              </div>
                              <div className="border-b pb-2">
                                <div className="flex items-start gap-2 text-sm">
                                  <span className="font-medium">3.</span>
                                  <span className="text-blue-600 underline cursor-pointer">3 customer journeys</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 ml-4">
                                  <span className="text-xs text-muted-foreground">Who:</span>
                                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">BS</Badge>
                                </div>
                              </div>
                              <div className="border-b pb-2">
                                <div className="flex items-start gap-2 text-sm">
                                  <span className="font-medium">4.</span>
                                  <span>36 qualified leads</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 ml-4">
                                  <span className="text-xs text-muted-foreground">Who:</span>
                                  <Badge variant="secondary" className="text-xs bg-sky-100 text-sky-800">NV</Badge>
                                </div>
                              </div>
                              <div className="border-b pb-2">
                                <div className="flex items-start gap-2 text-sm">
                                  <span className="font-medium">5.</span>
                                  <span className="text-blue-600 underline cursor-pointer">2 Biz Dev Toolbox Sales</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 ml-4">
                                  <span className="text-xs text-muted-foreground">Who:</span>
                                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">BS</Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Issues List */}
                      <Card className="border-t-4 border-t-gray-400">
                        <CardHeader className="bg-gray-500 text-white py-2">
                          <CardTitle className="text-center text-sm font-bold">ISSUES LIST</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <h4 className="font-semibold text-sm mb-3">Issues:</h4>
                          <div className="space-y-3">
                            <div className="border-b pb-2">
                              <div className="flex items-start gap-2 text-sm">
                                <span className="font-medium">1.</span>
                                <span>Lack of process clarity</span>
                              </div>
                            </div>
                            <div className="border-b pb-2">
                              <div className="flex items-start gap-2 text-sm">
                                <span className="font-medium">2.</span>
                                <span>Affiliates aren&apos;t producing sufficient referrals/leads</span>
                              </div>
                            </div>
                            {issues.filter(i => i.status !== "solved").slice(0, 3).map((issue, i) => (
                              <div key={issue.id} className="border-b pb-2">
                                <div className="flex items-start gap-2 text-sm">
                                  <span className="font-medium">{i + 3}.</span>
                                  <span>{issue.description}</span>
                                </div>
                                {issue.owner && (
                                  <div className="flex items-center gap-2 mt-1 ml-4">
                                    <span className="text-xs text-muted-foreground">Who:</span>
                                    <Badge variant="secondary" className="text-xs">{issue.owner.split(' ').map(n => n[0]).join('')}</Badge>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="rocks" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center"><div><h2 className="text-lg font-semibold">Quarterly Rocks - {currentQuarter}</h2><p className="text-sm text-muted-foreground">3-7 top priorities for the quarter</p></div><Button onClick={openAddRock}><Plus className="h-4 w-4 mr-2" />Add Rock</Button></div>
                <div className="grid gap-4">
                  {rocks.map(rock => (
                    <Card key={rock.id}><CardContent className="pt-6"><div className="flex items-start gap-4"><Badge className={cn("mt-1", getStatusColor(rock.status))}>{getStatusIcon(rock.status)}<span className="ml-1 capitalize">{rock.status.replace("-", " ")}</span></Badge><div className="flex-1"><h3 className="font-semibold">{rock.description}</h3><div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground"><span className="flex items-center gap-1"><UserCheck className="h-4 w-4" />{rock.owner}</span><span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Due: {new Date(rock.dueDate).toLocaleDateString()}</span></div><div className="mt-3"><div className="flex items-center justify-between text-sm mb-1"><span>Progress</span><span className="font-medium">{rock.progress}%</span></div><Progress value={rock.progress} className="h-2" /></div></div><div className="flex gap-2"><Button variant="ghost" size="icon" onClick={() => openEditRock(rock)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => confirmDelete("rock", rock.id, rock.description.substring(0, 30))}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></div></CardContent></Card>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="scorecard" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center"><div><h2 className="text-lg font-semibold">Weekly Scorecard</h2><p className="text-sm text-muted-foreground">5-15 weekly measurables</p></div><Button onClick={openAddMetric}><Plus className="h-4 w-4 mr-2" />Add Metric</Button></div>
                <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead>Owner</TableHead><TableHead className="text-right">Goal</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-center">Trend</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{metrics.map(metric => (<TableRow key={metric.id}><TableCell className="font-medium">{metric.name}</TableCell><TableCell>{metric.owner}</TableCell><TableCell className="text-right">{metric.unit}{metric.goal.toLocaleString()}</TableCell><TableCell className={cn("text-right font-medium", metric.actual >= metric.goal ? "text-green-600" : "text-red-600")}>{metric.unit}{metric.actual.toLocaleString()}</TableCell><TableCell className="text-center">{getTrendIcon(metric.trend)}</TableCell><TableCell className="text-center">{metric.actual >= metric.goal ? <Badge className="bg-green-100 text-green-700">At Goal</Badge> : <Badge className="bg-red-100 text-red-700">Below Goal</Badge>}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => openEditMetric(metric)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => confirmDelete("metric", metric.id, metric.name)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="issues" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center"><div><h2 className="text-lg font-semibold">Issues List</h2><p className="text-sm text-muted-foreground">IDS: Identify, Discuss, Solve</p></div><Button onClick={openAddIssue}><Plus className="h-4 w-4 mr-2" />Add Issue</Button></div>
                <div className="grid gap-4">
                  {issues.map(issue => (
                    <Card key={issue.id}><CardContent className="pt-6"><div className="flex items-start gap-4"><Badge className={getPriorityColor(issue.priority)}>{issue.priority.toUpperCase()}</Badge><div className="flex-1"><h3 className="font-semibold">{issue.description}</h3><div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground"><span className="flex items-center gap-1"><UserCheck className="h-4 w-4" />{issue.owner}</span><span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Identified: {new Date(issue.identifiedDate).toLocaleDateString()}</span><Badge variant="outline" className="capitalize">{issue.status.replace("-", " ")}</Badge></div></div><div className="flex gap-2"><Button variant="ghost" size="icon" onClick={() => openEditIssue(issue)}><Edit className="h-4 w-4" /></Button>{issue.status !== "solved" && <Button variant="ghost" size="icon" className="text-green-600" onClick={() => solveIssue(issue.id)}><CheckCircle className="h-4 w-4" /></Button>}<Button variant="ghost" size="icon" onClick={() => confirmDelete("issue", issue.id, issue.description.substring(0, 30))}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></div></CardContent></Card>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="meetings" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center"><div><h2 className="text-lg font-semibold">Level 10 Meetings</h2><p className="text-sm text-muted-foreground">Weekly leadership team meetings</p></div><Button onClick={openAddMeeting}><Plus className="h-4 w-4 mr-2" />Log Meeting</Button></div>
                <div className="grid gap-4">
                  {meetings.map(meeting => (
                    <Card key={meeting.id}><CardContent className="pt-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold">{new Date(meeting.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</h3><div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Clock className="h-4 w-4" />{meeting.startTime} - {meeting.endTime}</span><span className="flex items-center gap-1"><Users className="h-4 w-4" />{meeting.attendees.length} attendees</span></div></div><div className="flex items-center gap-4"><div className="text-right"><div className="flex items-center gap-1"><span className="text-2xl font-bold">{meeting.rating}</span><span className="text-muted-foreground">/10</span></div><p className="text-sm text-muted-foreground">Meeting Rating</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEditMeeting(meeting)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => confirmDelete("meeting", meeting.id, new Date(meeting.date).toLocaleDateString())}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></div></div><div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t"><div className="text-center"><p className="text-2xl font-bold text-purple-600">{meeting.issuesSolved}</p><p className="text-xs text-muted-foreground">Issues Solved</p></div><div className="text-center">{meeting.rocksReviewed ? <CheckCircle className="h-6 w-6 text-green-600 mx-auto" /> : <XCircle className="h-6 w-6 text-red-600 mx-auto" />}<p className="text-xs text-muted-foreground">Rocks Reviewed</p></div><div className="text-center">{meeting.scorecardReviewed ? <CheckCircle className="h-6 w-6 text-green-600 mx-auto" /> : <XCircle className="h-6 w-6 text-red-600 mx-auto" />}<p className="text-xs text-muted-foreground">Scorecard Reviewed</p></div><div className="text-center"><p className="text-2xl font-bold text-blue-600">{meeting.todoCompletionRate}%</p><p className="text-xs text-muted-foreground">To-Do Completion</p></div></div></CardContent></Card>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="todos" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center"><div><h2 className="text-lg font-semibold">To-Do List</h2><p className="text-sm text-muted-foreground">Action items from Level 10 meetings</p></div><Button onClick={openAddTodo}><Plus className="h-4 w-4 mr-2" />Add To-Do</Button></div>
                <div className="grid gap-4">
                  {todos.map(todo => (
                    <Card key={todo.id} className={cn(todo.status === "complete" && "opacity-60")}><CardContent className="pt-6"><div className="flex items-center gap-4"><Checkbox checked={todo.status === "complete"} className="h-5 w-5" onCheckedChange={() => toggleTodoComplete(todo.id)} /><div className="flex-1"><p className={cn("font-medium", todo.status === "complete" && "line-through")}>{todo.description}</p><div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground"><span className="flex items-center gap-1"><UserCheck className="h-4 w-4" />{todo.owner}</span><span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Due: {new Date(todo.dueDate).toLocaleDateString()}</span></div></div><Badge variant="outline" className={cn("capitalize", todo.status === "complete" && "bg-green-100 text-green-700", todo.status === "in-progress" && "bg-blue-100 text-blue-700")}>{todo.status.replace("-", " ")}</Badge><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEditTodo(todo)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => confirmDelete("todo", todo.id, todo.description.substring(0, 30))}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></div></CardContent></Card>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="people" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center"><div><h2 className="text-lg font-semibold">People Analyzer (GWC)</h2><p className="text-sm text-muted-foreground">Right people in the right seats</p></div><Button onClick={openAddTeamMember}><Plus className="h-4 w-4 mr-2" />Add Team Member</Button></div>
                <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Category</TableHead><TableHead className="text-center">Gets It</TableHead><TableHead className="text-center">Wants It</TableHead><TableHead className="text-center">Capacity</TableHead><TableHead className="text-center">Right Seat</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{team.map(member => (<TableRow key={member.id}><TableCell className="font-medium">{member.name}</TableCell><TableCell>{member.role}</TableCell><TableCell><Badge variant={member.category === "team" ? "default" : "secondary"} className="capitalize">{member.category}</Badge></TableCell><TableCell className="text-center">{member.getsIt === true ? <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : member.getsIt === false ? <XCircle className="h-5 w-5 text-red-600 mx-auto" /> : <Minus className="h-5 w-5 text-gray-400 mx-auto" />}</TableCell><TableCell className="text-center">{member.wantsIt === true ? <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : member.wantsIt === false ? <XCircle className="h-5 w-5 text-red-600 mx-auto" /> : <Minus className="h-5 w-5 text-gray-400 mx-auto" />}</TableCell><TableCell className="text-center">{member.capacityToDoIt === true ? <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : member.capacityToDoIt === false ? <XCircle className="h-5 w-5 text-red-600 mx-auto" /> : <Minus className="h-5 w-5 text-gray-400 mx-auto" />}</TableCell><TableCell className="text-center">{member.rightSeat === true ? <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : member.rightSeat === false ? <XCircle className="h-5 w-5 text-red-600 mx-auto" /> : <Minus className="h-5 w-5 text-gray-400 mx-auto" />}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => openEditTeamMember(member)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => confirmDelete("team", member.id, member.name)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="playbooks" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                <PlaybookGenerator />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showPlaybookChat} onOpenChange={setShowPlaybookChat}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-purple-600" />Traction Assistant - Playbook Generator</DialogTitle><DialogDescription>AI-powered Mattermost Playbook creation</DialogDescription></DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {chatMessages.map(msg => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] rounded-lg p-3", msg.role === "user" ? "bg-purple-600 text-white" : "bg-muted")}>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    {msg.actions && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.actions.map((action, i) => (
                          <Button key={i} variant={msg.role === "user" ? "secondary" : "outline"} size="sm" onClick={() => sendChatMessage(action.value)}>{action.label}</Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isAiThinking && <div className="flex justify-start"><div className="bg-muted rounded-lg p-3"><Loader2 className="h-4 w-4 animate-spin" /></div></div>}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>
          <div className="flex gap-2 pt-4 border-t">
            <Input placeholder="Type your response..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChatMessage(chatInput)} />
            <Button onClick={() => sendChatMessage(chatInput)} disabled={!chatInput.trim() || isAiThinking}><Send className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rock Form Dialog */}
      <Dialog open={showRockForm} onOpenChange={setShowRockForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRock ? "Edit Rock" : "Add New Rock"}</DialogTitle>
            <DialogDescription>Quarterly priorities that must be completed</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rock-description">Description *</Label>
              <Textarea id="rock-description" placeholder="What needs to be accomplished this quarter?" value={rockForm.description} onChange={(e) => setRockForm({ ...rockForm, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rock-owner">Owner *</Label>
                <Select value={rockForm.owner} onValueChange={(v) => setRockForm({ ...rockForm, owner: v })}>
                  <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>{teamMemberNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rock-due">Due Date *</Label>
                <Input id="rock-due" type="date" value={rockForm.dueDate} onChange={(e) => setRockForm({ ...rockForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rock-status">Status</Label>
                <Select value={rockForm.status} onValueChange={(v: Rock["status"]) => setRockForm({ ...rockForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on-track">On Track</SelectItem>
                    <SelectItem value="at-risk">At Risk</SelectItem>
                    <SelectItem value="off-track">Off Track</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rock-quarter">Quarter</Label>
                <Select value={rockForm.quarter} onValueChange={(v) => setRockForm({ ...rockForm, quarter: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                    <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                    <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                    <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Progress: {rockForm.progress}%</Label>
              <Slider value={[rockForm.progress]} onValueChange={(v) => setRockForm({ ...rockForm, progress: v[0] })} max={100} step={5} className="w-full" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRockForm(false)}>Cancel</Button>
            <Button onClick={saveRock} disabled={!rockForm.description || !rockForm.owner}><Save className="h-4 w-4 mr-2" />Save Rock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metric Form Dialog */}
      <Dialog open={showMetricForm} onOpenChange={setShowMetricForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMetric ? "Edit Metric" : "Add New Metric"}</DialogTitle>
            <DialogDescription>Weekly measurable for your scorecard</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="metric-name">Metric Name *</Label>
              <Input id="metric-name" placeholder="e.g., Weekly Revenue, New Leads" value={metricForm.name} onChange={(e) => setMetricForm({ ...metricForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="metric-owner">Owner *</Label>
                <Select value={metricForm.owner} onValueChange={(v) => setMetricForm({ ...metricForm, owner: v })}>
                  <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>{teamMemberNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="metric-unit">Unit (optional)</Label>
                <Select value={metricForm.unit || "none"} onValueChange={(v) => setMetricForm({ ...metricForm, unit: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="$">$ (Dollar)</SelectItem>
                    <SelectItem value="%">% (Percent)</SelectItem>
                    <SelectItem value="#"># (Count)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="metric-goal">Goal *</Label>
                <Input id="metric-goal" type="number" placeholder="Target value" value={metricForm.goal || ""} onChange={(e) => setMetricForm({ ...metricForm, goal: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metric-actual">Actual</Label>
                <Input id="metric-actual" type="number" placeholder="Current value" value={metricForm.actual || ""} onChange={(e) => setMetricForm({ ...metricForm, actual: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric-trend">Trend</Label>
              <Select value={metricForm.trend} onValueChange={(v: ScorecardMetric["trend"]) => setMetricForm({ ...metricForm, trend: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">↑ Trending Up</SelectItem>
                  <SelectItem value="down">↓ Trending Down</SelectItem>
                  <SelectItem value="flat">→ Flat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMetricForm(false)}>Cancel</Button>
            <Button onClick={saveMetric} disabled={!metricForm.name || !metricForm.owner}><Save className="h-4 w-4 mr-2" />Save Metric</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Form Dialog */}
      <Dialog open={showIssueForm} onOpenChange={setShowIssueForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIssue ? "Edit Issue" : "Add New Issue"}</DialogTitle>
            <DialogDescription>IDS: Identify, Discuss, Solve</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="issue-description">Issue Description *</Label>
              <Textarea id="issue-description" placeholder="Describe the issue clearly" value={issueForm.description} onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue-owner">Owner *</Label>
                <Select value={issueForm.owner} onValueChange={(v) => setIssueForm({ ...issueForm, owner: v })}>
                  <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>{teamMemberNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue-priority">Priority</Label>
                <Select value={issueForm.priority} onValueChange={(v: Issue["priority"]) => setIssueForm({ ...issueForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue-date">Identified Date</Label>
                <Input id="issue-date" type="date" value={issueForm.identifiedDate} onChange={(e) => setIssueForm({ ...issueForm, identifiedDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue-status">Status</Label>
                <Select value={issueForm.status} onValueChange={(v: Issue["status"]) => setIssueForm({ ...issueForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="solved">Solved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueForm(false)}>Cancel</Button>
            <Button onClick={saveIssue} disabled={!issueForm.description || !issueForm.owner}><Save className="h-4 w-4 mr-2" />Save Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Todo Form Dialog */}
      <Dialog open={showTodoForm} onOpenChange={setShowTodoForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTodo ? "Edit To-Do" : "Add New To-Do"}</DialogTitle>
            <DialogDescription>Action items from Level 10 meetings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="todo-description">To-Do Description *</Label>
              <Textarea id="todo-description" placeholder="What needs to be done?" value={todoForm.description} onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="todo-owner">Owner *</Label>
                <Select value={todoForm.owner} onValueChange={(v) => setTodoForm({ ...todoForm, owner: v })}>
                  <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>{teamMemberNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="todo-due">Due Date *</Label>
                <Input id="todo-due" type="date" value={todoForm.dueDate} onChange={(e) => setTodoForm({ ...todoForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="todo-status">Status</Label>
              <Select value={todoForm.status} onValueChange={(v: Todo["status"]) => setTodoForm({ ...todoForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTodoForm(false)}>Cancel</Button>
            <Button onClick={saveTodo} disabled={!todoForm.description || !todoForm.owner}><Save className="h-4 w-4 mr-2" />Save To-Do</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Form Dialog */}
      <Dialog open={showMeetingForm} onOpenChange={setShowMeetingForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMeeting ? "Edit Meeting" : "Log Level 10 Meeting"}</DialogTitle>
            <DialogDescription>Record your weekly leadership meeting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meeting-date">Date *</Label>
                <Input id="meeting-date" type="date" value={meetingForm.date} onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-start">Start Time</Label>
                <Input id="meeting-start" type="time" value={meetingForm.startTime} onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-end">End Time</Label>
                <Input id="meeting-end" type="time" value={meetingForm.endTime} onChange={(e) => setMeetingForm({ ...meetingForm, endTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Meeting Rating: {meetingForm.rating}/10</Label>
              <Slider value={[meetingForm.rating]} onValueChange={(v) => setMeetingForm({ ...meetingForm, rating: v[0] })} max={10} min={1} step={1} className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meeting-issues">Issues Solved</Label>
                <Input id="meeting-issues" type="number" min={0} value={meetingForm.issuesSolved} onChange={(e) => setMeetingForm({ ...meetingForm, issuesSolved: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-todos">To-Do Completion %</Label>
                <Input id="meeting-todos" type="number" min={0} max={100} value={meetingForm.todoCompletionRate} onChange={(e) => setMeetingForm({ ...meetingForm, todoCompletionRate: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="rocks-reviewed" checked={meetingForm.rocksReviewed} onCheckedChange={(c) => setMeetingForm({ ...meetingForm, rocksReviewed: c === true })} />
                <Label htmlFor="rocks-reviewed">Rocks Reviewed</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="scorecard-reviewed" checked={meetingForm.scorecardReviewed} onCheckedChange={(c) => setMeetingForm({ ...meetingForm, scorecardReviewed: c === true })} />
                <Label htmlFor="scorecard-reviewed">Scorecard Reviewed</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeetingForm(false)}>Cancel</Button>
            <Button onClick={saveMeeting} disabled={!meetingForm.date}><Save className="h-4 w-4 mr-2" />Save Meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Member Form Dialog */}
      <Dialog open={showTeamMemberForm} onOpenChange={setShowTeamMemberForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTeamMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
            <DialogDescription>People Analyzer - GWC Assessment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member-name">Name *</Label>
                <Input id="member-name" placeholder="Full name" value={teamMemberForm.name} onChange={(e) => setTeamMemberForm({ ...teamMemberForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">Role *</Label>
                <Input id="member-role" placeholder="e.g., VP Sales" value={teamMemberForm.role} onChange={(e) => setTeamMemberForm({ ...teamMemberForm, role: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-category">Category</Label>
              <Select value={teamMemberForm.category} onValueChange={(v: TeamMember["category"]) => setTeamMemberForm({ ...teamMemberForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team (appears in owner dropdowns)</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="advisor">Advisor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">GWC Assessment</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gets It</Label>
                  <Select value={teamMemberForm.getsIt === null ? "null" : teamMemberForm.getsIt.toString()} onValueChange={(v) => setTeamMemberForm({ ...teamMemberForm, getsIt: v === "null" ? null : v === "true" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Not Assessed</SelectItem>
                      <SelectItem value="true">Yes ✓</SelectItem>
                      <SelectItem value="false">No ✗</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Wants It</Label>
                  <Select value={teamMemberForm.wantsIt === null ? "null" : teamMemberForm.wantsIt.toString()} onValueChange={(v) => setTeamMemberForm({ ...teamMemberForm, wantsIt: v === "null" ? null : v === "true" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Not Assessed</SelectItem>
                      <SelectItem value="true">Yes ✓</SelectItem>
                      <SelectItem value="false">No ✗</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity to Do It</Label>
                  <Select value={teamMemberForm.capacityToDoIt === null ? "null" : teamMemberForm.capacityToDoIt.toString()} onValueChange={(v) => setTeamMemberForm({ ...teamMemberForm, capacityToDoIt: v === "null" ? null : v === "true" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Not Assessed</SelectItem>
                      <SelectItem value="true">Yes ✓</SelectItem>
                      <SelectItem value="false">No ✗</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Right Seat</Label>
                  <Select value={teamMemberForm.rightSeat === null ? "null" : teamMemberForm.rightSeat.toString()} onValueChange={(v) => setTeamMemberForm({ ...teamMemberForm, rightSeat: v === "null" ? null : v === "true" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Not Assessed</SelectItem>
                      <SelectItem value="true">Yes ✓</SelectItem>
                      <SelectItem value="false">No ✗</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeamMemberForm(false)}>Cancel</Button>
            <Button onClick={saveTeamMember} disabled={!teamMemberForm.name || !teamMemberForm.role}><Save className="h-4 w-4 mr-2" />Save Team Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
