"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { COLLECTIONS, type PlatformDevReportDoc } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Copy, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PlatformDevReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [report, setReport] = useState<PlatformDevReportDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      if (!db || !reportId) return;
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.PLATFORM_DEV_REPORTS, reportId));
        if (snap.exists()) {
          setReport({ id: snap.id, ...snap.data() } as PlatformDevReportDoc);
        } else {
          toast.error("Report not found");
        }
      } catch (error) {
        console.error("Error loading report:", error);
        toast.error("Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [reportId]);

  const handleDownload = () => {
    if (!report?.pdfBase64) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${report.pdfBase64}`;
    link.download = report.pdfFileName || "report.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Report link copied");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Report not found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/portal/admin/platform-development">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Platform Development
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/portal/admin/platform-development" className="hover:underline">Platform Development</Link>
            <span>/</span>
            <span>Report</span>
          </div>
          <h1 className="text-3xl font-bold">Weekly Development Report</h1>
          <p className="text-muted-foreground">
            Week ending {report.periodEnd.toDate().toLocaleDateString("en-US")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
          <CardDescription>AI-generated summary for {report.recipientEmail}</CardDescription>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap">{report.summaryText}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New Capabilities</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap">{report.newCapabilitiesText}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks Included</CardTitle>
          <CardDescription>{report.tasks.length} tasks in this report</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-1">
            {report.tasks.map((taskId) => (
              <li key={taskId} className="text-sm text-muted-foreground">{taskId}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
