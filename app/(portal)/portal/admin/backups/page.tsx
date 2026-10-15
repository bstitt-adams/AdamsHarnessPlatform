"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  Download,
  Upload,
  Trash2,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  HardDrive,
  RefreshCw,
  Settings,
  Calendar,
  FileArchive,
  Shield,
  Cloud,
  Link,
  Unlink,
  ExternalLink,
  Plus,
  Pause,
  ChevronRight,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { COLLECTIONS, type BackupMetadataDoc, type BackupScheduleDoc } from "@/lib/schema";
import { backupService, formatBytes } from "@/lib/services/backup-service";
import { describeCronExpression, TIMEZONE_OPTIONS } from "@/lib/services/backup-scheduler";

interface BackupStats {
  totalBackups: number;
  lastBackup: BackupMetadataDoc | null;
  totalSize: number;
  successRate: number;
}

const AVAILABLE_COLLECTIONS = [
  { id: "users", label: "Users" },
  { id: "organizations", label: "Organizations" },
  { id: "opportunities", label: "Opportunities" },
  { id: "projects", label: "Projects" },
  { id: "teamMembers", label: "Team Members" },
  { id: "calendarEvents", label: "Calendar Events" },
  { id: "meetings", label: "Meetings" },
  { id: "rocks", label: "Rocks" },
  { id: "tractionRocks", label: "Traction Rocks" },
  { id: "tractionIssues", label: "Traction Issues" },
  { id: "tractionTodos", label: "Traction Todos" },
  { id: "affiliateBiographies", label: "Affiliate Biographies" },
  { id: "gainsProfiles", label: "GAINS Profiles" },
  { id: "referrals", label: "Referrals" },
  { id: "events", label: "Events" },
  { id: "eventRegistrations", label: "Event Registrations" },
  { id: "documents", label: "Documents" },
  { id: "platformDocuments", label: "Platform Documents" },
  { id: "aiEmployees", label: "AI Employees" },
  { id: "bugTrackerItems", label: "Bug Tracker" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "success":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    case "partial":
      return (
        <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Partial
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          In Progress
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case "full":
      return <Badge variant="default">Full Backup</Badge>;
    case "incremental":
      return <Badge variant="secondary">Incremental</Badge>;
    case "collections":
      return <Badge variant="outline">Collections Only</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

// Google Drive status interface
interface GoogleDriveStatus {
  connected: boolean;
  email?: string;
  folderName?: string;
  lastSyncAt?: string;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupMetadataDoc[]>([]);
  const [schedules, setSchedules] = useState<BackupScheduleDoc[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<BackupMetadataDoc | null>(null);
  const [backupProgress, setBackupProgress] = useState(0);

  // Google Drive state
  const [googleDriveStatus, setGoogleDriveStatus] = useState<GoogleDriveStatus>({ connected: false });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);

  // Schedule state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState("Daily Backup");
  const [scheduleFrequency, setScheduleFrequency] = useState<"hourly" | "daily" | "weekly" | "monthly">("daily");
  const [scheduleTime, setScheduleTime] = useState("02:00");
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(0);
  const [scheduleTimezone, setScheduleTimezone] = useState("America/New_York");
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);

  // Backup creation form state
  const [backupType, setBackupType] = useState<"full" | "collections">("full");
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [compression, setCompression] = useState<"none" | "gzip" | "zip">("none");
  const [encryption, setEncryption] = useState(false);

  // Fetch backups from Firestore
  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    const backupsRef = collection(db, COLLECTIONS.BACKUP_METADATA);
    const q = query(backupsRef, orderBy("createdAt", "desc"), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const backupData: BackupMetadataDoc[] = [];
        snapshot.forEach((doc) => {
          backupData.push(doc.data() as BackupMetadataDoc);
        });
        setBackups(backupData);
        
        // Calculate stats
        const totalSize = backupData.reduce((sum, b) => sum + b.size, 0);
        const successCount = backupData.filter((b) => b.status === "success").length;
        const successRate = backupData.length > 0 ? (successCount / backupData.length) * 100 : 0;
        
        setStats({
          totalBackups: backupData.length,
          lastBackup: backupData[0] || null,
          totalSize,
          successRate,
        });
        
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching backups:", error);
        toast.error("Failed to load backups");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch Google Drive status
  const fetchGoogleDriveStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/backups/google-drive");
      const data = await response.json();
      if (data.success) {
        setGoogleDriveStatus({
          connected: data.connected,
          email: data.email,
          folderName: data.folderName,
          lastSyncAt: data.lastSyncAt,
        });
      }
    } catch (error) {
      console.error("Error fetching Google Drive status:", error);
    }
  }, []);

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/backups/schedules");
      const data = await response.json();
      if (data.success) {
        setSchedules(data.schedules);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  }, []);

  useEffect(() => {
    fetchGoogleDriveStatus();
    fetchSchedules();
  }, [fetchGoogleDriveStatus, fetchSchedules]);

  // Google Drive OAuth flow
  const handleConnectGoogleDrive = async () => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/api/admin/backups/google-drive/callback`;
      const response = await fetch("/api/admin/backups/google-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-auth-url", redirectUri }),
      });

      const data = await response.json();
      if (data.success && data.authUrl) {
        // Open OAuth popup
        const popup = window.open(
          data.authUrl,
          "google-oauth",
          "width=600,height=700,scrollbars=yes"
        );

        // Listen for OAuth callback
        const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === "google-oauth-callback" && event.data?.code) {
            window.removeEventListener("message", handleMessage);
            popup?.close();

            // Exchange code for tokens
            const exchangeResponse = await fetch("/api/admin/backups/google-drive", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "exchange-code",
                code: event.data.code,
                redirectUri,
              }),
            });

            const exchangeData = await exchangeResponse.json();
            if (exchangeData.success) {
              toast.success("Google Drive connected!", {
                description: `Connected as ${exchangeData.email}`,
              });
              setGoogleDriveStatus({
                connected: true,
                email: exchangeData.email,
              });
              setWizardStep(2);
            } else {
              toast.error("Failed to connect", { description: exchangeData.error });
            }
          }
        };

        window.addEventListener("message", handleMessage);
      } else {
        toast.error("Failed to start OAuth", { description: data.error });
      }
    } catch (error) {
      toast.error("Connection error", { description: (error as Error).message });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    try {
      const response = await fetch("/api/admin/backups/google-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Google Drive disconnected");
        setGoogleDriveStatus({ connected: false });
      }
    } catch (error) {
      toast.error("Failed to disconnect");
    }
  };

  // Create schedule
  const handleCreateSchedule = async () => {
    setIsCreatingSchedule(true);
    try {
      const response = await fetch("/api/admin/backups/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scheduleName,
          frequency: scheduleFrequency,
          time: scheduleTime,
          dayOfWeek: scheduleDayOfWeek,
          timezone: scheduleTimezone,
          backupType: "full",
          storageProviders: ["google-drive"],
          retentionPolicy: {
            keepLast: 10,
            keepDailyFor: 7,
            keepWeeklyFor: 4,
            keepMonthlyFor: 3,
          },
          notifications: {
            onSuccess: false,
            onFailure: true,
            emails: [],
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Schedule created!");
        setScheduleDialogOpen(false);
        fetchSchedules();
      } else {
        toast.error("Failed to create schedule", { description: data.error });
      }
    } catch (error) {
      toast.error("Error creating schedule");
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  // Toggle schedule enabled
  const handleToggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/backups/schedules/${scheduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", enabled }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(enabled ? "Schedule enabled" : "Schedule paused");
        fetchSchedules();
      }
    } catch (error) {
      toast.error("Failed to update schedule");
    }
  };

  // Delete schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/admin/backups/schedules/${scheduleId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Schedule deleted");
        fetchSchedules();
      }
    } catch (error) {
      toast.error("Failed to delete schedule");
    }
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setBackupProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setBackupProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const result = await backupService.createBackup({
        type: backupType,
        collections: backupType === "collections" ? selectedCollections : undefined,
        compression,
        encryption,
      });

      clearInterval(progressInterval);
      setBackupProgress(100);

      if (result.status === "success") {
        toast.success("Backup created successfully", {
          description: `${Object.values(result.documentCounts).reduce((a, b) => a + b, 0)} documents backed up`,
        });
      } else if (result.status === "partial") {
        toast.warning("Backup completed with warnings", {
          description: result.error,
        });
      } else {
        toast.error("Backup failed", {
          description: result.error,
        });
      }

      setCreateDialogOpen(false);
    } catch (error) {
      console.error("Backup error:", error);
      toast.error("Failed to create backup", {
        description: (error as Error).message,
      });
    } finally {
      setIsCreating(false);
      setBackupProgress(0);
    }
  };

  const handleDeleteBackup = async () => {
    if (!backupToDelete) return;

    try {
      await backupService.deleteBackup(backupToDelete.id);
      toast.success("Backup deleted");
      setDeleteDialogOpen(false);
      setBackupToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete backup");
    }
  };

  const confirmDelete = (backup: BackupMetadataDoc) => {
    setBackupToDelete(backup);
    setDeleteDialogOpen(true);
  };

  const handleDownloadBackup = async (backup: BackupMetadataDoc) => {
    toast.info("Download feature coming soon", {
      description: "Cloud storage integration required for downloads",
    });
  };

  const toggleCollection = (collectionId: string) => {
    setSelectedCollections((prev) =>
      prev.includes(collectionId)
        ? prev.filter((c) => c !== collectionId)
        : [...prev, collectionId]
    );
  };

  const selectAllCollections = () => {
    setSelectedCollections(AVAILABLE_COLLECTIONS.map((c) => c.id));
  };

  const clearCollections = () => {
    setSelectedCollections([]);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Backup & Restore</h1>
            <p className="text-muted-foreground">Loading backup data...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Database className="h-8 w-8" />
            Backup & Restore
          </h1>
          <p className="text-muted-foreground">
            Manage database backups and restore points
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Play className="mr-2 h-4 w-4" />
            Create Backup
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileArchive className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalBackups || 0}</p>
                <p className="text-sm text-muted-foreground">Total Backups</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.successRate.toFixed(0) || 0}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <HardDrive className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatBytes(stats?.totalSize || 0)}</p>
                <p className="text-sm text-muted-foreground">Total Size</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats?.lastBackup
                    ? formatDistanceToNow(stats.lastBackup.createdAt.toDate(), { addSuffix: true })
                    : "Never"}
                </p>
                <p className="text-sm text-muted-foreground">Last Backup</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Backup Status */}
      {stats?.lastBackup && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last Backup Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusBadge(stats.lastBackup.status)}
                {getTypeBadge(stats.lastBackup.type)}
                <span className="text-sm text-muted-foreground">
                  {format(stats.lastBackup.createdAt.toDate(), "PPpp")}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{stats.lastBackup.collections.length} collections</span>
                <span>{formatBytes(stats.lastBackup.size)}</span>
                <span>{(stats.lastBackup.duration / 1000).toFixed(1)}s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Backup History</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="storage">Cloud Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Backup History</CardTitle>
              <CardDescription>
                View and manage all database backups
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No backups yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first backup to protect your data
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Play className="mr-2 h-4 w-4" />
                    Create First Backup
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Collections</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {format(backup.createdAt.toDate(), "MMM d, yyyy")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(backup.createdAt.toDate(), "h:mm a")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(backup.type)}</TableCell>
                        <TableCell>{getStatusBadge(backup.status)}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {backup.collections.length} collections
                          </span>
                        </TableCell>
                        <TableCell>{formatBytes(backup.size)}</TableCell>
                        <TableCell>
                          {(backup.duration / 1000).toFixed(1)}s
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDownloadBackup(backup)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => confirmDelete(backup)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Backup Schedules</CardTitle>
                  <CardDescription>
                    Configure automated backups to run on a schedule
                  </CardDescription>
                </div>
                <Button onClick={() => setScheduleDialogOpen(true)} disabled={!googleDriveStatus.connected}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Schedule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!googleDriveStatus.connected ? (
                <div className="text-center py-12">
                  <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Connect Cloud Storage First</h3>
                  <p className="text-muted-foreground mb-4">
                    You need to connect Google Drive before creating scheduled backups
                  </p>
                  <Button onClick={() => setWizardOpen(true)}>
                    <Link className="mr-2 h-4 w-4" />
                    Connect Google Drive
                  </Button>
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No schedules yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create a schedule to automate your backups
                  </p>
                  <Button onClick={() => setScheduleDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Schedule
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.name}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {describeCronExpression(schedule.cronExpression)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {schedule.nextRunAt ? (
                            <span className="text-sm">
                              {formatDistanceToNow(schedule.nextRunAt.toDate(), { addSuffix: true })}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {schedule.lastRunAt ? (
                            <span className="text-sm">
                              {formatDistanceToNow(schedule.lastRunAt.toDate(), { addSuffix: true })}
                            </span>
                          ) : (
                            "Never"
                          )}
                        </TableCell>
                        <TableCell>
                          {schedule.enabled ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Paused</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleToggleSchedule(schedule.id, !schedule.enabled)}
                              title={schedule.enabled ? "Pause" : "Enable"}
                            >
                              {schedule.enabled ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cloud Storage Tab */}
        <TabsContent value="storage" className="mt-6">
          <div className="grid gap-6">
            {/* Google Drive Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Cloud className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Google Drive</CardTitle>
                      <CardDescription>
                        Store backups securely in your Google Drive
                      </CardDescription>
                    </div>
                  </div>
                  {googleDriveStatus.connected ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not Connected</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {googleDriveStatus.connected ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Connected Account</p>
                        <p className="text-sm text-muted-foreground">{googleDriveStatus.email}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-sm font-medium">Backup Folder</p>
                        <p className="text-sm text-muted-foreground">
                          {googleDriveStatus.folderName || "Adams Platform Backups"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleDisconnectGoogleDrive}>
                        <Unlink className="mr-2 h-4 w-4" />
                        Disconnect
                      </Button>
                      <Button variant="outline" asChild>
                        <a
                          href="https://drive.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Google Drive
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Connect your Google Drive to enable cloud backups and scheduled backup storage.
                      Backups will be stored in a dedicated folder in your Drive.
                    </p>
                    <Button onClick={() => setWizardOpen(true)}>
                      <Link className="mr-2 h-4 w-4" />
                      Connect Google Drive
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Setup Instructions */}
            {!googleDriveStatus.connected && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Setup Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Configure Google OAuth</p>
                        <p className="text-sm text-muted-foreground">
                          Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Connect Your Account</p>
                        <p className="text-sm text-muted-foreground">
                          Click &quot;Connect Google Drive&quot; and authorize access
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Create Backup Schedules</p>
                        <p className="text-sm text-muted-foreground">
                          Set up automated backups to run daily, weekly, or on a custom schedule
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Backup Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Backup</DialogTitle>
            <DialogDescription>
              Configure and create a new database backup
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Backup Type */}
            <div className="space-y-2">
              <Label>Backup Type</Label>
              <Select
                value={backupType}
                onValueChange={(value: "full" | "collections") => setBackupType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Backup (All Collections)</SelectItem>
                  <SelectItem value="collections">Select Collections</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Collection Selection */}
            {backupType === "collections" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Collections to Backup</Label>
                  <div className="flex gap-2">
                    <Button variant="link" size="sm" onClick={selectAllCollections}>
                      Select All
                    </Button>
                    <Button variant="link" size="sm" onClick={clearCollections}>
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {AVAILABLE_COLLECTIONS.map((col) => (
                    <div key={col.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={col.id}
                        checked={selectedCollections.includes(col.id)}
                        onCheckedChange={() => toggleCollection(col.id)}
                      />
                      <label
                        htmlFor={col.id}
                        className="text-sm cursor-pointer"
                      >
                        {col.label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedCollections.length} collections selected
                </p>
              </div>
            )}

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="encryption"
                  checked={encryption}
                  onCheckedChange={(checked) => setEncryption(checked as boolean)}
                />
                <label htmlFor="encryption" className="text-sm cursor-pointer flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Enable Encryption (Coming Soon)
                </label>
              </div>
            </div>

            {/* Progress */}
            {isCreating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Creating backup...</span>
                  <span>{backupProgress}%</span>
                </div>
                <Progress value={backupProgress} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBackup}
              disabled={isCreating || (backupType === "collections" && selectedCollections.length === 0)}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Create Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this backup from{" "}
              {backupToDelete &&
                format(backupToDelete.createdAt.toDate(), "PPpp")}
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBackup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Google Drive Setup Wizard */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Connect Google Drive
            </DialogTitle>
            <DialogDescription>
              {wizardStep === 1
                ? "Connect your Google account to enable cloud backups"
                : wizardStep === 2
                ? "Configure your backup settings"
                : "Setup complete!"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    wizardStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  1
                </div>
                <div className={`h-1 w-16 ${wizardStep >= 2 ? "bg-primary" : "bg-muted"}`} />
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    wizardStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  2
                </div>
                <div className={`h-1 w-16 ${wizardStep >= 3 ? "bg-primary" : "bg-muted"}`} />
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    wizardStep >= 3 ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  3
                </div>
              </div>
            </div>

            {/* Step 1: Connect */}
            {wizardStep === 1 && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-blue-500/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <Cloud className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold">Connect Your Google Account</h3>
                <p className="text-sm text-muted-foreground">
                  Click the button below to sign in with Google and authorize access to Google Drive.
                  We&apos;ll create a dedicated folder for your backups.
                </p>
                <Button
                  onClick={handleConnectGoogleDrive}
                  disabled={isConnecting}
                  className="w-full"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Cloud className="mr-2 h-4 w-4" />
                      Sign in with Google
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 2: Configure */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Connected as {googleDriveStatus.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Backup folder created in your Google Drive
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Would you like to set up a backup schedule now?</Label>
                  <p className="text-sm text-muted-foreground">
                    You can always configure this later from the Schedules tab.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Complete */}
            {wizardStep === 3 && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-500/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold">Setup Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  Google Drive is now connected. You can create manual backups or set up
                  automated schedules from the Schedules tab.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {wizardStep === 1 && (
              <Button variant="outline" onClick={() => setWizardOpen(false)}>
                Cancel
              </Button>
            )}
            {wizardStep === 2 && (
              <>
                <Button variant="outline" onClick={() => setWizardStep(3)}>
                  Skip for Now
                </Button>
                <Button
                  onClick={() => {
                    setWizardOpen(false);
                    setScheduleDialogOpen(true);
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Set Up Schedule
                </Button>
              </>
            )}
            {wizardStep === 3 && (
              <Button onClick={() => {
                setWizardOpen(false);
                setWizardStep(1);
              }}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Backup Schedule</DialogTitle>
            <DialogDescription>
              Configure automated backups to Google Drive
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Schedule Name */}
            <div className="space-y-2">
              <Label htmlFor="schedule-name">Schedule Name</Label>
              <Input
                id="schedule-name"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="e.g., Daily Backup"
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={scheduleFrequency}
                onValueChange={(value: "hourly" | "daily" | "weekly" | "monthly") =>
                  setScheduleFrequency(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time (for daily/weekly/monthly) */}
            {scheduleFrequency !== "hourly" && (
              <div className="space-y-2">
                <Label htmlFor="schedule-time">Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            )}

            {/* Day of Week (for weekly) */}
            {scheduleFrequency === "weekly" && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={scheduleDayOfWeek.toString()}
                  onValueChange={(value) => setScheduleDayOfWeek(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Timezone */}
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={scheduleTimezone}
                onValueChange={setScheduleTimezone}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Storage Info */}
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Cloud className="h-5 w-5 text-blue-500" />
              <div className="text-sm">
                <p className="font-medium">Backups will be stored in Google Drive</p>
                <p className="text-muted-foreground">
                  Connected as {googleDriveStatus.email}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
              disabled={isCreatingSchedule}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSchedule}
              disabled={isCreatingSchedule || !scheduleName.trim()}
            >
              {isCreatingSchedule ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Schedule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
