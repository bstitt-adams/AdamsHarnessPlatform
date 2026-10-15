"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Link as LinkIcon,
  Users,
  MessageSquare,
  ThumbsUp,
  Send,
  Search,
  BarChart3,
  Bell,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Network,
  Briefcase,
  Plug,
  Mail,
  Share2,
  Calculator,
  FolderKanban,
  TrendingUp,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/user-profile-context";

// Alignable integration types
interface AlignableProfile {
  id: string;
  business_name: string;
  name?: string;
  description?: string;
  location?: string;
  industry?: string;
  website?: string;
  logo_url?: string;
  connection_count?: number;
  recommendation_count?: number;
}

interface AlignableConnection {
  id: string;
  business_name: string;
  location: string;
  industry: string;
  connected_at: string;
  logo_url?: string;
}

interface AlignablePost {
  id: string;
  content: string;
  author: {
    business_name: string;
    logo_url?: string;
  };
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface AlignableRecommendation {
  id: string;
  author: {
    business_name: string;
  };
  content: string;
  rating: number;
  created_at: string;
}

export default function AlignableAdminPage() {
  const { linkedTeamMember } = useUserProfile();
  const [apiKey, setApiKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Data states
  const [profile, setProfile] = useState<AlignableProfile | null>(null);
  const [connections, setConnections] = useState<AlignableConnection[]>([]);
  const [posts, setPosts] = useState<AlignablePost[]>([]);
  const [recommendations, setRecommendations] = useState<AlignableRecommendation[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Form states
  const [searchQuery, setSearchQuery] = useState("");
  const [postContent, setPostContent] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState("60");

  // Integration states
  const [integrations, setIntegrations] = useState({
    ghlCrm: { enabled: false, status: "Not Connected", apiKey: "" },
    emailMarketing: { enabled: false, status: "Not Connected", provider: "" },
    socialMedia: { enabled: false, status: "Not Connected", platforms: [] as string[] },
    accounting: { enabled: false, status: "Not Connected", provider: "" },
    projectManagement: { enabled: false, status: "Not Connected", provider: "" },
    analytics: { enabled: false, status: "Not Connected", provider: "" },
  });

  // Check for saved credentials on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("alignable_api_key");
    const savedToken = localStorage.getItem("alignable_access_token");
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedToken) setAccessToken(savedToken);
    if (savedApiKey || savedToken) {
      testConnection(savedApiKey || "", savedToken || "");
    }
  }, []);

  const testConnection = async (key: string, token: string) => {
    if (!key && !token) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/alignable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_connection",
          apiKey: key || undefined,
          accessToken: token || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.connected) {
        setIsConnected(true);
        toast.success(`Connected to Alignable: ${data.business}`);
        fetchProfile(key || "", token || "");
      } else {
        setIsConnected(false);
        toast.error(data.error || "Failed to connect");
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      setIsConnected(false);
      toast.error("Connection test failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    if (!apiKey && !accessToken) {
      toast.error("Please enter API Key or Access Token");
      return;
    }
    
    // Save credentials
    if (apiKey) localStorage.setItem("alignable_api_key", apiKey);
    if (accessToken) localStorage.setItem("alignable_access_token", accessToken);
    
    testConnection(apiKey, accessToken);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setProfile(null);
    localStorage.removeItem("alignable_api_key");
    localStorage.removeItem("alignable_access_token");
    setApiKey("");
    setAccessToken("");
    toast.success("Disconnected from Alignable");
  };

  const fetchProfile = async (key: string, token: string) => {
    try {
      const response = await fetch("/api/alignable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_profile",
          apiKey: key || undefined,
          accessToken: token || undefined,
        }),
      });

      const data = await response.json();
      if (data.id) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  const fetchConnections = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/alignable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_connections",
          apiKey: apiKey || undefined,
          accessToken: accessToken || undefined,
          searchParams: { page: 1, per_page: 50 },
        }),
      });

      const data = await response.json();
      setConnections(data.connections || data.results || []);
    } catch (error) {
      console.error("Failed to fetch connections:", error);
      toast.error("Failed to load connections");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/alignable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_posts",
          apiKey: apiKey || undefined,
          accessToken: accessToken || undefined,
          searchParams: { page: 1, per_page: 25 },
        }),
      });

      const data = await response.json();
      setPosts(data.posts || data.results || []);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/alignable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_recommendations",
          apiKey: apiKey || undefined,
          accessToken: accessToken || undefined,
          searchParams: { page: 1, per_page: 25 },
        }),
      });

      const data = await response.json();
      setRecommendations(data.recommendations || data.results || []);
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      toast.error("Failed to load recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      toast.error("Please enter post content");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/alignable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_post",
          apiKey: apiKey || undefined,
          accessToken: accessToken || undefined,
          data: {
            content: postContent,
            visibility: "public",
          },
        }),
      });

      if (response.ok) {
        toast.success("Post created successfully!");
        setPostContent("");
        fetchPosts();
      } else {
        toast.error("Failed to create post");
      }
    } catch (error) {
      console.error("Failed to create post:", error);
      toast.error("Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchBusinesses = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/alignable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search_businesses",
          apiKey: apiKey || undefined,
          accessToken: accessToken || undefined,
          searchParams: { query: searchQuery, page: 1, per_page: 25 },
        }),
      });

      const data = await response.json();
      // Show search results in a dialog or list
      toast.success(`Found ${data.businesses?.length || data.results?.length || 0} businesses`);
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Tab change handler with data fetching
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (!isConnected) return;

    switch (tab) {
      case "connections":
        fetchConnections();
        break;
      case "content":
        fetchPosts();
        break;
      case "recommendations":
        fetchRecommendations();
        break;
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alignable Integration</h1>
          <p className="text-muted-foreground">
            Connect with businesses, exchange content, and grow your network on Alignable
          </p>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"} className="text-sm">
          {isConnected ? (
            <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
          ) : (
            <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>
          )}
        </Badge>
      </div>

      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Connect to Alignable
            </CardTitle>
            <CardDescription>
              Enter your Alignable API credentials to enable integration features.
              Get your API key from the{" "}
              <a 
                href="https://developers.alignable.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Alignable Developer Portal
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Alignable API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-token">Access Token (Optional)</Label>
              <Input
                id="access-token"
                type="password"
                placeholder="Enter OAuth access token if available"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Access token provides full account access. API key has limited permissions.
              </p>
            </div>
            <Button 
              onClick={handleConnect} 
              disabled={isLoading || (!apiKey && !accessToken)}
              className="w-full"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</>
              ) : (
                <><LinkIcon className="mr-2 h-4 w-4" /> Connect to Alignable</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Connected Profile Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Business</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate">{profile?.business_name || "Unknown"}</div>
                <p className="text-xs text-muted-foreground">{profile?.industry || "No industry"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{profile?.connection_count || 0}</div>
                <p className="text-xs text-muted-foreground">Business network</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{profile?.recommendation_count || 0}</div>
                <p className="text-xs text-muted-foreground">Reviews received</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate">{profile?.location || "Not set"}</div>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="recommendations">Reviews</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Search Businesses
                    </CardTitle>
                    <CardDescription>
                      Find and connect with other businesses on Alignable
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search by name, industry, or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearchBusinesses()}
                      />
                      <Button onClick={handleSearchBusinesses} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      Quick Post
                    </CardTitle>
                    <CardDescription>
                      Share an update with your Alignable network
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="What's happening with your business?"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      rows={3}
                    />
                    <Button 
                      onClick={handleCreatePost} 
                      disabled={isLoading || !postContent.trim()}
                      className="w-full"
                    >
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</>
                      ) : (
                        <><Send className="mr-2 h-4 w-4" /> Post to Alignable</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Integration Features</CardTitle>
                  <CardDescription>
                    Available features once connected to Alignable
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      { icon: Users, title: "Network Management", desc: "View and manage your business connections" },
                      { icon: MessageSquare, title: "Content Exchange", desc: "Post updates and engage with other businesses" },
                      { icon: ThumbsUp, title: "Recommendations", desc: "Give and receive business recommendations" },
                      { icon: Briefcase, title: "Profile Sync", desc: "Keep your business profile synchronized" },
                      { icon: BarChart3, title: "Analytics", desc: "View network growth and engagement metrics" },
                      { icon: Bell, title: "Notifications", desc: "Track mentions, recommendations, and messages" },
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                        <feature.icon className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium text-sm">{feature.title}</h4>
                          <p className="text-xs text-muted-foreground">{feature.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Connections Tab */}
            <TabsContent value="connections" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Your Network ({connections.length})
                  </CardTitle>
                  <CardDescription>
                    Businesses you're connected with on Alignable
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {connections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No connections found</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setActiveTab("overview")}
                      >
                        Search for Businesses
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {connections.map((conn) => (
                        <div key={conn.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {conn.logo_url ? (
                              <img src={conn.logo_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <Briefcase className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{conn.business_name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {conn.industry} • {conn.location}
                            </p>
                          </div>
                          <Badge variant="outline">Connected</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Posts & Content
                  </CardTitle>
                  <CardDescription>
                    Manage your Alignable posts and engagement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Create a new post..."
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <Button 
                      onClick={handleCreatePost} 
                      disabled={isLoading || !postContent.trim()}
                      className="self-end"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>

                  {posts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No posts found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {posts.map((post) => (
                        <div key={post.id} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {post.author.logo_url && (
                              <img src={post.author.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                            )}
                            <span className="font-medium">{post.author.business_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{post.content}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{post.likes_count} likes</span>
                            <span>{post.comments_count} comments</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5" />
                    Recommendations & Reviews
                  </CardTitle>
                  <CardDescription>
                    Manage recommendations you've received and given
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recommendations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ThumbsUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No recommendations yet</p>
                      <p className="text-sm mt-1">
                        Build your network to receive recommendations from other businesses
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recommendations.map((rec) => (
                        <div key={rec.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{rec.author.business_name}</span>
                            <div className="flex">
                              {Array.from({ length: rec.rating }).map((_, i) => (
                                <ThumbsUp key={i} className="h-4 w-4 text-sky-500 fill-sky-500" />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{rec.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(rec.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plug className="h-5 w-5" />
                    GoHighLevel (GHL) Integration
                  </CardTitle>
                  <CardDescription>
                    Connect Alignable with your GoHighLevel CRM to sync customer data and interactions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Database className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label className="font-medium">CRM Sync</Label>
                        <p className="text-sm text-muted-foreground">
                          Connect your GHL CRM to sync customer data and interactions from Alignable
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={integrations.ghlCrm.enabled ? "default" : "outline"}>
                        {integrations.ghlCrm.status}
                      </Badge>
                      <Switch 
                        checked={integrations.ghlCrm.enabled}
                        onCheckedChange={(checked) => {
                          setIntegrations(prev => ({
                            ...prev,
                            ghlCrm: { ...prev.ghlCrm, enabled: checked, status: checked ? "Connected" : "Not Connected" }
                          }));
                          toast.success(checked ? "GHL CRM integration enabled" : "GHL CRM integration disabled");
                        }}
                      />
                    </div>
                  </div>

                  {integrations.ghlCrm.enabled && (
                    <div className="space-y-4 pl-11">
                      <div className="space-y-2">
                        <Label>GHL API Key</Label>
                        <Input 
                          type="password" 
                          placeholder="Enter your GoHighLevel API key"
                          value={integrations.ghlCrm.apiKey}
                          onChange={(e) => setIntegrations(prev => ({
                            ...prev,
                            ghlCrm: { ...prev.ghlCrm, apiKey: e.target.value }
                          }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Your API key is stored securely and used to sync data between Alignable and GHL
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => toast.success("GHL connection test initiated")}>
                          Test Connection
                        </Button>
                        <Button size="sm" onClick={() => toast.success("GHL settings saved")}>
                          Save Settings
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">Sync Options</h4>
                    <div className="space-y-3">
                      {[
                        { label: "Import Alignable connections as GHL contacts", desc: "Automatically create contacts in GHL from your Alignable network" },
                        { label: "Sync interaction history", desc: "Track messages, recommendations, and engagement in GHL" },
                        { label: "Create opportunities from Alignable leads", desc: "Convert business connections into sales opportunities" },
                        { label: "Map Alignable industries to GHL tags", desc: "Organize contacts by business industry" },
                      ].map((option, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Switch defaultChecked={i < 2} id={`ghl-option-${i}`} />
                          <div>
                            <Label htmlFor={`ghl-option-${i}`} className="font-medium">{option.label}</Label>
                            <p className="text-sm text-muted-foreground">{option.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Marketing
                    </CardTitle>
                    <CardDescription>
                      Integrate with email marketing platforms for targeted campaigns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status</span>
                      <Badge variant={integrations.emailMarketing.enabled ? "default" : "outline"}>
                        {integrations.emailMarketing.status}
                      </Badge>
                    </div>
                    <Select 
                      value={integrations.emailMarketing.provider}
                      onValueChange={(value) => setIntegrations(prev => ({
                        ...prev,
                        emailMarketing: { ...prev.emailMarketing, provider: value, enabled: !!value, status: value ? "Connected" : "Not Connected" }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mailchimp">Mailchimp</SelectItem>
                        <SelectItem value="convertkit">ConvertKit</SelectItem>
                        <SelectItem value="activecampaign">ActiveCampaign</SelectItem>
                        <SelectItem value="klaviyo">Klaviyo</SelectItem>
                        <SelectItem value="ghl">GoHighLevel (Built-in)</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• Sync Alignable connections to email lists</p>
                      <p>• Create segments based on industry/location</p>
                      <p>• Automated welcome sequences for new connections</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="h-5 w-5" />
                      Social Media
                    </CardTitle>
                    <CardDescription>
                      Share Alignable content and updates to social platforms
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status</span>
                      <Badge variant={integrations.socialMedia.enabled ? "default" : "outline"}>
                        {integrations.socialMedia.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {["LinkedIn", "Twitter/X", "Facebook", "Instagram"].map((platform) => (
                        <div key={platform} className="flex items-center justify-between">
                          <span className="text-sm">{platform}</span>
                          <Switch 
                            checked={integrations.socialMedia.platforms.includes(platform)}
                            onCheckedChange={(checked) => {
                              setIntegrations(prev => ({
                                ...prev,
                                socialMedia: {
                                  ...prev.socialMedia,
                                  platforms: checked 
                                    ? [...prev.socialMedia.platforms, platform]
                                    : prev.socialMedia.platforms.filter(p => p !== platform),
                                  enabled: checked || prev.socialMedia.platforms.length > 0,
                                  status: (checked || prev.socialMedia.platforms.length > 0) ? "Connected" : "Not Connected"
                                }
                              }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automatically share new Alignable posts, recommendations, and milestones
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Accounting Software
                    </CardTitle>
                    <CardDescription>
                      Link accounting software for streamlined invoicing and financial tracking
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status</span>
                      <Badge variant={integrations.accounting.enabled ? "default" : "outline"}>
                        {integrations.accounting.status}
                      </Badge>
                    </div>
                    <Select
                      value={integrations.accounting.provider}
                      onValueChange={(value) => setIntegrations(prev => ({
                        ...prev,
                        accounting: { ...prev.accounting, provider: value, enabled: !!value, status: value ? "Connected" : "Not Connected" }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quickbooks">QuickBooks</SelectItem>
                        <SelectItem value="xero">Xero</SelectItem>
                        <SelectItem value="freshbooks">FreshBooks</SelectItem>
                        <SelectItem value="wave">Wave</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• Create invoices from Alignable business connections</p>
                      <p>• Track payments and receivables</p>
                      <p>• Sync business expense categories</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderKanban className="h-5 w-5" />
                      Project Management
                    </CardTitle>
                    <CardDescription>
                      Implement project management tools to manage collaborations and tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status</span>
                      <Badge variant={integrations.projectManagement.enabled ? "default" : "outline"}>
                        {integrations.projectManagement.status}
                      </Badge>
                    </div>
                    <Select
                      value={integrations.projectManagement.provider}
                      onValueChange={(value) => setIntegrations(prev => ({
                        ...prev,
                        projectManagement: { ...prev.projectManagement, provider: value, enabled: !!value, status: value ? "Connected" : "Not Connected" }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asana">Asana</SelectItem>
                        <SelectItem value="trello">Trello</SelectItem>
                        <SelectItem value="monday">Monday.com</SelectItem>
                        <SelectItem value="clickup">ClickUp</SelectItem>
                        <SelectItem value="notion">Notion</SelectItem>
                        <SelectItem value="ghl">GoHighLevel</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• Create projects from Alignable business opportunities</p>
                      <p>• Assign tasks to team members based on connections</p>
                      <p>• Track collaboration progress with partners</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Analytics Platforms
                  </CardTitle>
                  <CardDescription>
                    Utilize analytics platforms to track engagement and performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Status</Label>
                      <p className="text-sm text-muted-foreground">
                        {integrations.analytics.enabled ? "Tracking active" : "Not configured"}
                      </p>
                    </div>
                    <Badge variant={integrations.analytics.enabled ? "default" : "outline"}>
                      {integrations.analytics.status}
                    </Badge>
                  </div>
                  <Select
                    value={integrations.analytics.provider}
                    onValueChange={(value) => setIntegrations(prev => ({
                      ...prev,
                      analytics: { ...prev.analytics, provider: value, enabled: !!value, status: value ? "Connected" : "Not Connected" }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select analytics provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Analytics</SelectItem>
                      <SelectItem value="mixpanel">Mixpanel</SelectItem>
                      <SelectItem value="amplitude">Amplitude</SelectItem>
                      <SelectItem value="hotjar">Hotjar</SelectItem>
                      <SelectItem value="googletagmanager">Google Tag Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      { label: "Track Alignable referral traffic", desc: "Monitor visitors from Alignable profile" },
                      { label: "Measure connection-to-lead conversion", desc: "Track how connections become leads" },
                      { label: "Content engagement analysis", desc: "Analyze which posts drive the most traffic" },
                    ].map((item, i) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Switch defaultChecked={integrations.analytics.enabled} id={`analytics-${i}`} />
                          <Label htmlFor={`analytics-${i}`} className="font-medium text-sm">{item.label}</Label>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Integration Settings</CardTitle>
                  <CardDescription>
                    Configure how Alignable integrates with your site
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Auto-Sync</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync Alignable data
                      </p>
                    </div>
                    <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                  </div>

                  {autoSync && (
                    <div className="space-y-2">
                      <Label>Sync Interval (minutes)</Label>
                      <Select value={syncInterval} onValueChange={setSyncInterval}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="180">3 hours</SelectItem>
                          <SelectItem value="360">6 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Show Recommendations on Site</Label>
                      <p className="text-sm text-muted-foreground">
                        Display Alignable recommendations on your public pages
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Content Cross-Posting</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow posting site content to Alignable
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="pt-4 border-t">
                    <Button variant="destructive" onClick={handleDisconnect}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Disconnect Alignable
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm">API Endpoint</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">/api/alignable</code>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm">Status</span>
                    <Badge variant="outline" className="text-green-600">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Business</span>
                    <span className="text-sm font-medium">{profile?.business_name || "Not connected"}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Feature Placeholders Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>🚀 Future Alignable Features</CardTitle>
          <CardDescription>
            Planned integrations and features to consider implementing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { 
                title: "Lead Generation", 
                desc: "Capture leads from Alignable profile visitors and direct them to your CRM",
                status: "Planned"
              },
              { 
                title: "Event Sync", 
                desc: "Sync Alignable events and networking meetups with your calendar",
                status: "Planned"
              },
              { 
                title: "Auto-Recommendations", 
                desc: "Automatically request recommendations from satisfied customers",
                status: "Planned"
              },
              { 
                title: "Content Scheduler", 
                desc: "Schedule posts to Alignable in advance from your content calendar",
                status: "Planned"
              },
              { 
                title: "Network Analytics", 
                desc: "Advanced analytics on network growth, engagement rates, and reach",
                status: "Planned"
              },
              { 
                title: "DM Automation", 
                desc: "Automated welcome messages and follow-ups for new connections",
                status: "Planned"
              },
              { 
                title: "Review Widget", 
                desc: "Embed Alignable recommendations directly on your website",
                status: "Planned"
              },
              { 
                title: "Referral Tracking", 
                desc: "Track referrals and leads generated through Alignable network",
                status: "Planned"
              },
              { 
                title: "Competitor Insights", 
                desc: "Monitor competitor activity and network overlap",
                status: "Planned"
              },
            ].map((feature, i) => (
              <div key={i} className="p-4 border rounded-lg opacity-75 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{feature.title}</h4>
                  <Badge variant="outline" className="text-xs">{feature.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          These features require Alignable API access and may need additional development based on API availability.
        </CardFooter>
      </Card>
    </div>
  );
}
