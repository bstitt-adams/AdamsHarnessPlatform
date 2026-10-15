"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building,
  Calendar,
  DollarSign,
  Target,
  Mail,
  Phone,
  User,
  Package,
  RefreshCw,
  FileText,
  Clock,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS, type OpportunityDoc } from "@/lib/schema";
import { toast } from "sonner";

function getStageColor(stage: string) {
  const colors: Record<string, string> = {
    lead: "bg-gray-100 text-gray-800",
    discovery: "bg-blue-100 text-blue-800",
    proposal: "bg-sky-100 text-sky-800",
    negotiation: "bg-orange-100 text-orange-800",
    "closed-won": "bg-green-100 text-green-800",
    "closed-lost": "bg-red-100 text-red-800",
  };
  return colors[stage?.toLowerCase()] || "bg-gray-100 text-gray-800";
}

function formatStage(stage: string) {
  if (!stage) return "Unknown";
  return stage.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(date: Date | Timestamp | undefined) {
  if (!date) return "Not set";
  const d = date instanceof Timestamp ? date.toDate() : date;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function OpportunityViewPage() {
  const params = useParams();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOpportunity() {
      if (!db || !params.id) return;
      
      try {
        const docRef = doc(db, COLLECTIONS.OPPORTUNITIES, params.id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setOpportunity({ id: docSnap.id, ...docSnap.data() } as OpportunityDoc);
        } else {
          toast.error("Opportunity not found");
          router.push("/portal/opportunities");
        }
      } catch (error) {
        console.error("Error fetching opportunity:", error);
        toast.error("Failed to load opportunity");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchOpportunity();
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!opportunity || !db) return;
    if (!confirm("Are you sure you want to delete this opportunity? This action cannot be undone.")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, COLLECTIONS.OPPORTUNITIES, opportunity.id));
      toast.success("Opportunity deleted");
      router.push("/portal/opportunities");
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      toast.error("Failed to delete opportunity");
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

  if (!opportunity) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Target className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Opportunity not found</p>
        <Button asChild>
          <Link href="/portal/opportunities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Opportunities
          </Link>
        </Button>
      </div>
    );
  }

  const isSubscription = (opportunity as any).isSubscription;
  const monthlyAmount = (opportunity as any).monthlyAmount;
  const subscriptionTermMonths = (opportunity as any).subscriptionTermMonths;
  const deliverables = (opportunity as any).deliverables || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/portal/opportunities">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{opportunity.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{opportunity.organizationName || "No organization"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/portal/opportunities/${opportunity.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Stage</p>
                  <Badge className={getStageColor(opportunity.stage)}>
                    {formatStage(opportunity.stage)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Probability</p>
                  <p className="font-medium">{opportunity.probability || 0}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Close</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(opportunity.expectedCloseDate)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(opportunity.createdAt)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {opportunity.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{opportunity.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {opportunity.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{opportunity.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Deliverables */}
          {deliverables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Deliverables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {deliverables.map((item: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Client Contact */}
          {(opportunity as any).affiliateName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(opportunity as any).affiliateName?.split(" ").map((n: string) => n[0]).join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{(opportunity as any).affiliateName}</p>
                    {(opportunity as any).affiliateCompany && (
                      <p className="text-sm text-muted-foreground">{(opportunity as any).affiliateCompany}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {(opportunity as any).affiliateEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${(opportunity as any).affiliateEmail}`} className="hover:underline">
                        {(opportunity as any).affiliateEmail}
                      </a>
                    </div>
                  )}
                  {(opportunity as any).affiliatePhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${(opportunity as any).affiliatePhone}`} className="hover:underline">
                        {(opportunity as any).affiliatePhone}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Deal Value */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Deal Value
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSubscription ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Subscription Deal</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly</span>
                      <span className="font-medium">{formatCurrency(monthlyAmount || 0)}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Term</span>
                      <span className="font-medium">{subscriptionTermMonths || 12} months</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Total Contract Value</span>
                      <span className="font-bold text-lg">{formatCurrency(opportunity.value || 0)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-3xl font-bold">{formatCurrency(opportunity.value || 0)}</p>
                  <p className="text-sm text-muted-foreground">One-time Deal</p>
                </div>
              )}
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Probability</span>
                  <span className="font-medium">{opportunity.probability || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weighted Value</span>
                  <span className="font-medium">
                    {formatCurrency((opportunity.value || 0) * ((opportunity.probability || 0) / 100))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Owner */}
          <Card>
            <CardHeader>
              <CardTitle>Owner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>OW</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Owner</p>
                  <p className="text-sm text-muted-foreground">Sales Team</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
