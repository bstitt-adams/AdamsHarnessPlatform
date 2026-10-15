"use client";

import { useState, useEffect } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  Package,
  Tag,
  ShoppingCart,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Percent,
  Settings,
  Gift,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createBundle,
  updateBundle,
  deleteBundle,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getRevenueSettings,
  updateRevenueSettings,
  formatPrice,
  calculateBundleSavings,
  subscribeToBundles,
  type CourseBundle,
  type Coupon,
  type RevenueSettings,
  REVENUE_COLLECTIONS,
} from "@/lib/revenue-config";
import { getCourses, type CourseDoc } from "@/lib/firebase-lms";

export default function RevenueConfigurationPage() {
  const { profile } = useUserProfile();
  const [activeTab, setActiveTab] = useState("bundles");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data states
  const [bundles, setBundles] = useState<CourseBundle[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [courses, setCourses] = useState<CourseDoc[]>([]);
  const [settings, setSettings] = useState<RevenueSettings | null>(null);

  // Dialog states
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<CourseBundle | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "bundle" | "coupon"; item: CourseBundle | Coupon } | null>(null);

  // Form states
  const [bundleForm, setBundleForm] = useState({
    name: "",
    description: "",
    courseIds: [] as string[],
    priceInCents: 0,
    compareAtPriceInCents: 0,
    isFeatured: false,
    badgeText: "",
  });

  const [couponForm, setCouponForm] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed_amount",
    discountValue: 0,
    maxUses: undefined as number | undefined,
    minPurchaseAmount: undefined as number | undefined,
    applicableTo: "all" as "all" | "courses" | "bundles" | "specific",
    applicableItemIds: undefined as string[] | undefined,
  });

  // Load initial data
  useEffect(() => {
    if (!db) return;

    // Subscribe to bundles
    const unsubscribeBundles = subscribeToBundles((data) => {
      setBundles(data);
      setLoading(false);
    });

    // Load courses for bundle creation
    getCourses({ isPublished: true }).then((data) => {
      setCourses(data);
    });

    // Load settings
    getRevenueSettings().then((data) => {
      setSettings(data);
    });

    return () => {
      unsubscribeBundles();
    };
  }, []);

  // Calculate bundle preview
  const calculateBundlePreview = () => {
    const selectedCourses = courses.filter((c) => bundleForm.courseIds.includes(c.id));
    const totalOriginalPrice = selectedCourses.reduce((sum, c) => sum + (c.priceInCents || 0), 0);
    const savings = totalOriginalPrice - bundleForm.priceInCents;
    const savingsPercent = totalOriginalPrice > 0 ? Math.round((savings / totalOriginalPrice) * 100) : 0;
    return { selectedCourses, totalOriginalPrice, savings, savingsPercent };
  };

  // Save bundle
  const handleSaveBundle = async () => {
    if (!db || !profile) return;

    if (!bundleForm.name || bundleForm.courseIds.length === 0) {
      toast.error("Please provide a name and select at least one course");
      return;
    }

    if (bundleForm.priceInCents <= 0) {
      toast.error("Please set a valid price");
      return;
    }

    setSaving(true);
    try {
      if (editingBundle) {
        await updateBundle(editingBundle.id, {
          name: bundleForm.name,
          description: bundleForm.description,
          courseIds: bundleForm.courseIds,
          priceInCents: bundleForm.priceInCents,
          compareAtPriceInCents: bundleForm.compareAtPriceInCents,
          isFeatured: bundleForm.isFeatured,
          badgeText: bundleForm.badgeText || null,
        });
        toast.success("Bundle updated successfully");
      } else {
        await createBundle({
          name: bundleForm.name,
          description: bundleForm.description,
          courseIds: bundleForm.courseIds,
          priceInCents: bundleForm.priceInCents,
          compareAtPriceInCents: bundleForm.compareAtPriceInCents,
          isFeatured: bundleForm.isFeatured,
          badgeText: bundleForm.badgeText,
          createdBy: profile.id,
        });
        toast.success("Bundle created successfully");
      }
      setBundleDialogOpen(false);
      resetBundleForm();
    } catch (error) {
      console.error("Error saving bundle:", error);
      toast.error("Failed to save bundle");
    } finally {
      setSaving(false);
    }
  };

  // Save coupon
  const handleSaveCoupon = async () => {
    if (!db || !profile) return;

    if (!couponForm.code || !couponForm.description) {
      toast.error("Please provide a code and description");
      return;
    }

    setSaving(true);
    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, {
          code: couponForm.code,
          description: couponForm.description,
          discountType: couponForm.discountType,
          discountValue: couponForm.discountValue,
          maxUses: couponForm.maxUses ?? undefined,
          minPurchaseAmount: couponForm.minPurchaseAmount ?? undefined,
          applicableTo: couponForm.applicableTo,
          applicableItemIds: couponForm.applicableItemIds && couponForm.applicableItemIds.length > 0 ? couponForm.applicableItemIds : undefined,
        });
        toast.success("Coupon updated successfully");
      } else {
        await createCoupon({
          code: couponForm.code,
          description: couponForm.description,
          discountType: couponForm.discountType,
          discountValue: couponForm.discountValue,
          maxUses: couponForm.maxUses ?? undefined,
          minPurchaseAmount: couponForm.minPurchaseAmount ?? undefined,
          applicableTo: couponForm.applicableTo,
          applicableItemIds: couponForm.applicableItemIds && couponForm.applicableItemIds.length > 0 ? couponForm.applicableItemIds : undefined,
          createdBy: profile.id,
        });
        toast.success("Coupon created successfully");
      }
      setCouponDialogOpen(false);
      resetCouponForm();
    } catch (error) {
      console.error("Error saving coupon:", error);
      toast.error("Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  // Delete item
  const handleDelete = async () => {
    if (!db || !itemToDelete) return;

    try {
      if (itemToDelete.type === "bundle") {
        await deleteBundle(itemToDelete.item.id);
        toast.success("Bundle deleted");
      } else {
        await deleteCoupon(itemToDelete.item.id);
        toast.success("Coupon deleted");
      }
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!settings || !profile) return;

    try {
      await updateRevenueSettings(settings, profile.id);
      toast.success("Settings saved");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const resetBundleForm = () => {
    setBundleForm({
      name: "",
      description: "",
      courseIds: [],
      priceInCents: 0,
      compareAtPriceInCents: 0,
      isFeatured: false,
      badgeText: "",
    });
    setEditingBundle(null);
  };

  const resetCouponForm = () => {
    setCouponForm({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 0,
      maxUses: undefined,
      minPurchaseAmount: undefined,
      applicableTo: "all",
      applicableItemIds: undefined,
    });
    setEditingCoupon(null);
  };

  const openEditBundle = (bundle: CourseBundle) => {
    setEditingBundle(bundle);
    setBundleForm({
      name: bundle.name,
      description: bundle.description,
      courseIds: bundle.courseIds,
      priceInCents: bundle.priceInCents,
      compareAtPriceInCents: bundle.compareAtPriceInCents || 0,
      isFeatured: bundle.isFeatured,
      badgeText: bundle.badgeText || "",
    });
    setBundleDialogOpen(true);
  };

  const openEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses ?? undefined,
      minPurchaseAmount: coupon.minPurchaseAmount ?? undefined,
      applicableTo: coupon.applicableTo,
      applicableItemIds: coupon.applicableItemIds || undefined,
    });
    setCouponDialogOpen(true);
  };

  const { selectedCourses, totalOriginalPrice, savings, savingsPercent } = calculateBundlePreview();

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Revenue Configuration
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage course bundles, coupons, and checkout settings
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="bundles" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Bundles
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Coupons
          </TabsTrigger>
          <TabsTrigger value="cart" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Shopping Cart
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Bundles Tab */}
        <TabsContent value="bundles" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Course Bundles</h2>
              <p className="text-muted-foreground">
                Create discounted course packages for your customers
              </p>
            </div>
            <Button onClick={() => { resetBundleForm(); setBundleDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Bundle
            </Button>
          </div>

          {bundles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No bundles yet</p>
                <Button onClick={() => setBundleDialogOpen(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Bundle
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bundles.map((bundle) => (
                <Card key={bundle.id} className={cn(bundle.isFeatured && "border-blue-500")}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{bundle.name}</CardTitle>
                        {bundle.badgeText && (
                          <Badge variant="secondary" className="mt-1">
                            {bundle.badgeText}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditBundle(bundle)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setItemToDelete({ type: "bundle", item: bundle });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {bundle.description}
                    </p>

                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {formatPrice(bundle.priceInCents)}
                      </span>
                      {bundle.compareAtPriceInCents && bundle.compareAtPriceInCents > bundle.priceInCents && (
                        <>
                          <span className="text-muted-foreground line-through">
                            {formatPrice(bundle.compareAtPriceInCents)}
                          </span>
                          <Badge variant="outline" className="text-green-600">
                            Save {Math.round(((bundle.compareAtPriceInCents - bundle.priceInCents) / bundle.compareAtPriceInCents) * 100)}%
                          </Badge>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      {bundle.courses.length} courses
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {bundle.courses.slice(0, 3).map((course) => (
                        <Badge key={course.courseId} variant="secondary" className="text-xs">
                          {course.title}
                        </Badge>
                      ))}
                      {bundle.courses.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{bundle.courses.length - 3} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={bundle.isActive}
                        onCheckedChange={async (checked) => {
                          await updateBundle(bundle.id, { isActive: checked });
                          toast.success(checked ? "Bundle activated" : "Bundle deactivated");
                        }}
                      />
                      <span className="text-sm">{bundle.isActive ? "Active" : "Inactive"}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Coupons</h2>
              <p className="text-muted-foreground">
                Create discount codes for promotions
              </p>
            </div>
            <Button onClick={() => { resetCouponForm(); setCouponDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Coupon
            </Button>
          </div>

          {coupons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No coupons yet</p>
                <Button onClick={() => setCouponDialogOpen(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Coupon
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-muted-foreground" />
                          {coupon.code}
                        </div>
                        <p className="text-sm text-muted-foreground">{coupon.description}</p>
                      </TableCell>
                      <TableCell>
                        {coupon.discountType === "percentage" ? (
                          <Badge variant="outline">{coupon.discountValue}% OFF</Badge>
                        ) : (
                          <Badge variant="outline">{formatPrice(coupon.discountValue)} OFF</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {coupon.currentUses} / {coupon.maxUses || "∞"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={coupon.isActive}
                          onCheckedChange={async (checked) => {
                            await updateCoupon(coupon.id, { isActive: checked });
                            toast.success(checked ? "Coupon activated" : "Coupon deactivated");
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditCoupon(coupon)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setItemToDelete({ type: "coupon", item: coupon });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Cart Tab */}
        <TabsContent value="cart" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shopping Cart Preview</CardTitle>
              <CardDescription>
                View and manage customer shopping carts
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Shopping cart management coming soon
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Customers can add courses and bundles to their cart for purchase
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {settings && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Checkout Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={settings.currency}
                        onValueChange={(value) => setSettings({ ...settings, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usd">USD - US Dollar</SelectItem>
                          <SelectItem value="eur">EUR - Euro</SelectItem>
                          <SelectItem value="gbp">GBP - British Pound</SelectItem>
                          <SelectItem value="cad">CAD - Canadian Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currencySymbol">Currency Symbol</Label>
                      <Input
                        id="currencySymbol"
                        value={settings.currencySymbol}
                        onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Allow Guest Checkout</Label>
                      <p className="text-sm text-muted-foreground">
                        Let customers purchase without creating an account
                      </p>
                    </div>
                    <Switch
                      checked={settings.allowGuestCheckout}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, allowGuestCheckout: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Require Billing Address</Label>
                      <p className="text-sm text-muted-foreground">
                        Collect billing address during checkout
                      </p>
                    </div>
                    <Switch
                      checked={settings.requireBillingAddress}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, requireBillingAddress: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tax Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Enable Tax</Label>
                      <p className="text-sm text-muted-foreground">
                        Calculate and collect tax on purchases
                      </p>
                    </div>
                    <Switch
                      checked={settings.taxEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, taxEnabled: checked })
                      }
                    />
                  </div>

                  {settings.taxEnabled && (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="taxRate">Tax Rate (%)</Label>
                        <Input
                          id="taxRate"
                          type="number"
                          min={0}
                          max={100}
                          value={settings.taxRate}
                          onChange={(e) =>
                            setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxName">Tax Name</Label>
                        <Input
                          id="taxName"
                          value={settings.taxName}
                          onChange={(e) => setSettings({ ...settings, taxName: e.target.value })}
                          placeholder="e.g., Sales Tax, VAT"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stripe Integration</CardTitle>
                  <CardDescription>
                    Connect your Stripe account to process payments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                    {settings.stripeConnected ? (
                      <>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                        <div className="flex-1">
                          <p className="font-medium">Stripe Connected</p>
                          <p className="text-sm text-muted-foreground">
                            Account: {settings.stripeAccountId}
                          </p>
                        </div>
                        <Button variant="outline">Manage</Button>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-8 w-8 text-blue-500" />
                        <div className="flex-1">
                          <p className="font-medium">Stripe Not Connected</p>
                          <p className="text-sm text-muted-foreground">
                            Connect Stripe to start accepting payments
                          </p>
                        </div>
                        <Button>Connect Stripe</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings}>
                  Save Settings
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Bundle Dialog */}
      <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBundle ? "Edit Bundle" : "Create Bundle"}</DialogTitle>
            <DialogDescription>
              Combine multiple courses into a discounted package
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="bundleName">Bundle Name *</Label>
              <Input
                id="bundleName"
                value={bundleForm.name}
                onChange={(e) => setBundleForm({ ...bundleForm, name: e.target.value })}
                placeholder="e.g., Business Essentials Bundle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bundleDescription">Description</Label>
              <Textarea
                id="bundleDescription"
                value={bundleForm.description}
                onChange={(e) => setBundleForm({ ...bundleForm, description: e.target.value })}
                placeholder="Describe what's included in this bundle..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Courses *</Label>
              <ScrollArea className="h-[200px] border rounded-lg p-4">
                <div className="space-y-2">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                        bundleForm.courseIds.includes(course.id)
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-slate-50 border border-transparent"
                      )}
                      onClick={() => {
                        const newIds = bundleForm.courseIds.includes(course.id)
                          ? bundleForm.courseIds.filter((id) => id !== course.id)
                          : [...bundleForm.courseIds, course.id];
                        setBundleForm({ ...bundleForm, courseIds: newIds });
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{course.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(course.priceInCents || 0)}
                        </p>
                      </div>
                      {bundleForm.courseIds.includes(course.id) && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-sm text-muted-foreground">
                {bundleForm.courseIds.length} courses selected
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bundlePrice">Bundle Price ($) *</Label>
                <Input
                  id="bundlePrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={(bundleForm.priceInCents / 100).toFixed(2)}
                  onChange={(e) =>
                    setBundleForm({
                      ...bundleForm,
                      priceInCents: Math.round(parseFloat(e.target.value) * 100) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comparePrice">Compare at Price ($)</Label>
                <Input
                  id="comparePrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={(totalOriginalPrice / 100).toFixed(2)}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Auto-calculated from individual course prices
                </p>
              </div>
            </div>

            {savings > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 font-medium">
                  Customers save {formatPrice(savings)} ({savingsPercent}% off)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="badgeText">Badge Text (optional)</Label>
              <Input
                id="badgeText"
                value={bundleForm.badgeText}
                onChange={(e) => setBundleForm({ ...bundleForm, badgeText: e.target.value })}
                placeholder="e.g., Best Value, Save 30%"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={bundleForm.isFeatured}
                onCheckedChange={(checked) =>
                  setBundleForm({ ...bundleForm, isFeatured: checked })
                }
              />
              <Label>Feature this bundle on the website</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setBundleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBundle} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingBundle ? "Update Bundle" : "Create Bundle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coupon Dialog */}
      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
            <DialogDescription>
              Create discount codes for promotions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="couponCode">Coupon Code *</Label>
              <Input
                id="couponCode"
                value={couponForm.code}
                onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SUMMER2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="couponDescription">Description *</Label>
              <Input
                id="couponDescription"
                value={couponForm.description}
                onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                placeholder="e.g., 20% off all courses"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={couponForm.discountType}
                  onValueChange={(value: "percentage" | "fixed_amount") =>
                    setCouponForm({ ...couponForm, discountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={couponForm.discountValue}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, discountValue: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <span className="absolute right-3 top-2.5 text-muted-foreground">
                    {couponForm.discountType === "percentage" ? "%" : "$"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses (optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={couponForm.maxUses || ""}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      maxUses: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minPurchase">Min Purchase ($)</Label>
                <Input
                  id="minPurchase"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="None"
                  value={couponForm.minPurchaseAmount ? (couponForm.minPurchaseAmount / 100).toFixed(2) : ""}
                  onChange={(e) =>
                    setCouponForm({
                      ...couponForm,
                      minPurchaseAmount: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCouponDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCoupon} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCoupon ? "Update Coupon" : "Create Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {itemToDelete?.item.id}? This action cannot be undone.
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
