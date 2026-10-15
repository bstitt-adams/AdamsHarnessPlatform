"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Play,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Users,
  ListChecks,
  Calendar,
  Mountain,
  Bell,
  RefreshCw,
  Rocket,
  Settings,
  Edit,
  Repeat,
  Activity,
  Clock,
  Trash2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc, addDoc, updateDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS, type TeamMemberDoc, type PlatformSettingsDoc, type MattermostPlaybookDoc, type MattermostPlaybookRunDoc } from "@/lib/schema";
import {
  createPlaybook,
  startPlaybookRun,
  getMattermostTeams,
  getMattermostUsers,
  listPlaybooks,
  listPlaybookRuns,
  updatePlaybook,
  getPlaybook,
  generateReminderPlaybook,
  generateRockPlaybook,
  generateLevel10Playbook,
  generateRecurringPlaybook,
  type PlaybookConfig,
  type MattermostPlaybookResponse,
  type MattermostPlaybookRunResponse,
} from "@/lib/mattermost";

interface MattermostUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface MattermostTeam {
  id: string;
  name: string;
  display_name: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  mattermostUserId?: string;
}

export function PlaybookGenerator() {
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState("");
  const [token, setToken] = useState("");
  const [teams, setTeams] = useState<MattermostTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");
  const [mattermostUsers, setMattermostUsers] = useState<MattermostUser[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [playbooks, setPlaybooks] = useState<MattermostPlaybookResponse[]>([]);
  const [playbookRuns, setPlaybookRuns] = useState<MattermostPlaybookRunResponse[]>([]);
  const [trackedPlaybooks, setTrackedPlaybooks] = useState<(MattermostPlaybookDoc & { id: string })[]>([]);
  const [trackedRuns, setTrackedRuns] = useState<(MattermostPlaybookRunDoc & { id: string })[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Playbook form state
  const [playbookType, setPlaybookType] = useState<"reminder" | "rock" | "level10" | "recurring" | "custom">("reminder");
  const [playbookTitle, setPlaybookTitle] = useState("");
  const [playbookDescription, setPlaybookDescription] = useState("");
  const [reminderTasks, setReminderTasks] = useState<{ title: string; description: string }[]>([
    { title: "", description: "" }
  ]);
  const [reminderInterval, setReminderInterval] = useState("daily");
  const [recurrence, setRecurrence] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [enableNotifications, setEnableNotifications] = useState(true);
  
  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRunsDialog, setShowRunsDialog] = useState(false);
  const [selectedPlaybook, setSelectedPlaybook] = useState<MattermostPlaybookResponse | null>(null);
  const [editingPlaybook, setEditingPlaybook] = useState<MattermostPlaybookResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"playbooks" | "runs" | "tracked">("playbooks");

  // Load settings from Firebase
  useEffect(() => {
    const loadSettings = async () => {
      if (!db) return;
      try {
        const docRef = doc(db, COLLECTIONS.PLATFORM_SETTINGS, "global");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as PlatformSettingsDoc;
          if (data.integrations?.mattermost) {
            setServerUrl(data.integrations.mattermost.serverUrl || "");
            setToken(data.integrations.mattermost.apiKey || "");
          }
        }
        
        // Load team members
        const teamRef = collection(db, COLLECTIONS.TEAM_MEMBERS);
        const teamQuery = query(teamRef, orderBy("firstName"));
        const snapshot = await getDocs(teamQuery);
        
        const members: TeamMember[] = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as TeamMemberDoc;
          const firstName = data.firstName || "";
          const lastName = data.lastName || "";
          members.push({
            id: doc.id,
            name: `${firstName} ${lastName}`.trim() || "Unknown",
            email: data.emailPrimary || "",
            mattermostUserId: data.mattermostUserId,
          });
        });
        setTeamMembers(members);
        
        // Load tracked playbooks from Firestore
        await loadTrackedPlaybooks();
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const loadTrackedPlaybooks = async () => {
    if (!db) return;
    try {
      const playbooksRef = collection(db, COLLECTIONS.MATTERMOST_PLAYBOOKS);
      const playbooksSnapshot = await getDocs(playbooksRef);
      const tracked: (MattermostPlaybookDoc & { id: string })[] = [];
      playbooksSnapshot.docs.forEach((doc) => {
        tracked.push({ id: doc.id, ...doc.data() } as MattermostPlaybookDoc & { id: string });
      });
      setTrackedPlaybooks(tracked);

      const runsRef = collection(db, COLLECTIONS.MATTERMOST_PLAYBOOK_RUNS);
      const runsSnapshot = await getDocs(runsRef);
      const runs: (MattermostPlaybookRunDoc & { id: string })[] = [];
      runsSnapshot.docs.forEach((doc) => {
        runs.push({ id: doc.id, ...doc.data() } as MattermostPlaybookRunDoc & { id: string });
      });
      setTrackedRuns(runs);
    } catch (error) {
      console.error("Error loading tracked playbooks:", error);
    }
  };

  const handleConnect = async () => {
    if (!serverUrl || !token) {
      toast.error("Please enter server URL and token");
      return;
    }
    
    setConnecting(true);
    try {
      const result = await getMattermostTeams(serverUrl, token);
      if (result.success && result.teams) {
        setTeams(result.teams);
        setIsConnected(true);
        toast.success("Connected to Mattermost");
        
        if (result.teams.length > 0) {
          setSelectedTeam(result.teams[0].id);
          setSelectedTeamName(result.teams[0].display_name);
          await loadTeamData(result.teams[0].id);
        }
      } else {
        toast.error(result.error || "Failed to connect");
      }
    } catch (error) {
      toast.error("Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const loadTeamData = async (teamId: string) => {
    if (!serverUrl || !token) return;
    
    try {
      const [usersResult, playbooksResult, runsResult] = await Promise.all([
        getMattermostUsers(serverUrl, token, teamId),
        listPlaybooks(serverUrl, token, teamId),
        listPlaybookRuns(serverUrl, token, teamId),
      ]);
      
      if (usersResult.success && usersResult.users) {
        setMattermostUsers(usersResult.users);
      }
      
      if (playbooksResult.success && playbooksResult.playbooks) {
        setPlaybooks(playbooksResult.playbooks);
      }
      
      if (runsResult.success && runsResult.runs) {
        setPlaybookRuns(runsResult.runs);
      }
    } catch (error) {
      console.error("Error loading team data:", error);
    }
  };

  const handleTeamChange = async (teamId: string) => {
    setSelectedTeam(teamId);
    const team = teams.find(t => t.id === teamId);
    setSelectedTeamName(team?.display_name || "");
    await loadTeamData(teamId);
  };

  const addReminderTask = () => {
    setReminderTasks([...reminderTasks, { title: "", description: "" }]);
  };

  const updateReminderTask = (index: number, field: "title" | "description", value: string) => {
    const updated = [...reminderTasks];
    updated[index][field] = value;
    setReminderTasks(updated);
  };

  const removeReminderTask = (index: number) => {
    if (reminderTasks.length > 1) {
      setReminderTasks(reminderTasks.filter((_, i) => i !== index));
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const getReminderSeconds = () => {
    switch (reminderInterval) {
      case "hourly": return 3600;
      case "daily": return 86400;
      case "weekly": return 604800;
      case "monthly": return 2592000;
      default: return 86400;
    }
  };

  const getMattermostUserIds = (): string[] => {
    // Map selected team members to their Mattermost user IDs
    const userIds: string[] = [];
    selectedMembers.forEach(memberId => {
      const member = teamMembers.find(m => m.id === memberId);
      if (member?.mattermostUserId) {
        userIds.push(member.mattermostUserId);
      } else if (member?.email) {
        // Try to find by email
        const mmUser = mattermostUsers.find(u => u.email === member.email);
        if (mmUser) {
          userIds.push(mmUser.id);
        }
      }
    });
    return userIds;
  };

  const handleCreatePlaybook = async () => {
    if (!playbookTitle.trim()) {
      toast.error("Please enter a playbook title");
      return;
    }
    
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one team member");
      return;
    }
    
    const memberIds = getMattermostUserIds();
    if (memberIds.length === 0) {
      toast.error("Selected team members don't have linked Mattermost accounts. Please link them in the team member settings.");
      return;
    }
    
    setCreating(true);
    try {
      let config: PlaybookConfig;
      const tasks = reminderTasks
        .filter(t => t.title.trim())
        .map(t => ({ title: t.title, description: t.description }));
      
      switch (playbookType) {
        case "reminder":
          if (tasks.length === 0) {
            toast.error("Please add at least one task");
            setCreating(false);
            return;
          }
          
          config = generateReminderPlaybook(
            playbookTitle,
            playbookDescription,
            selectedTeam,
            memberIds,
            tasks,
            getReminderSeconds()
          );
          break;
          
        case "rock":
          config = generateRockPlaybook(
            playbookTitle,
            playbookDescription,
            selectedTeam,
            memberIds[0],
            memberIds,
            tasks
          );
          break;
          
        case "level10":
          config = generateLevel10Playbook(selectedTeam, memberIds, memberIds[0]);
          break;
          
        case "recurring":
          if (tasks.length === 0) {
            toast.error("Please add at least one task");
            setCreating(false);
            return;
          }
          
          config = generateRecurringPlaybook(
            playbookTitle,
            playbookDescription,
            selectedTeam,
            memberIds,
            tasks,
            recurrence
          );
          break;
          
        default:
          config = {
            title: playbookTitle,
            description: playbookDescription,
            team_id: selectedTeam,
            create_public_playbook_run: false,
            public: true,
            checklists: [{
              title: "Tasks",
              items: tasks.map(t => ({
                title: t.title,
                description: t.description,
              })),
            }],
            member_ids: memberIds,
            invited_user_ids: memberIds,
            invite_users_enabled: true,
          };
      }
      
      const result = await createPlaybook(serverUrl, token, config);
      
      if (result.success && result.playbook) {
        // Save to Firestore for tracking
        if (db) {
          const playbookDoc: Omit<MattermostPlaybookDoc, "id"> = {
            mattermostPlaybookId: result.playbook.id,
            title: playbookTitle,
            description: playbookDescription,
            teamId: selectedTeam,
            teamName: selectedTeamName,
            type: playbookType,
            recurrence: playbookType === "recurring" ? recurrence : undefined,
            assignedMemberIds: selectedMembers,
            mattermostMemberIds: memberIds,
            checklists: config.checklists.map(c => ({
              title: c.title,
              items: c.items.map(i => ({ title: i.title, description: i.description })),
            })),
            status: "active",
            notificationsEnabled: enableNotifications,
            reminderIntervalSeconds: config.reminder_timer_default_seconds,
            createdBy: "current-user", // TODO: Get actual user ID
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
          
          await addDoc(collection(db, COLLECTIONS.MATTERMOST_PLAYBOOKS), playbookDoc);
          await loadTrackedPlaybooks();
        }
        
        toast.success("Playbook created successfully!");
        setPlaybooks([...playbooks, result.playbook]);
        setShowCreateDialog(false);
        resetForm();
      } else {
        toast.error(result.error || "Failed to create playbook");
      }
    } catch (error) {
      toast.error("Error creating playbook");
    } finally {
      setCreating(false);
    }
  };

  const handleDeployPlaybook = async () => {
    if (!selectedPlaybook) return;
    
    const memberIds = getMattermostUserIds();
    if (memberIds.length === 0) {
      toast.error("Please select team members with linked Mattermost accounts");
      return;
    }
    
    setDeploying(true);
    try {
      const runName = `${selectedPlaybook.title} - ${new Date().toLocaleDateString()}`;
      const result = await startPlaybookRun(serverUrl, token, {
        name: runName,
        description: selectedPlaybook.description,
        owner_user_id: memberIds[0],
        team_id: selectedTeam,
        playbook_id: selectedPlaybook.id,
      });
      
      if (result.success && result.run) {
        // Save run to Firestore for tracking
        if (db) {
          // Find the tracked playbook if it exists
          const trackedPlaybook = trackedPlaybooks.find(
            p => p.mattermostPlaybookId === selectedPlaybook.id
          );
          
          const runDoc: Omit<MattermostPlaybookRunDoc, "id"> = {
            mattermostRunId: result.run.id,
            playbookId: trackedPlaybook?.id || "",
            mattermostPlaybookId: selectedPlaybook.id,
            name: runName,
            description: selectedPlaybook.description,
            teamId: selectedTeam,
            channelId: result.run.channel_id,
            ownerUserId: memberIds[0],
            ownerMemberId: selectedMembers[0],
            status: "in_progress",
            currentStatus: result.run.current_status,
            checklistProgress: selectedPlaybook.checklists?.map((c, idx) => ({
              checklistIndex: idx,
              title: c.title,
              totalItems: c.items?.length || 0,
              completedItems: 0,
            })) || [],
            totalTasks: selectedPlaybook.num_steps || 0,
            completedTasks: 0,
            completionPercentage: 0,
            assignedMemberIds: selectedMembers,
            mattermostMemberIds: memberIds,
            startedAt: Timestamp.now(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
          
          await addDoc(collection(db, COLLECTIONS.MATTERMOST_PLAYBOOK_RUNS), runDoc);
          
          // Update the playbook's lastDeployedAt
          if (trackedPlaybook) {
            const playbookRef = doc(db, COLLECTIONS.MATTERMOST_PLAYBOOKS, trackedPlaybook.id);
            await updateDoc(playbookRef, {
              lastDeployedAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
          }
          
          await loadTrackedPlaybooks();
        }
        
        toast.success("Playbook deployed! Check Mattermost for the new channel.");
        setShowDeployDialog(false);
        setSelectedPlaybook(null);
        setSelectedMembers([]);
        await loadTeamData(selectedTeam);
      } else {
        toast.error(result.error || "Failed to deploy playbook");
      }
    } catch (error) {
      toast.error("Error deploying playbook");
    } finally {
      setDeploying(false);
    }
  };

  const resetForm = () => {
    setPlaybookTitle("");
    setPlaybookDescription("");
    setReminderTasks([{ title: "", description: "" }]);
    setSelectedMembers([]);
    setPlaybookType("reminder");
    setRecurrence("weekly");
    setEnableNotifications(true);
    setEditingPlaybook(null);
  };

  const openEditPlaybook = async (playbook: MattermostPlaybookResponse) => {
    // Load full playbook details
    const result = await getPlaybook(serverUrl, token, playbook.id);
    if (result.success && result.playbook) {
      setEditingPlaybook(result.playbook);
      setPlaybookTitle(result.playbook.title);
      setPlaybookDescription(result.playbook.description || "");
      
      // Load checklists into tasks
      if (result.playbook.checklists && result.playbook.checklists.length > 0) {
        const tasks = result.playbook.checklists.flatMap(c => 
          c.items?.map(i => ({ title: i.title, description: i.description || "" })) || []
        );
        setReminderTasks(tasks.length > 0 ? tasks : [{ title: "", description: "" }]);
      }
      
      // Find tracked playbook to get type info
      const tracked = trackedPlaybooks.find(t => t.mattermostPlaybookId === playbook.id);
      if (tracked) {
        setPlaybookType(tracked.type);
        if (tracked.recurrence) {
          setRecurrence(tracked.recurrence);
        }
        setEnableNotifications(tracked.notificationsEnabled);
        // Set selected members from tracked data
        setSelectedMembers(tracked.assignedMemberIds);
      }
      
      setShowEditDialog(true);
    } else {
      toast.error("Failed to load playbook details");
    }
  };

  const handleUpdatePlaybook = async () => {
    if (!editingPlaybook) return;
    if (!playbookTitle.trim()) {
      toast.error("Please enter a playbook title");
      return;
    }
    
    setUpdating(true);
    try {
      const tasks = reminderTasks
        .filter(t => t.title.trim())
        .map(t => ({ title: t.title, description: t.description }));
      
      const config: Partial<PlaybookConfig> = {
        title: playbookTitle,
        description: playbookDescription,
        checklists: [{
          title: playbookType === "recurring" ? "Recurring Tasks" : "Tasks",
          items: tasks,
        }],
      };
      
      // Update reminder interval based on type
      if (playbookType === "recurring") {
        const reminderSeconds = {
          daily: 86400,
          weekly: 604800,
          biweekly: 1209600,
          monthly: 2592000,
        }[recurrence];
        config.reminder_timer_default_seconds = reminderSeconds;
      }
      
      const result = await updatePlaybook(serverUrl, token, editingPlaybook.id, config);
      
      if (result.success) {
        // Update Firestore tracking
        if (db) {
          const tracked = trackedPlaybooks.find(t => t.mattermostPlaybookId === editingPlaybook.id);
          if (tracked) {
            const playbookRef = doc(db, COLLECTIONS.MATTERMOST_PLAYBOOKS, tracked.id);
            await updateDoc(playbookRef, {
              title: playbookTitle,
              description: playbookDescription,
              checklists: config.checklists?.map(c => ({
                title: c.title,
                items: c.items?.map(i => ({ title: i.title, description: i.description })) || [],
              })),
              recurrence: playbookType === "recurring" ? recurrence : null,
              notificationsEnabled: enableNotifications,
              updatedAt: Timestamp.now(),
            });
          }
          await loadTrackedPlaybooks();
        }
        
        toast.success("Playbook updated successfully!");
        setShowEditDialog(false);
        resetForm();
        await loadTeamData(selectedTeam);
      } else {
        toast.error(result.error || "Failed to update playbook");
      }
    } catch (error) {
      toast.error("Error updating playbook");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                Mattermost Playbooks
                {isConnected && (
                  <Badge variant="default" className="ml-2">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Generate and deploy playbooks to Mattermost for team reminders and workflows
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Mattermost Server URL</Label>
                  <Input
                    placeholder="https://your-mattermost-server.com"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Personal Access Token</Label>
                  <Input
                    type="password"
                    placeholder="Your Mattermost token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="mr-2 h-4 w-4" />
                )}
                Connect to Mattermost
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label>Team</Label>
                <Select value={selectedTeam} onValueChange={handleTeamChange}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={() => loadTeamData(selectedTeam)} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Playbook
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Mattermost Playbook</DialogTitle>
                      <DialogDescription>
                        Create a playbook to automate reminders and workflows for your team
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Tabs value={playbookType} onValueChange={(v) => setPlaybookType(v as typeof playbookType)}>
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="reminder">
                          <Bell className="h-4 w-4 mr-2" />
                          Reminder
                        </TabsTrigger>
                        <TabsTrigger value="recurring">
                          <Repeat className="h-4 w-4 mr-2" />
                          Recurring
                        </TabsTrigger>
                        <TabsTrigger value="rock">
                          <Mountain className="h-4 w-4 mr-2" />
                          Rock
                        </TabsTrigger>
                        <TabsTrigger value="level10">
                          <Calendar className="h-4 w-4 mr-2" />
                          Level 10
                        </TabsTrigger>
                        <TabsTrigger value="custom">
                          <ListChecks className="h-4 w-4 mr-2" />
                          Custom
                        </TabsTrigger>
                      </TabsList>
                      
                      <div className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Playbook Title</Label>
                          <Input
                            placeholder={
                              playbookType === "level10" 
                                ? "Level 10 Meeting" 
                                : "Enter playbook title"
                            }
                            value={playbookTitle}
                            onChange={(e) => setPlaybookTitle(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Describe the purpose of this playbook"
                            value={playbookDescription}
                            onChange={(e) => setPlaybookDescription(e.target.value)}
                          />
                        </div>
                        
                        {playbookType === "reminder" && (
                          <div className="space-y-2">
                            <Label>Reminder Interval</Label>
                            <Select value={reminderInterval} onValueChange={setReminderInterval}>
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
                        )}
                        
                        {playbookType === "recurring" && (
                          <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <Repeat className="h-4 w-4" />
                                Recurring Playbook
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Create a playbook that runs on a schedule with automatic status update notifications to team members.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Recurrence Schedule</Label>
                              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as typeof recurrence)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="enable-notifications"
                                checked={enableNotifications}
                                onCheckedChange={(checked) => setEnableNotifications(checked as boolean)}
                              />
                              <label htmlFor="enable-notifications" className="text-sm cursor-pointer">
                                Enable status update notifications
                              </label>
                            </div>
                          </div>
                        )}
                        
                        {playbookType !== "level10" && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Tasks / Checklist Items</Label>
                              <Button type="button" variant="outline" size="sm" onClick={addReminderTask}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Task
                              </Button>
                            </div>
                            <div className="space-y-3">
                              {reminderTasks.map((task, index) => (
                                <div key={index} className="flex gap-2">
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      placeholder="Task title"
                                      value={task.title}
                                      onChange={(e) => updateReminderTask(index, "title", e.target.value)}
                                    />
                                    <Input
                                      placeholder="Description (optional)"
                                      value={task.description}
                                      onChange={(e) => updateReminderTask(index, "description", e.target.value)}
                                    />
                                  </div>
                                  {reminderTasks.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeReminderTask(index)}
                                    >
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {playbookType === "level10" && (
                          <div className="p-4 bg-muted rounded-lg">
                            <h4 className="font-medium mb-2">Level 10 Meeting Agenda</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              This will create a playbook with the standard EOS Level 10 meeting format:
                            </p>
                            <ul className="text-sm space-y-1">
                              <li>ΓÇó Segue (5 min)</li>
                              <li>ΓÇó Scorecard Review (5 min)</li>
                              <li>ΓÇó Rock Review (5 min)</li>
                              <li>ΓÇó Customer/Employee Headlines (5 min)</li>
                              <li>ΓÇó To-Do List (5 min)</li>
                              <li>ΓÇó IDS - Issues (60 min)</li>
                              <li>ΓÇó Conclude (5 min)</li>
                            </ul>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label>Assign to Team Members</Label>
                          <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                            {teamMembers.map((member) => (
                              <div key={member.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={member.id}
                                  checked={selectedMembers.includes(member.id)}
                                  onCheckedChange={() => toggleMemberSelection(member.id)}
                                />
                                <label htmlFor={member.id} className="flex-1 text-sm cursor-pointer">
                                  {member.name}
                                  {member.mattermostUserId && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Linked
                                    </Badge>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Only members with linked Mattermost accounts will be added to the playbook
                          </p>
                        </div>
                      </div>
                    </Tabs>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreatePlaybook} disabled={creating}>
                        {creating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Rocket className="mr-2 h-4 w-4" />
                        )}
                        Create Playbook
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Playbooks */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Available Playbooks
            </CardTitle>
            <CardDescription>
              Deploy existing playbooks to start a new run with team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {playbooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No playbooks found for this team</p>
                <p className="text-sm">Create a new playbook to get started</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {playbooks.map((playbook) => (
                  <Card key={playbook.id} className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{playbook.title}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {playbook.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Badge variant="secondary">
                          {playbook.num_stages} stages
                        </Badge>
                        <Badge variant="secondary">
                          {playbook.num_steps} steps
                        </Badge>
                        {trackedPlaybooks.find(t => t.mattermostPlaybookId === playbook.id)?.type === "recurring" && (
                          <Badge variant="default" className="bg-purple-600">
                            <Repeat className="h-3 w-3 mr-1" />
                            Recurring
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={() => openEditPlaybook(playbook)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Dialog open={showDeployDialog && selectedPlaybook?.id === playbook.id} onOpenChange={(open) => {
                          setShowDeployDialog(open);
                          if (!open) setSelectedPlaybook(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => setSelectedPlaybook(playbook)}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Deploy
                            </Button>
                          </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Deploy Playbook</DialogTitle>
                            <DialogDescription>
                              Start a new run of &quot;{playbook.title}&quot; with selected team members
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Select Team Members</Label>
                              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                                {teamMembers.map((member) => (
                                  <div key={member.id} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`deploy-${member.id}`}
                                      checked={selectedMembers.includes(member.id)}
                                      onCheckedChange={() => toggleMemberSelection(member.id)}
                                    />
                                    <label htmlFor={`deploy-${member.id}`} className="flex-1 text-sm cursor-pointer">
                                      {member.name}
                                      {member.mattermostUserId && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Linked
                                        </Badge>
                                      )}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeployDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleDeployPlaybook} disabled={deploying}>
                              {deploying ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="mr-2 h-4 w-4" />
                              )}
                              Deploy Playbook
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Playbook Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Playbook</DialogTitle>
            <DialogDescription>
              Update the playbook configuration and tasks
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Playbook Title</Label>
              <Input
                value={playbookTitle}
                onChange={(e) => setPlaybookTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={playbookDescription}
                onChange={(e) => setPlaybookDescription(e.target.value)}
              />
            </div>
            
            {playbookType === "recurring" && (
              <div className="space-y-2">
                <Label>Recurrence Schedule</Label>
                <Select value={recurrence} onValueChange={(v) => setRecurrence(v as typeof recurrence)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tasks / Checklist Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addReminderTask}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              </div>
              <div className="space-y-3">
                {reminderTasks.map((task, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Task title"
                        value={task.title}
                        onChange={(e) => updateReminderTask(index, "title", e.target.value)}
                      />
                      <Input
                        placeholder="Description (optional)"
                        value={task.description}
                        onChange={(e) => updateReminderTask(index, "description", e.target.value)}
                      />
                    </div>
                    {reminderTasks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReminderTask(index)}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-notifications"
                checked={enableNotifications}
                onCheckedChange={(checked) => setEnableNotifications(checked as boolean)}
              />
              <label htmlFor="edit-notifications" className="text-sm cursor-pointer">
                Enable status update notifications
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePlaybook} disabled={updating}>
              {updating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Edit className="mr-2 h-4 w-4" />
              )}
              Update Playbook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deployed Runs Section */}
      {isConnected && trackedRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Playbook Runs
            </CardTitle>
            <CardDescription>
              Track deployed playbooks and their progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trackedRuns.filter(r => r.status === "in_progress").map((run) => {
                const playbook = trackedPlaybooks.find(p => p.id === run.playbookId);
                return (
                  <div key={run.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{run.name}</span>
                        {playbook?.type === "recurring" && (
                          <Badge variant="default" className="bg-purple-600">
                            <Repeat className="h-3 w-3 mr-1" />
                            Recurring
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Started {run.startedAt?.toDate?.()?.toLocaleDateString() || "Unknown"}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {run.completedTasks}/{run.totalTasks} tasks
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={run.completionPercentage >= 100 ? "default" : "secondary"}>
                        {run.completionPercentage}%
                      </Badge>
                      <Badge variant={run.status === "in_progress" ? "default" : "secondary"}>
                        {run.status === "in_progress" ? "Active" : run.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Member Linking Info */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Member Linking
            </CardTitle>
            <CardDescription>
              Link Adams team members to their Mattermost accounts for playbook assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teamMembers.map((member) => {
                const mmUser = mattermostUsers.find(u => 
                  u.email === member.email || u.id === member.mattermostUserId
                );
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{member.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">{member.email}</span>
                    </div>
                    {mmUser ? (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        @{mmUser.username}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not linked
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Team members are automatically linked by matching email addresses. 
              Ensure team members use the same email in both Adams Platform and Mattermost.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
