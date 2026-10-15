"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Loader2, Pencil, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile } from "@/contexts/user-profile-context";
import { isAdminRole } from "@/lib/permissions";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  ownerIds: string[];
  memberIds: string[];
  isActive: boolean;
}

interface TeamMemberOption {
  id: string;
  firebaseUid?: string;
  authUid?: string;
  firstName: string;
  lastName: string;
  emailPrimary: string;
  status: string;
}

interface DepartmentFormState {
  name: string;
  code: string;
  description: string;
  ownerIds: string[];
  memberIds: string[];
  isActive: boolean;
}

const emptyForm: DepartmentFormState = {
  name: "",
  code: "",
  description: "",
  ownerIds: [],
  memberIds: [],
  isActive: true,
};

function toggleId(list: string[], id: string, checked: boolean): string[] {
  return checked ? [...new Set([...list, id])] : list.filter((v) => v !== id);
}

function MemberPicker({
  label,
  members,
  selected,
  onChange,
}: {
  label: string;
  members: TeamMemberOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <ScrollArea className="h-40 rounded-md border p-3">
        <div className="space-y-2">
          {members.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(m.id)}
                onCheckedChange={(checked) =>
                  onChange(toggleId(selected, m.id, checked === true))
                }
              />
              <span>
                {`${m.firstName} ${m.lastName}`.trim() || m.emailPrimary}
                <span className="text-muted-foreground"> ({m.emailPrimary})</span>
              </span>
            </label>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function DepartmentsAdminPage() {
  const { linkedTeamMember, isLoading: profileLoading } = useUserProfile();
  const isAdmin = isAdminRole(linkedTeamMember?.role || "");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState<DepartmentFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const activeMembers = useMemo(
    () => teamMembers.filter((m) => m.status === "active"),
    [teamMembers],
  );

  const memberLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of teamMembers) {
      const label = `${m.firstName} ${m.lastName}`.trim() || m.emailPrimary;
      map.set(m.id, label);
      if (m.firebaseUid) map.set(m.firebaseUid, label);
      if (m.authUid) map.set(m.authUid, label);
    }
    return (id: string) => map.get(id) || id;
  }, [teamMembers]);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const [deptData, memberData] = await Promise.all([
        adamsFetchJson<{ departments: Department[] }>(
          "/api/adams-harness/departments",
        ),
        adamsFetchJson<{ teamMembers: TeamMemberOption[] }>(
          "/api/adams-harness/team-members",
        ),
      ]);
      setDepartments(deptData.departments);
      setTeamMembers(memberData.teamMembers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadDepartments();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadDepartments]);

  const openCreate = (seedMcs = false) => {
    setEditing(null);
    setForm(
      seedMcs
        ? { ...emptyForm, name: "Mission Critical Safety", code: "MCS" }
        : emptyForm,
    );
    setDialogOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setForm({
      name: dept.name,
      code: dept.code,
      description: dept.description,
      ownerIds: dept.ownerIds,
      memberIds: dept.memberIds,
      isActive: dept.isActive,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim(),
        ownerIds: form.ownerIds,
        memberIds: form.memberIds,
        isActive: form.isActive,
      };
      if (editing) {
        await adamsFetchJson(`/api/adams-harness/departments/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Department updated");
      } else {
        await adamsFetchJson("/api/adams-harness/departments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Department created");
      }
      setDialogOpen(false);
      await loadDepartments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Admin access is required.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Departments
          </h1>
          <p className="text-muted-foreground">
            Manage departments for process interviews and solution specifications.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate(true)}>
            <ShieldCheck className="mr-2 h-4 w-4" /> Seed Mission Critical Safety
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" /> New Department
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : departments.length === 0 ? (
            <p className="text-muted-foreground text-center p-8">
              No departments yet. Create one to start interviews.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Owners</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{dept.code}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {dept.ownerIds.map(memberLabel).join(", ") || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {dept.memberIds.map(memberLabel).join(", ") || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={dept.isActive ? "default" : "secondary"}>
                        {dept.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(dept)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Department" : "New Department"}</DialogTitle>
            <DialogDescription>
              Select team members to grant department access; owners can approve
              specifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name</Label>
              <Input
                id="dept-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-code">Code</Label>
              <Input
                id="dept-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-description">Description</Label>
              <Textarea
                id="dept-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <MemberPicker
              label="Members"
              members={activeMembers}
              selected={form.memberIds}
              onChange={(memberIds) => setForm({ ...form, memberIds })}
            />
            <MemberPicker
              label="Owners"
              members={activeMembers}
              selected={form.ownerIds}
              onChange={(ownerIds) => setForm({ ...form, ownerIds })}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="dept-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label htmlFor="dept-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
