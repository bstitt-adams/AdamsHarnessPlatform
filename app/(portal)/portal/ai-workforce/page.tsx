"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Bot,
  Plus,
  Send,
  Loader2,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  User,
  Briefcase,
  Scale,
  Megaphone,
  Target,
  Users,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, Timestamp } from "firebase/firestore";
import { COLLECTIONS, type AIEmployeeDoc, type AIEmployeeChatDoc } from "@/lib/schema";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/user-profile-context";
import Link from "next/link";
import {
  AI_EMPLOYEE_CONFIGS,
  AI_EMPLOYEE_ROLES,
  createDefaultAIEmployee,
  type AIEmployee,
  type AIEmployeeRole,
} from "@/lib/ai-workforce";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface EmployeeChat {
  employeeId: string;
  messages: ChatMessage[];
}

const roleIcons: Record<AIEmployeeRole, React.ElementType> = {
  cfo: Briefcase,
  hr: Users,
  legal: Scale,
  marketing: Megaphone,
  sales: Target,
};

type AIStatus = "checking" | "connected" | "fallback" | "error";

export default function AIWorkforcePage() {
  const { profile } = useUserProfile();
  const [employees, setEmployees] = useState<AIEmployee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<AIEmployee | null>(null);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<AIEmployee | null>(null);
  const [newEmployeeRole, setNewEmployeeRole] = useState<AIEmployeeRole>("cfo");
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>("checking");
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check AI connection status on mount
  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    setAiStatus("checking");
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "test",
          systemPrompt: "Respond with 'ok'",
          conversationHistory: [],
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Check if it's a fallback response
        if (data.response?.includes("configure your LLM") || data.response?.includes("unlock full AI")) {
          setAiStatus("fallback");
        } else {
          setAiStatus("connected");
        }
      } else {
        setAiStatus("error");
      }
    } catch {
      setAiStatus("error");
    }
  };

  // Load employees from Firebase on mount
  useEffect(() => {
    loadEmployeesFromFirebase();
  }, [profile.id]);

  const loadEmployeesFromFirebase = async () => {
    if (!db || !profile.id) {
      // Fallback to localStorage if Firebase not available
      loadFromLocalStorage();
      return;
    }

    setIsLoadingEmployees(true);
    try {
      const employeesRef = collection(db, COLLECTIONS.AI_EMPLOYEES);
      const q = query(employeesRef, where("userId", "==", profile.id), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Initialize with default employees
        await initializeDefaultEmployees();
      } else {
        const loadedEmployees: AIEmployee[] = snapshot.docs.map(doc => {
          const data = doc.data() as AIEmployeeDoc;
          return {
            id: doc.id,
            role: data.role as AIEmployeeRole,
            name: data.name,
            title: data.title,
            description: data.description,
            avatar: data.avatar,
            color: data.color,
            systemPrompt: data.systemPrompt,
            capabilities: data.capabilities,
            sampleQuestions: data.sampleQuestions,
          };
        });
        setEmployees(loadedEmployees);
        if (loadedEmployees.length > 0) {
          setSelectedEmployee(loadedEmployees[0]);
        }
      }

      // Load chats
      await loadChatsFromFirebase();
    } catch (error) {
      console.error("Error loading employees from Firebase:", error);
      loadFromLocalStorage();
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const loadChatsFromFirebase = async () => {
    if (!db || !profile.id) return;

    try {
      const chatsRef = collection(db, COLLECTIONS.AI_EMPLOYEE_CHATS);
      const q = query(chatsRef, where("userId", "==", profile.id));
      const snapshot = await getDocs(q);
      
      const loadedChats: Record<string, ChatMessage[]> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as AIEmployeeChatDoc;
        loadedChats[data.employeeId] = data.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toDate(),
        }));
      });
      setChats(loadedChats);
    } catch (error) {
      console.error("Error loading chats from Firebase:", error);
    }
  };

  const loadFromLocalStorage = () => {
    const savedEmployees = localStorage.getItem("adams_ai_employees");
    if (savedEmployees) {
      try {
        const parsed = JSON.parse(savedEmployees);
        setEmployees(parsed);
        if (parsed.length > 0) {
          setSelectedEmployee(parsed[0]);
        }
      } catch {
        initializeDefaultEmployeesLocal();
      }
    } else {
      initializeDefaultEmployeesLocal();
    }

    const savedChats = localStorage.getItem("adams_ai_chats");
    if (savedChats) {
      try {
        setChats(JSON.parse(savedChats));
      } catch {
        // Ignore
      }
    }
    setIsLoadingEmployees(false);
  };

  const initializeDefaultEmployeesLocal = () => {
    const defaultEmployees: AIEmployee[] = [
      createDefaultAIEmployee("cfo", "Alex Finance"),
      createDefaultAIEmployee("hr", "Jordan People"),
      createDefaultAIEmployee("legal", "Morgan Counsel"),
      createDefaultAIEmployee("marketing", "Taylor Brand"),
      createDefaultAIEmployee("sales", "Casey Closer"),
    ];
    setEmployees(defaultEmployees);
    setSelectedEmployee(defaultEmployees[0]);
    localStorage.setItem("adams_ai_employees", JSON.stringify(defaultEmployees));
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, selectedEmployee]);

  const initializeDefaultEmployees = async () => {
    const defaultEmployees: AIEmployee[] = [
      createDefaultAIEmployee("cfo", "Alex Finance"),
      createDefaultAIEmployee("hr", "Jordan People"),
      createDefaultAIEmployee("legal", "Morgan Counsel"),
      createDefaultAIEmployee("marketing", "Taylor Brand"),
      createDefaultAIEmployee("sales", "Casey Closer"),
    ];
    
    // Save to Firebase if available
    if (db && profile.id) {
      try {
        const employeesRef = collection(db, COLLECTIONS.AI_EMPLOYEES);
        for (const emp of defaultEmployees) {
          await addDoc(employeesRef, {
            userId: profile.id,
            role: emp.role,
            name: emp.name,
            title: emp.title,
            description: emp.description,
            avatar: emp.avatar,
            color: emp.color,
            systemPrompt: emp.systemPrompt,
            capabilities: emp.capabilities,
            sampleQuestions: emp.sampleQuestions,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }
        // Reload from Firebase to get proper IDs
        await loadEmployeesFromFirebase();
      } catch (error) {
        console.error("Error saving default employees to Firebase:", error);
        setEmployees(defaultEmployees);
        setSelectedEmployee(defaultEmployees[0]);
      }
    } else {
      setEmployees(defaultEmployees);
      setSelectedEmployee(defaultEmployees[0]);
    }
  };

  const addEmployee = async () => {
    const newEmployee = createDefaultAIEmployee(
      newEmployeeRole,
      newEmployeeName || undefined
    );
    
    setIsSaving(true);
    try {
      if (db && profile.id) {
        const employeesRef = collection(db, COLLECTIONS.AI_EMPLOYEES);
        const docRef = await addDoc(employeesRef, {
          userId: profile.id,
          role: newEmployee.role,
          name: newEmployee.name,
          title: newEmployee.title,
          description: newEmployee.description,
          avatar: newEmployee.avatar,
          color: newEmployee.color,
          systemPrompt: newEmployee.systemPrompt,
          capabilities: newEmployee.capabilities,
          sampleQuestions: newEmployee.sampleQuestions,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        
        const savedEmployee = { ...newEmployee, id: docRef.id };
        setEmployees((prev) => [...prev, savedEmployee]);
        setSelectedEmployee(savedEmployee);
        toast.success(`${savedEmployee.name} added to your AI team`);
      } else {
        setEmployees((prev) => [...prev, newEmployee]);
        setSelectedEmployee(newEmployee);
        localStorage.setItem("adams_ai_employees", JSON.stringify([...employees, newEmployee]));
      }
    } catch (error) {
      console.error("Error adding employee:", error);
      toast.error("Failed to add AI employee");
    } finally {
      setIsSaving(false);
      setAddDialogOpen(false);
      setNewEmployeeName("");
    }
  };

  const confirmDeleteEmployee = (employee: AIEmployee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const removeEmployee = async () => {
    if (!employeeToDelete) return;
    
    const employeeId = employeeToDelete.id;
    setIsSaving(true);
    
    try {
      if (db && profile.id) {
        // Delete from Firebase
        await deleteDoc(doc(db, COLLECTIONS.AI_EMPLOYEES, employeeId));
        
        // Also delete chat history
        const chatsRef = collection(db, COLLECTIONS.AI_EMPLOYEE_CHATS);
        const q = query(chatsRef, where("employeeId", "==", employeeId), where("userId", "==", profile.id));
        const snapshot = await getDocs(q);
        for (const chatDoc of snapshot.docs) {
          await deleteDoc(chatDoc.ref);
        }
      }
      
      setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee(employees.find((e) => e.id !== employeeId) || null);
      }
      setChats((prev) => {
        const newChats = { ...prev };
        delete newChats[employeeId];
        return newChats;
      });
      
      toast.success(`${employeeToDelete.name} removed from your AI team`);
    } catch (error) {
      console.error("Error removing employee:", error);
      toast.error("Failed to remove AI employee");
    } finally {
      setIsSaving(false);
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const clearChat = async (employeeId: string) => {
    try {
      if (db && profile.id) {
        const chatsRef = collection(db, COLLECTIONS.AI_EMPLOYEE_CHATS);
        const q = query(chatsRef, where("employeeId", "==", employeeId), where("userId", "==", profile.id));
        const snapshot = await getDocs(q);
        for (const chatDoc of snapshot.docs) {
          await deleteDoc(chatDoc.ref);
        }
      }
      
      setChats((prev) => ({
        ...prev,
        [employeeId]: [],
      }));
      toast.success("Chat cleared");
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Failed to clear chat");
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedEmployee || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    // Add user message to chat
    setChats((prev) => ({
      ...prev,
      [selectedEmployee.id]: [...(prev[selectedEmployee.id] || []), userMessage],
    }));
    setInputMessage("");
    setIsLoading(true);

    try {
      // Call the AI API
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          systemPrompt: selectedEmployee.systemPrompt,
          conversationHistory: chats[selectedEmployee.id] || [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-response`,
        role: "assistant",
        content: data.response || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };

      setChats((prev) => ({
        ...prev,
        [selectedEmployee.id]: [...(prev[selectedEmployee.id] || []), assistantMessage],
      }));
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: "I apologize, but I encountered an error. Please check your LLM configuration in Settings and try again.",
        timestamp: new Date(),
      };
      setChats((prev) => ({
        ...prev,
        [selectedEmployee.id]: [...(prev[selectedEmployee.id] || []), errorMessage],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentChat = selectedEmployee ? chats[selectedEmployee.id] || [] : [];

  // Get AI status badge
  const getAiStatusBadge = () => {
    switch (aiStatus) {
      case "checking":
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking AI...
          </Badge>
        );
      case "connected":
        return (
          <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="h-3 w-3" />
            AI Connected
          </Badge>
        );
      case "fallback":
        return (
          <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
            <AlertCircle className="h-3 w-3" />
            Configure AI
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <WifiOff className="h-3 w-3" />
            AI Offline
          </Badge>
        );
    }
  };

  if (isLoadingEmployees) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your AI team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Workforce</h1>
          <p className="text-muted-foreground">
            Your team of AI experts ready to assist with business decisions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {getAiStatusBadge()}
          {aiStatus === "fallback" && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/portal/settings">
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Link>
            </Button>
          )}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add AI Employee
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add AI Employee</DialogTitle>
              <DialogDescription>
                Add a new AI expert to your workforce
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newEmployeeRole}
                  onValueChange={(v) => setNewEmployeeRole(v as AIEmployeeRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_EMPLOYEE_ROLES.map((role) => (
                      <SelectItem key={role.role} value={role.role}>
                        <div className="flex items-center gap-2">
                          <span>{AI_EMPLOYEE_CONFIGS[role.role].avatar}</span>
                          <span>{role.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Custom Name (optional)</Label>
                <Input
                  placeholder="e.g., Alex Finance"
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">
                  {AI_EMPLOYEE_CONFIGS[newEmployeeRole].title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {AI_EMPLOYEE_CONFIGS[newEmployeeRole].description}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addEmployee}>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-220px)]">
        {/* Employee List */}
        <div className="col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Your AI Team</CardTitle>
              <CardDescription>
                {employees.length} AI employee{employees.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-340px)]">
                <div className="space-y-1 p-2">
                  {employees.map((employee) => {
                    const Icon = roleIcons[employee.role];
                    return (
                      <button
                        key={employee.id}
                        onClick={() => setSelectedEmployee(employee)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                          selectedEmployee?.id === employee.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-lg",
                            selectedEmployee?.id === employee.id
                              ? "bg-primary-foreground/20"
                              : "bg-muted"
                          )}
                          style={{
                            backgroundColor:
                              selectedEmployee?.id === employee.id
                                ? undefined
                                : `${employee.color}20`,
                          }}
                        >
                          {employee.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{employee.name}</p>
                          <p
                            className={cn(
                              "text-xs truncate",
                              selectedEmployee?.id === employee.id
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {employee.title}
                          </p>
                        </div>
                        {chats[employee.id]?.length > 0 && (
                          <Badge
                            variant={
                              selectedEmployee?.id === employee.id
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {chats[employee.id].length}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="col-span-9">
          {selectedEmployee ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${selectedEmployee.color}20` }}
                    >
                      {selectedEmployee.avatar}
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedEmployee.name}
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: selectedEmployee.color,
                            color: selectedEmployee.color,
                          }}
                        >
                          {selectedEmployee.title}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="line-clamp-1">
                        {selectedEmployee.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => clearChat(selectedEmployee.id)}
                      title="Clear chat"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDeleteEmployee(selectedEmployee)}
                      title="Remove employee"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {currentChat.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4"
                      style={{ backgroundColor: `${selectedEmployee.color}20` }}
                    >
                      {selectedEmployee.avatar}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      Chat with {selectedEmployee.name}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      {selectedEmployee.description}
                    </p>
                    <div className="space-y-2 w-full max-w-md">
                      <p className="text-sm font-medium text-muted-foreground">
                        Try asking:
                      </p>
                      {selectedEmployee.sampleQuestions.map((question, i) => (
                        <button
                          key={i}
                          onClick={() => setInputMessage(question)}
                          className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors text-sm"
                        >
                          &ldquo;{question}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentChat.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {message.role === "assistant" && (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                            style={{
                              backgroundColor: `${selectedEmployee.color}20`,
                            }}
                          >
                            {selectedEmployee.avatar}
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg p-4 group relative",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <div className="whitespace-pre-wrap text-sm">
                            {message.content}
                          </div>
                          <button
                            onClick={() =>
                              copyToClipboard(message.content, message.id)
                            }
                            className={cn(
                              "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded",
                              message.role === "user"
                                ? "hover:bg-primary-foreground/20"
                                : "hover:bg-background"
                            )}
                          >
                            {copiedId === message.id ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        {message.role === "user" && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                          style={{
                            backgroundColor: `${selectedEmployee.color}20`,
                          }}
                        >
                          {selectedEmployee.avatar}
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
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
                    placeholder={`Ask ${selectedEmployee.name} a question...`}
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
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center p-8">
                <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No AI Employee Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select an AI employee from the list or add a new one
                </p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add AI Employee
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove AI Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {employeeToDelete?.name} from your AI team and delete all chat history with them. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeEmployee}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
