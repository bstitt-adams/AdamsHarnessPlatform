"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Target,
  Building2,
  DollarSign,
  Calendar,
  Loader2,
  Sparkles,
  User,
  Mail,
  Phone,
  Users,
  Plus,
  X,
  Package,
  RefreshCw,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";
import { logOpportunityCreated } from "@/lib/activity-logger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OpportunityForm {
  name: string;
  organizationName: string;
  stage: string;
  value: string;
  probability: string;
  expectedCloseDate: string;
  description: string;
  notes: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  affiliatePhone: string;
  affiliateCompany: string;
  deliverables: string[];
  // Subscription fields
  isSubscription: boolean;
  monthlyAmount: string;
  subscriptionTermMonths: string;
  // Quiz lead fields
  source: string;
  quizScore: string;
  quizMaxScore: string;
  quizPercentage: string;
  quizLevel: string;
  quizTopStrength: string;
  quizPriorityArea: string;
  quizSubmissionId: string;
}

interface AffiliateOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  avatar?: string;
}

const initialForm: OpportunityForm = {
  name: "",
  organizationName: "",
  stage: "lead",
  value: "10000",
  probability: "25",
  expectedCloseDate: "",
  description: "",
  notes: "",
  affiliateId: "",
  affiliateName: "",
  affiliateEmail: "",
  affiliatePhone: "",
  affiliateCompany: "",
  deliverables: [],
  // Subscription defaults
  isSubscription: false,
  monthlyAmount: "",
  subscriptionTermMonths: "12",
  // Quiz lead defaults
  source: "",
  quizScore: "",
  quizMaxScore: "",
  quizPercentage: "",
  quizLevel: "",
  quizTopStrength: "",
  quizPriorityArea: "",
  quizSubmissionId: "",
};

const subscriptionTermOptions = [
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months (1 year)" },
  { value: "24", label: "24 months (2 years)" },
  { value: "36", label: "36 months (3 years)" },
  { value: "60", label: "60 months (5 years)" },
];

const stages = [
  { value: "lead", label: "Lead", probability: 10 },
  { value: "discovery", label: "Discovery", probability: 25 },
  { value: "proposal", label: "Proposal", probability: 50 },
  { value: "negotiation", label: "Negotiation", probability: 75 },
  { value: "closed-won", label: "Closed Won", probability: 100 },
  { value: "closed-lost", label: "Closed Lost", probability: 0 },
];

export default function NewOpportunityPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <NewOpportunityContent />
    </Suspense>
  );
}

function NewOpportunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<OpportunityForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [affiliates, setAffiliates] = useState<AffiliateOption[]>([]);
  const [isEnhancingDescription, setIsEnhancingDescription] = useState(false);
  const [isEnhancingNotes, setIsEnhancingNotes] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState("");
  const [isQuizLead, setIsQuizLead] = useState(false);

  // Check for quiz lead data from URL params
  useEffect(() => {
    const source = searchParams.get("source");
    if (source === "quiz") {
      setIsQuizLead(true);
      setForm((prev) => ({
        ...prev,
        source: "quiz",
        name: searchParams.get("name") || prev.name,
        organizationName: searchParams.get("company") || prev.organizationName,
        affiliateName: searchParams.get("contactName") || prev.affiliateName,
        affiliateEmail: searchParams.get("email") || prev.affiliateEmail,
        affiliatePhone: searchParams.get("phone") || prev.affiliatePhone,
        affiliateCompany: searchParams.get("company") || prev.affiliateCompany,
        quizScore: searchParams.get("score") || prev.quizScore,
        quizMaxScore: searchParams.get("maxScore") || prev.quizMaxScore,
        quizPercentage: searchParams.get("percentage") || prev.quizPercentage,
        quizLevel: searchParams.get("level") || prev.quizLevel,
        quizTopStrength: searchParams.get("topStrength") || prev.quizTopStrength,
        quizPriorityArea: searchParams.get("priorityArea") || prev.quizPriorityArea,
        quizSubmissionId: searchParams.get("submissionId") || prev.quizSubmissionId,
        description: searchParams.get("description") || prev.description,
        notes: searchParams.get("notes") || prev.notes,
        stage: "lead",
        probability: "10",
      }));
    }
  }, [searchParams]);

  // Fetch affiliates on mount
  useEffect(() => {
    async function fetchAffiliates() {
      if (!db) return;
      try {
        const teamRef = collection(db, COLLECTIONS.TEAM_MEMBERS);
        const teamQuery = query(teamRef, orderBy("firstName"));
        const snapshot = await getDocs(teamQuery);
        const affiliateList: AffiliateOption[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as TeamMemberDoc;
          // Include affiliates and consultants
          if (data.role === "affiliate" || data.role === "consultant") {
            affiliateList.push({
              id: doc.id,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: data.emailPrimary || "",
              phone: data.mobile,
              company: data.company,
              avatar: data.avatar,
            });
          }
        });
        setAffiliates(affiliateList);
      } catch (error) {
        console.error("Error fetching affiliates:", error);
      }
    }
    fetchAffiliates();
  }, []);

  const updateField = (field: keyof OpportunityForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    
    // Auto-update probability when stage changes
    if (field === "stage") {
      const stage = stages.find((s) => s.value === value);
      if (stage) {
        setForm((prev) => ({ ...prev, probability: stage.probability.toString() }));
      }
    }
  };

  // Toggle subscription mode and calculate deal value
  const toggleSubscription = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      isSubscription: checked,
      // Clear the one-time value when switching to subscription
      value: checked ? "" : prev.value,
    }));
  };

  // Calculate total deal value from subscription
  const calculateSubscriptionValue = (): number => {
    const monthly = parseFloat(form.monthlyAmount) || 0;
    const months = parseInt(form.subscriptionTermMonths) || 12;
    return monthly * months;
  };

  // Get the effective deal value (either direct or calculated from subscription)
  const getEffectiveDealValue = (): number => {
    if (form.isSubscription) {
      return calculateSubscriptionValue();
    }
    return parseFloat(form.value) || 0;
  };

  // Handle affiliate selection
  const handleAffiliateSelect = (affiliateId: string) => {
    const affiliate = affiliates.find((a) => a.id === affiliateId);
    if (affiliate) {
      setForm((prev) => ({
        ...prev,
        affiliateId: affiliate.id,
        affiliateName: `${affiliate.firstName} ${affiliate.lastName}`,
        affiliateEmail: affiliate.email,
        affiliatePhone: affiliate.phone || "",
        affiliateCompany: affiliate.company || "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        affiliateId: "",
        affiliateName: "",
        affiliateEmail: "",
        affiliatePhone: "",
        affiliateCompany: "",
      }));
    }
  };

  // Deliverables management
  const addDeliverable = () => {
    if (newDeliverable.trim() && !form.deliverables.includes(newDeliverable.trim())) {
      setForm((prev) => ({
        ...prev,
        deliverables: [...prev.deliverables, newDeliverable.trim()],
      }));
      setNewDeliverable("");
    }
  };

  const removeDeliverable = (index: number) => {
    setForm((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index),
    }));
  };

  // AI Enhancement for Description
  const enhanceDescription = async () => {
    if (!form.description.trim() && !form.name.trim()) {
      toast.error("Please enter some text in the description or opportunity name first");
      return;
    }
    
    setIsEnhancingDescription(true);
    try {
      const response = await fetch("/api/ai/enhance-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: form.description || form.name,
          context: {
            type: "opportunity_description",
            opportunityName: form.name,
            organization: form.organizationName,
            stage: form.stage,
            value: form.value,
          },
          prompt: "Create a professional, compelling description for this sales opportunity. Include the business context, potential value proposition, and key objectives. Keep it concise but informative (2-3 paragraphs).",
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setForm((prev) => ({ ...prev, description: data.enhancedText }));
      } else {
        toast.error("Failed to enhance description. Please try again.");
      }
    } catch (error) {
      console.error("Error enhancing description:", error);
      toast.error("Error enhancing description. Check console for details.");
    } finally {
      setIsEnhancingDescription(false);
    }
  };

  // AI Enhancement for Notes
  const enhanceNotes = async () => {
    if (!form.notes.trim() && !form.name.trim()) {
      toast.error("Please enter some text in the notes or opportunity name first");
      return;
    }
    
    setIsEnhancingNotes(true);
    try {
      const response = await fetch("/api/ai/enhance-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: form.notes || `Notes for ${form.name}`,
          context: {
            type: "opportunity_notes",
            opportunityName: form.name,
            organization: form.organizationName,
            stage: form.stage,
            description: form.description,
          },
          prompt: "Expand and professionalize these notes for a sales opportunity. Include action items, next steps, key considerations, and any relevant context. Format with bullet points where appropriate.",
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setForm((prev) => ({ ...prev, notes: data.enhancedText }));
      } else {
        toast.error("Failed to enhance notes. Please try again.");
      }
    } catch (error) {
      console.error("Error enhancing notes:", error);
      toast.error("Error enhancing notes. Check console for details.");
    } finally {
      setIsEnhancingNotes(false);
    }
  };

  const handleSave = async () => {
    if (!db) {
      toast.error("Firebase not initialized");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Please enter an opportunity name");
      return;
    }

    setIsSaving(true);
    try {
      const opportunityData = {
        name: form.name,
        organizationName: form.organizationName,
        stage: form.stage,
        value: getEffectiveDealValue(),
        probability: parseInt(form.probability) || 0,
        expectedCloseDate: form.expectedCloseDate 
          ? Timestamp.fromDate(new Date(form.expectedCloseDate))
          : Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        description: form.description,
        notes: form.notes,
        // Affiliate information
        affiliateId: form.affiliateId || null,
        affiliateName: form.affiliateName || null,
        affiliateEmail: form.affiliateEmail || null,
        affiliatePhone: form.affiliatePhone || null,
        affiliateCompany: form.affiliateCompany || null,
        // Deliverables
        deliverables: form.deliverables,
        // Subscription information
        isSubscription: form.isSubscription,
        monthlyAmount: form.isSubscription ? (parseFloat(form.monthlyAmount) || 0) : null,
        subscriptionTermMonths: form.isSubscription ? (parseInt(form.subscriptionTermMonths) || 12) : null,
        // Quiz lead information
        source: form.source || null,
        quizSubmissionId: form.quizSubmissionId || null,
        quizScore: form.quizScore ? parseInt(form.quizScore) : null,
        quizMaxScore: form.quizMaxScore ? parseInt(form.quizMaxScore) : null,
        quizPercentage: form.quizPercentage ? parseInt(form.quizPercentage) : null,
        quizLevel: form.quizLevel || null,
        quizTopStrength: form.quizTopStrength || null,
        quizPriorityArea: form.quizPriorityArea || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.OPPORTUNITIES), opportunityData);
      await logOpportunityCreated(docRef.id, form.name);

      router.push("/portal/opportunities");
    } catch (error) {
      console.error("Error creating opportunity:", error);
      toast.error("Error creating opportunity. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/portal/opportunities">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Opportunity</h1>
          <p className="text-muted-foreground">Create a new sales opportunity</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Opportunity Details
              </CardTitle>
              <CardDescription>Basic information about the opportunity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Opportunity Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., ABC Manufacturing - Lean Assessment"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    placeholder="e.g., ABC Manufacturing"
                    value={form.organizationName}
                    onChange={(e) => updateField("organizationName", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Description</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={enhanceDescription}
                    disabled={isEnhancingDescription}
                    className="text-xs"
                  >
                    {isEnhancingDescription ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-3 w-3" />
                    )}
                    Enhance with AI
                  </Button>
                </div>
                <Textarea
                  id="description"
                  placeholder="Describe the opportunity..."
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quiz Lead Information Card - Only shown for quiz leads */}
          {isQuizLead && (
            <Card className="border-blue-500/50 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <ClipboardList className="h-5 w-5" />
                  Quiz Lead Information
                </CardTitle>
                <CardDescription>This opportunity was generated from a Adams IQ™ Quiz submission</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Quiz Score</div>
                    <div className="text-2xl font-bold">
                      {form.quizScore}/{form.quizMaxScore}
                      <span className="text-sm font-normal text-muted-foreground ml-1">({form.quizPercentage}%)</span>
                    </div>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Level</div>
                    <div className="text-lg font-semibold">{form.quizLevel}</div>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Submission ID</div>
                    <div className="text-sm font-mono truncate">{form.quizSubmissionId || "N/A"}</div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-2 text-xs text-green-600 uppercase tracking-wide mb-1">
                      <TrendingUp className="h-3 w-3" />
                      Top Strength
                    </div>
                    <div className="font-medium text-green-700">{form.quizTopStrength || "N/A"}</div>
                  </div>
                  <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                    <div className="flex items-center gap-2 text-xs text-orange-600 uppercase tracking-wide mb-1">
                      <AlertTriangle className="h-3 w-3" />
                      Priority Area
                    </div>
                    <div className="font-medium text-orange-700">{form.quizPriorityArea || "N/A"}</div>
                  </div>
                </div>
                {/* Contact Info from Quiz */}
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact from Quiz</div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{form.affiliateName || "Not provided"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{form.affiliateEmail || "Not provided"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{form.affiliatePhone || "Not provided"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{form.affiliateCompany || "Not provided"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Affiliate as Client Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Affiliate as Client
              </CardTitle>
              <CardDescription>Select an affiliate who is the client for this opportunity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="affiliate">Select Affiliate Client</Label>
                <Select value={form.affiliateId || "none"} onValueChange={(value) => handleAffiliateSelect(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an affiliate client..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (External Client)</SelectItem>
                    {affiliates.map((affiliate) => (
                      <SelectItem key={affiliate.id} value={affiliate.id}>
                        <div className="flex items-center gap-2">
                          <span>{affiliate.firstName} {affiliate.lastName}</span>
                          {affiliate.company && (
                            <span className="text-muted-foreground">- {affiliate.company}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.affiliateId && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Client Contact Information
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {form.affiliateName.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{form.affiliateName}</p>
                      {form.affiliateCompany && (
                        <p className="text-sm text-muted-foreground">{form.affiliateCompany}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm">
                    {form.affiliateEmail && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{form.affiliateEmail}</span>
                      </div>
                    )}
                    {form.affiliatePhone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{form.affiliatePhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Deal Information
              </CardTitle>
              <CardDescription>Financial details and timeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stage">Stage</Label>
                  <Select value={form.stage} onValueChange={(value) => updateField("stage", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="isSubscription"
                    checked={form.isSubscription}
                    onCheckedChange={(checked) => toggleSubscription(checked as boolean)}
                  />
                  <Label htmlFor="isSubscription" className="flex items-center gap-2 cursor-pointer">
                    <RefreshCw className="h-4 w-4" />
                    Subscription / Recurring Revenue
                  </Label>
                </div>
              </div>

              {/* Subscription Fields */}
              {form.isSubscription ? (
                <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-dashed">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <RefreshCw className="h-4 w-4" />
                    Subscription Pricing
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="monthlyAmount">Monthly Amount ($)</Label>
                      <Input
                        id="monthlyAmount"
                        type="number"
                        placeholder="e.g., 500"
                        value={form.monthlyAmount}
                        onChange={(e) => updateField("monthlyAmount", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subscriptionTerm">Contract Term</Label>
                      <Select 
                        value={form.subscriptionTermMonths} 
                        onValueChange={(value) => updateField("subscriptionTermMonths", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent>
                          {subscriptionTermOptions.map((term) => (
                            <SelectItem key={term.value} value={term.value}>
                              {term.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Calculated Total */}
                  <div className="flex items-center justify-between p-3 bg-background rounded-md border">
                    <span className="text-sm text-muted-foreground">Total Contract Value</span>
                    <span className="text-lg font-bold text-primary">
                      ${calculateSubscriptionValue().toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Calculated as: ${form.monthlyAmount || "0"}/month × {form.subscriptionTermMonths} months
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="value">Deal Value ($)</Label>
                  <Input
                    id="value"
                    type="number"
                    placeholder="e.g., 50000"
                    value={form.value}
                    onChange={(e) => updateField("value", e.target.value)}
                  />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g., 50"
                    value={form.probability}
                    onChange={(e) => updateField("probability", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closeDate">Expected Close Date</Label>
                  <Input
                    id="closeDate"
                    type="date"
                    value={form.expectedCloseDate}
                    onChange={(e) => updateField("expectedCloseDate", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Deliverables
              </CardTitle>
              <CardDescription>List of deliverables for this opportunity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing deliverables */}
              {form.deliverables.length > 0 && (
                <div className="space-y-2">
                  {form.deliverables.map((deliverable, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="text-sm">{deliverable}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeDeliverable(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new deliverable */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a deliverable..."
                  value={newDeliverable}
                  onChange={(e) => setNewDeliverable(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDeliverable();
                    }
                  }}
                />
                <Button type="button" onClick={addDeliverable} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {form.deliverables.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No deliverables added yet
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notes</CardTitle>
                  <CardDescription>Additional notes and context</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={enhanceNotes}
                  disabled={isEnhancingNotes}
                  className="text-xs"
                >
                  {isEnhancingNotes ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-3 w-3" />
                  )}
                  Enhance with AI
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any additional notes..."
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Create Opportunity
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/portal/opportunities">Cancel</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {form.isSubscription && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b">
                  <RefreshCw className="h-3 w-3" />
                  <span>Subscription Deal</span>
                </div>
              )}
              {form.isSubscription && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly</span>
                    <span className="font-medium">
                      ${parseFloat(form.monthlyAmount || "0").toLocaleString()}/mo
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Term</span>
                    <span className="font-medium">{form.subscriptionTermMonths} months</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {form.isSubscription ? "Total Contract Value" : "Deal Value"}
                </span>
                <span className="font-medium">
                  ${getEffectiveDealValue().toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Probability</span>
                <span className="font-medium">{form.probability}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weighted Value</span>
                <span className="font-medium">
                  ${((getEffectiveDealValue() * parseInt(form.probability || "0")) / 100).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
