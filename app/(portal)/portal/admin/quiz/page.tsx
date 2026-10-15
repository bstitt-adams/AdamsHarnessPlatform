"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Eye,
  EyeOff,
  GripVertical,
  Download,
  RefreshCw,
  Users,
  BarChart3,
  Calendar,
  Mail,
  Phone,
  Building,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Loader2,
  FileText,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS, QuizQuestionDoc, QuizSubmissionDoc } from "@/lib/schema";
import { quizQuestions as defaultQuestions } from "@/lib/adams-quiz";

const categoryOptions = [
  { value: "preconstruction", label: "Preconstruction Planning" },
  { value: "risk", label: "Risk Visibility" },
  { value: "fieldLeadership", label: "Field Leadership" },
  { value: "coordination", label: "Coordination & BIM" },
  { value: "closeout", label: "Procurement & Closeout" },
  { value: "rework", label: "Rework Prevention" },
];

const followUpStatusOptions = [
  { value: "pending", label: "Pending", color: "bg-sky-500" },
  { value: "contacted", label: "Contacted", color: "bg-blue-500" },
  { value: "scheduled", label: "Scheduled", color: "bg-purple-500" },
  { value: "completed", label: "Completed", color: "bg-green-500" },
  { value: "not_interested", label: "Not Interested", color: "bg-gray-500" },
];

export default function QuizAdminPage() {
  const [activeTab, setActiveTab] = useState("questions");
  const [questions, setQuestions] = useState<QuizQuestionDoc[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmissionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestionDoc | null>(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<QuizSubmissionDoc | null>(null);
  const [seeding, setSeeding] = useState(false);
  
  const [formData, setFormData] = useState({
    questionNumber: 1,
    question: "",
    category: "preconstruction" as QuizQuestionDoc["category"],
    isActive: true,
    order: 1,
  });

  // Fetch questions from Firebase
  const fetchQuestions = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, COLLECTIONS.QUIZ_QUESTIONS), orderBy("order", "asc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizQuestionDoc));
      setQuestions(data);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Error loading questions");
    }
  };

  // Fetch submissions from Firebase
  const fetchSubmissions = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, COLLECTIONS.QUIZ_SUBMISSIONS), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizSubmissionDoc));
      setSubmissions(data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Error loading submissions");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchQuestions(), fetchSubmissions()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Seed default questions
  const handleSeedQuestions = async () => {
    if (!db) {
      toast.error("Firebase not initialized");
      return;
    }
    if (!confirm(`This will import ${defaultQuestions.length} default quiz questions. Continue?`)) return;
    
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      const collectionRef = collection(db, COLLECTIONS.QUIZ_QUESTIONS);
      
      for (const q of defaultQuestions) {
        const docRef = doc(collectionRef);
        batch.set(docRef, {
          questionNumber: q.id,
          question: q.question,
          category: q.category,
          isActive: true,
          order: q.id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      
      await batch.commit();
      await fetchQuestions();
      toast.success(`Successfully imported ${defaultQuestions.length} questions!`);
    } catch (error) {
      console.error("Error seeding questions:", error);
      toast.error("Error importing questions");
    } finally {
      setSeeding(false);
    }
  };

  // Save question
  const handleSaveQuestion = async () => {
    if (!db) {
      toast.error("Firebase not initialized");
      return;
    }
    if (!formData.question.trim()) {
      toast.error("Please enter a question");
      return;
    }
    
    try {
      if (editingQuestion) {
        const docRef = doc(db, COLLECTIONS.QUIZ_QUESTIONS, editingQuestion.id);
        await updateDoc(docRef, {
          ...formData,
          updatedAt: Timestamp.now(),
        });
        toast.success("Question updated");
      } else {
        await addDoc(collection(db, COLLECTIONS.QUIZ_QUESTIONS), {
          ...formData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        toast.success("Question added");
      }
      setDialogOpen(false);
      resetForm();
      await fetchQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error("Error saving question");
    }
  };

  // Delete question
  const handleDeleteQuestion = async (id: string) => {
    if (!db) return;
    if (!confirm("Are you sure you want to delete this question?")) return;
    
    try {
      await deleteDoc(doc(db, COLLECTIONS.QUIZ_QUESTIONS, id));
      toast.success("Question deleted");
      await fetchQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Error deleting question");
    }
  };

  // Toggle question active status
  const handleToggleActive = async (question: QuizQuestionDoc) => {
    if (!db) return;
    try {
      const docRef = doc(db, COLLECTIONS.QUIZ_QUESTIONS, question.id);
      await updateDoc(docRef, {
        isActive: !question.isActive,
        updatedAt: Timestamp.now(),
      });
      await fetchQuestions();
      toast.success(`Question ${question.isActive ? "disabled" : "enabled"}`);
    } catch (error) {
      console.error("Error toggling question:", error);
      toast.error("Error updating question");
    }
  };

  // Update submission follow-up status
  const handleUpdateFollowUp = async (submissionId: string, status: string, notes?: string) => {
    if (!db) return;
    try {
      const docRef = doc(db, COLLECTIONS.QUIZ_SUBMISSIONS, submissionId);
      await updateDoc(docRef, {
        followUpStatus: status,
        ...(notes && { followUpNotes: notes }),
        updatedAt: Timestamp.now(),
      });
      await fetchSubmissions();
      toast.success("Follow-up status updated");
    } catch (error) {
      console.error("Error updating follow-up:", error);
      toast.error("Error updating status");
    }
  };

  // Edit question
  const handleEditQuestion = (question: QuizQuestionDoc) => {
    setEditingQuestion(question);
    setFormData({
      questionNumber: question.questionNumber,
      question: question.question,
      category: question.category,
      isActive: question.isActive,
      order: question.order,
    });
    setDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setEditingQuestion(null);
    setFormData({
      questionNumber: questions.length + 1,
      question: "",
      category: "preconstruction",
      isActive: true,
      order: questions.length + 1,
    });
  };

  // View submission details
  const handleViewSubmission = (submission: QuizSubmissionDoc) => {
    setSelectedSubmission(submission);
    setSubmissionDialogOpen(true);
  };

  // Export submissions to CSV
  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Name",
      "Email",
      "Company",
      "Phone",
      "Total Score",
      "Percentage",
      "Level",
      "Follow-up Status",
    ];
    
    const rows = submissions.map(s => [
      s.createdAt?.toDate?.()?.toLocaleDateString() || "N/A",
      s.respondentName || "Anonymous",
      s.respondentEmail || "",
      s.respondentCompany || "",
      s.respondentPhone || "",
      s.totalScore,
      `${s.percentage}%`,
      s.scoreLevel,
      s.followUpStatus || "pending",
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-submissions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Submissions exported");
  };

  // Stats
  const activeQuestions = questions.filter(q => q.isActive).length;
  const totalSubmissions = submissions.length;
  const pendingFollowUps = submissions.filter(s => !s.followUpStatus || s.followUpStatus === "pending").length;
  const avgScore = submissions.length > 0 
    ? Math.round(submissions.reduce((sum, s) => sum + s.percentage, 0) / submissions.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            Adams IQ Quiz
          </h1>
          <p className="text-muted-foreground">
            Manage quiz questions and track submissions
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="/portal/admin/quiz/report-config">
            <FileText className="mr-2 h-4 w-4" />
            Configure Report Template
          </a>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeQuestions}</p>
                <p className="text-sm text-muted-foreground">Active Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSubmissions}</p>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-sky-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-sky-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingFollowUps}</p>
                <p className="text-sm text-muted-foreground">Pending Follow-ups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgScore}%</p>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="questions">
            <ClipboardList className="h-4 w-4 mr-2" />
            Questions ({questions.length})
          </TabsTrigger>
          <TabsTrigger value="submissions">
            <Users className="h-4 w-4 mr-2" />
            Submissions ({submissions.length})
          </TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quiz Questions</CardTitle>
                  <CardDescription>
                    Manage the questions shown in the Adams IQ Assessment
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {questions.length === 0 && (
                    <Button variant="outline" onClick={handleSeedQuestions} disabled={seeding}>
                      {seeding ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Import Default Questions
                        </>
                      )}
                    </Button>
                  )}
                  <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No questions yet. Import default questions or add your own.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell className="font-medium">{question.questionNumber}</TableCell>
                        <TableCell className="max-w-md">
                          <p className="truncate">{question.question}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categoryOptions.find(c => c.value === question.category)?.label || question.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={question.isActive}
                              onCheckedChange={() => handleToggleActive(question)}
                            />
                            <span className={question.isActive ? "text-green-600" : "text-muted-foreground"}>
                              {question.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditQuestion(question)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteQuestion(question.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quiz Submissions</CardTitle>
                  <CardDescription>
                    Track and follow up on quiz responses
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={fetchSubmissions}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={handleExportCSV} disabled={submissions.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No submissions yet. Submissions will appear here when users complete the quiz.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Respondent</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Follow-up</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {submission.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{submission.respondentName || "Anonymous"}</p>
                            {submission.respondentEmail && (
                              <p className="text-sm text-muted-foreground">{submission.respondentEmail}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{submission.totalScore}/{submission.maxScore}</span>
                            <Badge variant="outline">{submission.percentage}%</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              submission.scoreLevel === "Project-Ready" ? "default" :
                              submission.scoreLevel === "Developing" ? "secondary" :
                              submission.scoreLevel === "Vulnerable" ? "outline" : "destructive"
                            }
                          >
                            {submission.scoreLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={submission.followUpStatus || "pending"}
                            onValueChange={(value) => handleUpdateFollowUp(submission.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {followUpStatusOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleViewSubmission(submission)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Question Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
            <DialogDescription>
              {editingQuestion ? "Update the quiz question details" : "Add a new question to the quiz"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Number</Label>
                <Input
                  type="number"
                  value={formData.questionNumber}
                  onChange={(e) => setFormData({ ...formData, questionNumber: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Enter the question..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as QuizQuestionDoc["category"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active (visible in quiz)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestion}>
              {editingQuestion ? "Update" : "Add"} Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submission Details Dialog */}
      <Dialog open={submissionDialogOpen} onOpenChange={setSubmissionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              View complete quiz submission and responses
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-6">
              {/* Respondent Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedSubmission.respondentName || "Anonymous"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium flex items-center gap-2">
                    {selectedSubmission.respondentEmail ? (
                      <>
                        <Mail className="h-4 w-4" />
                        {selectedSubmission.respondentEmail}
                      </>
                    ) : (
                      "Not provided"
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Company</Label>
                  <p className="font-medium flex items-center gap-2">
                    {selectedSubmission.respondentCompany ? (
                      <>
                        <Building className="h-4 w-4" />
                        {selectedSubmission.respondentCompany}
                      </>
                    ) : (
                      "Not provided"
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium flex items-center gap-2">
                    {selectedSubmission.respondentPhone ? (
                      <>
                        <Phone className="h-4 w-4" />
                        {selectedSubmission.respondentPhone}
                      </>
                    ) : (
                      "Not provided"
                    )}
                  </p>
                </div>
              </div>

              {/* Score Summary */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Score</p>
                    <p className="text-3xl font-bold">{selectedSubmission.totalScore}/{selectedSubmission.maxScore}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Level</p>
                    <Badge 
                      variant={
                        selectedSubmission.scoreLevel === "Project-Ready" ? "default" :
                        selectedSubmission.scoreLevel === "Developing" ? "secondary" :
                        selectedSubmission.scoreLevel === "Vulnerable" ? "outline" : "destructive"
                      }
                      className="text-lg px-3 py-1"
                    >
                      {selectedSubmission.scoreLevel}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Category Scores */}
              {selectedSubmission.categoryScores && selectedSubmission.categoryScores.length > 0 && (
                <div>
                  <Label className="text-muted-foreground mb-2 block">Category Breakdown</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedSubmission.categoryScores.map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm capitalize">{cat.category}</span>
                        <Badge variant="outline">{cat.percentage}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up Notes */}
              <div className="space-y-2">
                <Label>Follow-up Notes</Label>
                <Textarea
                  placeholder="Add notes about this lead..."
                  value={selectedSubmission.followUpNotes || ""}
                  onChange={(e) => {
                    setSelectedSubmission({ ...selectedSubmission, followUpNotes: e.target.value });
                  }}
                  rows={3}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleUpdateFollowUp(
                    selectedSubmission.id, 
                    selectedSubmission.followUpStatus || "pending",
                    selectedSubmission.followUpNotes
                  )}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Save Notes
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmissionDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
