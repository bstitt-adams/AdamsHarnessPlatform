"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mic,
  Volume2,
  Image,
  MessageSquare,
  Languages,
  Camera,
  Globe,
  Sparkles,
  Check,
  Zap,
  Crown,
  Building2,
  Play,
  ArrowRight,
  TrendingUp,
  Clock,
  CreditCard,
  Youtube,
  FileText,
  Brain,
  DollarSign,
} from "lucide-react";

// Tool definitions based on the AI Media Suite
const tools = [
  {
    id: "transcription",
    name: "Audio Transcription",
    description: "Convert audio/video files to accurate text transcripts with timestamps",
    icon: Mic,
    color: "bg-blue-500",
    price: "$0.10/minute",
    purchasePrice: "$29",
    features: [
      "MP3, WAV, M4A, FLAC, OGG, MP4 support",
      "YouTube, Vimeo, Twitter/X URL support",
      "Large file chunking (>20MB)",
      "Timestamped transcripts",
      "Powered by OpenAI Whisper",
    ],
    usageThisMonth: 45,
    usageLimit: 120,
    unit: "minutes",
  },
  {
    id: "tts",
    name: "Text-to-Speech",
    description: "Transform text into natural-sounding audio with 6 unique voices",
    icon: Volume2,
    color: "bg-green-500",
    price: "$0.05/1000 chars",
    purchasePrice: "$19",
    features: [
      "6 unique voices (Alloy, Echo, Fable, Onyx, Nova, Shimmer)",
      "Voice preview functionality",
      "Text file upload support",
      "High-quality MP3 output",
      "Powered by OpenAI TTS",
    ],
    usageThisMonth: 35000,
    usageLimit: 100000,
    unit: "characters",
  },
  {
    id: "image-generation",
    name: "Image Generation",
    description: "Create stunning images from text descriptions using DALL-E 3",
    icon: Image,
    color: "bg-purple-500",
    price: "$0.04/image",
    purchasePrice: "$24",
    features: [
      "Text prompt to image",
      "High resolution (1024x1024)",
      "Instant generation",
      "Download capability",
      "Powered by DALL-E 3",
    ],
    usageThisMonth: 28,
    usageLimit: 100,
    unit: "images",
  },
  {
    id: "chat",
    name: "AI Chat",
    description: "Intelligent conversational AI assistant with context awareness",
    icon: MessageSquare,
    color: "bg-orange-500",
    price: "$0.002/1000 tokens",
    purchasePrice: "$14",
    features: [
      "Natural language conversations",
      "Context-aware responses",
      "Multi-turn dialogue",
      "Instant responses",
      "Powered by GPT-4",
    ],
    usageThisMonth: null,
    usageLimit: null,
    unit: "messages",
    unlimited: true,
  },
  {
    id: "translator",
    name: "Spanish Translator",
    description: "Real-time Spanish to English audio translation",
    icon: Languages,
    color: "bg-red-500",
    price: "$0.15/minute",
    purchasePrice: "$34",
    features: [
      "Real-time audio translation",
      "Text display mode",
      "Voice playback mode",
      "High accuracy",
      "Powered by Whisper + GPT",
    ],
    usageThisMonth: 12,
    usageLimit: 60,
    unit: "minutes",
  },
  {
    id: "headshot",
    name: "AI Headshot Generator",
    description: "Transform photos into professional AI-generated headshots",
    icon: Camera,
    color: "bg-pink-500",
    price: "$0.08/headshot",
    purchasePrice: "$19",
    features: [
      "6 professional styles",
      "High resolution output",
      "Photo upload and processing",
      "Instant generation",
      "AI-enhanced quality",
    ],
    usageThisMonth: 8,
    usageLimit: 50,
    unit: "headshots",
  },
  {
    id: "crawler",
    name: "Web Crawler",
    description: "Crawl websites and extract information with AI",
    icon: Globe,
    color: "bg-cyan-500",
    price: "$0.02/page",
    purchasePrice: "$24",
    features: [
      "URL-based crawling",
      "AI-powered extraction",
      "JavaScript rendering",
      "Structured output (JSON, CSV)",
      "Crawl depth configuration",
    ],
    usageThisMonth: 150,
    usageLimit: 500,
    unit: "pages",
  },
  {
    id: "youtube-transcribe",
    name: "YouTube Transcriber",
    description: "Extract and transcribe text from any YouTube video with timestamps",
    icon: Youtube,
    color: "bg-red-600",
    price: "$0.05/video",
    purchasePrice: "$19",
    features: [
      "Paste any YouTube URL",
      "Auto-detect video language",
      "Timestamped transcripts",
      "Export to TXT, SRT, VTT",
      "Powered by Whisper AI",
    ],
    usageThisMonth: 22,
    usageLimit: 100,
    unit: "videos",
  },
  {
    id: "pdf-handwriting",
    name: "PDF Handwriting OCR",
    description: "Convert handwritten PDFs to structured JSON data with spreadsheet view",
    icon: FileText,
    color: "bg-blue-500",
    price: "$0.10/page",
    purchasePrice: "$29",
    features: [
      "Handwriting recognition (OCR)",
      "Form field extraction",
      "JSON data output",
      "Spreadsheet view & export",
      "Batch PDF processing",
    ],
    usageThisMonth: 35,
    usageLimit: 200,
    unit: "pages",
  },
];

// Subscription tiers
const subscriptionTiers = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Get started with limited access",
    icon: Zap,
    features: [
      "10 minutes transcription/month",
      "5,000 TTS characters/month",
      "5 images/month",
      "50 chat messages/month",
      "Watermarked outputs",
    ],
    cta: "Current Plan",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "Full access for professionals",
    icon: Crown,
    features: [
      "120 minutes transcription/month",
      "100,000 TTS characters/month",
      "100 images/month",
      "Unlimited chat",
      "No watermarks",
      "Priority processing",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$49",
    period: "/month",
    description: "For teams and enterprises",
    icon: Building2,
    features: [
      "500 minutes transcription/month",
      "500,000 TTS characters/month",
      "500 images/month",
      "API access",
      "Team collaboration (5 seats)",
      "Custom branding",
      "Priority support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function AdamsToolsPage() {
  const [activeTab, setActiveTab] = useState("tools");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-8 w-8 text-purple-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Adams Tools
            </h1>
          </div>
          <p className="text-muted-foreground">
            Powerful AI tools to enhance your productivity and creativity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Subscription
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Pro
          </Button>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">Pro</div>
            <p className="text-xs text-muted-foreground">Renews Jan 17, 2025</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,250</div>
            <p className="text-xs text-muted-foreground">~$12.50 value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tools Used Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              5
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground">+2 from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              <Clock className="h-5 w-5 text-blue-500" />
              2.3s
            </div>
            <p className="text-xs text-muted-foreground">Avg. response time</p>
          </CardContent>
        </Card>
      </div>

      {/* Business Planning Tools Section */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Business Planning Tools
                </CardTitle>
                <CardDescription>
                  AI-facilitated strategic planning with Mary, your Adams Business Analyst
                </CardDescription>
              </div>
            </div>
            <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Link href="/portal/adams-tools/business-planning">
                <Sparkles className="mr-2 h-4 w-4" />
                Open Planning Tools
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
              <Crown className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium text-sm">C-Suite Planning</p>
                <p className="text-xs text-muted-foreground">CEO, COO, CRO, CTO tools</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-sm">Finance Planning</p>
                <p className="text-xs text-muted-foreground">FP&A, Treasury, Controller tools</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tools">AI Tools</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="history">Usage History</TabsTrigger>
        </TabsList>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const usagePercent = tool.usageLimit 
                ? Math.round((tool.usageThisMonth! / tool.usageLimit) * 100)
                : 0;
              
              return (
                <Card key={tool.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${tool.color} text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary">{tool.price}</Badge>
                    </div>
                    <CardTitle className="mt-3">{tool.name}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Features */}
                    <div className="space-y-1">
                      {tool.features.slice(0, 3).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-3 w-3 text-green-500" />
                          <span className="truncate">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Usage */}
                    {!tool.unlimited && tool.usageLimit && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Usage this month</span>
                          <span className="font-medium">
                            {tool.usageThisMonth?.toLocaleString()} / {tool.usageLimit.toLocaleString()} {tool.unit}
                          </span>
                        </div>
                        <Progress value={usagePercent} className="h-2" />
                      </div>
                    )}
                    {tool.unlimited && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        <span>Unlimited usage</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button className="w-full" asChild>
                      <Link href={`/portal/adams-tools/${tool.id}`}>
                        <Play className="mr-2 h-4 w-4" />
                        Launch Tool
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
            <p className="text-muted-foreground">
              Get access to all AI tools with our flexible pricing options
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {subscriptionTiers.map((tier) => {
              const Icon = tier.icon;
              return (
                <Card 
                  key={tier.name} 
                  className={`relative overflow-hidden ${
                    tier.highlighted 
                      ? "border-purple-500 border-2 shadow-lg" 
                      : ""
                  }`}
                >
                  {tier.highlighted && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-3 py-1 rounded-bl-lg">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${tier.highlighted ? "bg-purple-100" : "bg-muted"}`}>
                        <Icon className={`h-5 w-5 ${tier.highlighted ? "text-purple-600" : "text-muted-foreground"}`} />
                      </div>
                      <CardTitle>{tier.name}</CardTitle>
                    </div>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      <span className="text-muted-foreground">{tier.period}</span>
                    </div>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className={`h-4 w-4 ${tier.highlighted ? "text-purple-600" : "text-green-500"}`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full ${
                        tier.highlighted 
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                          : ""
                      }`}
                      variant={tier.highlighted ? "default" : "outline"}
                    >
                      {tier.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Individual Tool Purchases */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Or Purchase Individual Tools</CardTitle>
              <CardDescription>
                Buy lifetime access to specific tools without a subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div 
                      key={tool.id}
                      className="flex flex-col items-center p-4 border rounded-lg hover:border-purple-500 transition-colors cursor-pointer"
                    >
                      <div className={`p-2 rounded-lg ${tool.color} text-white mb-2`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium text-center">{tool.name}</span>
                      <span className="text-lg font-bold text-purple-600">{tool.purchasePrice}</span>
                      <span className="text-xs text-muted-foreground">Lifetime</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your tool usage over the past 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { tool: "Audio Transcription", action: "Transcribed 15 min video", time: "2 hours ago", cost: "$1.50" },
                  { tool: "Image Generation", action: "Generated 3 images", time: "5 hours ago", cost: "$0.12" },
                  { tool: "AI Chat", action: "45 messages exchanged", time: "Yesterday", cost: "$0.09" },
                  { tool: "Text-to-Speech", action: "Converted 5,000 characters", time: "2 days ago", cost: "$0.25" },
                  { tool: "Web Crawler", action: "Crawled 25 pages", time: "3 days ago", cost: "$0.50" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium">{item.tool}</p>
                      <p className="text-sm text-muted-foreground">{item.action}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.cost}</p>
                      <p className="text-sm text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
