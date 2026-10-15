"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Users,
  Plus,
  Trash2,
  CheckCircle,
  Info,
  Target,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, query, where, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";
import { logAffiliateProfileUpdated } from "@/lib/activity-logger";

interface ContactSphereMember {
  name: string;
  profession: string;
  company: string;
}

interface TopProfession {
  profession: string;
  description: string;
}

interface ContactSphereForm {
  sphereName: string;
  members: ContactSphereMember[];
  topProfessions: TopProfession[];
  commitment: string;
}

const emptyMember: ContactSphereMember = { name: "", profession: "", company: "" };
const emptyProfession: TopProfession = { profession: "", description: "" };

const initialForm: ContactSphereForm = {
  sphereName: "",
  members: Array(10).fill(null).map(() => ({ ...emptyMember })),
  topProfessions: Array(3).fill(null).map(() => ({ ...emptyProfession })),
  commitment: "",
};

// Temporary user ID until auth is implemented
const TEMP_USER_ID = "current-user";

export default function ContactSpherePage() {
  const [form, setForm] = useState<ContactSphereForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);

  // Load existing data on mount
  useEffect(() => {
    const loadContactSphere = async () => {
      if (!db) {
        setIsLoading(false);
        return;
      }
      
      try {
        const q = query(
          collection(db, COLLECTIONS.CONTACT_SPHERES),
          where("affiliateId", "==", TEMP_USER_ID)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0];
          setDocId(docData.id);
          const data = docData.data();
          
          // Map members from Firebase format
          const members = Array(10).fill(null).map((_, i) => {
            const member = data.members?.[i];
            return {
              name: member?.name || "",
              profession: member?.profession || "",
              company: member?.company || "",
            };
          });
          
          // Map professions from Firebase format
          const topProfessions = Array(3).fill(null).map((_, i) => {
            const prof = data.topProfessionsNeeded?.[i];
            return {
              profession: prof?.profession || "",
              description: prof?.description || "",
            };
          });
          
          setForm({
            sphereName: data.sphereName || "",
            members,
            topProfessions,
            commitment: data.commitment || "",
          });
        }
      } catch (error) {
        console.error("Error loading contact sphere:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadContactSphere();
  }, []);

  const updateSphereName = (value: string) => {
    setForm((prev) => ({ ...prev, sphereName: value }));
    setSaveSuccess(false);
  };

  const updateMember = (index: number, field: keyof ContactSphereMember, value: string) => {
    setForm((prev) => {
      const newMembers = [...prev.members];
      newMembers[index] = { ...newMembers[index], [field]: value };
      return { ...prev, members: newMembers };
    });
    setSaveSuccess(false);
  };

  const updateProfession = (index: number, field: keyof TopProfession, value: string) => {
    setForm((prev) => {
      const newProfessions = [...prev.topProfessions];
      newProfessions[index] = { ...newProfessions[index], [field]: value };
      return { ...prev, topProfessions: newProfessions };
    });
    setSaveSuccess(false);
  };

  const updateCommitment = (value: string) => {
    setForm((prev) => ({ ...prev, commitment: value }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!db) return;
    
    setIsSaving(true);
    try {
      // Filter out empty members and professions
      const filledMembers = form.members.filter(m => m.name.trim());
      const filledProfessions = form.topProfessions.filter(p => p.profession.trim());
      
      const contactSphereData = {
        affiliateId: TEMP_USER_ID,
        sphereName: form.sphereName,
        members: filledMembers.map(m => ({
          name: m.name,
          profession: m.profession || undefined,
          company: m.company || undefined,
        })),
        topProfessionsNeeded: filledProfessions.map(p => ({
          profession: p.profession,
          description: p.description || undefined,
        })),
        commitment: form.commitment || undefined,
        updatedAt: Timestamp.now(),
      };
      
      const documentId = docId || `sphere_${TEMP_USER_ID}`;
      const docRef = doc(db, COLLECTIONS.CONTACT_SPHERES, documentId);
      
      await setDoc(docRef, {
        ...contactSphereData,
        createdAt: docId ? undefined : Timestamp.now(),
      }, { merge: true });
      
      if (!docId) {
        setDocId(documentId);
      }
      
      // Log activity
      await logAffiliateProfileUpdated(TEMP_USER_ID, form.sphereName || "Affiliate", "Contact Sphere");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving contact sphere:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const filledMembers = form.members.filter((m) => m.name.trim() !== "").length;
  const filledProfessions = form.topProfessions.filter((p) => p.profession.trim() !== "").length;
  const hasSphereName = form.sphereName.trim() !== "";
  const hasCommitment = form.commitment.trim() !== "";
  const completionPercent = Math.round(
    ((filledMembers / 10) * 40 + (filledProfessions / 3) * 30 + (hasSphereName ? 15 : 0) + (hasCommitment ? 15 : 0))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading contact sphere...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/portal/networking/profile">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Contact Sphere Planning</h1>
            <p className="text-muted-foreground">
              Build your network of complementary businesses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Saved!
            </Badge>
          )}
          <Badge variant="outline" className="text-sm">
            {completionPercent}% Complete
          </Badge>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">What is a Contact Sphere?</h3>
              <p className="text-sm text-blue-700">
                Contact Spheres are made up of businesses or professions that naturally provide a source of referrals 
                for one another. They are in somewhat related but non-competitive businesses. Businesses in the same 
                Contact Sphere have a symbiotic relationship in that they support and enhance one another.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sphere Name */}
      <Card>
        <CardHeader>
          <CardTitle>My Contact Sphere</CardTitle>
          <CardDescription>
            What industry or category best describes your network?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="sphereName">Contact Sphere Name</Label>
            <Input
              id="sphereName"
              placeholder="e.g., Manufacturing Services, Business Consulting, Financial Services"
              value={form.sphereName}
              onChange={(e) => updateSphereName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Sphere Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>My Contact Sphere Members</CardTitle>
              <CardDescription>
                List up to 10 people in your contact sphere who can refer business to you
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {form.members.map((member, index) => (
              <div key={index} className="grid gap-4 md:grid-cols-3 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Member {index + 1} - Name
                  </Label>
                  <Input
                    placeholder="Full name"
                    value={member.name}
                    onChange={(e) => updateMember(index, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Profession</Label>
                  <Input
                    placeholder="Their profession"
                    value={member.profession}
                    onChange={(e) => updateMember(index, "profession", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Company</Label>
                  <Input
                    placeholder="Their company"
                    value={member.company}
                    onChange={(e) => updateMember(index, "company", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>Tip:</strong> Include people from complementary businesses who serve similar clients but don't compete with you.
          </p>
        </CardContent>
      </Card>

      {/* Top 3 Professions Needed */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle>Contact Sphere Top 3</CardTitle>
              <CardDescription>
                What other three professions would help you round out your Contact Sphere?
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {form.topProfessions.map((profession, index) => (
              <Card key={index} className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        Profession {index + 1}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label>Profession Type</Label>
                      <Input
                        placeholder="e.g., Commercial Insurance Agent, CPA, Business Attorney"
                        value={profession.profession}
                        onChange={(e) => updateProfession(index, "profession", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Why This Profession?</Label>
                      <Textarea
                        placeholder="How would this profession help you and your clients?"
                        value={profession.description}
                        onChange={(e) => updateProfession(index, "description", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commitment */}
      <Card>
        <CardHeader>
          <CardTitle>My Commitment</CardTitle>
          <CardDescription>
            Make a commitment to your One-to-One partner to help fill their Contact Sphere 
            by inviting people that are in his/her top 3.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="commitment">Your Commitment</Label>
            <Textarea
              id="commitment"
              placeholder="What will you do to help your partners fill their contact sphere? How will you introduce them to people in their top 3 professions?"
              value={form.commitment}
              onChange={(e) => updateCommitment(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Link href="/portal/networking/profile">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Contact Sphere"}
        </Button>
      </div>
    </div>
  );
}
