"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Presentation, Loader2, Save, Plus, X } from "lucide-react";
import { createCourse, createLesson, createModule, getCategories, type CategoryDoc } from "@/lib/firebase-lms";
import { parsePptxSlides, slideToHtml } from "@/lib/training/pptx-parser";
import type { DifficultyLevel } from "@/types/academy";
import { useEffect } from "react";

export default function NewCoursePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [importingPptx, setImportingPptx] = useState(false);
  const pptxInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [instructorName, setInstructorName] = useState("Adams Electric");
  const [instructorBio, setInstructorBio] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>("beginner");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>([]);
  const [outcomeInput, setOutcomeInput] = useState("");
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [prereqInput, setPrereqInput] = useState("");

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    }
    loadCategories();
  }, []);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const addOutcome = () => {
    if (outcomeInput.trim()) {
      setLearningOutcomes([...learningOutcomes, outcomeInput.trim()]);
      setOutcomeInput("");
    }
  };

  const removeOutcome = (index: number) => {
    setLearningOutcomes(learningOutcomes.filter((_, i) => i !== index));
  };

  const addPrereq = () => {
    if (prereqInput.trim()) {
      setPrerequisites([...prerequisites, prereqInput.trim()]);
      setPrereqInput("");
    }
  };

  const removePrereq = (index: number) => {
    setPrerequisites(prerequisites.filter((_, i) => i !== index));
  };

  const handlePptxImport = async (file: File) => {
    setImportingPptx(true);
    try {
      const buffer = await file.arrayBuffer();
      const { slides } = parsePptxSlides(buffer);
      if (!slides.length) {
        toast.error("No slides with text found in this file");
        return;
      }
      const courseTitle = file.name.replace(/\.pptx?$/i, "").replace(/[-_]+/g, " ").trim();
      const course = await createCourse({
        title: courseTitle,
        shortDescription: `Imported from ${file.name}`,
        description: `Course generated from a PowerPoint deck (${slides.length} slides).`,
        instructorName: instructorName.trim() || "Adams Electric",
        difficultyLevel: "beginner",
      });
      const module = await createModule({
        courseId: course.id,
        title: "Course Slides",
        description: "One lesson per slide",
        sortOrder: 0,
      });
      for (const slide of slides) {
        await createLesson({
          moduleId: module.id,
          courseId: course.id,
          title: slide.title,
          contentType: "text",
          textContent: slideToHtml(slide),
          sortOrder: slide.slideNumber,
        });
      }
      toast.success(`Course created from ${slides.length} slides`);
      router.push(`/portal/admin/academy/courses/${course.id}`);
    } catch (error) {
      console.error("PPTX import failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import PowerPoint file");
    } finally {
      setImportingPptx(false);
      if (pptxInputRef.current) pptxInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a course title");
      return;
    }

    setSaving(true);
    try {
      const course = await createCourse({
        title: title.trim(),
        shortDescription: shortDescription.trim() || undefined,
        description: description.trim() || undefined,
        categoryId: categoryId || undefined,
        instructorName: instructorName.trim(),
        instructorBio: instructorBio.trim() || undefined,
        difficultyLevel,
        estimatedDurationMinutes: estimatedDuration ? parseInt(estimatedDuration) * 60 : undefined,
        isFeatured,
        tags,
        learningOutcomes,
        prerequisites,
      });

      toast.success("Course created successfully!");
      router.push(`/portal/admin/academy/courses/${course.id}`);
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/admin/academy">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Course</h1>
          <p className="text-muted-foreground">
            Add a new course to the academy
          </p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <Presentation className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">Import from PowerPoint</p>
              <p className="text-sm text-muted-foreground">Upload a .pptx deck — each slide becomes a lesson</p>
            </div>
          </div>
          <Button type="button" variant="outline" disabled={importingPptx} onClick={() => pptxInputRef.current?.click()}>
            {importingPptx ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Presentation className="mr-2 h-4 w-4" />}
            {importingPptx ? "Importing…" : "Choose .pptx file"}
          </Button>
          <input
            ref={pptxInputRef}
            type="file"
            accept=".pptx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handlePptxImport(file);
            }}
          />
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
                <CardDescription>
                  Basic information about the course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., The Adams Academy Framework Masterclass"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shortDescription">Short Description</Label>
                  <Input
                    id="shortDescription"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="A brief one-line description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed course description..."
                    rows={5}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select value={difficultyLevel} onValueChange={(v) => setDifficultyLevel(v as DifficultyLevel)}>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Estimated Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    placeholder="e.g., 8"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instructor</CardTitle>
                <CardDescription>
                  Who is teaching this course?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instructorName">Instructor Name</Label>
                  <Input
                    id="instructorName"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructorBio">Instructor Bio</Label>
                  <Textarea
                    id="instructorBio"
                    value={instructorBio}
                    onChange={(e) => setInstructorBio(e.target.value)}
                    placeholder="Brief bio about the instructor..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Learning Outcomes</CardTitle>
                <CardDescription>
                  What will students learn from this course?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={outcomeInput}
                    onChange={(e) => setOutcomeInput(e.target.value)}
                    placeholder="Add a learning outcome..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOutcome())}
                  />
                  <Button type="button" onClick={addOutcome}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {learningOutcomes.length > 0 && (
                  <ul className="space-y-2">
                    {learningOutcomes.map((outcome, index) => (
                      <li key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <span className="text-sm">{outcome}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOutcome(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
                <CardDescription>
                  What should students know before taking this course?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={prereqInput}
                    onChange={(e) => setPrereqInput(e.target.value)}
                    placeholder="Add a prerequisite..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPrereq())}
                  />
                  <Button type="button" onClick={addPrereq}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {prerequisites.length > 0 && (
                  <ul className="space-y-2">
                    {prerequisites.map((prereq, index) => (
                      <li key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <span className="text-sm">{prereq}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePrereq(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Publish Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="featured">Featured Course</Label>
                  <Switch
                    id="featured"
                    checked={isFeatured}
                    onCheckedChange={setIsFeatured}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Featured courses appear prominently on the academy homepage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                  Help students find this course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Course
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Course will be saved as draft. You can publish it later.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
