"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ExternalLink,
  Pencil,
  Trash2,
  Users,
  Building2,
  Globe,
  Sparkles,
  RefreshCw,
  Upload,
  LayoutGrid,
  List,
  Video,
  X,
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
import { db } from "@/lib/firebase";
import { COLLECTIONS, type StrategicPartnerDoc, type ZoomRecording } from "@/lib/schema";
import { logActivity } from "@/lib/activity-logger";

// Initial seed data for Strategic Partners
const seedPartners: Omit<StrategicPartnerDoc, "id" | "createdAt" | "updatedAt">[] = [
  {
    firstName: "Brett",
    lastName: "Griffiths",
    company: "Lean Transition Solutions",
    website: "https://leantransitionsolutions.com",
    expertise: "Manufacturing Management and Business Intelligence Software Apps",
    status: "active",
  },
  {
    firstName: "Dr. Alan",
    lastName: "Barnard",
    company: "Goldratt Research Labs",
    website: "https://goldrattresearchlabs.com",
    expertise: "Supply Chain, Inventory, and Retail Digital Twins | Theory of Constraints | Antifragility",
    status: "active",
  },
  {
    firstName: "Harry",
    lastName: "Moser",
    company: "Reshoring Initiative",
    website: "https://reshorenow.org",
    expertise: "Advocate for Reshoring to the U.S. | Total Cost of Ownership",
    status: "active",
  },
  {
    firstName: "Keith",
    lastName: "Moore",
    company: "KDM Associates",
    website: "https://kdm-assoc.com/",
    expertise: "Access to Federal Contracting and Funding",
    status: "active",
  },
  {
    firstName: "Marc",
    lastName: "Hoover",
    company: "Trout Software",
    website: "https://trout.software",
    expertise: "Cybersecurity Digital Twins",
    status: "active",
  },
  {
    firstName: "Merlin",
    lastName: "Corbin",
    company: "Zenthium Energy",
    website: "https://zenthium.ai",
    expertise: "Energy Savings Software and Hardware (AI powered)",
    status: "active",
  },
  {
    firstName: "Rich",
    lastName: "Zhang",
    company: "Urbot",
    website: "https://urbot.ai",
    expertise: "Robotics for Hospitality, Restaurants, and Manufacturing",
    status: "active",
  },
];

export default function StrategicPartnersPage() {
  const [partners, setPartners] = useState<StrategicPartnerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<StrategicPartnerDoc | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    company: "",
    website: "",
    expertise: "",
    email: "",
    phone: "",
    linkedIn: "",
    notes: "",
    zoomRecordings: [] as ZoomRecording[],
    status: "active" as "active" | "inactive" | "pending",
  });
  const [newRecording, setNewRecording] = useState({ title: "", url: "", date: "" });

  // Fetch partners from Firebase
  const fetchPartners = async () => {
    if (!db) {
      console.error("Firebase not initialized");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.STRATEGIC_PARTNERS));
      const partnersData: StrategicPartnerDoc[] = [];
      querySnapshot.forEach((docSnap) => {
        partnersData.push({ id: docSnap.id, ...docSnap.data() } as StrategicPartnerDoc);
      });
      setPartners(partnersData);
    } catch (error) {
      console.error("Error fetching partners:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  // Seed initial data
  const handleSeedData = async () => {
    if (!db) {
      toast.error("Firebase not initialized. Check your environment variables.");
      return;
    }
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      const collectionRef = collection(db, COLLECTIONS.STRATEGIC_PARTNERS);
      
      for (const partner of seedPartners) {
        const docRef = doc(collectionRef);
        batch.set(docRef, {
          ...partner,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      
      await batch.commit();
      await fetchPartners();
      toast.success("Strategic Partners data seeded successfully!");
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error("Error seeding data. Check console for details.");
    } finally {
      setSeeding(false);
    }
  };

  // Add or update partner
  const handleSavePartner = async () => {
    if (!db) {
      toast.error("Firebase not initialized");
      return;
    }
    try {
      const partnerName = `${formData.firstName} ${formData.lastName}`;
      if (editingPartner) {
        // Update existing
        const docRef = doc(db, COLLECTIONS.STRATEGIC_PARTNERS, editingPartner.id);
        await updateDoc(docRef, {
          ...formData,
          updatedAt: Timestamp.now(),
        });
        await logActivity({
          type: "update",
          entityType: "organization",
          entityId: editingPartner.id,
          entityName: partnerName,
          description: `Strategic partner updated: ${partnerName}`,
        });
      } else {
        // Add new
        const docRef = await addDoc(collection(db, COLLECTIONS.STRATEGIC_PARTNERS), {
          ...formData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        await logActivity({
          type: "create",
          entityType: "organization",
          entityId: docRef.id,
          entityName: partnerName,
          description: `Strategic partner added: ${partnerName}`,
        });
      }
      setDialogOpen(false);
      resetForm();
      await fetchPartners();
    } catch (error) {
      console.error("Error saving partner:", error);
      toast.error("Error saving partner. Check console for details.");
    }
  };

  // Delete partner
  const handleDeletePartner = async (id: string, partnerName: string) => {
    if (!db) return;
    if (!confirm("Are you sure you want to delete this partner?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.STRATEGIC_PARTNERS, id));
      await logActivity({
        type: "delete",
        entityType: "organization",
        entityId: id,
        entityName: partnerName,
        description: `Strategic partner removed: ${partnerName}`,
      });
      await fetchPartners();
    } catch (error) {
      console.error("Error deleting partner:", error);
    }
  };

  // Edit partner
  const handleEditPartner = (partner: StrategicPartnerDoc) => {
    setEditingPartner(partner);
    setFormData({
      firstName: partner.firstName,
      lastName: partner.lastName,
      company: partner.company,
      website: partner.website,
      expertise: partner.expertise,
      email: partner.email || "",
      phone: partner.phone || "",
      linkedIn: partner.linkedIn || "",
      notes: partner.notes || "",
      zoomRecordings: partner.zoomRecordings || [],
      status: partner.status,
    });
    setNewRecording({ title: "", url: "", date: "" });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPartner(null);
    setFormData({
      firstName: "",
      lastName: "",
      company: "",
      website: "",
      expertise: "",
      email: "",
      phone: "",
      linkedIn: "",
      notes: "",
      zoomRecordings: [],
      status: "active",
    });
    setNewRecording({ title: "", url: "", date: "" });
  };

  // Add a new Zoom recording to the form
  const handleAddRecording = () => {
    if (!newRecording.title || !newRecording.url) return;
    setFormData({
      ...formData,
      zoomRecordings: [...formData.zoomRecordings, { ...newRecording }],
    });
    setNewRecording({ title: "", url: "", date: "" });
  };

  // Remove a Zoom recording from the form
  const handleRemoveRecording = (index: number) => {
    setFormData({
      ...formData,
      zoomRecordings: formData.zoomRecordings.filter((_, i) => i !== index),
    });
  };

  // Filter partners
  const filteredPartners = partners.filter((partner) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      partner.firstName.toLowerCase().includes(searchLower) ||
      partner.lastName.toLowerCase().includes(searchLower) ||
      partner.company.toLowerCase().includes(searchLower) ||
      partner.expertise.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>Admin</span>
            <ChevronRight className="h-4 w-4" />
            <span>Strategic Partners</span>
          </div>
          <h1 className="text-3xl font-bold">Strategic Partners</h1>
          <p className="text-muted-foreground">
            Manage technology and service partners that complement Adams offerings
          </p>
        </div>
        <div className="flex gap-2">
          {partners.length === 0 && (
            <Button variant="outline" onClick={handleSeedData} disabled={seeding}>
              {seeding ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Import Initial Data
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Partner
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPartner ? "Edit Strategic Partner" : "Add Strategic Partner"}
                </DialogTitle>
                <DialogDescription>
                  {editingPartner 
                    ? "Update the partner's information below."
                    : "Enter the details for the new strategic partner."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Company Name"
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
                <div className="space-y-2">
                  <Label htmlFor="expertise">Expertise</Label>
                  <Textarea
                    id="expertise"
                    value={formData.expertise}
                    onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                    placeholder="Areas of expertise..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedIn">LinkedIn (optional)</Label>
                  <Input
                    id="linkedIn"
                    value={formData.linkedIn}
                    onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
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
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>

                {/* Zoom Recordings Section */}
                <div className="space-y-3 border-t pt-4">
                  <Label className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Adams Zoom Recordings
                  </Label>
                  
                  {/* Existing recordings */}
                  {formData.zoomRecordings.length > 0 && (
                    <div className="space-y-2">
                      {formData.zoomRecordings.map((recording, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{recording.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{recording.url}</p>
                            {recording.date && (
                              <p className="text-xs text-muted-foreground">{recording.date}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => handleRemoveRecording(index)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new recording */}
                  <div className="space-y-2 p-3 border rounded-md bg-background">
                    <p className="text-sm font-medium">Add Recording</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Recording title"
                        value={newRecording.title}
                        onChange={(e) => setNewRecording({ ...newRecording, title: e.target.value })}
                      />
                      <Input
                        placeholder="Date (optional)"
                        value={newRecording.date}
                        onChange={(e) => setNewRecording({ ...newRecording, date: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Zoom recording URL"
                        value={newRecording.url}
                        onChange={(e) => setNewRecording({ ...newRecording, url: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddRecording}
                        disabled={!newRecording.title || !newRecording.url}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSavePartner}>
                  {editingPartner ? "Update Partner" : "Add Partner"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partners.length}</div>
            <p className="text-xs text-muted-foreground">Strategic partnerships</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {partners.filter((p) => p.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">
              {partners.filter((p) => p.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting activation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expertise Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {new Set(partners.flatMap((p) => p.expertise.split("|").map((e) => e.trim()))).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique specializations</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search partners by name, company, or expertise..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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

      {/* Partners Content */}
      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : filteredPartners.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No partners found</h3>
              <p className="text-muted-foreground mb-4">
                {partners.length === 0 
                  ? "Get started by importing the initial partner data."
                  : "Try adjusting your search query."}
              </p>
              {partners.length === 0 && (
                <Button onClick={handleSeedData} disabled={seeding}>
                  {seeding ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Import Initial Data
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* List View */
        <Card>
          <CardHeader>
            <CardTitle>Partners Directory</CardTitle>
            <CardDescription>
              Technology and service partners that extend Adams capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="hidden md:table-cell">Expertise</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">
                      {partner.firstName} {partner.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {partner.company}
                        <a
                          href={partner.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {partner.expertise.split("|").slice(0, 2).map((exp, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {exp.trim()}
                          </Badge>
                        ))}
                        {partner.expertise.split("|").length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{partner.expertise.split("|").length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          partner.status === "active"
                            ? "default"
                            : partner.status === "pending"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {partner.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPartner(partner)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePartner(partner.id, `${partner.firstName} ${partner.lastName}`)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Card View */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPartners.map((partner) => (
            <Card key={partner.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {partner.firstName} {partner.lastName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {partner.company}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={partner.status === "active" ? "default" : "secondary"}
                  >
                    {partner.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Expertise</p>
                  <p className="text-sm">{partner.expertise}</p>
                </div>
                {/* Zoom Recordings */}
                {partner.zoomRecordings && partner.zoomRecordings.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      Adams Zoom Recordings
                    </p>
                    <div className="space-y-1">
                      {partner.zoomRecordings.map((recording, idx) => (
                        <a
                          key={idx}
                          href={recording.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Video className="h-3 w-3" />
                          <span className="truncate">{recording.title}</span>
                          {recording.date && (
                            <span className="text-xs text-muted-foreground">({recording.date})</span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={partner.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="mr-2 h-4 w-4" />
                      Website
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPartner(partner)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePartner(partner.id, `${partner.firstName} ${partner.lastName}`)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
