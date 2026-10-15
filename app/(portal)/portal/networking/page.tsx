"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Calendar,
  Handshake,
  Search,
  Filter,
  Clock,
  CheckCircle,
  ChevronRight,
  Building2,
  MapPin,
  UserPlus,
  FileText,
  Mail,
  Phone,
  Loader2,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";
import { CreateReferralDialog } from "@/components/portal/create-referral-dialog";

// Expertise categories for filtering
const expertiseCategories = [
  { id: "technology", name: "Technology & AI", color: "bg-purple-500", keywords: ["technology", "ai", "robotics", "digital", "cyber", "learning", "metaverse", "app"] },
  { id: "finance", name: "Finance & Accounting", color: "bg-sky-500", keywords: ["finance", "cfo", "cpa", "tax", "accounting", "capital", "cost", "financial"] },
  { id: "sales", name: "Sales & Marketing", color: "bg-red-500", keywords: ["marketing", "sales", "revenue", "cro", "branding", "bus dev"] },
  { id: "hr", name: "HR & Workforce", color: "bg-pink-500", keywords: ["hr", "human resources", "chro", "workforce", "wellness"] },
  { id: "operations", name: "Operations", color: "bg-blue-500", keywords: ["operations", "ops", "six sigma", "lean", "coo", "project management", "shop"] },
  { id: "supply-chain", name: "Supply Chain", color: "bg-orange-500", keywords: ["supply chain", "inventory", "sourcing", "reshoring"] },
  { id: "leadership", name: "Leadership", color: "bg-teal-500", keywords: ["executive", "leadership", "superintendent", "project executive", "strategy"] },
  { id: "legal-ip", name: "Legal & IP", color: "bg-gray-500", keywords: ["intellectual property", "broker", "privacy", "legal"] },
];

// Helper function to categorize a team member based on their expertise
function categorizeExpertise(expertise: string | undefined | null): string[] {
  if (!expertise) return [];
  const lowerExpertise = expertise.toLowerCase();
  return expertiseCategories
    .filter(cat => cat.keywords.some(keyword => lowerExpertise.includes(keyword)))
    .map(cat => cat.id);
}

// One-to-One request type
interface OneToOneRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  targetName: string;
  status: "pending" | "accepted" | "completed" | "declined";
  proposedDate: string;
  topic: string;
  notes: string;
}

export default function NetworkingPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMemberDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isReferralDialogOpen, setIsReferralDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberDoc | null>(null);
  const [oneToOnes, setOneToOnes] = useState<OneToOneRequest[]>([]);
  const [requestForm, setRequestForm] = useState({
    targetType: "affiliate" as "affiliate" | "leadership",
    targetId: "",
    proposedDate: "",
    proposedTime: "",
    topic: "",
    notes: "",
  });

  // Fetch team members from Firebase
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!db) {
        setLoading(false);
        return;
      }
      try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.TEAM_MEMBERS));
        const members: TeamMemberDoc[] = [];
        querySnapshot.forEach((docSnap) => {
          members.push({ id: docSnap.id, ...docSnap.data() } as TeamMemberDoc);
        });
        // Sort by name
        members.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
        setTeamMembers(members);
      } catch (error) {
        console.error("Error fetching team members:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamMembers();
  }, []);

  // Filter team members
  const filteredMembers = teamMembers.filter((member) => {
    // Only show active members
    if (member.status !== "active") return false;
    
    // Role filter
    if (roleFilter !== "all" && member.role !== roleFilter) return false;
    
    // Search filter
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      (member.company?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      member.expertise.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Category filter
    const memberCategories = categorizeExpertise(member.expertise);
    const matchesCategory = !selectedCategory || memberCategories.includes(selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  // Get leadership team (admin and team roles)
  const leadershipTeam = teamMembers.filter(m => (m.role === "admin" || m.role === "team") && m.status === "active");

  // Get affiliates only
  const affiliatesOnly = teamMembers.filter(m => m.role === "affiliate" && m.status === "active");

  const openRequestDialog = (member?: TeamMemberDoc) => {
    if (member) {
      setSelectedMember(member);
      setRequestForm({ ...requestForm, targetType: "affiliate", targetId: member.id });
    }
    setIsRequestDialogOpen(true);
  };

  const submitRequest = () => {
    const newRequest: OneToOneRequest = {
      id: Date.now().toString(),
      requesterId: "current-user",
      requesterName: "You",
      targetId: requestForm.targetId,
      targetName: selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : "",
      status: "pending",
      proposedDate: `${requestForm.proposedDate}T${requestForm.proposedTime}:00`,
      topic: requestForm.topic,
      notes: requestForm.notes,
    };
    setOneToOnes([...oneToOnes, newRequest]);
    setIsRequestDialogOpen(false);
    setRequestForm({
      targetType: "affiliate",
      targetId: "",
      proposedDate: "",
      proposedTime: "",
      topic: "",
      notes: "",
    });
    setSelectedMember(null);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Affiliate Networking</h1>
          <p className="text-muted-foreground">
            Connect with team members and affiliates through One-to-One networking meetings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsReferralDialogOpen(true)}>
            <Handshake className="mr-2 h-4 w-4" />
            Submit Referral
          </Button>
          <Link href="/portal/networking/profile">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              My Profile
            </Button>
          </Link>
          <Button onClick={() => openRequestDialog()}>
            <UserPlus className="mr-2 h-4 w-4" />
            Request One-to-One
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Network Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.filter(m => m.status === "active").length}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Affiliates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{affiliatesOnly.length}</div>
            <p className="text-xs text-muted-foreground">Active affiliates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leadership Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{leadershipTeam.length}</div>
            <p className="text-xs text-muted-foreground">Core team members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              My One-to-Ones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{oneToOnes.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled meetings</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="directory" className="space-y-6">
        <TabsList>
          <TabsTrigger value="directory">Member Directory</TabsTrigger>
          <TabsTrigger value="one-to-ones">My One-to-Ones</TabsTrigger>
          <TabsTrigger value="leadership">Leadership Team</TabsTrigger>
        </TabsList>

        {/* Member Directory */}
        <TabsContent value="directory" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, company, or expertise..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={setRoleFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="affiliate">Affiliate</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={selectedCategory || "all"}
              onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by expertise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expertiseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            {expertiseCategories.map((cat) => (
              <Badge
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              >
                <div className={cn("w-2 h-2 rounded-full mr-2", cat.color)} />
                {cat.name}
              </Badge>
            ))}
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            Showing {filteredMembers.length} of {teamMembers.filter(m => m.status === "active").length} members
          </p>

          {/* Members Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMembers.map((member) => {
              const memberCategories = categorizeExpertise(member.expertise);
              return (
                <Card key={member.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(member.firstName, member.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg">{member.firstName} {member.lastName}</CardTitle>
                        <CardDescription className="truncate">{member.expertise}</CardDescription>
                      </div>
                      <Badge variant={member.role === "admin" ? "default" : member.role === "team" ? "secondary" : "outline"}>
                        {member.role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      {member.company && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{member.company}</span>
                        </div>
                      )}
                      {member.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{member.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{member.emailPrimary}</span>
                      </div>
                      {member.mobile && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{member.mobile}</span>
                        </div>
                      )}
                    </div>

                    {memberCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {memberCategories.slice(0, 2).map((catId) => {
                          const cat = expertiseCategories.find((c) => c.id === catId);
                          return cat ? (
                            <Badge key={catId} variant="secondary" className="text-xs">
                              {cat.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}

                    {member.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {member.bio}
                      </p>
                    )}

                    <Button
                      className="w-full"
                      onClick={() => openRequestDialog(member)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Request One-to-One
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredMembers.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No members found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My One-to-Ones */}
        <TabsContent value="one-to-ones" className="space-y-6">
          {oneToOnes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No One-to-Ones scheduled</h3>
                <p className="text-muted-foreground mb-4">
                  Start networking by requesting a One-to-One meeting with a team member or affiliate
                </p>
                <Button onClick={() => openRequestDialog()}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Request One-to-One
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {oneToOnes.map((oneToOne) => (
                <Card key={oneToOne.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "p-3 rounded-full",
                            oneToOne.status === "pending"
                              ? "bg-sky-100"
                              : oneToOne.status === "accepted"
                              ? "bg-blue-100"
                              : "bg-green-100"
                          )}
                        >
                          {oneToOne.status === "pending" ? (
                            <Clock className="h-5 w-5 text-sky-600" />
                          ) : oneToOne.status === "accepted" ? (
                            <Calendar className="h-5 w-5 text-blue-600" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            One-to-One with {oneToOne.targetName}
                          </h3>
                          <p className="text-sm text-muted-foreground">{oneToOne.topic}</p>
                          {oneToOne.proposedDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(oneToOne.proposedDate).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            oneToOne.status === "pending"
                              ? "secondary"
                              : oneToOne.status === "accepted"
                              ? "default"
                              : "outline"
                          }
                        >
                          {oneToOne.status.charAt(0).toUpperCase() + oneToOne.status.slice(1)}
                        </Badge>
                        {oneToOne.status === "accepted" && (
                          <Button size="sm">
                            Join Meeting
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Leadership Team */}
        <TabsContent value="leadership" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request One-to-One with Leadership</CardTitle>
              <CardDescription>
                Schedule a meeting with Adams Electric leadership team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {leadershipTeam.map((leader) => (
                  <div
                    key={leader.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(leader.firstName, leader.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{leader.firstName} {leader.lastName}</p>
                        <p className="text-sm text-muted-foreground">{leader.expertise}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {leader.role === "admin" ? "Leadership" : "Core Team"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openRequestDialog(leader)}
                    >
                      Request Meeting
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request One-to-One Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request One-to-One Meeting</DialogTitle>
            <DialogDescription>
              {selectedMember
                ? `Schedule a networking meeting with ${selectedMember.firstName} ${selectedMember.lastName}`
                : "Select who you'd like to meet with"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedMember && (
              <div className="space-y-2">
                <Label>Select Team Member</Label>
                <Select
                  value={requestForm.targetId}
                  onValueChange={(v) => {
                    setRequestForm({ ...requestForm, targetId: v });
                    const member = teamMembers.find(m => m.id === v);
                    if (member) setSelectedMember(member);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.filter(m => m.status === "active").map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} - {member.expertise}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Proposed Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={requestForm.proposedDate}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, proposedDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Proposed Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={requestForm.proposedTime}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, proposedTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Meeting Topic</Label>
              <Input
                id="topic"
                placeholder="What would you like to discuss?"
                value={requestForm.topic}
                onChange={(e) => setRequestForm({ ...requestForm, topic: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional context or questions..."
                value={requestForm.notes}
                onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">One-to-One Best Practices</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Come prepared with specific questions</li>
                <li>• Share your ideal referral profile</li>
                <li>• Listen actively and take notes</li>
                <li>• Follow up within 24 hours</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsRequestDialogOpen(false);
              setSelectedMember(null);
            }}>
              Cancel
            </Button>
            <Button onClick={submitRequest} disabled={!requestForm.targetId || !requestForm.topic}>
              <Calendar className="mr-2 h-4 w-4" />
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Referral Dialog */}
      <CreateReferralDialog
        open={isReferralDialogOpen}
        onOpenChange={setIsReferralDialogOpen}
        recipientId={selectedMember?.id}
        recipientName={selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : undefined}
        sourceContext="networking"
      />
    </div>
  );
}
