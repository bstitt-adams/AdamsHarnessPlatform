"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Save,
  Briefcase,
  Star,
  CheckCircle,
  Info,
  Building2,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, query, where, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";
import { logAffiliateProfileUpdated } from "@/lib/activity-logger";

interface Customer {
  name: string;
  industry: string;
  description: string;
  isIdealClient: boolean;
}

interface CustomersForm {
  customers: Customer[];
}

const emptyCustomer: Customer = {
  name: "",
  industry: "",
  description: "",
  isIdealClient: false,
};

const initialForm: CustomersForm = {
  customers: Array(10).fill(null).map(() => ({ ...emptyCustomer })),
};

// Temporary user ID until auth is implemented
const TEMP_USER_ID = "current-user";

export default function CustomersPage() {
  const [form, setForm] = useState<CustomersForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);

  // Load existing data on mount
  useEffect(() => {
    const loadCustomers = async () => {
      if (!db) {
        setIsLoading(false);
        return;
      }
      
      try {
        const q = query(
          collection(db, COLLECTIONS.PREVIOUS_CUSTOMERS),
          where("affiliateId", "==", TEMP_USER_ID)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0];
          setDocId(docData.id);
          const data = docData.data();
          
          // Map customers from Firebase format
          const customers = Array(10).fill(null).map((_, i) => {
            const customer = data.customers?.[i];
            return {
              name: customer?.name || "",
              industry: customer?.industry || "",
              description: customer?.description || "",
              isIdealClient: customer?.isIdealClient || false,
            };
          });
          
          setForm({ customers });
        }
      } catch (error) {
        console.error("Error loading customers:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCustomers();
  }, []);

  const updateCustomer = (index: number, field: keyof Customer, value: string | boolean) => {
    setForm((prev) => {
      const newCustomers = [...prev.customers];
      newCustomers[index] = { ...newCustomers[index], [field]: value };
      return { ...prev, customers: newCustomers };
    });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!db) return;
    
    setIsSaving(true);
    try {
      // Filter out empty customers
      const filledCustomers = form.customers.filter(c => c.name.trim());
      
      const customersData = {
        affiliateId: TEMP_USER_ID,
        customers: filledCustomers.map(c => ({
          name: c.name,
          industry: c.industry || "",
          description: c.description || "",
          isIdealClient: c.isIdealClient,
        })),
        updatedAt: Timestamp.now(),
      };
      
      const documentId = docId || `customers_${TEMP_USER_ID}`;
      const docRef = doc(db, COLLECTIONS.PREVIOUS_CUSTOMERS, documentId);
      
      await setDoc(docRef, {
        ...customersData,
        createdAt: docId ? undefined : Timestamp.now(),
      }, { merge: true });
      
      if (!docId) {
        setDocId(documentId);
      }
      
      // Log activity
      await logAffiliateProfileUpdated(TEMP_USER_ID, "Affiliate", "Previous Customers");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving customers:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const filledCustomers = form.customers.filter((c) => c.name.trim() !== "").length;
  const idealClients = form.customers.filter((c) => c.isIdealClient).length;
  const completionPercent = Math.round((filledCustomers / 10) * 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading customers...</p>
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
            <h1 className="text-3xl font-bold">Previous 10 Customers</h1>
            <p className="text-muted-foreground">
              Help partners understand who your ideal clients are
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
              <h3 className="font-medium text-blue-900">Why List Your Previous Customers?</h3>
              <p className="text-sm text-blue-700">
                Imagine how you can increase the referrals you receive by helping your business partner 
                understand how to find more customers like the ones listed below! When partners see 
                concrete examples of who you've helped, they can better identify similar opportunities for you.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Instructions</h3>
              <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                <li>List your previous 10 customers below</li>
                <li>Select the ones that are ideal clients or a good referral for you</li>
                <li>Write your answers to questions in the spaces provided</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filledCustomers}</p>
              <p className="text-sm text-muted-foreground">Customers Listed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-sky-100 rounded-lg">
              <Star className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{idealClients}</p>
              <p className="text-sm text-muted-foreground">Ideal Clients Marked</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Previous 10 Customers</CardTitle>
          <CardDescription>
            List customers you've worked with and mark which ones represent your ideal client profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {form.customers.map((customer, index) => (
              <Card key={index} className={`${customer.isIdealClient ? 'border-sky-300 bg-sky-50/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-2 pt-2">
                      <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`ideal-${index}`}
                          checked={customer.isIdealClient}
                          onCheckedChange={(checked) => 
                            updateCustomer(index, "isIdealClient", checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`ideal-${index}`} 
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          Ideal
                        </Label>
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Customer, Industry or Description
                          </Label>
                          <Input
                            placeholder="Company name or description"
                            value={customer.name}
                            onChange={(e) => updateCustomer(index, "name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Industry
                          </Label>
                          <Input
                            placeholder="e.g., Automotive, Aerospace, Medical Devices"
                            value={customer.industry}
                            onChange={(e) => updateCustomer(index, "industry", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          What did you do for them? If an Ideal Client, describe why.
                        </Label>
                        <Textarea
                          placeholder="Describe the work you did and the results you achieved..."
                          value={customer.description}
                          onChange={(e) => updateCustomer(index, "description", e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                    {customer.isIdealClient && (
                      <div className="pt-2">
                        <Badge className="bg-sky-100 text-sky-800 border-sky-300">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Ideal
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Tips for Describing Your Ideal Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-sm">Be specific about company size and industry</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-sm">Mention the problems you solved for them</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-sm">Include measurable results when possible</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <p className="text-sm">Explain why they were great to work with</p>
            </div>
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
          {isSaving ? "Saving..." : "Save Customer List"}
        </Button>
      </div>
    </div>
  );
}
