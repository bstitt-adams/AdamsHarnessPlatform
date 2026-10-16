"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberDoc, type UserChatChannelDoc } from "@/lib/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Copy,
  Loader2,
  Bot,
} from "lucide-react";

const ROLE_OPTIONS: NonNullable<UserChatChannelDoc["role"]>[] = [
  "superadmin",
  "admin",
  "team",
  "affiliate",
  "consultant",
  "client",
];

export function TeamsUsersManager() {
  const [teamsUsers, setTeamsUsers] = useState<UserChatChannelDoc[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserChatChannelDoc | null>(null);

  const [formData, setFormData] = useState({
    teamMemberId: "custom",
    displayName: "",
    teamsUserEmail: "",
    role: "team" as NonNullable<UserChatChannelDoc["role"]>,
    teamsUserId: "",
    teamsConversationId: "",
    teamsHermesEnabled: true,
    teamsIsActive: true,
  });

  const loadData = async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [channelsSnap, membersSnap] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.USER_CHAT_CHANNELS)),
        getDocs(collection(db, COLLECTIONS.TEAM_MEMBERS)),
      ]);

      const loadedUsers: UserChatChannelDoc[] = [];
      channelsSnap.forEach((docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() } as UserChatChannelDoc;
        if (
          data.teamsUserEmail ||
          data.teamsUserId ||
          data.teamsConversationId ||
          data.preferredChannel === "teams" ||
          data.preferredChannel === "both"
        ) {
          loadedUsers.push(data);
        }
      });
      loadedUsers.sort((a, b) =>
        (a.displayName || a.teamsUserEmail || a.userId || "").localeCompare(
          b.displayName || b.teamsUserEmail || b.userId || ""
        )
      );
      setTeamsUsers(loadedUsers);

      const loadedMembers: TeamMemberDoc[] = [];
      membersSnap.forEach((docSnap) => {
        loadedMembers.push({ id: docSnap.id, ...docSnap.data() } as TeamMemberDoc);
      });
      loadedMembers.sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      );
      setTeamMembers(loadedMembers);
    } catch (error) {
      console.error("Failed to load Microsoft Teams users:", error);
      toast.error("Failed to load Microsoft Teams users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      teamMemberId: "custom",
      displayName: "",
      teamsUserEmail: "",
      role: "team",
      teamsUserId: "",
      teamsConversationId: "",
      teamsHermesEnabled: true,
      teamsIsActive: true,
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (user: UserChatChannelDoc) => {
    setEditingUser(user);
    setFormData({
      teamMemberId: user.teamMemberId || "custom",
      displayName: user.displayName || "",
      teamsUserEmail: user.teamsUserEmail || user.email || "",
      role: user.role || "team",
      teamsUserId: user.teamsUserId || "",
      teamsConversationId: user.teamsConversationId || "",
      teamsHermesEnabled:
        user.teamsHermesEnabled !== undefined ? user.teamsHermesEnabled !== false : user.hermesEnabled !== false,
      teamsIsActive:
        user.teamsIsActive !== undefined ? user.teamsIsActive !== false : user.isActive !== false,
    });
    setDialogOpen(true);
  };

  const handleSelectTeamMember = (memberId: string) => {
    if (memberId === "custom") {
      setFormData((prev) => ({ ...prev, teamMemberId: "custom" }));
      return;
    }
    const member = teamMembers.find((m) => m.id === memberId);
    if (member) {
      setFormData((prev) => ({
        ...prev,
        teamMemberId: member.id,
        displayName: `${member.firstName} ${member.lastName}`.trim(),
        teamsUserEmail: member.emailPrimary || "",
        role: member.role || "team",
      }));
    }
  };

  const handleSaveUser = async () => {
    if (!db) {
      toast.error("Firebase not initialized");
      return;
    }
    if (!formData.displayName.trim() && !formData.teamsUserEmail.trim()) {
      toast.error("Please provide a display name or Microsoft Teams email");
      return;
    }

    setSaving(true);
    try {
      const selectedMember =
        formData.teamMemberId !== "custom"
          ? teamMembers.find((m) => m.id === formData.teamMemberId)
          : undefined;

      const docId =
        editingUser?.id ||
        selectedMember?.firebaseUid ||
        selectedMember?.id ||
        `teams-${Date.now()}`;

      const payload: Partial<UserChatChannelDoc> = {
        id: docId,
        userId: selectedMember?.firebaseUid || editingUser?.userId || docId,
        teamMemberId: formData.teamMemberId !== "custom" ? formData.teamMemberId : "",
        displayName: formData.displayName.trim(),
        email: formData.teamsUserEmail.trim(),
        teamsUserEmail: formData.teamsUserEmail.trim(),
        role: formData.role,
        teamsUserId: formData.teamsUserId.trim(),
        teamsConversationId: formData.teamsConversationId.trim(),
        teamsHermesEnabled: formData.teamsHermesEnabled,
        teamsIsActive: formData.teamsIsActive,
        preferredChannel: "both",
        updatedAt: Timestamp.now(),
      };

      await setDoc(
        doc(db, COLLECTIONS.USER_CHAT_CHANNELS, docId),
        {
          ...payload,
          ...(editingUser ? {} : { createdAt: Timestamp.now() }),
        },
        { merge: true }
      );

      toast.success(editingUser ? "Microsoft Teams user updated" : "Microsoft Teams user added");
      setDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("Error saving Microsoft Teams user:", error);
      toast.error("Failed to save Microsoft Teams user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHermes = async (user: UserChatChannelDoc, enabled: boolean) => {
    if (!db) return;
    try {
      await setDoc(
        doc(db, COLLECTIONS.USER_CHAT_CHANNELS, user.id),
        { teamsHermesEnabled: enabled, updatedAt: Timestamp.now() },
        { merge: true }
      );
      setTeamsUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, teamsHermesEnabled: enabled } : u))
      );
      toast.success(`Hermes access ${enabled ? "enabled" : "disabled"} for ${user.displayName || user.id}`);
    } catch {
      toast.error("Failed to update Hermes access");
    }
  };

  const handleToggleActive = async (user: UserChatChannelDoc, active: boolean) => {
    if (!db) return;
    try {
      await setDoc(
        doc(db, COLLECTIONS.USER_CHAT_CHANNELS, user.id),
        { teamsIsActive: active, updatedAt: Timestamp.now() },
        { merge: true }
      );
      setTeamsUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, teamsIsActive: active } : u))
      );
      toast.success(`Microsoft Teams user ${active ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Failed to update user status");
    }
  };

  const handleDeleteUser = async (user: UserChatChannelDoc) => {
    if (!db) return;
    if (!confirm(`Remove Microsoft Teams user "${user.displayName || user.teamsUserEmail || user.id}"?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, COLLECTIONS.USER_CHAT_CHANNELS, user.id));
      toast.success("Microsoft Teams user removed");
      await loadData();
    } catch {
      toast.error("Failed to remove Microsoft Teams user");
    }
  };

  const copyStartCommand = (user: UserChatChannelDoc) => {
    const cmd = `/start ${user.id}`;
    navigator.clipboard.writeText(cmd);
    toast.success(`Copied "${cmd}" to clipboard`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Microsoft Teams Users &amp; Hermes Access
            </CardTitle>
            <CardDescription>
              Create and manage multiple Microsoft Teams users authorized to interact with Hermes and Adams Platform commands.
            </CardDescription>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Teams User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : teamsUsers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Bot className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="font-medium">No Microsoft Teams users configured yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add Adams Electric team members or Microsoft 365 accounts so they can message Hermes in Teams.
            </p>
            <Button variant="outline" onClick={handleOpenAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Teams User
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Teams UPN / AAD ID</TableHead>
                  <TableHead>Conversation ID</TableHead>
                  <TableHead>Hermes Access</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamsUsers.map((user) => {
                  const hermesOn =
                    user.teamsHermesEnabled !== undefined
                      ? user.teamsHermesEnabled !== false
                      : user.hermesEnabled !== false;
                  const activeOn =
                    user.teamsIsActive !== undefined
                      ? user.teamsIsActive !== false
                      : user.isActive !== false;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.displayName || user.userId}</div>
                        {(user.teamsUserEmail || user.email) && (
                          <div className="text-xs text-muted-foreground">
                            {user.teamsUserEmail || user.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {user.role || "team"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{user.teamsUserEmail || "—"}</div>
                        {user.teamsUserId && (
                          <div className="text-xs text-muted-foreground">AAD/ID: {user.teamsUserId}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.teamsConversationId ? (
                          <Badge variant="secondary" className="max-w-[160px] truncate">
                            {user.teamsConversationId}
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => copyStartCommand(user)}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy /start
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={hermesOn}
                          onCheckedChange={(checked) => handleToggleHermes(user, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={activeOn}
                          onCheckedChange={(checked) => handleToggleActive(user, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Copy /start link command"
                            onClick={() => copyStartCommand(user)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Edit Microsoft Teams User" : "Add Microsoft Teams User for Hermes"}
              </DialogTitle>
              <DialogDescription>
                Link an Adams Electric team member or Microsoft 365 account to interact with Hermes in Teams.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Link to Team Member (optional)</Label>
                <Select value={formData.teamMemberId} onValueChange={handleSelectTeamMember}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member or custom user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Microsoft Teams User</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} ({member.emailPrimary})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teamsDisplayName">Display Name *</Label>
                  <Input
                    id="teamsDisplayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Brian Stitt"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamsRole">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v) =>
                      setFormData({ ...formData, role: v as NonNullable<UserChatChannelDoc["role"]> })
                    }
                  >
                    <SelectTrigger id="teamsRole">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role} className="capitalize">
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamsUserEmail">Microsoft 365 / Teams Email (UPN) *</Label>
                <Input
                  id="teamsUserEmail"
                  type="email"
                  value={formData.teamsUserEmail}
                  onChange={(e) => setFormData({ ...formData, teamsUserEmail: e.target.value })}
                  placeholder="brianstitt@adams-electric.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teamsUserId">Azure AD Object ID / Teams User ID</Label>
                  <Input
                    id="teamsUserId"
                    value={formData.teamsUserId}
                    onChange={(e) => setFormData({ ...formData, teamsUserId: e.target.value })}
                    placeholder="Optional — auto-filled on /start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamsConversationId">Conversation ID (optional)</Label>
                  <Input
                    id="teamsConversationId"
                    value={formData.teamsConversationId}
                    onChange={(e) => setFormData({ ...formData, teamsConversationId: e.target.value })}
                    placeholder="Auto-populated on first message"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="teamsHermesEnabled">Enable Hermes AI Assistant</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow this Microsoft Teams user to chat directly with Hermes and run assistant tasks.
                  </p>
                </div>
                <Switch
                  id="teamsHermesEnabled"
                  checked={formData.teamsHermesEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, teamsHermesEnabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="teamsActive">Active Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow or block incoming Microsoft Teams messages from this user.
                  </p>
                </div>
                <Switch
                  id="teamsActive"
                  checked={formData.teamsIsActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, teamsIsActive: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUser} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingUser ? (
                  "Update User"
                ) : (
                  "Add Teams User"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
