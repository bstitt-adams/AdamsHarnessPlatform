"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  Building,
  Calendar,
  DollarSign,
  Target,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { COLLECTIONS, type OpportunityDoc } from "@/lib/schema";
import { logActivity } from "@/lib/activity-logger";

interface OpportunityDisplay {
  id: string;
  name: string;
  company: string;
  stage: string;
  value: number;
  probability: number;
  expectedClose: string;
  owner: { name: string; initials: string };
}

const stages = ["All Stages", "lead", "discovery", "proposal", "negotiation", "closed-won", "closed-lost"];

function getStageColor(stage: string) {
  const colors: Record<string, string> = {
    lead: "bg-gray-100 text-gray-800",
    discovery: "bg-blue-100 text-blue-800",
    proposal: "bg-sky-100 text-sky-800",
    negotiation: "bg-orange-100 text-orange-800",
    "closed-won": "bg-green-100 text-green-800",
    "closed-lost": "bg-red-100 text-red-800",
  };
  return colors[stage.toLowerCase()] || "bg-gray-100 text-gray-800";
}

function formatStage(stage: string) {
  return stage.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<OpportunityDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All Stages");

  useEffect(() => {
    fetchOpportunities();
  }, []);

  async function fetchOpportunities() {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      const oppsRef = collection(db, COLLECTIONS.OPPORTUNITIES);
      const oppsQuery = query(oppsRef, orderBy("updatedAt", "desc"));
      const snapshot = await getDocs(oppsQuery);

      const oppsData: OpportunityDisplay[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as OpportunityDoc;
        const expectedClose = data.expectedCloseDate?.toDate() || new Date();
        oppsData.push({
          id: doc.id,
          name: data.name || "Unnamed Opportunity",
          company: (data as any).organizationName || "",
          stage: data.stage || "lead",
          value: data.value || 0,
          probability: data.probability || 0,
          expectedClose: formatDate(expectedClose),
          owner: { name: "Owner", initials: "OW" },
        });
      });
      setOpportunities(oppsData);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!db) return;
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.OPPORTUNITIES, id));
      await logActivity({
        type: "delete",
        entityType: "opportunity",
        entityId: id,
        entityName: name,
        description: `Opportunity deleted: ${name}`,
      });
      await fetchOpportunities();
    } catch (error) {
      console.error("Error deleting opportunity:", error);
    }
  }

  // Filter opportunities
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch = 
      opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === "All Stages" || opp.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  // Calculate stats
  const totalValue = filteredOpportunities.reduce((sum, opp) => sum + opp.value, 0);
  const weightedValue = filteredOpportunities.reduce(
    (sum, opp) => sum + opp.value * (opp.probability / 100),
    0
  );

  // Calculate closing this month
  const now = new Date();
  const closingThisMonth = filteredOpportunities.filter((opp) => {
    const closeDate = new Date(opp.expectedClose);
    return closeDate.getMonth() === now.getMonth() && closeDate.getFullYear() === now.getFullYear();
  });
  const closingThisMonthValue = closingThisMonth.reduce((sum, opp) => sum + opp.value, 0);

  // Calculate win rate (closed-won / (closed-won + closed-lost))
  const closedWon = opportunities.filter((opp) => opp.stage === "closed-won").length;
  const closedLost = opportunities.filter((opp) => opp.stage === "closed-lost").length;
  const winRate = closedWon + closedLost > 0 ? Math.round((closedWon / (closedWon + closedLost)) * 100) : 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
            <p className="text-muted-foreground">Loading opportunities...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
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
          <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-muted-foreground">
            Manage your sales pipeline and track deal progress
          </p>
        </div>
        <Button asChild>
          <Link href="/portal/opportunities/new">
            <Plus className="mr-2 h-4 w-4" />
            New Opportunity
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">{opportunities.length} opportunities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Weighted Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(weightedValue)}</div>
            <p className="text-xs text-muted-foreground">Based on probability</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Closing This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closingThisMonth.length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(closingThisMonthValue)} potential</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
            <p className="text-xs text-muted-foreground">Based on closed deals</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search opportunities..." 
                className="pl-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage === "All Stages" ? stage : formatStage(stage)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                <SelectItem value="john">John Doe</SelectItem>
                <SelectItem value="sarah">Sarah Mitchell</SelectItem>
                <SelectItem value="mike">Mike Roberts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunity</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead>Expected Close</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOpportunities.length > 0 ? (
                filteredOpportunities.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell>
                      <div>
                        <Link
                          href={`/portal/opportunities/${opp.id}`}
                          className="font-medium hover:underline"
                        >
                          {opp.name}
                        </Link>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building className="h-3 w-3" />
                          {opp.company || "No organization"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStageColor(opp.stage)}>{formatStage(opp.stage)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(opp.value)}</TableCell>
                    <TableCell>{opp.probability}%</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {opp.expectedClose}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{opp.owner.initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{opp.owner.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/portal/opportunities/${opp.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/portal/opportunities/${opp.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(opp.id, opp.name)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-48">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Target className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        {searchQuery || stageFilter !== "All Stages" 
                          ? "No opportunities match your filters" 
                          : "No opportunities yet"}
                      </p>
                      <Button asChild>
                        <Link href="/portal/opportunities/new">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Opportunity
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
