"use client";

import { useState, useEffect } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type SuccessStoryDoc } from "@/lib/schema";
import { collection, getDocs, doc, setDoc, deleteDoc, Timestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, Star, Quote, Building2, MapPin, TrendingUp, Check, ChevronRight, ChevronLeft, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageManagerPicker } from "@/components/admin/image-manager-picker";

// Wizard steps configuration
const wizardSteps = [
  { id: 1, title: "Client Info", description: "Basic information" },
  { id: 2, title: "Quote", description: "Testimonial content" },
  { id: 3, title: "Story Details", description: "Challenge & solution" },
  { id: 4, title: "Results", description: "Key metrics" },
  { id: 5, title: "Settings", description: "Featured & published" },
];

// Form data interface
interface StoryFormData {
  name: string;
  company: string;
  industry: string;
  location: string;
  quote: string;
  challenge: string;
  solution: string;
  results: Array<{ metric: string; value: string; period?: string }>;
  image?: {
    imageId: string;
    url: string;
    name: string;
  };
  isFeatured: boolean;
  isPublished: boolean;
  rating: number;
  tags: string;
}

const emptyFormData: StoryFormData = {
  name: "",
  company: "",
  industry: "",
  location: "",
  quote: "",
  challenge: "",
  solution: "",
  results: [{ metric: "", value: "", period: "" }],
  isFeatured: false,
  isPublished: false,
  rating: 5,
  tags: "",
};

export default function SuccessStoriesAdminPage() {
  const { profile } = useUserProfile();
  const [stories, setStories] = useState<(SuccessStoryDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingStory, setEditingStory] = useState<(SuccessStoryDoc & { id: string }) | null>(null);
  const [formData, setFormData] = useState<StoryFormData>(emptyFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<(SuccessStoryDoc & { id: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  // Real-time subscription to stories
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, COLLECTIONS.SUCCESS_STORIES), orderBy("order", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storiesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (SuccessStoryDoc & { id: string })[];
      setStories(storiesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching stories:", error);
      toast.error("Failed to load success stories");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Open wizard for creating/editing
  const openWizard = (story?: SuccessStoryDoc & { id: string }) => {
    if (story) {
      setEditingStory(story);
      setFormData({
        name: story.name,
        company: story.company,
        industry: story.industry,
        location: story.location,
        quote: story.quote,
        challenge: story.challenge,
        solution: story.solution || "",
        results: story.results.length > 0 ? story.results : [{ metric: "", value: "", period: "" }],
        image: story.image,
        isFeatured: story.isFeatured,
        isPublished: story.isPublished,
        rating: story.rating,
        tags: story.tags?.join(", ") || "",
      });
    } else {
      setEditingStory(null);
      setFormData({
        ...emptyFormData,
        results: [{ metric: "", value: "", period: "" }],
      });
    }
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    setEditingStory(null);
    setFormData(emptyFormData);
    setWizardStep(1);
  };

  // Handle form field updates
  const updateField = (field: keyof StoryFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle results array updates
  const updateResult = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const newResults = [...prev.results];
      newResults[index] = { ...newResults[index], [field]: value };
      return { ...prev, results: newResults };
    });
  };

  const addResult = () => {
    setFormData((prev) => ({
      ...prev,
      results: [...prev.results, { metric: "", value: "", period: "" }],
    }));
  };

  const removeResult = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      results: prev.results.filter((_, i) => i !== index),
    }));
  };

  // Save story to Firestore
  const handleSave = async () => {
    if (!db) {
      toast.error("Database not available");
      return;
    }

    // Validation
    if (!formData.name || !formData.company || !formData.quote) {
      toast.error("Please fill in all required fields (name, company, quote)");
      return;
    }

    setSaving(true);
    try {
      const storyId = editingStory?.id || `story-${Date.now()}`;
      const storyDoc: Omit<SuccessStoryDoc, "id"> = {
        name: formData.name,
        company: formData.company,
        industry: formData.industry,
        location: formData.location,
        quote: formData.quote,
        challenge: formData.challenge,
        solution: formData.solution || undefined,
        results: formData.results.filter((r) => r.metric && r.value),
        isFeatured: formData.isFeatured,
        isPublished: formData.isPublished,
        order: editingStory?.order || stories.length + 1,
        rating: formData.rating,
        tags: formData.tags.split(",").map((t) => t.trim()).filter((t) => t),
        createdAt: editingStory?.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: editingStory?.createdBy || profile.id,
        updatedBy: profile.id,
      };

      // Only include image if it has all required fields
      if (formData.image?.imageId && formData.image?.url) {
        storyDoc.image = formData.image;
      }

      await setDoc(doc(db, COLLECTIONS.SUCCESS_STORIES, storyId), storyDoc);
      toast.success(editingStory ? "Success story updated" : "Success story created");
      closeWizard();
    } catch (error) {
      console.error("Error saving story:", error);
      toast.error("Failed to save success story");
    } finally {
      setSaving(false);
    }
  };

  // Delete story
  const confirmDelete = (story: SuccessStoryDoc & { id: string }) => {
    setStoryToDelete(story);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!db || !storyToDelete) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.SUCCESS_STORIES, storyToDelete.id));
      toast.success("Success story deleted");
      setDeleteDialogOpen(false);
      setStoryToDelete(null);
    } catch (error) {
      console.error("Error deleting story:", error);
      toast.error("Failed to delete success story");
    }
  };

  // Toggle published status
  const togglePublished = async (story: SuccessStoryDoc & { id: string }) => {
    if (!db) return;

    try {
      await setDoc(
        doc(db, COLLECTIONS.SUCCESS_STORIES, story.id),
        { isPublished: !story.isPublished, updatedAt: Timestamp.now() },
        { merge: true }
      );
      toast.success(story.isPublished ? "Story unpublished" : "Story published");
    } catch (error) {
      console.error("Error toggling published:", error);
      toast.error("Failed to update status");
    }
  };

  // Wizard navigation
  const goToNextStep = () => {
    if (wizardStep < wizardSteps.length) setWizardStep(wizardStep + 1);
  };

  const goToPrevStep = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  // Render wizard step content
  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Alex Richardson"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company"
                  placeholder="e.g., Richardson's Bistro Group"
                  value={formData.company}
                  onChange={(e) => updateField("company", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  placeholder="e.g., Restaurant/Hospitality"
                  value={formData.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Cincinnati, OH"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quote">Testimonial Quote *</Label>
              <Textarea
                id="quote"
                placeholder="Client's testimonial quote..."
                value={formData.quote}
                onChange={(e) => updateField("quote", e.target.value)}
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => updateField("rating", star)}
                    className="p-1"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6",
                        star <= formData.rating
                          ? "fill-blue-400 text-blue-400"
                          : "text-slate-300"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="challenge">The Challenge</Label>
              <Textarea
                id="challenge"
                placeholder="What challenge did the client face?"
                value={formData.challenge}
                onChange={(e) => updateField("challenge", e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="solution">The Solution (for featured stories)</Label>
              <Textarea
                id="solution"
                placeholder="How did Adams Electric help? (Optional for non-featured stories)"
                value={formData.solution}
                onChange={(e) => updateField("solution", e.target.value)}
                rows={4}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key Results/Metrics</Label>
              {formData.results.map((result, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 items-end">
                  <Input
                    placeholder="Metric (e.g., Revenue Growth)"
                    value={result.metric}
                    onChange={(e) => updateResult(index, "metric", e.target.value)}
                  />
                  <Input
                    placeholder="Value (e.g., 127%)"
                    value={result.value}
                    onChange={(e) => updateResult(index, "value", e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Period (e.g., in 18 months)"
                      value={result.period}
                      onChange={(e) => updateResult(index, "period", e.target.value)}
                    />
                    {formData.results.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeResult(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addResult} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Result
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Featured Story</Label>
                <p className="text-sm text-muted-foreground">
                  Featured stories get a special full-width layout
                </p>
              </div>
              <Switch
                checked={formData.isFeatured}
                onCheckedChange={(checked) => updateField("isFeatured", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Published</Label>
                <p className="text-sm text-muted-foreground">
                  Make this story visible on the website
                </p>
              </div>
              <Switch
                checked={formData.isPublished}
                onCheckedChange={(checked) => updateField("isPublished", checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., healthcare, preconstruction, design-build"
                value={formData.tags}
                onChange={(e) => updateField("tags", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used for filtering and categorization
              </p>
            </div>

            <div className="space-y-2">
              <Label>Client Photo</Label>
              <ImageManagerPicker
                onSelect={(image) =>
                  setFormData({
                    ...formData,
                    image: {
                      imageId: image.id,
                      url: image.url,
                      name: image.name,
                    },
                  })
                }
                selectedImageId={formData.image?.imageId}
                category="team"
              />
              {formData.image && (
                <div className="mt-2 p-2 border rounded">
                  <img
                    src={formData.image.url}
                    alt={formData.image.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.image.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Success Stories</h1>
          <p className="text-muted-foreground">
            Manage client testimonials and success stories
          </p>
        </div>
        <Button onClick={() => openWizard()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Success Story
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stories.filter((s) => s.isPublished).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stories.filter((s) => s.isFeatured).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stories.length > 0
                ? (stories.reduce((acc, s) => acc + s.rating, 0) / stories.length).toFixed(1)
                : "0.0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stories List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : stories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Quote className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No success stories yet</p>
            <Button onClick={() => openWizard()} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create First Story
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {stories.map((story) => (
            <Card key={story.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      {story.image ? (
                        <img
                          src={story.image.url}
                          alt={story.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="h-6 w-6 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{story.name}</h3>
                      <p className="text-sm text-muted-foreground">{story.company}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {story.industry && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {story.industry}
                          </span>
                        )}
                        {story.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {story.location}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {[...Array(story.rating)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-blue-400 text-blue-400" />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        "{story.quote}"
                      </p>
                      {story.results.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {story.results.slice(0, 3).map((result, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {result.value} {result.metric}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-1">
                      {story.isFeatured && (
                        <Badge variant="default" className="bg-blue-500">
                          Featured
                        </Badge>
                      )}
                      <Badge variant={story.isPublished ? "default" : "secondary"}>
                        {story.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublished(story)}
                      >
                        {story.isPublished ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openWizard(story)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(story)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Wizard Dialog */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStory ? "Edit Success Story" : "Create Success Story"}
            </DialogTitle>
            <DialogDescription>
              Step {wizardStep} of {wizardSteps.length}: {wizardSteps[wizardStep - 1].title}
            </DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-6 px-2">
            {wizardSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                    wizardStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : wizardStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {wizardStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                {index < wizardSteps.length - 1 && (
                  <div
                    className={cn(
                      "w-8 h-0.5 mx-1",
                      wizardStep > step.id ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">{renderWizardStep()}</div>

          {/* Footer */}
          <DialogFooter className="flex justify-between">
            <div>
              {wizardStep > 1 && (
                <Button variant="outline" onClick={goToPrevStep}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={closeWizard}>
                Cancel
              </Button>
              {wizardStep < wizardSteps.length ? (
                <Button onClick={goToNextStep}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {editingStory ? "Update" : "Create"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Success Story</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the success story for{" "}
              <strong>{storyToDelete?.name}</strong> from {storyToDelete?.company}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
