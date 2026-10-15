"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  Menu,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Settings,
  Loader2,
  Save,
  X,
  Sparkles,
  Zap,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createNavigationItem,
  getNavigationItems,
  updateNavigationItem,
  deleteNavigationItem,
  reorderNavigationItems,
  getAnimationSettings,
  updateAnimationSettings,
  subscribeToNavigationItems,
  subscribeToAnimationSettings,
  type NavigationItem,
  type NavigationType,
  type AnimationSettings,
  type AnimationType,
} from "@/lib/firebase-navigation";

const ANIMATION_TYPES: { value: AnimationType; label: string; description: string }[] = [
  { value: "none", label: "None", description: "No animation" },
  { value: "fade", label: "Fade", description: "Smooth fade in/out" },
  { value: "slide", label: "Slide", description: "Slide animation" },
  { value: "scale", label: "Scale", description: "Scale up/down" },
  { value: "bounce", label: "Bounce", description: "Bouncy effect" },
];

const EASING_FUNCTIONS = [
  { value: "ease", label: "Ease" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In-Out" },
  { value: "linear", label: "Linear" },
  { value: "cubic-bezier(0.4, 0, 0.2, 1)", label: "Custom Cubic" },
];

export default function NavigationManagerPage() {
  const [activeTab, setActiveTab] = useState<NavigationType>("header");
  const [headerItems, setHeaderItems] = useState<NavigationItem[]>([]);
  const [footerItems, setFooterItems] = useState<NavigationItem[]>([]);
  const [headerAnimations, setHeaderAnimations] = useState<AnimationSettings | null>(null);
  const [footerAnimations, setFooterAnimations] = useState<AnimationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showAnimationDialog, setShowAnimationDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    label: "",
    url: "",
    icon: "",
    description: "",
    isEnabled: true,
    isExternal: false,
    openInNewTab: false,
    parentId: null as string | null,
  });

  // Load data
  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    const unsubHeader = subscribeToNavigationItems("header", setHeaderItems);
    const unsubFooter = subscribeToNavigationItems("footer", setFooterItems);
    const unsubHeaderAnim = subscribeToAnimationSettings("header", setHeaderAnimations);
    const unsubFooterAnim = subscribeToAnimationSettings("footer", setFooterAnimations);

    return () => {
      unsubHeader();
      unsubFooter();
      unsubHeaderAnim();
      unsubFooterAnim();
    };
  }, []);

  const loadData = async () => {
    try {
      const [header, footer, headerAnim, footerAnim] = await Promise.all([
        getNavigationItems("header"),
        getNavigationItems("footer"),
        getAnimationSettings("header"),
        getAnimationSettings("footer"),
      ]);
      
      setHeaderItems(header);
      setFooterItems(footer);
      setHeaderAnimations(headerAnim);
      setFooterAnimations(footerAnim);
    } catch (error) {
      console.error("Error loading navigation data:", error);
      toast.error("Failed to load navigation data");
    } finally {
      setLoading(false);
    }
  };

  const currentItems = activeTab === "header" ? headerItems : footerItems;
  const currentAnimations = activeTab === "header" ? headerAnimations : footerAnimations;

  // Handle create/edit item
  const handleSaveItem = async () => {
    if (!formData.label.trim() || !formData.url.trim()) {
      toast.error("Label and URL are required");
      return;
    }

    try {
      if (editingItem) {
        await updateNavigationItem(editingItem.id, activeTab, formData);
        toast.success("Menu item updated");
      } else {
        const maxOrder = Math.max(0, ...currentItems.map(i => i.order));
        await createNavigationItem({
          ...formData,
          type: activeTab,
          order: maxOrder + 1,
        });
        toast.success("Menu item created");
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("Failed to save menu item");
    }
  };

  // Handle delete item
  const handleDeleteItem = async (item: NavigationItem) => {
    if (!confirm(`Delete "${item.label}"? This will also delete all sub-items.`)) return;

    try {
      await deleteNavigationItem(item.id, activeTab);
      toast.success("Menu item deleted");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete menu item");
    }
  };

  // Handle toggle enabled
  const handleToggleEnabled = async (item: NavigationItem) => {
    try {
      await updateNavigationItem(item.id, activeTab, { isEnabled: !item.isEnabled });
      toast.success(item.isEnabled ? "Menu item disabled" : "Menu item enabled");
    } catch (error) {
      console.error("Error toggling item:", error);
      toast.error("Failed to update menu item");
    }
  };

  // Handle open dialog
  const handleOpenDialog = (item?: NavigationItem, parentId?: string) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        label: item.label,
        url: item.url,
        icon: item.icon || "",
        description: item.description || "",
        isEnabled: item.isEnabled,
        isExternal: item.isExternal,
        openInNewTab: item.openInNewTab,
        parentId: item.parentId,
      });
    } else {
      setEditingItem(null);
      setFormData({
        label: "",
        url: "",
        icon: "",
        description: "",
        isEnabled: true,
        isExternal: false,
        openInNewTab: false,
        parentId: parentId || null,
      });
    }
    setShowItemDialog(true);
  };

  const handleCloseDialog = () => {
    setShowItemDialog(false);
    setEditingItem(null);
  };

  // Handle save animations
  const handleSaveAnimations = async (settings: Partial<AnimationSettings>) => {
    try {
      await updateAnimationSettings(activeTab, settings);
      toast.success("Animation settings updated");
      setShowAnimationDialog(false);
    } catch (error) {
      console.error("Error saving animations:", error);
      toast.error("Failed to save animation settings");
    }
  };

  // Toggle expanded state
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Render menu item
  const renderMenuItem = (item: NavigationItem, level: number = 0) => {
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="space-y-1">
        <div
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
            !item.isEnabled && "opacity-50",
            level > 0 && "ml-8"
          )}
          style={{ marginLeft: level > 0 ? `${level * 2}rem` : 0 }}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
          
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleExpanded(item.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{item.label}</p>
              {item.isExternal && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
              {!item.isEnabled && <Badge variant="secondary" className="text-xs">Disabled</Badge>}
              {level > 0 && <Badge variant="outline" className="text-xs">Sub-item</Badge>}
            </div>
            <p className="text-sm text-muted-foreground truncate">{item.url}</p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleEnabled(item)}
            >
              {item.isEnabled ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDialog(undefined, item.id)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDialog(item)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteItem(item)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Header & Footer Manager</h1>
          <p className="text-muted-foreground">
            Manage navigation menus, sub-items, and animations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAnimationDialog(true)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Animations
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NavigationType)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="header">
            <Menu className="mr-2 h-4 w-4" />
            Header Navigation
          </TabsTrigger>
          <TabsTrigger value="footer">
            <Menu className="mr-2 h-4 w-4" />
            Footer Navigation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="header" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Header Menu Items</CardTitle>
              <CardDescription>
                Manage items that appear in the site header. Drag to reorder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {headerItems.length === 0 ? (
                <div className="text-center py-12">
                  <Menu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No header items yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first header menu item to get started
                  </p>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Header Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {headerItems.map(item => renderMenuItem(item))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Animation Preview */}
          {headerAnimations && headerAnimations.enableAnimations && (
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Active Animations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hover Effect:</span>
                    <Badge variant="outline">{headerAnimations.hoverAnimation}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dropdown:</span>
                    <Badge variant="outline">{headerAnimations.dropdownAnimation}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{headerAnimations.transitionDuration}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="footer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Footer Menu Items</CardTitle>
              <CardDescription>
                Manage items that appear in the site footer. Drag to reorder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {footerItems.length === 0 ? (
                <div className="text-center py-12">
                  <Menu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No footer items yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first footer menu item to get started
                  </p>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Footer Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {footerItems.map(item => renderMenuItem(item))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Animation Preview */}
          {footerAnimations && footerAnimations.enableAnimations && (
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Active Animations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hover Effect:</span>
                    <Badge variant="outline">{footerAnimations.hoverAnimation}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{footerAnimations.transitionDuration}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Menu Item" : "Add Menu Item"}
            </DialogTitle>
            <DialogDescription>
              {formData.parentId 
                ? "Create a sub-menu item that will appear under its parent"
                : "Create a new menu item for the navigation"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., About Us"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="e.g., /about"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon (optional)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="e.g., home, user, settings"
              />
              <p className="text-xs text-muted-foreground">Lucide icon name</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description for accessibility"
                rows={2}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enabled</Label>
                  <p className="text-sm text-muted-foreground">Show this item in navigation</p>
                </div>
                <Switch
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>External Link</Label>
                  <p className="text-sm text-muted-foreground">Link goes to external site</p>
                </div>
                <Switch
                  checked={formData.isExternal}
                  onCheckedChange={(checked) => setFormData({ ...formData, isExternal: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Open in New Tab</Label>
                  <p className="text-sm text-muted-foreground">Open link in new window</p>
                </div>
                <Switch
                  checked={formData.openInNewTab}
                  onCheckedChange={(checked) => setFormData({ ...formData, openInNewTab: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem}>
              <Save className="mr-2 h-4 w-4" />
              {editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Animation Settings Dialog */}
      <Dialog open={showAnimationDialog} onOpenChange={setShowAnimationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Animation Settings - {activeTab === "header" ? "Header" : "Footer"}</DialogTitle>
            <DialogDescription>
              Configure animations for menu interactions
            </DialogDescription>
          </DialogHeader>

          {currentAnimations && (
            <AnimationSettingsForm
              settings={currentAnimations}
              onSave={handleSaveAnimations}
              onCancel={() => setShowAnimationDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Animation Settings Form Component
function AnimationSettingsForm({
  settings,
  onSave,
  onCancel,
}: {
  settings: AnimationSettings;
  onSave: (settings: Partial<AnimationSettings>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    enableAnimations: settings.enableAnimations,
    hoverAnimation: settings.hoverAnimation,
    transitionDuration: settings.transitionDuration,
    transitionEasing: settings.transitionEasing,
    dropdownAnimation: settings.dropdownAnimation,
    dropdownDuration: settings.dropdownDuration,
    mobileMenuAnimation: settings.mobileMenuAnimation,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="space-y-0.5">
          <Label className="text-base">Enable Animations</Label>
          <p className="text-sm text-muted-foreground">Turn all animations on or off</p>
        </div>
        <Switch
          checked={formData.enableAnimations}
          onCheckedChange={(checked) => setFormData({ ...formData, enableAnimations: checked })}
        />
      </div>

      {formData.enableAnimations && (
        <>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hover Animation</Label>
              <Select
                value={formData.hoverAnimation}
                onValueChange={(value: AnimationType) => setFormData({ ...formData, hoverAnimation: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIMATION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dropdown Animation</Label>
              <Select
                value={formData.dropdownAnimation}
                onValueChange={(value: AnimationType) => setFormData({ ...formData, dropdownAnimation: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIMATION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mobile Menu Animation</Label>
              <Select
                value={formData.mobileMenuAnimation}
                onValueChange={(value: AnimationType) => setFormData({ ...formData, mobileMenuAnimation: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIMATION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Transition Duration (ms)</Label>
              <Input
                type="number"
                min="0"
                max="2000"
                step="50"
                value={formData.transitionDuration}
                onChange={(e) => setFormData({ ...formData, transitionDuration: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Recommended: 200-500ms</p>
            </div>

            <div className="space-y-2">
              <Label>Dropdown Duration (ms)</Label>
              <Input
                type="number"
                min="0"
                max="2000"
                step="50"
                value={formData.dropdownDuration}
                onChange={(e) => setFormData({ ...formData, dropdownDuration: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Easing Function</Label>
              <Select
                value={formData.transitionEasing}
                onValueChange={(value) => setFormData({ ...formData, transitionEasing: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EASING_FUNCTIONS.map(easing => (
                    <SelectItem key={easing.value} value={easing.value}>
                      {easing.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(formData)}>
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </DialogFooter>
    </div>
  );
}
