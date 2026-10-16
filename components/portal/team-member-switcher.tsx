"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Eye, Loader2, UserRound } from "lucide-react";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";
import { useUserProfile } from "@/contexts/user-profile-context";
import { isAdminRole } from "@/lib/permissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TeamMemberSwitcher({ compact = true }: { compact?: boolean }) {
  const { actualTeamMember, linkedTeamMember, setViewAsTeamMemberId, isMasqueradingUser } = useUserProfile();
  const [members, setMembers] = useState<TeamMemberDoc[]>([]);
  const [loading, setLoading] = useState(false);

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

  const selectedValue =
    isMasqueradingUser && linkedTeamMember ? linkedTeamMember.id : "actual";

  const handleChange = async (value: string) => {
    await setViewAsTeamMemberId(value === "actual" ? null : value);
  };

  if (!compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Eye className={cn("h-4 w-4", isMasqueradingUser && "text-amber-500")} />
          <span>Masquerade User:</span>
        </div>
        <Select value={selectedValue} onValueChange={handleChange} disabled={loading}>
          <SelectTrigger
            className={cn(
              "w-[220px]",
              isMasqueradingUser && "border-amber-500 bg-amber-500/10",
            )}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <SelectValue />}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="actual">
              <div className="flex items-center gap-2">
                <UserRound className="size-4" />
                <span>My Account ({actualTeamMember.firstName} {actualTeamMember.lastName})</span>
              </div>
            </SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.firstName} {member.lastName} ({member.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isMasqueradingUser && linkedTeamMember && (
          <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/10">
            Viewing as {linkedTeamMember.firstName} {linkedTeamMember.lastName}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border px-2 py-2">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Eye className={cn("size-3.5", isMasqueradingUser && "text-amber-500")} />
        <span>Masquerade as User</span>
        {isMasqueradingUser && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-500 text-amber-500">
            Active
          </Badge>
        )}
      </div>
      <Select value={selectedValue} onValueChange={handleChange} disabled={loading}>
        <SelectTrigger
          className={cn(
            "h-8 text-xs",
            isMasqueradingUser && "border-amber-500 bg-amber-500/10",
          )}
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <SelectValue />}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="actual" className="text-xs">
            <div className="flex items-center gap-2">
              <UserRound className="size-3.5" />
              <span>My Account ({actualTeamMember.firstName})</span>
            </div>
          </SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id} className="text-xs">
              {member.firstName} {member.lastName} · {member.role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isMasqueradingUser && (
        <p className="mt-1 text-[10px] text-amber-600">
          Masquerading as {linkedTeamMember?.firstName} {linkedTeamMember?.lastName}; Firebase identity is unchanged.
        </p>
      )}
    </div>
  );
}
