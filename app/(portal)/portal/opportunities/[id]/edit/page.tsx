"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  DollarSign,
  Users,
  Package,
  FileText,
  Loader2,
  Sparkles,
  Plus,
  X,
  Mail,
  Phone,
  RefreshCw,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp, collection, query, orderBy, getDocs } from "firebase/firestore";
import { COLLECTIONS, type OpportunityDoc, type TeamMemberDoc } from "@/lib/schema";
import { toast } from "sonner";

const stages = [
  { value: "lead", label: "Lead", probability: 10 },
  { value: "discovery", label: "Discovery", probability: 25 },
  { value: "proposal", label: "Proposal", probability: 50 },
  { value: "negotiation", label: "Negotiation", probability: 75 },
  { value: "closed-won", label: "Closed Won", probability: 100 },
  { value: "closed-lost", label: "Closed Lost", probability: 0 },
];

const subscriptionTermOptions = [
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months (1 year)" },
  { value: "24", label: "24 months (2 years)" },
  { value: "36", label: "36 months (3 years)" },
  { value: "60", label: "60 months (5 years)" },
];

interface OpportunityForm {
  name: string;
  organizationName: string;
  description: string;
  notes: string;
  stage: string;
  value: string;
  probability: string;
  expectedCloseDate: string;
  isSubscription: boolean;
  monthlyAmount: string;
  subscriptionTermMonths: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  affiliatePhone: string;
  affiliateCompany: string;
  deliverables: string[];
}

export default function OpportunityEditPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnhancingDescription, setIsEnhancingDescription] = useState(false);
  const [isEnhancingNotes, setIsEnhancingNotes] = useState(false);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [newDeliverable, setNewDeliverable] = useState("");

  const [form, setForm] = useState<OpportunityForm>({
    name: "",
    organizationName: "",
    description: "",
    notes: "",
    stage: "lead",
    value: "",
    probability: "10",
    expectedCloseDate: "",
    isSubscription: false,
    monthlyAmount: "",
    subscriptionTermMonths: "12",
    affiliateId: "",
    affiliateName: "",
    affiliateEmail: "",
    affiliatePhone: "",
    affiliateCompany: "",
    deliverables: [],
  });

  useEffect(() => {
    async function fetchData() {
      if (!db || !params.id) return;
      
      try {
        // Fetch opportunity
        const docRef = doc(db, COLLECTIONS.OPPORTUNITIES, params.id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          const expectedClose = data.expectedCloseDate instanceof Timestamp 
            ? data.expectedCloseDate.toDate().toISOString().split('T')[0]
            : "";
          
          setForm({
            name: data.name || "",
            organizationName: data.organizationName || "",
            description: data.description || "",
            notes: data.notes || "",
            stage: data.stage || "lead",
            value: data.value?.toString() || "",
            probability: data.probability?.toString() || "10",
            expectedCloseDate: expectedClose,
            isSubscription: data.isSubscription || false,
            monthlyAmount: data.monthlyAmount?.toString() || "",
            subscriptionTermMonths: data.subscriptionTermMonths?.toString() || "12",
            affiliateId: data.affiliateId || "",
            affiliateName: data.affiliateName || "",
            affiliateEmail: data.affiliateEmail || "",
            affiliatePhone: data.affiliatePhone || "",
            affiliateCompany: data.affiliateCompany || "",
            deliverables: data.deliverables || [],
          });
        } else {
          toast.error("Opportunity not found");
          router.push("/portal/opportunities");
        }

        // Fetch affiliates
        const affiliatesRef = collection(db, COLLECTIONS.TEAM_MEMBERS);
        const affiliatesQuery = query(affiliatesRef, orderBy("firstName"));
        const affiliatesSnap = await getDocs(affiliatesQuery);
        const affiliatesList = affiliatesSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter((member: any) => member.role === "affiliate" || member.role === "consultant" || member.role === "strategic-partner");
        setAffiliates(affiliatesList);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load opportunity");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [params.id, router]);

  const updateField = (field: keyof OpportunityForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleStageChange = (stage: string) => {
    const stageInfo = stages.find(s => s.value === stage);
    setForm(prev => ({
      ...prev,
      stage,
      probability: stageInfo?.probability.toString() || prev.probability,
    }));
  };

  const handleAffiliateSelect = (affiliateId: string) => {
    if (!affiliateId) {
      setForm(prev => ({
        ...prev,
        affiliateId: "",
        affiliateName: "",
        affiliateEmail: "",
        affiliatePhone: "",
        affiliateCompany: "",
      }));
      return;
    }

    const affiliate = affiliates.find(a => a.id === affiliateId);
    if (affiliate) {
      setForm(prev => ({
        ...prev,
        affiliateId: affiliate.id,
        affiliateName: `${affiliate.firstName} ${affiliate.lastName}`,
        affiliateEmail: affiliate.email || "",
        affiliatePhone: affiliate.phone || "",
        affiliateCompany: affiliate.company || "",
      }));
    }
  };

  const toggleSubscription = (checked: boolean) => {
    setForm(prev => ({
      ...prev,
      isSubscription: checked,
      value: checked ? "" : prev.value,
      monthlyAmount: checked ? prev.monthlyAmount : "",
    }));
  };

  const calculateSubscriptionValue = (): number => {
    const monthly = parseFloat(form.monthlyAmount) || 0;
    const term = parseInt(form.subscriptionTermMonths) || 12;
    return monthly * term;
  };

  const getEffectiveDealValue = (): number => {
    if (form.isSubscription) {
      return calculateSubscriptionValue();
    }
    return parseFloat(form.value) || 0;
  };

  const addDeliverable = () => {
    if (newDeliverable.trim()) {
      setForm(prev => ({
        ...prev,
        deliverables: [...prev.deliverables, newDeliverable.trim()],
      }));
      setNewDeliverable("");
    }
  };

  const removeDeliverable = (index: number) => {
    setForm(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index),
    }));
  };

  const enhanceDescription = async () => {
    if (!form.description.trim()) {
      toast.error("Please enter some description text first");
      return;
    }

    setIsEnhancingDescription(true);
    try {
      const response = await fetch("/api/ai/enhance-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: form.description,
          context: "opportunity_description",
          opportunityName: form.name,
          organizationName: form.organizationName,
        }),
      });

      const data = await response.json();
      if (data.success && data.enhancedText) {
        updateField("description", data.enhancedText);
        toast.success("Description enhanced!");
      } else {
        toast.error(data.error || "Failed to enhance description");
      }
    } catch (error) {
      console.error("Error enhancing description:", error);
      toast.error("Failed to enhance description");
    } finally {
      setIsEnhancingDescription(false);
    }
  };

  const enhanceNotes = async () => {
    if (!form.notes.trim()) {
      toast.error("Please enter some notes text first");
      return;
    }

    setIsEnhancingNotes(true);
    try {
      const response = await fetch("/api/ai/enhance-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: form.notes,
          context: "opportunity_notes",
          opportunityName: form.name,
          organizationName: form.organizationName,
        }),
      });

      const data = await response.json();
      if (data.success && data.enhancedText) {
        updateField("notes", data.enhancedText);
        toast.success("Notes enhanced!");
      } else {
        toast.error(data.error || "Failed to enhance notes");
      }
    } catch (error) {
      console.error("Error enhancing notes:", error);
      toast.error("Failed to enhance notes");
    } finally {
      setIsEnhancingNotes(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter an opportunity name");
      return;
    }
    if (!db || !params.id) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, COLLECTIONS.OPPORTUNITIES, params.id as string);
      
      await updateDoc(docRef, {
        name: form.name,
        organizationName: form.organizationName,
        description: form.description,
        notes: form.notes,
        stage: form.stage,
        value: getEffectiveDealValue(),
        probability: parseInt(form.probability) || 0,
        expectedCloseDate: form.expectedCloseDate ? Timestamp.fromDate(new Date(form.expectedCloseDate)) : null,
        isSubscription: form.isSubscription,
        monthlyAmount: form.isSubscription ? (parseFloat(form.monthlyAmount) || 0) : null,
        subscriptionTermMonths: form.isSubscription ? (parseInt(form.subscriptionTermMonths) || 12) : null,
        affiliateId: form.affiliateId || null,
        affiliateName: form.affiliateName || null,
        affiliateEmail: form.affiliateEmail || null,
        affiliatePhone: form.affiliatePhone || null,
        affiliateCompany: form.affiliateCompany || null,
        deliverables: form.deliverables,
        updatedAt: Timestamp.now(),
      });

      toast.success("Opportunity updated successfully");
      router.push(`/portal/opportunities/${params.id}`);
    } catch (error) {
      console.error("Error updating opportunity:", error);
      toast.error("Failed to update opportunity");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/portal/opportunities/${params.id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Opportunity</h1>
          <p className="text-muted-foreground">Update opportunity details</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Opportunity Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Opportunity Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
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
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notes">Notes</Label>
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
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Deal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Deal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stage">Stage</Label>
                  <Select value={form.stage} onValueChange={handleStageChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label} ({stage.probability}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedClose">Expected Close Date</Label>
                  <Input
                    id="expectedClose"
                    type="date"
                    value={form.expectedCloseDate}
                    onChange={(e) => updateField("expectedCloseDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <Checkbox
                  id="isSubscription"
                  checked={form.isSubscription}
                  onCheckedChange={toggleSubscription}
                />
                <Label htmlFor="isSubscription" className="flex items-center gap-2 cursor-pointer">
                  <RefreshCw className="h-4 w-4" />
                  This is a subscription/recurring revenue deal
                </Label>
              </div>

              {form.isSubscription ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyAmount">Monthly Amount ($)</Label>
                    <Input
                      id="monthlyAmount"
                      type="number"
                      placeholder="0"
                      value={form.monthlyAmount}
                      onChange={(e) => updateField("monthlyAmount", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="term">Subscription Term</Label>
                    <Select value={form.subscriptionTermMonths} onValueChange={(v) => updateField("subscriptionTermMonths", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptionTermOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="value">Deal Value ($)</Label>
                  <Input
                    id="value"
                    type="number"
                    placeholder="0"
                    value={form.value}
                    onChange={(e) => updateField("value", e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Affiliate as Client */}
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
                <Label>Select Affiliate Client</Label>
                <Select value={form.affiliateId || "none"} onValueChange={(v) => handleAffiliateSelect(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an affiliate client..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (External Client)</SelectItem>
                    {affiliates.map((affiliate) => (
                      <SelectItem key={affiliate.id} value={affiliate.id}>
                        {affiliate.firstName} {affiliate.lastName}
                        {affiliate.company && ` - ${affiliate.company}`}
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

          {/* Deliverables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Deliverables
              </CardTitle>
              <CardDescription>List the deliverables for this opportunity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a deliverable..."
                  value={newDeliverable}
                  onChange={(e) => setNewDeliverable(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDeliverable())}
                />
                <Button type="button" onClick={addDeliverable} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {form.deliverables.length > 0 && (
                <ul className="space-y-2">
                  {form.deliverables.map((item, index) => (
                    <li key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <span>{item}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeDeliverable(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
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
                Save Changes
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/portal/opportunities/${params.id}`}>
                  Cancel
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.isSubscription && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4" />
                  Subscription Deal
                </div>
              )}
              {form.isSubscription ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monthly</span>
                    <span className="font-medium">
                      ${parseFloat(form.monthlyAmount || "0").toLocaleString()}/mo
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Term</span>
                    <span className="font-medium">{form.subscriptionTermMonths} months</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">Total Contract Value</span>
                    <span className="font-bold">${calculateSubscriptionValue().toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deal Value</span>
                  <span className="font-bold">${parseFloat(form.value || "0").toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Probability</span>
                <span className="font-medium">{form.probability}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Weighted Value</span>
                <span className="font-medium">
                  ${Math.round(getEffectiveDealValue() * (parseInt(form.probability) / 100)).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
