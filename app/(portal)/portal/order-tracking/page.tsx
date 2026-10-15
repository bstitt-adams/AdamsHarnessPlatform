"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function OrderTrackingPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          Order Tracking
        </h1>
        <p className="text-muted-foreground mt-2">
          Track material orders, delivery status, and job site inventory for Adams Electric projects.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            The Order Tracking module is under development. Check back for purchase orders,
            delivery schedules, and inventory alerts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            For current order status, contact the procurement or warehouse team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
