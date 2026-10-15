"use client";

import { useEffect, useMemo, useState } from "react";
import { useUserProfile } from "@/contexts/user-profile-context";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type UserMicrosoftTokenDoc, type UserChatChannelDoc } from "@/lib/schema";
import { collection, query, orderBy, onSnapshot, getDoc, doc, deleteDoc, Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Send, Unlink, Link2, MessageCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  role?: string;
  status?: string;
  createdAt?: Timestamp;
}

interface EnrichedUser extends UserRow {
  token?: UserMicrosoftTokenDoc | null;
  channel?: UserChatChannelDoc | null;
}

export default function MailAdminPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<Record<string, boolean>>({});

  const isAdmin = ["admin", "superadmin"].includes(String(profile?.role));

  // Load users and enrich with token/channel snapshots
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const firestore = db;
    const usersQuery = query(collection(firestore, COLLECTIONS.USERS), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      usersQuery,
      async (snapshot) => {
        const baseUsers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as UserRow);
        const enriched = await Promise.all(
          baseUsers.map(async (user) => {
            const [tokenSnap, channelSnap] = await Promise.all([
              getDoc(doc(firestore, COLLECTIONS.USER_MICROSOFT_TOKENS, user.id)),
              getDoc(doc(firestore, COLLECTIONS.USER_CHAT_CHANNELS, user.id)),
            ]);
            return {
              ...user,
              token: tokenSnap.exists() ? (tokenSnap.data() as UserMicrosoftTokenDoc) : null,
              channel: channelSnap.exists() ? (channelSnap.data() as UserChatChannelDoc) : null,
            };
          })
        );
        setUsers(enriched);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading users:", error);
        toast.error("Failed to load users");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const microsoftConfigured = useMemo(() => {
    return Boolean(process.env.NEXT_PUBLIC_APP_URL || typeof window !== "undefined");
  }, []);

  function getMicrosoftAuthUrl(userId: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
    return `${appUrl}/api/auth/microsoft?userId=${userId}`;
  }

  async function handleVerify(userId: string) {
    setWorking((w) => ({ ...w, [userId]: true }));
    try {
      const response = await fetch("/api/mail/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`Microsoft OAuth verified for ${result.data?.displayName || userId}`);
      } else {
        toast.error(result.error || "Verification failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Verification request failed");
    } finally {
      setWorking((w) => ({ ...w, [userId]: false }));
    }
  }

  async function handleTestSend(userId: string) {
    setWorking((w) => ({ ...w, [userId]: true }));
    try {
      const response = await fetch("/api/mail/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message || "Test email sent");
      } else {
        toast.error(result.error || "Test send failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Test send request failed");
    } finally {
      setWorking((w) => ({ ...w, [userId]: false }));
    }
  }

  async function handleDisconnect(userId: string) {
    if (!db) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.USER_MICROSOFT_TOKENS, userId));
      toast.success("Microsoft connection removed");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove connection");
    }
  }

  if (profileLoading || loading) {
    return (
      <div className="container py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">You do not have permission to access the Mail admin.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mail Admin</h1>
        <p className="text-muted-foreground">
          Manage Microsoft email connections, Telegram/Teams chat channels, and verify OAuth is working.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">User</th>
                    <th className="text-left py-3 px-2 font-medium">Microsoft OAuth</th>
                    <th className="text-left py-3 px-2 font-medium">Telegram</th>
                    <th className="text-left py-3 px-2 font-medium">Teams</th>
                    <th className="text-right py-3 px-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const displayName = user.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || user.id;
                    const status = user.token?.status || "disconnected";
                    const telegramLinked = Boolean(user.channel?.telegramChatId);
                    const teamsLinked = Boolean(user.channel?.teamsConversationId);
                    const isWorking = working[user.id];

                    return (
                      <tr key={user.id} className="border-b last:border-b-0">
                        <td className="py-3 px-2">
                          <div className="font-medium">{displayName}</div>
                          <div className="text-muted-foreground text-xs">{user.email}</div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={status === "connected" ? "default" : status === "error" ? "destructive" : "secondary"}
                            className={cn(
                              "capitalize",
                              status === "connected" && "bg-green-600"
                            )}
                          >
                            {status}
                          </Badge>
                          {user.token?.lastVerifiedAt && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Verified {user.token.lastVerifiedAt.toDate().toLocaleString()}
                            </div>
                          )}
                          {user.token?.lastError && (
                            <div className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={user.token.lastError}>
                              {user.token.lastError}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {telegramLinked ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs">
                              <MessageCircle className="h-3 w-3" /> Linked
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Not linked</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {teamsLinked ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs">
                              <MessageSquare className="h-3 w-3" /> Linked
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Not linked</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const url = getMicrosoftAuthUrl(user.id);
                                navigator.clipboard.writeText(url);
                                toast.success("Microsoft connect URL copied");
                              }}
                              disabled={isWorking}
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              Copy Connect URL
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerify(user.id)}
                              disabled={isWorking || status !== "connected"}
                            >
                              {isWorking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                              Verify
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestSend(user.id)}
                              disabled={isWorking || status !== "connected"}
                            >
                              {isWorking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                              Test Send
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDisconnect(user.id)}
                              disabled={isWorking}
                            >
                              <Unlink className="h-3 w-3 mr-1" />
                              Disconnect
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Telegram Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Webhook URL:</p>
            <code className="block bg-muted p-2 rounded text-xs break-all">
              {typeof window !== "undefined" ? `${window.location.origin}/api/telegram/webhook` : ""}
            </code>
            <p className="text-muted-foreground">
              Users link their Telegram by sending <code>/start &lt;user-id&gt;</code>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Microsoft Teams Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Bot messaging endpoint:</p>
            <code className="block bg-muted p-2 rounded text-xs break-all">
              {typeof window !== "undefined" ? `${window.location.origin}/api/teams/webhook` : ""}
            </code>
            <p className="text-muted-foreground">
              Register an Azure Bot and point the messaging endpoint here. Users link Teams by sending <code>/start &lt;user-id&gt;</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
