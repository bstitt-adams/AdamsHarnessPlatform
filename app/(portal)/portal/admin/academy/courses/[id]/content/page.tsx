"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Play,
  FileText,
  HelpCircle,
  ClipboardList,
  Download,
  Radio,
  Video,
  Link as LinkIcon,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Save,
  ExternalLink,
  Sparkles,
  Wand2,
  BookOpen,
  GraduationCap,
  Brain,
} from "lucide-react";
import {
  getCourse,
  getCourseWithModulesAndLessons,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  type CourseDoc,
  type CourseModuleDoc,
  type LessonDoc,
} from "@/lib/firebase-lms";
import type { ContentType } from "@/types/academy";
import {
  AISyllabusGenerator,
  AILessonGenerator,
  AIQuizGenerator,
  AIExamGenerator,
  AIEnhanceButton,
} from "@/components/academy/ai-content-tools";
import {
  type CourseOutline,
  type GeneratedLesson,
  type GeneratedQuiz,
  type GeneratedExam,
} from "@/lib/ai-course-generator";
import { Separator } from "@/components/ui/separator";
import { LessonImagePicker } from "@/components/academy/lesson-image-picker";

interface ModuleWithLessons extends CourseModuleDoc {
  lessons: LessonDoc[];
}

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "video", label: "Video", icon: <Play className="h-4 w-4" />, description: "Embed video from YouTube, Vimeo, or direct URL" },
  { value: "text", label: "Text/Article", icon: <FileText className="h-4 w-4" />, description: "Rich text content with formatting" },
  { value: "quiz", label: "Quiz", icon: <HelpCircle className="h-4 w-4" />, description: "Interactive quiz with multiple choice questions" },
  { value: "assignment", label: "Assignment", icon: <ClipboardList className="h-4 w-4" />, description: "Homework or project submission" },
  { value: "download", label: "Downloadable", icon: <Download className="h-4 w-4" />, description: "PDF, worksheet, or other downloadable resource" },
  { value: "live", label: "Live Session", icon: <Radio className="h-4 w-4" />, description: "Scheduled live video session" },
];

function getContentTypeIcon(type: ContentType) {
  const option = CONTENT_TYPE_OPTIONS.find(o => o.value === type);
  return option?.icon || <FileText className="h-4 w-4" />;
}

function extractVideoId(url: string): { platform: string; id: string } | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { platform: "youtube", id: ytMatch[1] };
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return { platform: "vimeo", id: vimeoMatch[1] };
  
  // Loom
  const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) return { platform: "loom", id: loomMatch[1] };
  
  return null;
}

function VideoPreview({ url }: { url: string }) {
  const videoInfo = extractVideoId(url);
  
  if (!videoInfo) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Video className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Direct video URL</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center justify-center gap-1 mt-1">
            Open video <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }
  
  let embedUrl = "";
  if (videoInfo.platform === "youtube") {
    embedUrl = `https://www.youtube.com/embed/${videoInfo.id}`;
  } else if (videoInfo.platform === "vimeo") {
    embedUrl = `https://player.vimeo.com/video/${videoInfo.id}`;
  } else if (videoInfo.platform === "loom") {
    embedUrl = `https://www.loom.com/embed/${videoInfo.id}`;
  }
  
  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export default function CourseContentBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<CourseDoc | null>(null);
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Module dialog state
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModuleDoc | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");

  // Lesson dialog state
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonDoc | null>(null);
  const [lessonModuleId, setLessonModuleId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonContentType, setLessonContentType] = useState<ContentType>("video");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonVideoDuration, setLessonVideoDuration] = useState("");
  const [lessonTextContent, setLessonTextContent] = useState("");
  const [lessonDownloadUrl, setLessonDownloadUrl] = useState("");
  const [lessonImageId, setLessonImageId] = useState<string | undefined>(undefined);
  const [lessonImageUrl, setLessonImageUrl] = useState<string | undefined>(undefined);
  const [lessonIsPreview, setLessonIsPreview] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "module" | "lesson"; id: string; title: string } | null>(null);

  // AI dialog state
  const [syllabusDialogOpen, setSyllabusDialogOpen] = useState(false);
  const [lessonAIDialogOpen, setLessonAIDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [aiLessonContext, setAiLessonContext] = useState<{
    moduleTitle: string;
    lessonTitle: string;
    lessonDescription: string;
    contentType: "video" | "text" | "assignment";
  } | null>(null);

  useEffect(() => {
    loadCourseContent();
  }, [courseId]);

  async function loadCourseContent() {
    try {
      const data = await getCourseWithModulesAndLessons(courseId);
      if (!data) {
        toast.error("Course not found");
        router.push("/portal/admin/academy");
        return;
      }
      setCourse(data.course);
      setModules(data.modules);
      // Expand all modules by default
      setExpandedModules(new Set(data.modules.map(m => m.id)));
    } catch (error) {
      console.error("Error loading course:", error);
      toast.error("Failed to load course content");
    } finally {
      setLoading(false);
    }
  }

  // Module functions
  const openModuleDialog = (module?: CourseModuleDoc) => {
    if (module) {
      setEditingModule(module);
      setModuleTitle(module.title);
      setModuleDescription(module.description || "");
    } else {
      setEditingModule(null);
      setModuleTitle("");
      setModuleDescription("");
    }
    setModuleDialogOpen(true);
  };

  const handleSaveModule = async () => {
    if (!moduleTitle.trim()) {
      toast.error("Please enter a module title");
      return;
    }

    setSaving(true);
    try {
      if (editingModule) {
        await updateModule(editingModule.id, {
          title: moduleTitle.trim(),
          description: moduleDescription.trim() || null,
        });
        toast.success("Module updated");
      } else {
        await createModule({
          courseId,
          title: moduleTitle.trim(),
          description: moduleDescription.trim() || undefined,
          sortOrder: modules.length,
        });
        toast.success("Module created");
      }
      setModuleDialogOpen(false);
      loadCourseContent();
    } catch (error) {
      console.error("Error saving module:", error);
      toast.error("Failed to save module");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveModule = async (moduleId: string, direction: "up" | "down") => {
    const index = modules.findIndex(m => m.id === moduleId);
    if ((direction === "up" && index === 0) || (direction === "down" && index === modules.length - 1)) return;

    const newModules = [...modules];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newModules[index], newModules[swapIndex]] = [newModules[swapIndex], newModules[index]];

    setModules(newModules);
    try {
      await reorderModules(courseId, newModules.map(m => m.id));
    } catch (error) {
      console.error("Error reordering modules:", error);
      toast.error("Failed to reorder modules");
      loadCourseContent();
    }
  };

  // Lesson functions
  const openLessonDialog = (moduleId: string, lesson?: LessonDoc) => {
    setLessonModuleId(moduleId);
    if (lesson) {
      setEditingLesson(lesson);
      setLessonTitle(lesson.title);
      setLessonDescription(lesson.description || "");
      setLessonContentType(lesson.contentType);
      setLessonVideoUrl(lesson.videoUrl || "");
      setLessonVideoDuration(lesson.videoDurationSeconds ? String(Math.floor(lesson.videoDurationSeconds / 60)) : "");
      setLessonTextContent(lesson.textContent || "");
      setLessonDownloadUrl(lesson.downloadUrl || "");
      setLessonImageId(lesson.imageId || undefined);
      setLessonImageUrl(lesson.imageUrl || undefined);
      setLessonIsPreview(lesson.isPreview);
    } else {
      setEditingLesson(null);
      setLessonTitle("");
      setLessonDescription("");
      setLessonContentType("video");
      setLessonVideoUrl("");
      setLessonVideoDuration("");
      setLessonTextContent("");
      setLessonDownloadUrl("");
      setLessonImageId(undefined);
      setLessonImageUrl(undefined);
      setLessonIsPreview(false);
    }
    setLessonDialogOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonTitle.trim()) {
      toast.error("Please enter a lesson title");
      return;
    }

    setSaving(true);
    try {
      const lessonData = {
        title: lessonTitle.trim(),
        description: lessonDescription.trim() || null,
        contentType: lessonContentType,
        videoUrl: lessonContentType === "video" ? lessonVideoUrl.trim() || null : null,
        videoDurationSeconds: lessonContentType === "video" && lessonVideoDuration ? parseInt(lessonVideoDuration) * 60 : null,
        textContent: lessonContentType === "text" ? lessonTextContent.trim() || null : null,
        downloadUrl: lessonContentType === "download" ? lessonDownloadUrl.trim() || null : null,
        imageId: lessonImageId || null,
        imageUrl: lessonImageUrl || null,
        isPreview: lessonIsPreview,
      };

      if (editingLesson) {
        await updateLesson(editingLesson.id, lessonData);
        toast.success("Lesson updated");
      } else {
        const module = modules.find(m => m.id === lessonModuleId);
        await createLesson({
          moduleId: lessonModuleId,
          courseId,
          ...lessonData,
          sortOrder: module?.lessons.length || 0,
        });
        toast.success("Lesson created");
      }
      setLessonDialogOpen(false);
      loadCourseContent();
    } catch (error) {
      console.error("Error saving lesson:", error);
      toast.error("Failed to save lesson");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveLesson = async (moduleId: string, lessonId: string, direction: "up" | "down") => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const index = module.lessons.findIndex(l => l.id === lessonId);
    if ((direction === "up" && index === 0) || (direction === "down" && index === module.lessons.length - 1)) return;

    const newLessons = [...module.lessons];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newLessons[index], newLessons[swapIndex]] = [newLessons[swapIndex], newLessons[index]];

    setModules(modules.map(m => m.id === moduleId ? { ...m, lessons: newLessons } : m));
    try {
      await reorderLessons(moduleId, newLessons.map(l => l.id));
    } catch (error) {
      console.error("Error reordering lessons:", error);
      toast.error("Failed to reorder lessons");
      loadCourseContent();
    }
  };

  // Delete functions
  const confirmDelete = (type: "module" | "lesson", id: string, title: string) => {
    setDeleteTarget({ type, id, title });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === "module") {
        await deleteModule(deleteTarget.id);
        toast.success("Module deleted");
      } else {
        await deleteLesson(deleteTarget.id);
        toast.success("Lesson deleted");
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadCourseContent();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error(`Failed to delete ${deleteTarget.type}`);
    }
  };

  const toggleModuleExpanded = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  // AI Handlers
  const handleApplySyllabus = async (syllabus: CourseOutline) => {
    setSaving(true);
    try {
      // Create modules and lessons from the syllabus
      for (let i = 0; i < syllabus.modules.length; i++) {
        const moduleData = syllabus.modules[i];
        const newModule = await createModule({
          courseId,
          title: moduleData.title,
          description: moduleData.description,
          sortOrder: modules.length + i,
        });

        // Create lessons for this module
        for (let j = 0; j < moduleData.lessons.length; j++) {
          const lessonData = moduleData.lessons[j];
          await createLesson({
            moduleId: newModule.id,
            courseId,
            title: lessonData.title,
            description: lessonData.description,
            contentType: lessonData.contentType as ContentType,
            sortOrder: j,
          });
        }
      }
      toast.success(`Created ${syllabus.modules.length} modules with lessons!`);
      loadCourseContent();
    } catch (error) {
      console.error("Error applying syllabus:", error);
      toast.error("Failed to apply syllabus");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyLessonContent = (content: GeneratedLesson) => {
    // Apply the generated content to the lesson form
    if (content.content) {
      setLessonTextContent(content.content);
    }
    if (content.description) {
      setLessonDescription(content.description);
    }
    toast.success("Content applied to lesson form");
  };

  const handleApplyQuiz = async (quiz: GeneratedQuiz) => {
    // For now, we'll create a quiz lesson with the questions in the text content
    const quizContent = `# ${quiz.title}\n\n${quiz.description}\n\n**Passing Score:** ${quiz.passingScore}%\n**Time Limit:** ${quiz.timeLimit} minutes\n\n## Questions\n\n${quiz.questions.map((q, i) => `### ${i + 1}. ${q.question}\n${q.options ? q.options.map((o, oi) => `- ${o}${oi === q.correctAnswer ? " ✓" : ""}`).join("\n") : ""}\n\n*Explanation: ${q.explanation}*`).join("\n\n")}`;
    
    setLessonTextContent(quizContent);
    setLessonContentType("quiz");
    toast.success("Quiz content applied");
  };

  const handleApplyExam = async (exam: GeneratedExam) => {
    // Create an exam as a special lesson
    const examContent = `# ${exam.title}\n\n${exam.description}\n\n**Instructions:** ${exam.instructions}\n\n**Passing Score:** ${exam.passingScore}%\n**Time Limit:** ${exam.timeLimit} minutes\n\n${exam.sections.map((section, si) => `## Section ${si + 1}: ${section.title}\n\n${section.description}\n\n${section.questions.map((q, qi) => `### ${qi + 1}. ${q.question} (${q.points} pts)\n${q.options ? q.options.map((o, oi) => `- ${o}`).join("\n") : ""}`).join("\n\n")}`).join("\n\n---\n\n")}`;
    
    setLessonTextContent(examContent);
    setLessonContentType("quiz");
    toast.success("Exam content applied");
  };

  const openAILessonGenerator = () => {
    if (!lessonTitle.trim()) {
      toast.error("Please enter a lesson title first");
      return;
    }
    const module = modules.find(m => m.id === lessonModuleId);
    setAiLessonContext({
      moduleTitle: module?.title || "Module",
      lessonTitle,
      lessonDescription,
      contentType: lessonContentType === "video" || lessonContentType === "text" || lessonContentType === "assignment" 
        ? lessonContentType 
        : "text",
    });
    setLessonAIDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const totalDuration = modules.reduce((acc, m) => 
    acc + m.lessons.reduce((lacc, l) => lacc + (l.videoDurationSeconds || 0), 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/portal/admin/academy/courses/${courseId}/edit`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Content Builder</h1>
          <p className="text-muted-foreground">{course?.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{modules.length} Sections</Badge>
          <Badge variant="outline">{totalLessons} Lessons</Badge>
          {totalDuration > 0 && (
            <Badge variant="outline">{Math.round(totalDuration / 60)} min</Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{modules.length}</div>
            <p className="text-sm text-muted-foreground">Sections/Modules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalLessons}</div>
            <p className="text-sm text-muted-foreground">Total Lessons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{modules.reduce((acc, m) => acc + m.lessons.filter(l => l.contentType === "video").length, 0)}</div>
            <p className="text-sm text-muted-foreground">Video Lessons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{modules.reduce((acc, m) => acc + m.lessons.filter(l => l.isPreview).length, 0)}</div>
            <p className="text-sm text-muted-foreground">Free Previews</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Tools Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
          <Sparkles className="h-4 w-4" />
          AI Tools
        </div>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" size="sm" onClick={() => setSyllabusDialogOpen(true)} className="text-xs">
          <BookOpen className="h-3 w-3 mr-1" />
          Generate Syllabus
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setQuizDialogOpen(true)} className="text-xs">
          <HelpCircle className="h-3 w-3 mr-1" />
          Generate Quiz
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setExamDialogOpen(true)} disabled={modules.length === 0} className="text-xs">
          <GraduationCap className="h-3 w-3 mr-1" />
          Generate Exam
        </Button>
      </div>

      {/* Add Section Button */}
      <div className="flex justify-end">
        <Button onClick={() => openModuleDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>

      {/* Modules/Sections List */}
      {modules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sections yet</h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Start building your course by adding sections. Each section can contain multiple lessons with videos, text, quizzes, and more.
            </p>
            <Button onClick={() => openModuleDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Section
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((module, moduleIndex) => (
            <Card key={module.id} className="overflow-hidden">
              <Collapsible
                open={expandedModules.has(module.id)}
                onOpenChange={() => toggleModuleExpanded(module.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => { e.stopPropagation(); handleMoveModule(module.id, "up"); }}
                            disabled={moduleIndex === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => { e.stopPropagation(); handleMoveModule(module.id, "down"); }}
                            disabled={moduleIndex === modules.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        {expandedModules.has(module.id) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-lg">
                            Section {moduleIndex + 1}: {module.title}
                          </CardTitle>
                          {module.description && (
                            <CardDescription>{module.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Badge variant="secondary">{module.lessons.length} lessons</Badge>
                        <Button variant="ghost" size="icon" onClick={() => openModuleDialog(module)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete("module", module.id, module.title)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {/* Lessons List */}
                    {module.lessons.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground mb-4">No lessons in this section</p>
                        <Button variant="outline" onClick={() => openLessonDialog(module.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Lesson
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div
                            key={lesson.id}
                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => handleMoveLesson(module.id, lesson.id, "up")}
                                disabled={lessonIndex === 0}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => handleMoveLesson(module.id, lesson.id, "down")}
                                disabled={lessonIndex === module.lessons.length - 1}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              {getContentTypeIcon(lesson.contentType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{lesson.title}</span>
                                {lesson.isPreview && (
                                  <Badge variant="outline" className="text-xs">
                                    <Eye className="h-3 w-3 mr-1" />
                                    Preview
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {lesson.contentType}
                                </Badge>
                                {lesson.videoDurationSeconds && (
                                  <span>{Math.floor(lesson.videoDurationSeconds / 60)} min</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openLessonDialog(module.id, lesson)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => confirmDelete("lesson", lesson.id, lesson.title)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" className="w-full mt-2" onClick={() => openLessonDialog(module.id)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Lesson
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModule ? "Edit Section" : "Add New Section"}</DialogTitle>
            <DialogDescription>
              Sections help organize your course content into logical groups.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="module-title">Section Title *</Label>
              <Input
                id="module-title"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="e.g., Introduction to the Framework"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-description">Description (optional)</Label>
              <Textarea
                id="module-description"
                value={moduleDescription}
                onChange={(e) => setModuleDescription(e.target.value)}
                placeholder="Brief description of what this section covers..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveModule} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingModule ? "Save Changes" : "Create Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Add New Lesson"}</DialogTitle>
            <DialogDescription>
              Create engaging content for your students.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lesson-title">Lesson Title *</Label>
                <Input
                  id="lesson-title"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g., Understanding the Adams Academy Model"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lesson-description">Description (optional)</Label>
                  <AIEnhanceButton
                    content={lessonDescription}
                    contentType="description"
                    context={`Lesson: ${lessonTitle}`}
                    onEnhanced={setLessonDescription}
                  />
                </div>
                <Textarea
                  id="lesson-description"
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  placeholder="What will students learn in this lesson?"
                  rows={2}
                />
              </div>

              {/* AI Generate Content Button */}
              {(lessonContentType === "video" || lessonContentType === "text" || lessonContentType === "assignment") && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={openAILessonGenerator}
                  className="w-full border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                >
                  <Brain className="mr-2 h-4 w-4 text-purple-500" />
                  Generate {lessonContentType === "video" ? "Video Script" : lessonContentType === "text" ? "Article Content" : "Assignment"} with AI
                </Button>
              )}
            </div>

            {/* Content Type Selection */}
            <div className="space-y-2">
              <Label>Content Type</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CONTENT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLessonContentType(option.value)}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      lessonContentType === option.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {option.icon}
                      <span className="font-medium text-sm">{option.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Type Specific Fields */}
            {lessonContentType === "video" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Video Settings
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="video-url">Video URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="video-url"
                      value={lessonVideoUrl}
                      onChange={(e) => setLessonVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                    />
                    <Button variant="outline" size="icon" asChild>
                      <a href={lessonVideoUrl || "#"} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supports YouTube, Vimeo, Loom, or direct video URLs
                  </p>
                </div>
                {lessonVideoUrl && (
                  <div className="mt-4">
                    <Label className="mb-2 block">Preview</Label>
                    <VideoPreview url={lessonVideoUrl} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="video-duration">Duration (minutes)</Label>
                  <Input
                    id="video-duration"
                    type="number"
                    value={lessonVideoDuration}
                    onChange={(e) => setLessonVideoDuration(e.target.value)}
                    placeholder="e.g., 15"
                  />
                </div>
              </div>
            )}

            {lessonContentType === "text" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Text Content
                  </h4>
                  <AIEnhanceButton
                    content={lessonTextContent}
                    contentType="lesson"
                    context={`Course: ${course?.title}, Lesson: ${lessonTitle}`}
                    onEnhanced={setLessonTextContent}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text-content">Content</Label>
                  <Textarea
                    id="text-content"
                    value={lessonTextContent}
                    onChange={(e) => setLessonTextContent(e.target.value)}
                    placeholder="Enter your lesson content here... (Markdown supported)"
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports Markdown formatting for rich text content
                  </p>
                </div>
              </div>
            )}

            {lessonContentType === "download" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Downloadable Resource
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="download-url">Download URL</Label>
                  <Input
                    id="download-url"
                    value={lessonDownloadUrl}
                    onChange={(e) => setLessonDownloadUrl(e.target.value)}
                    placeholder="https://example.com/resource.pdf"
                  />
                  <p className="text-xs text-muted-foreground">
                    Direct link to PDF, worksheet, or other downloadable file
                  </p>
                </div>
              </div>
            )}

            {lessonContentType === "quiz" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Quiz Settings
                </h4>
                <p className="text-sm text-muted-foreground">
                  Quiz questions can be configured in the Assessment Builder after creating this lesson.
                </p>
              </div>
            )}

            {lessonContentType === "assignment" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Assignment Settings
                </h4>
                <p className="text-sm text-muted-foreground">
                  Assignment details and submission requirements can be added in the lesson description above.
                </p>
              </div>
            )}

            {lessonContentType === "live" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  Live Session
                </h4>
                <p className="text-sm text-muted-foreground">
                  Live session scheduling and meeting links can be configured after creating this lesson.
                </p>
              </div>
            )}

            {/* Lesson Image */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <LessonImagePicker
                value={lessonImageId}
                onChange={(imageId, imageUrl) => {
                  setLessonImageId(imageId);
                  setLessonImageUrl(imageUrl);
                }}
                label="Lesson Image (optional)"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Add an image to display with this lesson content
              </p>
            </div>

            {/* Preview Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="is-preview" className="font-medium">Free Preview</Label>
                <p className="text-sm text-muted-foreground">
                  Allow non-enrolled users to view this lesson
                </p>
              </div>
              <Switch
                id="is-preview"
                checked={lessonIsPreview}
                onCheckedChange={setLessonIsPreview}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLesson} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {editingLesson ? "Save Changes" : "Create Lesson"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "module" ? "Section" : "Lesson"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"?
              {deleteTarget?.type === "module" && " This will also delete all lessons in this section."}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Syllabus Generator Dialog */}
      <AISyllabusGenerator
        open={syllabusDialogOpen}
        onOpenChange={setSyllabusDialogOpen}
        courseTitle={course?.title || ""}
        courseDescription={course?.description || ""}
        onApplySyllabus={handleApplySyllabus}
      />

      {/* AI Lesson Generator Dialog */}
      {aiLessonContext && (
        <AILessonGenerator
          open={lessonAIDialogOpen}
          onOpenChange={setLessonAIDialogOpen}
          courseTitle={course?.title || ""}
          moduleTitle={aiLessonContext.moduleTitle}
          lessonTitle={aiLessonContext.lessonTitle}
          lessonDescription={aiLessonContext.lessonDescription}
          contentType={aiLessonContext.contentType}
          onApplyContent={handleApplyLessonContent}
        />
      )}

      {/* AI Quiz Generator Dialog */}
      <AIQuizGenerator
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        courseTitle={course?.title || ""}
        topic={course?.title || ""}
        onApplyQuiz={handleApplyQuiz}
      />

      {/* AI Exam Generator Dialog */}
      <AIExamGenerator
        open={examDialogOpen}
        onOpenChange={setExamDialogOpen}
        courseTitle={course?.title || ""}
        modules={modules.map(m => ({
          title: m.title,
          keyTopics: m.lessons.map(l => l.title),
        }))}
        onApplyExam={handleApplyExam}
      />
    </div>
  );
}
