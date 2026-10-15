"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  Volume2,
  Image,
  MessageSquare,
  Languages,
  Camera,
  Globe,
  ArrowLeft,
  Upload,
  Link as LinkIcon,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Loader2,
  Sparkles,
  FileAudio,
  FileVideo,
  X,
  Send,
  RefreshCw,
  Wand2,
  Youtube,
  FileText,
  Table,
  FileJson,
  Eye,
} from "lucide-react";

// Tool configurations
const toolConfigs: Record<string, {
  name: string;
  description: string;
  icon: any;
  color: string;
  component: string;
}> = {
  transcription: {
    name: "Audio Transcription",
    description: "Convert audio/video files to accurate text transcripts with timestamps",
    icon: Mic,
    color: "bg-blue-500",
    component: "transcription",
  },
  tts: {
    name: "Text-to-Speech",
    description: "Transform text into natural-sounding audio with 6 unique voices",
    icon: Volume2,
    color: "bg-green-500",
    component: "tts",
  },
  "image-generation": {
    name: "Image Generation",
    description: "Create stunning images from text descriptions using DALL-E 3",
    icon: Image,
    color: "bg-purple-500",
    component: "image",
  },
  chat: {
    name: "AI Chat",
    description: "Intelligent conversational AI assistant with context awareness",
    icon: MessageSquare,
    color: "bg-orange-500",
    component: "chat",
  },
  translator: {
    name: "Spanish Translator",
    description: "Real-time Spanish to English audio translation",
    icon: Languages,
    color: "bg-red-500",
    component: "translator",
  },
  headshot: {
    name: "AI Headshot Generator",
    description: "Transform photos into professional AI-generated headshots",
    icon: Camera,
    color: "bg-pink-500",
    component: "headshot",
  },
  crawler: {
    name: "Web Crawler",
    description: "Crawl websites and extract information with AI",
    icon: Globe,
    color: "bg-cyan-500",
    component: "crawler",
  },
  "youtube-transcribe": {
    name: "YouTube Transcriber",
    description: "Extract and transcribe text from any YouTube video with timestamps",
    icon: Youtube,
    color: "bg-red-600",
    component: "youtube",
  },
  "pdf-handwriting": {
    name: "PDF Handwriting OCR",
    description: "Convert handwritten PDFs to structured JSON data with spreadsheet view",
    icon: FileText,
    color: "bg-blue-500",
    component: "pdf",
  },
};

// Voice options for TTS
const voices = [
  { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
  { id: "echo", name: "Echo", description: "Warm and conversational" },
  { id: "fable", name: "Fable", description: "Expressive and dynamic" },
  { id: "onyx", name: "Onyx", description: "Deep and authoritative" },
  { id: "nova", name: "Nova", description: "Friendly and upbeat" },
  { id: "shimmer", name: "Shimmer", description: "Clear and professional" },
];

// Headshot styles
const headshotStyles = [
  { id: "professional", name: "Professional", description: "Corporate headshot" },
  { id: "creative", name: "Creative", description: "Artistic style" },
  { id: "casual", name: "Casual", description: "Relaxed and friendly" },
  { id: "executive", name: "Executive", description: "C-suite ready" },
  { id: "linkedin", name: "LinkedIn", description: "Optimized for LinkedIn" },
  { id: "passport", name: "Passport", description: "ID photo style" },
];

export default function ToolPage() {
  const params = useParams();
  const router = useRouter();
  const toolId = params.tool as string;
  const tool = toolConfigs[toolId];

  // Shared state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Transcription state
  const [transcriptionFile, setTranscriptionFile] = useState<File | null>(null);
  const [transcriptionUrl, setTranscriptionUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TTS state
  const [ttsText, setTtsText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Image generation state
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");

  // Headshot state
  const [headshotFile, setHeadshotFile] = useState<File | null>(null);
  const [headshotStyle, setHeadshotStyle] = useState("professional");
  const [generatedHeadshot, setGeneratedHeadshot] = useState<string | null>(null);

  // Crawler state
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawlDepth, setCrawlDepth] = useState([2]);
  const [crawlResult, setCrawlResult] = useState<string | null>(null);

  // YouTube Transcriber state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeTranscript, setYoutubeTranscript] = useState("");
  const [exportFormat, setExportFormat] = useState("txt");

  // PDF Handwriting OCR state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfJsonData, setPdfJsonData] = useState<any[] | null>(null);
  const [viewMode, setViewMode] = useState<"json" | "table">("json");

  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground mb-4">Tool not found</p>
        <Button asChild>
          <Link href="/portal/adams-tools">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Adams Tools
          </Link>
        </Button>
      </div>
    );
  }

  const Icon = tool.icon;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simulate processing
  const simulateProcessing = async (duration: number = 3000) => {
    setIsProcessing(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, duration / 10);

    await new Promise((resolve) => setTimeout(resolve, duration));
    setIsProcessing(false);
    setProgress(100);
  };

  // Transcription handlers
  const handleTranscribe = async () => {
    if (!transcriptionFile && !transcriptionUrl) return;
    setIsProcessing(true);
    setProgress(10);
    
    try {
      const formData = new FormData();
      if (transcriptionFile) {
        formData.append("file", transcriptionFile);
      } else if (transcriptionUrl) {
        formData.append("url", transcriptionUrl);
      }
      
      setProgress(30);
      const response = await fetch("/api/tools/transcribe", {
        method: "POST",
        body: formData,
      });
      
      setProgress(80);
      const result = await response.json();
      
      if (result.success) {
        setTranscript(result.transcript);
      } else {
        toast.error(result.error || "Transcription failed");
      }
    } catch (error: any) {
      console.error("Transcription error:", error);
      toast.error("Transcription failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // TTS handlers
  const handleGenerateSpeech = async () => {
    if (!ttsText.trim()) return;
    setIsProcessing(true);
    setProgress(10);
    
    try {
      setProgress(30);
      const response = await fetch("/api/tools/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsText, voice: selectedVoice }),
      });
      
      setProgress(80);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } else {
        const result = await response.json();
        toast.error(result.error || "Text-to-speech failed");
      }
    } catch (error: any) {
      console.error("TTS error:", error);
      toast.error("Text-to-speech failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // Image generation handlers
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsProcessing(true);
    setProgress(10);
    
    try {
      setProgress(30);
      const response = await fetch("/api/tools/image-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt }),
      });
      
      setProgress(80);
      const result = await response.json();
      
      if (result.success) {
        setGeneratedImage(result.imageUrl);
      } else {
        toast.error(result.error || "Image generation failed");
      }
    } catch (error: any) {
      console.error("Image generation error:", error);
      toast.error("Image generation failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // Chat handlers
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput("");
    
    setIsProcessing(true);
    
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          systemPrompt: "You are a helpful AI assistant. Be concise, friendly, and helpful.",
          conversationHistory: chatMessages,
        }),
      });
      
      const result = await response.json();
      
      if (result.response) {
        setChatMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
      } else {
        // Fallback response if API fails
        setChatMessages((prev) => [...prev, { 
          role: "assistant", 
          content: `Thank you for your message! I'm an AI assistant here to help you. You asked: "${currentInput}"\n\nI can help you with a wide range of tasks including answering questions, writing content, brainstorming ideas, and much more. How can I assist you further?`
        }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I encountered an error. Please try again."
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Headshot handlers
  const handleGenerateHeadshot = async () => {
    if (!headshotFile) return;
    setIsProcessing(true);
    setProgress(10);
    
    try {
      const formData = new FormData();
      formData.append("file", headshotFile);
      formData.append("style", headshotStyle);
      
      setProgress(30);
      const response = await fetch("/api/tools/headshot", {
        method: "POST",
        body: formData,
      });
      
      setProgress(80);
      const result = await response.json();
      
      if (result.success) {
        setGeneratedHeadshot(result.imageUrl);
      } else {
        toast.error(result.error || "Headshot generation failed");
      }
    } catch (error: any) {
      console.error("Headshot error:", error);
      toast.error("Headshot generation failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // Crawler handlers
  const handleCrawl = async () => {
    if (!crawlUrl.trim()) return;
    setIsProcessing(true);
    setProgress(10);
    
    try {
      setProgress(30);
      const response = await fetch("/api/tools/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl, depth: crawlDepth[0] }),
      });
      
      setProgress(80);
      const result = await response.json();
      
      if (result.success) {
        setCrawlResult(JSON.stringify(result, null, 2));
      } else {
        toast.error(result.error || "Web crawling failed");
      }
    } catch (error: any) {
      console.error("Crawl error:", error);
      toast.error("Web crawling failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // YouTube Transcriber handlers
  const handleYoutubeTranscribe = async () => {
    if (!youtubeUrl.trim()) return;
    setIsProcessing(true);
    setProgress(10);
    
    try {
      setProgress(30);
      const response = await fetch("/api/tools/youtube-transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl, format: exportFormat }),
      });
      
      setProgress(80);
      const result = await response.json();
      
      if (result.success) {
        setYoutubeTranscript(result.transcript);
      } else {
        toast.error(result.error || result.suggestion || "YouTube transcription failed");
      }
    } catch (error: any) {
      console.error("YouTube transcription error:", error);
      toast.error("YouTube transcription failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // PDF Handwriting OCR handlers
  const handlePdfOcr = async () => {
    if (!pdfFile) return;
    setIsProcessing(true);
    setProgress(10);
    
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      
      setProgress(30);
      const response = await fetch("/api/tools/pdf-ocr", {
        method: "POST",
        body: formData,
      });
      
      setProgress(80);
      const result = await response.json();
      
      if (result.success) {
        setPdfJsonData(result.fields || []);
      } else {
        toast.error(result.error || "PDF OCR failed");
      }
    } catch (error: any) {
      console.error("PDF OCR error:", error);
      toast.error("PDF OCR failed. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/portal/adams-tools">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className={`p-3 rounded-lg ${tool.color} text-white`}>
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{tool.name}</h1>
          <p className="text-muted-foreground">{tool.description}</p>
        </div>
      </div>

      {/* Tool Content */}
      {toolId === "transcription" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload Audio/Video</CardTitle>
              <CardDescription>
                Upload a file or paste a URL to transcribe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="upload">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="url">Paste URL</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="space-y-4">
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,video/*"
                      className="hidden"
                      onChange={(e) => setTranscriptionFile(e.target.files?.[0] || null)}
                    />
                    {transcriptionFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileAudio className="h-8 w-8 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{transcriptionFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(transcriptionFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTranscriptionFile(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          MP3, WAV, M4A, FLAC, OGG, MP4 (max 500MB)
                        </p>
                      </>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="url" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Video/Audio URL</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://youtube.com/watch?v=..."
                        value={transcriptionUrl}
                        onChange={(e) => setTranscriptionUrl(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supports YouTube, Vimeo, Twitter/X, and 1000+ platforms
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleTranscribe}
                disabled={isProcessing || (!transcriptionFile && !transcriptionUrl)}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="mr-2 h-4 w-4" />
                )}
                Transcribe
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transcript</CardTitle>
                  <CardDescription>Your transcribed text will appear here</CardDescription>
                </div>
                {transcript && (
                  <Button variant="outline" size="sm" onClick={() => handleCopy(transcript)}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {transcript ? (
                <div className="bg-muted p-4 rounded-lg max-h-[400px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{transcript}</pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <FileAudio className="h-12 w-12 mb-4" />
                  <p>No transcript yet</p>
                  <p className="text-sm">Upload a file or paste a URL to get started</p>
                </div>
              )}
            </CardContent>
            {transcript && (
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Transcript
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      )}

      {toolId === "tts" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Text Input</CardTitle>
              <CardDescription>Enter the text you want to convert to speech</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Voice</Label>
                <div className="grid grid-cols-2 gap-2">
                  {voices.map((voice) => (
                    <div
                      key={voice.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedVoice === voice.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedVoice(voice.id)}
                    >
                      <p className="font-medium">{voice.name}</p>
                      <p className="text-xs text-muted-foreground">{voice.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Text to Convert</Label>
                  <span className="text-xs text-muted-foreground">
                    {ttsText.length.toLocaleString()} characters
                  </span>
                </div>
                <Textarea
                  placeholder="Enter your text here..."
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  rows={8}
                />
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Generating audio...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleGenerateSpeech}
                disabled={isProcessing || !ttsText.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Volume2 className="mr-2 h-4 w-4" />
                )}
                Generate Speech
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audio Output</CardTitle>
              <CardDescription>Listen to and download your generated audio</CardDescription>
            </CardHeader>
            <CardContent>
              {audioUrl ? (
                <div className="space-y-4">
                  <div className="bg-muted p-6 rounded-lg flex flex-col items-center">
                    <div className="w-full h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-lg mb-4 flex items-center justify-center">
                      <div className="flex gap-1">
                        {[...Array(20)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-white rounded-full animate-pulse"
                            style={{
                              height: `${Math.random() * 40 + 10}px`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline">
                        <Pause className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download MP3
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Volume2 className="h-12 w-12 mb-4" />
                  <p>No audio generated yet</p>
                  <p className="text-sm">Enter text and click Generate Speech</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {toolId === "image-generation" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Image Prompt</CardTitle>
              <CardDescription>Describe the image you want to create</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  placeholder="A serene mountain landscape at sunset with a crystal clear lake reflecting the orange sky..."
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                  + Photorealistic
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                  + Digital Art
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                  + Oil Painting
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                  + 3D Render
                </Badge>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Generating image...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={handleGenerateImage}
                disabled={isProcessing || !imagePrompt.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Image
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Image</CardTitle>
              <CardDescription>Your AI-generated image will appear here</CardDescription>
            </CardHeader>
            <CardContent>
              {generatedImage ? (
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      src={generatedImage}
                      alt="Generated"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground border-2 border-dashed rounded-lg">
                  <Image className="h-12 w-12 mb-4" />
                  <p>No image generated yet</p>
                  <p className="text-sm">Enter a prompt and click Generate</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {toolId === "chat" && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>AI Chat Assistant</CardTitle>
            <CardDescription>Have a conversation with our intelligent AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-muted/50 rounded-lg">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-4" />
                    <p>Start a conversation</p>
                    <p className="text-sm">Ask me anything!</p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-background border p-3 rounded-lg">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                />
                <Button onClick={handleSendMessage} disabled={isProcessing || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {toolId === "translator" && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Spanish to English Translator</CardTitle>
            <CardDescription>Real-time audio translation powered by AI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label>Spanish Input</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Mic className="h-12 w-12 mx-auto text-red-500 mb-4" />
                  <Button variant="outline" size="lg">
                    <Mic className="mr-2 h-4 w-4" />
                    Start Recording
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Click to start real-time translation
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <Label>English Output</Label>
                <div className="border rounded-lg p-4 min-h-[200px] bg-muted/50">
                  <p className="text-muted-foreground text-center">
                    Translation will appear here...
                  </p>
                </div>
                <Button variant="outline" className="w-full">
                  <Volume2 className="mr-2 h-4 w-4" />
                  Play Translation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {toolId === "headshot" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload Photo</CardTitle>
              <CardDescription>Upload a photo to transform into a professional headshot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => document.getElementById("headshot-input")?.click()}
              >
                <input
                  id="headshot-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setHeadshotFile(e.target.files?.[0] || null)}
                />
                {headshotFile ? (
                  <div className="flex flex-col items-center">
                    <Camera className="h-8 w-8 text-primary mb-2" />
                    <p className="font-medium">{headshotFile.name}</p>
                    <p className="text-sm text-muted-foreground">Click to change</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Click to upload your photo</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG (max 10MB)</p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Select Style</Label>
                <div className="grid grid-cols-2 gap-2">
                  {headshotStyles.map((style) => (
                    <div
                      key={style.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        headshotStyle === style.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setHeadshotStyle(style.id)}
                    >
                      <p className="font-medium">{style.name}</p>
                      <p className="text-xs text-muted-foreground">{style.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Generating headshot...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleGenerateHeadshot}
                disabled={isProcessing || !headshotFile}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Headshot
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Headshot</CardTitle>
              <CardDescription>Your professional AI headshot</CardDescription>
            </CardHeader>
            <CardContent>
              {generatedHeadshot ? (
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-lg overflow-hidden max-w-sm mx-auto">
                    <img
                      src={generatedHeadshot}
                      alt="Generated Headshot"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Headshot
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground border-2 border-dashed rounded-lg">
                  <Camera className="h-12 w-12 mb-4" />
                  <p>No headshot generated yet</p>
                  <p className="text-sm">Upload a photo and select a style</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {toolId === "crawler" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Web Crawler</CardTitle>
              <CardDescription>Enter a URL to crawl and extract content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL to Crawl</Label>
                <Input
                  placeholder="https://example.com"
                  value={crawlUrl}
                  onChange={(e) => setCrawlUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Crawl Depth</Label>
                  <span className="text-sm text-muted-foreground">{crawlDepth[0]} levels</span>
                </div>
                <Slider
                  value={crawlDepth}
                  onValueChange={setCrawlDepth}
                  min={1}
                  max={5}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Output Format</Label>
                <Select defaultValue="json">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Crawling website...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleCrawl}
                disabled={isProcessing || !crawlUrl.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="mr-2 h-4 w-4" />
                )}
                Start Crawling
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Crawl Results</CardTitle>
                  <CardDescription>Extracted content from the website</CardDescription>
                </div>
                {crawlResult && (
                  <Button variant="outline" size="sm" onClick={() => handleCopy(crawlResult)}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {crawlResult ? (
                <div className="bg-muted p-4 rounded-lg max-h-[400px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{crawlResult}</pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Globe className="h-12 w-12 mb-4" />
                  <p>No results yet</p>
                  <p className="text-sm">Enter a URL and click Start Crawling</p>
                </div>
              )}
            </CardContent>
            {crawlResult && (
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Results
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      )}

      {toolId === "youtube-transcribe" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>YouTube Video URL</CardTitle>
              <CardDescription>
                Paste a YouTube video URL to extract and transcribe the audio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>YouTube URL</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Youtube className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
                    <Input
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports youtube.com and youtu.be links
                </p>
              </div>

              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="txt">Plain Text (.txt)</SelectItem>
                    <SelectItem value="srt">SubRip Subtitle (.srt)</SelectItem>
                    <SelectItem value="vtt">WebVTT (.vtt)</SelectItem>
                    <SelectItem value="json">JSON (.json)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Transcribing video...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={handleYoutubeTranscribe}
                disabled={isProcessing || !youtubeUrl.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Youtube className="mr-2 h-4 w-4" />
                )}
                Transcribe Video
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transcript</CardTitle>
                  <CardDescription>Extracted text from the video</CardDescription>
                </div>
                {youtubeTranscript && (
                  <Button variant="outline" size="sm" onClick={() => handleCopy(youtubeTranscript)}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {youtubeTranscript ? (
                <div className="bg-muted p-4 rounded-lg max-h-[400px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{youtubeTranscript}</pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Youtube className="h-12 w-12 mb-4 text-red-500" />
                  <p>No transcript yet</p>
                  <p className="text-sm">Paste a YouTube URL to get started</p>
                </div>
              )}
            </CardContent>
            {youtubeTranscript && (
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download .{exportFormat}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      )}

      {toolId === "pdf-handwriting" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>
                Upload a PDF with handwritten content to extract data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => document.getElementById("pdf-input")?.click()}
              >
                <input
                  id="pdf-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                />
                {pdfFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium">{pdfFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFile(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF files with handwritten content (max 50MB)
                    </p>
                  </>
                )}
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Supported Content Types
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Handwritten forms and applications</li>
                  <li>• Signed documents and contracts</li>
                  <li>• Handwritten notes and letters</li>
                  <li>• Filled-in questionnaires</li>
                </ul>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing PDF...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <Button
                className="w-full bg-blue-500 hover:bg-blue-600"
                onClick={handlePdfOcr}
                disabled={isProcessing || !pdfFile}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Extract Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Extracted Data</CardTitle>
                  <CardDescription>Handwriting converted to structured data</CardDescription>
                </div>
                {pdfJsonData && (
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "json" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("json")}
                    >
                      <FileJson className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "table" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("table")}
                    >
                      <Table className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {pdfJsonData ? (
                viewMode === "json" ? (
                  <div className="bg-muted p-4 rounded-lg max-h-[400px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {JSON.stringify(pdfJsonData, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">Field</th>
                            <th className="px-4 py-2 text-left font-medium">Value</th>
                            <th className="px-4 py-2 text-left font-medium">Confidence</th>
                            <th className="px-4 py-2 text-left font-medium">Page</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pdfJsonData.map((row) => (
                            <tr key={row.id} className="border-t">
                              <td className="px-4 py-2 font-medium">{row.field}</td>
                              <td className="px-4 py-2">{row.value}</td>
                              <td className="px-4 py-2">
                                <Badge 
                                  variant={row.confidence >= 0.9 ? "default" : row.confidence >= 0.8 ? "secondary" : "outline"}
                                  className={row.confidence >= 0.9 ? "bg-green-500" : row.confidence >= 0.8 ? "bg-sky-500" : ""}
                                >
                                  {(row.confidence * 100).toFixed(0)}%
                                </Badge>
                              </td>
                              <td className="px-4 py-2">{row.page}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 text-blue-500" />
                  <p>No data extracted yet</p>
                  <p className="text-sm">Upload a PDF to get started</p>
                </div>
              )}
            </CardContent>
            {pdfJsonData && (
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download JSON
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
