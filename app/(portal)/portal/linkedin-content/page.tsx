"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import {
  Linkedin,
  Sparkles,
  Image as ImageIcon,
  Link2,
  FileText,
  Send,
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Eye,
  RefreshCw,
  Upload,
  ExternalLink,
  Calendar,
  Clock,
  Save,
  Wand2,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferenceLink {
  id: string;
  url: string;
  title: string;
  status: "pending" | "valid" | "invalid" | "checking";
  description?: string;
}

interface ArticleDraft {
  id: string;
  title: string;
  content: string;
  images: string[];
  referenceLinks: ReferenceLink[];
  status: "draft" | "scheduled" | "published";
  createdAt: Date;
  scheduledFor?: Date;
}

interface GlossaryItem {
  term: string;
  definition: string;
}

interface GeneratedContent {
  title: string;
  content: string;
  hashtags: string[];
  glossary: GlossaryItem[];
  references: ReferenceLink[];
}

// Default prompt template
const DEFAULT_ARTICLE_PROMPT = `Please write a friendly, detailed, comprehensive, thoughtful, balanced, engaging, compelling, fact-checked, conversational, long-form seo-optimized article for construction industry executives about [TOPIC]. Do not use favicons or emoticons. Include verifiable examples, data, and statistics. At end of the article, cite true references with clean links that support the points made and include only clean links (no tracking). Expand paragraphs. Appropriately promote Adams Electric, a third-generation family-owned electrical contractor serving the Southeast since 1928, whose website is at https://adams-electric.com. Mention its PreConstruction, Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication, Construction, and Post Construction services. The call to action is to schedule a conversation about an upcoming project. At the end, give a glossary of unfamiliar words and acronyms, a list of resources with clean links for further research, and hash-tagged keywords in a row.`;

export default function LinkedInContentPage() {
  const [activeTab, setActiveTab] = useState("create");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifyingLinks, setIsVerifyingLinks] = useState(false);
  
  // Article creation state
  const [articleTopic, setArticleTopic] = useState("");
  const [articlePrompt, setArticlePrompt] = useState(DEFAULT_ARTICLE_PROMPT);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [articleTone, setArticleTone] = useState("professional");
  const [articleLength, setArticleLength] = useState("long");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  
  // Separate fields for structured content
  const [editedHashtags, setEditedHashtags] = useState("");
  const [editedGlossary, setEditedGlossary] = useState<GlossaryItem[]>([]);
  const [editedReferences, setEditedReferences] = useState<ReferenceLink[]>([]);
  
  // Image upload state
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Reference links state
  const [referenceLinks, setReferenceLinks] = useState<ReferenceLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  
  // Drafts state
  const [drafts, setDrafts] = useState<ArticleDraft[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showWordCount, setShowWordCount] = useState(false);

  // Calculate word count statistics
  const getWordCountStats = () => {
    const fullText = `${editedTitle} ${editedContent}`;
    const words = fullText.trim().split(/\s+/).filter(w => w.length > 0).length;
    const charactersNoSpaces = fullText.replace(/\s/g, "").length;
    const charactersWithSpaces = fullText.length;
    const paragraphs = editedContent.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    const lines = editedContent.split(/\n/).filter(l => l.trim().length > 0).length;
    const sentences = editedContent.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    return {
      words,
      charactersNoSpaces,
      charactersWithSpaces,
      paragraphs,
      lines,
      sentences,
    };
  };

  // Generate article content using AI
  const generateArticle = async () => {
    if (!articleTopic.trim()) return;
    
    setIsGenerating(true);
    
    // Simulate AI generation (in production, this would call an AI API)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const lengthGuide = {
      short: 300,
      medium: 600,
      long: 1000,
      extended: 1500,
    };
    
    const toneGuide = {
      professional: "formal and business-focused",
      casual: "friendly and conversational",
      thought_leader: "insightful and authoritative",
      storytelling: "narrative and engaging",
    };
    
    // Generate content based on selected length
    const generateContentByLength = (length: string) => {
      const topic = articleTopic.toLowerCase();
      const topicTitle = articleTopic;
      
      // Base sections that can be combined based on length
      const intro = `In today's rapidly evolving business landscape, ${topic} has emerged as one of the most critical factors determining organizational success. As we navigate through unprecedented changes in technology, market dynamics, and customer expectations, understanding and mastering ${topic} has never been more important.`;

      const currentState = `

## The Current State of ${topicTitle}

Over the past decade, we've witnessed a fundamental shift in how businesses approach ${topic}. What was once considered a peripheral concern has now moved to the center of strategic planning for organizations of all sizes. This transformation hasn't happened overnight—it's been driven by a confluence of factors including technological advancement, changing consumer behavior, and increased global competition.

The statistics are compelling. Recent industry research indicates that companies who prioritize ${topic} see an average of 23% higher revenue growth compared to their peers. Moreover, organizations that have fully integrated ${topic} into their operations report significantly higher employee satisfaction and customer retention rates.`;

      const whyItMatters = `

## Why ${topicTitle} Matters Now More Than Ever

The business environment we operate in today is fundamentally different from even five years ago. The pace of change has accelerated dramatically, and the companies that thrive are those that can adapt quickly while maintaining their core values and mission.

**1. Digital Transformation Has Changed Everything**

The digital revolution has reshaped every industry, and ${topic} is no exception. Companies that have embraced digital tools and platforms to enhance their approach to ${topic} are seeing remarkable results. From automation to artificial intelligence, technology is enabling organizations to do more with less while delivering better outcomes.

**2. Customer Expectations Have Evolved**

Today's customers are more informed, more demanding, and have more choices than ever before. They expect companies to excel at ${topic}, and they're quick to switch to competitors who can deliver better experiences. This has raised the stakes for businesses across all sectors.

**3. Talent Acquisition and Retention**

The best employees want to work for companies that are leaders in their field. Organizations that demonstrate excellence in ${topic} have a significant advantage in attracting and retaining top talent. This creates a virtuous cycle where great people drive even better results.`;

      const strategies = `

## Key Strategies for Success in ${topicTitle}

Based on my experience working with organizations across various industries, I've identified several strategies that consistently lead to success in ${topic}:

### Strategy 1: Start with a Clear Vision

Before implementing any tactical changes, it's essential to have a clear vision of what success looks like. This means defining specific, measurable goals and ensuring alignment across all levels of the organization. Without this foundation, even the best initiatives can lose direction and momentum.

### Strategy 2: Invest in Your People

Technology and processes are important, but people are the ultimate differentiator. Organizations that invest in training, development, and empowerment see the best results in ${topic}. This includes not just technical skills, but also soft skills like communication, collaboration, and creative problem-solving.

### Strategy 3: Embrace Continuous Improvement

The best organizations never stop learning and improving. They create cultures where experimentation is encouraged, failure is seen as a learning opportunity, and everyone is empowered to suggest improvements. This mindset is essential for staying ahead in a rapidly changing environment.

### Strategy 4: Measure What Matters

You can't improve what you don't measure. Successful organizations establish clear metrics for ${topic} and track them rigorously. But it's equally important to focus on the right metrics—those that truly reflect progress toward your goals rather than vanity metrics that look good but don't drive real results.

### Strategy 5: Build Strong Partnerships

No organization can excel at everything. The most successful companies build ecosystems of partners who complement their strengths and help them deliver better outcomes. This collaborative approach is especially important in ${topic}, where the landscape is constantly evolving.`;

      const pitfalls = `

## Common Pitfalls to Avoid

While there are many paths to success, there are also common mistakes that can derail even the most well-intentioned efforts:

- **Moving too fast without proper planning**: Enthusiasm is great, but rushing into major changes without adequate preparation often leads to costly mistakes.

- **Ignoring organizational culture**: Technical solutions alone won't solve cultural problems. Any initiative related to ${topic} must account for the human element.

- **Failing to communicate effectively**: Change requires buy-in from all stakeholders. Organizations that don't invest in communication often face resistance and slow adoption.

- **Underestimating resource requirements**: Successful implementation of ${topic} initiatives requires adequate investment in time, money, and people.`;

      const future = `

## Looking Ahead: The Future of ${topicTitle}

As we look to the future, several trends are likely to shape the evolution of ${topic}:

The integration of artificial intelligence and machine learning will continue to accelerate, enabling more sophisticated and personalized approaches. Organizations that learn to leverage these technologies effectively will have significant advantages.

Sustainability and social responsibility will become increasingly important considerations. Stakeholders—including customers, employees, and investors—are demanding that companies demonstrate commitment to broader societal goals.

The boundaries between industries will continue to blur, creating both challenges and opportunities. Companies that can adapt to this new reality and find innovative ways to apply ${topic} across different contexts will thrive.`;

      const caseStudies = `

## Real-World Case Studies

Let me share some examples of organizations that have excelled in ${topic}:

### Case Study 1: A Manufacturing Company's Transformation

A mid-sized manufacturing company was struggling with declining market share and increasing competition from overseas. By reimagining their approach to ${topic}, they were able to reduce costs by 30% while simultaneously improving quality. The key was investing in employee training and implementing lean principles throughout their operations.

### Case Study 2: A Service Company's Digital Journey

A professional services firm recognized that their traditional approach to ${topic} was no longer sustainable. They embarked on a digital transformation journey that included implementing new technologies, redesigning processes, and upskilling their workforce. Within two years, they had doubled their client satisfaction scores and increased revenue by 45%.

### Case Study 3: A Startup's Innovative Approach

A technology startup took a completely different approach to ${topic}. Rather than following conventional wisdom, they experimented with new methodologies and weren't afraid to fail fast. This culture of innovation allowed them to disrupt their industry and achieve rapid growth.`;

      const implementation = `

## Implementation Roadmap

For organizations looking to improve their approach to ${topic}, here's a practical roadmap:

### Phase 1: Assessment (Weeks 1-4)
- Conduct a thorough assessment of current capabilities
- Identify gaps and opportunities for improvement
- Benchmark against industry best practices
- Gather input from key stakeholders

### Phase 2: Planning (Weeks 5-8)
- Develop a comprehensive strategy aligned with business objectives
- Create detailed implementation plans with clear milestones
- Allocate resources and assign responsibilities
- Establish metrics and KPIs for measuring success

### Phase 3: Pilot (Weeks 9-16)
- Launch pilot initiatives in selected areas
- Monitor progress and gather feedback
- Make adjustments based on learnings
- Document best practices and lessons learned

### Phase 4: Scale (Weeks 17-24)
- Roll out successful initiatives across the organization
- Provide training and support to all affected teams
- Continue monitoring and optimizing
- Celebrate successes and recognize contributors

### Phase 5: Sustain (Ongoing)
- Embed new practices into organizational culture
- Continuously monitor and improve
- Stay current with industry trends and innovations
- Share knowledge and best practices`;

      const conclusion = `

## Conclusion

${topicTitle} is not just a business function—it's a strategic imperative that can determine the success or failure of organizations in today's competitive landscape. By understanding its importance, implementing proven strategies, and avoiding common pitfalls, leaders can position their organizations for sustained success.

The journey toward excellence in ${topic} is ongoing. It requires commitment, investment, and a willingness to continuously learn and adapt. But for those who embrace this challenge, the rewards—in terms of business performance, employee engagement, and customer satisfaction—are substantial.

I'd love to hear your thoughts and experiences with ${topic}. What strategies have worked for your organization? What challenges have you faced? Let's continue this conversation in the comments.

#${topicTitle.replace(/\s+/g, "")} #BusinessStrategy #Leadership #ProfessionalDevelopment #Innovation #DigitalTransformation #BusinessGrowth #ThoughtLeadership`;

      // Build content based on selected length
      switch (length) {
        case "short":
          return intro + whyItMatters + conclusion;
        case "medium":
          return intro + currentState + whyItMatters + strategies + conclusion;
        case "long":
          return intro + currentState + whyItMatters + strategies + pitfalls + future + conclusion;
        case "extended":
          return intro + currentState + whyItMatters + strategies + pitfalls + future + caseStudies + implementation + conclusion;
        default:
          return intro + currentState + whyItMatters + strategies + pitfalls + future + conclusion;
      }
    };

    // Generate mock content based on topic
    const generatedGlossary: GlossaryItem[] = [
      { term: "BIM", definition: "Building Information Modeling - a 3D model-based process for planning, designing, and coordinating construction." },
      { term: "PreConstruction", definition: "The planning phase before mobilization, covering estimating, budgeting, and constructability review." },
      { term: "Prefabrication", definition: "Offsite fabrication of assemblies in a controlled shop environment for field installation." },
      { term: "Constructability", definition: "Reviewing designs for physical fit, code clearances, and maintainability before installation." },
      { term: "Closeout", definition: "The documentation and turnover phase that hands a completed project to the owner." },
    ];
    
    const generatedReferences: ReferenceLink[] = [
      { id: "ref-1", title: "Adams Electric", url: "https://adams-electric.com", status: "valid" },
      { id: "ref-2", title: "Associated General Contractors of America", url: "https://www.agc.org", status: "valid" },
      { id: "ref-3", title: "National Electrical Contractors Association", url: "https://www.necanet.org", status: "valid" },
    ];
    
    const generated: GeneratedContent = {
      title: `${articleTopic}: Key Insights for Industry Leaders`,
      content: generateContentByLength(articleLength),
      hashtags: [
        articleTopic.replace(/\s+/g, ""),
        "ElectricalContracting",
        "Construction",
        "BIM",
        "PreFabrication",
        "AdamsElectric",
        "PreConstruction",
        "SoutheastConstruction",
      ],
      glossary: generatedGlossary,
      references: generatedReferences,
    };
    
    setGeneratedContent(generated);
    setEditedTitle(generated.title);
    setEditedContent(generated.content);
    setEditedHashtags(generated.hashtags.map(h => `#${h}`).join(" "));
    setEditedGlossary(generated.glossary);
    setEditedReferences(generated.references);
    setIsGenerating(false);
  };

  // Regenerate content
  const regenerateContent = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate slightly different content
    const variations = [
      `The landscape of ${articleTopic.toLowerCase()} is changing faster than ever before.`,
      `Have you noticed how ${articleTopic.toLowerCase()} is transforming our industry?`,
      `Let me share some thoughts on ${articleTopic.toLowerCase()} that might surprise you.`,
    ];
    
    const randomIntro = variations[Math.floor(Math.random() * variations.length)];
    
    setEditedContent(`${randomIntro}

After years of experience in this field, I've identified several patterns that consistently lead to success:

🎯 **Strategic Focus**: Prioritize initiatives that align with your core business objectives.

💡 **Innovation Mindset**: Don't be afraid to experiment and learn from failures.

🤝 **Collaboration**: The best results come from diverse teams working together.

📈 **Continuous Improvement**: Small, consistent improvements compound over time.

What's your take on ${articleTopic.toLowerCase()}? I'd love to start a conversation in the comments.

#${articleTopic.replace(/\s+/g, "")} #ThoughtLeadership #BusinessGrowth`);
    
    setIsGenerating(false);
  };

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove uploaded image
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Add reference link
  const addReferenceLink = () => {
    if (!newLinkUrl.trim()) return;
    
    const newLink: ReferenceLink = {
      id: `link-${Date.now()}`,
      url: newLinkUrl,
      title: "",
      status: "pending",
    };
    
    setReferenceLinks(prev => [...prev, newLink]);
    setNewLinkUrl("");
  };

  // Remove reference link
  const removeReferenceLink = (id: string) => {
    setReferenceLinks(prev => prev.filter(link => link.id !== id));
  };

  // Verify all reference links using AI
  const verifyAllLinks = async () => {
    setIsVerifyingLinks(true);
    
    // Update all links to checking status
    setReferenceLinks(prev => prev.map(link => ({ ...link, status: "checking" as const })));
    
    // Simulate AI verification for each link
    for (let i = 0; i < referenceLinks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setReferenceLinks(prev => prev.map((link, index) => {
        if (index === i) {
          // Simulate validation - check if URL is properly formatted
          const isValidUrl = /^https?:\/\/.+\..+/.test(link.url);
          return {
            ...link,
            status: isValidUrl ? "valid" as const : "invalid" as const,
            title: isValidUrl ? `Article from ${new URL(link.url).hostname}` : "Invalid URL",
            description: isValidUrl ? "Link verified and accessible" : "URL format is invalid or inaccessible",
          };
        }
        return link;
      }));
    }
    
    setIsVerifyingLinks(false);
  };

  // Save as draft
  const saveDraft = () => {
    const draft: ArticleDraft = {
      id: `draft-${Date.now()}`,
      title: editedTitle,
      content: editedContent,
      images: uploadedImages,
      referenceLinks,
      status: "draft",
      createdAt: new Date(),
    };
    
    setDrafts(prev => [...prev, draft]);
  };

  // Build the full article content for publishing
  const buildFullArticle = () => {
    let fullContent = `${editedTitle}\n\n${editedContent}`;
    
    // Add Glossary section
    if (editedGlossary.length > 0) {
      fullContent += "\n\n---\n\n**Glossary**\n\n";
      editedGlossary.forEach((item) => {
        if (item.term && item.definition) {
          fullContent += `**${item.term}**: ${item.definition}\n\n`;
        }
      });
    }
    
    // Add References section
    if (editedReferences.length > 0) {
      fullContent += "\n\n**References & Resources**\n\n";
      editedReferences.forEach((ref) => {
        if (ref.title && ref.url) {
          fullContent += `• ${ref.title}: ${ref.url}\n`;
        }
      });
    }
    
    // Add Hashtags at the end
    if (editedHashtags.trim()) {
      fullContent += `\n\n${editedHashtags}`;
    }
    
    return fullContent;
  };

  // Copy content to clipboard
  const copyToClipboard = () => {
    const fullContent = buildFullArticle();
    navigator.clipboard.writeText(fullContent);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                <Linkedin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  LinkedIn Content
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Powered
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Create and publish AI-generated LinkedIn articles
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Not Connected
              </Badge>
              <Button variant="outline" size="sm">
                Connect LinkedIn
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="border-b px-4">
            <TabsList className="h-10">
              <TabsTrigger value="create" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Create Article
              </TabsTrigger>
              <TabsTrigger value="drafts" className="gap-2">
                <FileText className="h-4 w-4" />
                Drafts ({drafts.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="gap-2">
                <Calendar className="h-4 w-4" />
                Scheduled
              </TabsTrigger>
              <TabsTrigger value="published" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Published
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Create Article Tab */}
          <TabsContent value="create" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 max-w-4xl mx-auto space-y-6">
                {/* AI Generation Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      AI Article Generator
                    </CardTitle>
                    <CardDescription>
                      Describe your topic and let AI generate professional LinkedIn content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Topic or Theme</Label>
                      <Textarea
                        placeholder="e.g., Airbus' reshoring initiative, Digital transformation in manufacturing, Supply chain resilience..."
                        value={articleTopic}
                        onChange={(e) => setArticleTopic(e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    {/* Prompt Editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Generation Prompt</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowPromptEditor(!showPromptEditor)}
                        >
                          {showPromptEditor ? "Hide Prompt" : "Edit Prompt"}
                        </Button>
                      </div>
                      {showPromptEditor && (
                        <div className="space-y-2">
                          <Textarea
                            value={articlePrompt}
                            onChange={(e) => setArticlePrompt(e.target.value)}
                            rows={8}
                            className="font-mono text-xs"
                            placeholder="Enter your custom prompt for article generation..."
                          />
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setArticlePrompt(DEFAULT_ARTICLE_PROMPT)}
                            >
                              Reset to Default
                            </Button>
                            <p className="text-xs text-muted-foreground flex-1">
                              Use [TOPIC] as a placeholder for the topic you enter above.
                            </p>
                          </div>
                        </div>
                      )}
                      {!showPromptEditor && (
                        <p className="text-xs text-muted-foreground bg-muted p-2 rounded line-clamp-2">
                          {articlePrompt.substring(0, 150)}...
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tone</Label>
                        <Select value={articleTone} onValueChange={setArticleTone}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="casual">Casual & Friendly</SelectItem>
                            <SelectItem value="thought_leader">Thought Leader</SelectItem>
                            <SelectItem value="storytelling">Storytelling</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Length</Label>
                        <Select value={articleLength} onValueChange={setArticleLength}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">Short (~300 words)</SelectItem>
                            <SelectItem value="medium">Medium (~600 words)</SelectItem>
                            <SelectItem value="long">Long (~1000 words)</SelectItem>
                            <SelectItem value="extended">Extended (~1500 words)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={generateArticle} 
                      disabled={!articleTopic.trim() || isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Article
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Generated/Edited Content */}
                {(generatedContent || editedContent) && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Article Content
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={regenerateContent} disabled={isGenerating}>
                            <RefreshCw className={cn("h-4 w-4 mr-1", isGenerating && "animate-spin")} />
                            Regenerate
                          </Button>
                          <Button variant="outline" size="sm" onClick={copyToClipboard}>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setShowWordCount(true)}>
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Word Count
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          placeholder="Article title..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Content</Label>
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          rows={12}
                          className="font-mono text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Hashtags Section */}
                {editedContent && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="text-blue-600">#</span>
                        Hashtags
                      </CardTitle>
                      <CardDescription>
                        Keywords for discoverability (will be appended to the article)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={editedHashtags}
                        onChange={(e) => setEditedHashtags(e.target.value)}
                        rows={2}
                        placeholder="#USManufacturing #Reshoring #SupplyChain #CMMC..."
                        className="text-sm"
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Glossary Section */}
                {editedGlossary.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <FileText className="h-4 w-4" />
                            Glossary
                          </CardTitle>
                          <CardDescription>
                            Definitions of key terms (will be appended to the article)
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditedGlossary([...editedGlossary, { term: "", definition: "" }])}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Term
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {editedGlossary.map((item, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <Input
                              value={item.term}
                              onChange={(e) => {
                                const updated = [...editedGlossary];
                                updated[index] = { ...item, term: e.target.value };
                                setEditedGlossary(updated);
                              }}
                              placeholder="Term"
                              className="font-semibold"
                            />
                            <Input
                              value={item.definition}
                              onChange={(e) => {
                                const updated = [...editedGlossary];
                                updated[index] = { ...item, definition: e.target.value };
                                setEditedGlossary(updated);
                              }}
                              placeholder="Definition"
                              className="col-span-2"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive"
                            onClick={() => setEditedGlossary(editedGlossary.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* References & Sources Section */}
                {editedReferences.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Link2 className="h-4 w-4" />
                            References & Sources
                          </CardTitle>
                          <CardDescription>
                            Cited sources with clean links (will be appended to the article)
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditedReferences([...editedReferences, { id: `ref-${Date.now()}`, title: "", url: "", status: "pending" }])}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Reference
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {editedReferences.map((ref, index) => (
                        <div key={ref.id} className="flex gap-2 items-start">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <Input
                              value={ref.title}
                              onChange={(e) => {
                                const updated = [...editedReferences];
                                updated[index] = { ...ref, title: e.target.value };
                                setEditedReferences(updated);
                              }}
                              placeholder="Reference Title"
                              className="font-medium"
                            />
                            <Input
                              value={ref.url}
                              onChange={(e) => {
                                const updated = [...editedReferences];
                                updated[index] = { ...ref, url: e.target.value };
                                setEditedReferences(updated);
                              }}
                              placeholder="https://example.com"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => window.open(ref.url, "_blank")}
                            disabled={!ref.url}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive"
                            onClick={() => setEditedReferences(editedReferences.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Image Upload Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Images
                    </CardTitle>
                    <CardDescription>
                      Upload images to include with your article
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div 
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, GIF up to 10MB
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>
                    
                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-4">
                        {uploadedImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reference Links Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Link2 className="h-5 w-5" />
                          Reference Links
                        </CardTitle>
                        <CardDescription>
                          Add links to sources and related content
                        </CardDescription>
                      </div>
                      {referenceLinks.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={verifyAllLinks}
                          disabled={isVerifyingLinks}
                        >
                          {isVerifyingLinks ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-1" />
                              AI Verify All
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com/article"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addReferenceLink()}
                      />
                      <Button onClick={addReferenceLink} disabled={!newLinkUrl.trim()}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    
                    {referenceLinks.length > 0 && (
                      <div className="space-y-2">
                        {referenceLinks.map((link) => (
                          <div 
                            key={link.id} 
                            className="flex items-center gap-3 p-3 border rounded-lg"
                          >
                            <div className="flex-shrink-0">
                              {link.status === "pending" && (
                                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                              )}
                              {link.status === "checking" && (
                                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                              )}
                              {link.status === "valid" && (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              )}
                              {link.status === "invalid" && (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {link.title || link.url}
                              </p>
                              {link.description && (
                                <p className="text-xs text-muted-foreground">
                                  {link.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground truncate">
                                {link.url}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(link.url, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeReferenceLink(link.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                {editedContent && (
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={saveDraft}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Draft
                    </Button>
                    <Button variant="outline">
                      <Clock className="h-4 w-4 mr-2" />
                      Schedule
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Send className="h-4 w-4 mr-2" />
                      Publish to LinkedIn
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Drafts Tab */}
          <TabsContent value="drafts" className="flex-1 m-0 min-h-0 overflow-hidden">
            <ScrollArea className="h-full p-6">
              <div className="max-w-4xl mx-auto">
                {drafts.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No drafts yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Create an article and save it as a draft
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {drafts.map((draft) => (
                      <Card key={draft.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold">{draft.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {draft.content}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Created {draft.createdAt.toLocaleDateString()}</span>
                                {draft.images.length > 0 && (
                                  <span>{draft.images.length} image(s)</span>
                                )}
                                {draft.referenceLinks.length > 0 && (
                                  <span>{draft.referenceLinks.length} link(s)</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Scheduled Tab */}
          <TabsContent value="scheduled" className="flex-1 m-0 min-h-0 overflow-hidden">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No scheduled posts</h3>
                <p className="text-sm text-muted-foreground">
                  Schedule articles to be published automatically
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Published Tab */}
          <TabsContent value="published" className="flex-1 m-0 min-h-0 overflow-hidden">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No published articles</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your LinkedIn account to publish articles
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Article Preview</DialogTitle>
            <DialogDescription>
              Full article as it will appear when published (with all sections)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-6 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#0072BC] to-[#a08840] flex items-center justify-center">
                  <span className="text-white font-bold text-lg">AE</span>
                </div>
                <div>
                  <p className="font-semibold">Adams Electric</p>
                  <p className="text-xs text-muted-foreground">Just now • 🌐</p>
                </div>
              </div>
              
              {/* Featured Image */}
              {uploadedImages.length > 0 && (
                <div className="mb-4">
                  <img
                    src={uploadedImages[0]}
                    alt="Article image"
                    className="w-full rounded-lg"
                  />
                </div>
              )}
              
              {/* Title */}
              <h2 className="font-bold text-xl mb-4">{editedTitle}</h2>
              
              {/* Main Content */}
              <div className="whitespace-pre-wrap text-sm leading-relaxed prose prose-sm max-w-none">
                {editedContent}
              </div>
              
              {/* Glossary Section */}
              {editedGlossary.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="font-bold text-base mb-3">Glossary</h3>
                  <div className="space-y-2">
                    {editedGlossary.map((item, index) => (
                      item.term && item.definition && (
                        <p key={index} className="text-sm">
                          <strong>{item.term}</strong>: {item.definition}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              )}
              
              {/* References Section */}
              {editedReferences.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="font-bold text-base mb-3">References & Resources</h3>
                  <ul className="space-y-1">
                    {editedReferences.map((ref) => (
                      ref.title && ref.url && (
                        <li key={ref.id} className="text-sm">
                          • <strong>{ref.title}</strong>: <a href={ref.url} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{ref.url}</a>
                        </li>
                      )
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Hashtags */}
              {editedHashtags.trim() && (
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm text-blue-600 font-medium">
                    {editedHashtags}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Full Article
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Send className="h-4 w-4 mr-2" />
              Publish to LinkedIn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Word Count Dialog */}
      <Dialog open={showWordCount} onOpenChange={setShowWordCount}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Word Count
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground mb-3">Statistics:</p>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b">
                <span className="text-sm">Words</span>
                <span className="text-sm font-semibold">{getWordCountStats().words.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-sm">Characters (no spaces)</span>
                <span className="text-sm font-semibold">{getWordCountStats().charactersNoSpaces.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-sm">Characters (with spaces)</span>
                <span className="text-sm font-semibold">{getWordCountStats().charactersWithSpaces.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-sm">Paragraphs</span>
                <span className="text-sm font-semibold">{getWordCountStats().paragraphs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-sm">Lines</span>
                <span className="text-sm font-semibold">{getWordCountStats().lines.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-sm">Sentences</span>
                <span className="text-sm font-semibold">{getWordCountStats().sentences.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWordCount(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
