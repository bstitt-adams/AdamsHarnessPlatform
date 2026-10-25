"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  Trash2,
  Edit,
  Image as ImageIcon,
  Loader2,
  Copy,
  Check,
  X,
  FileImage,
  RefreshCw,
} from "lucide-react";
import {
  uploadImage,
  listImages,
  getImage,
  deleteImage,
  updateImageMetadata,
  compressImage,
  base64ToDataUrl,
  type ImageCategory,
  type ImageMetadata,
  type ImageUploadOptions,
  SITE_IMAGE_KEYS,
} from "@/lib/firebase-images";
import { useUserProfile } from "@/contexts/user-profile-context";

const IMAGE_CATEGORIES: { value: ImageCategory; label: string }[] = [
  { value: "hero", label: "Hero Images" },
  { value: "about", label: "About Page" },
  { value: "team", label: "Team Members" },
  { value: "services", label: "Services" },
  { value: "testimonials", label: "Testimonials" },
  { value: "logos", label: "Logos" },
  { value: "icons", label: "Icons" },
  { value: "backgrounds", label: "Backgrounds" },
  { value: "marketing", label: "Marketing" },
  { value: "portal", label: "Portal" },
  { value: "other", label: "Other" },
];

interface ImageUploadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function ImageUploadForm({ onSuccess, onCancel }: ImageUploadFormProps) {
  const { linkedTeamMember } = useUserProfile();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ImageCategory>("other");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check if file is an image
    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // If file is too large, offer to compress
    const MAX_SIZE = 1 * 1024 * 1024; // 1MB
    if (selectedFile.size > MAX_SIZE) {
      setCompressing(true);
      try {
        const compressed = await compressImage(selectedFile, 1200, 0.8);
        if (compressed.size > MAX_SIZE) {
          toast.error("Image is too large even after compression. Please use a smaller image.");
          setCompressing(false);
          return;
        }
        setFile(compressed);
        setPreview(URL.createObjectURL(compressed));
        toast.success("Image compressed successfully");
      } catch (error) {
        toast.error("Failed to compress image");
        console.error(error);
      }
      setCompressing(false);
    } else {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }

    // Auto-fill name from filename if empty
    if (!name) {
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
      setName(fileName);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select an image");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter a name for the image");
      return;
    }

    setUploading(true);
    try {
      const options: ImageUploadOptions = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        createdBy: linkedTeamMember?.id,
      };

      await uploadImage(file, options);
      toast.success("Image uploaded successfully");
      onSuccess();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="image-file">Select Image</Label>
        <Input
          id="image-file"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading || compressing}
        />
        {compressing && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Compressing image...
          </p>
        )}
      </div>

      {preview && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border">
          <Image
            src={preview}
            alt="Preview"
            fill
            className="object-contain"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="image-name">Name *</Label>
        <Input
          id="image-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., about-adams-electric"
          disabled={uploading}
        />
        <p className="text-xs text-muted-foreground">
          Use a unique, descriptive name. This will be used to reference the image.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image-category">Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as ImageCategory)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image-description">Description</Label>
        <Textarea
          id="image-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description of the image"
          disabled={uploading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image-tags">Tags</Label>
        <Input
          id="image-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="tag1, tag2, tag3"
          disabled={uploading}
        />
        <p className="text-xs text-muted-foreground">Comma-separated tags</p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button onClick={handleUpload} disabled={uploading || !file}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface ImageCardProps {
  image: ImageMetadata;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

function ImageCard({ image, onDelete, onEdit }: ImageCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadImage() {
      try {
        const fullImage = await getImage(image.id);
        if (fullImage) {
          setImageUrl(base64ToDataUrl(fullImage.base64Data, fullImage.mimeType));
        }
      } catch (error) {
        console.error("Failed to load image:", error);
      } finally {
        setLoading(false);
      }
    }
    loadImage();
  }, [image.id]);

  const copyImageId = () => {
    navigator.clipboard.writeText(image.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Image ID copied to clipboard");
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative h-40 bg-muted">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : imageUrl ? (
          <Image
            src={imageUrl}
            alt={image.name}
            fill
            className="object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FileImage className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-sm truncate" title={image.name}>
                {image.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {formatSize(image.size)} • {image.width}x{image.height}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {image.category}
            </Badge>
          </div>

          {image.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {image.description}
            </p>
          )}

          <div className="flex items-center gap-1 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyImageId}
              className="h-8 px-2"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(image.id)}
              className="h-8 px-2"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Image</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{image.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(image.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImageManager() {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<ImageCategory | "all">("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const category = filterCategory === "all" ? undefined : filterCategory;
      const imageList = await listImages(category, true);
      setImages(imageList);
    } catch (error) {
      console.error("Failed to load images:", error);
      toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleDelete = async (id: string) => {
    try {
      await deleteImage(id);
      toast.success("Image deleted");
      loadImages();
    } catch (error) {
      console.error("Failed to delete image:", error);
      toast.error("Failed to delete image");
    }
  };

  const handleEdit = (id: string) => {
    // TODO: Implement edit dialog
    toast.info("Edit functionality coming soon");
  };

  const handleUploadSuccess = () => {
    setUploadDialogOpen(false);
    loadImages();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Image Manager
            </CardTitle>
            <CardDescription>
              Upload and manage images stored in Firebase
            </CardDescription>
          </div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload Image</DialogTitle>
                <DialogDescription>
                  Upload an image to Firebase. Images are stored as base64 and must be under 1MB.
                </DialogDescription>
              </DialogHeader>
              <ImageUploadForm
                onSuccess={handleUploadSuccess}
                onCancel={() => setUploadDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Label>Filter by category:</Label>
            <Select
              value={filterCategory}
              onValueChange={(v) => setFilterCategory(v as ImageCategory | "all")}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {IMAGE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={loadImages}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12">
            <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No images found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload your first image
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Predefined Site Image Keys</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Use these names when uploading images for specific site locations:
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.values(SITE_IMAGE_KEYS).map((key) => (
              <Badge key={key} variant="outline" className="font-mono text-xs">
                {key}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
