/**
 * Firebase Image Storage Utility
 * 
 * Stores images in Firestore as base64 encoded strings.
 * This approach stores images directly in Firestore documents
 * rather than using Firebase Storage.
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Collection name for images
export const IMAGES_COLLECTION = "images";

// Image document structure
export interface ImageDoc {
  id: string;
  name: string;
  description?: string;
  category: ImageCategory;
  mimeType: string;
  base64Data: string; // The actual image data in base64
  width?: number;
  height?: number;
  size: number; // Size in bytes
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  tags?: string[];
  isActive: boolean;
}

// Image categories for organization
export type ImageCategory = 
  | "hero"
  | "about"
  | "team"
  | "services"
  | "testimonials"
  | "logos"
  | "icons"
  | "backgrounds"
  | "marketing"
  | "portal"
  | "other";

// Image metadata (without base64 data for listing)
export interface ImageMetadata {
  id: string;
  name: string;
  description?: string;
  category: ImageCategory;
  mimeType: string;
  width?: number;
  height?: number;
  size: number;
  createdAt: Date;
  updatedAt?: Date;
  tags?: string[];
  isActive: boolean;
}

// Upload options
export interface ImageUploadOptions {
  name: string;
  description?: string;
  category: ImageCategory;
  tags?: string[];
  createdBy?: string;
}

/**
 * Convert a File to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 string to data URL for display
 */
export function base64ToDataUrl(base64: string, mimeType: string): string {
  if (!base64 || !mimeType) {
    return "";
  }
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Get image dimensions from a File
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload an image to Firestore as base64
 */
export async function uploadImage(
  file: File,
  options: ImageUploadOptions
): Promise<ImageDoc> {
  if (!db) {
    throw new Error("Firebase not initialized");
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  // Validate file size (max 1MB for Firestore document limit)
  const MAX_SIZE = 1 * 1024 * 1024; // 1MB
  if (file.size > MAX_SIZE) {
    throw new Error("Image must be less than 1MB. Consider compressing the image.");
  }

  // Convert to base64
  const base64Data = await fileToBase64(file);
  
  // Get dimensions
  const dimensions = await getImageDimensions(file);

  // Create document
  const imagesRef = collection(db, IMAGES_COLLECTION);
  const newDocRef = doc(imagesRef);
  
  const imageDoc: ImageDoc = {
    id: newDocRef.id,
    name: options.name,
    description: options.description,
    category: options.category,
    mimeType: file.type,
    base64Data,
    width: dimensions.width,
    height: dimensions.height,
    size: file.size,
    createdAt: Timestamp.now(),
    createdBy: options.createdBy,
    tags: options.tags || [],
    isActive: true,
  };

  // Remove undefined fields before saving (Firestore doesn't accept undefined)
  const docToSave = Object.fromEntries(
    Object.entries(imageDoc).filter(([_, v]) => v !== undefined)
  );

  await setDoc(newDocRef, docToSave);
  
  return imageDoc;
}

/**
 * Get an image by ID
 */
export async function getImage(imageId: string): Promise<ImageDoc | null> {
  if (!db) {
    throw new Error("Firebase not initialized");
  }

  const docRef = doc(db, IMAGES_COLLECTION, imageId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as ImageDoc;
}

/**
 * Get image as data URL (ready for use in img src)
 */
export async function getImageDataUrl(imageId: string): Promise<string | null> {
  const image = await getImage(imageId);
  if (!image) {
    return null;
  }
  return base64ToDataUrl(image.base64Data, image.mimeType);
}

/**
 * Get all images (metadata only, without base64 data)
 */
export async function listImages(category?: ImageCategory): Promise<ImageMetadata[]> {
  if (!db) {
    throw new Error("Firebase not initialized");
  }

  const imagesRef = collection(db, IMAGES_COLLECTION);
  
  // If filtering by category, don't use orderBy (avoids composite index)
  // Sort client-side instead
  const q = category
    ? query(imagesRef, where("category", "==", category))
    : query(imagesRef, orderBy("createdAt", "desc"));

  const snapshot = await getDocs(q);
  
  const images = snapshot.docs.map((doc) => {
    const data = doc.data() as ImageDoc;
    // Return metadata without the base64 data
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      mimeType: data.mimeType,
      width: data.width,
      height: data.height,
      size: data.size,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      tags: data.tags,
      isActive: data.isActive,
    };
  });
  
  // Sort client-side if we filtered by category (avoids composite index)
  if (category) {
    images.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  return images;
}

/**
 * Update image metadata
 */
export async function updateImageMetadata(
  imageId: string,
  updates: Partial<Pick<ImageDoc, "name" | "description" | "category" | "tags" | "isActive">>
): Promise<void> {
  if (!db) {
    throw new Error("Firebase not initialized");
  }

  const docRef = doc(db, IMAGES_COLLECTION, imageId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an image
 */
export async function deleteImage(imageId: string): Promise<void> {
  if (!db) {
    throw new Error("Firebase not initialized");
  }

  const docRef = doc(db, IMAGES_COLLECTION, imageId);
  await deleteDoc(docRef);
}

/**
 * Get images by category
 */
export async function getImagesByCategory(category: ImageCategory): Promise<ImageDoc[]> {
  if (!db) {
    throw new Error("Firebase not initialized");
  }

  const imagesRef = collection(db, IMAGES_COLLECTION);
  const q = query(
    imagesRef,
    where("category", "==", category),
    where("isActive", "==", true),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as ImageDoc);
}

/**
 * Get a single image by name and category (useful for specific site images)
 */
export async function getImageByName(
  name: string,
  category?: ImageCategory
): Promise<ImageDoc | null> {
  if (!db) {
    throw new Error("Firebase not initialized");
  }

  const imagesRef = collection(db, IMAGES_COLLECTION);
  let q = query(imagesRef, where("name", "==", name), where("isActive", "==", true));
  
  if (category) {
    q = query(
      imagesRef,
      where("name", "==", name),
      where("category", "==", category),
      where("isActive", "==", true)
    );
  }

  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data() as ImageDoc;
}

/**
 * Compress an image before upload (client-side)
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Scale down if needed
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not compress image"));
            return;
          }
          const compressedFile = new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Site image keys - predefined keys for specific site images
 */
export const SITE_IMAGE_KEYS = {
  // About page
  ABOUT_ADAMS_ELECTRIC: "about-adams-electric",
  
  // Hero images
  HERO_MAIN: "hero-main",
  HERO_SERVICES: "hero-services",
  
  // Team images
  TEAM_ADAMS: "team-adams",
  
  // Logos
  LOGO_MAIN: "logo-main",
  LOGO_WHITE: "logo-white",
  LOGO_DARK: "logo-dark",
  
  // Backgrounds
  BG_PATTERN: "bg-pattern",
} as const;

export type SiteImageKey = typeof SITE_IMAGE_KEYS[keyof typeof SITE_IMAGE_KEYS];

/**
 * Get a site image by its predefined key
 */
export async function getSiteImage(key: SiteImageKey): Promise<string | null> {
  const image = await getImageByName(key);
  if (!image) {
    return null;
  }
  return base64ToDataUrl(image.base64Data, image.mimeType);
}
