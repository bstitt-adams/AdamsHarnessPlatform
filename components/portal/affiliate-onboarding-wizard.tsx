"use client";

import { useState } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp, doc, setDoc } from "firebase/firestore";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Handshake,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Users,
  Target,
  MessageSquare,
  Calendar,
  DollarSign,
  FileText,
  Star,
  Lightbulb,
  Award,
  Loader2,
} from "lucide-react";

// Circular progress component
function CircularProgress({ percentage, size = 100, strokeWidth = 8 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold">{percentage}%</span>
      </div>
    </div>
  );
}

// Affiliate categories for expertise selection
const affiliateCategories = [
  { id: "manufacturing", name: "Manufacturing Operations", icon: "🏭" },
  { id: "quality", name: "Quality & ISO", icon: "✅" },
  { id: "technology", name: "Technology & AI", icon: "🤖" },
  { id: "finance", name: "Finance & Accounting", icon: "💰" },
  { id: "sales", name: "Sales & Marketing", icon: "📈" },
  { id: "hr", name: "HR & Workforce", icon: "👥" },
  { id: "supply-chain", name: "Supply Chain", icon: "🔗" },
  { id: "international", name: "International Business", icon: "🌍" },
];

// Affiliate commitment items
const affiliateCommitments = [
  {
    icon: Calendar,
    title: "Monthly Networking Meetings",
    description: "Attend at least 2 affiliate networking meetings per month",
  },
  {
    icon: Users,
    title: "One-to-One Meetings",
    description: "Complete at least 4 One-to-One meetings with other affiliates monthly",
  },
  {
    icon: Target,
    title: "Referral Generation",
    description: "Actively identify and refer qualified leads to the Adams network",
  },
  {
    icon: MessageSquare,
    title: "Communication",
    description: "Respond to referral requests and communications within 24-48 hours",
  },
  {
    icon: DollarSign,
    title: "Revenue Sharing",
    description: "Participate in the Adams revenue sharing model as outlined in your agreement",
  },
  {
    icon: Award,
    title: "Professional Standards",
    description: "Maintain professional standards and represent Adams values in all interactions",
  },
];

const steps = [
  { id: 1, title: "Welcome", icon: Handshake },
  { id: 2, title: "Commitments", icon: FileText },
  { id: 3, title: "Your Expertise", icon: Star },
  { id: 4, title: "Networking Profile", icon: Users },
  { id: 5, title: "Ready to Connect", icon: MessageSquare },
];

export function AffiliateOnboardingWizard() {
  const { profile, updateProfile, saveProfileToFirestore, linkedTeamMember, networkingCompletion, showAffiliateOnboarding, setShowAffiliateOnboarding } = useUserProfile();
  const [currentStep, setCurrentStep] = useState(1);
  const [acknowledgedCommitments, setAcknowledgedCommitments] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(profile.networkingProfile.categories || []);
  const [expertise, setExpertise] = useState<string>(profile.networkingProfile.expertise.join(", ") || "");
  const [networkingData, setNetworkingData] = useState({
    idealReferralPartner: profile.networkingProfile.idealReferralPartner || "",
    topReferralSources: profile.networkingProfile.topReferralSources || "",
    goalsThisQuarter: profile.networkingProfile.goalsThisQuarter || "",
    uniqueValueProposition: profile.networkingProfile.uniqueValueProposition || "",
    targetClientProfile: profile.networkingProfile.targetClientProfile || "",
    problemsYouSolve: profile.networkingProfile.problemsYouSolve || "",
    successStory: profile.networkingProfile.successStory || "",
  });

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleNetworkingChange = (field: string, value: string) => {
    setNetworkingData((prev) => ({ ...prev, [field]: value }));
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

  const [isSaving, setIsSaving] = useState(false);

  const handleComplete = async () => {
    setIsSaving(true);
    
    try {
      // If already linked to a team member, update their profile
      if (linkedTeamMember) {
        // Update the existing team member's expertise field
        await saveProfileToFirestore({
          bio: profile.bio,
        });
        
        console.log("Updated existing Team Member:", linkedTeamMember.id);
        
        // Update local profile state
        updateProfile({
          affiliateOnboardingComplete: true,
          networkingProfile: {
            ...profile.networkingProfile,
            categories: selectedCategories,
            expertise: expertise.split(",").map((e) => e.trim()).filter((e) => e),
            ...networkingData,
          },
        });
        
        setShowAffiliateOnboarding(false);
        return;
      }
      
      // Create new Team Member document in Firebase (for users not yet linked)
      const teamMemberData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        emailPrimary: profile.email,
        mobile: profile.phone || "",
        expertise: expertise,
        title: profile.jobTitle || "",
        company: profile.company || "",
        location: profile.location || "",
        bio: profile.bio || "",
        avatar: profile.avatarUrl || "",
        linkedIn: "",
        website: "",
        role: "affiliate" as const,
        status: "active" as const,
        // Networking profile data
        networkingProfile: {
          categories: selectedCategories,
          expertise: expertise.split(",").map((e) => e.trim()).filter((e) => e),
          ...networkingData,
        },
        affiliateOnboardingComplete: true,
        affiliateAgreementSigned: true,
        affiliateAgreementDate: new Date().toISOString(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Save to Firebase team_members collection
      if (!db) {
        throw new Error("Firebase not initialized");
      }
      const teamMembersRef = collection(db, "team_members");
      const docRef = await addDoc(teamMembersRef, teamMemberData);
      
      console.log("Team Member created with ID:", docRef.id);

      // Update local profile state
      updateProfile({
        id: docRef.id,
        affiliateOnboardingComplete: true,
        networkingProfile: {
          ...profile.networkingProfile,
          categories: selectedCategories,
          expertise: expertise.split(",").map((e) => e.trim()).filter((e) => e),
          ...networkingData,
        },
      });
      
      setShowAffiliateOnboarding(false);
    } catch (error) {
      console.error("Error saving affiliate data to Firebase:", error);
      // Still update local state even if Firebase fails
      updateProfile({
        affiliateOnboardingComplete: true,
        networkingProfile: {
          ...profile.networkingProfile,
          categories: selectedCategories,
          expertise: expertise.split(",").map((e) => e.trim()).filter((e) => e),
          ...networkingData,
        },
      });
      setShowAffiliateOnboarding(false);
    } finally {
      setIsSaving(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return acknowledgedCommitments;
      case 3:
        return selectedCategories.length > 0 && expertise.trim() !== "";
      case 4:
        return (
          networkingData.idealReferralPartner.trim() !== "" &&
          networkingData.uniqueValueProposition.trim() !== "" &&
          networkingData.problemsYouSolve.trim() !== ""
        );
      case 5:
        return true;
      default:
        return true;
    }
  };

  const getStepProgress = () => {
    return Math.round((currentStep / steps.length) * 100);
  };

  return (
    <Dialog open={showAffiliateOnboarding} onOpenChange={setShowAffiliateOnboarding}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
              <Handshake className="h-5 w-5 text-white" />
            </div>
            Affiliate Onboarding
          </DialogTitle>
          <DialogDescription>
            Welcome to the Adams Affiliate Network! Let&apos;s get you set up for success.
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
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="space-y-6 px-2">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Handshake className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Welcome to the Adams Affiliate Network!</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Thank you for joining Adams Electric as an affiliate partner. This onboarding process will help you understand your commitments and set up your networking profile.
                  </p>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-sky-500 mt-0.5" />
                      <div>
                        <p className="font-medium">What to expect:</p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                          <li>• Review your affiliate commitments</li>
                          <li>• Set up your expertise and categories</li>
                          <li>• Complete your networking profile for One-to-Ones</li>
                          <li>• Get ready to connect with other affiliates</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {profile.affiliateAgreementDate && (
                  <p className="text-sm text-center text-muted-foreground">
                    Agreement signed on: {new Date(profile.affiliateAgreementDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Commitments */}
            {currentStep === 2 && (
              <div className="space-y-4 px-2">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold">Your Affiliate Commitments</h3>
                  <p className="text-sm text-muted-foreground">
                    As an Adams affiliate, you&apos;ve agreed to the following commitments:
                  </p>
                </div>

                <div className="grid gap-3">
                  {affiliateCommitments.map((commitment, index) => {
                    const Icon = commitment.icon;
                    return (
                      <Card key={index} className="bg-muted/30">
                        <CardContent className="p-4 flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{commitment.title}</p>
                            <p className="text-sm text-muted-foreground">{commitment.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-2 pt-4 border-t">
                  <Checkbox
                    id="acknowledge"
                    checked={acknowledgedCommitments}
                    onCheckedChange={(checked) => setAcknowledgedCommitments(checked as boolean)}
                  />
                  <Label htmlFor="acknowledge" className="text-sm">
                    I understand and acknowledge my commitments as an Adams affiliate
                  </Label>
                </div>
              </div>
            )}

            {/* Step 3: Expertise */}
            {currentStep === 3 && (
              <div className="space-y-6 px-2">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold">Your Areas of Expertise</h3>
                  <p className="text-sm text-muted-foreground">
                    Select the categories that best describe your services
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {affiliateCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryToggle(category.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedCategories.includes(category.id)
                          ? "border-primary bg-primary/10"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.icon}</span>
                        <span className="text-sm font-medium">{category.name}</span>
                        {selectedCategories.includes(category.id) && (
                          <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expertise">Specific Expertise (comma separated) *</Label>
                  <Input
                    id="expertise"
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    placeholder="e.g., Six Sigma, ISO 9001, Lean Manufacturing, AI Implementation"
                  />
                  <p className="text-xs text-muted-foreground">
                    List your specific skills and certifications
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Networking Profile */}
            {currentStep === 4 && (
              <div className="space-y-4 px-2">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold">Your Networking Profile</h3>
                  <p className="text-sm text-muted-foreground">
                    This information helps other affiliates understand how to refer business to you
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="idealReferralPartner">Who is your ideal referral partner? *</Label>
                    <Textarea
                      id="idealReferralPartner"
                      value={networkingData.idealReferralPartner}
                      onChange={(e) => handleNetworkingChange("idealReferralPartner", e.target.value)}
                      placeholder="Describe the type of affiliate who would be a great referral partner for you..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uniqueValueProposition">What is your unique value proposition? *</Label>
                    <Textarea
                      id="uniqueValueProposition"
                      value={networkingData.uniqueValueProposition}
                      onChange={(e) => handleNetworkingChange("uniqueValueProposition", e.target.value)}
                      placeholder="What makes you different from others in your field?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="problemsYouSolve">What problems do you solve for clients? *</Label>
                    <Textarea
                      id="problemsYouSolve"
                      value={networkingData.problemsYouSolve}
                      onChange={(e) => handleNetworkingChange("problemsYouSolve", e.target.value)}
                      placeholder="Describe the main challenges you help clients overcome..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetClientProfile">Describe your ideal client</Label>
                    <Textarea
                      id="targetClientProfile"
                      value={networkingData.targetClientProfile}
                      onChange={(e) => handleNetworkingChange("targetClientProfile", e.target.value)}
                      placeholder="Industry, company size, specific needs..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goalsThisQuarter">What are your goals this quarter?</Label>
                    <Textarea
                      id="goalsThisQuarter"
                      value={networkingData.goalsThisQuarter}
                      onChange={(e) => handleNetworkingChange("goalsThisQuarter", e.target.value)}
                      placeholder="What do you hope to achieve through the affiliate network?"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Ready to Connect */}
            {currentStep === 5 && (
              <div className="space-y-6 px-2">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">You&apos;re All Set!</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your affiliate onboarding is complete. You&apos;re now ready to start networking with other affiliates.
                  </p>
                </div>

                <div className="flex justify-center">
                  <CircularProgress percentage={networkingCompletion} />
                </div>

                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Next Steps:</h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Browse the affiliate directory
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Schedule your first One-to-One meeting
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Attend the next affiliate networking event
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Complete your full profile in Settings
                      </li>
                    </ul>
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
              <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Onboarding
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
