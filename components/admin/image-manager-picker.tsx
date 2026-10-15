"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, Check, Upload, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  listImages,
  getImage,
  uploadImage,
  base64ToDataUrl,
  compressImage,
  type ImageCategory,
  type ImageMetadata,
} from "@/lib/firebase-images";
import { useUserProfile } from "@/contexts/user-profile-context";
import Image from "next/image";

interface ImageResult {
  id: string;
  url: string;
  thumbnail: string;
  name: string;
  category: string;
  source: "image-manager";
}

interface ExternalImageResult {
  id: string;
  url: string;
  thumbnail: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
  source: "pexels" | "unsplash";
}

interface ImageManagerPickerProps {
  onSelect: (image: ImageResult) => void;
  selectedImageId?: string;
  category?: ImageCategory;
}

const IMAGE_CATEGORIES: { value: ImageCategory; label: string }[] = [
  { value: "hero", label: "Hero Images" },
  { value: "backgrounds", label: "Backgrounds" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

export function ImageManagerPicker({ onSelect, selectedImageId, category = "hero" }: ImageManagerPickerProps) {
  const { linkedTeamMember } = useUserProfile();
  const [activeTab, setActiveTab] = useState<"library" | "upload" | "external">("library");
  const [libraryImages, setLibraryImages] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<ImageCategory | "all">(category);
  
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState<ImageCategory>(category);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // External search state
  const [searchQuery, setSearchQuery] = useState("");
  const [pexelsResults, setPexelsResults] = useState<ExternalImageResult[]>([]);
  const [unsplashResults, setUnsplashResults] = useState<ExternalImageResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [externalTab, setExternalTab] = useState<"pexels" | "unsplash">("pexels");

  useEffect(() => {
    loadLibraryImages();
  }, [filterCategory]);

  const loadLibraryImages = async () => {
    setLoading(true);
    try {
      const cat = filterCategory === "all" ? undefined : filterCategory;
      const images = await listImages(cat);
      
      const imageResults: ImageResult[] = await Promise.all(
        images.map(async (img) => {
          const fullImage = await getImage(img.id);
          const dataUrl = fullImage ? base64ToDataUrl(fullImage.base64Data, fullImage.mimeType) : "";
          return {
            id: img.id,
            url: dataUrl,
            thumbnail: dataUrl,
            name: img.name,
            category: img.category,
            source: "image-manager" as const,
          };
        })
      );
      
      setLibraryImages(imageResults);
    } catch (error) {
      console.error("Failed to load images:", error);
      toast.error("Failed to load images from library");
    } finally {
      setLoading(false);
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

    if (!uploadName) {
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
      setUploadName(fileName);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select an image");
      return;
    }

    if (!uploadName.trim()) {
      toast.error("Please enter a name for the image");
      return;
    }

    setUploading(true);
    try {
      const uploadedImage = await uploadImage(file, {
        name: uploadName.trim(),
        description: uploadDescription.trim() || undefined,
        category: uploadCategory,
        tags: ["hero-carousel"],
        createdBy: linkedTeamMember?.id,
      });

      const dataUrl = base64ToDataUrl(uploadedImage.base64Data, uploadedImage.mimeType);
      
      onSelect({
        id: uploadedImage.id,
        url: dataUrl,
        thumbnail: dataUrl,
        name: uploadedImage.name,
        category: uploadedImage.category,
        source: "image-manager",
      });

      toast.success("Image uploaded and selected");
      setFile(null);
      setPreview(null);
      setUploadName("");
      setUploadDescription("");
      setActiveTab("library");
      loadLibraryImages();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const searchPexels = async (query: string) => {
    try {
      const response = await fetch(`/api/images/pexels?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Failed to search Pexels");
      const data = await response.json();
      
      const results: ExternalImageResult[] = data.photos?.map((photo: any) => ({
        id: photo.id.toString(),
        url: photo.src.large2x,
        thumbnail: photo.src.medium,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        alt: photo.alt || query,
        source: "pexels" as const,
      })) || [];
      
      setPexelsResults(results);
    } catch (error) {
      console.error("Pexels search error:", error);
      setPexelsResults([]);
    }
  };

  const searchUnsplash = async (query: string) => {
    try {
      const response = await fetch(`/api/images/unsplash?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Failed to search Unsplash");
      const data = await response.json();
      
      const results: ExternalImageResult[] = data.results?.map((photo: any) => ({
        id: photo.id,
        url: photo.urls.regular,
        thumbnail: photo.urls.small,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        alt: photo.alt_description || query,
        source: "unsplash" as const,
      })) || [];
      
      setUnsplashResults(results);
    } catch (error) {
      console.error("Unsplash search error:", error);
      setUnsplashResults([]);
    }
  };

  const handleExternalSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    try {
      await Promise.all([
        searchPexels(searchQuery),
        searchUnsplash(searchQuery),
      ]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleExternalImageSelect = async (image: ExternalImageResult) => {
    setUploading(true);
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const file = new File([blob], `${image.source}-${image.id}.jpg`, { type: blob.type });

      const uploadedImage = await uploadImage(file, {
        name: `${image.source}-${image.alt || image.id}`,
        description: `Photo by ${image.photographer} on ${image.source === "pexels" ? "Pexels" : "Unsplash"}`,
        category: uploadCategory,
        tags: ["hero-carousel", image.source, "external"],
        createdBy: linkedTeamMember?.id,
      });

      const dataUrl = base64ToDataUrl(uploadedImage.base64Data, uploadedImage.mimeType);
      
      onSelect({
        id: uploadedImage.id,
        url: dataUrl,
        thumbnail: dataUrl,
        name: uploadedImage.name,
        category: uploadedImage.category,
        source: "image-manager",
      });

      toast.success("Image saved to library and selected");
      setActiveTab("library");
      loadLibraryImages();
    } catch (error) {
      console.error("Failed to save external image:", error);
      toast.error("Failed to save image to library");
    } finally {
      setUploading(false);
    }
  };

  const renderImageGrid = (images: ImageResult[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
      {images.map((image) => (
        <Card
          key={image.id}
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-primary relative group",
            selectedImageId === image.id && "ring-2 ring-primary"
          )}
          onClick={() => onSelect(image)}
        >
          <CardContent className="p-0">
            <div className="relative aspect-video">
              <img
                src={image.thumbnail}
                alt={image.name}
                className="w-full h-full object-cover rounded-t-lg"
              />
              {selectedImageId === image.id && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="h-4 w-4" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button size="sm" variant="secondary">
                  Select Image
                </Button>
              </div>
            </div>
            <div className="p-2">
              <p className="text-xs font-medium truncate">{image.name}</p>
              <Badge variant="outline" className="text-xs mt-1">{image.category}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderExternalImageGrid = (results: ExternalImageResult[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
      {results.map((image) => (
        <Card
          key={image.id}
          className="cursor-pointer transition-all hover:ring-2 hover:ring-primary relative group"
          onClick={() => handleExternalImageSelect(image)}
        >
          <CardContent className="p-0">
            <div className="relative aspect-video">
              <img
                src={image.thumbnail}
                alt={image.alt}
                className="w-full h-full object-cover rounded-t-lg"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button size="sm" variant="secondary" disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Select"}
                </Button>
              </div>
            </div>
            <div className="p-2">
              <p className="text-xs text-muted-foreground truncate">
                by {image.photographer}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="library">
            <ImageIcon className="h-4 w-4 mr-2" />
            Library
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="external">
            <Search className="h-4 w-4 mr-2" />
            Search Stock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <div className="flex gap-2">
            <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as any)}>
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
            <Button variant="outline" size="sm" onClick={loadLibraryImages}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading images...
            </div>
          ) : libraryImages.length > 0 ? (
            renderImageGrid(libraryImages)
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No images in library. Upload one or search stock images.
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upload-file">Select Image</Label>
            <Input
              id="upload-file"
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
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="upload-name">Name *</Label>
            <Input
              id="upload-name"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="e.g., hero-business-success"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="upload-category">Category</Label>
            <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v as ImageCategory)}>
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
            <Label htmlFor="upload-description">Description</Label>
            <Textarea
              id="upload-description"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Optional description"
              disabled={uploading}
            />
          </div>

          <Button onClick={handleUpload} disabled={uploading || !file} className="w-full">
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
        </TabsContent>

        <TabsContent value="external" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for images (e.g., 'business meeting', 'success', 'team')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleExternalSearch()}
            />
            <Button onClick={handleExternalSearch} disabled={searchLoading || !searchQuery.trim()}>
              {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <Tabs value={externalTab} onValueChange={(v) => setExternalTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pexels">
                Pexels {pexelsResults.length > 0 && `(${pexelsResults.length})`}
              </TabsTrigger>
              <TabsTrigger value="unsplash">
                Unsplash {unsplashResults.length > 0 && `(${unsplashResults.length})`}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pexels" className="mt-4">
              {pexelsResults.length > 0 ? (
                renderExternalImageGrid(pexelsResults)
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {searchLoading ? "Searching Pexels..." : "Search for images to get started"}
                </div>
              )}
            </TabsContent>
            <TabsContent value="unsplash" className="mt-4">
              {unsplashResults.length > 0 ? (
                renderExternalImageGrid(unsplashResults)
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {searchLoading ? "Searching Unsplash..." : "Search for images to get started"}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="text-xs text-muted-foreground">
            <p><strong>Note:</strong> External images will be saved to your Image Manager library automatically.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
