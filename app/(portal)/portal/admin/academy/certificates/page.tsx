"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Award, ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getCourses, issueCertificate, type CourseDoc, type CertificateDoc } from "@/lib/firebase-lms";

export default function AcademyCertificatesPage() {
  const [courses, setCourses] = useState<CourseDoc[]>([]);
  const [recipientName, setRecipientName] = useState("");
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [certificate, setCertificate] = useState<CertificateDoc | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { void getCourses().then(setCourses).catch(() => toast.error("Unable to load courses")); }, []);

  const generate = async () => {
    if (!recipientName.trim() || !userId.trim() || !courseId) {
      toast.error("Enter the recipient name, Firebase user ID, and course");
      return;
    }
    const course = courses.find((item) => item.id === courseId);
    if (!course) return;
    setLoading(true);
    try {
      const result = await issueCertificate({
        odUserId: userId.trim(),
        certificateType: "course",
        courseId,
        title: course.title,
        recipientName: recipientName.trim(),
      });
      setCertificate(result);
      toast.success("Adams Electric certificate generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Certificate generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" asChild><Link href="/portal/admin/academy"><ArrowLeft className="mr-2 size-4" />Back to Academy</Link></Button>
      <div><h1 className="text-3xl font-bold">Adams Electric Certificates</h1><p className="text-muted-foreground">Generate branded course completion certificates for learners.</p></div>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader><CardTitle>Issue certificate</CardTitle><CardDescription>Complete the learner details, then generate a print-ready certificate.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="recipientName">Learner name</Label><Input id="recipientName" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Jordan Adams" /></div>
            <div className="space-y-2"><Label htmlFor="userId">Firebase user ID</Label><Input id="userId" value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Firebase Auth UID" /></div>
            <div className="space-y-2"><Label>Completed course</Label><Select value={courseId} onValueChange={setCourseId}><SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger><SelectContent>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}</SelectContent></Select></div>
            <Button className="w-full" onClick={() => void generate()} disabled={loading}>{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Award className="mr-2 size-4" />}Generate certificate</Button>
          </CardContent>
        </Card>
        <div>
          {certificate ? <CertificatePreview certificate={certificate} onPrint={() => window.print()} /> : <Card className="flex min-h-[420px] items-center justify-center"><CardContent className="text-center text-muted-foreground"><Award className="mx-auto mb-4 size-12 opacity-40" /><p>Your Adams Electric certificate preview will appear here.</p></CardContent></Card>}
        </div>
      </div>
    </div>
  );
}

function CertificatePreview({ certificate, onPrint }: { certificate: CertificateDoc; onPrint: () => void }) {
  return <div className="space-y-4"><div id="adams-certificate" className="relative overflow-hidden border-8 border-[#005A9C] bg-white p-10 text-center shadow-xl print:shadow-none"><div className="absolute inset-3 border border-[#C7A44A]" /><div className="relative space-y-6"><Image src="/images/adamselectric_logo.png" alt="Adams Electric" width={240} height={80} className="mx-auto h-16 w-auto" /><p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#005A9C]">Certificate of Completion</p><p className="text-muted-foreground">This certificate is proudly presented to</p><h2 className="border-b-2 border-[#C7A44A] pb-3 text-4xl font-serif text-[#12324A]">{certificate.recipientName}</h2><p className="text-muted-foreground">for successfully completing</p><h3 className="text-2xl font-semibold text-[#005A9C]">{certificate.title}</h3><p className="text-sm text-muted-foreground">Certificate No. {certificate.certificateNumber}</p><div className="flex justify-between border-t pt-5 text-xs text-muted-foreground"><span>Adams Electric Academy</span><span>{certificate.issuedAt.toDate().toLocaleDateString()}</span></div></div></div><Button variant="outline" onClick={onPrint}><Printer className="mr-2 size-4" />Print / Save PDF</Button></div>;
}
