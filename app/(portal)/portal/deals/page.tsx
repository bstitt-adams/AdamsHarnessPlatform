"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Building2,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  Users,
  Handshake,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, Timestamp } from "firebase/firestore";
import { COLLECTIONS, type ReferralDoc, type TeamMemberDoc } from "@/lib/schema";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/user-profile-context";

// Deal/Referral stages with colors
const dealStages = [
  { id: "submitted", name: "Submitted", color: "bg-gray-500", icon: Clock },
  { id: "contacted", name: "Contacted", color: "bg-blue-500", icon: Users },
  { id: "meeting-scheduled", name: "Meeting Scheduled", color: "bg-cyan-500", icon: Calendar },
  { id: "proposal", name: "Proposal Sent", color: "bg-sky-500", icon: ArrowUpRight },
  { id: "negotiation", name: "In Negotiation", color: "bg-orange-500", icon: Handshake },
  { id: "won", name: "Won", color: "bg-green-500", icon: CheckCircle },
  { id: "lost", name: "Lost", color: "bg-red-500", icon: XCircle },
];

// Commission tiers
const commissionTiers = [
  { level: "referral", name: "Referral Only", rate: 7, description: "Simple introduction" },
  { level: "assist", name: "Assist Sales", rate: 12, description: "Help warm the lead" },
  { level: "co-sell", name: "Co-Sell & Close", rate: 17, description: "Support sales process" },
];

// Display type for deals
interface DealDisplay {
  id: string;
  prospectName: string;
  prospectCompany: string;
  prospectEmail: string;
  prospectPhone?: string;
  status: string;
  estimatedValue: number;
  dealValue?: number;
  commissionTier: string;
  referrerId: string;
  referrerName: string;
  recipientId: string;
  recipientName: string;
  isAdamsReferral: boolean;
  adamsServiceInterest: string[];
  description: string;
  whyGoodFit?: string;
  referralType: string;
  lastContactDate?: Date;
  lastActivityNote?: string;
  contactAttempts: number;
  oneToOneMeetingId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Form state for new deal
interface NewDealForm {
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

const emptyDealForm: NewDealForm = {
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

export default function DealsPage() {
  const { profile, linkedTeamMember } = useUserProfile();
  const [deals, setDeals] = useState<DealDisplay[]>([]);
  const [affiliates, setAffiliates] = useState<TeamMemberDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  
  // Dialog states
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealDisplay | null>(null);
  const [dealToDelete, setDealToDelete] = useState<DealDisplay | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form state
  const [newDeal, setNewDeal] = useState<NewDealForm>(emptyDealForm);
  const [isSaving, setIsSaving] = useState(false);

  // Load deals and affiliates from Firebase
  useEffect(() => {
    loadData();
  }, [profile.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadDeals(), loadAffiliates()]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load deals");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeals = async () => {
    if (!db) return;

    try {
      const dealsRef = collection(db, COLLECTIONS.REFERRALS);
      // Get all Adams referrals or referrals involving current user
      const q = query(dealsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      const loadedDeals: DealDisplay[] = snapshot.docs.map(doc => {
        const data = doc.data() as ReferralDoc;
        return {
          id: doc.id,
          prospectName: data.prospectName,
          prospectCompany: data.prospectCompany || "",
          prospectEmail: data.prospectEmail || "",
          prospectPhone: data.prospectPhone,
          status: data.status,
          estimatedValue: data.estimatedValue || 0,
          dealValue: data.dealValue,
          commissionTier: data.commissionTier || "referral",
          referrerId: data.referrerId,
          referrerName: data.referrerName || "Unknown",
          recipientId: data.recipientId,
          recipientName: data.recipientName || "Adams",
          isAdamsReferral: data.isAdamsReferral,
          adamsServiceInterest: data.adamsServiceInterest || [],
          description: data.description,
          whyGoodFit: data.whyGoodFit,
          referralType: data.referralType,
          lastContactDate: data.lastContactDate?.toDate(),
          lastActivityNote: data.lastActivityNote,
          contactAttempts: data.contactAttempts || 0,
          oneToOneMeetingId: data.oneToOneMeetingId,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        };
      });
      
      setDeals(loadedDeals);
    } catch (error) {
      console.error("Error loading deals:", error);
    }
  };

  const loadAffiliates = async () => {
    if (!db) return;

    try {
      const affiliatesRef = collection(db, COLLECTIONS.TEAM_MEMBERS);
      const q = query(affiliatesRef, where("role", "==", "affiliate"));
      const snapshot = await getDocs(q);
      
      const loadedAffiliates: TeamMemberDoc[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as TeamMemberDoc));
      
      setAffiliates(loadedAffiliates);
    } catch (error) {
      console.error("Error loading affiliates:", error);
    }
  };

  // Filter deals based on search, stage, and tab
  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.prospectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.prospectCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.referrerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === "all" || deal.status === stageFilter;
    
    // Tab filtering
    let matchesTab = true;
    if (activeTab === "my-referrals") {
      matchesTab = deal.referrerId === (linkedTeamMember?.id || profile.id);
    } else if (activeTab === "received") {
      matchesTab = deal.recipientId === (linkedTeamMember?.id || profile.id);
    } else if (activeTab === "adams") {
      matchesTab = deal.isAdamsReferral;
    }
    
    return matchesSearch && matchesStage && matchesTab;
  });

  // Calculate stats
  const calculateStats = () => {
    const activeDeals = deals.filter(d => !["won", "lost"].includes(d.status));
    const wonDeals = deals.filter(d => d.status === "won");
    
    const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0);
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.dealValue || d.estimatedValue || 0), 0);
    
    const commissionEarned = wonDeals.reduce((sum, d) => {
      const tier = commissionTiers.find(t => t.level === d.commissionTier);
      const value = d.dealValue || d.estimatedValue || 0;
      return sum + (value * (tier?.rate || 0)) / 100;
    }, 0);
    
    const potentialCommission = activeDeals.reduce((sum, d) => {
      const tier = commissionTiers.find(t => t.level === d.commissionTier);
      return sum + ((d.estimatedValue || 0) * (tier?.rate || 0)) / 100;
    }, 0);
    
    return { pipelineValue, wonValue, commissionEarned, potentialCommission };
  };

  const stats = calculateStats();

  // Helper functions
  const getStageInfo = (stageId: string) => {
    return dealStages.find(s => s.id === stageId) || dealStages[0];
  };

  const getCommissionTier = (tierId: string) => {
    return commissionTiers.find(t => t.level === tierId) || commissionTiers[0];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // CRUD operations
  const handleCreateDeal = async () => {
    if (!newDeal.prospectName || !newDeal.prospectCompany) {
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
        recipientId: "adams", // Default to Adams
        recipientName: "Adams Electric",
        prospectName: newDeal.prospectName,
        prospectCompany: newDeal.prospectCompany,
        prospectEmail: newDeal.prospectEmail,
        prospectPhone: newDeal.prospectPhone || undefined,
        description: newDeal.description,
        whyGoodFit: newDeal.whyGoodFit || undefined,
        referralType: newDeal.referralType as "short-term" | "long-term",
        isAdamsReferral: newDeal.isAdamsReferral,
        adamsServiceInterest: newDeal.adamsServiceInterest.split(",").map(s => s.trim()).filter(s => s),
        status: "submitted",
        commissionTier: newDeal.commissionTier as "referral" | "assist" | "co-sell",
        estimatedValue: parseFloat(newDeal.estimatedValue) || 0,
        contactAttempts: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const dealsRef = collection(db, COLLECTIONS.REFERRALS);
      await addDoc(dealsRef, dealData);
      
      toast.success("Referral created successfully");
      setIsNewDealOpen(false);
      setNewDeal(emptyDealForm);
      await loadDeals();
    } catch (error) {
      console.error("Error creating deal:", error);
      toast.error("Failed to create referral");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDealStatus = async (deal: DealDisplay, newStatus: string) => {
    try {
      if (!db) throw new Error("Database not available");

      const dealRef = doc(db, COLLECTIONS.REFERRALS, deal.id);
      await updateDoc(dealRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      setDeals(prev => prev.map(d => 
        d.id === deal.id ? { ...d, status: newStatus, updatedAt: new Date() } : d
      ));
      
      toast.success(`Deal moved to ${getStageInfo(newStatus).name}`);
    } catch (error) {
      console.error("Error updating deal:", error);
      toast.error("Failed to update deal");
    }
  };

  const handleDeleteDeal = async () => {
    if (!dealToDelete) return;

    setIsSaving(true);
    try {
      if (!db) throw new Error("Database not available");

      await deleteDoc(doc(db, COLLECTIONS.REFERRALS, dealToDelete.id));
      setDeals(prev => prev.filter(d => d.id !== dealToDelete.id));
      toast.success("Referral deleted");
      setDealToDelete(null);
    } catch (error) {
      console.error("Error deleting deal:", error);
      toast.error("Failed to delete referral");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogActivity = async (deal: DealDisplay, note: string) => {
    try {
      if (!db) throw new Error("Database not available");

      const dealRef = doc(db, COLLECTIONS.REFERRALS, deal.id);
      await updateDoc(dealRef, {
        lastContactDate: Timestamp.now(),
        lastActivityNote: note,
        contactAttempts: (deal.contactAttempts || 0) + 1,
        updatedAt: Timestamp.now(),
      });

      await loadDeals();
      toast.success("Activity logged");
    } catch (error) {
      console.error("Error logging activity:", error);
      toast.error("Failed to log activity");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deal Tracking</h1>
          <p className="text-muted-foreground">
            Track referrals and commissions from your network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setIsNewDealOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Referral
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pipelineValue)}</div>
            <p className="text-xs text-muted-foreground">
              {deals.filter(d => !["won", "lost"].includes(d.status)).length} active deals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Closed Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.wonValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {deals.filter(d => d.status === "won").length} deals won
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Commission Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.commissionEarned)}
            </div>
            <p className="text-xs text-muted-foreground">From won deals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Potential Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.potentialCommission)}
            </div>
            <p className="text-xs text-muted-foreground">If all close</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Tiers Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commission Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {commissionTiers.map((tier) => (
              <div
                key={tier.level}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{tier.name}</p>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>
                <Badge variant="secondary" className="text-lg">
                  {tier.rate}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Deals ({deals.length})</TabsTrigger>
          <TabsTrigger value="my-referrals">
            My Referrals ({deals.filter(d => d.referrerId === (linkedTeamMember?.id || profile.id)).length})
          </TabsTrigger>
          <TabsTrigger value="adams">
            Adams Electric Referrals ({deals.filter(d => d.isAdamsReferral).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {dealStages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Deals Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prospect</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Referred By</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No deals found</p>
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => setIsNewDealOpen(true)}
                    >
                      Create your first referral
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeals.map((deal) => {
                  const stage = getStageInfo(deal.status);
                  const tier = getCommissionTier(deal.commissionTier);
                  const value = deal.dealValue || deal.estimatedValue || 0;
                  const commission = (value * tier.rate) / 100;
                  const StageIcon = stage.icon;

                  return (
                    <TableRow key={deal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{deal.prospectCompany || deal.prospectName}</p>
                          <p className="text-sm text-muted-foreground">{deal.prospectName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("text-white gap-1", stage.color)}
                        >
                          <StageIcon className="h-3 w-3" />
                          {stage.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(value)}
                        {deal.status !== "won" && deal.estimatedValue && (
                          <span className="text-xs text-muted-foreground ml-1">(est)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-primary">
                            {formatCurrency(commission)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tier.rate}% - {tier.name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {deal.referrerName.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{deal.referrerName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {deal.lastContactDate ? formatDate(deal.lastContactDate) : formatDate(deal.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedDeal(deal)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedDeal(deal);
                                setIsEditMode(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {!["won", "lost"].includes(deal.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleUpdateDealStatus(deal, "won")}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  Mark as Won
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateDealStatus(deal, "lost")}>
                                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                  Mark as Lost
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDealToDelete(deal)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Deal Dialog */}
      <Dialog open={isNewDealOpen} onOpenChange={setIsNewDealOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Referral</DialogTitle>
            <DialogDescription>
              Submit a new referral to track commissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="prospectCompany">Company Name *</Label>
              <Input
                id="prospectCompany"
                placeholder="Enter company name"
                value={newDeal.prospectCompany}
                onChange={(e) => setNewDeal({ ...newDeal, prospectCompany: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prospectName">Contact Name *</Label>
                <Input
                  id="prospectName"
                  placeholder="Contact name"
                  value={newDeal.prospectName}
                  onChange={(e) => setNewDeal({ ...newDeal, prospectName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prospectEmail">Contact Email</Label>
                <Input
                  id="prospectEmail"
                  type="email"
                  placeholder="email@company.com"
                  value={newDeal.prospectEmail}
                  onChange={(e) => setNewDeal({ ...newDeal, prospectEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedValue">Estimated Value</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  placeholder="$0"
                  value={newDeal.estimatedValue}
                  onChange={(e) => setNewDeal({ ...newDeal, estimatedValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier">Commission Tier</Label>
                <Select
                  value={newDeal.commissionTier}
                  onValueChange={(v) => setNewDeal({ ...newDeal, commissionTier: v })}
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

            <div className="space-y-2">
              <Label htmlFor="referralType">Referral Type</Label>
              <Select
                value={newDeal.referralType}
                onValueChange={(v) => setNewDeal({ ...newDeal, referralType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short-term">Short-term (immediate need)</SelectItem>
                  <SelectItem value="long-term">Long-term (future opportunity)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adamsServiceInterest">Services Interested In</Label>
              <Input
                id="adamsServiceInterest"
                placeholder="e.g., ISO 9001, Lean Manufacturing, Digital Transformation"
                value={newDeal.adamsServiceInterest}
                onChange={(e) => setNewDeal({ ...newDeal, adamsServiceInterest: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Separate multiple services with commas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the referral opportunity..."
                value={newDeal.description}
                onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whyGoodFit">Why is this a good fit?</Label>
              <Textarea
                id="whyGoodFit"
                placeholder="Explain why this prospect would benefit from Adams services..."
                value={newDeal.whyGoodFit}
                onChange={(e) => setNewDeal({ ...newDeal, whyGoodFit: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDealOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeal} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deal Details Dialog */}
      <Dialog open={!!selectedDeal && !isEditMode} onOpenChange={() => setSelectedDeal(null)}>
        <DialogContent className="max-w-lg">
          {selectedDeal && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDeal.prospectCompany || selectedDeal.prospectName}</DialogTitle>
                <DialogDescription>
                  Referral details and activity
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Contact</Label>
                    <p className="font-medium">{selectedDeal.prospectName}</p>
                    {selectedDeal.prospectEmail && (
                      <p className="text-sm text-muted-foreground">{selectedDeal.prospectEmail}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Stage</Label>
                    <Badge
                      variant="secondary"
                      className={cn("text-white mt-1", getStageInfo(selectedDeal.status).color)}
                    >
                      {getStageInfo(selectedDeal.status).name}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Deal Value</Label>
                    <p className="text-xl font-bold">
                      {formatCurrency(selectedDeal.dealValue || selectedDeal.estimatedValue || 0)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Your Commission</Label>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(
                        ((selectedDeal.dealValue || selectedDeal.estimatedValue || 0) * 
                          getCommissionTier(selectedDeal.commissionTier).rate) / 100
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getCommissionTier(selectedDeal.commissionTier).rate}% - {getCommissionTier(selectedDeal.commissionTier).name}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Referred By</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {selectedDeal.referrerName.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span>{selectedDeal.referrerName}</span>
                  </div>
                </div>

                {selectedDeal.adamsServiceInterest.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Services</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedDeal.adamsServiceInterest.map((service) => (
                        <Badge key={service} variant="outline">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{selectedDeal.description}</p>
                </div>

                {selectedDeal.whyGoodFit && (
                  <div>
                    <Label className="text-muted-foreground">Why Good Fit</Label>
                    <p className="text-sm mt-1">{selectedDeal.whyGoodFit}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p>{formatDate(selectedDeal.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Activity</Label>
                    <p>{selectedDeal.lastContactDate ? formatDate(selectedDeal.lastContactDate) : "No activity yet"}</p>
                  </div>
                </div>

                {selectedDeal.lastActivityNote && (
                  <div>
                    <Label className="text-muted-foreground">Last Activity Note</Label>
                    <p className="text-sm mt-1">{selectedDeal.lastActivityNote}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedDeal(null)}>
                  Close
                </Button>
                <Button onClick={() => setIsEditMode(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Deal
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!dealToDelete} onOpenChange={() => setDealToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Referral?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the referral for &quot;{dealToDelete?.prospectCompany || dealToDelete?.prospectName}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeal}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
