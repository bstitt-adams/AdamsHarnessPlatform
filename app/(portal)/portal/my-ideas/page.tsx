"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COLLECTIONS, type UserIdeaDoc } from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Lightbulb,
  Plus,
  Search,
  Loader2,
  Rocket,
} from "lucide-react";

interface InterviewItem {
  id: string;
  title: string;
  status: string;
  departmentId: string;
  createdByUid?: string;
  createdByTeamMemberId?: string;
  createdByName?: string;
  updatedAt?: string;
}

export default function MyIdeasPage() {
  const { linkedTeamMember, profile, isMasqueradingUser } = useUserProfile();
  const [ideas, setIdeas] = useState<UserIdeaDoc[]>([]);
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    category: "Process Automation",
    description: "",
    impactSummary: "",
  });

  const viewedName = linkedTeamMember
    ? `${linkedTeamMember.firstName} ${linkedTeamMember.lastName}`.trim()
    : profile.firstName
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : profile.email || "Current User";

  const currentMemberId = linkedTeamMember?.id || "";
  const currentEmail = (linkedTeamMember?.emailPrimary || profile.email || "").toLowerCase();
  const currentUid = linkedTeamMember?.firebaseUid || auth?.currentUser?.uid || "";

  const loadIdeas = useCallback(async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [ideasSnap, interviewRes] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.USER_IDEAS)).catch(() => null),
        adamsFetchJson<{ interviews: InterviewItem[] }>("/api/adams-harness/interviews").catch(
          () => ({ interviews: [] })
        ),
      ]);

      const loadedIdeas: UserIdeaDoc[] = [];
      ideasSnap?.forEach((d) => {
        const data = { id: d.id, ...d.data() } as UserIdeaDoc;
        if (currentMemberId && data.authorTeamMemberId === currentMemberId) {
          loadedIdeas.push(data);
        } else if (currentEmail && (data.authorEmail || "").toLowerCase() === currentEmail) {
          loadedIdeas.push(data);
        } else if (currentUid && data.authorUid && data.authorUid === currentUid) {
          loadedIdeas.push(data);
        }
      });
      setIdeas(loadedIdeas);

      const userInterviews = (interviewRes.interviews || []).filter((i) => {
        if (currentUid && i.createdByUid === currentUid) return true;
        if (currentMemberId && i.createdByTeamMemberId === currentMemberId) return true;
        if (viewedName && (i.createdByName || "").toLowerCase() === viewedName.toLowerCase()) {
          return true;
        }
        return false;
      });
      setInterviews(userInterviews);
    } catch (err) {
      console.error("Failed to load ideas:", err);
      toast.error("Failed to load ideas");
    } finally {
      setLoading(false);
    }
  }, [currentMemberId, currentEmail, currentUid, viewedName]);

  useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

  const handleSubmitIdea = async () => {
    if (!db || !formData.title.trim() || !formData.description.trim()) {
      toast.error("Please enter an idea title and description");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, COLLECTIONS.USER_IDEAS), {
        authorTeamMemberId: currentMemberId || currentUid,
        authorName: viewedName,
        authorEmail: currentEmail,
        authorUid: currentUid,
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        impactSummary: formData.impactSummary.trim(),
        status: "submitted",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      toast.success("Idea submitted to My Ideas");
      setFormData({
        title: "",
        category: "Process Automation",
        description: "",
        impactSummary: "",
      });
      setDialogOpen(false);
      await loadIdeas();
    } catch {
      toast.error("Failed to submit idea");
    } finally {
      setSaving(false);
    }
  };

  const filteredIdeas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ideas;
    return ideas.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
    );
  }, [ideas, search]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>My Mission Critical</span>
            <span>/</span>
            <span>My Ideas</span>
            {isMasqueradingUser && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                Viewing as {viewedName}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            My Ideas
          </h1>
          <p className="text-sm text-muted-foreground">
            Process improvement ideas and AI solution interviews created by {viewedName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/portal/solutions/new">
              <Rocket className="mr-2 h-4 w-4" />
              Start AI Solution Interview
            </Link>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Submit Idea
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Submit Process / Innovation Idea</DialogTitle>
                <DialogDescription>
                  Capture a field, safety, or operational improvement idea under {viewedName}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-1.5">
                  <Label>Idea Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g. Automated QR Tool Check-Out at Jobsite Trailers"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Process Automation">Process Automation</SelectItem>
                      <SelectItem value="Jobsite Safety">Jobsite Safety</SelectItem>
                      <SelectItem value="Prefabrication & BIM">Prefabrication &amp; BIM</SelectItem>
                      <SelectItem value="Field Productivity">Field Productivity</SelectItem>
                      <SelectItem value="Material & Logistics">Material &amp; Logistics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe the current pain point and your proposed solution..."
                    rows={4}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expected Impact / Time Saved</Label>
                  <Input
                    value={formData.impactSummary}
                    onChange={(e) =>
                      setFormData({ ...formData, impactSummary: e.target.value })
                    }
                    placeholder="e.g. Saves foremen 30 mins per day"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void handleSubmitIdea()} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit Idea
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Submitted Ideas */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Submitted Ideas ({filteredIdeas.length})</CardTitle>
            <CardDescription>
              Ideas submitted by {viewedName} for Adams Electric process improvements.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search my ideas..."
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredIdeas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No submitted ideas for {viewedName} yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Idea Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIdeas.map((idea) => (
                  <TableRow key={idea.id}>
                    <TableCell>
                      <div className="font-medium">{idea.title}</div>
                      <div className="text-xs text-muted-foreground max-w-md truncate">
                        {idea.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{idea.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {idea.impactSummary || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {idea.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* My Solution Interviews */}
      <Card>
        <CardHeader>
          <CardTitle>My AI Solution Interviews ({interviews.length})</CardTitle>
          <CardDescription>
            Requirements interviews started by {viewedName}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {interviews.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No AI solution interviews created by {viewedName} yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="capitalize">{item.departmentId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/portal/solutions/${item.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
