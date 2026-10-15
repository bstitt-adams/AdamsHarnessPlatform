"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Plus,
  Search,
  MapPin,
  Star,
  Mail,
  Phone,
  Users,
  Award,
  Loader2,
  Handshake,
  Network,
  UserPlus,
  Settings,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/user-profile-context";
import { AffiliateOnboardingWizard } from "@/components/portal/affiliate-onboarding-wizard";
import { NetworkingWizard } from "@/components/portal/networking-wizard";
import { CreateReferralDialog } from "@/components/portal/create-referral-dialog";

interface AffiliateDisplay {
  id: string;
  name: string;
  title: string;
  initials: string;
  location: string;
  availability: string;
  rating: number;
  projectsCompleted: number;
  capabilities: string[];
  certifications: string[];
  email: string;
  phone: string;
}

const capabilityOptions = [
  "All Capabilities",
  "Lean Manufacturing",
  "ISO 9001",
  "Automation",
  "Supply Chain",
  "Digital Transformation",
  "Workforce Development",
  "Operations",
  "Marketing",
  "Finance",
  "Technology",
];

function getAvailabilityBadge(availability: string) {
  switch (availability) {
    case "available":
    case "active":
      return <Badge className="bg-green-100 text-green-800">Available</Badge>;
    case "partial":
      return <Badge className="bg-sky-100 text-sky-800">Partial</Badge>;
    case "unavailable":
    case "inactive":
      return <Badge className="bg-red-100 text-red-800">Unavailable</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
}

export default function AffiliatesPage() {
  const router = useRouter();
  const { setShowAffiliateOnboarding, setShowNetworkingWizard } = useUserProfile();
  const [affiliates, setAffiliates] = useState<AffiliateDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [capabilityFilter, setCapabilityFilter] = useState("All Capabilities");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New affiliate form state
  const [newAffiliate, setNewAffiliate] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    expertise: "",
    company: "",
  });

  useEffect(() => {
    async function fetchAffiliates() {
      if (!db) return;
      
      try {
        const teamRef = collection(db, COLLECTIONS.TEAM_MEMBERS);
        const teamQuery = query(teamRef, orderBy("firstName"));
        const snapshot = await getDocs(teamQuery);
        
        const affiliateList: AffiliateDisplay[] = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as TeamMemberDoc;
          // Include all team members (affiliates, consultants, clients, team, admin)
          const firstName = data.firstName || "";
          const lastName = data.lastName || "";
          affiliateList.push({
            id: doc.id,
            name: `${firstName} ${lastName}`.trim() || "Unknown",
            title: data.expertise || data.role || "Team Member",
            initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "??",
            location: data.location || "",
            availability: data.status || "active",
            rating: 4.8, // Default rating
            projectsCompleted: 0, // Would need to calculate from projects
            capabilities: data.expertise ? [data.expertise] : [],
            certifications: [],
            email: data.emailPrimary || "",
            phone: data.mobile || "",
          });
        });
        
        setAffiliates(affiliateList);
      } catch (error) {
        console.error("Error fetching affiliates:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAffiliates();
  }, []);

  const handleAddAffiliate = async () => {
    if (!newAffiliate.firstName.trim() || !newAffiliate.lastName.trim()) {
      toast.error("Please enter first and last name");
      return;
    }
    if (!db) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, COLLECTIONS.TEAM_MEMBERS), {
        firstName: newAffiliate.firstName,
        lastName: newAffiliate.lastName,
        emailPrimary: newAffiliate.email,
        mobile: newAffiliate.phone,
        expertise: newAffiliate.expertise,
        company: newAffiliate.company,
        role: "affiliate",
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast.success("Affiliate added successfully");
      setShowAddDialog(false);
      setNewAffiliate({ firstName: "", lastName: "", email: "", phone: "", expertise: "", company: "" });
      
      // Refresh the list
      window.location.reload();
    } catch (error) {
      console.error("Error adding affiliate:", error);
      toast.error("Failed to add affiliate");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter affiliates
  const filteredAffiliates = affiliates.filter((a) => {
    const matchesSearch = searchQuery === "" || 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCapability = capabilityFilter === "All Capabilities" ||
      a.capabilities.some(c => c.toLowerCase().includes(capabilityFilter.toLowerCase()));
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "available" && (a.availability === "available" || a.availability === "active")) ||
      (statusFilter === "partial" && a.availability === "partial") ||
      (statusFilter === "unavailable" && (a.availability === "unavailable" || a.availability === "inactive"));
    return matchesSearch && matchesCapability && matchesStatus;
  });

  const availableCount = affiliates.filter((a) => a.availability === "available" || a.availability === "active").length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliates & Team</h1>
          <p className="text-muted-foreground">
            Your network of affiliates, consultants, clients, and team members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowReferralDialog(true)}>
            <Handshake className="mr-2 h-4 w-4" />
            Submit Referral
          </Button>
          <Button variant="outline" onClick={() => setShowAffiliateOnboarding(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Onboarding
          </Button>
          <Button variant="outline" onClick={() => setShowNetworkingWizard(true)}>
            <Network className="mr-2 h-4 w-4" />
            Networking
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliates.length}</div>
            <p className="text-xs text-muted-foreground">In your network</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableCount}</div>
            <p className="text-xs text-muted-foreground">Ready for projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              4.8
              <Star className="h-5 w-5 text-sky-500 fill-sky-500" />
            </div>
            <p className="text-xs text-muted-foreground">Across all affiliates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Projects Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliates.reduce((sum, a) => sum + a.projectsCompleted, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total by network</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search affiliates..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={capabilityFilter} onValueChange={setCapabilityFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Capability" />
              </SelectTrigger>
              <SelectContent>
                {capabilityOptions.map((cap) => (
                  <SelectItem key={cap} value={cap}>
                    {cap}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Affiliate Grid */}
      {filteredAffiliates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {affiliates.length === 0 ? "No affiliates yet" : "No affiliates match your filters"}
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Affiliate
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAffiliates.map((affiliate) => (
            <Card key={affiliate.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {affiliate.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        <Link href={`/portal/admin/team-members?view=${affiliate.id}`} className="hover:underline">
                          {affiliate.name}
                        </Link>
                      </CardTitle>
                      <CardDescription>{affiliate.title}</CardDescription>
                    </div>
                  </div>
                  {getAvailabilityBadge(affiliate.availability)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Location & Rating */}
                <div className="flex items-center justify-between text-sm">
                  {affiliate.location ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {affiliate.location}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {affiliate.email || "No email"}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-sky-500 fill-sky-500" />
                    <span className="font-medium">{affiliate.rating}</span>
                  </div>
                </div>

                {/* Capabilities */}
                {affiliate.capabilities.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Expertise</p>
                    <div className="flex flex-wrap gap-1">
                      {affiliate.capabilities.slice(0, 3).map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                <div className="text-sm space-y-1">
                  {affiliate.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{affiliate.email}</span>
                    </div>
                  )}
                  {affiliate.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{affiliate.phone}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/portal/admin/team-members?view=${affiliate.id}`}>View Profile</Link>
                  </Button>
                  <Button size="sm" className="flex-1">Request</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Affiliate Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Affiliate</DialogTitle>
            <DialogDescription>
              Add a new affiliate to your network. They will be tagged as an affiliate in the team members list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newAffiliate.firstName}
                  onChange={(e) => setNewAffiliate(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newAffiliate.lastName}
                  onChange={(e) => setNewAffiliate(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Smith"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newAffiliate.email}
                onChange={(e) => setNewAffiliate(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newAffiliate.phone}
                onChange={(e) => setNewAffiliate(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expertise">Expertise / Title</Label>
              <Input
                id="expertise"
                value={newAffiliate.expertise}
                onChange={(e) => setNewAffiliate(prev => ({ ...prev, expertise: e.target.value }))}
                placeholder="e.g., Lean Manufacturing Consultant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={newAffiliate.company}
                onChange={(e) => setNewAffiliate(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Company name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAffiliate} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Affiliate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wizard Modals */}
      <AffiliateOnboardingWizard />
      <NetworkingWizard />

      {/* Referral Dialog */}
      <CreateReferralDialog
        open={showReferralDialog}
        onOpenChange={setShowReferralDialog}
        sourceContext="affiliates"
      />
    </div>
  );
}
