"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Linkedin, Mail, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";

interface LeadershipMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatar?: string;
  linkedIn?: string;
  email: string;
  leadershipRole: "CEO" | "COO" | "CTO" | "CRO";
}

// Fallback data if Firebase is not configured or no leadership members found
const fallbackTeam: LeadershipMember[] = [
  {
    id: "1",
    name: "Leadership Team Member",
    role: "Executive Leadership",
    bio: "Leading Adams Electric's third-generation, family-owned electrical construction business.",
    avatar: "/team/leadership.jpg",
    linkedIn: "#",
    email: "info@adams-electric.com",
    leadershipRole: "CEO",
  },
  {
    id: "2",
    name: "Operations Lead",
    role: "VP Operations",
    bio: "Oversees field operations, safety, and workforce development across the Southeast.",
    avatar: "/team/ops.jpg",
    linkedIn: "#",
    email: "info@adams-electric.com",
    leadershipRole: "COO",
  },
  {
    id: "3",
    name: "PreConstruction Director",
    role: "Director of PreConstruction",
    bio: "Leads estimating, design-assist, and constructability planning.",
    avatar: "/team/precon.jpg",
    linkedIn: "#",
    email: "info@adams-electric.com",
    leadershipRole: "CRO",
  },
  {
    id: "4",
    name: "Technology Lead",
    role: "VDC / Technology",
    bio: "Leads BIM, virtual design, and prefabrication technology.",
    avatar: "/team/technology.jpg",
    linkedIn: "#",
    email: "info@adams-electric.com",
    leadershipRole: "CTO",
  },
];

const roleOrder = { CEO: 1, COO: 2, CTO: 3, CRO: 4 };

export function LeadershipTeam() {
  const [team, setTeam] = useState<LeadershipMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeadershipTeam = async () => {
      if (!db) {
        setTeam(fallbackTeam);
        setLoading(false);
        return;
      }

      try {
        // Query for team members with any leadership flag set
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.TEAM_MEMBERS));
        const leadershipMembers: LeadershipMember[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data() as TeamMemberDoc;
          
          // Check if any leadership flag is set
          if (data.isCEO || data.isCOO || data.isCTO || data.isCRO) {
            // Determine the primary leadership role
            let leadershipRole: "CEO" | "COO" | "CTO" | "CRO" = "CEO";
            let roleTitle = data.title || data.expertise;
            
            if (data.isCEO) {
              leadershipRole = "CEO";
              roleTitle = "Executive Leadership";
            } else if (data.isCOO) {
              leadershipRole = "COO";
              roleTitle = "Operations Leadership";
            } else if (data.isCTO) {
              leadershipRole = "CTO";
              roleTitle = "Technology Leadership";
            } else if (data.isCRO) {
              leadershipRole = "CRO";
              roleTitle = "PreConstruction Leadership";
            }

            leadershipMembers.push({
              id: doc.id,
              name: `${data.firstName} ${data.lastName}`,
              role: roleTitle,
              bio: data.bio || data.expertise || "",
              avatar: data.avatar,
              linkedIn: data.linkedIn,
              email: data.emailPrimary,
              leadershipRole,
            });
          }
        });

        // Sort by role order (CEO first, then COO, CTO, CRO)
        leadershipMembers.sort((a, b) => roleOrder[a.leadershipRole] - roleOrder[b.leadershipRole]);

        if (leadershipMembers.length > 0) {
          setTeam(leadershipMembers);
        } else {
          setTeam(fallbackTeam);
        }
      } catch (error) {
        console.error("Error fetching leadership team:", error);
        setTeam(fallbackTeam);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadershipTeam();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
      {team.map((member) => (
        <Card key={member.id} className="overflow-hidden">
          <CardContent className="p-6 text-center">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={member.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-semibold">{member.name}</h3>
            <p className="text-primary text-sm font-medium">{member.role}</p>
            <p className="text-muted-foreground text-sm mt-2">{member.bio}</p>
            <div className="flex justify-center gap-2 mt-4">
              {member.linkedIn && member.linkedIn !== "#" && (
                <Button variant="ghost" size="icon" asChild>
                  <Link href={member.linkedIn} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" asChild>
                <Link href={`mailto:${member.email}`}>
                  <Mail className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
