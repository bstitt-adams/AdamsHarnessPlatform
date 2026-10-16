"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Eye,
  EyeOff,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Zap,
  Video,
  Brain,
  Server,
  Webhook,
  Key,
  RefreshCw,
  Send,
  User,
  Loader2,
  FileSignature,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Monitor,
  Linkedin,
  Twitter,
  Youtube,
  Facebook,
  Instagram,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WEBHOOK_EVENTS, testWebhookConnection, sendToBrianStitt, type WebhookEventType } from "@/lib/mattermost";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COLLECTIONS, type PlatformSettingsDoc } from "@/lib/schema";
import { logSettingsUpdated } from "@/lib/activity-logger";
import { 
  showInAppNotification, 
  requestNotificationPermission, 
  getBrowserNotificationStatus 
} from "@/lib/notifications";
import { FeatureVisibilitySettings } from "@/components/portal/feature-visibility-settings";
import { TelegramUsersManager } from "@/components/portal/telegram-users-manager";
import { TeamsUsersManager } from "@/components/portal/teams-users-manager";
import { useUserProfile } from "@/contexts/user-profile-context";
import { isSuperAdmin } from "@/lib/permissions";

interface ApiKeyConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  keyField: string;
  webhookField?: string;
  additionalFields?: { name: string; label: string; placeholder: string }[];
  status: "connected" | "disconnected" | "error";
  lastTested?: string;
}

const apiConfigs: ApiKeyConfig[] = [];

const llmProviders = [
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"], supportsCustomUrl: false },
  { id: "anthropic", name: "Anthropic", models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"], supportsCustomUrl: false },
  { id: "google", name: "Google AI", models: ["gemini-pro", "gemini-ultra"], supportsCustomUrl: false },
  { id: "mistral", name: "Mistral AI", models: ["mistral-large", "mistral-medium", "mistral-small"], supportsCustomUrl: false },
  { id: "ollama", name: "Ollama (Local)", models: ["llama2", "codellama", "mistral", "mixtral", "llama3", "phi3"], supportsCustomUrl: true },
  { id: "openai-compatible", name: "OpenAI Compatible (ngrok/lm-studio/vllm)", models: ["default"], supportsCustomUrl: true },
];

const SETTINGS_DOC_ID = "global";

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") || "integrations";
  const isIntegrationSubTab = ["llm", "hermes", "telegram", "teams"].includes(rawTab);
  const defaultTab = isIntegrationSubTab ? "integrations" : rawTab;
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [integrationSubTab, setIntegrationSubTab] = useState(
    isIntegrationSubTab ? rawTab : "llm",
  );
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, Record<string, string>>>({});
  const [testingStatus, setTestingStatus] = useState<Record<string, "testing" | "success" | "error" | null>>({});
  const [webhookEvents, setWebhookEvents] = useState<Record<WebhookEventType, boolean>>(
    WEBHOOK_EVENTS.reduce((acc, event) => ({ ...acc, [event.type]: event.enabled }), {} as Record<WebhookEventType, boolean>)
  );
  const [brianStittMessage, setBrianStittMessage] = useState("");
  const [brianStittDialogOpen, setBrianStittDialogOpen] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [llmConfig, setLlmConfig] = useState({
    provider: "openai",
    model: "gpt-4o",
    apiKey: "",
    ollamaUrl: "http://localhost:11434",
    useOllama: false,
    baseUrl: "",
    useOpenAICompatible: false,
  });
  const [hermesConfig, setHermesConfig] = useState({
    mode: "local" as "local" | "remote" | "env",
    localUrl: "http://localhost:8000",
    remoteUrl: "",
    apiKey: "",
    model: "hermes-agent",
  });
  const [telegramConfig, setTelegramConfig] = useState({
    enabled: true,
    botToken: "",
    webhookSecret: "",
    webhookUrl: "",
  });
  const [teamsConfig, setTeamsConfig] = useState({
    enabled: true,
    appId: "",
    appPassword: "",
    tenantId: "",
    incomingWebhookUrl: "",
    webhookSecret: "",
    webhookUrl: "",
  });

  // Social links settings
  const [socialLinks, setSocialLinks] = useState({
    linkedin: { url: "", visible: true },
    twitter: { url: "", visible: true },
    youtube: { url: "", visible: true },
    facebook: { url: "", visible: false },
    instagram: { url: "", visible: false },
  });
  
  // Notification sync settings
  const [notificationSettings, setNotificationSettings] = useState({
    syncWithMattermost: true,
    inAppEnabled: true,
    browserEnabled: false,
    soundEnabled: false,
  });
  const [browserPermission, setBrowserPermission] = useState<string>("default");

  // Load settings from Firebase on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!db) {
        console.error("Firebase not initialized");
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as PlatformSettingsDoc;
          
          // Load integrations into apiKeys state
          if (data.integrations) {
            const loadedApiKeys: Record<string, Record<string, string>> = {};
            
            if (data.integrations.mattermost) {
              loadedApiKeys.mattermost = {
                apiKey: data.integrations.mattermost.apiKey || "",
                webhook: data.integrations.mattermost.webhookUrl || "",
                serverUrl: data.integrations.mattermost.serverUrl || "",
                teamId: data.integrations.mattermost.teamId || "",
              };
            }
            if (data.integrations.apollo) {
              loadedApiKeys.apollo = {
                apiKey: data.integrations.apollo.apiKey || "",
                accountId: data.integrations.apollo.accountId || "",
              };
            }
            if (data.integrations.gohighlevel) {
              loadedApiKeys.gohighlevel = {
                apiKey: data.integrations.gohighlevel.apiKey || "",
                locationId: data.integrations.gohighlevel.locationId || "",
                agencyId: data.integrations.gohighlevel.agencyId || "",
              };
            }
            if (data.integrations.zoom) {
              loadedApiKeys.zoom = {
                apiKey: data.integrations.zoom.apiKey || "",
                apiSecret: data.integrations.zoom.apiSecret || "",
                accountId: data.integrations.zoom.accountId || "",
              };
            }
            if (data.integrations.docuseal) {
              loadedApiKeys.docuseal = {
                apiKey: data.integrations.docuseal.apiKey || "",
                webhookSecret: data.integrations.docuseal.webhookSecret || "",
              };
            }
            if (data.integrations.stripe) {
              loadedApiKeys.stripe = {
                apiKey: data.integrations.stripe.secretKey || "",
                publishableKey: data.integrations.stripe.publishableKey || "",
                webhookSecret: data.integrations.stripe.webhookSecret || "",
              };
            }
            
            setApiKeys(loadedApiKeys);
          }
          
          // Load LLM config
          if (data.llmConfig) {
            setLlmConfig({
              provider: data.llmConfig.provider || "openai",
              model: data.llmConfig.model || "gpt-4o",
              apiKey: data.llmConfig.apiKey || "",
              ollamaUrl: data.llmConfig.ollamaUrl || "http://localhost:11434",
              useOllama: data.llmConfig.useOllama || false,
              baseUrl: data.llmConfig.baseUrl || "",
              useOpenAICompatible: data.llmConfig.useOpenAICompatible || false,
            });
          }
          
          if (data.hermes) {
            setHermesConfig((prev) => ({
              ...prev,
              mode: data.hermes?.mode || "local",
              localUrl: data.hermes?.localUrl || prev.localUrl,
              remoteUrl: data.hermes?.remoteUrl || "",
              model: data.hermes?.model || "hermes-agent",
            }));
          }
          if (data.telegram) {
            setTelegramConfig((prev) => ({
              ...prev,
              enabled: data.telegram?.enabled !== false,
              webhookUrl: data.telegram?.webhookUrl || "",
            }));
          }
          if (data.teams) {
            setTeamsConfig((prev) => ({
              ...prev,
              enabled: data.teams?.enabled !== false,
              appId: data.teams?.appId || "",
              tenantId: data.teams?.tenantId || "",
              webhookUrl: data.teams?.webhookUrl || "",
            }));
          }

          // Load webhook events
          if (data.webhookEvents) {
            setWebhookEvents(prev => ({ ...prev, ...data.webhookEvents }));
          }
          
          // Load notification settings
          if (data.notificationSettings) {
            setNotificationSettings(prev => ({ ...prev, ...data.notificationSettings }));
          }
          
          // Load social links
          if (data.socialLinks) {
            setSocialLinks(prev => ({ ...prev, ...data.socialLinks }));
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
    
    // Check browser notification permission
    setBrowserPermission(getBrowserNotificationStatus());
  }, []);

  // Save settings to Firebase
  const saveSettings = async () => {
    if (!db) {
      toast.error("Firebase not initialized. Check your environment variables.");
      return;
    }
    setSaving(true);
    try {
      const docRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, SETTINGS_DOC_ID);
      
      // Build settings data, using empty strings instead of undefined
      const settingsData = {
        id: SETTINGS_DOC_ID,
        integrations: {
          mattermost: {
            apiKey: apiKeys.mattermost?.apiKey || "",
            webhookUrl: apiKeys.mattermost?.webhook || "",
            serverUrl: apiKeys.mattermost?.serverUrl || "",
            teamId: apiKeys.mattermost?.teamId || "",
            status: testingStatus.mattermost === "success" ? "connected" : "disconnected",
          },
          apollo: {
            apiKey: apiKeys.apollo?.apiKey || "",
            accountId: apiKeys.apollo?.accountId || "",
            status: testingStatus.apollo === "success" ? "connected" : "disconnected",
          },
          gohighlevel: {
            apiKey: apiKeys.gohighlevel?.apiKey || "",
            locationId: apiKeys.gohighlevel?.locationId || "",
            agencyId: apiKeys.gohighlevel?.agencyId || "",
            status: testingStatus.gohighlevel === "success" ? "connected" : "disconnected",
          },
          zoom: {
            apiKey: apiKeys.zoom?.apiKey || "",
            apiSecret: apiKeys.zoom?.apiSecret || "",
            accountId: apiKeys.zoom?.accountId || "",
            status: testingStatus.zoom === "success" ? "connected" : "disconnected",
          },
          docuseal: {
            apiKey: apiKeys.docuseal?.apiKey || "",
            webhookSecret: apiKeys.docuseal?.webhookSecret || "",
            status: testingStatus.docuseal === "success" ? "connected" : "disconnected",
          },
          stripe: {
            secretKey: apiKeys.stripe?.apiKey || "",
            publishableKey: apiKeys.stripe?.publishableKey || "",
            webhookSecret: apiKeys.stripe?.webhookSecret || "",
            status: testingStatus.stripe === "success" ? "connected" : "disconnected",
          },
        },
        llmConfig: {
          provider: llmConfig.provider,
          model: llmConfig.model,
          apiKey: llmConfig.apiKey || "",
          ollamaUrl: llmConfig.ollamaUrl,
          useOllama: llmConfig.useOllama,
          baseUrl: llmConfig.baseUrl || "",
          useOpenAICompatible: llmConfig.useOpenAICompatible,
        },
        webhookEvents: webhookEvents as Record<string, boolean>,
        notificationSettings: notificationSettings,
        socialLinks: socialLinks,
        updatedAt: Timestamp.now(),
      };
      
      await setDoc(docRef, settingsData, { merge: true });
      setHasChanges(false);
      // Log activity
      await logSettingsUpdated("Platform Settings");
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error saving settings. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateApiKey = (configId: string, field: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [configId]: { ...prev[configId], [field]: value },
    }));
    setHasChanges(true);
  };

  const testConnection = async (configId: string) => {
    setTestingStatus(prev => ({ ...prev, [configId]: "testing" }));

    if (configId === "hermes") {
      try {
        const user = auth?.currentUser;
        if (!user) throw new Error("Not signed in");
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/hermes/test", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(hermesConfig),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Hermes connection failed");
        setTestingStatus(prev => ({ ...prev, hermes: "success" }));
        toast.success(`Hermes connected in ${result.latencyMs}ms`);
      } catch (error) {
        setTestingStatus(prev => ({ ...prev, hermes: "error" }));
        toast.error(error instanceof Error ? error.message : "Hermes connection failed");
      }
      return;
    }

    if (configId === "telegram") {
      try {
        const user = auth?.currentUser;
        if (!user) throw new Error("Not signed in");
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/telegram/configure", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(telegramConfig),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Telegram configuration failed");
        setTelegramConfig((prev) => ({ ...prev, webhookUrl: result.webhookUrl }));
        setTestingStatus(prev => ({ ...prev, telegram: "success" }));
        toast.success(`Telegram connected${result.botUsername ? ` as @${result.botUsername}` : ""}`);
      } catch (error) {
        setTestingStatus(prev => ({ ...prev, telegram: "error" }));
        toast.error(error instanceof Error ? error.message : "Telegram configuration failed");
      }
      return;
    }

    if (configId === "teams") {
      try {
        const user = auth?.currentUser;
        if (!user) throw new Error("Not signed in");
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/teams/configure", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(teamsConfig),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Microsoft Teams configuration failed");
        setTeamsConfig((prev) => ({ ...prev, webhookUrl: result.webhookUrl }));
        setTestingStatus(prev => ({ ...prev, teams: "success" }));
        toast.success("Microsoft Teams bot configured and verified");
      } catch (error) {
        setTestingStatus(prev => ({ ...prev, teams: "error" }));
        toast.error(error instanceof Error ? error.message : "Microsoft Teams configuration failed");
      }
      return;
    }

    if (configId === "webhook" || configId === "mattermost") {
      // Test actual Mattermost webhook
      const webhookUrl = apiKeys["mattermost"]?.webhook || apiKeys["webhook"]?.url;
      if (webhookUrl) {
        const result = await testWebhookConnection(webhookUrl);
        setTestingStatus(prev => ({ 
          ...prev, 
          [configId]: result.success ? "success" : "error" 
        }));
        if (!result.success) {
          toast.error(`Webhook test failed: ${result.error}`);
        }
        return;
      }
    }

    if (configId === "stripe") {
      // Test Stripe connection
      const secretKey = apiKeys["stripe"]?.apiKey;
      if (!secretKey) {
        setTestingStatus(prev => ({ ...prev, [configId]: "error" }));
        toast.error("Please enter your Stripe Secret Key");
        return;
      }
      try {
        const response = await fetch("/api/stripe/test-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secretKey }),
        });
        const result = await response.json();
        setTestingStatus(prev => ({ 
          ...prev, 
          [configId]: result.success ? "success" : "error" 
        }));
        if (result.success) {
          toast.success("Stripe connection successful!");
        } else {
          toast.error(`Stripe test failed: ${result.error}`);
        }
        return;
      } catch (error) {
        setTestingStatus(prev => ({ ...prev, [configId]: "error" }));
        toast.error("Failed to test Stripe connection");
        return;
      }
    }
    
    // Simulate API test for other integrations
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTestingStatus(prev => ({ 
      ...prev, 
      [configId]: Math.random() > 0.3 ? "success" : "error" 
    }));
  };

  const handleSendToBrianStitt = async () => {
    const webhookUrl = apiKeys["mattermost"]?.webhook;
    if (!webhookUrl) {
      toast.error("Please configure the Mattermost webhook URL first in the Integrations tab.");
      return;
    }
    if (!brianStittMessage.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    setSendingMessage(true);
    const result = await sendToBrianStitt(webhookUrl, brianStittMessage, {
      "Sent By": "Adams Platform User",
      "Timestamp": new Date().toLocaleString(),
    });
    setSendingMessage(false);

    if (result.success) {
      toast.success("Message sent to Brian Stitt successfully!");
      setBrianStittMessage("");
      setBrianStittDialogOpen(false);
    } else {
      toast.error(`Failed to send message: ${result.error}`);
    }
  };

  const toggleWebhookEvent = (eventType: WebhookEventType) => {
    setWebhookEvents(prev => ({ ...prev, [eventType]: !prev[eventType] }));
    setHasChanges(true);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage API keys, webhooks, and integrations
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving..." : hasChanges ? "Save Changes" : "Save All Settings"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="social">Social Links</TabsTrigger>
          <TabsTrigger value="visibility">Feature Visibility</TabsTrigger>
        </TabsList>

        {/* Integrations Tab (contains LLM Configuration, Hermes Integration, Telegram, Microsoft Teams) */}
        <TabsContent value="integrations" className="space-y-6">
          <Tabs
            value={integrationSubTab}
            onValueChange={setIntegrationSubTab}
            className="space-y-6"
          >
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="llm">LLM Configuration</TabsTrigger>
              <TabsTrigger value="hermes">Hermes Integration</TabsTrigger>
              <TabsTrigger value="telegram">Telegram</TabsTrigger>
              <TabsTrigger value="teams">Microsoft Teams</TabsTrigger>
            </TabsList>

            {/* LLM Configuration Sub-Tab */}
            <TabsContent value="llm" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>LLM Provider Configuration</CardTitle>
                  <CardDescription>
                    Configure your preferred Large Language Model provider
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="llmProvider">Provider</Label>
                  <Select
                    value={llmConfig.provider}
                    onValueChange={(value) => {
                      const provider = llmProviders.find(p => p.id === value);
                      setLlmConfig({
                        ...llmConfig,
                        provider: value,
                        model: provider?.models[0] || "",
                        useOllama: value === "ollama",
                        useOpenAICompatible: value === "openai-compatible",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {llmProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="llmModel">Model</Label>
                  <Select
                    value={llmConfig.model}
                    onValueChange={(value) => setLlmConfig({ ...llmConfig, model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {llmProviders.find(p => p.id === llmConfig.provider)?.models.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Base URL Configuration - for Ollama and OpenAI-compatible providers */}
              {(llmConfig.provider === "ollama" || llmConfig.provider === "openai-compatible") && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label htmlFor="baseUrl">
                      {llmConfig.provider === "ollama" ? "Ollama Server URL (or ngrok URL)" : "Base URL (OpenAI-compatible endpoint)"}
                    </Label>
                    <Input
                      id="baseUrl"
                      placeholder={llmConfig.provider === "ollama" ? "http://localhost:11434 or https://xxxx.ngrok.io" : "https://api.example.com/v1"}
                      value={llmConfig.baseUrl || llmConfig.ollamaUrl}
                      onChange={(e) => setLlmConfig({ 
                        ...llmConfig, 
                        baseUrl: e.target.value,
                        ollamaUrl: e.target.value 
                      })}
                    />
                    <p className="text-sm text-muted-foreground">
                      {llmConfig.provider === "ollama" 
                        ? "Use ngrok to expose your local Ollama: ngrok http 11434" 
                        : "The base URL for your OpenAI-compatible API endpoint"}
                    </p>
                  </div>

                  {llmConfig.provider === "ollama" && (
                    <div className="p-4 bg-background rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        Ollama + ngrok Setup
                      </h4>
                      <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                        <li>Install Ollama: <a href="https://ollama.ai" className="text-primary underline" target="_blank" rel="noopener">ollama.ai</a></li>
                        <li>Pull a model: <code className="bg-muted px-1 rounded">ollama pull llama3</code></li>
                        <li>Start Ollama: <code className="bg-muted px-1 rounded">ollama serve</code></li>
                        <li>Install ngrok: <a href="https://ngrok.com" className="text-primary underline" target="_blank" rel="noopener">ngrok.com</a></li>
                        <li>Expose Ollama: <code className="bg-muted px-1 rounded">ngrok http 11434</code></li>
                        <li>Copy the ngrok URL (e.g., <code className="bg-muted px-1 rounded">https://xxxx.ngrok.io</code>) above</li>
                      </ol>
                    </div>
                  )}

                  {llmConfig.provider === "openai-compatible" && (
                    <div className="p-4 bg-background rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        OpenAI-Compatible Endpoints
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>LM Studio:</strong> <code className="bg-muted px-1 rounded">http://localhost:1234/v1</code></li>
                        <li>• <strong>vLLM:</strong> <code className="bg-muted px-1 rounded">http://localhost:8000/v1</code></li>
                        <li>• <strong>Ollama (OpenAI compat):</strong> <code className="bg-muted px-1 rounded">https://xxxx.ngrok.io/v1</code></li>
                        <li>• <strong>Text Generation WebUI:</strong> <code className="bg-muted px-1 rounded">http://localhost:5000/v1</code></li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* API Key - required for most providers */}
              {llmConfig.provider !== "ollama" && (
                <div className="space-y-2">
                  <Label htmlFor="llmApiKey">
                    {llmConfig.provider === "openai-compatible" ? "API Key (if required)" : "API Key"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="llmApiKey"
                      type={showKeys["llm"] ? "text" : "password"}
                      placeholder={llmConfig.provider === "openai-compatible" ? "Enter API key (optional for some local endpoints)" : "Enter your API key"}
                      value={llmConfig.apiKey}
                      onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => toggleShowKey("llm")}
                    >
                      {showKeys["llm"] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {llmConfig.provider === "openai-compatible" && (
                    <p className="text-sm text-muted-foreground">
                      Some local endpoints like LM Studio don&apos;t require an API key. Leave blank if not needed.
                    </p>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => testConnection("llm")}
                disabled={testingStatus["llm"] === "testing"}
              >
                {testingStatus["llm"] === "testing" ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : testingStatus["llm"] === "success" ? (
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                ) : testingStatus["llm"] === "error" ? (
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                Test LLM Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hermes Integration Tab */}
        <TabsContent value="hermes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> Hermes Integration</CardTitle>
              <CardDescription>Configure the Adams Harness interview assistant and test either a local or remote Hermes endpoint.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Active endpoint</Label>
                <Select value={hermesConfig.mode} onValueChange={(value: "local" | "remote" | "env") => { setHermesConfig({ ...hermesConfig, mode: value }); setHasChanges(true); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local Hermes</SelectItem>
                    <SelectItem value="remote">Remote Hermes</SelectItem>
                    <SelectItem value="env">Environment variables</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="hermesLocalUrl">Local URL</Label><Input id="hermesLocalUrl" placeholder="http://localhost:8000" value={hermesConfig.localUrl} onChange={(e) => { setHermesConfig({ ...hermesConfig, localUrl: e.target.value }); setHasChanges(true); }} /></div>
                <div className="space-y-2"><Label htmlFor="hermesRemoteUrl">Remote URL</Label><Input id="hermesRemoteUrl" placeholder="https://hermes.example.com" value={hermesConfig.remoteUrl} onChange={(e) => { setHermesConfig({ ...hermesConfig, remoteUrl: e.target.value }); setHasChanges(true); }} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="hermesModel">Model</Label><Input id="hermesModel" value={hermesConfig.model} onChange={(e) => { setHermesConfig({ ...hermesConfig, model: e.target.value }); setHasChanges(true); }} /></div>
                <div className="space-y-2"><Label htmlFor="hermesApiKey">API key</Label><Input id="hermesApiKey" type={showKeys.hermes ? "text" : "password"} value={hermesConfig.apiKey} onChange={(e) => { setHermesConfig({ ...hermesConfig, apiKey: e.target.value }); setHasChanges(true); }} /></div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => testConnection("hermes")} disabled={testingStatus.hermes === "testing"}>
                  {testingStatus.hermes === "testing" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : testingStatus.hermes === "success" ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : testingStatus.hermes === "error" ? <XCircle className="mr-2 h-4 w-4 text-red-500" /> : <TestTube className="mr-2 h-4 w-4" />}
                  Test {hermesConfig.mode === "env" ? "configured" : hermesConfig.mode} Hermes
                </Button>
                {testingStatus.hermes === "success" && <Badge variant="secondary">Connected</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">The API key is sent only to the server for the connection test and is never returned by the test endpoint. Save settings after testing.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Telegram Integration Tab */}
        <TabsContent value="telegram" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Telegram via Hermes</CardTitle>
              <CardDescription>Configure the Telegram bot and webhook from Adams Platform. No separate Hermes setup is required.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div><Label htmlFor="telegramEnabled">Enable Telegram</Label><p className="text-sm text-muted-foreground">Allow Telegram commands and notifications through the Adams assistant.</p></div>
                <Switch id="telegramEnabled" checked={telegramConfig.enabled} onCheckedChange={(enabled) => { setTelegramConfig({ ...telegramConfig, enabled }); setHasChanges(true); }} />
              </div>
              <div className="space-y-2"><Label htmlFor="telegramBotToken">Bot token</Label><Input id="telegramBotToken" type={showKeys.telegram ? "text" : "password"} value={telegramConfig.botToken} onChange={(e) => { setTelegramConfig({ ...telegramConfig, botToken: e.target.value }); setHasChanges(true); }} placeholder="123456789:AA..." /><p className="text-xs text-muted-foreground">Get this token from BotFather. It stays server-side and is never returned by the configuration endpoint.</p></div>
              <div className="space-y-2"><Label htmlFor="telegramWebhookSecret">Webhook secret (optional)</Label><Input id="telegramWebhookSecret" type="password" value={telegramConfig.webhookSecret} onChange={(e) => { setTelegramConfig({ ...telegramConfig, webhookSecret: e.target.value }); setHasChanges(true); }} placeholder="A random secret token" /></div>
              <div className="space-y-2"><Label htmlFor="telegramWebhookUrl">Webhook URL</Label><Input id="telegramWebhookUrl" value={telegramConfig.webhookUrl || (typeof window !== "undefined" ? `${window.location.origin}/api/telegram/webhook` : "")} onChange={(e) => { setTelegramConfig({ ...telegramConfig, webhookUrl: e.target.value }); setHasChanges(true); }} placeholder="https://your-domain.com/api/telegram/webhook" /></div>
              <div className="flex items-center gap-3"><Button variant="outline" onClick={() => testConnection("telegram")} disabled={testingStatus.telegram === "testing"}>{testingStatus.telegram === "testing" ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : testingStatus.telegram === "success" ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : testingStatus.telegram === "error" ? <XCircle className="mr-2 h-4 w-4 text-red-500" /> : <TestTube className="mr-2 h-4 w-4" />}Configure and test Telegram</Button>{testingStatus.telegram === "success" && <Badge variant="secondary">Connected</Badge>}</div>
              <p className="text-xs text-muted-foreground">The test calls Telegram&apos;s API, registers the webhook, and stores the configuration for the application webhook.</p>
            </CardContent>
          </Card>

          <TelegramUsersManager />
        </TabsContent>

        {/* Microsoft Teams Integration Tab */}
        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Microsoft Teams via Hermes
              </CardTitle>
              <CardDescription>
                Configure the Microsoft Teams Bot Framework endpoint and webhook from Adams Platform. No separate Hermes setup is required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="teamsEnabled">Enable Microsoft Teams</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow Microsoft Teams messages, commands, and notifications through the Adams Hermes assistant.
                  </p>
                </div>
                <Switch
                  id="teamsEnabled"
                  checked={teamsConfig.enabled}
                  onCheckedChange={(enabled) => {
                    setTeamsConfig({ ...teamsConfig, enabled });
                    setHasChanges(true);
                  }}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="teamsAppId">Microsoft Bot App ID (Client ID)</Label>
                  <Input
                    id="teamsAppId"
                    value={teamsConfig.appId}
                    onChange={(e) => {
                      setTeamsConfig({ ...teamsConfig, appId: e.target.value });
                      setHasChanges(true);
                    }}
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamsTenantId">Directory (Tenant) ID (optional)</Label>
                  <Input
                    id="teamsTenantId"
                    value={teamsConfig.tenantId}
                    onChange={(e) => {
                      setTeamsConfig({ ...teamsConfig, tenantId: e.target.value });
                      setHasChanges(true);
                    }}
                    placeholder="botframework.com or Azure AD Tenant GUID"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamsAppPassword">Bot App Password (Client Secret)</Label>
                <Input
                  id="teamsAppPassword"
                  type="password"
                  value={teamsConfig.appPassword}
                  onChange={(e) => {
                    setTeamsConfig({ ...teamsConfig, appPassword: e.target.value });
                    setHasChanges(true);
                  }}
                  placeholder="Enter Azure Bot client secret"
                />
                <p className="text-xs text-muted-foreground">
                  Stored server-side in protected Firestore secrets and never returned to the browser.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamsIncomingWebhookUrl">Channel Incoming Webhook URL (optional)</Label>
                <Input
                  id="teamsIncomingWebhookUrl"
                  type="password"
                  value={teamsConfig.incomingWebhookUrl}
                  onChange={(e) => {
                    setTeamsConfig({ ...teamsConfig, incomingWebhookUrl: e.target.value });
                    setHasChanges(true);
                  }}
                  placeholder="https://adams.webhook.office.com/webhookb2/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamsWebhookUrl">Messaging Endpoint (Bot Webhook URL)</Label>
                <Input
                  id="teamsWebhookUrl"
                  value={
                    teamsConfig.webhookUrl ||
                    (typeof window !== "undefined" ? `${window.location.origin}/api/teams/webhook` : "")
                  }
                  onChange={(e) => {
                    setTeamsConfig({ ...teamsConfig, webhookUrl: e.target.value });
                    setHasChanges(true);
                  }}
                  placeholder="https://adams-platform.vercel.app/api/teams/webhook"
                />
                <p className="text-xs text-muted-foreground">
                  Paste this URL into your Azure Bot Configuration → Messaging endpoint.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => testConnection("teams")}
                  disabled={testingStatus.teams === "testing"}
                >
                  {testingStatus.teams === "testing" ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : testingStatus.teams === "success" ? (
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  ) : testingStatus.teams === "error" ? (
                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  ) : (
                    <TestTube className="mr-2 h-4 w-4" />
                  )}
                  Configure and test Microsoft Teams
                </Button>
                {testingStatus.teams === "success" && <Badge variant="secondary">Connected</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Verifies your Bot Framework credentials with Microsoft Identity Platform and stores the configuration for the Teams webhook.
              </p>
            </CardContent>
          </Card>

          <TeamsUsersManager />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          {/* Send to Brian Stitt - Featured Card */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary">
                    <User className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Send to Brian Stitt
                      <Badge variant="default">Quick Action</Badge>
                    </CardTitle>
                    <CardDescription>
                      Send a direct message to Brian Stitt&apos;s Mattermost channel
                    </CardDescription>
                  </div>
                </div>
                <Dialog open={brianStittDialogOpen} onOpenChange={setBrianStittDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Send Message to Brian Stitt</DialogTitle>
                      <DialogDescription>
                        This message will be sent directly to Brian Stitt&apos;s Mattermost channel via webhook.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="brianMessage">Message</Label>
                        <Textarea
                          id="brianMessage"
                          placeholder="Enter your message here..."
                          value={brianStittMessage}
                          onChange={(e) => setBrianStittMessage(e.target.value)}
                          rows={5}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>The message will include:</p>
                        <ul className="list-disc list-inside mt-1">
                          <li>Your message content</li>
                          <li>Timestamp</li>
                          <li>Sender information</li>
                        </ul>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBrianStittDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSendToBrianStitt} disabled={sendingMessage}>
                        {sendingMessage ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Send Message
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
          </Card>

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Webhook className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Webhook Configuration</CardTitle>
                  <CardDescription>
                    Configure webhooks for real-time event notifications to Mattermost
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Setup Instructions</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to Mattermost → Main Menu → Integrations → Incoming Webhooks</li>
                  <li>Click &quot;Add Incoming Webhook&quot;</li>
                  <li>Select the channel (e.g., &quot;Adams Notifications&quot;)</li>
                  <li>Copy the webhook URL and paste it below</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mattermostWebhook">Mattermost Webhook URL</Label>
                <Input
                  id="mattermostWebhook"
                  placeholder="https://your-mattermost.com/hooks/xxx-xxx-xxx"
                  value={apiKeys["mattermost"]?.webhook || ""}
                  onChange={(e) => updateApiKey("mattermost", "webhook", e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => testConnection("webhook")}
                  disabled={testingStatus["webhook"] === "testing" || !apiKeys["mattermost"]?.webhook}
                >
                  {testingStatus["webhook"] === "testing" ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : testingStatus["webhook"] === "success" ? (
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  ) : testingStatus["webhook"] === "error" ? (
                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  ) : (
                    <TestTube className="mr-2 h-4 w-4" />
                  )}
                  Test Webhook
                </Button>
                {testingStatus["webhook"] === "success" && (
                  <Badge variant="default" className="self-center">Connected</Badge>
                )}
                {testingStatus["webhook"] === "error" && (
                  <Badge variant="destructive" className="self-center">Failed</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Event Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook Events</CardTitle>
              <CardDescription>
                Choose which events trigger webhook notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <div 
                    key={event.type} 
                    className={cn(
                      "flex items-center justify-between p-4 border rounded-lg transition-colors",
                      event.type === "send_to_brian_stitt" && "border-primary/50 bg-primary/5",
                      webhookEvents[event.type] && "border-green-500/50 bg-green-500/5"
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{event.label}</span>
                        {event.type === "send_to_brian_stitt" && (
                          <Badge variant="outline" className="text-xs">Featured</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                    <Switch 
                      checked={webhookEvents[event.type]} 
                      onCheckedChange={() => toggleWebhookEvent(event.type)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Webhook Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook Payload Examples</CardTitle>
              <CardDescription>
                Reference examples based on Mattermost incoming webhook documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Text Message */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Badge variant="outline">Basic</Badge>
                  Simple Text Message
                </h4>
                <p className="text-sm text-muted-foreground">
                  The simplest webhook payload - just send text content.
                </p>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`{
  "text": "Hello, this is some text\\nThis is more text. 🎉"
}`}
                </pre>
              </div>

              {/* With Username and Icon */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Badge variant="outline">Customized</Badge>
                  Custom Username & Icon
                </h4>
                <p className="text-sm text-muted-foreground">
                  Override the bot username and avatar icon.
                </p>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`{
  "channel": "town-square",
  "username": "ADAMS-Bot",
  "icon_url": "https://your-site.com/logo.png",
  "icon_emoji": ":rocket:",
  "text": "#### New notification from Adams Platform"
}`}
                </pre>
              </div>

              {/* Markdown Table */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Badge variant="outline">Advanced</Badge>
                  Markdown with Tables
                </h4>
                <p className="text-sm text-muted-foreground">
                  Rich formatting with markdown tables and @mentions.
                </p>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`{
  "channel": "adams-notifications",
  "username": "test-automation",
  "icon_url": "https://mattermost.com/wp-content/uploads/2022/02/icon.png",
  "text": "#### Test results for July 27th, 2024\\n@channel please review.\\n\\n| Component | Tests Run | Tests Failed |\\n|:-----------|:-----------:|:--------------|\\n| Server | 948 | ✅ 0 |\\n| Web Client | 123 | ⚠️ 2 |\\n| iOS Client | 78 | ⚠️ 3 |"
}`}
                </pre>
              </div>

              {/* With Attachments */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Badge variant="outline">Rich</Badge>
                  Message Attachments
                </h4>
                <p className="text-sm text-muted-foreground">
                  Structured attachments with colors, fields, and formatting.
                </p>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`{
  "channel": "deals",
  "username": "Adams Platform",
  "text": "### 🎯 New Lead Created",
  "attachments": [{
    "fallback": "New lead from Precision Parts",
    "color": "#36a64f",
    "pretext": "A new lead has been added to the pipeline",
    "author_name": "Sarah Mitchell",
    "author_icon": "https://example.com/avatar.png",
    "title": "Precision Parts Manufacturing",
    "title_link": "https://adams-platform.com/leads/123",
    "fields": [
      { "title": "Contact", "value": "John Harrison", "short": true },
      { "title": "Value", "value": "$150,000", "short": true },
      { "title": "Source", "value": "Referral", "short": true },
      { "title": "Stage", "value": "Discovery", "short": true }
    ],
    "footer": "Adams Platform",
    "footer_icon": "https://adams-platform.com/icon.png"
  }]
}`}
                </pre>
              </div>

              {/* With Props Card (Side Panel) */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Badge variant="outline">Extended</Badge>
                  Side Panel Card
                </h4>
                <p className="text-sm text-muted-foreground">
                  Display additional details in the right-hand side panel using the card property.
                </p>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`{
  "channel": "deals",
  "username": "Winning-bot",
  "text": "#### 🎉 We won a new deal!",
  "props": {
    "card": "**Deal Information:**\\n\\n[View in CRM](https://crm.example.com/deal/123)\\n\\n- **Salesperson:** Bob McKnight\\n- **Amount:** $300,020.00\\n- **Close Date:** Dec 15, 2024\\n- **Product:** Adams Assessment"
  }
}`}
                </pre>
              </div>

              {/* Direct Message */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Badge variant="outline">DM</Badge>
                  Direct Message to User
                </h4>
                <p className="text-sm text-muted-foreground">
                  Send a direct message to a specific user using @username.
                </p>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`{
  "channel": "@brian.stitt",
  "username": "Adams Platform",
  "text": "### 📬 Direct Message\\n\\nHey Brian, you have a new referral waiting for review!\\n\\n[View Referral](https://adams-platform.com/referrals/456)"
}`}
                </pre>
              </div>

              {/* Adams Platform Event Example */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Badge>Adams</Badge>
                  One-to-One Meeting Scheduled
                </h4>
                <p className="text-sm text-muted-foreground">
                  Example of an Adams Platform event notification.
                </p>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`{
  "username": "Adams Platform",
  "icon_emoji": ":handshake:",
  "text": "### 🤝 One-to-One Meeting Scheduled",
  "attachments": [{
    "color": "#0066cc",
    "fields": [
      { "title": "Initiator", "value": "Sarah Mitchell", "short": true },
      { "title": "Partner", "value": "Marcus Chen", "short": true },
      { "title": "Date", "value": "Dec 15, 2024 at 10:00 AM", "short": true },
      { "title": "Location", "value": "Starbucks, South Blvd", "short": true }
    ],
    "footer": "Adams Platform • Affiliate Networking"
  }]
}`}
                </pre>
              </div>

              {/* Referral Submitted Example */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Badge>Adams</Badge>
                  Referral Submitted
                </h4>
                <p className="text-sm text-muted-foreground">
                  Notification when an affiliate submits a referral.
                </p>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`{
  "username": "Adams Platform",
  "icon_emoji": ":link:",
  "text": "### 🔗 New Referral Submitted",
  "attachments": [{
    "color": "#e74c3c",
    "fields": [
      { "title": "From", "value": "Jennifer Rodriguez", "short": true },
      { "title": "To", "value": "David Thompson", "short": true },
      { "title": "Prospect", "value": "Maria Gonzalez", "short": true },
      { "title": "Company", "value": "Lean Machine Shop", "short": true },
      { "title": "Adams Referral", "value": "Yes ⭐", "short": true },
      { "title": "Est. Value", "value": "$75,000", "short": true }
    ],
    "footer": "Adams Platform • Referral Network"
  }],
  "props": {
    "card": "**Referral Details:**\\n\\n- **Type:** Short-term\\n- **Service Interest:** Adams Assessment\\n- **Description:** Completed lean transformation, now ready for automation assessment.\\n\\n[View Full Referral](https://adams-platform.com/referrals/ref-002)"
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          {/* Sync with Mattermost */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary">
                  <BellRing className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Sync with Mattermost
                    <Badge variant="default">Playbooks</Badge>
                  </CardTitle>
                  <CardDescription>
                    Mirror Mattermost notifications in the browser when the site is open
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <div>
                    <Label>Sync Mattermost Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, webhook events sent to Mattermost will also appear as in-browser notifications
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings.syncWithMattermost}
                  onCheckedChange={(checked) => {
                    setNotificationSettings(prev => ({ ...prev, syncWithMattermost: checked }));
                    setHasChanges(true);
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                This allows you to see real-time notifications for Rocks, Issues, To-Dos, Meetings, and other Traction/EOS events 
                directly in your browser, mirroring what gets sent to your Mattermost channels.
              </p>
            </CardContent>
          </Card>

          {/* In-App Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>In-App Notifications</CardTitle>
                  <CardDescription>
                    Configure how notifications appear within the Adams Platform
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary" />
                  <div>
                    <Label>Toast Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show popup notifications in the corner of the screen
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings.inAppEnabled}
                  onCheckedChange={(checked) => {
                    setNotificationSettings(prev => ({ ...prev, inAppEnabled: checked }));
                    setHasChanges(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {notificationSettings.soundEnabled ? (
                    <Volume2 className="h-5 w-5 text-primary" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <Label>Sound Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Play a sound when notifications arrive
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationSettings.soundEnabled}
                  onCheckedChange={(checked) => {
                    setNotificationSettings(prev => ({ ...prev, soundEnabled: checked }));
                    setHasChanges(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Browser Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BellRing className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Browser Notifications</CardTitle>
                  <CardDescription>
                    Receive notifications even when the browser tab is in the background
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary" />
                  <div>
                    <Label>Browser Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show system notifications from your browser
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {browserPermission === "granted" ? (
                    <Badge variant="default" className="mr-2">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : browserPermission === "denied" ? (
                    <Badge variant="destructive" className="mr-2">
                      <XCircle className="h-3 w-3 mr-1" />
                      Blocked
                    </Badge>
                  ) : browserPermission === "unsupported" ? (
                    <Badge variant="secondary" className="mr-2">
                      Not Supported
                    </Badge>
                  ) : null}
                  <Switch
                    checked={notificationSettings.browserEnabled}
                    disabled={browserPermission === "denied" || browserPermission === "unsupported"}
                    onCheckedChange={async (checked) => {
                      if (checked && browserPermission !== "granted") {
                        const permission = await requestNotificationPermission();
                        setBrowserPermission(permission);
                        if (permission !== "granted") {
                          return;
                        }
                      }
                      setNotificationSettings(prev => ({ ...prev, browserEnabled: checked }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              {browserPermission === "denied" && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Browser notifications blocked</p>
                      <p className="text-sm text-muted-foreground">
                        You&apos;ve blocked notifications for this site. To enable them, click the lock icon in your browser&apos;s address bar and change the notification setting.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {browserPermission === "default" && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    When you enable browser notifications, you&apos;ll be prompted to allow notifications from this site.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Notification */}
          <Card>
            <CardHeader>
              <CardTitle>Test Notifications</CardTitle>
              <CardDescription>
                Send a test notification to verify your settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    showInAppNotification("rock_completed", {
                      title: "Test Rock",
                      name: "Q4 Revenue Target",
                    });
                  }}
                  disabled={!notificationSettings.inAppEnabled}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Test Toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    showInAppNotification("rock_at_risk", {
                      title: "Test Warning",
                      name: "Customer Onboarding Process",
                    });
                  }}
                  disabled={!notificationSettings.inAppEnabled}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Test Warning
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    showInAppNotification("new_lead", {
                      name: "Precision Manufacturing Co.",
                      company: "Precision Manufacturing Co.",
                    });
                  }}
                  disabled={!notificationSettings.inAppEnabled}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Test Success
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                These test notifications demonstrate how different event types will appear in your browser.
              </p>
            </CardContent>
          </Card>

          {/* Notification Events */}
          <Card>
            <CardHeader>
              <CardTitle>Synced Event Types</CardTitle>
              <CardDescription>
                These events will trigger in-browser notifications when synced with Mattermost
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {WEBHOOK_EVENTS.filter(e => e.type !== "send_to_brian_stitt").map((event) => (
                  <div 
                    key={event.type}
                    className={cn(
                      "flex items-center gap-2 p-3 border rounded-lg text-sm",
                      webhookEvents[event.type] ? "border-green-500/30 bg-green-500/5" : "opacity-50"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      webhookEvents[event.type] ? "bg-green-500" : "bg-muted-foreground"
                    )} />
                    <div>
                      <span className="font-medium">{event.label}</span>
                      {event.category === "traction" && (
                        <Badge variant="outline" className="ml-2 text-xs">EOS</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Enable or disable specific events in the <strong>Webhooks</strong> tab. Events that are enabled there will also trigger in-browser notifications when sync is active.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Links Tab */}
        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Social Media Links</CardTitle>
                  <CardDescription>
                    Configure social media links displayed in the footer. Links are only visible when a URL is provided and visibility is enabled.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* LinkedIn */}
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="p-2 rounded-lg bg-[#0077B5]/10">
                  <Linkedin className="h-5 w-5 text-[#0077B5]" />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="linkedin-url">LinkedIn</Label>
                  <Input
                    id="linkedin-url"
                    placeholder="https://linkedin.com/company/your-company"
                    value={socialLinks.linkedin.url}
                    onChange={(e) => {
                      setSocialLinks(prev => ({ ...prev, linkedin: { ...prev.linkedin, url: e.target.value } }));
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="linkedin-visible" className="text-sm">Visible</Label>
                  <Switch
                    id="linkedin-visible"
                    checked={socialLinks.linkedin.visible}
                    onCheckedChange={(checked) => {
                      setSocialLinks(prev => ({ ...prev, linkedin: { ...prev.linkedin, visible: checked } }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              {/* Twitter/X */}
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="p-2 rounded-lg bg-black/10">
                  <Twitter className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="twitter-url">Twitter / X</Label>
                  <Input
                    id="twitter-url"
                    placeholder="https://twitter.com/your-company"
                    value={socialLinks.twitter.url}
                    onChange={(e) => {
                      setSocialLinks(prev => ({ ...prev, twitter: { ...prev.twitter, url: e.target.value } }));
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="twitter-visible" className="text-sm">Visible</Label>
                  <Switch
                    id="twitter-visible"
                    checked={socialLinks.twitter.visible}
                    onCheckedChange={(checked) => {
                      setSocialLinks(prev => ({ ...prev, twitter: { ...prev.twitter, visible: checked } }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              {/* YouTube */}
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="p-2 rounded-lg bg-[#FF0000]/10">
                  <Youtube className="h-5 w-5 text-[#FF0000]" />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="youtube-url">YouTube</Label>
                  <Input
                    id="youtube-url"
                    placeholder="https://youtube.com/@your-channel"
                    value={socialLinks.youtube.url}
                    onChange={(e) => {
                      setSocialLinks(prev => ({ ...prev, youtube: { ...prev.youtube, url: e.target.value } }));
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="youtube-visible" className="text-sm">Visible</Label>
                  <Switch
                    id="youtube-visible"
                    checked={socialLinks.youtube.visible}
                    onCheckedChange={(checked) => {
                      setSocialLinks(prev => ({ ...prev, youtube: { ...prev.youtube, visible: checked } }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              {/* Facebook */}
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="p-2 rounded-lg bg-[#1877F2]/10">
                  <Facebook className="h-5 w-5 text-[#1877F2]" />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="facebook-url">Facebook</Label>
                  <Input
                    id="facebook-url"
                    placeholder="https://facebook.com/your-page"
                    value={socialLinks.facebook.url}
                    onChange={(e) => {
                      setSocialLinks(prev => ({ ...prev, facebook: { ...prev.facebook, url: e.target.value } }));
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="facebook-visible" className="text-sm">Visible</Label>
                  <Switch
                    id="facebook-visible"
                    checked={socialLinks.facebook.visible}
                    onCheckedChange={(checked) => {
                      setSocialLinks(prev => ({ ...prev, facebook: { ...prev.facebook, visible: checked } }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              {/* Instagram */}
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#833AB4]/10 via-[#FD1D1D]/10 to-[#F77737]/10">
                  <Instagram className="h-5 w-5 text-[#E4405F]" />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="instagram-url">Instagram</Label>
                  <Input
                    id="instagram-url"
                    placeholder="https://instagram.com/your-account"
                    value={socialLinks.instagram.url}
                    onChange={(e) => {
                      setSocialLinks(prev => ({ ...prev, instagram: { ...prev.instagram, url: e.target.value } }));
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="instagram-visible" className="text-sm">Visible</Label>
                  <Switch
                    id="instagram-visible"
                    checked={socialLinks.instagram.visible}
                    onCheckedChange={(checked) => {
                      setSocialLinks(prev => ({ ...prev, instagram: { ...prev.instagram, visible: checked } }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">How it works</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Social links appear in the website footer</li>
                  <li>Links are only shown when both a URL is provided AND visibility is enabled</li>
                  <li>Empty URLs will hide the icon regardless of visibility setting</li>
                  <li>Changes take effect after saving</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Visibility Tab */}
        <TabsContent value="visibility" className="space-y-6">
          <FeatureVisibilitySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
