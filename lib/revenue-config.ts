/**
 * Revenue Configuration Module
 * 
 * Manages course bundles, pricing, and Stripe integration for direct sales.
 */

import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CourseBundle {
  id: string;
  name: string;
  description: string;
  slug: string;
  isActive: boolean;
  
  // Course references
  courseIds: string[];
  courses: BundleCourseInfo[];
  
  // Pricing
  priceInCents: number; // Bundle price
  compareAtPriceInCents: number | null; // Sum of individual course prices for discount display
  
  // Stripe
  stripeProductId: string | null;
  stripePriceId: string | null;
  
  // Display
  isFeatured: boolean;
  badgeText: string | null; // e.g., "Save 30%", "Best Value"
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface BundleCourseInfo {
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  originalPriceInCents: number;
}

export interface ShoppingCart {
  id: string;
  userId: string | null; // null for guest carts
  items: CartItem[];
  
  // Totals
  subtotalInCents: number;
  discountInCents: number;
  taxInCents: number;
  totalInCents: number;
  
  // Coupon
  couponCode: string | null;
  couponDiscountInCents: number;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp | null; // Guest carts expire
}

export interface CartItem {
  id: string;
  type: "course" | "bundle";
  itemId: string; // courseId or bundleId
  
  // Display info
  name: string;
  description: string;
  thumbnailUrl: string | null;
  
  // Pricing
  priceInCents: number;
  originalPriceInCents: number; // For showing discount
  
  addedAt: Timestamp;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  
  // Discount type
  discountType: "percentage" | "fixed_amount";
  discountValue: number; // percentage (0-100) or amount in cents
  
  // Limits
  maxUses: number | null;
  currentUses: number;
  minPurchaseAmount: number | null; // in cents
  
  // Applicability
  applicableTo: "all" | "courses" | "bundles" | "specific";
  applicableItemIds: string[] | null; // if applicableTo is "specific"
  
  // Dates
  startsAt: Timestamp | null;
  expiresAt: Timestamp | null;
  
  // Status
  isActive: boolean;
  
  createdAt: Timestamp;
  createdBy: string;
}

export interface RevenueSettings {
  id: string;
  
  // Global settings
  currency: string; // default: "usd"
  currencySymbol: string; // default: "$"
  
  // Tax settings
  taxEnabled: boolean;
  taxRate: number; // percentage
  taxName: string; // e.g., "Sales Tax", "VAT"
  
  // Checkout settings
  allowGuestCheckout: boolean;
  requireBillingAddress: boolean;
  
  // Email settings
  sendReceiptEmail: boolean;
  receiptEmailTemplate: string;
  
  // Stripe settings
  stripeConnected: boolean;
  stripeAccountId: string | null;
  
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// COLLECTION NAMES
// ============================================================================

export const REVENUE_COLLECTIONS = {
  BUNDLES: "courseBundles",
  CARTS: "shoppingCarts",
  COUPONS: "coupons",
  SETTINGS: "revenueSettings",
} as const;

// ============================================================================
// BUNDLE OPERATIONS
// ============================================================================

export async function createBundle(data: {
  name: string;
  description: string;
  courseIds: string[];
  priceInCents: number;
  compareAtPriceInCents?: number;
  isFeatured?: boolean;
  badgeText?: string;
  createdBy: string;
}): Promise<CourseBundle> {
  if (!db) throw new Error("Firebase not initialized");

  // Fetch course details
  const coursesRef = collection(db, "lms_courses");
  const courses: BundleCourseInfo[] = [];
  let totalOriginalPrice = 0;

  for (const courseId of data.courseIds) {
    const courseDoc = await getDoc(doc(coursesRef, courseId));
    if (courseDoc.exists()) {
      const courseData = courseDoc.data();
      courses.push({
        courseId,
        title: courseData.title,
        thumbnailUrl: courseData.thumbnailUrl || null,
        originalPriceInCents: courseData.priceInCents || 0,
      });
      totalOriginalPrice += courseData.priceInCents || 0;
    }
  }

  const bundlesRef = collection(db, REVENUE_COLLECTIONS.BUNDLES);
  const newDocRef = doc(bundlesRef);

  const bundle: CourseBundle = {
    id: newDocRef.id,
    name: data.name,
    description: data.description,
    slug: generateSlug(data.name),
    isActive: true,
    courseIds: data.courseIds,
    courses,
    priceInCents: data.priceInCents,
    compareAtPriceInCents: data.compareAtPriceInCents || totalOriginalPrice,
    stripeProductId: null,
    stripePriceId: null,
    isFeatured: data.isFeatured || false,
    badgeText: data.badgeText || null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: data.createdBy,
  };

  await setDoc(newDocRef, bundle);
  return bundle;
}

export async function getBundles(options?: {
  isActive?: boolean;
  isFeatured?: boolean;
}): Promise<CourseBundle[]> {
  if (!db) throw new Error("Firebase not initialized");

  const bundlesRef = collection(db, REVENUE_COLLECTIONS.BUNDLES);
  let q = query(bundlesRef, orderBy("createdAt", "desc"));

  if (options?.isActive !== undefined) {
    q = query(q, where("isActive", "==", options.isActive));
  }
  if (options?.isFeatured) {
    q = query(q, where("isFeatured", "==", true));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as CourseBundle);
}

export async function getBundle(bundleId: string): Promise<CourseBundle | null> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, REVENUE_COLLECTIONS.BUNDLES, bundleId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return docSnap.data() as CourseBundle;
}

export async function updateBundle(
  bundleId: string,
  updates: Partial<Omit<CourseBundle, "id" | "createdAt" | "createdBy">>
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, REVENUE_COLLECTIONS.BUNDLES, bundleId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteBundle(bundleId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, REVENUE_COLLECTIONS.BUNDLES, bundleId);
  await deleteDoc(docRef);
}

export async function updateBundleStripeIds(
  bundleId: string,
  stripeProductId: string,
  stripePriceId: string
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, REVENUE_COLLECTIONS.BUNDLES, bundleId);
  await updateDoc(docRef, {
    stripeProductId,
    stripePriceId,
    updatedAt: Timestamp.now(),
  });
}

// ============================================================================
// COUPON OPERATIONS
// ============================================================================

export async function createCoupon(data: {
  code: string;
  description: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  maxUses?: number;
  minPurchaseAmount?: number;
  applicableTo?: "all" | "courses" | "bundles" | "specific";
  applicableItemIds?: string[];
  startsAt?: Date;
  expiresAt?: Date;
  createdBy: string;
}): Promise<Coupon> {
  if (!db) throw new Error("Firebase not initialized");

  const couponsRef = collection(db, REVENUE_COLLECTIONS.COUPONS);
  const newDocRef = doc(couponsRef);

  const coupon: Coupon = {
    id: newDocRef.id,
    code: data.code.toUpperCase(),
    description: data.description,
    discountType: data.discountType,
    discountValue: data.discountValue,
    maxUses: data.maxUses || null,
    currentUses: 0,
    minPurchaseAmount: data.minPurchaseAmount || null,
    applicableTo: data.applicableTo || "all",
    applicableItemIds: data.applicableItemIds || null,
    startsAt: data.startsAt ? Timestamp.fromDate(data.startsAt) : null,
    expiresAt: data.expiresAt ? Timestamp.fromDate(data.expiresAt) : null,
    isActive: true,
    createdAt: Timestamp.now(),
    createdBy: data.createdBy,
  };

  await setDoc(newDocRef, coupon);
  return coupon;
}

export async function validateCoupon(
  code: string,
  cartTotal: number,
  itemType: "course" | "bundle",
  itemId: string
): Promise<{ valid: boolean; coupon?: Coupon; discount: number; error?: string }> {
  if (!db) throw new Error("Firebase not initialized");

  const couponsRef = collection(db, REVENUE_COLLECTIONS.COUPONS);
  const q = query(couponsRef, where("code", "==", code.toUpperCase()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { valid: false, discount: 0, error: "Invalid coupon code" };
  }

  const coupon = snapshot.docs[0].data() as Coupon;

  // Check if active
  if (!coupon.isActive) {
    return { valid: false, discount: 0, error: "Coupon is not active" };
  }

  // Check dates
  const now = Timestamp.now();
  if (coupon.startsAt && coupon.startsAt.toMillis() > now.toMillis()) {
    return { valid: false, discount: 0, error: "Coupon not yet valid" };
  }
  if (coupon.expiresAt && coupon.expiresAt.toMillis() < now.toMillis()) {
    return { valid: false, discount: 0, error: "Coupon expired" };
  }

  // Check usage limit
  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
    return { valid: false, discount: 0, error: "Coupon usage limit reached" };
  }

  // Check minimum purchase
  if (coupon.minPurchaseAmount && cartTotal < coupon.minPurchaseAmount) {
    return {
      valid: false,
      discount: 0,
      error: `Minimum purchase of ${formatPrice(coupon.minPurchaseAmount)} required`,
    };
  }

  // Check applicability
  if (coupon.applicableTo === "courses" && itemType !== "course") {
    return { valid: false, discount: 0, error: "Coupon only valid for courses" };
  }
  if (coupon.applicableTo === "bundles" && itemType !== "bundle") {
    return { valid: false, discount: 0, error: "Coupon only valid for bundles" };
  }
  if (
    coupon.applicableTo === "specific" &&
    coupon.applicableItemIds &&
    !coupon.applicableItemIds.includes(itemId)
  ) {
    return { valid: false, discount: 0, error: "Coupon not valid for this item" };
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = Math.round((cartTotal * coupon.discountValue) / 100);
  } else {
    discount = coupon.discountValue;
  }

  return { valid: true, coupon, discount };
}

export async function incrementCouponUsage(couponId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, REVENUE_COLLECTIONS.COUPONS, couponId);
  await updateDoc(docRef, {
    currentUses: increment(1),
  });
}

export async function getCoupons(): Promise<Coupon[]> {
  if (!db) throw new Error("Firebase not initialized");

  const couponsRef = collection(db, REVENUE_COLLECTIONS.COUPONS);
  const q = query(couponsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data() as Coupon);
}

export async function updateCoupon(
  couponId: string,
  updates: Partial<Omit<Coupon, "id" | "createdAt">>
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, REVENUE_COLLECTIONS.COUPONS, couponId);
  await updateDoc(docRef, updates);
}

export async function deleteCoupon(couponId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, REVENUE_COLLECTIONS.COUPONS, couponId);
  await deleteDoc(docRef);
}

// ============================================================================
// SHOPPING CART OPERATIONS
// ============================================================================

export async function getOrCreateCart(userId: string | null): Promise<ShoppingCart> {
  if (!db) throw new Error("Firebase not initialized");

  const cartsRef = collection(db, REVENUE_COLLECTIONS.CARTS);

  // Try to find existing cart
  if (userId) {
    const q = query(cartsRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as ShoppingCart;
    }
  }

  // Create new cart
  const newCartRef = doc(cartsRef);
  const cart: ShoppingCart = {
    id: newCartRef.id,
    userId,
    items: [],
    subtotalInCents: 0,
    discountInCents: 0,
    taxInCents: 0,
    totalInCents: 0,
    couponCode: null,
    couponDiscountInCents: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    expiresAt: userId ? null : Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for guests
  };

  await setDoc(newCartRef, cart);
  return cart;
}

export async function addToCart(
  cartId: string,
  item: Omit<CartItem, "id" | "addedAt">
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const cartRef = doc(db, REVENUE_COLLECTIONS.CARTS, cartId);
  const cartSnap = await getDoc(cartRef);

  if (!cartSnap.exists()) throw new Error("Cart not found");

  const cart = cartSnap.data() as ShoppingCart;

  // Check if item already exists
  const existingItem = cart.items.find((i) => i.itemId === item.itemId && i.type === item.type);
  if (existingItem) {
    throw new Error("Item already in cart");
  }

  const newItem: CartItem = {
    ...item,
    id: `item-${Date.now()}`,
    addedAt: Timestamp.now(),
  };

  const updatedItems = [...cart.items, newItem];
  const subtotal = updatedItems.reduce((sum, i) => sum + i.priceInCents, 0);

  await updateDoc(cartRef, {
    items: updatedItems,
    subtotalInCents: subtotal,
    totalInCents: subtotal - cart.discountInCents - cart.couponDiscountInCents + cart.taxInCents,
    updatedAt: Timestamp.now(),
  });
}

export async function removeFromCart(cartId: string, itemId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const cartRef = doc(db, REVENUE_COLLECTIONS.CARTS, cartId);
  const cartSnap = await getDoc(cartRef);

  if (!cartSnap.exists()) throw new Error("Cart not found");

  const cart = cartSnap.data() as ShoppingCart;
  const updatedItems = cart.items.filter((i) => i.id !== itemId);
  const subtotal = updatedItems.reduce((sum, i) => sum + i.priceInCents, 0);

  await updateDoc(cartRef, {
    items: updatedItems,
    subtotalInCents: subtotal,
    totalInCents: subtotal - cart.discountInCents - cart.couponDiscountInCents + cart.taxInCents,
    updatedAt: Timestamp.now(),
  });
}

export async function applyCouponToCart(cartId: string, couponCode: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const cartRef = doc(db, REVENUE_COLLECTIONS.CARTS, cartId);
  const cartSnap = await getDoc(cartRef);

  if (!cartSnap.exists()) throw new Error("Cart not found");

  const cart = cartSnap.data() as ShoppingCart;

  // Validate coupon against cart
  // (Simplified - in practice, validate against each item)
  const validation = await validateCoupon(couponCode, cart.subtotalInCents, "course", "");

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  await updateDoc(cartRef, {
    couponCode,
    couponDiscountInCents: validation.discount,
    totalInCents: cart.subtotalInCents - validation.discount - cart.discountInCents + cart.taxInCents,
    updatedAt: Timestamp.now(),
  });
}

export async function clearCart(cartId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const cartRef = doc(db, REVENUE_COLLECTIONS.CARTS, cartId);
  await updateDoc(cartRef, {
    items: [],
    subtotalInCents: 0,
    discountInCents: 0,
    couponDiscountInCents: 0,
    taxInCents: 0,
    totalInCents: 0,
    couponCode: null,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteCart(cartId: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const cartRef = doc(db, REVENUE_COLLECTIONS.CARTS, cartId);
  await deleteDoc(cartRef);
}

// ============================================================================
// REVENUE SETTINGS
// ============================================================================

export async function getRevenueSettings(): Promise<RevenueSettings> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, REVENUE_COLLECTIONS.SETTINGS, "global");
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    // Return default settings
    return {
      id: "global",
      currency: "usd",
      currencySymbol: "$",
      taxEnabled: false,
      taxRate: 0,
      taxName: "Sales Tax",
      allowGuestCheckout: true,
      requireBillingAddress: false,
      sendReceiptEmail: true,
      receiptEmailTemplate: "default",
      stripeConnected: false,
      stripeAccountId: null,
      updatedAt: Timestamp.now(),
      updatedBy: "system",
    };
  }

  return docSnap.data() as RevenueSettings;
}

export async function updateRevenueSettings(
  settings: Partial<Omit<RevenueSettings, "id" | "updatedAt">>,
  updatedBy: string
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, REVENUE_COLLECTIONS.SETTINGS, "global");
  await setDoc(
    docRef,
    {
      ...settings,
      updatedAt: Timestamp.now(),
      updatedBy,
    },
    { merge: true }
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatPrice(priceInCents: number, currencySymbol = "$"): string {
  const dollars = priceInCents / 100;
  return `${currencySymbol}${dollars.toFixed(2)}`;
}

export function calculateBundleSavings(
  bundlePrice: number,
  originalPrice: number
): { amount: number; percentage: number } {
  const amount = originalPrice - bundlePrice;
  const percentage = Math.round((amount / originalPrice) * 100);
  return { amount, percentage };
}

// Real-time subscriptions
export function subscribeToBundles(callback: (bundles: CourseBundle[]) => void): () => void {
  if (!db) return () => {};

  const q = query(collection(db, REVENUE_COLLECTIONS.BUNDLES), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    const bundles = snapshot.docs.map((doc) => doc.data() as CourseBundle);
    callback(bundles);
  });
}

export function subscribeToCart(
  cartId: string,
  callback: (cart: ShoppingCart | null) => void
): () => void {
  if (!db) return () => {};

  const docRef = doc(db, REVENUE_COLLECTIONS.CARTS, cartId);

  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as ShoppingCart);
    } else {
      callback(null);
    }
  });
}

// Import increment from firebase/firestore
import { increment } from "firebase/firestore";
