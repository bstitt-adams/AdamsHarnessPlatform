"use client";

import { useFeatureVisibility } from "@/contexts/feature-visibility-context";
import { useUserProfile } from "@/contexts/user-profile-context";
import { isAdminRole } from "@/lib/permissions";
import { UserRole } from "@/lib/feature-visibility";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Shield, User, Users, Briefcase, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: { value: UserRole | "actual"; label: string; icon: React.ElementType; description: string }[] = [
  { value: "actual", label: "My View", icon: Shield, description: "Your actual role view" },
  { value: "superadmin", label: "SuperAdmin", icon: Shield, description: "Full access to everything" },
  { value: "admin", label: "Admin", icon: UserCheck, description: "Administrative access" },
  { value: "team", label: "Team Member", icon: Users, description: "Internal team access" },
  { value: "affiliate", label: "Affiliate", icon: User, description: "External partner access" },
  { value: "consultant", label: "Consultant", icon: Briefcase, description: "Consultant access" },
];

interface RoleSwitcherProps {
  className?: string;
  showLabel?: boolean;
}

export function RoleSwitcher({ className, showLabel = true }: RoleSwitcherProps) {
  const { actualTeamMember, linkedTeamMember } = useUserProfile();
  const actualRole = (actualTeamMember?.role as UserRole) || (linkedTeamMember?.role as UserRole) || "affiliate";
  const canSwitch = isAdminRole(actualRole);

  const { previewRole, setPreviewRole, isPreviewMode } = useFeatureVisibility();

  // Only show for Admin / SuperAdmin users
  if (!canSwitch) {
    return null;
  }

  const currentValue = previewRole || "actual";
  const currentOption = ROLE_OPTIONS.find((opt) => opt.value === currentValue);

  const handleValueChange = (value: string) => {
    if (value === "actual") {
      setPreviewRole(null);
    } else {
      setPreviewRole(value as UserRole);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {isPreviewMode ? (
            <Eye className="h-4 w-4 text-blue-500" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
          <span>View as:</span>
        </div>
      )}
      
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger className={cn(
          "w-[180px]",
          isPreviewMode && "border-blue-500 bg-blue-500/10"
        )}>
          <SelectValue>
            <div className="flex items-center gap-2">
              {currentOption && <currentOption.icon className="h-4 w-4" />}
              <span>{currentOption?.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className="h-4 w-4" />
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPreviewMode && (
        <Badge variant="outline" className="border-blue-500 text-blue-500 bg-blue-500/10">
          Preview Mode
        </Badge>
      )}
    </div>
  );
}

// Compact version for the sidebar footer
export function RoleSwitcherCompact() {
  const { actualTeamMember, linkedTeamMember } = useUserProfile();
  const actualRole = (actualTeamMember?.role as UserRole) || (linkedTeamMember?.role as UserRole) || "affiliate";
  const isSuperAdminFlag = actualTeamMember
    ? (actualTeamMember as unknown as { isSuperAdmin?: boolean }).isSuperAdmin === true
    : false;
  const canSwitch = isAdminRole(actualRole) || isSuperAdminFlag;

  const { previewRole, setPreviewRole, isPreviewMode } = useFeatureVisibility();

  if (!canSwitch) {
    return null;
  }

  const currentValue = previewRole || "actual";

  const handleValueChange = (value: string) => {
    if (value === "actual") {
      setPreviewRole(null);
    } else {
      setPreviewRole(value as UserRole);
    }
  };

  return (
    <div className="px-2 py-2 border-t border-sidebar-border">
      <div className="flex items-center gap-2 mb-2">
        <Eye className={cn("h-3.5 w-3.5", isPreviewMode ? "text-blue-500" : "text-muted-foreground")} />
        <span className="text-xs text-muted-foreground">Role Preview</span>
        {isPreviewMode && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-blue-500 text-blue-500">
            Active
          </Badge>
        )}
      </div>
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger className={cn(
          "h-8 text-xs",
          isPreviewMode && "border-blue-500 bg-blue-500/10"
        )}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              <div className="flex items-center gap-2">
                <option.icon className="h-3.5 w-3.5" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
