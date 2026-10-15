"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck } from "lucide-react";

export default function VehicleInspectionPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          Vehicle Inspection
        </h1>
        <p className="text-muted-foreground mt-2">
          Daily vehicle checklists and fleet safety records for Adams Electric field crews.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            The Vehicle Inspection module is under development. Check back for daily checklists,
            photo uploads, and defect reporting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            For immediate vehicle safety concerns, contact your supervisor or the safety department.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
