/**
 * Firebase Navigation Manager
 * 
 * Manages header and footer navigation items, including sub-menus and animations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

// ============================================================================
// COLLECTION NAMES
// ============================================================================

export const NAVIGATION_COLLECTIONS = {
  HEADER_ITEMS: "navigation_header",
  FOOTER_ITEMS: "navigation_footer",
  ANIMATION_SETTINGS: "navigation_animations",
} as const;

// ============================================================================
// TYPES
// ============================================================================

export type NavigationType = "header" | "footer";
export type AnimationType = 
  | "fade"
  | "slide"
  | "scale"
  | "bounce"
  | "none";

export interface NavigationItem {
  id: string;
  label: string;
  url: string;
  type: NavigationType;
  order: number;
  isEnabled: boolean;
  isExternal: boolean;
  openInNewTab: boolean;
  icon?: string;
  description?: string;
  parentId: string | null; // null for top-level items
  hasChildren: boolean;
  children?: NavigationItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NavigationItemDoc {
  id: string;
  label: string;
  url: string;
  type: NavigationType;
  order: number;
  isEnabled: boolean;
  isExternal: boolean;
  openInNewTab: boolean;
  icon?: string;
  description?: string;
  parentId: string | null;
  hasChildren: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AnimationSettings {
  id: string;
  type: NavigationType;
  hoverAnimation: AnimationType;
  transitionDuration: number; // in milliseconds
  transitionEasing: string; // CSS easing function
  dropdownAnimation: AnimationType;
  dropdownDuration: number;
  mobileMenuAnimation: AnimationType;
  enableAnimations: boolean;
  updatedAt: Date;
}

export interface AnimationSettingsDoc {
  id: string;
  type: NavigationType;
  hoverAnimation: AnimationType;
  transitionDuration: number;
  transitionEasing: string;
  dropdownAnimation: AnimationType;
  dropdownDuration: number;
  mobileMenuAnimation: AnimationType;
  enableAnimations: boolean;
  updatedAt: Timestamp;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_ANIMATION_SETTINGS: Omit<AnimationSettings, "id" | "updatedAt"> = {
  type: "header",
  hoverAnimation: "fade",
  transitionDuration: 300,
  transitionEasing: "ease-in-out",
  dropdownAnimation: "slide",
  dropdownDuration: 200,
  mobileMenuAnimation: "slide",
  enableAnimations: true,
};

// ============================================================================
// NAVIGATION ITEM OPERATIONS
// ============================================================================

/**
 * Create a new navigation item
 */
export async function createNavigationItem(
  data: Omit<NavigationItem, "id" | "createdAt" | "updatedAt" | "hasChildren" | "children">
): Promise<NavigationItem> {
  if (!db) throw new Error("Firebase not initialized");

  const collectionName = data.type === "header" 
    ? NAVIGATION_COLLECTIONS.HEADER_ITEMS 
    : NAVIGATION_COLLECTIONS.FOOTER_ITEMS;

  const itemsRef = collection(db, collectionName);
  const newDocRef = doc(itemsRef);

  const itemDoc: NavigationItemDoc = {
    id: newDocRef.id,
    label: data.label,
    url: data.url,
    type: data.type,
    order: data.order,
    isEnabled: data.isEnabled,
    isExternal: data.isExternal,
    openInNewTab: data.openInNewTab,
    icon: data.icon,
    description: data.description,
    parentId: data.parentId,
    hasChildren: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(newDocRef, itemDoc);

  // Update parent's hasChildren flag if this is a sub-item
  if (data.parentId) {
    const parentRef = doc(db, collectionName, data.parentId);
    await updateDoc(parentRef, { hasChildren: true, updatedAt: serverTimestamp() });
  }

  return {
    ...itemDoc,
    createdAt: itemDoc.createdAt.toDate(),
    updatedAt: itemDoc.updatedAt.toDate(),
  };
}

/**
 * Get all navigation items for a specific type
 */
export async function getNavigationItems(type: NavigationType): Promise<NavigationItem[]> {
  if (!db) throw new Error("Firebase not initialized");

  const collectionName = type === "header" 
    ? NAVIGATION_COLLECTIONS.HEADER_ITEMS 
    : NAVIGATION_COLLECTIONS.FOOTER_ITEMS;

  const itemsRef = collection(db, collectionName);
  const q = query(itemsRef, orderBy("order", "asc"));
  const snapshot = await getDocs(q);

  const items = snapshot.docs.map(doc => {
    const data = doc.data() as NavigationItemDoc;
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  });

  // Build hierarchy
  return buildNavigationHierarchy(items);
}

/**
 * Get a single navigation item
 */
export async function getNavigationItem(
  id: string,
  type: NavigationType
): Promise<NavigationItem | null> {
  if (!db) throw new Error("Firebase not initialized");

  const collectionName = type === "header" 
    ? NAVIGATION_COLLECTIONS.HEADER_ITEMS 
    : NAVIGATION_COLLECTIONS.FOOTER_ITEMS;

  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data() as NavigationItemDoc;
  return {
    ...data,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
}

/**
 * Update a navigation item
 */
export async function updateNavigationItem(
  id: string,
  type: NavigationType,
  updates: Partial<Omit<NavigationItem, "id" | "createdAt" | "updatedAt" | "children">>
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const collectionName = type === "header" 
    ? NAVIGATION_COLLECTIONS.HEADER_ITEMS 
    : NAVIGATION_COLLECTIONS.FOOTER_ITEMS;

  const docRef = doc(db, collectionName, id);
  
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a navigation item
 */
export async function deleteNavigationItem(id: string, type: NavigationType): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const collectionName = type === "header" 
    ? NAVIGATION_COLLECTIONS.HEADER_ITEMS 
    : NAVIGATION_COLLECTIONS.FOOTER_ITEMS;

  // Get the item to check if it has a parent
  const item = await getNavigationItem(id, type);
  if (!item) return;

  // Delete all children first
  if (item.hasChildren) {
    const children = await getChildItems(id, type);
    for (const child of children) {
      await deleteNavigationItem(child.id, type);
    }
  }

  // Delete the item
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);

  // Update parent's hasChildren flag if needed
  if (item.parentId) {
    const siblings = await getChildItems(item.parentId, type);
    if (siblings.length === 1) { // Only the item being deleted
      const parentRef = doc(db, collectionName, item.parentId);
      await updateDoc(parentRef, { hasChildren: false, updatedAt: serverTimestamp() });
    }
  }
}

/**
 * Reorder navigation items
 */
export async function reorderNavigationItems(
  items: { id: string; order: number }[],
  type: NavigationType
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const firestoreDb = db; // Assign to non-null variable after check

  const collectionName = type === "header" 
    ? NAVIGATION_COLLECTIONS.HEADER_ITEMS 
    : NAVIGATION_COLLECTIONS.FOOTER_ITEMS;

  const updates = items.map(item => {
    const docRef = doc(firestoreDb, collectionName, item.id);
    return updateDoc(docRef, { order: item.order, updatedAt: serverTimestamp() });
  });

  await Promise.all(updates);
}

/**
 * Get child items for a parent
 */
async function getChildItems(parentId: string, type: NavigationType): Promise<NavigationItem[]> {
  if (!db) throw new Error("Firebase not initialized");

  const collectionName = type === "header" 
    ? NAVIGATION_COLLECTIONS.HEADER_ITEMS 
    : NAVIGATION_COLLECTIONS.FOOTER_ITEMS;

  const itemsRef = collection(db, collectionName);
  const q = query(
    itemsRef,
    where("parentId", "==", parentId),
    orderBy("order", "asc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data() as NavigationItemDoc;
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  });
}

/**
 * Build navigation hierarchy from flat list
 */
function buildNavigationHierarchy(items: NavigationItem[]): NavigationItem[] {
  const itemMap = new Map<string, NavigationItem>();
  const rootItems: NavigationItem[] = [];

  // First pass: create map
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  // Second pass: build hierarchy
  items.forEach(item => {
    const itemWithChildren = itemMap.get(item.id)!;
    
    if (item.parentId) {
      const parent = itemMap.get(item.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(itemWithChildren);
      }
    } else {
      rootItems.push(itemWithChildren);
    }
  });

  return rootItems;
}

// ============================================================================
// ANIMATION SETTINGS OPERATIONS
// ============================================================================

/**
 * Get animation settings for a navigation type
 */
export async function getAnimationSettings(type: NavigationType): Promise<AnimationSettings> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, NAVIGATION_COLLECTIONS.ANIMATION_SETTINGS, type);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    // Return defaults if not set
    return {
      ...DEFAULT_ANIMATION_SETTINGS,
      id: type,
      type,
      updatedAt: new Date(),
    };
  }

  const data = docSnap.data() as AnimationSettingsDoc;
  return {
    ...data,
    updatedAt: data.updatedAt.toDate(),
  };
}

/**
 * Update animation settings
 */
export async function updateAnimationSettings(
  type: NavigationType,
  settings: Partial<Omit<AnimationSettings, "id" | "type" | "updatedAt">>
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");

  const docRef = doc(db, NAVIGATION_COLLECTIONS.ANIMATION_SETTINGS, type);
  
  await setDoc(docRef, {
    ...settings,
    id: type,
    type,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to navigation items changes
 */
export function subscribeToNavigationItems(
  type: NavigationType,
  callback: (items: NavigationItem[]) => void
): () => void {
  if (!db) {
    console.error("Firebase not initialized");
    return () => {};
  }

  const collectionName = type === "header" 
    ? NAVIGATION_COLLECTIONS.HEADER_ITEMS 
    : NAVIGATION_COLLECTIONS.FOOTER_ITEMS;

  const itemsRef = collection(db, collectionName);
  const q = query(itemsRef, orderBy("order", "asc"));

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => {
      const data = doc.data() as NavigationItemDoc;
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    });

    callback(buildNavigationHierarchy(items));
  });
}

/**
 * Subscribe to animation settings changes
 */
export function subscribeToAnimationSettings(
  type: NavigationType,
  callback: (settings: AnimationSettings) => void
): () => void {
  if (!db) {
    console.error("Firebase not initialized");
    return () => {};
  }

  const docRef = doc(db, NAVIGATION_COLLECTIONS.ANIMATION_SETTINGS, type);

  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({
        ...DEFAULT_ANIMATION_SETTINGS,
        id: type,
        type,
        updatedAt: new Date(),
      });
      return;
    }

    const data = snapshot.data() as AnimationSettingsDoc;
    callback({
      ...data,
      updatedAt: data.updatedAt.toDate(),
    });
  });
}
