"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { ModuleDefinition } from "@/lib/modules/contract";
import { adamsFetchJson } from "@/lib/adams-harness/client-api";
import { useUserProfile } from "@/contexts/user-profile-context";

export default function ModulesPage() {
  const { isLoading, isAuthenticated } = useUserProfile();
  const [modules, setModules] = useState<ModuleDefinition[]>([]);
  const [fetching, setFetching] = useState(true);

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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Modules</h1>
        <p className="text-muted-foreground">
          Department modules generated from approved solution specifications.
        </p>
      </div>
      {modules.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No modules have been deployed yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {modules.map((m) => (
            <Link key={m.slug} href={`/portal/modules/${m.slug}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle className="text-base">{m.name}</CardTitle>
                  <CardDescription>{m.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
