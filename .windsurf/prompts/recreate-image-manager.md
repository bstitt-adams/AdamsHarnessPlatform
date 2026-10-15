# Prompt: Recreate Image Manager Feature

## Overview
Create a complete Image Manager feature that allows users to upload, manage, and organize images stored in Firebase Firestore as base64-encoded data. This system stores images directly in Firestore documents rather than using Firebase Storage.

## Prerequisites
- Next.js application with App Router
- Firebase/Firestore configured
- TypeScript
- shadcn/ui components installed
- Lucide React icons
- Sonner for toast notifications

## Step 1: Create Firebase Images Library

Create `lib/firebase-images.ts` with the following functionality:

### Core Types
```typescript
export const IMAGES_COLLECTION = "images";

export interface ImageDoc {
  id: string;
  name: string;
  description?: string;
  category: ImageCategory;
  mimeType: string;
  base64Data: string;
  width?: number;
  height?: number;
  size: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  tags?: string[];
  isActive: boolean;
}

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

export interface ImageUploadOptions {
  name: string;
  description?: string;
  category: ImageCategory;
  tags?: string[];
  createdBy?: string;
}
```

### Core Functions to Implement
1. **fileToBase64(file: File)**: Convert File to base64 string
2. **base64ToDataUrl(base64: string, mimeType: string)**: Convert base64 to data URL for display
3. **getImageDimensions(file: File)**: Extract image width/height
4. **compressImage(file: File, maxWidth: number, quality: number)**: Client-side image compression
5. **uploadImage(file: File, options: ImageUploadOptions)**: Upload image to Firestore (max 1MB)
6. **getImage(imageId: string)**: Retrieve full image document
7. **getImageDataUrl(imageId: string)**: Get image as data URL
8. **listImages(category?: ImageCategory)**: List all images (metadata only, without base64)
9. **updateImageMetadata(imageId: string, updates)**: Update image metadata
10. **deleteImage(imageId: string)**: Delete image from Firestore
11. **getImagesByCategory(category: ImageCategory)**: Get images by category
12. **getImageByName(name: string, category?: ImageCategory)**: Get image by unique name

### Site Image Keys (Optional)
Define predefined keys for specific site images:
```typescript
export const SITE_IMAGE_KEYS = {
  ABOUT_ADAMS_ELECTRIC: "about-adams-electric",
  HERO_MAIN: "hero-main",
  LOGO_MAIN: "logo-main",
  // Add more as needed
} as const;
```

## Step 2: Create Image Manager Component

Create `components/admin/image-manager.tsx`:

### Component Structure
1. **ImageUploadForm**: Sub-component for uploading images
   - File input with preview
   - Name, description, category, tags fields
   - Auto-compression for files > 1MB
   - Validation (image type, size, required fields)
   - Uses `useUserProfile` context for `createdBy`

2. **ImageCard**: Sub-component for displaying individual images
   - Lazy-load image from Firestore
   - Display metadata (name, size, dimensions, category)
   - Actions: Copy ID, Edit, Delete
   - Delete confirmation dialog

3. **ImageManager**: Main component
   - Filter by category dropdown
   - Upload dialog
   - Grid layout of ImageCard components
   - Refresh button
   - Display predefined site image keys
   - Loading states

### Key Features
- **Compression**: Automatically compress images > 1MB before upload
- **Preview**: Show image preview before upload
- **Metadata Display**: Show image size, dimensions, category
- **Copy ID**: Copy image ID to clipboard for use in code
- **Category Filtering**: Filter images by category
- **Responsive Grid**: 2-4 columns depending on screen size

### Required shadcn/ui Components
- Card, CardContent, CardDescription, CardHeader, CardTitle
- Button
- Input
- Label
- Textarea
- Badge
- ScrollArea
- Select, SelectContent, SelectItem, SelectTrigger, SelectValue
- Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
- AlertDialog (for delete confirmation)

### Required Icons (Lucide React)
- Upload, Trash2, Edit, Image, Loader2, Copy, Check, X, FileImage, RefreshCw

## Step 3: Create Admin Page

Create `app/(portal)/portal/admin/images/page.tsx`:

```typescript
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
```

## Step 4: Add to Feature Visibility System

In `lib/feature-visibility.ts`, add to `SIDEBAR_FEATURES`:

```typescript
imageManager: { 
  label: "Image Manager", 
  section: "admin", 
  href: "/portal/admin/images" 
},
```

## Step 5: Add to Sidebar Navigation

In `components/portal/portal-sidebar.tsx`, add to `adminItems` array:

```typescript
{
  title: "Image Manager",
  href: "/portal/admin/images",
  icon: ImageIcon,
  featureKey: "imageManager",
},
```

Make sure `ImageIcon` is imported from `lucide-react`.

## Step 6: Firestore Security Rules

Add to your Firestore security rules:

```javascript
match /images/{imageId} {
  // Allow authenticated users to read
  allow read: if request.auth != null;
  
  // Allow admin/superadmin to write
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/team_members/$(request.auth.uid)).data.role in ['admin', 'superadmin'];
}
```

## Step 7: Usage in Other Components

To use images in your application:

```typescript
import { getImageByName, base64ToDataUrl } from "@/lib/firebase-images";

// Get image by name
const imageDoc = await getImageByName("hero-main");
if (imageDoc) {
  const imageUrl = base64ToDataUrl(imageDoc.base64Data, imageDoc.mimeType);
  // Use imageUrl in <img src={imageUrl} />
}

// Or use the helper
import { getSiteImage, SITE_IMAGE_KEYS } from "@/lib/firebase-images";
const heroUrl = await getSiteImage(SITE_IMAGE_KEYS.HERO_MAIN);
```

## Important Notes

1. **Size Limit**: Images must be < 1MB due to Firestore document size limits
2. **Compression**: The system automatically compresses images > 1MB
3. **Base64 Storage**: Images are stored as base64 in Firestore (not Firebase Storage)
4. **Lazy Loading**: Images are loaded on-demand in the UI to avoid fetching large base64 data unnecessarily
5. **Unique Names**: Use descriptive, unique names for images (e.g., "about-adams-electric", "hero-main")
6. **Categories**: Organize images by category for easier management
7. **Tags**: Add tags for additional organization and searchability

## Testing Checklist

- [ ] Upload image < 1MB
- [ ] Upload image > 1MB (should auto-compress)
- [ ] Upload non-image file (should reject)
- [ ] Filter by category
- [ ] Copy image ID to clipboard
- [ ] Delete image with confirmation
- [ ] View image metadata (size, dimensions)
- [ ] Refresh image list
- [ ] Navigate to page from sidebar

## Customization Options

1. **Categories**: Modify `ImageCategory` type to match your needs
2. **Site Keys**: Add predefined keys in `SITE_IMAGE_KEYS` for specific site images
3. **Max Size**: Adjust `MAX_SIZE` constant (default 1MB)
4. **Compression Settings**: Adjust `maxWidth` and `quality` in compression function
5. **Grid Layout**: Modify grid columns in ImageManager component

## Dependencies

Ensure these packages are installed:
```bash
npm install firebase
npm install sonner
npm install lucide-react
npm install next
```

## File Structure Summary

```
lib/
  firebase-images.ts          # Core image storage utilities
components/
  admin/
    image-manager.tsx         # Main Image Manager component
app/
  (portal)/
    portal/
      admin/
        images/
          page.tsx            # Admin page for Image Manager
```
