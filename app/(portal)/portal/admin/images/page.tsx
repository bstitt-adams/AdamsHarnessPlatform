"use client";

import { ImageManager } from "@/components/admin/image-manager";

export default function ImagesAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Image Management</h1>
        <p className="text-muted-foreground">
          Upload and manage images stored in Firebase. Images are stored as base64 encoded data.
        </p>
      </div>
      
      <ImageManager />
    </div>
  );
}
