"use client";

import { useState } from "react";
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
import { Bug, Lightbulb, Sparkles, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/user-profile-context";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type BugTrackerItemType, type BugTrackerItemPriority, type BugTrackerItemDoc } from "@/lib/schema";

// Page options for the dropdown
const pageOptions = [
  { value: "none", label: "No specific page" },
  { value: "/", label: "Home Page" },
  { value: "/sign-in", label: "Sign In" },
  { value: "/portal", label: "Portal Home" },
  { value: "/portal/command-center", label: "Command Center" },
  { value: "/portal/opportunities", label: "Opportunities" },
  { value: "/portal/projects", label: "Projects" },
  { value: "/portal/affiliates", label: "Affiliates" },
  { value: "/portal/customers", label: "Customers" },
  { value: "/portal/documents", label: "Documents" },
  { value: "/portal/calendar", label: "Calendar" },
  { value: "/portal/meetings", label: "Meetings" },
  { value: "/portal/rocks", label: "Rocks" },
  { value: "/portal/deals", label: "Deals" },
  { value: "/portal/linkedin-content", label: "LinkedIn Content" },
  { value: "/portal/traction", label: "Traction Dashboard" },
  { value: "/portal/gohighlevel", label: "GoHighLevel" },
  { value: "/portal/settings", label: "Settings" },
  { value: "/portal/admin", label: "Admin Pages" },
  { value: "other", label: "Other (specify in description)" },
];

interface BugTrackerFormProps {
  onSuccess?: () => void;
  compact?: boolean;
  defaultType?: BugTrackerItemType;
}

export function BugTrackerForm({ onSuccess, compact = false, defaultType = "bug" }: BugTrackerFormProps) {
  const { profile } = useUserProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: defaultType,
    title: "",
    description: "",
    priority: "medium" as BugTrackerItemPriority,
    page: "none",
    tags: "",
  });

  const handleSubmit = async () => {
    if (!db || !profile) {
      toast.error("Unable to save. Please try again.");
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Please fill in title and description");
      return;
    }

    setIsSaving(true);
    try {
      const itemsRef = collection(db, COLLECTIONS.BUG_TRACKER_ITEMS);
      const newItemData: Omit<BugTrackerItemDoc, "id"> = {
        type: formData.type as BugTrackerItemType,
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: "open",
        priority: formData.priority,
        reporterId: profile.id || "anonymous",
        reporterName: profile.firstName && profile.lastName
          ? `${profile.firstName} ${profile.lastName}`
          : profile.email || "Anonymous User",
        tags: formData.tags.split(",").map((t) => t.trim()).filter((t) => t),
        comments: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Only add page if it has a value and is not "none"
      if (formData.page && formData.page !== "none") {
        (newItemData as Record<string, unknown>).page = formData.page;
      }

      await addDoc(itemsRef, newItemData);
      toast.success(`${formData.type === "bug" ? "Bug" : formData.type === "idea" ? "Idea" : "Improvement"} reported successfully!`);
      
      // Reset form
      setFormData({
        type: defaultType,
        title: "",
        description: "",
        priority: "medium",
        page: "none",
        tags: "",
      });
      
      onSuccess?.();
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to create entry");
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="h-4 w-4 text-red-500" />;
      case "idea":
        return <Lightbulb className="h-4 w-4 text-sky-500" />;
      case "improvement":
        return <Sparkles className="h-4 w-4 text-blue-500" />;
      default:
        return <Bug className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "bug":
        return "Bug Report";
      case "idea":
        return "New Idea";
      case "improvement":
        return "Improvement";
      default:
        return "Entry";
    }
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {getTypeIcon(formData.type)}
            Quick Report
          </CardTitle>
          <CardDescription className="text-xs">
            Report a bug, idea, or improvement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Select
              value={formData.type}
              onValueChange={(value: BugTrackerItemType) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-red-500" />
                    Bug Report
                  </div>
                </SelectItem>
                <SelectItem value="idea">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-sky-500" />
                    New Idea
                  </div>
                </SelectItem>
                <SelectItem value="improvement">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Improvement
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Brief title..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-8"
            />
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Describe the issue or idea..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Select
              value={formData.priority}
              onValueChange={(value: BugTrackerItemPriority) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger className="h-8 w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleSubmit}
              disabled={!formData.title.trim() || !formData.description.trim() || isSaving}
              className="flex-1 h-8"
              size="sm"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getTypeIcon(formData.type)}
          {getTypeLabel(formData.type)}
        </CardTitle>
        <CardDescription>
          Report a bug, capture an idea, or suggest an improvement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: BugTrackerItemType) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-red-500" />
                  Bug Report
                </div>
              </SelectItem>
              <SelectItem value="idea">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-sky-500" />
                  New Idea
                </div>
              </SelectItem>
              <SelectItem value="improvement">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  Improvement
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            placeholder="Brief summary of the issue or idea"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            placeholder="Provide details, steps to reproduce (for bugs), or explain the idea..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: BugTrackerItemPriority) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Related Page</Label>
            <Select
              value={formData.page}
              onValueChange={(value) => setFormData({ ...formData, page: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select page" />
              </SelectTrigger>
              <SelectContent>
                {pageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input
            id="tags"
            placeholder="e.g., ui, performance, feature"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setFormData({
                type: defaultType,
                title: "",
                description: "",
                priority: "medium",
                page: "none",
                tags: "",
              });
            }}
            disabled={isSaving}
          >
            Reset
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.title.trim() || !formData.description.trim() || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
