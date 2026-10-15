"use client";

import { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { getImage, getImageByName, base64ToDataUrl, type SiteImageKey } from "@/lib/firebase-images";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FirebaseImageProps extends Omit<ImageProps, "src"> {
  imageId?: string;
  imageName?: string;
  fallbackSrc?: string;
  showLoader?: boolean;
  loaderClassName?: string;
}

/**
 * FirebaseImage component
 * 
 * Displays an image stored in Firebase Firestore as base64.
 * Can load by image ID or by image name.
 * 
 * Usage:
 * <FirebaseImage imageId="abc123" alt="My image" fill />
 * <FirebaseImage imageName="about-adams-electric" alt="Adams Electric" fill />
 */
export function FirebaseImage({
  imageId,
  imageName,
  fallbackSrc,
  showLoader = true,
  loaderClassName,
  className,
  alt,
  ...props
}: FirebaseImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadImage() {
      setLoading(true);
      setError(false);

      try {
        let imageDoc = null;

        if (imageId) {
          imageDoc = await getImage(imageId);
        } else if (imageName) {
          imageDoc = await getImageByName(imageName);
        }

        if (imageDoc) {
          const dataUrl = base64ToDataUrl(imageDoc.base64Data, imageDoc.mimeType);
          setSrc(dataUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to load Firebase image:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (imageId || imageName) {
      loadImage();
    } else {
      setLoading(false);
      setError(true);
    }
  }, [imageId, imageName]);

  // Show loader while loading
  if (loading && showLoader) {
    return (
      <div className={cn("flex items-center justify-center bg-muted", className, loaderClassName)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show fallback if error or no image found
  if (error || !src) {
    if (fallbackSrc) {
      return (
        <Image
          src={fallbackSrc}
          alt={alt}
          className={className}
          {...props}
        />
      );
    }
    return null;
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      {...props}
    />
  );
}

/**
 * Hook to get a Firebase image URL
 */
export function useFirebaseImage(imageId?: string, imageName?: string) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadImage() {
      setLoading(true);
      setError(null);

      try {
        let imageDoc = null;

        if (imageId) {
          imageDoc = await getImage(imageId);
        } else if (imageName) {
          imageDoc = await getImageByName(imageName);
        }

        if (imageDoc) {
          const dataUrl = base64ToDataUrl(imageDoc.base64Data, imageDoc.mimeType);
          setSrc(dataUrl);
        } else {
          setSrc(null);
        }
      } catch (err) {
        console.error("Failed to load Firebase image:", err);
        setError(err instanceof Error ? err : new Error("Failed to load image"));
      } finally {
        setLoading(false);
      }
    }

    if (imageId || imageName) {
      loadImage();
    } else {
      setLoading(false);
    }
  }, [imageId, imageName]);

  return { src, loading, error };
}
