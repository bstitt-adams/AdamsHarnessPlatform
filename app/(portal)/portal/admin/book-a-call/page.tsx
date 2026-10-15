"use client";

import { useState, useEffect } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/schema";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Clock, Check, ChevronRight, ChevronLeft, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// Meeting type interface
interface MeetingTypeItem {
  id: string;
  name: string;
  description: string;
  duration: number;
  color: string;
  bufferBefore: number;
  bufferAfter: number;
  isActive: boolean;
  requiresApproval: boolean;
  maxBookingsPerDay?: number;
  order: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Wizard steps
const wizardSteps = [
  { id: 1, title: "Basic Info", description: "Name and description" },
  { id: 2, title: "Duration", description: "Meeting length" },
  { id: 3, title: "Settings", description: "Buffers and limits" },
  { id: 4, title: "Review", description: "Confirm and save" },
];

// Duration options
const durationOptions = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

// Color options
const colorOptions = [
  { value: "#0072BC", label: "Amber (Gold)", class: "bg-blue-500" },
  { value: "#3B82F6", label: "Blue", class: "bg-blue-500" },
  { value: "#10B981", label: "Green", class: "bg-green-500" },
  { value: "#8B5CF6", label: "Purple", class: "bg-purple-500" },
  { value: "#EF4444", label: "Red", class: "bg-red-500" },
  { value: "#F59E0B", label: "Orange", class: "bg-orange-500" },
  { value: "#6366F1", label: "Indigo", class: "bg-indigo-500" },
  { value: "#14B8A6", label: "Teal", class: "bg-teal-500" },
];

// Default form data
const emptyFormData = {
  name: "",
  description: "",
  duration: 30,
  color: "#0072BC",
  bufferBefore: 0,
  bufferAfter: 0,
  isActive: true,
  requiresApproval: false,
  maxBookingsPerDay: undefined as number | undefined,
};

// Meeting type list item component
function MeetingTypeListItem({ 
  item, 
  index,
  total,
  onEdit, 
  onDelete, 
  onToggle,
  onMoveUp,
  onMoveDown,
}: { 
  item: MeetingTypeItem; 
  index: number;
  total: number;
  onEdit: (item: MeetingTypeItem) => void;
  onDelete: (item: MeetingTypeItem) => void;
  onToggle: (item: MeetingTypeItem) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white border rounded-lg">
      {/* Order Controls */}
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={index === 0}
          onClick={() => onMoveUp(index)}
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={index === total - 1}
          onClick={() => onMoveDown(index)}
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      </div>

      <div
        className="w-4 h-4 rounded-full shrink-0"
        style={{ backgroundColor: item.color }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{item.name}</h3>
          {!item.isActive && (
            <Badge variant="secondary" className="text-xs">Inactive</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {item.description}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {item.duration} min
          </span>
          {item.bufferAfter > 0 && (
            <span>+{item.bufferAfter}min buffer</span>
          )}
          {item.requiresApproval && (
            <Badge variant="outline" className="text-xs">Requires Approval</Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Switch
          checked={item.isActive}
          onCheckedChange={() => onToggle(item)}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(item)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(item)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function BookACallAdminPage() {
  const { profile } = useUserProfile();
  const [meetingTypes, setMeetingTypes] = useState<MeetingTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingItem, setEditingItem] = useState<MeetingTypeItem | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MeetingTypeItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Load meeting types
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "meetingTypes"), orderBy("order", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MeetingTypeItem[];
      setMeetingTypes(items);
      setLoading(false);
    }, (error) => {
      console.error("Error loading meeting types:", error);
      toast.error("Failed to load meeting types");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Move item up
  const moveUp = async (index: number) => {
    if (index <= 0 || !db) return;
    
    const newItems = [...meetingTypes];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    
    // Update orders
    newItems.forEach((item, i) => {
      item.order = i;
    });
    
    setMeetingTypes(newItems);
    
    // Update Firestore
    try {
      await setDoc(
        doc(db, "meetingTypes", newItems[index - 1].id),
        { order: index - 1 },
        { merge: true }
      );
      await setDoc(
        doc(db, "meetingTypes", newItems[index].id),
        { order: index },
        { merge: true }
      );
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  // Move item down
  const moveDown = async (index: number) => {
    if (index >= meetingTypes.length - 1 || !db) return;
    
    const newItems = [...meetingTypes];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    
    // Update orders
    newItems.forEach((item, i) => {
      item.order = i;
    });
    
    setMeetingTypes(newItems);
    
    // Update Firestore
    try {
      await setDoc(
        doc(db, "meetingTypes", newItems[index].id),
        { order: index },
        { merge: true }
      );
      await setDoc(
        doc(db, "meetingTypes", newItems[index + 1].id),
        { order: index + 1 },
        { merge: true }
      );
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  // Open wizard
  const openWizard = (item?: MeetingTypeItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description,
        duration: item.duration,
        color: item.color,
        bufferBefore: item.bufferBefore,
        bufferAfter: item.bufferAfter,
        isActive: item.isActive,
        requiresApproval: item.requiresApproval,
        maxBookingsPerDay: item.maxBookingsPerDay,
      });
    } else {
      setEditingItem(null);
      setFormData(emptyFormData);
    }
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    setEditingItem(null);
    setFormData(emptyFormData);
    setWizardStep(1);
  };

  // Save meeting type
  const handleSave = async () => {
    if (!db) {
      toast.error("Database not available");
      return;
    }

    if (!formData.name || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const itemId = editingItem?.id || `meeting-${Date.now()}`;
      const itemData = {
        ...formData,
        order: editingItem?.order ?? meetingTypes.length,
        updatedAt: Timestamp.now(),
        createdAt: editingItem?.createdAt || Timestamp.now(),
      };

      await setDoc(doc(db, "meetingTypes", itemId), itemData);
      toast.success(editingItem ? "Meeting type updated" : "Meeting type created");
      closeWizard();
    } catch (error) {
      console.error("Error saving meeting type:", error);
      toast.error("Failed to save meeting type");
    } finally {
      setSaving(false);
    }
  };

  // Delete meeting type
  const confirmDelete = (item: MeetingTypeItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!db || !itemToDelete) return;

    try {
      await deleteDoc(doc(db, "meetingTypes", itemToDelete.id));
      toast.success("Meeting type deleted");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting meeting type:", error);
      toast.error("Failed to delete meeting type");
    }
  };

  // Toggle active status
  const toggleActive = async (item: MeetingTypeItem) => {
    if (!db) return;

    try {
      await setDoc(
        doc(db, "meetingTypes", item.id),
        { isActive: !item.isActive, updatedAt: Timestamp.now() },
        { merge: true }
      );
      toast.success(item.isActive ? "Meeting type deactivated" : "Meeting type activated");
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    }
  };

  // Wizard navigation
  const goToNext = () => {
    if (wizardStep < wizardSteps.length) setWizardStep(wizardStep + 1);
  };

  const goToPrev = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  // Render wizard step
  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Meeting Type Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Discovery/Scoping Session"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what this meeting is for..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Display Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={cn(
                      "h-10 rounded-lg transition-all",
                      color.class,
                      formData.color === color.value && "ring-2 ring-offset-2 ring-slate-900"
                    )}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bufferBefore">Buffer Before (minutes)</Label>
                <Input
                  id="bufferBefore"
                  type="number"
                  min={0}
                  max={60}
                  value={formData.bufferBefore}
                  onChange={(e) => setFormData({ ...formData, bufferBefore: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bufferAfter">Buffer After (minutes)</Label>
                <Input
                  id="bufferAfter"
                  type="number"
                  min={0}
                  max={60}
                  value={formData.bufferAfter}
                  onChange={(e) => setFormData({ ...formData, bufferAfter: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Show this meeting type on the booking page
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium">Requires Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Bookings must be approved before confirmation
                </p>
              </div>
              <Switch
                checked={formData.requiresApproval}
                onCheckedChange={(checked) => setFormData({ ...formData, requiresApproval: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxBookings">Max Bookings Per Day (optional)</Label>
              <Input
                id="maxBookings"
                type="number"
                min={1}
                placeholder="Unlimited"
                value={formData.maxBookingsPerDay || ""}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  maxBookingsPerDay: e.target.value ? parseInt(e.target.value) : undefined 
                })}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: formData.color }}
                  />
                  <h3 className="font-semibold">{formData.name || "Untitled"}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{formData.description}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {formData.duration} minutes
                  </Badge>
                  {formData.bufferBefore > 0 && (
                    <Badge variant="outline">{formData.bufferBefore}min before buffer</Badge>
                  )}
                  {formData.bufferAfter > 0 && (
                    <Badge variant="outline">{formData.bufferAfter}min after buffer</Badge>
                  )}
                  {formData.requiresApproval && (
                    <Badge variant="outline">Requires Approval</Badge>
                  )}
                  {!formData.isActive && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
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
          <h1 className="text-3xl font-bold">Book a Call Settings</h1>
          <p className="text-muted-foreground">
            Manage meeting types and booking options
          </p>
        </div>
        <Button onClick={() => openWizard()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Meeting Type
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meetingTypes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {meetingTypes.filter((m) => m.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Need Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {meetingTypes.filter((m) => m.requiresApproval).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {meetingTypes.length > 0
                ? Math.round(
                    meetingTypes.reduce((acc, m) => acc + m.duration, 0) / meetingTypes.length
                  )
                : 0}
              <span className="text-sm font-normal text-muted-foreground">min</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meeting Types List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : meetingTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No meeting types yet</p>
            <Button onClick={() => openWizard()} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create First Meeting Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {meetingTypes.map((item, index) => (
            <MeetingTypeListItem
              key={item.id}
              item={item}
              index={index}
              total={meetingTypes.length}
              onEdit={openWizard}
              onDelete={confirmDelete}
              onToggle={toggleActive}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
            />
          ))}
        </div>
      )}

      {/* Preview Link */}
      {meetingTypes.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" asChild>
            <a href="/schedule-a-call" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Booking Page
            </a>
          </Button>
        </div>
      )}

      {/* Wizard Dialog */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Meeting Type" : "Create Meeting Type"}
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
          <div className="min-h-[250px]">{renderWizardStep()}</div>

          {/* Footer */}
          <DialogFooter className="flex justify-between">
            <div>
              {wizardStep > 1 && (
                <Button variant="outline" onClick={goToPrev}>
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
                <Button onClick={goToNext}>
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
                  {editingItem ? "Update" : "Create"}
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
            <DialogTitle>Delete Meeting Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{itemToDelete?.name}</strong>?
              This action cannot be undone.
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
