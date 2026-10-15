"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Eye, Loader2, UserRound } from "lucide-react";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
import { isAdminRole } from "@/lib/permissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TeamMemberSwitcher() {
  const { actualTeamMember, linkedTeamMember } = useUserProfile();
  const [members, setMembers] = useState<TeamMemberDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected] = useState(() =>
    typeof window === "undefined" ? "actual" : sessionStorage.getItem("adams_view_as_team_member") || "actual",
  );

  useEffect(() => {
    if (!db || !actualTeamMember || !isAdminRole(actualTeamMember.role)) return;
    setLoading(true);
    getDocs(collection(db, COLLECTIONS.TEAM_MEMBERS))
      .then((snapshot) => {
        setMembers(
          snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }) as TeamMemberDoc)
            .filter((member) => member.status === "active")
            .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
        );
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [actualTeamMember]);

  if (!actualTeamMember || !isAdminRole(actualTeamMember.role)) return null;

  const handleChange = (value: string) => {
    if (value === "actual") sessionStorage.removeItem("adams_view_as_team_member");
    else sessionStorage.setItem("adams_view_as_team_member", value);
    window.location.reload();
  };

  return (
    <div className="border-t border-sidebar-border px-2 py-2">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Eye className="size-3.5" />
        <span>View platform as</span>
      </div>
      <Select value={selected} onValueChange={handleChange} disabled={loading}>
        <SelectTrigger className="h-8 text-xs">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="actual"><div className="flex items-center gap-2"><UserRound className="size-3.5" />My admin view</div></SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.firstName} {member.lastName} · {member.role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {linkedTeamMember?.id !== actualTeamMember.id && (
        <p className="mt-1 text-[10px] text-amber-600">View-only preview; Firebase identity is unchanged.</p>
      )}
    </div>
  );
}
