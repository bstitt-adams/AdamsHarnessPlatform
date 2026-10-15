"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserProfile } from "@/contexts/user-profile-context";
import { auth, db } from "@/lib/firebase";
import { terminate } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Search,
  Bell,
  Plus,
  Settings,
  LogOut,
  User,
  Sparkles,
  Target,
  FolderKanban,
  Calendar,
  FileText,
} from "lucide-react";

const quickActions = [
  { title: "New Opportunity", href: "/portal/opportunities/new", icon: Target },
  { title: "New Project", href: "/portal/projects/new", icon: FolderKanban },
  { title: "Upload Document", href: "/portal/documents/new", icon: FileText },
];

const notifications = [
  {
    id: 1,
    title: "New lead from ABC Manufacturing",
    time: "5 minutes ago",
    unread: true,
  },
  {
    id: 2,
    title: "Meeting with XYZ Corp in 30 minutes",
    time: "25 minutes ago",
    unread: true,
  },
  {
    id: 3,
    title: "Proposal approved by client",
    time: "1 hour ago",
    unread: false,
  },
  {
    id: 4,
    title: "Rock deadline approaching: Q1 Goals",
    time: "2 hours ago",
    unread: false,
  },
];

export function PortalHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const { getDisplayName, getInitials, profile } = useUserProfile();
  const unreadCount = notifications.filter((n) => n.unread).length;

  // Handle sign out
  const handleSignOut = async () => {
    try {
      // Terminate Firestore to prevent internal assertion errors when switching users
      if (db) {
        try {
          await terminate(db);
          console.log("Firestore terminated before sign out");
        } catch (terminateError) {
          console.warn("Could not terminate Firestore:", terminateError);
        }
      }
      
      if (auth) {
        await auth.signOut();
      }
      sessionStorage.removeItem("adams_authenticated");
      sessionStorage.removeItem("adams_user_email");
      sessionStorage.removeItem("adams_firebase_uid");
      sessionStorage.removeItem("adams_user_name");
      sessionStorage.removeItem("adams_team_member_id");
      sessionStorage.removeItem("adams_user_role");
      localStorage.removeItem("adams_remembered_email");
      localStorage.removeItem("adams_remember_me");
      
      // Force a full page reload to reinitialize Firebase cleanly
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      window.location.href = "/";
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <SidebarTrigger className="-ml-2" />

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search opportunities, projects, affiliates..."
            className="pl-9 bg-muted/50"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {/* Ask AI Button */}
        <Button variant="outline" size="sm" className="hidden md:flex" asChild>
          <Link href="/portal/ask">
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            Ask AI
          </Link>
        </Button>

        {/* Quick Add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {quickActions.map((action) => (
              <DropdownMenuItem key={action.href} asChild>
                <Link href={action.href}>
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.title}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Link href="/portal/notifications" className="text-xs text-primary font-normal">
                View all
              </Link>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className="flex flex-col items-start py-3">
                <div className="flex items-start gap-2 w-full">
                  {notification.unread && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                  <div className={notification.unread ? "" : "ml-4"}>
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary">{getInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{getDisplayName()}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {profile.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/portal/settings/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/portal/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
