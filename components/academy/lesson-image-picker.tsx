"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  Check,
  X,
  FileImage,
  RefreshCw,
} from "lucide-react";
import {
  uploadImage,
  listImages,
  getImage,
  compressImage,
  base64ToDataUrl,
  type ImageCategory,
  type ImageMetadata,
  type ImageUploadOptions,
} from "@/lib/firebase-images";

interface LessonImagePickerProps {
  value?: string; // Image ID
  onChange: (imageId: string | undefined, imageUrl: string | undefined) => void;
  label?: string;
}

export function LessonImagePicker({ value, onChange, label = "Lesson Image" }: LessonImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(value || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);
  
  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const imageList = await listImages();
      setImages(imageList);
    } catch (error) {
      console.error("Failed to load images:", error);
      toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadImages();
    }
  }, [open, loadImages]);

  useEffect(() => {
    async function loadPreview() {
      if (value) {
        try {
          const img = await getImage(value);
          if (img) {
            setPreviewUrl(base64ToDataUrl(img.base64Data, img.mimeType));
          }
        } catch (error) {
          console.error("Failed to load image preview:", error);
        }
      }
    }
    loadPreview();
  }, [value]);

  const handleSelectImage = async (imageId: string) => {
    setSelectedImage(imageId);
    try {
      const img = await getImage(imageId);
      if (img) {
        const url = base64ToDataUrl(img.base64Data, img.mimeType);
        onChange(imageId, url);
        setPreviewUrl(url);
        setOpen(false);
      }
    } catch (error) {
      console.error("Failed to select image:", error);
      toast.error("Failed to select image");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const MAX_SIZE = 1 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      try {
        const compressed = await compressImage(selectedFile, 1200, 0.8);
        if (compressed.size > MAX_SIZE) {
          toast.error("Image is too large even after compression");
          return;
        }
        setFile(compressed);
        setUploadPreview(URL.createObjectURL(compressed));
        toast.success("Image compressed");
      } catch (error) {
        toast.error("Failed to compress image");
      }
    } else {
      setFile(selectedFile);
      setUploadPreview(URL.createObjectURL(selectedFile));
    }

    if (!imageName) {
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
      setImageName(fileName);
    }
  };

  const handleUpload = async () => {
    if (!file || !imageName.trim()) {
      toast.error("Please select an image and enter a name");
      return;
    }

    setUploading(true);
    try {
      const options: ImageUploadOptions = {
        name: imageName.trim(),
        category: "portal" as ImageCategory,
        tags: ["lesson", "course"],
      };

      const uploaded = await uploadImage(file, options);
      toast.success("Image uploaded");
      
      // Select the newly uploaded image
      const url = base64ToDataUrl(uploaded.base64Data, uploaded.mimeType);
      onChange(uploaded.id, url);
      setPreviewUrl(url);
      setSelectedImage(uploaded.id);
      
      // Reset upload form
      setFile(null);
      setUploadPreview(null);
      setImageName("");
      setUploadMode(false);
      setOpen(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(undefined, undefined);
    setPreviewUrl(null);
    setSelectedImage(null);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {previewUrl ? (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border bg-muted">
          <Image
            src={previewUrl}
            alt="Selected image"
            fill
            className="object-contain"
          />
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpen(true)}
            >
              Change
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="w-full h-24 border-dashed">
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to add image</span>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Select or Upload Image</DialogTitle>
              <DialogDescription>
                Choose an existing image or upload a new one
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-2 mb-4">
              <Button
                variant={!uploadMode ? "default" : "outline"}
                size="sm"
                onClick={() => setUploadMode(false)}
              >
                <FileImage className="mr-2 h-4 w-4" />
                Select Existing
              </Button>
              <Button
                variant={uploadMode ? "default" : "outline"}
                size="sm"
                onClick={() => setUploadMode(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload New
              </Button>
            </div>

            {uploadMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Image File</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </div>

                {uploadPreview && (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                    <Image
                      src={uploadPreview}
                      alt="Upload preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Image Name *</Label>
                  <Input
                    value={imageName}
                    onChange={(e) => setImageName(e.target.value)}
                    placeholder="e.g., lesson-intro-image"
                    disabled={uploading}
                  />
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={uploading || !file || !imageName.trim()}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload & Select
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
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
                      onClick={() => setUploadMode(true)}
                    >
                      Upload your first image
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="grid grid-cols-3 gap-3">
                      {images.map((image) => (
                        <ImageThumbnail
                          key={image.id}
                          image={image}
                          selected={selectedImage === image.id}
                          onSelect={() => handleSelectImage(image.id)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface ImageThumbnailProps {
  image: ImageMetadata;
  selected: boolean;
  onSelect: () => void;
}

function ImageThumbnail({ image, selected, onSelect }: ImageThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/30"
      }`}
    >
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : imageUrl ? (
        <Image
          src={imageUrl}
          alt={image.name}
          fill
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <FileImage className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      {selected && (
        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
          <Check className="h-3 w-3" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
        <p className="text-xs text-white truncate">{image.name}</p>
      </div>
    </button>
  );
}
