"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Handshake } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS, type ReferralDoc } from "@/lib/schema";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/user-profile-context";

interface CreateReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId?: string;
  recipientName?: string;
  sourceContext?: "affiliates" | "networking" | "deals";
  oneToOneMeetingId?: string;
  onSuccess?: () => void;
}

const commissionTiers = [
  { level: "referral", name: "Referral Only", rate: 7, description: "Simple introduction" },
  { level: "assist", name: "Assist Sales", rate: 12, description: "Help warm the lead" },
  { level: "co-sell", name: "Co-Sell & Close", rate: 17, description: "Support sales process" },
];

interface ReferralForm {
  prospectName: string;
  prospectCompany: string;
  prospectEmail: string;
  prospectPhone: string;
  estimatedValue: string;
  commissionTier: string;
  adamsServiceInterest: string;
  description: string;
  whyGoodFit: string;
  referralType: string;
  isAdamsReferral: boolean;
}

const emptyForm: ReferralForm = {
  prospectName: "",
  prospectCompany: "",
  prospectEmail: "",
  prospectPhone: "",
  estimatedValue: "",
  commissionTier: "referral",
  adamsServiceInterest: "",
  description: "",
  whyGoodFit: "",
  referralType: "short-term",
  isAdamsReferral: true,
};

export function CreateReferralDialog({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  sourceContext = "deals",
  oneToOneMeetingId,
  onSuccess,
}: CreateReferralDialogProps) {
  const { profile, linkedTeamMember } = useUserProfile();
  const [form, setForm] = useState<ReferralForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.prospectName || !form.prospectCompany) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSaving(true);
    try {
      if (!db) throw new Error("Database not available");

      const referrerId = linkedTeamMember?.id || profile.id || "unknown";
      const referrerName = linkedTeamMember 
        ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}`
        : `${profile.firstName} ${profile.lastName}`;

      const dealData: Omit<ReferralDoc, "id"> = {
        referrerId,
        referrerName,
        recipientId: recipientId || "adams",
        recipientName: recipientName || "Adams Electric",
        prospectName: form.prospectName,
        prospectCompany: form.prospectCompany,
        prospectEmail: form.prospectEmail || undefined,
        prospectPhone: form.prospectPhone || undefined,
        description: form.description,
        whyGoodFit: form.whyGoodFit || undefined,
        referralType: form.referralType as "short-term" | "long-term",
        isAdamsReferral: form.isAdamsReferral,
        adamsServiceInterest: form.adamsServiceInterest.split(",").map(s => s.trim()).filter(s => s),
        status: "submitted",
        commissionTier: form.commissionTier as "referral" | "assist" | "co-sell",
        estimatedValue: parseFloat(form.estimatedValue) || 0,
        contactAttempts: 0,
        oneToOneMeetingId: oneToOneMeetingId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const dealsRef = collection(db, COLLECTIONS.REFERRALS);
      await addDoc(dealsRef, dealData);
      
      toast.success("Referral submitted successfully!");
      setForm(emptyForm);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating referral:", error);
      toast.error("Failed to create referral");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setForm(emptyForm);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            Submit a Referral
          </DialogTitle>
          <DialogDescription>
            {recipientName 
              ? `Create a referral for ${recipientName}`
              : "Submit a new referral to track commissions"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label htmlFor="prospectCompany">Company Name *</Label>
            <Input
              id="prospectCompany"
              placeholder="Enter company name"
              value={form.prospectCompany}
              onChange={(e) => setForm({ ...form, prospectCompany: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prospectName">Contact Name *</Label>
              <Input
                id="prospectName"
                placeholder="Contact name"
                value={form.prospectName}
                onChange={(e) => setForm({ ...form, prospectName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prospectEmail">Contact Email</Label>
              <Input
                id="prospectEmail"
                type="email"
                placeholder="email@company.com"
                value={form.prospectEmail}
                onChange={(e) => setForm({ ...form, prospectEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
              <Input
                id="estimatedValue"
                type="number"
                placeholder="0"
                value={form.estimatedValue}
                onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier">Commission Tier</Label>
              <Select
                value={form.commissionTier}
                onValueChange={(v) => setForm({ ...form, commissionTier: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {commissionTiers.map((tier) => (
                    <SelectItem key={tier.level} value={tier.level}>
                      {tier.name} ({tier.rate}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="referralType">Referral Type</Label>
              <Select
                value={form.referralType}
                onValueChange={(v) => setForm({ ...form, referralType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short-term">Short-term</SelectItem>
                  <SelectItem value="long-term">Long-term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="isAdamsReferral">Referral To</Label>
              <Select
                value={form.isAdamsReferral ? "adams" : "affiliate"}
                onValueChange={(v) => setForm({ ...form, isAdamsReferral: v === "adams" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adams">Adams Electric</SelectItem>
                  <SelectItem value="affiliate">Another Affiliate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adamsServiceInterest">Services Interested In</Label>
            <Input
              id="adamsServiceInterest"
              placeholder="e.g., ISO 9001, Lean Manufacturing, Digital Transformation"
              value={form.adamsServiceInterest}
              onChange={(e) => setForm({ ...form, adamsServiceInterest: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Separate multiple services with commas</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the referral opportunity..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whyGoodFit">Why is this a good fit?</Label>
            <Textarea
              id="whyGoodFit"
              placeholder="Explain why this prospect would benefit..."
              value={form.whyGoodFit}
              onChange={(e) => setForm({ ...form, whyGoodFit: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Submit Referral
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
