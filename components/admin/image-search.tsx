"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ExternalLink, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageResult {
  id: string;
  url: string;
  thumbnail: string;
  photographer: string;
  photographerUrl: string;
  alt: string;
  source: "pexels" | "unsplash";
}

interface ImageSearchProps {
  onSelect: (image: ImageResult) => void;
  selectedImageUrl?: string;
}

export function ImageSearch({ onSelect, selectedImageUrl }: ImageSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pexelsResults, setPexelsResults] = useState<ImageResult[]>([]);
  const [unsplashResults, setUnsplashResults] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pexels" | "unsplash">("pexels");

  const searchPexels = async (query: string) => {
    try {
      const response = await fetch(`/api/images/pexels?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Failed to search Pexels");
      const data = await response.json();
      
      const results: ImageResult[] = data.photos?.map((photo: any) => ({
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
      
      const results: ImageResult[] = data.results?.map((photo: any) => ({
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      await Promise.all([
        searchPexels(searchQuery),
        searchUnsplash(searchQuery),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const renderImageGrid = (results: ImageResult[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
      {results.map((image) => (
        <Card
          key={image.id}
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-primary relative group",
            selectedImageUrl === image.url && "ring-2 ring-primary"
          )}
          onClick={() => onSelect(image)}
        >
          <CardContent className="p-0">
            <div className="relative aspect-video">
              <img
                src={image.thumbnail}
                alt={image.alt}
                className="w-full h-full object-cover rounded-t-lg"
              />
              {selectedImageUrl === image.url && (
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
              <p className="text-xs text-muted-foreground truncate">
                Photo by{" "}
                <a
                  href={image.photographerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {image.photographer}
                  <ExternalLink className="inline h-3 w-3 ml-1" />
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Search for images (e.g., 'business meeting', 'success', 'team collaboration')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pexels" | "unsplash")}>
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
            renderImageGrid(pexelsResults)
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {loading ? "Searching Pexels..." : "Search for images to get started"}
            </div>
          )}
        </TabsContent>
        <TabsContent value="unsplash" className="mt-4">
          {unsplashResults.length > 0 ? (
            renderImageGrid(unsplashResults)
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {loading ? "Searching Unsplash..." : "Search for images to get started"}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Tip:</strong> Search for terms like "business success", "team collaboration", "growth", "leadership" for compelling hero images.
        </p>
        <p>
          Images are provided by{" "}
          <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Pexels
          </a>{" "}
          and{" "}
          <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Unsplash
          </a>
          . Attribution is automatically included.
        </p>
      </div>
    </div>
  );
}
