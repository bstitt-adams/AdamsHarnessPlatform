"use client";

import { useState } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Network,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Users,
  Target,
  MapPin,
  Briefcase,
  Sparkles,
  Loader2,
  Globe,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

// Industry options
const industryOptions = [
  "Manufacturing",
  "Technology",
  "Healthcare",
  "Finance",
  "Retail",
  "Construction",
  "Professional Services",
  "Education",
  "Government",
  "Non-Profit",
  "Other",
];

// Geographic focus options
const geographicOptions = [
  { id: "local", name: "Local (City/Metro)", icon: "📍" },
  { id: "regional", name: "Regional (State/Multi-State)", icon: "🗺️" },
  { id: "national", name: "National (USA)", icon: "🇺🇸" },
  { id: "international", name: "International", icon: "🌍" },
];

// Meeting frequency options
const meetingFrequencyOptions = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

// Networking goals options
const networkingGoalOptions = [
  { id: "referrals", name: "Generate Referrals", icon: Target },
  { id: "partnerships", name: "Build Partnerships", icon: Users },
  { id: "knowledge", name: "Share Knowledge", icon: Sparkles },
  { id: "clients", name: "Find New Clients", icon: Briefcase },
  { id: "expand", name: "Expand Geographic Reach", icon: Globe },
  { id: "learn", name: "Learn from Others", icon: Building2 },
];

const steps = [
  { id: 1, title: "Business Info", icon: Building2 },
  { id: 2, title: "Target Market", icon: Target },
  { id: 3, title: "Networking Goals", icon: Network },
  { id: 4, title: "Value Proposition", icon: Sparkles },
  { id: 5, title: "Complete", icon: CheckCircle },
];

export function NetworkingWizard() {
  const { 
    profile, 
    updateProfile, 
    linkedTeamMember,
    showNetworkingWizard, 
    setShowNetworkingWizard 
  } = useUserProfile();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    // Business Info
    businessType: profile.networkingProfile.businessType || "",
    industry: profile.networkingProfile.industry || [],
    servicesOffered: profile.networkingProfile.servicesOffered || "",
    
    // Target Market
    targetCustomers: profile.networkingProfile.targetCustomers || "",
    targetClientProfile: profile.networkingProfile.targetClientProfile || "",
    geographicFocus: profile.networkingProfile.geographicFocus || [],
    
    // Networking Goals
    networkingGoals: profile.networkingProfile.networkingGoals || [],
    meetingFrequency: profile.networkingProfile.meetingFrequency || "monthly",
    idealReferralPartner: profile.networkingProfile.idealReferralPartner || "",
    topReferralSources: profile.networkingProfile.topReferralSources || "",
    
    // Value Proposition
    uniqueValueProposition: profile.networkingProfile.uniqueValueProposition || "",
    problemsYouSolve: profile.networkingProfile.problemsYouSolve || "",
    successStory: profile.networkingProfile.successStory || "",
  });

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: string, item: string) => {
    const currentArray = formData[field as keyof typeof formData] as string[];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i) => i !== item)
      : [...currentArray, item];
    handleChange(field, newArray);
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    
    try {
      // Update local profile state
      const updatedNetworkingProfile = {
        ...profile.networkingProfile,
        ...formData,
      };
      
      updateProfile({
        networkingProfile: updatedNetworkingProfile,
      });

      // If linked to a team member, save to Firebase
      if (linkedTeamMember && db) {
        const teamMemberRef = doc(db, COLLECTIONS.TEAM_MEMBERS, linkedTeamMember.id);
        await updateDoc(teamMemberRef, {
          networkingProfile: updatedNetworkingProfile,
          updatedAt: Timestamp.now(),
        });
        console.log("Networking profile saved to Firebase");
      }

      toast.success("Networking profile updated successfully!");
      setShowNetworkingWizard(false);
    } catch (error) {
      console.error("Error saving networking profile:", error);
      toast.error("Failed to save networking profile");
    } finally {
      setIsSaving(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.businessType.trim() !== "" && formData.industry.length > 0;
      case 2:
        return formData.targetCustomers.trim() !== "" && formData.geographicFocus.length > 0;
      case 3:
        return formData.networkingGoals.length > 0 && formData.idealReferralPartner.trim() !== "";
      case 4:
        return formData.uniqueValueProposition.trim() !== "" && formData.problemsYouSolve.trim() !== "";
      case 5:
        return true;
      default:
        return true;
    }
  };

  return (
    <Dialog open={showNetworkingWizard} onOpenChange={setShowNetworkingWizard}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Network className="h-5 w-5 text-white" />
            </div>
            Networking Profile Setup
          </DialogTitle>
          <DialogDescription>
            Complete your networking profile to help other members understand how to refer business to you.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 ${isCompleted ? "bg-green-500" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {/* Step 1: Business Info */}
            {currentStep === 1 && (
              <div className="space-y-6 px-2">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold">Business Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Tell us about your business and services
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business Type *</Label>
                    <Input
                      id="businessType"
                      value={formData.businessType}
                      onChange={(e) => handleChange("businessType", e.target.value)}
                      placeholder="e.g., Consulting Firm, Manufacturing Company, Service Provider"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Industry Focus * (select all that apply)</Label>
                    <div className="flex flex-wrap gap-2">
                      {industryOptions.map((industry) => (
                        <Badge
                          key={industry}
                          variant={formData.industry.includes(industry) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleArrayItem("industry", industry)}
                        >
                          {formData.industry.includes(industry) && (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="servicesOffered">Services Offered</Label>
                    <Textarea
                      id="servicesOffered"
                      value={formData.servicesOffered}
                      onChange={(e) => handleChange("servicesOffered", e.target.value)}
                      placeholder="Describe the main services you offer..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Target Market */}
            {currentStep === 2 && (
              <div className="space-y-6 px-2">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold">Target Market</h3>
                  <p className="text-sm text-muted-foreground">
                    Who are your ideal customers?
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetCustomers">Target Customers *</Label>
                    <Textarea
                      id="targetCustomers"
                      value={formData.targetCustomers}
                      onChange={(e) => handleChange("targetCustomers", e.target.value)}
                      placeholder="Describe your ideal customer profile (company size, industry, needs)..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetClientProfile">Ideal Client Profile</Label>
                    <Textarea
                      id="targetClientProfile"
                      value={formData.targetClientProfile}
                      onChange={(e) => handleChange("targetClientProfile", e.target.value)}
                      placeholder="What does your perfect client look like?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Geographic Focus * (select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {geographicOptions.map((geo) => (
                        <button
                          key={geo.id}
                          onClick={() => toggleArrayItem("geographicFocus", geo.id)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            formData.geographicFocus.includes(geo.id)
                              ? "border-primary bg-primary/10"
                              : "border-muted hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{geo.icon}</span>
                            <span className="text-sm font-medium">{geo.name}</span>
                            {formData.geographicFocus.includes(geo.id) && (
                              <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Networking Goals */}
            {currentStep === 3 && (
              <div className="space-y-6 px-2">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold">Networking Goals</h3>
                  <p className="text-sm text-muted-foreground">
                    What do you want to achieve through networking?
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Your Networking Goals * (select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {networkingGoalOptions.map((goal) => {
                        const Icon = goal.icon;
                        return (
                          <button
                            key={goal.id}
                            onClick={() => toggleArrayItem("networkingGoals", goal.id)}
                            className={`p-3 rounded-lg border text-left transition-colors ${
                              formData.networkingGoals.includes(goal.id)
                                ? "border-primary bg-primary/10"
                                : "border-muted hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="text-sm font-medium">{goal.name}</span>
                              {formData.networkingGoals.includes(goal.id) && (
                                <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meetingFrequency">Preferred Meeting Frequency</Label>
                    <Select
                      value={formData.meetingFrequency}
                      onValueChange={(v) => handleChange("meetingFrequency", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {meetingFrequencyOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idealReferralPartner">Ideal Referral Partner *</Label>
                    <Textarea
                      id="idealReferralPartner"
                      value={formData.idealReferralPartner}
                      onChange={(e) => handleChange("idealReferralPartner", e.target.value)}
                      placeholder="Describe the type of person who would be a great referral partner for you..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topReferralSources">Top Referral Sources</Label>
                    <Textarea
                      id="topReferralSources"
                      value={formData.topReferralSources}
                      onChange={(e) => handleChange("topReferralSources", e.target.value)}
                      placeholder="Where do your best referrals typically come from?"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Value Proposition */}
            {currentStep === 4 && (
              <div className="space-y-6 px-2">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold">Your Value Proposition</h3>
                  <p className="text-sm text-muted-foreground">
                    Help others understand what makes you unique
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="uniqueValueProposition">Unique Value Proposition *</Label>
                    <Textarea
                      id="uniqueValueProposition"
                      value={formData.uniqueValueProposition}
                      onChange={(e) => handleChange("uniqueValueProposition", e.target.value)}
                      placeholder="What makes you different from others in your field?"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="problemsYouSolve">Problems You Solve *</Label>
                    <Textarea
                      id="problemsYouSolve"
                      value={formData.problemsYouSolve}
                      onChange={(e) => handleChange("problemsYouSolve", e.target.value)}
                      placeholder="What are the main challenges you help clients overcome?"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="successStory">Success Story</Label>
                    <Textarea
                      id="successStory"
                      value={formData.successStory}
                      onChange={(e) => handleChange("successStory", e.target.value)}
                      placeholder="Share a brief success story that demonstrates your value..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {currentStep === 5 && (
              <div className="space-y-6 px-2">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Profile Complete!</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your networking profile is ready. Other members can now find you and understand how to refer business to you.
                  </p>
                </div>

                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Profile Summary:</h4>
                    <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 mt-0.5" />
                        <span><strong>Business:</strong> {formData.businessType}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Target className="h-4 w-4 mt-0.5" />
                        <span><strong>Industries:</strong> {formData.industry.join(", ")}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <span><strong>Geographic Focus:</strong> {formData.geographicFocus.map((g: string) => 
                          geographicOptions.find(o => o.id === g)?.name
                        ).join(", ")}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Network className="h-4 w-4 mt-0.5" />
                        <span><strong>Goals:</strong> {formData.networkingGoals.map((g: string) => 
                          networkingGoalOptions.find(o => o.id === g)?.name
                        ).join(", ")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {steps.length}
          </div>
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={!isStepValid()}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleComplete} className="bg-blue-600 hover:bg-blue-700" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
