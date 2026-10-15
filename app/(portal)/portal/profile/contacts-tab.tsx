"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Users,
  Building2,
  Handshake,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  Filter,
  UserCheck,
  Briefcase,
  Loader2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS, type TeamMemberDoc, type StrategicPartnerDoc } from "@/lib/schema";
import { logActivity } from "@/lib/activity-logger";

// Unified contact type for display
interface UnifiedContact {
  id: string;
  source: "team_member" | "strategic_partner";
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  expertise: string;
  website?: string;
  linkedIn?: string;
  avatar?: string;
  role?: string; // For team members: admin, team, affiliate, consultant
  status: string;
  isClient: boolean;
  contactTypes: string[]; // affiliate, partner, client, team, etc.
}

function getContactTypeBadges(contact: UnifiedContact) {
  const badges: { label: string; variant: "default" | "secondary" | "outline" | "destructive" }[] = [];
  
  if (contact.source === "team_member") {
    if (contact.role === "affiliate") {
      badges.push({ label: "Affiliate", variant: "default" });
    } else if (contact.role === "team") {
      badges.push({ label: "Team", variant: "secondary" });
    } else if (contact.role === "admin") {
      badges.push({ label: "Admin", variant: "destructive" });
    } else if (contact.role === "consultant") {
      badges.push({ label: "Consultant", variant: "outline" });
    }
  } else if (contact.source === "strategic_partner") {
    badges.push({ label: "Partner", variant: "outline" });
  }
  
  if (contact.isClient) {
    badges.push({ label: "Client", variant: "default" });
  }
  
  return badges;
}

export default function ContactsTab() {
  const [contacts, setContacts] = useState<UnifiedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedContact, setSelectedContact] = useState<UnifiedContact | null>(null);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  async function fetchContacts() {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      const allContacts: UnifiedContact[] = [];

      // Fetch Team Members (includes affiliates)
      const teamRef = collection(db, COLLECTIONS.TEAM_MEMBERS);
      const teamSnapshot = await getDocs(query(teamRef));
      teamSnapshot.forEach((doc) => {
        const data = doc.data() as TeamMemberDoc;
        const contactTypes: string[] = [];
        if (data.role === "affiliate") contactTypes.push("affiliate");
        if (data.role === "team") contactTypes.push("team");
        if (data.role === "admin") contactTypes.push("admin");
        if (data.role === "consultant") contactTypes.push("consultant");
        if (data.isClient) contactTypes.push("client");

        allContacts.push({
          id: doc.id,
          source: "team_member",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.emailPrimary || "",
          phone: data.mobile,
          company: data.company,
          expertise: data.expertise || "",
          website: data.website,
          linkedIn: data.linkedIn,
          avatar: data.avatar,
          role: data.role,
          status: data.status,
          isClient: data.isClient || false,
          contactTypes,
        });
      });

      // Fetch Strategic Partners
      const partnersRef = collection(db, COLLECTIONS.STRATEGIC_PARTNERS);
      const partnersSnapshot = await getDocs(query(partnersRef));
      partnersSnapshot.forEach((doc) => {
        const data = doc.data() as StrategicPartnerDoc;
        const contactTypes: string[] = ["partner"];
        if (data.isClient) contactTypes.push("client");

        allContacts.push({
          id: doc.id,
          source: "strategic_partner",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phone: data.phone,
          company: data.company,
          expertise: data.expertise || "",
          website: data.website,
          linkedIn: data.linkedIn,
          avatar: data.logo,
          status: data.status,
          isClient: data.isClient || false,
          contactTypes,
        });
      });

      // Sort by name
      allContacts.sort((a, b) => 
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      );

      setContacts(allContacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleClientStatus(contact: UnifiedContact) {
    if (!db) return;
    
    setIsUpdating(true);
    try {
      const collectionName = contact.source === "team_member" 
        ? COLLECTIONS.TEAM_MEMBERS 
        : COLLECTIONS.STRATEGIC_PARTNERS;
      
      const docRef = doc(db, collectionName, contact.id);
      const newIsClient = !contact.isClient;
      
      await updateDoc(docRef, {
        isClient: newIsClient,
        clientSince: newIsClient ? Timestamp.now() : null,
        updatedAt: Timestamp.now(),
      });

      // Log activity
      await logActivity({
        type: "update",
        entityType: contact.source === "team_member" ? "team-member" : "organization",
        entityId: contact.id,
        entityName: `${contact.firstName} ${contact.lastName}`,
        description: newIsClient 
          ? `${contact.firstName} ${contact.lastName} marked as client`
          : `${contact.firstName} ${contact.lastName} removed as client`,
      });

      // Update local state
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contact.id
            ? { 
                ...c, 
                isClient: newIsClient,
                contactTypes: newIsClient 
                  ? [...c.contactTypes.filter(t => t !== "client"), "client"]
                  : c.contactTypes.filter(t => t !== "client")
              }
            : c
        )
      );

      setShowClientDialog(false);
      setSelectedContact(null);
    } catch (error) {
      console.error("Error updating client status:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  // Filter contacts
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = 
      `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.expertise.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesType = true;
    if (typeFilter === "affiliates") {
      matchesType = contact.contactTypes.includes("affiliate");
    } else if (typeFilter === "partners") {
      matchesType = contact.contactTypes.includes("partner");
    } else if (typeFilter === "clients") {
      matchesType = contact.isClient;
    } else if (typeFilter === "team") {
      matchesType = contact.contactTypes.includes("team") || contact.contactTypes.includes("admin");
    }
    
    return matchesSearch && matchesType;
  });

  // Stats
  const affiliateCount = contacts.filter(c => c.contactTypes.includes("affiliate")).length;
  const partnerCount = contacts.filter(c => c.contactTypes.includes("partner")).length;
  const clientCount = contacts.filter(c => c.isClient).length;
  const teamCount = contacts.filter(c => c.contactTypes.includes("team") || c.contactTypes.includes("admin")).length;

  const getInitials = (firstName: string, lastName: string) => {
    return `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase() || "??";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setTypeFilter("affiliates")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{affiliateCount}</p>
                <p className="text-sm text-muted-foreground">Affiliates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setTypeFilter("partners")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Handshake className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{partnerCount}</p>
                <p className="text-sm text-muted-foreground">Partners</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setTypeFilter("clients")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clientCount}</p>
                <p className="text-sm text-muted-foreground">Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setTypeFilter("team")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Building2 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teamCount}</p>
                <p className="text-sm text-muted-foreground">Team</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, company, or expertise..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                <SelectItem value="affiliates">Affiliates</SelectItem>
                <SelectItem value="partners">Partners</SelectItem>
                <SelectItem value="clients">Clients</SelectItem>
                <SelectItem value="team">Team Members</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {typeFilter === "all" ? "All Contacts" : 
             typeFilter === "affiliates" ? "Affiliates" :
             typeFilter === "partners" ? "Partners" :
             typeFilter === "clients" ? "Clients" : "Team Members"}
          </CardTitle>
          <CardDescription>
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Expertise</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead className="text-center">Client</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <TableRow key={`${contact.source}-${contact.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contact.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(contact.firstName, contact.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                          <p className="text-sm text-muted-foreground">{contact.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getContactTypeBadges(contact).map((badge, i) => (
                          <Badge key={i} variant={badge.variant} className="text-xs">
                            {badge.label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{contact.company || "-"}</TableCell>
                    <TableCell>
                      <span className="text-sm line-clamp-2">{contact.expertise || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="text-muted-foreground hover:text-primary">
                            <Mail className="h-4 w-4" />
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="text-muted-foreground hover:text-primary">
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        {contact.website && (
                          <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        {contact.linkedIn && (
                          <a href={contact.linkedIn} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={contact.isClient}
                        onCheckedChange={() => {
                          setSelectedContact(contact);
                          setShowClientDialog(true);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchQuery || typeFilter !== "all"
                          ? "No contacts match your search"
                          : "No contacts found"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Client Status Dialog */}
      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedContact?.isClient ? "Remove Client Status" : "Mark as Client"}
            </DialogTitle>
            <DialogDescription>
              {selectedContact?.isClient
                ? `Are you sure you want to remove ${selectedContact?.firstName} ${selectedContact?.lastName} as a client?`
                : `Mark ${selectedContact?.firstName} ${selectedContact?.lastName} as a client to serve them with Adams Tools.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedContact && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedContact.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(selectedContact.firstName, selectedContact.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedContact.firstName} {selectedContact.lastName}</p>
                  <p className="text-sm text-muted-foreground">{selectedContact.company}</p>
                  <div className="flex gap-1 mt-1">
                    {getContactTypeBadges(selectedContact).map((badge, i) => (
                      <Badge key={i} variant={badge.variant} className="text-xs">
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClientDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedContact && toggleClientStatus(selectedContact)}
              disabled={isUpdating}
              variant={selectedContact?.isClient ? "destructive" : "default"}
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : selectedContact?.isClient ? (
                "Remove as Client"
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Mark as Client
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
