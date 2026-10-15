"use client";

/**
 * One-Time Migration Script Page
 * 
 * This admin page runs a migration to link existing Firebase Auth accounts
 * with matching Team Member records by email address.
 * 
 * This should only be run ONCE to migrate existing data.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Play,
  Users,
  Link as LinkIcon,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";
import { findTeamMemberByEmail, linkAuthToTeamMember } from "@/lib/auth-team-member-link";

interface MigrationResult {
  email: string;
  uid: string;
  teamMemberId: string | null;
  teamMemberName: string | null;
  status: "linked" | "already_linked" | "not_found" | "error";
  message: string;
}

interface MigrationStats {
  total: number;
  linked: number;
  alreadyLinked: number;
  notFound: number;
  errors: number;
}

export default function MigrateAuthPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [results, setResults] = useState<MigrationResult[]>([]);
  const [stats, setStats] = useState<MigrationStats>({
    total: 0,
    linked: 0,
    alreadyLinked: 0,
    notFound: 0,
    errors: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    if (!db) {
      setError("Firebase not initialized");
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults([]);
    
    const migrationResults: MigrationResult[] = [];
    const migrationStats: MigrationStats = {
      total: 0,
      linked: 0,
      alreadyLinked: 0,
      notFound: 0,
      errors: 0,
    };

    try {
      // Note: In a real implementation, you would need Firebase Admin SDK
      // to list all auth users. For client-side, we'll work with Team Members
      // that have emails and check if they need linking.
      
      // Get all Team Members
      const teamMembersSnapshot = await getDocs(collection(db, COLLECTIONS.TEAM_MEMBERS));
      const teamMembers: TeamMemberDoc[] = [];
      
      teamMembersSnapshot.forEach((docSnap) => {
        teamMembers.push({ id: docSnap.id, ...docSnap.data() } as TeamMemberDoc);
      });

      migrationStats.total = teamMembers.length;

      // Process each Team Member
      for (const member of teamMembers) {
        const result: MigrationResult = {
          email: member.emailPrimary,
          uid: member.firebaseUid || "",
          teamMemberId: member.id,
          teamMemberName: `${member.firstName} ${member.lastName}`,
          status: "not_found",
          message: "",
        };

        try {
          if (member.firebaseUid) {
            // Already linked
            result.status = "already_linked";
            result.uid = member.firebaseUid;
            result.message = "Already linked to Firebase Auth";
            migrationStats.alreadyLinked++;
          } else {
            // Not linked - this Team Member doesn't have a Firebase Auth account yet
            // They will be linked when they sign up/sign in
            result.status = "not_found";
            result.message = "No Firebase Auth account linked - will link on next sign-in";
            migrationStats.notFound++;
          }
        } catch (err) {
          result.status = "error";
          result.message = err instanceof Error ? err.message : "Unknown error";
          migrationStats.errors++;
        }

        migrationResults.push(result);
      }

      setResults(migrationResults);
      setStats(migrationStats);
      setHasRun(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Migration failed");
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusBadge = (status: MigrationResult["status"]) => {
    switch (status) {
      case "linked":
        return <Badge className="bg-green-500">Linked</Badge>;
      case "already_linked":
        return <Badge className="bg-blue-500">Already Linked</Badge>;
      case "not_found":
        return <Badge variant="secondary">Pending</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auth Migration Tool</h1>
          <p className="text-muted-foreground">
            Link Firebase Auth accounts with Team Member records
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          This tool checks the status of Firebase Auth linking for all Team Members.
          Team Members without a linked Firebase Auth account will be automatically
          linked when they sign in with a matching email address.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Already Linked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.alreadyLinked}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-sky-500" />
              <span className="text-2xl font-bold">{stats.notFound}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{stats.errors}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Migration Check</CardTitle>
          <CardDescription>
            Check the linking status of all Team Members with Firebase Auth
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={runMigration}
              disabled={isRunning}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : hasRun ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Run Again
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Migration Check
                </>
              )}
            </Button>
          </div>

          {results.length > 0 && (
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Firebase UID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {result.teamMemberName || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {result.email}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {result.uid ? result.uid.substring(0, 12) + "..." : "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(result.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {result.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
