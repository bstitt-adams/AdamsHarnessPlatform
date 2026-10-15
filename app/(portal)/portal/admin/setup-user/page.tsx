"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, setDoc, collection, query, where, getDocs, updateDoc, Timestamp } from "firebase/firestore";
import { useUserProfile } from "@/contexts/user-profile-context";

export default function SetupUserPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { linkedTeamMember, refreshLinkedTeamMember } = useUserProfile();

  const setupAdams = async () => {
    if (!db) {
      toast.error("Firebase not initialized");
      return;
    }

    setLoading(true);
    try {
      const ADMIN_EMAIL = "info@adams-electric.com";
      const now = Timestamp.now();

      // Check if there's already a team member with this email
      const teamMembersRef = collection(db, "teamMembers");
      const teamMemberQuery = query(teamMembersRef, where("emailPrimary", "==", ADMIN_EMAIL));
      const teamMemberSnapshot = await getDocs(teamMemberQuery);

      let teamMemberId: string | null = null;
      let firebaseUid: string | null = null;
      let currentData: any = null;

      if (!teamMemberSnapshot.empty) {
        const existingTeamMember = teamMemberSnapshot.docs[0];
        teamMemberId = existingTeamMember.id;
        currentData = existingTeamMember.data();
        firebaseUid = currentData.firebaseUid || currentData.authUid || null;
        
        // Update existing team member with superadmin role AND name
        await updateDoc(existingTeamMember.ref, {
          firstName: "Adams",
          lastName: "Electric",
          role: "superadmin",
          updatedAt: now,
        });
        
        console.log("Updated team member:", teamMemberId, "Current data:", currentData);
      } else {
        // Create new team member
        const newTeamMemberRef = doc(collection(db, "teamMembers"));
        teamMemberId = newTeamMemberRef.id;
        
        await setDoc(newTeamMemberRef, {
          id: teamMemberId,
          emailPrimary: ADMIN_EMAIL,
          firstName: "Adams",
          lastName: "Electric",
          expertise: "",
          role: "superadmin",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      }

      // If we have a firebaseUid, create/update the users document
      if (firebaseUid) {
        const userRef = doc(db, "users", firebaseUid);
        await setDoc(userRef, {
          id: firebaseUid,
          email: ADMIN_EMAIL,
          firstName: "Adams",
          lastName: "Electric",
          displayName: "Adams Electric",
          role: "superadmin",
          status: "active",
          createdAt: now,
          updatedAt: now,
          lastActive: now,
        }, { merge: true });
      }

      // Refresh the linked team member to update the UI
      await refreshLinkedTeamMember();

      setResult({
        success: true,
        email: ADMIN_EMAIL,
        teamMemberId,
        firebaseUid: firebaseUid || "Not linked yet - sign out and sign back in",
        role: "superadmin",
        previousData: currentData,
      });

      toast.success("Adams Electric setup complete! Please sign out and sign back in to see changes.");
    } catch (error) {
      console.error("Error setting up user:", error);
      toast.error("Failed to setup user: " + String(error));
      setResult({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Setup Admin User</CardTitle>
          <CardDescription>
            Create User document for Adams Electric and link to authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkedTeamMember && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-800">Currently Logged In As:</p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li><strong>Name:</strong> {linkedTeamMember.firstName || "(empty)"} {linkedTeamMember.lastName || "(empty)"}</li>
                <li><strong>Email:</strong> {linkedTeamMember.emailPrimary}</li>
                <li><strong>Role:</strong> {linkedTeamMember.role}</li>
                <li><strong>Team Member ID:</strong> {linkedTeamMember.id}</li>
                <li><strong>Firebase UID:</strong> {linkedTeamMember.firebaseUid || "(not linked)"}</li>
              </ul>
            </div>
          )}
          
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium">Will Update To:</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li><strong>Name:</strong> Adams Electric</li>
              <li><strong>Email:</strong> info@adams-electric.com</li>
              <li><strong>Role:</strong> Admin</li>
            </ul>
          </div>

          <Button 
            onClick={setupAdams} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Setting up..." : "Create/Update Adams Electric as Admin"}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <p className="font-medium">{result.success ? "Success!" : "Error"}</p>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
