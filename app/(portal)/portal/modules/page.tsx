"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Rocket, Settings, Search, Plus } from "lucide-react";
import type { ModuleDefinition } from "@/lib/modules/contract";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";

export default function ModulesPage() {
  const { isLoading, isAuthenticated } = useUserProfile();
  const [modules, setModules] = useState<ModuleDefinition[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    adamsFetchJson<{ modules: ModuleDefinition[] }>("/api/adams-harness/modules")
      .then((data) => setModules(data.modules))
      .catch(() => setModules([]))
      .finally(() => setFetching(false));
  }, [isLoading, isAuthenticated]);

  if (isLoading || (isAuthenticated && fetching)) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please sign in to view modules.</p>
      </div>
    );
  }

  const filtered = modules.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.slug.toLowerCase().includes(q) ||
      m.departmentId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Solution App Workspaces</h1>
          <p className="text-muted-foreground text-sm">
            Standardized solution apps with live metrics dashboards, AI charts, global search, item detail pages, triggers, and external API endpoints.
          </p>
        </div>
        <Button asChild>
          <Link href="/portal/solutions/new">
            <Plus className="mr-2 h-4 w-4" />
            New Interview Idea
          </Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search solution workspaces..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No matching solution modules found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Card key={m.slug} className="flex flex-col justify-between transition-colors hover:border-primary/60">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{m.name}</CardTitle>
                  <Badge variant="outline" className="text-xs capitalize">
                    {m.departmentId}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-3">
                  {m.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex items-center justify-between gap-2 pt-2 border-t">
                <Button size="sm" asChild>
                  <Link href={`/portal/modules/${encodeURIComponent(m.slug)}`}>
                    <Rocket className="mr-1.5 h-3.5 w-3.5" />
                    Open Workspace
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/portal/modules/${encodeURIComponent(m.slug)}/settings`}>
                    <Settings className="mr-1.5 h-3.5 w-3.5" />
                    Settings &amp; API
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
