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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Save, Plus, X, Upload, ImageIcon, FileText, DollarSign } from "lucide-react";
import { getCourse, updateCourse, getCategories, type CategoryDoc, type CourseDoc } from "@/lib/firebase-lms";
import { uploadImage, compressImage, base64ToDataUrl, getImage } from "@/lib/firebase-images";
import type { DifficultyLevel } from "@/types/academy";

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [course, setCourse] = useState<CourseDoc | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [instructorBio, setInstructorBio] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>("beginner");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>([]);
  const [outcomeInput, setOutcomeInput] = useState("");
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [prereqInput, setPrereqInput] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailImageId, setThumbnailImageId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Pricing state
  const [priceInCents, setPriceInCents] = useState(0);
  const [compareAtPriceInCents, setCompareAtPriceInCents] = useState<number | null>(null);
  const [isFree, setIsFree] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [courseData, cats] = await Promise.all([
          getCourse(courseId),
          getCategories(),
        ]);
        
        if (!courseData) {
          toast.error("Course not found");
          router.push("/portal/admin/academy");
          return;
        }

        setCourse(courseData);
        setCategories(cats);
        
        // Populate form
        setTitle(courseData.title);
        setShortDescription(courseData.shortDescription || "");
        setDescription(courseData.description || "");
        setCategoryId(courseData.categoryId || "");
        setInstructorName(courseData.instructorName || "");
        setInstructorBio(courseData.instructorBio || "");
        setDifficultyLevel(courseData.difficultyLevel || "beginner");
        setEstimatedDuration(courseData.estimatedDurationMinutes ? `${courseData.estimatedDurationMinutes} minutes` : "");
        setIsFeatured(courseData.isFeatured || false);
        setIsPublished(courseData.isPublished || false);
        setTags(courseData.tags || []);
        setLearningOutcomes(courseData.learningOutcomes || []);
        setPrerequisites(courseData.prerequisites || []);
        setThumbnailImageId(courseData.thumbnailImageId || null);
        // Load pricing
        setPriceInCents(courseData.priceInCents || 0);
        setCompareAtPriceInCents(courseData.compareAtPriceInCents || null);
        setIsFree(courseData.isFree ?? true);
        
        // Load thumbnail image if exists
        if (courseData.thumbnailImageId) {
          const imageDoc = await getImage(courseData.thumbnailImageId);
          if (imageDoc) {
            setThumbnailUrl(base64ToDataUrl(imageDoc.base64Data, imageDoc.mimeType));
          }
        } else if (courseData.thumbnailUrl) {
          setThumbnailUrl(courseData.thumbnailUrl);
        }
      } catch (error) {
        console.error("Error loading course:", error);
        toast.error("Failed to load course");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [courseId, router]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploadingImage(true);

    try {
      // Compress image if needed
      let processedFile = file;
      if (file.size > 500 * 1024) {
        processedFile = await compressImage(file, 800, 0.8);
      }

      // Upload to Firebase
      const imageDoc = await uploadImage(processedFile, {
        name: `course-${courseId}-thumbnail`,
        description: `Thumbnail for course: ${title}`,
        category: "portal",
        tags: ["course", "thumbnail"],
      });

      // Update local state
      setThumbnailImageId(imageDoc.id);
      setThumbnailUrl(base64ToDataUrl(imageDoc.base64Data, imageDoc.mimeType));

      // Update course in Firebase immediately
      await updateCourse(courseId, {
        thumbnailImageId: imageDoc.id,
        thumbnailUrl: base64ToDataUrl(imageDoc.base64Data, imageDoc.mimeType),
      });

      toast.success("Course image updated!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
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
      await updateCourse(courseId, {
        title: title.trim(),
        shortDescription: shortDescription.trim() || null,
        description: description.trim() || null,
        categoryId: categoryId || null,
        instructorName: instructorName.trim() || "Adams Electric",
        instructorBio: instructorBio.trim() || null,
        difficultyLevel,
        isFeatured,
        isPublished,
        tags,
        learningOutcomes,
        prerequisites,
        thumbnailImageId,
        thumbnailUrl,
        priceInCents: isFree ? 0 : priceInCents,
        compareAtPriceInCents: isFree ? null : compareAtPriceInCents,
        isFree,
      });

      toast.success("Course updated successfully!");
      router.push("/portal/admin/academy");
    } catch (error) {
      console.error("Error updating course:", error);
      toast.error("Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/portal/admin/academy">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Academy
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Course</h1>
          <p className="text-muted-foreground">
            Update course details and settings
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/portal/admin/academy/courses/${courseId}/content`}>
            <FileText className="mr-2 h-4 w-4" />
            Manage Content
          </Link>
        </Button>
      </div>

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
                    placeholder="e.g., Adams Academy Framework Fundamentals"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shortDescription">Short Description</Label>
                  <Input
                    id="shortDescription"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Brief overview (shown in course cards)"
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
                    <Select
                      value={difficultyLevel}
                      onValueChange={(v) => setDifficultyLevel(v as DifficultyLevel)}
                    >
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
                  <Label htmlFor="duration">Estimated Duration</Label>
                  <Input
                    id="duration"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    placeholder="e.g., 4 hours, 2 weeks"
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
                    placeholder="Adams Electric"
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
                  <Button type="button" onClick={addOutcome} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {learningOutcomes.length > 0 && (
                  <ul className="space-y-2">
                    {learningOutcomes.map((outcome, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <span className="flex-1">• {outcome}</span>
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
                  <Button type="button" onClick={addPrereq} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {prerequisites.length > 0 && (
                  <ul className="space-y-2">
                    {prerequisites.map((prereq, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <span className="flex-1">• {prereq}</span>
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
                <CardTitle>Course Image</CardTitle>
                <CardDescription>
                  Upload a thumbnail for this course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  {thumbnailUrl ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                      <img
                        src={thumbnailUrl}
                        alt="Course thumbnail"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed bg-muted">
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          No image uploaded
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="thumbnail-upload" className="cursor-pointer">
                    <div className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                      {uploadingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          {thumbnailUrl ? "Change Image" : "Upload Image"}
                        </>
                      )}
                    </div>
                  </Label>
                  <input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: 16:9 aspect ratio, max 1MB
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Publish</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="published">Published</Label>
                  <Switch
                    id="published"
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {isPublished
                    ? "Course is visible to students"
                    : "Course is in draft mode"}
                </p>

                <div className="flex items-center justify-between">
                  <Label htmlFor="featured">Featured</Label>
                  <Switch
                    id="featured"
                    checked={isFeatured}
                    onCheckedChange={setIsFeatured}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </CardTitle>
                <CardDescription>
                  Set the price for this course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is-free">Free Course</Label>
                  <Switch
                    id="is-free"
                    checked={isFree}
                    onCheckedChange={(checked) => {
                      setIsFree(checked);
                      if (checked) {
                        setPriceInCents(0);
                        setCompareAtPriceInCents(null);
                      }
                    }}
                  />
                </div>
                
                {!isFree && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (USD)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={(priceInCents / 100).toFixed(2)}
                          onChange={(e) => setPriceInCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                          className="pl-7"
                          placeholder="99.00"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="compare-price">Compare at Price (optional)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="compare-price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={compareAtPriceInCents ? (compareAtPriceInCents / 100).toFixed(2) : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCompareAtPriceInCents(val ? Math.round(parseFloat(val) * 100) : null);
                          }}
                          className="pl-7"
                          placeholder="149.00"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Shows as strikethrough to indicate discount
                      </p>
                    </div>
                    
                    {compareAtPriceInCents && compareAtPriceInCents > priceInCents && (
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {Math.round(((compareAtPriceInCents - priceInCents) / compareAtPriceInCents) * 100)}% discount applied
                        </p>
                      </div>
                    )}
                  </>
                )}
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
                    placeholder="Add tag..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} variant="outline" size="sm">
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
          </div>
        </div>
      </form>
    </div>
  );
}
