"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

export const MAX_ARTIFACT_BYTES = 15 * 1024 * 1024; // 15 MB (phone photos + PDFs)
const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_JPEG_QUALITY = 0.8;

export function artifactStoragePath(teamMemberId: string, certId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `training-certs/${teamMemberId}/${certId}/${safeName}`;
}

/** Compress photos to ~1600px JPEG for phone uploads; PDFs and other types pass through. */
export async function compressArtifactIfImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", IMAGE_JPEG_QUALITY),
    );
  } catch {
    return file; // HEIC and other formats the canvas can't decode upload as-is
  }
}

export async function uploadTrainingArtifact(
  teamMemberId: string,
  certId: string,
  file: File,
): Promise<{ path: string; url: string; contentType: string; size: number }> {
  if (!storage) throw new Error("Firebase Storage is not configured");
  const blob = await compressArtifactIfImage(file);
  const isCompressedImage = blob !== file && blob.type === "image/jpeg";
  const contentType = isCompressedImage
    ? "image/jpeg"
    : file.type || "application/octet-stream";
  const path = artifactStoragePath(teamMemberId, certId, file.name);
  await uploadBytes(ref(storage, path), blob, { contentType });
  const url = await getDownloadURL(ref(storage, path));
  return { path, url, contentType, size: blob.size };
}
