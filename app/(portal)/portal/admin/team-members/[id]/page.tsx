"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { ArrowLeft, Brain, GraduationCap, Laptop, Loader2, MessageSquare } from "lucide-react";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type TeamMemberDoc, type UserAssetDoc, type UserTrainingCertDoc } from "@/lib/schema";
import { LMS_COLLECTIONS } from "@/lib/firebase-lms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type GenericRecord = Record<string, unknown> & { id: string };

export default function TeamMemberConnectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [member, setMember] = useState<TeamMemberDoc | null>(null);
  const [assets, setAssets] = useState<UserAssetDoc[]>([]);
  const [certs, setCerts] = useState<UserTrainingCertDoc[]>([]);
  const [enrollments, setEnrollments] = useState<GenericRecord[]>([]);
  const [communications, setCommunications] = useState<GenericRecord[]>([]);
  const [brains, setBrains] = useState<GenericRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    void (async () => {
      try {
        const [memberSnap, assetSnap, certSnap, enrollmentSnap, taskSnap, brainSnap] = await Promise.all([
          getDoc(doc(db!, COLLECTIONS.TEAM_MEMBERS, id)), getDocs(collection(db!, COLLECTIONS.USER_ASSETS)), getDocs(collection(db!, COLLECTIONS.USER_TRAINING_CERTS)), getDocs(collection(db!, LMS_COLLECTIONS.ENROLLMENTS)), getDocs(collection(db!, COLLECTIONS.TRACTION_TODOS)), getDocs(collection(db!, COLLECTIONS.ADAMS_BRAINS)),
        ]);
        if (memberSnap.exists()) {
          const loaded = { id: memberSnap.id, ...memberSnap.data() } as TeamMemberDoc;
          setMember(loaded);
          const email = loaded.emailPrimary.toLowerCase();
          const matches = (data: Record<string, unknown>) => [data.teamMemberId, data.userId, data.ownerId, data.assigneeId, data.assignedTo, data.assignedToTeamMemberId].some((value) => value === id) || [data.userEmail, data.ownerEmail, data.assignedToEmail].some((value) => String(value || "").toLowerCase() === email);
          setAssets(assetSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as UserAssetDoc).filter((item) => matches(item as unknown as Record<string, unknown>)));
          setCerts(certSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as UserTrainingCertDoc).filter((item) => matches(item as unknown as Record<string, unknown>)));
          setEnrollments(enrollmentSnap.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => matches(item)));
          setCommunications(taskSnap.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => matches(item)));
          setBrains(brainSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as GenericRecord).filter((item) => matches(item) || item.createdByUid === loaded.firebaseUid));
        }
      } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  if (!member) return <div className="p-6">Team member not found.</div>;
  const name = `${member.firstName} ${member.lastName}`.trim();
  return <div className="space-y-6 p-6"><Button asChild variant="ghost"><Link href="/portal/admin/team-members"><ArrowLeft className="mr-2 h-4 w-4" />Team Members</Link></Button><div><h1 className="text-2xl font-bold">{name}</h1><p className="text-sm text-muted-foreground">Connected Adams Platform records · {member.emailPrimary}</p></div><Tabs defaultValue="assets"><TabsList className="grid h-auto w-full grid-cols-1 sm:grid-cols-3"><TabsTrigger value="assets"><Laptop className="mr-2 h-4 w-4" />Assets ({assets.length})</TabsTrigger><TabsTrigger value="lms"><GraduationCap className="mr-2 h-4 w-4" />LMS / Certifications ({certs.length + enrollments.length})</TabsTrigger><TabsTrigger value="communications"><MessageSquare className="mr-2 h-4 w-4" />Communications ({communications.length + brains.length})</TabsTrigger></TabsList>
    <TabsContent value="assets"><Card><CardHeader><CardTitle>Assigned Assets</CardTitle><CardDescription>Phones, laptops, iPads, hotspots, and other equipment connected by Team Member ID, UID, or email.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Tag / Serial</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{assets.map((asset) => <TableRow key={asset.id}><TableCell>{asset.assetName}<div className="text-xs text-muted-foreground">{asset.assetType}</div></TableCell><TableCell>{asset.assetTag || asset.serialNumber || asset.identifier}</TableCell><TableCell><Badge variant="outline">{asset.status}</Badge></TableCell></TableRow>)}</TableBody></Table><Button asChild className="mt-4"><Link href="/portal/admin/asset-manager">Open Asset Manager</Link></Button></CardContent></Card></TabsContent>
    <TabsContent value="lms"><div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Certifications and AHA Training</CardTitle></CardHeader><CardContent className="space-y-2">{certs.map((cert) => <div key={cert.id} className="rounded-md border p-3"><div className="font-medium">{cert.trainingTitle}</div><div className="text-xs text-muted-foreground">{cert.issuingOrganization} · Expires {cert.expirationDate}</div></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Academy Enrollments</CardTitle></CardHeader><CardContent className="space-y-2">{enrollments.map((item) => <div key={item.id} className="rounded-md border p-3"><div className="font-medium">{String(item.courseTitle || item.courseId || "Course")}</div><Badge variant="outline">{String(item.status || "enrolled")}</Badge></div>)}</CardContent></Card></div></TabsContent>
    <TabsContent value="communications"><div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />MindChuk / Tasks</CardTitle><CardDescription>Personal captures, shared assignments, reminders, and communications activity.</CardDescription></CardHeader><CardContent className="space-y-2">{communications.slice(0, 50).map((item) => <div key={item.id} className="rounded-md border p-3"><div className="font-medium">{String(item.description || item.title || "Task")}</div><div className="text-xs text-muted-foreground">{String(item.status || "open")}</div></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />GBrain / Hermes</CardTitle><CardDescription>Knowledge repositories owned by or explicitly connected to this Team Member.</CardDescription></CardHeader><CardContent className="space-y-2">{brains.map((item) => <div key={item.id} className="rounded-md border p-3"><div className="font-medium">{String(item.name || item.title || "Repository")}</div><div className="text-xs text-muted-foreground">{String(item.status || "configured")}</div></div>)}</CardContent></Card></div></TabsContent>
  </Tabs></div>;
}
