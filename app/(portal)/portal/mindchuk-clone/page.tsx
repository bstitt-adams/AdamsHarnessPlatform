"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HardHat } from "lucide-react";

export default function MindChukClonePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <HardHat className="h-8 w-8 text-primary" />
          MindChuk Clone
        </h1>
        <p className="text-muted-foreground mt-2">
          Adams Electric&apos;s internal field knowledge assistant and safety reference tool.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            The MindChuk Clone module is under development. Check back for voice-enabled field
            Q&amp;A, safety procedures, and quick code lookups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            For immediate field questions, contact your foreman or consult the project documentation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
