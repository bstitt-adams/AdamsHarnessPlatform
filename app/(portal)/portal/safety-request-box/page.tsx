"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function SafetyRequestBoxPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          Safety Request Box
        </h1>
        <p className="text-muted-foreground mt-2">
          Submit safety requests, observations, and near-miss reports for Adams Electric jobsites.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            The Safety Request Box is under development. Check back for anonymous submissions,
            photo evidence, and routing to the safety team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            For urgent safety issues, contact your foreman or call the safety hotline immediately.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
