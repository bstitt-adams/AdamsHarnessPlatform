"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Check,
  ArrowUp,
  ArrowDown,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Zap,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { collection, getDocs, doc, setDoc, deleteDoc, Timestamp, writeBatch, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type HeroSlideDoc } from "@/lib/schema";
import type { HeroSlide } from "@/components/marketing/hero-carousel";
import { adamsHeroSlides } from "@/lib/adams-hero-slides";
import { ImageManagerPicker } from "@/components/admin/image-manager-picker";

const wizardSteps = [
  { id: 1, title: "Basic Info", description: "Badge and headline", icon: Sparkles },
  { id: 2, title: "Content", description: "Subheadline and benefits", icon: TrendingUp },
  { id: 3, title: "Design", description: "Images and styling", icon: ImageIcon },
  { id: 4, title: "Animation", description: "Motion and effects", icon: Zap },
  { id: 5, title: "Actions", description: "Call-to-action buttons", icon: Check },
  { id: 6, title: "Review", description: "Preview and publish", icon: Eye },
];

interface SlideFormData {
  badge: string;
  headline: string;
  highlightedText: string;
  subheadline: string;
  benefits: string[];
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
  isPublished: boolean;
  backgroundImage?: {
    imageId: string;
    url: string;
    name: string;
  };
  animation: {
    type: "fade" | "slide-up" | "slide-left" | "zoom" | "none";
    duration: number;
    delay: number;
  };
  overlay: {
    enabled: boolean;
    color: string;
    opacity: number;
  };
  leadMagnet: {
    enabled: boolean;
    type: "quiz" | "download" | "consultation" | "demo";
    urgency?: string;
  };
}

const emptyFormData: SlideFormData = {
  badge: "",
  headline: "",
  highlightedText: "",
  subheadline: "",
  benefits: ["", "", ""],
  primaryCtaText: "",
  primaryCtaHref: "",
  secondaryCtaText: "",
  secondaryCtaHref: "",
  isPublished: false,
  animation: {
    type: "fade",
    duration: 500,
    delay: 0,
  },
  overlay: {
    enabled: false,
    color: "#000000",
    opacity: 50,
  },
  leadMagnet: {
    enabled: false,
    type: "quiz",
  },
};

const animationTypes = [
  { value: "fade", label: "Fade In", description: "Smooth opacity transition" },
  { value: "slide-up", label: "Slide Up", description: "Slide from bottom" },
  { value: "slide-left", label: "Slide Left", description: "Slide from right" },
  { value: "zoom", label: "Zoom In", description: "Scale up effect" },
  { value: "none", label: "No Animation", description: "Instant display" },
];

const leadMagnetTypes = [
  { value: "quiz", label: "Quiz", description: "Adams IQ™ Quiz" },
  { value: "consultation", label: "Free Consultation", description: "Strategy call booking" },
  { value: "download", label: "Free Download", description: "Guide or resource" },
  { value: "demo", label: "Demo Request", description: "Product demonstration" },
];

const urgencyMessages = [
  "Limited Time: Free Assessment Ending Soon!",
  "Join 500+ Business Owners Who Transformed Their Companies",
  "Only 3 Strategy Slots Available This Week",
  "Get Results in 90 Days or Your Money Back",
  "Exclusive Offer: First 10 Clients Get 50% Off",
];

export default function HeroManagementEnhancedPage() {
  const [slides, setSlides] = useState<(HeroSlide & Partial<HeroSlideDoc>)[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingSlide, setEditingSlide] = useState<(HeroSlide & Partial<HeroSlideDoc>) | null>(null);
  const [formData, setFormData] = useState<SlideFormData>(emptyFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<(HeroSlide & Partial<HeroSlideDoc>) | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const slidesQuery = query(
      collection(db, COLLECTIONS.HERO_SLIDES),
      orderBy("order", "asc")
    );

    const unsubscribe = onSnapshot(slidesQuery, (snapshot) => {
      if (snapshot.empty) {
        seedInitialSlides();
      } else {
        const slidesData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as HeroSlideDoc;
          return {
            id: docSnap.id,
            badge: data.badge,
            headline: data.headline,
            highlightedText: data.highlightedText,
            subheadline: data.subheadline,
            benefits: data.benefits,
            primaryCta: data.primaryCta,
            secondaryCta: data.secondaryCta,
            isPublished: data.isPublished,
            order: data.order,
            backgroundImage: data.backgroundImage,
            animation: data.animation,
            overlay: data.overlay,
            leadMagnet: data.leadMagnet,
          };
        });
        setSlides(slidesData);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching hero slides:", error);
      toast.error("Failed to load hero slides");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const seedInitialSlides = async () => {
    if (!db) return;
    
    try {
      const batch = writeBatch(db);
      
      adamsHeroSlides.forEach((slide) => {
        const docRef = doc(db!, COLLECTIONS.HERO_SLIDES, slide.id);
        const slideDoc: HeroSlideDoc = {
          id: slide.id,
          badge: slide.badge,
          headline: slide.headline,
          highlightedText: slide.highlightedText,
          subheadline: slide.subheadline,
          benefits: slide.benefits,
          primaryCta: slide.primaryCta,
          secondaryCta: slide.secondaryCta,
          isPublished: slide.isPublished,
          order: slide.order,
          animation: {
            type: "fade",
            duration: 500,
            delay: 0,
          },
          overlay: {
            enabled: false,
            color: "#000000",
            opacity: 50,
          },
          leadMagnet: {
            enabled: true,
            type: "quiz",
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        batch.set(docRef, slideDoc);
      });

      await batch.commit();
      toast.success("Hero slides initialized with defaults");
    } catch (error) {
      console.error("Error seeding slides:", error);
      toast.error("Failed to initialize hero slides");
    }
  };

  const openWizard = (slide?: (HeroSlide & Partial<HeroSlideDoc>)) => {
    if (slide) {
      setEditingSlide(slide);
      setFormData({
        badge: slide.badge,
        headline: slide.headline,
        highlightedText: slide.highlightedText,
        subheadline: slide.subheadline,
        benefits: [...slide.benefits, "", ""].slice(0, 3),
        primaryCtaText: slide.primaryCta.text,
        primaryCtaHref: slide.primaryCta.href,
        secondaryCtaText: slide.secondaryCta.text,
        secondaryCtaHref: slide.secondaryCta.href,
        isPublished: slide.isPublished,
        backgroundImage: slide.backgroundImage,
        animation: slide.animation || emptyFormData.animation,
        overlay: slide.overlay || emptyFormData.overlay,
        leadMagnet: slide.leadMagnet || emptyFormData.leadMagnet,
      });
    } else {
      setEditingSlide(null);
      setFormData(emptyFormData);
    }
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    setEditingSlide(null);
    setFormData(emptyFormData);
    setWizardStep(1);
  };

  const handleSave = async () => {
    if (!db) return;
    
    setSaving(true);
    try {
      const slideId = editingSlide?.id || `slide-${Date.now()}`;
      const slideDoc: Partial<HeroSlideDoc> = {
        id: slideId,
        badge: formData.badge,
        headline: formData.headline,
        highlightedText: formData.highlightedText,
        subheadline: formData.subheadline,
        benefits: formData.benefits.filter(b => b.trim() !== ""),
        primaryCta: { text: formData.primaryCtaText, href: formData.primaryCtaHref },
        secondaryCta: { text: formData.secondaryCtaText, href: formData.secondaryCtaHref },
        isPublished: formData.isPublished,
        order: editingSlide?.order || slides.length + 1,
        createdAt: editingSlide ? Timestamp.now() : Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Only include optional fields if they have valid values
      if (formData.backgroundImage?.imageId && formData.backgroundImage?.url) {
        slideDoc.backgroundImage = formData.backgroundImage;
      }
      if (formData.animation) {
        slideDoc.animation = formData.animation;
      }
      if (formData.overlay) {
        slideDoc.overlay = formData.overlay;
      }
      if (formData.leadMagnet) {
        slideDoc.leadMagnet = formData.leadMagnet;
      }

      await setDoc(doc(db, COLLECTIONS.HERO_SLIDES, slideId), slideDoc as HeroSlideDoc);
      toast.success(editingSlide ? "Slide updated successfully" : "Slide created successfully");
      closeWizard();
    } catch (error) {
      console.error("Error saving slide:", error);
      toast.error("Failed to save slide");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (slide: (HeroSlide & Partial<HeroSlideDoc>)) => {
    setSlideToDelete(slide);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!db || !slideToDelete) return;
    
    try {
      await deleteDoc(doc(db, COLLECTIONS.HERO_SLIDES, slideToDelete.id));
      toast.success("Slide deleted successfully");
      setDeleteDialogOpen(false);
      setSlideToDelete(null);
    } catch (error) {
      console.error("Error deleting slide:", error);
      toast.error("Failed to delete slide");
    }
  };

  const togglePublish = async (id: string) => {
    if (!db) return;
    
    const slide = slides.find(s => s.id === id);
    if (!slide) return;
    
    try {
      await setDoc(doc(db, COLLECTIONS.HERO_SLIDES, id), {
        isPublished: !slide.isPublished,
        updatedAt: Timestamp.now(),
      }, { merge: true });
      toast.success(slide.isPublished ? "Slide unpublished" : "Slide published");
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error("Failed to update slide");
    }
  };

  const moveSlide = async (id: string, direction: "up" | "down") => {
    if (!db) return;
    
    const index = slides.findIndex(s => s.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === slides.length - 1)
    ) return;

    const newSlides = [...slides];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newSlides[index], newSlides[swapIndex]] = [newSlides[swapIndex], newSlides[index]];
    
    try {
      const batch = writeBatch(db);
      newSlides.forEach((slide, i) => {
        const docRef = doc(db!, COLLECTIONS.HERO_SLIDES, slide.id);
        batch.update(docRef, { order: i + 1, updatedAt: Timestamp.now() });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error reordering slides:", error);
      toast.error("Failed to reorder slides");
    }
  };

  const updateBenefit = (index: number, value: string) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index] = value;
    setFormData({ ...formData, benefits: newBenefits });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Hero Carousel Management</h1>
            <p className="text-muted-foreground">Loading slides...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hero Carousel Management</h1>
          <p className="text-muted-foreground">
            Create compelling slides with images, animations, and lead generation features
          </p>
        </div>
        <Button onClick={() => openWizard()}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Slide
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Slides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slides.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {slides.filter(s => s.isPublished).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">With Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {slides.filter(s => s.backgroundImage).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lead Magnets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {slides.filter(s => s.leadMagnet?.enabled).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hero Slides</CardTitle>
          <CardDescription>
            Manage your carousel slides with advanced design and animation options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {slides.sort((a, b) => a.order - b.order).map((slide, index) => (
              <div
                key={slide.id}
                className={cn(
                  "flex items-center gap-4 p-4 border rounded-lg",
                  !slide.isPublished && "bg-muted/50"
                )}
              >
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveSlide(slide.id, "up")}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveSlide(slide.id, "down")}
                    disabled={index === slides.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>

                {slide.backgroundImage && (
                  <div className="w-20 h-12 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={slide.backgroundImage.url}
                      alt={slide.backgroundImage.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={slide.isPublished ? "default" : "secondary"}>
                      {slide.isPublished ? "Published" : "Draft"}
                    </Badge>
                    {slide.backgroundImage && (
                      <Badge variant="outline">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        Image Manager
                      </Badge>
                    )}
                    {slide.animation && slide.animation.type !== "none" && (
                      <Badge variant="outline">
                        <Zap className="h-3 w-3 mr-1" />
                        {slide.animation.type}
                      </Badge>
                    )}
                    {slide.leadMagnet?.enabled && (
                      <Badge variant="outline">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Lead Magnet
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">Order: {slide.order}</span>
                  </div>
                  <h3 className="font-semibold truncate">
                    {slide.headline} <span className="text-primary">{slide.highlightedText}</span>
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">{slide.badge}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePublish(slide.id)}
                    title={slide.isPublished ? "Unpublish" : "Publish"}
                  >
                    {slide.isPublished ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openWizard(slide)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => confirmDelete(slide)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSlide ? "Edit Hero Slide" : "Create New Hero Slide"}
            </DialogTitle>
            <DialogDescription>
              Step {wizardStep} of {wizardSteps.length}: {wizardSteps[wizardStep - 1].title}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between mb-6">
            {wizardSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                      wizardStep > step.id
                        ? "bg-primary text-primary-foreground"
                        : wizardStep === step.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {wizardStep > step.id ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  {index < wizardSteps.length - 1 && (
                    <div
                      className={cn(
                        "w-8 h-1 mx-1",
                        wizardStep > step.id ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-4 min-h-[400px]">
            {wizardStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="badge">Badge Text</Label>
                  <Input
                    id="badge"
                    placeholder="e.g., Introducing the Adams System™"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    A short, attention-grabbing label that appears above the headline
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    placeholder="e.g., Build a Business That"
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="highlightedText">Highlighted Text</Label>
                  <Input
                    id="highlightedText"
                    placeholder="e.g., Outlasts You"
                    value={formData.highlightedText}
                    onChange={(e) => setFormData({ ...formData, highlightedText: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    This text will be highlighted in your brand color for emphasis
                  </p>
                </div>
              </>
            )}

            {wizardStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subheadline">Subheadline</Label>
                  <Textarea
                    id="subheadline"
                    placeholder="Describe your value proposition in one compelling sentence..."
                    value={formData.subheadline}
                    onChange={(e) => setFormData({ ...formData, subheadline: e.target.value })}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Clearly communicate the benefit and outcome your audience will receive
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Key Benefits (up to 3)</Label>
                  {formData.benefits.map((benefit, index) => (
                    <Input
                      key={index}
                      placeholder={`Benefit ${index + 1} (e.g., "90-Day Results")`}
                      value={benefit}
                      onChange={(e) => updateBenefit(index, e.target.value)}
                    />
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Short, punchy benefits that appear as badges below the headline
                  </p>
                </div>
              </>
            )}

            {wizardStep === 3 && (
              <Tabs defaultValue="image" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="image">Background Image</TabsTrigger>
                  <TabsTrigger value="overlay">Overlay Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="image" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Background Image</Label>
                    <ImageManagerPicker
                      onSelect={(image) => {
                        setFormData({
                          ...formData,
                          backgroundImage: {
                            imageId: image.id,
                            url: image.url,
                            name: image.name,
                          },
                        });
                      }}
                      selectedImageId={formData.backgroundImage?.imageId}
                      category="hero"
                    />
                  </div>
                  {formData.backgroundImage && (
                    <div className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Selected Image</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({ ...formData, backgroundImage: undefined })}
                        >
                          Remove
                        </Button>
                      </div>
                      <img
                        src={formData.backgroundImage.url}
                        alt={formData.backgroundImage.name}
                        className="w-full h-40 object-cover rounded"
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.backgroundImage.name}
                      </p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="overlay" className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Enable Overlay</Label>
                      <p className="text-sm text-muted-foreground">
                        Add a color overlay to improve text readability
                      </p>
                    </div>
                    <Switch
                      checked={formData.overlay.enabled}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          overlay: { ...formData.overlay, enabled: checked },
                        })
                      }
                    />
                  </div>
                  {formData.overlay.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="overlayColor">Overlay Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="overlayColor"
                            type="color"
                            value={formData.overlay.color}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                overlay: { ...formData.overlay, color: e.target.value },
                              })
                            }
                            className="w-20 h-10"
                          />
                          <Input
                            value={formData.overlay.color}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                overlay: { ...formData.overlay, color: e.target.value },
                              })
                            }
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Overlay Opacity: {formData.overlay.opacity}%</Label>
                        <Slider
                          value={[formData.overlay.opacity]}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              overlay: { ...formData.overlay, opacity: value[0] },
                            })
                          }
                          min={0}
                          max={100}
                          step={5}
                        />
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {wizardStep === 4 && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Animation Type</Label>
                    <Select
                      value={formData.animation.type}
                      onValueChange={(value: any) =>
                        setFormData({
                          ...formData,
                          animation: { ...formData.animation, type: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {animationTypes.map((type) => (
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration: {formData.animation.duration}ms</Label>
                      <Slider
                        value={[formData.animation.duration]}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            animation: { ...formData.animation, duration: value[0] },
                          })
                        }
                        min={200}
                        max={2000}
                        step={100}
                      />
                      <p className="text-xs text-muted-foreground">
                        How long the animation takes (300-800ms recommended)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Delay: {formData.animation.delay}ms</Label>
                      <Slider
                        value={[formData.animation.delay]}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            animation: { ...formData.animation, delay: value[0] },
                          })
                        }
                        min={0}
                        max={1000}
                        step={100}
                      />
                      <p className="text-xs text-muted-foreground">
                        Delay before animation starts
                      </p>
                    </div>
                  </div>

                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-sm">Animation Best Practices</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <p>• <strong>Fade:</strong> Best for professional, subtle transitions</p>
                      <p>• <strong>Slide Up:</strong> Creates energy and upward momentum</p>
                      <p>• <strong>Zoom:</strong> Adds impact and draws attention</p>
                      <p>• <strong>Duration:</strong> 500-800ms feels natural and smooth</p>
                      <p>• <strong>Delay:</strong> Use sparingly to create anticipation</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {wizardStep === 5 && (
              <>
                <div className="space-y-4">
                  <h4 className="font-medium">Primary Call-to-Action</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryCtaText">Button Text</Label>
                      <Input
                        id="primaryCtaText"
                        placeholder="e.g., Take the Adams IQ™ Quiz"
                        value={formData.primaryCtaText}
                        onChange={(e) => setFormData({ ...formData, primaryCtaText: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primaryCtaHref">Link URL</Label>
                      <Input
                        id="primaryCtaHref"
                        placeholder="e.g., /quiz-intro"
                        value={formData.primaryCtaHref}
                        onChange={(e) => setFormData({ ...formData, primaryCtaHref: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Secondary Call-to-Action</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="secondaryCtaText">Button Text</Label>
                      <Input
                        id="secondaryCtaText"
                        placeholder="e.g., Schedule a Strategy Call"
                        value={formData.secondaryCtaText}
                        onChange={(e) => setFormData({ ...formData, secondaryCtaText: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryCtaHref">Link URL</Label>
                      <Input
                        id="secondaryCtaHref"
                        placeholder="e.g., /schedule-a-call"
                        value={formData.secondaryCtaHref}
                        onChange={(e) => setFormData({ ...formData, secondaryCtaHref: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Lead Magnet</Label>
                      <p className="text-sm text-muted-foreground">
                        Add urgency and conversion optimization
                      </p>
                    </div>
                    <Switch
                      checked={formData.leadMagnet.enabled}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          leadMagnet: { ...formData.leadMagnet, enabled: checked },
                        })
                      }
                    />
                  </div>

                  {formData.leadMagnet.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label>Lead Magnet Type</Label>
                        <Select
                          value={formData.leadMagnet.type}
                          onValueChange={(value: any) =>
                            setFormData({
                              ...formData,
                              leadMagnet: { ...formData.leadMagnet, type: value },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {leadMagnetTypes.map((type) => (
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
                        <Label>Urgency Message (Optional)</Label>
                        <Select
                          value={formData.leadMagnet.urgency || ""}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              leadMagnet: { ...formData.leadMagnet, urgency: value || undefined },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an urgency message" />
                          </SelectTrigger>
                          <SelectContent>
                            {urgencyMessages.map((msg, i) => (
                              <SelectItem key={i} value={msg}>
                                {msg}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-sm">CTA Best Practices</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>• Use action-oriented language ("Get", "Start", "Discover")</p>
                    <p>• Be specific about the outcome ("Take the Quiz" vs "Click Here")</p>
                    <p>• Primary CTA should be your main conversion goal</p>
                    <p>• Secondary CTA offers an alternative path (lower commitment)</p>
                    <p>• Urgency messages increase conversion by 20-30%</p>
                  </CardContent>
                </Card>
              </>
            )}

            {wizardStep === 6 && (
              <div className="space-y-4">
                <div 
                  className="relative p-8 rounded-lg text-white overflow-hidden"
                  style={{
                    backgroundImage: formData.backgroundImage ? `url(${formData.backgroundImage.url})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {formData.overlay.enabled && formData.backgroundImage && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: formData.overlay.color,
                        opacity: formData.overlay.opacity / 100,
                      }}
                    />
                  )}
                  {!formData.backgroundImage && (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                  )}
                  
                  <div className="relative z-10 space-y-4">
                    <Badge variant="outline" className="border-blue-500/50 text-blue-400 bg-blue-500/10">
                      {formData.badge || "Badge text"}
                    </Badge>
                    <h2 className="text-3xl font-bold">
                      {formData.headline || "Headline"}{" "}
                      <span className="text-blue-400">{formData.highlightedText || "Highlighted"}</span>
                    </h2>
                    <p className="text-gray-300">
                      {formData.subheadline || "Subheadline text"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.benefits.filter(b => b).map((benefit, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      {formData.primaryCtaText && (
                        <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-slate-900">
                          {formData.primaryCtaText}
                        </Button>
                      )}
                      {formData.secondaryCtaText && (
                        <Button size="sm" variant="outline" className="border-blue-400 text-blue-400">
                          {formData.secondaryCtaText}
                        </Button>
                      )}
                    </div>
                    {formData.leadMagnet.enabled && formData.leadMagnet.urgency && (
                      <div className="pt-2">
                        <Badge variant="destructive" className="text-xs">
                          {formData.leadMagnet.urgency}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium mb-1">Animation</div>
                    <div className="text-muted-foreground">
                      {animationTypes.find(a => a.value === formData.animation.type)?.label || "None"} 
                      {formData.animation.type !== "none" && ` (${formData.animation.duration}ms)`}
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium mb-1">Lead Magnet</div>
                    <div className="text-muted-foreground">
                      {formData.leadMagnet.enabled 
                        ? leadMagnetTypes.find(t => t.value === formData.leadMagnet.type)?.label 
                        : "Disabled"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="publish">Publish immediately</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this slide visible on the homepage
                    </p>
                  </div>
                  <Switch
                    id="publish"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => wizardStep === 1 ? closeWizard() : setWizardStep(wizardStep - 1)}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {wizardStep === 1 ? "Cancel" : "Back"}
            </Button>
            {wizardStep < 6 ? (
              <Button onClick={() => setWizardStep(wizardStep + 1)}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {editingSlide ? "Save Changes" : "Create Slide"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hero Slide</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{slideToDelete?.headline} {slideToDelete?.highlightedText}"? 
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
    </div>
  );
}
