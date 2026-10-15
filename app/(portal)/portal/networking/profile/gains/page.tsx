"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Target,
  Trophy,
  Heart,
  Network,
  Wrench,
  CheckCircle,
  Info,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, query, where, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";
import { logAffiliateProfileUpdated } from "@/lib/activity-logger";

interface GainsForm {
  goals: string;
  accomplishments: string;
  interests: string;
  networks: string;
  skills: string;
}

const initialForm: GainsForm = {
  goals: "",
  accomplishments: "",
  interests: "",
  networks: "",
  skills: "",
};

const gainsFields = [
  {
    key: "goals" as const,
    letter: "G",
    title: "Goals",
    icon: Target,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "Goals are the financial, business, educational, and personal objectives you want or need to meet for yourself and for people who are important to you.",
    tip: "The best way to develop a relationship is by helping someone achieve something that's important to them. If you do, they'll remember you when you need help achieving your goals.",
    placeholder: "What are your short-term and long-term goals? What do you want to achieve in the next year? 5 years?",
  },
  {
    key: "accomplishments" as const,
    letter: "A",
    title: "Accomplishments",
    icon: Trophy,
    color: "text-sky-600",
    bgColor: "bg-sky-100",
    description: "Some of your best insight into others comes from knowing what goals they have achieved, what projects they've completed, what they have accomplished both for themselves and for others.",
    tip: "Your fellow member's knowledge, skills, experiences, values, and beliefs can be surmised from their achievements.",
    placeholder: "What are you most proud of? Major projects completed? Awards received? Milestones reached?",
  },
  {
    key: "interests" as const,
    letter: "I",
    title: "Interests",
    icon: Heart,
    color: "text-pink-600",
    bgColor: "bg-pink-100",
    description: "Your interests – the things you enjoy doing, talking about, listening to, or collecting – can help you connect with others.",
    tip: "People are more willing to spend time with those who share their interests or know something about them.",
    placeholder: "What do you enjoy doing? Hobbies? Sports? What topics do you love discussing?",
  },
  {
    key: "networks" as const,
    letter: "N",
    title: "Networks",
    icon: Network,
    color: "text-green-600",
    bgColor: "bg-green-100",
    description: "How would it benefit you to know what other networks, both formal and informal, that your fellow members are involved with?",
    tip: "A network could be an organization, institution, company, civic, religious or professional association, etc.",
    placeholder: "What organizations do you belong to? Professional associations? Community groups? Alumni networks?",
  },
  {
    key: "skills" as const,
    letter: "S",
    title: "Skills",
    icon: Wrench,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    description: "As for Skills, the more you know about the talents, abilities, and assets of the people in your network, the better equipped you are to find competent, affordable service when you or someone you know needs help.",
    tip: "Think beyond your professional skills – what else are you good at that might help others?",
    placeholder: "What are your professional skills? What are you known for? What do people come to you for help with?",
  },
];

// Temporary user ID until auth is implemented
const TEMP_USER_ID = "current-user";

export default function GainsPage() {
  const [form, setForm] = useState<GainsForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);

  // Load existing data on mount
  useEffect(() => {
    const loadGainsProfile = async () => {
      if (!db) {
        setIsLoading(false);
        return;
      }
      
      try {
        const q = query(
          collection(db, COLLECTIONS.GAINS_PROFILES),
          where("affiliateId", "==", TEMP_USER_ID)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0];
          setDocId(docData.id);
          const data = docData.data();
          
          setForm({
            goals: data.goals || "",
            accomplishments: data.accomplishments || "",
            interests: data.interests || "",
            networks: data.networks || "",
            skills: data.skills || "",
          });
        }
      } catch (error) {
        console.error("Error loading GAINS profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGainsProfile();
  }, []);

  const updateField = (field: keyof GainsForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!db) return;
    
    setIsSaving(true);
    try {
      const gainsData = {
        affiliateId: TEMP_USER_ID,
        goals: form.goals,
        accomplishments: form.accomplishments,
        interests: form.interests,
        networks: form.networks,
        skills: form.skills,
        updatedAt: Timestamp.now(),
      };
      
      const documentId = docId || `gains_${TEMP_USER_ID}`;
      const docRef = doc(db, COLLECTIONS.GAINS_PROFILES, documentId);
      
      await setDoc(docRef, {
        ...gainsData,
        createdAt: docId ? undefined : Timestamp.now(),
      }, { merge: true });
      
      if (!docId) {
        setDocId(documentId);
      }
      
      // Log activity
      await logAffiliateProfileUpdated(TEMP_USER_ID, "Affiliate", "GAINS Profile");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving GAINS profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const completedFields = Object.values(form).filter((v) => v.trim() !== "").length;
  const totalFields = Object.keys(form).length;
  const completionPercent = Math.round((completedFields / totalFields) * 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading GAINS profile...</p>
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
            <h1 className="text-3xl font-bold">GAINS Profile</h1>
            <p className="text-muted-foreground">
              Goals, Accomplishments, Interests, Networks, and Skills
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
            {isSaving ? "Saving..." : "Save GAINS"}
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">About the GAINS Worksheet</h3>
              <p className="text-sm text-blue-700">
                Use this form to record your GAINS for yourself or others with whom you want to build a relationship. 
                Date each entry to know how old the information is. The more your partners know about you, 
                the better they can find referrals for you.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GAINS Letters Overview */}
      <div className="flex flex-wrap gap-2 justify-center">
        {gainsFields.map((field) => (
          <div
            key={field.key}
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${field.bgColor}`}
          >
            <span className={`text-2xl font-bold ${field.color}`}>{field.letter}</span>
            <span className={`text-sm font-medium ${field.color}`}>{field.title}</span>
          </div>
        ))}
      </div>

      {/* GAINS Fields */}
      {gainsFields.map((field) => (
        <Card key={field.key}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${field.bgColor}`}>
                <field.icon className={`h-6 w-6 ${field.color}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${field.color}`}>{field.letter}</span>
                  <span>{field.title}</span>
                  {form[field.key].trim() && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {field.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> {field.tip}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={field.key}>Your {field.title}</Label>
              <Textarea
                id={field.key}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Link href="/portal/networking/profile">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save GAINS Profile"}
        </Button>
      </div>
    </div>
  );
}
