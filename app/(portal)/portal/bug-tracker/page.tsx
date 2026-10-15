"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bug,
  Lightbulb,
  Plus,
  Search,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  Eye,
  Trash2,
  MessageSquare,
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/user-profile-context";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  COLLECTIONS,
  type BugTrackerItemDoc,
  type BugTrackerItemType,
  type BugTrackerItemStatus,
  type BugTrackerItemPriority,
  type BugTrackerComment,
} from "@/lib/schema";

// Local type for UI (with Date instead of Timestamp)
interface TrackerItem {
  id: string;
  type: BugTrackerItemType;
  title: string;
  description: string;
  status: BugTrackerItemStatus;
  priority: BugTrackerItemPriority;
  page?: string;
  reporterId: string;
  reporterName: string;
  assigneeId?: string;
  assigneeName?: string;
  tags: string[];
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

interface Comment {
  id: string;
  author: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

// Page options for the dropdown
const pageOptions = [
  { value: "none", label: "No specific page" },
  { value: "/", label: "Home Page" },
  { value: "/sign-in", label: "Sign In" },
  { value: "/portal", label: "Portal Home" },
  { value: "/portal/command-center", label: "Command Center" },
  { value: "/portal/opportunities", label: "Opportunities" },
  { value: "/portal/projects", label: "Projects" },
  { value: "/portal/affiliates", label: "Affiliates" },
  { value: "/portal/customers", label: "Customers" },
  { value: "/portal/documents", label: "Documents" },
  { value: "/portal/calendar", label: "Calendar" },
  { value: "/portal/meetings", label: "Meetings" },
  { value: "/portal/rocks", label: "Rocks" },
  { value: "/portal/deals", label: "Deals" },
  { value: "/portal/linkedin-content", label: "LinkedIn Content" },
  { value: "/portal/traction", label: "Traction Dashboard" },
  { value: "/portal/gohighlevel", label: "GoHighLevel" },
  { value: "/portal/settings", label: "Settings" },
  { value: "/portal/admin", label: "Admin Pages" },
  { value: "other", label: "Other (specify in description)" },
];

export default function BugTrackerPage() {
  const { profile } = useUserProfile();
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TrackerItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<TrackerItem | null>(null);
  const [newComment, setNewComment] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    type: "bug" as BugTrackerItemType,
    title: "",
    description: "",
    priority: "medium" as BugTrackerItemPriority,
    page: "none",
    tags: "",
  });

  // Load items from Firebase
  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    const itemsRef = collection(db, COLLECTIONS.BUG_TRACKER_ITEMS);
    const q = query(itemsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedItems: TrackerItem[] = snapshot.docs.map((doc) => {
          const data = doc.data() as BugTrackerItemDoc;
          return {
            id: doc.id,
            type: data.type,
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            page: data.page,
            reporterId: data.reporterId,
            reporterName: data.reporterName,
            assigneeId: data.assigneeId,
            assigneeName: data.assigneeName,
            tags: data.tags || [],
            comments: (data.comments || []).map((c: BugTrackerComment) => ({
              id: c.id,
              author: c.author,
              authorId: c.authorId,
              content: c.content,
              createdAt: c.createdAt?.toDate() || new Date(),
            })),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
        });
        setItems(loadedItems);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error loading bug tracker items:", error);
        toast.error("Failed to load items");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter items
  const filteredItems = items.filter((item) => {
    // Tab filter
    if (activeTab === "bugs" && item.type !== "bug") return false;
    if (activeTab === "ideas" && item.type !== "idea") return false;
    if (activeTab === "improvements" && item.type !== "improvement") return false;
    
    // Search filter
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    // Status filter
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    
    // Priority filter
    if (filterPriority !== "all" && item.priority !== filterPriority) return false;
    
    return true;
  });

  // Stats
  const stats = {
    total: items.length,
    open: items.filter(i => i.status === "open").length,
    inProgress: items.filter(i => i.status === "in_progress").length,
    resolved: items.filter(i => i.status === "resolved").length,
    bugs: items.filter(i => i.type === "bug").length,
    ideas: items.filter(i => i.type === "idea").length,
  };

  // Add new item
  const handleAddItem = async () => {
    if (!db || !profile) {
      toast.error("Unable to save. Please try again.");
      return;
    }

    setIsSaving(true);
    try {
      const itemsRef = collection(db, COLLECTIONS.BUG_TRACKER_ITEMS);
      const newItemData: Omit<BugTrackerItemDoc, "id"> = {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        status: "open",
        priority: formData.priority,
        page: formData.page !== "none" ? formData.page : undefined,
        reporterId: profile.id || "anonymous",
        reporterName: profile.firstName && profile.lastName 
          ? `${profile.firstName} ${profile.lastName}` 
          : profile.email || "Anonymous User",
        tags: formData.tags.split(",").map(t => t.trim()).filter(t => t),
        comments: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(itemsRef, newItemData);
      toast.success("Item created successfully!");
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to create item");
    } finally {
      setIsSaving(false);
    }
  };

  // Update item status
  const updateStatus = async (id: string, status: BugTrackerItemStatus) => {
    if (!db) return;

    const item = items.find((i) => i.id === id);
    const previousStatus = item?.status;

    try {
      const itemRef = doc(db, COLLECTIONS.BUG_TRACKER_ITEMS, id);
      await updateDoc(itemRef, {
        status,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Status updated to ${status.replace("_", " ")}`);

      // Update selected item if viewing
      if (selectedItem?.id === id) {
        setSelectedItem({ ...selectedItem, status });
      }

      // Send email notification when item is resolved/completed
      if (status === "resolved" && item && profile) {
        try {
          await fetch("/api/bug-tracker/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: item.id,
              title: item.title,
              description: item.description,
              type: item.type,
              status,
              priority: item.priority,
              page: item.page,
              reporterName: item.reporterName,
              reporterId: item.reporterId,
              assigneeName: item.assigneeName,
              assigneeId: item.assigneeId,
              tags: item.tags,
              createdAt: item.createdAt.toISOString(),
              updatedAt: new Date().toISOString(),
              comments: item.comments.map((comment) => ({
                id: comment.id,
                author: comment.author,
                authorId: comment.authorId,
                content: comment.content,
                createdAt: comment.createdAt.toISOString(),
              })),
              previousStatus,
              resolvedByName:
                profile.firstName && profile.lastName
                  ? `${profile.firstName} ${profile.lastName}`
                  : profile.email || "Unknown User",
              resolvedByEmail: profile.email || undefined,
              resolvedAt: new Date().toISOString(),
            }),
          });
        } catch (emailError) {
          console.error("Error sending bug tracker completion email:", emailError);
          // Don't block the status update if email fails
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  // Confirm delete
  const confirmDelete = (item: TrackerItem) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  // Delete item
  const deleteItem = async () => {
    if (!db || !itemToDelete) return;

    try {
      const itemRef = doc(db, COLLECTIONS.BUG_TRACKER_ITEMS, itemToDelete.id);
      await deleteDoc(itemRef);
      toast.success("Item deleted successfully!");
      setShowDeleteDialog(false);
      setItemToDelete(null);
      if (showViewDialog) {
        setShowViewDialog(false);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  // Add comment
  const addComment = async () => {
    if (!db || !selectedItem || !newComment.trim() || !profile) return;

    try {
      const comment: BugTrackerComment = {
        id: Date.now().toString(),
        author: profile.firstName && profile.lastName 
          ? `${profile.firstName} ${profile.lastName}` 
          : profile.email || "Anonymous User",
        authorId: profile.id || "anonymous",
        content: newComment,
        createdAt: Timestamp.now(),
      };

      const itemRef = doc(db, COLLECTIONS.BUG_TRACKER_ITEMS, selectedItem.id);
      const updatedComments = [
        ...selectedItem.comments.map(c => ({
          ...c,
          createdAt: Timestamp.fromDate(c.createdAt),
        })),
        comment,
      ];

      await updateDoc(itemRef, {
        comments: updatedComments,
        updatedAt: serverTimestamp(),
      });

      // Update local state for immediate feedback
      const newCommentLocal: Comment = {
        id: comment.id,
        author: comment.author,
        authorId: comment.authorId,
        content: comment.content,
        createdAt: new Date(),
      };

      setSelectedItem({
        ...selectedItem,
        comments: [...selectedItem.comments, newCommentLocal],
      });

      setNewComment("");
      toast.success("Comment added!");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      type: "bug",
      title: "",
      description: "",
      priority: "medium",
      page: "none",
      tags: "",
    });
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="h-4 w-4 text-red-500" />;
      case "idea":
        return <Lightbulb className="h-4 w-4 text-sky-500" />;
      case "improvement":
        return <Sparkles className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><AlertCircle className="h-3 w-3 mr-1" />Open</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case "closed":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><XCircle className="h-3 w-3 mr-1" />Closed</Badge>;
      case "wont_fix":
        return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Won't Fix</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge className="bg-red-500"><ArrowUpCircle className="h-3 w-3 mr-1" />Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500"><ArrowUpCircle className="h-3 w-3 mr-1" />High</Badge>;
      case "medium":
        return <Badge className="bg-sky-500 text-sky-900"><ArrowRightCircle className="h-3 w-3 mr-1" />Medium</Badge>;
      case "low":
        return <Badge variant="secondary"><ArrowDownCircle className="h-3 w-3 mr-1" />Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading bug tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <Bug className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                Bug & Idea Tracker
                <Badge variant="secondary" className="text-xs">
                  {stats.open} Open
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Track bugs, capture ideas, and manage improvements
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddDialog(true)} disabled={isSaving}>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-4 border-b">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Items</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
            <div className="text-xs text-muted-foreground">Open</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-sky-600">{stats.inProgress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-red-600">{stats.bugs}</div>
            <div className="text-xs text-muted-foreground">Bugs</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-sky-500">{stats.ideas}</div>
            <div className="text-xs text-muted-foreground">Ideas</div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b px-6 flex items-center justify-between">
            <TabsList className="h-12">
              <TabsTrigger value="all" className="gap-2">
                <FileText className="h-4 w-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="bugs" className="gap-2">
                <Bug className="h-4 w-4" />
                Bugs
              </TabsTrigger>
              <TabsTrigger value="ideas" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Ideas
              </TabsTrigger>
              <TabsTrigger value="improvements" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Improvements
              </TabsTrigger>
            </TabsList>
            
            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value={activeTab} className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {filteredItems.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Bug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No items found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery || filterStatus !== "all" || filterPriority !== "all"
                          ? "Try adjusting your filters"
                          : "Create your first entry to get started"}
                      </p>
                      <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Entry
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead>Reporter</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>{getTypeIcon(item.type)}</TableCell>
                          <TableCell>
                            <div 
                              className="font-medium hover:text-primary cursor-pointer"
                              onClick={() => { setSelectedItem(item); setShowViewDialog(true); }}
                            >
                              {item.title}
                            </div>
                            {item.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {item.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {item.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{item.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                          <TableCell>
                            {item.page ? (
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">{item.page}</code>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{item.reporterName}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {item.createdAt.toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedItem(item); setShowViewDialog(true); }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(item.id, "in_progress")}>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Mark In Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(item.id, "resolved")}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Resolved
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(item.id, "closed")}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Close
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => confirmDelete(item)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Entry</DialogTitle>
            <DialogDescription>
              Report a bug, capture an idea, or suggest an improvement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: "bug" | "idea" | "improvement") => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-red-500" />
                      Bug Report
                    </div>
                  </SelectItem>
                  <SelectItem value="idea">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-sky-500" />
                      New Idea
                    </div>
                  </SelectItem>
                  <SelectItem value="improvement">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      Improvement
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of the issue or idea"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide details, steps to reproduce (for bugs), or explain the idea..."
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: "low" | "medium" | "high" | "critical") => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="page">Related Page *</Label>
                <Select 
                  value={formData.page} 
                  onValueChange={(value) => setFormData({ ...formData, page: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select page" />
                  </SelectTrigger>
                  <SelectContent>
                    {pageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., ui, performance, feature"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }} disabled={isSaving}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddItem}
              disabled={!formData.title.trim() || !formData.description.trim() || formData.page === "none" || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Entry"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {getTypeIcon(selectedItem.type)}
                  <DialogTitle>{selectedItem.title}</DialogTitle>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(selectedItem.status)}
                  {getPriorityBadge(selectedItem.priority)}
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{selectedItem.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Reporter</Label>
                    <p className="mt-1">{selectedItem.reporterName}</p>
                  </div>
                  {selectedItem.page && (
                    <div>
                      <Label className="text-muted-foreground">Related Page</Label>
                      <p className="mt-1"><code className="bg-muted px-1 py-0.5 rounded">{selectedItem.page}</code></p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="mt-1">{selectedItem.createdAt.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Updated</Label>
                    <p className="mt-1">{selectedItem.updatedAt.toLocaleDateString()}</p>
                  </div>
                </div>
                
                {selectedItem.tags.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Tags</Label>
                    <div className="flex gap-1 mt-1">
                      {selectedItem.tags.map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Comments Section */}
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comments ({selectedItem.comments.length})
                  </Label>
                  
                  <div className="space-y-3 mt-3">
                    {selectedItem.comments.map((comment) => (
                      <div key={comment.id} className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{comment.author}</span>
                          <span className="text-muted-foreground">{comment.createdAt.toLocaleDateString()}</span>
                        </div>
                        <p className="mt-1 text-sm">{comment.content}</p>
                      </div>
                    ))}
                    
                    {selectedItem.comments.length === 0 && (
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    )}
                  </div>
                  
                  {/* Add Comment */}
                  <div className="flex gap-2 mt-3">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      onKeyDown={(e) => e.key === "Enter" && addComment()}
                    />
                    <Button onClick={addComment} disabled={!newComment.trim()}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => updateStatus(selectedItem.id, "in_progress")}>
                    <Clock className="h-4 w-4 mr-2" />
                    In Progress
                  </Button>
                  <Button variant="outline" onClick={() => updateStatus(selectedItem.id, "resolved")}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                  <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{itemToDelete?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteItem} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
