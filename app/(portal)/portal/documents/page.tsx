"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Documents
        </h1>
        <p className="text-muted-foreground">
          Manage your documents and files
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Document management coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}