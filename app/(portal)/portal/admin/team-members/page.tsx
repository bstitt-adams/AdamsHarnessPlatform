"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/user-profile-context";
import { canDeleteUser, canEditUser, isSuperAdmin } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronRight,
  Plus,
  Search,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Users,
  RefreshCw,
  Upload,
  UserCheck,
  UserX,
  LayoutGrid,
  List,
  Globe,
  ExternalLink,
  Calendar,
  X,
  CalendarPlus,
  Clock,
} from "lucide-react";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberDoc, type OneToOneQueueItemDoc } from "@/lib/schema";
import { logTeamMemberAdded, logActivity } from "@/lib/activity-logger";
import Link from "next/link";

// Seed data for Team Members
const seedTeamMembers: Omit<TeamMemberDoc, "id" | "createdAt" | "updatedAt">[] = [
  { firstName: "Brian", lastName: "Stitt", emailPrimary: "bstitt@adams-electric.com", expertise: "Advanced Technology/Robotics", role: "superadmin", status: "active" },
];

export default function TeamMembersPage() {
  const { linkedTeamMember } = useUserProfile();
  const currentUserRole = linkedTeamMember?.role || "affiliate";
  
  const [members, setMembers] = useState<TeamMemberDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberDoc | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [schedulingList, setSchedulingList] = useState<OneToOneQueueItemDoc[]>([]);
  const [showSchedulingPanel, setShowSchedulingPanel] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [syncingAuth, setSyncingAuth] = useState(false);
  const [createAuthDialogOpen, setCreateAuthDialogOpen] = useState(false);
  const [createAuthForm, setCreateAuthForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "team" as "superadmin" | "admin" | "team" | "affiliate" | "consultant" | "client",
  });
  const [creatingAuthUser, setCreatingAuthUser] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    emailPrimary: "",
    emailSecondary: "",
    mobile: "",
    workPhone: "",
    homePhone: "",
    expertise: "",
    title: "",
    workforceDepartmentName: "",
    businessUnitNames: [] as string[],
    company: "",
    location: "",
    bio: "",
    linkedIn: "",
    website: "",
    role: "affiliate" as "superadmin" | "admin" | "team" | "affiliate" | "consultant" | "client",
    status: "active" as "active" | "inactive" | "pending",
    // Leadership flags
    isCEO: false,
    isCOO: false,
    isCTO: false,
    isCRO: false,
  });

  // Fetch members from Firebase
  const fetchMembers = async () => {
    if (!db) {
      console.error("Firebase not initialized");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.TEAM_MEMBERS));
      const membersData: TeamMemberDoc[] = [];
      querySnapshot.forEach((docSnap) => {
        membersData.push({ id: docSnap.id, ...docSnap.data() } as TeamMemberDoc);
      });
      // Sort by last name
      membersData.sort((a, b) => a.lastName.localeCompare(b.lastName));
      setMembers(membersData);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchSchedulingQueue();
  }, []);

  // Fetch 1-to-1 scheduling queue from Firebase
  const fetchSchedulingQueue = async () => {
    if (!db) return;
    setLoadingQueue(true);
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.ONE_TO_ONE_QUEUE));
      const queueData: OneToOneQueueItemDoc[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'queued') {
          queueData.push({ id: docSnap.id, ...data } as OneToOneQueueItemDoc);
        }
      });
      // Sort by priority
      queueData.sort((a, b) => a.priority - b.priority);
      setSchedulingList(queueData);
      if (queueData.length > 0) {
        setShowSchedulingPanel(true);
      }
    } catch (error) {
      console.error("Error fetching scheduling queue:", error);
    } finally {
      setLoadingQueue(false);
    }
  };

  // Sync Firebase Auth users with Team Members by email
  const handleSyncAuthUsers = async () => {
    if (!auth?.currentUser) {
      toast.error("You must be signed in to sync users");
      return;
    }
    setSyncingAuth(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/team-members/sync-auth", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }
      toast.success(`Synced auth users: ${data.matched} linked, ${data.alreadyLinked} already linked, ${data.unmatched} unmatched`);
      await fetchMembers();
    } catch (error) {
      console.error("Sync auth users error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sync auth users");
    } finally {
      setSyncingAuth(false);
    }
  };

  // Create Firebase Auth user and matching Team Member
  const handleCreateAuthUser = async () => {
    if (!auth?.currentUser) {
      toast.error("You must be signed in to create a user");
      return;
    }
    if (!createAuthForm.email || !createAuthForm.password || !createAuthForm.firstName || !createAuthForm.lastName) {
      toast.error("Please fill in all required fields");
      return;
    }
    setCreatingAuthUser(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/team-members/create-auth-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createAuthForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }
      toast.success(`Created auth user and team member for ${data.email}`);
      setCreateAuthDialogOpen(false);
      setCreateAuthForm({ firstName: "", lastName: "", email: "", password: "", role: "team" });
      await fetchMembers();
    } catch (error) {
      console.error("Create auth user error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create auth user");
    } finally {
      setCreatingAuthUser(false);
    }
  };

  // Seed initial data
  const handleSeedData = async () => {
    if (!db) {
      toast.error("Firebase not initialized. Check your environment variables.");
      return;
    }
    if (!confirm(`This will import ${seedTeamMembers.length} team members. Continue?`)) return;
    
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      const collectionRef = collection(db, COLLECTIONS.TEAM_MEMBERS);
      
      for (const member of seedTeamMembers) {
        const docRef = doc(collectionRef);
        batch.set(docRef, {
          ...member,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      
      await batch.commit();
      await fetchMembers();
      toast.success(`Successfully imported ${seedTeamMembers.length} team members!`);
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error("Error importing data. Check console for details.");
    } finally {
      setSeeding(false);
    }
  };

  // Add or update member
  const handleSaveMember = async () => {
    if (!db) {
      toast.error("Firebase not initialized");
      return;
    }
    try {
      if (editingMember) {
        const docRef = doc(db, COLLECTIONS.TEAM_MEMBERS, editingMember.id);
        await updateDoc(docRef, {
          ...formData,
          updatedAt: Timestamp.now(),
        });
        // Log activity
        await logActivity({
          type: "update",
          entityType: "team-member",
          entityId: editingMember.id,
          entityName: `${formData.firstName} ${formData.lastName}`,
          description: `Team member updated: ${formData.firstName} ${formData.lastName}`,
        });
      } else {
        const docRef = await addDoc(collection(db, COLLECTIONS.TEAM_MEMBERS), {
          ...formData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        // Log activity
        await logTeamMemberAdded(docRef.id, `${formData.firstName} ${formData.lastName}`);
      }
      setDialogOpen(false);
      resetForm();
      await fetchMembers();
    } catch (error) {
      console.error("Error saving member:", error);
      toast.error("Error saving member. Check console for details.");
    }
  };

  // Update all members' website from email domain
  const updateWebsitesFromEmail = async () => {
    if (!db) return;
    if (!confirm("This will update the website field for all team members (without existing websites) based on their email domain. Continue?")) return;
    
    // Personal email domains to exclude
    const personalDomains = [
      "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", 
      "aol.com", "live.com", "icloud.com", "msn.com", "me.com",
      "mail.com", "protonmail.com", "zoho.com"
    ];
    
    try {
      const batch = writeBatch(db);
      let updateCount = 0;
      let skippedPersonal = 0;
      let skippedExisting = 0;
      
      for (const member of members) {
        // Check if member has an email and no website (or empty website)
        const hasEmail = member.emailPrimary && member.emailPrimary.includes("@");
        const hasWebsite = member.website && member.website.trim().length > 0;
        
        if (hasEmail && !hasWebsite) {
          const emailDomain = member.emailPrimary.split("@")[1]?.toLowerCase();
          
          // Check if it's a personal email domain
          const isPersonalDomain = personalDomains.some(pd => emailDomain === pd || emailDomain?.endsWith(`.${pd}`));
          
          if (emailDomain && !isPersonalDomain) {
            const website = `https://www.${emailDomain}`;
            const docRef = doc(db, COLLECTIONS.TEAM_MEMBERS, member.id);
            batch.update(docRef, { website, updatedAt: Timestamp.now() });
            updateCount++;
            console.log(`Updating ${member.firstName} ${member.lastName}: ${website}`);
          } else if (isPersonalDomain) {
            skippedPersonal++;
            console.log(`Skipped personal email: ${member.firstName} ${member.lastName} (${emailDomain})`);
          }
        } else if (hasWebsite) {
          skippedExisting++;
        }
      }
      
      if (updateCount > 0) {
        await batch.commit();
        toast.success(`Updated ${updateCount} team members with website URLs. Skipped: ${skippedExisting} with existing websites, ${skippedPersonal} with personal emails.`);
        await fetchMembers();
      } else {
        toast.info(`No members needed website updates. Skipped: ${skippedExisting} with existing websites, ${skippedPersonal} with personal emails.`);
      }
    } catch (error) {
      console.error("Error updating websites:", error);
      toast.error("Error updating websites. Check console for details.");
    }
  };

  // Delete member with role-based permission check
  const handleDeleteMember = async (id: string, memberName: string, memberRole: string) => {
    if (!db) return;
    
    // Check if current user can delete this member
    if (!canDeleteUser(currentUserRole, memberRole)) {
      if (memberRole === "superadmin") {
        toast.error("Only SuperAdmins can delete other SuperAdmin accounts.");
      } else {
        toast.error("You don't have permission to delete this user.");
      }
      return;
    }
    
    if (!confirm("Are you sure you want to delete this team member?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.TEAM_MEMBERS, id));
      // Log activity
      await logActivity({
        type: "delete",
        entityType: "team-member",
        entityId: id,
        entityName: memberName,
        description: `Team member removed: ${memberName}`,
      });
      toast.success(`${memberName} has been deleted.`);
      await fetchMembers();
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error("Error deleting member.");
    }
  };

  // Edit member with role-based permission check
  const handleEditMember = (member: TeamMemberDoc) => {
    // Check if current user can edit this member
    if (!canEditUser(currentUserRole, member.role)) {
      if (member.role === "superadmin") {
        toast.error("Only SuperAdmins can edit other SuperAdmin accounts.");
      } else {
        toast.error("You don't have permission to edit this user.");
      }
      return;
    }
    
    setEditingMember(member);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      middleName: member.middleName || "",
      emailPrimary: member.emailPrimary,
      emailSecondary: member.emailSecondary || "",
      mobile: member.mobile || "",
      workPhone: member.workPhone || member.mobile || "",
      homePhone: member.homePhone || "",
      expertise: member.expertise,
      title: member.title || "",
      workforceDepartmentName: member.workforceDepartmentName || "",
      businessUnitNames: member.businessUnitNames || [],
      company: member.company || "",
      location: member.location || "",
      bio: member.bio || "",
      linkedIn: member.linkedIn || "",
      website: member.website || "",
      role: member.role,
      status: member.status,
      isCEO: member.isCEO || false,
      isCOO: member.isCOO || false,
      isCTO: member.isCTO || false,
      isCRO: member.isCRO || false,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingMember(null);
    setFormData({
      firstName: "",
      lastName: "",
      middleName: "",
      emailPrimary: "",
      emailSecondary: "",
      mobile: "",
      workPhone: "",
      homePhone: "",
      expertise: "",
      title: "",
      workforceDepartmentName: "",
      businessUnitNames: [],
      company: "",
      location: "",
      bio: "",
      linkedIn: "",
      website: "",
      role: "affiliate",
      status: "active",
      isCEO: false,
      isCOO: false,
      isCTO: false,
      isCRO: false,
    });
  };

  // 1-to-1 Scheduling functions
  const addToSchedulingList = async (member: TeamMemberDoc) => {
    if (!db) return;
    // Check if already in queue
    if (schedulingList.find(m => m.teamMemberId === member.id)) return;
    
    try {
      const queueItem: Omit<OneToOneQueueItemDoc, 'id'> = {
        teamMemberId: member.id,
        teamMemberName: `${member.firstName} ${member.lastName}`,
        teamMemberEmail: member.emailPrimary,
        teamMemberExpertise: member.expertise || '',
        teamMemberAvatar: member.avatar || '',
        status: 'queued',
        priority: schedulingList.length + 1,
        addedBy: 'current-user', // TODO: Get actual user ID
        addedByName: 'Current User',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, COLLECTIONS.ONE_TO_ONE_QUEUE), queueItem);
      const newItem: OneToOneQueueItemDoc = { id: docRef.id, ...queueItem } as OneToOneQueueItemDoc;
      setSchedulingList([...schedulingList, newItem]);
      setShowSchedulingPanel(true);
    } catch (error) {
      console.error("Error adding to scheduling queue:", error);
    }
  };

  const removeFromSchedulingList = async (queueItemId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ONE_TO_ONE_QUEUE, queueItemId));
      setSchedulingList(schedulingList.filter(m => m.id !== queueItemId));
    } catch (error) {
      console.error("Error removing from scheduling queue:", error);
    }
  };

  const isInSchedulingList = (memberId: string) => {
    return schedulingList.some(m => m.teamMemberId === memberId);
  };

  const getQueueItemId = (memberId: string) => {
    const item = schedulingList.find(m => m.teamMemberId === memberId);
    return item?.id;
  };

  const clearSchedulingList = async () => {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      for (const item of schedulingList) {
        batch.delete(doc(db, COLLECTIONS.ONE_TO_ONE_QUEUE, item.id));
      }
      await batch.commit();
      setSchedulingList([]);
    } catch (error) {
      console.error("Error clearing scheduling queue:", error);
    }
  };

  // Filter members
  const filteredMembers = members.filter((member) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      member.firstName.toLowerCase().includes(searchLower) ||
      member.lastName.toLowerCase().includes(searchLower) ||
      member.emailPrimary.toLowerCase().includes(searchLower) ||
      member.expertise.toLowerCase().includes(searchLower);
    
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-100 text-red-800">Admin</Badge>;
      case "team":
        return <Badge className="bg-blue-100 text-blue-800">Team</Badge>;
      case "affiliate":
        return <Badge className="bg-green-100 text-green-800">Affiliate</Badge>;
      case "consultant":
        return <Badge className="bg-purple-100 text-purple-800">Consultant</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>Admin</span>
            <ChevronRight className="h-4 w-4" />
            <span>Team Members</span>
          </div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">
            Manage Adams team members, affiliates, and consultants
          </p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin(currentUserRole) && (
            <>
              <Button variant="outline" onClick={handleSyncAuthUsers} disabled={syncingAuth}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncingAuth ? "animate-spin" : ""}`} />
                Sync Auth Users
              </Button>
              <Button variant="outline" onClick={() => setCreateAuthDialogOpen(true)}>
                <UserCheck className="mr-2 h-4 w-4" />
                Create Auth User
              </Button>
            </>
          )}
          {members.length > 0 && (
            <Button variant="outline" onClick={updateWebsitesFromEmail}>
              <Globe className="mr-2 h-4 w-4" />
              Update Websites
            </Button>
          )}
          {members.length === 0 && (
            <Button variant="outline" onClick={handleSeedData} disabled={seeding}>
              {seeding ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Import {seedTeamMembers.length} Members
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? "Edit Team Member" : "Add Team Member"}
                </DialogTitle>
                <DialogDescription>
                  {editingMember 
                    ? "Update the team member's information below."
                    : "Enter the details for the new team member."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={formData.middleName}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                      placeholder="Michael"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailPrimary">Email (Primary) *</Label>
                    <Input
                      id="emailPrimary"
                      type="email"
                      value={formData.emailPrimary}
                      onChange={(e) => setFormData({ ...formData, emailPrimary: e.target.value })}
                      placeholder="john@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailSecondary">Email (Secondary)</Label>
                    <Input
                      id="emailSecondary"
                      type="email"
                      value={formData.emailSecondary}
                      onChange={(e) => setFormData({ ...formData, emailSecondary: e.target.value })}
                      placeholder="john@gmail.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workPhone">Work Phone</Label>
                    <Input
                      id="workPhone"
                      value={formData.workPhone}
                      onChange={(e) => setFormData({ ...formData, workPhone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homePhone">Home Phone</Label>
                    <Input
                      id="homePhone"
                      value={formData.homePhone}
                      onChange={(e) => setFormData({ ...formData, homePhone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "superadmin" | "admin" | "team" | "affiliate" | "consultant") => 
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="affiliate">Affiliate</SelectItem>
                        <SelectItem value="consultant">Consultant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expertise">Expertise *</Label>
                  <Input
                    id="expertise"
                    value={formData.expertise}
                    onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                    placeholder="e.g., Operations, Six Sigma, Marketing"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="workforceDepartmentName">Workforce Department</Label>
                    <Input
                      id="workforceDepartmentName"
                      value={formData.workforceDepartmentName}
                      onChange={(e) => setFormData({ ...formData, workforceDepartmentName: e.target.value })}
                      placeholder="e.g., Electrician"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessUnitNames">Business Units</Label>
                    <Input
                      id="businessUnitNames"
                      value={formData.businessUnitNames.join(", ")}
                      onChange={(e) => setFormData({ ...formData, businessUnitNames: e.target.value.split(",").map((value) => value.trim()).filter(Boolean) })}
                      placeholder="e.g., Mission Critical"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Senior Consultant"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedIn">LinkedIn</Label>
                    <Input
                      id="linkedIn"
                      value={formData.linkedIn}
                      onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="City, State"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive" | "pending") => 
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Brief biography..."
                    rows={3}
                  />
                </div>
                
                {/* Leadership Role Flags */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <Label className="text-sm font-medium">Leadership Roles (for About/Leadership pages)</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Check the boxes below to display this team member on the About and Leadership pages with the corresponding role.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isCEO"
                        checked={formData.isCEO}
                        onChange={(e) => setFormData({ ...formData, isCEO: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="isCEO" className="text-sm font-normal cursor-pointer">
                        CEO / Chief Executive Officer
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isCOO"
                        checked={formData.isCOO}
                        onChange={(e) => setFormData({ ...formData, isCOO: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="isCOO" className="text-sm font-normal cursor-pointer">
                        COO / Chief Operations Officer
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isCTO"
                        checked={formData.isCTO}
                        onChange={(e) => setFormData({ ...formData, isCTO: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="isCTO" className="text-sm font-normal cursor-pointer">
                        CTO / Chief Technology Officer
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isCRO"
                        checked={formData.isCRO}
                        onChange={(e) => setFormData({ ...formData, isCRO: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="isCRO" className="text-sm font-normal cursor-pointer">
                        CRO / Chief Revenue Officer
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMember} disabled={!formData.firstName || !formData.lastName || !formData.emailPrimary || !formData.expertise}>
                  {editingMember ? "Update Member" : "Add Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Auth User Dialog */}
          <Dialog open={createAuthDialogOpen} onOpenChange={setCreateAuthDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Firebase Auth User</DialogTitle>
                <DialogDescription>
                  Creates a Firebase Authentication user and a matching Team Member record.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="authFirstName">First Name *</Label>
                    <Input
                      id="authFirstName"
                      value={createAuthForm.firstName}
                      onChange={(e) => setCreateAuthForm({ ...createAuthForm, firstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authLastName">Last Name *</Label>
                    <Input
                      id="authLastName"
                      value={createAuthForm.lastName}
                      onChange={(e) => setCreateAuthForm({ ...createAuthForm, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authEmail">Email *</Label>
                  <Input
                    id="authEmail"
                    type="email"
                    value={createAuthForm.email}
                    onChange={(e) => setCreateAuthForm({ ...createAuthForm, email: e.target.value })}
                    placeholder="john.doe@adams-electric.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authPassword">Password *</Label>
                  <Input
                    id="authPassword"
                    type="password"
                    value={createAuthForm.password}
                    onChange={(e) => setCreateAuthForm({ ...createAuthForm, password: e.target.value })}
                    placeholder="Min 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authRole">Role *</Label>
                  <Select
                    value={createAuthForm.role}
                    onValueChange={(value) => setCreateAuthForm({ ...createAuthForm, role: value as typeof createAuthForm.role })}
                  >
                    <SelectTrigger id="authRole">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="superadmin">SuperAdmin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="team">Team Member</SelectItem>
                      <SelectItem value="affiliate">Affiliate</SelectItem>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateAuthDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAuthUser}
                  disabled={creatingAuthUser || !createAuthForm.firstName || !createAuthForm.lastName || !createAuthForm.email || !createAuthForm.password}
                >
                  {creatingAuthUser ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">In the network</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {members.filter((m) => m.role === "admin").length}
            </div>
            <p className="text-xs text-muted-foreground">Platform admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {members.filter((m) => m.role === "team").length}
            </div>
            <p className="text-xs text-muted-foreground">Core team members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Affiliates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {members.filter((m) => m.role === "affiliate").length}
            </div>
            <p className="text-xs text-muted-foreground">Network affiliates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {members.filter((m) => m.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or expertise..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="affiliate">Affiliate</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="px-3"
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button
                variant={viewMode === "card" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="px-3"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Cards
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Content */}
      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No team members found</h3>
              <p className="text-muted-foreground mb-4">
                {members.length === 0 
                  ? "Get started by importing the initial team member data."
                  : "Try adjusting your search or filter."}
              </p>
              {members.length === 0 && (
                <Button onClick={handleSeedData} disabled={seeding}>
                  {seeding ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Import {seedTeamMembers.length} Members
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* List View */
        <Card>
          <CardHeader>
            <CardTitle>Team Directory</CardTitle>
            <CardDescription>
              {filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Expertise</TableHead>
                    <TableHead className="hidden md:table-cell">Website</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <button
                              onClick={() => handleEditMember(member)}
                              className="font-medium hover:underline text-left text-primary"
                            >
                              {member.firstName} {member.lastName}
                            </button>
                            {member.title && (
                              <p className="text-xs text-muted-foreground">{member.title}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <a href={`mailto:${member.emailPrimary}`} className="hover:underline">
                              {member.emailPrimary}
                            </a>
                          </div>
                          {member.mobile && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {member.mobile}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-xs">
                        <p className="text-sm truncate" title={member.expertise}>
                          {member.expertise}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {member.website ? (
                          <a
                            href={member.website.startsWith('http') ? member.website : `https://${member.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Globe className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">
                              {member.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                      <TableCell>
                        {member.status === "active" ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : member.status === "pending" ? (
                          <Badge variant="outline" className="text-sky-600 border-sky-600">
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            <UserX className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" title="View connected records">
                            <Link href={`/portal/admin/team-members/${member.id}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant={isInSchedulingList(member.id) ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => {
                              const queueItemId = getQueueItemId(member.id);
                              if (queueItemId) {
                                removeFromSchedulingList(queueItemId);
                              } else {
                                addToSchedulingList(member);
                              }
                            }}
                            title={isInSchedulingList(member.id) ? "Remove from 1-to-1 list" : "Add to 1-to-1 list"}
                          >
                            <CalendarPlus className={`h-4 w-4 ${isInSchedulingList(member.id) ? "text-primary" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditMember(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMember(member.id, `${member.firstName} ${member.lastName}`, member.role)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Card View */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>
                        {getInitials(member.firstName, member.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {member.firstName} {member.lastName}
                      </CardTitle>
                      {member.title && (
                        <CardDescription>{member.title}</CardDescription>
                      )}
                    </div>
                  </div>
                  {getRoleBadge(member.role)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Workforce Department</p>
                  <p className="text-sm">{member.workforceDepartmentName || member.expertise}</p>
                  {member.businessUnitNames?.length ? (
                    <p className="text-xs text-muted-foreground mt-1">{member.businessUnitNames.join(", ")}</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <a href={`mailto:${member.emailPrimary}`} className="hover:underline truncate">
                      {member.emailPrimary}
                    </a>
                  </div>
                  {member.mobile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {member.mobile}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2">
                  {member.status === "active" ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : member.status === "pending" ? (
                    <Badge variant="outline" className="text-sky-600 border-sky-600">
                      Pending
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600">
                      <UserX className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                  <div className="flex gap-1">
                    <Button asChild variant="outline" size="sm" title="View connected records">
                      <Link href={`/portal/admin/team-members/${member.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant={isInSchedulingList(member.id) ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => {
                        const queueItemId = getQueueItemId(member.id);
                        if (queueItemId) {
                          removeFromSchedulingList(queueItemId);
                        } else {
                          addToSchedulingList(member);
                        }
                      }}
                      title={isInSchedulingList(member.id) ? "Remove from 1-to-1 list" : "Add to 1-to-1 list"}
                    >
                      <CalendarPlus className={`h-4 w-4 ${isInSchedulingList(member.id) ? "text-primary" : ""}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditMember(member)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMember(member.id, `${member.firstName} ${member.lastName}`, member.role)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 1-to-1 Scheduling Panel */}
      {showSchedulingPanel && (
        <div className="fixed bottom-4 right-4 w-96 bg-background border rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">1-to-1 Scheduling List</h3>
              <Badge variant="secondary">{schedulingList.length}</Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSchedulingPanel(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {schedulingList.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CalendarPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No members added yet</p>
                <p className="text-xs">Click the calendar icon on any member to add them</p>
              </div>
            ) : (
              <div className="space-y-2">
                {schedulingList.map((queueItem) => (
                  <div
                    key={queueItem.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={queueItem.teamMemberAvatar} />
                        <AvatarFallback className="text-xs">
                          {queueItem.teamMemberName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {queueItem.teamMemberName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {queueItem.teamMemberExpertise}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromSchedulingList(queueItem.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {schedulingList.length > 0 && (
            <div className="p-4 border-t space-y-2">
              <Button className="w-full" asChild>
                <a href={`/portal/calendar?schedule=${schedulingList.map(m => m.id).join(',')}`}>
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule 1-to-1 Meetings
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={clearSchedulingList}
              >
                Clear List
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Floating button to show scheduling panel when hidden but has items */}
      {!showSchedulingPanel && schedulingList.length > 0 && (
        <Button
          className="fixed bottom-4 right-4 z-50 shadow-lg"
          onClick={() => setShowSchedulingPanel(true)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          1-to-1 List ({schedulingList.length})
        </Button>
      )}
    </div>
  );
}
