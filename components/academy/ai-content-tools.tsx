"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Loader2,
  Wand2,
  BookOpen,
  FileText,
  HelpCircle,
  GraduationCap,
  Lightbulb,
  CheckCircle,
  Copy,
  RefreshCw,
  Brain,
  ListChecks,
  Video,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateCourseSyllabus,
  generateLessonContent,
  generateQuiz,
  generateExam,
  enhanceContent,
  generateVideoScript,
  type CourseOutline,
  type GeneratedLesson,
  type GeneratedQuiz,
  type GeneratedExam,
} from "@/lib/ai-course-generator";

// ============================================================================
// AI Syllabus Generator Dialog
// ============================================================================

interface AISyllabusGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle: string;
  courseDescription: string;
  onApplySyllabus: (syllabus: CourseOutline) => void;
}

export function AISyllabusGenerator({
  open,
  onOpenChange,
  courseTitle,
  courseDescription,
  onApplySyllabus,
}: AISyllabusGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState(courseTitle);
  const [targetAudience, setTargetAudience] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [desiredOutcomes, setDesiredOutcomes] = useState("");
  const [numberOfModules, setNumberOfModules] = useState("5");
  const [additionalContext, setAdditionalContext] = useState(courseDescription);
  const [generatedSyllabus, setGeneratedSyllabus] = useState<CourseOutline | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a course topic");
      return;
    }
    if (!targetAudience.trim()) {
      toast.error("Please describe your target audience");
      return;
    }

    setGenerating(true);
    try {
      const syllabus = await generateCourseSyllabus({
        topic,
        targetAudience,
        difficultyLevel,
        desiredOutcomes: desiredOutcomes || undefined,
        numberOfModules: parseInt(numberOfModules),
        additionalContext: additionalContext || undefined,
      });
      setGeneratedSyllabus(syllabus);
      toast.success("Syllabus generated successfully!");
    } catch (error) {
      console.error("Error generating syllabus:", error);
      toast.error("Failed to generate syllabus. Please check your AI configuration.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedSyllabus) {
      onApplySyllabus(generatedSyllabus);
      onOpenChange(false);
      setGeneratedSyllabus(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            AI Syllabus Generator
          </DialogTitle>
          <DialogDescription>
            Generate a complete course outline with modules and lessons using AI
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={generatedSyllabus ? "preview" : "generate"} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Configure</TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedSyllabus}>
              Preview {generatedSyllabus && <CheckCircle className="ml-1 h-3 w-3 text-green-500" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="flex-1 overflow-auto">
            <div className="space-y-4 p-1">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="topic">Course Topic *</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Introduction to Machine Learning"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience *</Label>
                  <Input
                    id="audience"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., Business professionals with no coding experience"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={difficultyLevel} onValueChange={(v) => setDifficultyLevel(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modules">Number of Modules</Label>
                  <Select value={numberOfModules} onValueChange={setNumberOfModules}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 modules</SelectItem>
                      <SelectItem value="4">4 modules</SelectItem>
                      <SelectItem value="5">5 modules</SelectItem>
                      <SelectItem value="6">6 modules</SelectItem>
                      <SelectItem value="8">8 modules</SelectItem>
                      <SelectItem value="10">10 modules</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="outcomes">Desired Learning Outcomes (optional)</Label>
                <Textarea
                  id="outcomes"
                  value={desiredOutcomes}
                  onChange={(e) => setDesiredOutcomes(e.target.value)}
                  placeholder="What should students be able to do after completing this course?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="context">Additional Context (optional)</Label>
                <Textarea
                  id="context"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Any specific requirements, industry focus, or constraints..."
                  rows={2}
                />
              </div>

              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Syllabus...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Course Syllabus
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-hidden">
            {generatedSyllabus && (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{generatedSyllabus.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{generatedSyllabus.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{generatedSyllabus.difficultyLevel}</Badge>
                    <Badge variant="outline">{generatedSyllabus.estimatedDuration}</Badge>
                    <Badge variant="outline">{generatedSyllabus.modules.length} modules</Badge>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Learning Outcomes</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {generatedSyllabus.learningOutcomes.map((outcome, i) => (
                        <li key={i}>{outcome}</li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-3">Course Structure</h4>
                    <div className="space-y-4">
                      {generatedSyllabus.modules.map((module, mi) => (
                        <div key={mi} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium">Module {mi + 1}: {module.title}</h5>
                              <p className="text-sm text-muted-foreground">{module.description}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">{module.estimatedDuration}</Badge>
                          </div>
                          <div className="mt-2 space-y-1">
                            {module.lessons.map((lesson, li) => (
                              <div key={li} className="flex items-center gap-2 text-sm pl-4">
                                <Badge variant="outline" className="text-xs capitalize">{lesson.contentType}</Badge>
                                <span>{lesson.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => setGeneratedSyllabus(null)} disabled={!generatedSyllabus}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
          <Button onClick={handleApply} disabled={!generatedSyllabus}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Apply to Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// AI Lesson Generator Dialog
// ============================================================================

interface AILessonGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  lessonDescription: string;
  contentType: "video" | "text" | "assignment";
  targetAudience?: string;
  difficultyLevel?: string;
  onApplyContent: (content: GeneratedLesson) => void;
}

export function AILessonGenerator({
  open,
  onOpenChange,
  courseTitle,
  moduleTitle,
  lessonTitle,
  lessonDescription,
  contentType,
  targetAudience = "General learners",
  difficultyLevel = "intermediate",
  onApplyContent,
}: AILessonGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedLesson | null>(null);
  const [keyPoints, setKeyPoints] = useState("");

  const handleGenerate = async () => {
    if (!lessonTitle.trim()) {
      toast.error("Please enter a lesson title first");
      return;
    }

    setGenerating(true);
    try {
      const content = await generateLessonContent({
        lessonTitle,
        lessonDescription,
        courseTitle,
        moduleTitle,
        contentType,
        targetAudience,
        difficultyLevel,
        keyPoints: keyPoints ? keyPoints.split(",").map(k => k.trim()) : undefined,
      });
      setGeneratedContent(content);
      toast.success("Lesson content generated!");
    } catch (error) {
      console.error("Error generating lesson:", error);
      toast.error("Failed to generate lesson content");
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedContent) {
      onApplyContent(generatedContent);
      onOpenChange(false);
      setGeneratedContent(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Lesson Content Generator
          </DialogTitle>
          <DialogDescription>
            Generate {contentType} content for: {lessonTitle || "New Lesson"}
          </DialogDescription>
        </DialogHeader>

        {!generatedContent ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Course:</span> {courseTitle}</div>
                <div><span className="text-muted-foreground">Module:</span> {moduleTitle}</div>
                <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline" className="capitalize">{contentType}</Badge></div>
                <div><span className="text-muted-foreground">Level:</span> {difficultyLevel}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyPoints">Key Points to Cover (optional, comma-separated)</Label>
              <Input
                id="keyPoints"
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                placeholder="e.g., Introduction, Core concepts, Best practices, Common mistakes"
              />
            </div>

            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate {contentType === "video" ? "Video Script" : contentType === "text" ? "Article" : "Assignment"}
                </>
              )}
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Generated Content</h4>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent.content)}>
                    <Copy className="h-4 w-4 mr-1" /> Copy
                  </Button>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap max-h-[200px] overflow-auto">
                  {generatedContent.content}
                </div>
              </div>

              {generatedContent.videoScript && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Video className="h-4 w-4" /> Video Script
                    </h4>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent.videoScript!)}>
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm whitespace-pre-wrap max-h-[200px] overflow-auto">
                    {generatedContent.videoScript}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Key Takeaways</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {generatedContent.keyTakeaways.map((takeaway, i) => (
                    <li key={i}>{takeaway}</li>
                  ))}
                </ul>
              </div>

              {generatedContent.discussionQuestions && generatedContent.discussionQuestions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Discussion Questions</h4>
                  <ul className="list-decimal list-inside text-sm space-y-1">
                    {generatedContent.discussionQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {generatedContent && (
            <>
              <Button variant="outline" onClick={() => setGeneratedContent(null)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button onClick={handleApply}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Apply Content
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// AI Quiz Generator Dialog
// ============================================================================

interface AIQuizGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle: string;
  moduleTitle?: string;
  lessonTitle?: string;
  topic: string;
  onApplyQuiz: (quiz: GeneratedQuiz) => void;
}

export function AIQuizGenerator({
  open,
  onOpenChange,
  courseTitle,
  moduleTitle,
  lessonTitle,
  topic,
  onApplyQuiz,
}: AIQuizGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [numberOfQuestions, setNumberOfQuestions] = useState("5");
  const [keyConceptsToTest, setKeyConceptsToTest] = useState("");
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const quiz = await generateQuiz({
        topic: topic || lessonTitle || moduleTitle || courseTitle,
        lessonTitle,
        moduleTitle,
        courseTitle,
        numberOfQuestions: parseInt(numberOfQuestions),
        questionTypes: ["multiple_choice", "true_false"],
        keyConceptsToTest: keyConceptsToTest ? keyConceptsToTest.split(",").map(k => k.trim()) : undefined,
      });
      setGeneratedQuiz(quiz);
      toast.success("Quiz generated!");
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz");
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedQuiz) {
      onApplyQuiz(generatedQuiz);
      onOpenChange(false);
      setGeneratedQuiz(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-green-500" />
            AI Quiz Generator
          </DialogTitle>
          <DialogDescription>
            Generate quiz questions for: {topic || lessonTitle || "Course Assessment"}
          </DialogDescription>
        </DialogHeader>

        {!generatedQuiz ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Number of Questions</Label>
                <Select value={numberOfQuestions} onValueChange={setNumberOfQuestions}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 questions</SelectItem>
                    <SelectItem value="5">5 questions</SelectItem>
                    <SelectItem value="10">10 questions</SelectItem>
                    <SelectItem value="15">15 questions</SelectItem>
                    <SelectItem value="20">20 questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="concepts">Key Concepts to Test (optional, comma-separated)</Label>
              <Input
                id="concepts"
                value={keyConceptsToTest}
                onChange={(e) => setKeyConceptsToTest(e.target.value)}
                placeholder="e.g., Variables, Functions, Loops, Error handling"
              />
            </div>

            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Quiz Questions
                </>
              )}
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{generatedQuiz.title}</h4>
                  <p className="text-sm text-muted-foreground">{generatedQuiz.description}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">Pass: {generatedQuiz.passingScore}%</Badge>
                  <Badge variant="outline">{generatedQuiz.timeLimit} min</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                {generatedQuiz.questions.map((q, i) => (
                  <div key={q.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium">Q{i + 1}. {q.question}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs capitalize">{q.type.replace("_", " ")}</Badge>
                        <Badge variant={q.difficulty === "easy" ? "secondary" : q.difficulty === "hard" ? "destructive" : "outline"} className="text-xs">
                          {q.difficulty}
                        </Badge>
                      </div>
                    </div>
                    {q.options && (
                      <div className="space-y-1 ml-4">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={`text-sm ${oi === q.correctAnswer ? "text-green-600 font-medium" : ""}`}>
                            {opt} {oi === q.correctAnswer && "✓"}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Explanation: {q.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {generatedQuiz && (
            <>
              <Button variant="outline" onClick={() => setGeneratedQuiz(null)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button onClick={handleApply}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Apply Quiz
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// AI Exam Generator Dialog
// ============================================================================

interface AIExamGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle: string;
  modules: { title: string; keyTopics: string[] }[];
  onApplyExam: (exam: GeneratedExam) => void;
}

export function AIExamGenerator({
  open,
  onOpenChange,
  courseTitle,
  modules,
  onApplyExam,
}: AIExamGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [examType, setExamType] = useState<"midterm" | "final" | "certification">("final");
  const [totalQuestions, setTotalQuestions] = useState("20");
  const [timeLimit, setTimeLimit] = useState("60");
  const [includeEssay, setIncludeEssay] = useState(false);
  const [generatedExam, setGeneratedExam] = useState<GeneratedExam | null>(null);

  const handleGenerate = async () => {
    if (modules.length === 0) {
      toast.error("Please add modules to the course first");
      return;
    }

    setGenerating(true);
    try {
      const exam = await generateExam({
        courseTitle,
        modules,
        examType,
        totalQuestions: parseInt(totalQuestions),
        timeLimit: parseInt(timeLimit),
        includeEssay,
      });
      setGeneratedExam(exam);
      toast.success("Exam generated!");
    } catch (error) {
      console.error("Error generating exam:", error);
      toast.error("Failed to generate exam");
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedExam) {
      onApplyExam(generatedExam);
      onOpenChange(false);
      setGeneratedExam(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-500" />
            AI Exam Generator
          </DialogTitle>
          <DialogDescription>
            Generate a comprehensive exam covering all course modules
          </DialogDescription>
        </DialogHeader>

        {!generatedExam ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Modules to Cover ({modules.length})</h4>
              <div className="flex flex-wrap gap-2">
                {modules.map((m, i) => (
                  <Badge key={i} variant="outline">{m.title}</Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Exam Type</Label>
                <Select value={examType} onValueChange={(v) => setExamType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midterm">Midterm Exam</SelectItem>
                    <SelectItem value="final">Final Exam</SelectItem>
                    <SelectItem value="certification">Certification Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Questions</Label>
                <Select value={totalQuestions} onValueChange={setTotalQuestions}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 questions</SelectItem>
                    <SelectItem value="20">20 questions</SelectItem>
                    <SelectItem value="30">30 questions</SelectItem>
                    <SelectItem value="50">50 questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time Limit</Label>
                <Select value={timeLimit} onValueChange={setTimeLimit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={generating || modules.length === 0} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Exam...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate {examType === "final" ? "Final" : examType === "midterm" ? "Midterm" : "Certification"} Exam
                </>
              )}
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg">{generatedExam.title}</h4>
                <p className="text-sm text-muted-foreground">{generatedExam.description}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">Pass: {generatedExam.passingScore}%</Badge>
                  <Badge variant="outline">{generatedExam.timeLimit} min</Badge>
                  <Badge variant="outline">{generatedExam.sections.reduce((acc, s) => acc + s.questions.length, 0)} questions</Badge>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <strong>Instructions:</strong> {generatedExam.instructions}
              </div>

              <Separator />

              {generatedExam.sections.map((section, si) => (
                <div key={si} className="space-y-3">
                  <h5 className="font-medium">{section.title}</h5>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                  <div className="space-y-2 ml-4">
                    {section.questions.slice(0, 3).map((q, qi) => (
                      <div key={q.id} className="p-3 border rounded text-sm">
                        <div className="flex items-start justify-between">
                          <span>{qi + 1}. {q.question}</span>
                          <Badge variant="outline" className="text-xs">{q.points} pts</Badge>
                        </div>
                      </div>
                    ))}
                    {section.questions.length > 3 && (
                      <p className="text-sm text-muted-foreground italic">
                        + {section.questions.length - 3} more questions...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {generatedExam && (
            <>
              <Button variant="outline" onClick={() => setGeneratedExam(null)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button onClick={handleApply}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Apply Exam
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// AI Content Enhancement Button
// ============================================================================

interface AIEnhanceButtonProps {
  content: string;
  contentType: "description" | "lesson" | "quiz_question" | "learning_outcome";
  context?: string;
  onEnhanced: (enhanced: string) => void;
  className?: string;
}

export function AIEnhanceButton({
  content,
  contentType,
  context,
  onEnhanced,
  className,
}: AIEnhanceButtonProps) {
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhance = async () => {
    if (!content.trim()) {
      toast.error("Please enter some content first");
      return;
    }

    setEnhancing(true);
    try {
      const enhanced = await enhanceContent({ content, contentType, context });
      onEnhanced(enhanced);
      toast.success("Content enhanced!");
    } catch (error) {
      console.error("Error enhancing content:", error);
      toast.error("Failed to enhance content");
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleEnhance}
      disabled={enhancing || !content.trim()}
      className={className}
    >
      {enhancing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      <span className="ml-1 text-xs">Enhance</span>
    </Button>
  );
}

// ============================================================================
// AI Toolbar Component
// ============================================================================

interface AIToolbarProps {
  courseTitle: string;
  courseDescription: string;
  modules: { id: string; title: string; lessons: { title: string }[] }[];
  onGenerateSyllabus: () => void;
  onGenerateQuiz: () => void;
  onGenerateExam: () => void;
}

export function AIToolbar({
  courseTitle,
  courseDescription,
  modules,
  onGenerateSyllabus,
  onGenerateQuiz,
  onGenerateExam,
}: AIToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
        <Sparkles className="h-4 w-4" />
        AI Tools
      </div>
      <Separator orientation="vertical" className="h-6" />
      <Button variant="ghost" size="sm" onClick={onGenerateSyllabus} className="text-xs">
        <BookOpen className="h-3 w-3 mr-1" />
        Generate Syllabus
      </Button>
      <Button variant="ghost" size="sm" onClick={onGenerateQuiz} className="text-xs">
        <HelpCircle className="h-3 w-3 mr-1" />
        Generate Quiz
      </Button>
      <Button variant="ghost" size="sm" onClick={onGenerateExam} disabled={modules.length === 0} className="text-xs">
        <GraduationCap className="h-3 w-3 mr-1" />
        Generate Exam
      </Button>
    </div>
  );
}
