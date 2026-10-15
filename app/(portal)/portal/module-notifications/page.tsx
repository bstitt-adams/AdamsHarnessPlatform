"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";

type ModuleNotification = {
  id: string;
  moduleSlug: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: string;
};

export default function ModuleNotificationsPage() {
  const { isLoading, isAuthenticated } = useUserProfile();
  const [notifications, setNotifications] = useState<ModuleNotification[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let cancelled = false;
    adamsFetchJson<{
      notifications: ModuleNotification[];
    }>("/api/adams-harness/module-notifications")
      .then((data) => {
        if (!cancelled) setNotifications(data.notifications);
      })
      .catch(() => {
        if (!cancelled) setNotifications([]);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated]);

  const [actionError, setActionError] = useState<string | null>(null);

  const markRead = async (id: string, read: boolean) => {
    setActionError(null);
    try {
      await adamsFetchJson(
        `/api/adams-harness/module-notifications/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify({ read }) },
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read } : n)),
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Update failed");
    }
  };

  if (isLoading || (isAuthenticated && fetching)) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please sign in to view alerts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Module Alerts</h1>
      {actionError && (
        <p className="text-sm text-destructive">{actionError}</p>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-center justify-between rounded border p-3 text-sm ${
                  n.read ? "opacity-60" : ""
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{n.title}</span>
                    <Badge variant="outline">{n.type}</Badge>
                    {!n.read && <Badge>New</Badge>}
                  </div>
                  <p className="text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}{" "}
                    |{" "}
                    <Link
                      className="text-primary underline"
                      href={`/portal/modules/${n.moduleSlug}`}
                    >
                      {n.moduleSlug}
                    </Link>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void markRead(n.id, !n.read)}
                >
                  {n.read ? "Mark Unread" : "Mark Read"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
