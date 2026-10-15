"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Factory,
  ChevronRight,
  Users,
  Target,
  TrendingUp,
  Calendar,
  Plus,
  Battery,
  Building2,
  Zap,
} from "lucide-react";

const initiatives = [
  {
    id: "tbmnc",
    name: "TBMNC Supplier Readiness",
    fullName: "Toyota Battery Manufacturing North Carolina",
    description: "Supplier qualification program for Toyota's new battery manufacturing facility in Liberty, NC",
    status: "active",
    stats: {
      totalSuppliers: 5,
      approved: 1,
      inProgress: 3,
      affiliatesAssigned: 4,
    },
    icon: Battery,
    href: "/portal/admin/initiatives/tbmnc",
    color: "bg-red-500",
  },
  // Future initiatives can be added here
  {
    id: "future-1",
    name: "Coming Soon",
    fullName: "Additional OEM Programs",
    description: "More supplier readiness programs will be added as partnerships are established",
    status: "planned",
    stats: null,
    icon: Building2,
    href: "#",
    color: "bg-gray-400",
  },
];

export default function InitiativesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>Admin</span>
            <ChevronRight className="h-4 w-4" />
            <span>Initiatives</span>
          </div>
          <h1 className="text-3xl font-bold">Initiatives</h1>
          <p className="text-muted-foreground">
            Manage supplier readiness programs and OEM qualification initiatives
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          New Initiative
        </Button>
      </div>

      {/* Initiative Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {initiatives.map((initiative) => (
          <Card
            key={initiative.id}
            className={initiative.status === "planned" ? "opacity-60" : ""}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${initiative.color}`}>
                    <initiative.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {initiative.name}
                      <Badge
                        variant={initiative.status === "active" ? "default" : "secondary"}
                      >
                        {initiative.status === "active" ? "Active" : "Planned"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{initiative.fullName}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{initiative.description}</p>

              {initiative.stats && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{initiative.stats.totalSuppliers}</p>
                    <p className="text-xs text-muted-foreground">Suppliers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{initiative.stats.approved}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{initiative.stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{initiative.stats.affiliatesAssigned}</p>
                    <p className="text-xs text-muted-foreground">Affiliates</p>
                  </div>
                </div>
              )}

              {initiative.status === "active" && (
                <Button asChild className="w-full">
                  <Link href={initiative.href}>
                    Manage Initiative
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>About Supplier Readiness Initiatives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Supplier Readiness Initiatives help potential suppliers prepare for OEM qualification
            by tracking their progress through the qualification process and connecting them with
            Adams team members who can provide expert assistance.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <Factory className="h-8 w-8 text-primary mb-2" />
              <h4 className="font-semibold">Supplier Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Monitor suppliers through each stage of the qualification process
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <Users className="h-8 w-8 text-primary mb-2" />
              <h4 className="font-semibold">Affiliate Matching</h4>
              <p className="text-sm text-muted-foreground">
                Connect suppliers with affiliates based on expertise requirements
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <Target className="h-8 w-8 text-primary mb-2" />
              <h4 className="font-semibold">Deliverable Management</h4>
              <p className="text-sm text-muted-foreground">
                Track required artifacts and documentation for qualification
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
