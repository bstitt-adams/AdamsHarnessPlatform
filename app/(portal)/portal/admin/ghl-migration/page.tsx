"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  GhlMigrationService,
  validateCredentials,
  testConnection,
  generateMigrationReport,
  ALL_GHL_CONTENT_TYPES,
  type GhlCredentials,
  type MigrationOptions,
  type GhlContentType,
  type MigrationReport,
} from "@/lib/ghl-migration";
import {
  Loader2,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Play,
  AlertTriangle,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function GhlMigrationPage() {
  // Credentials state
  const [credentials, setCredentials] = useState<GhlCredentials>({
    sourceApiKey: "",
    sourceLocationId: "",
    targetApiKey: "",
    targetLocationId: "",
  });

  // Content types selection
  const [selectedTypes, setSelectedTypes] = useState<GhlContentType[]>([
    "tags",
    "customFields",
    "templates",
    "contacts",
  ]);

  // Options
  const [dryRun, setDryRun] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Status
  const [testingSource, setTestingSource] = useState(false);
  const [testingTarget, setTestingTarget] = useState(false);
  const [sourceConnected, setSourceConnected] = useState<boolean | null>(null);
  const [targetConnected, setTargetConnected] = useState<boolean | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Test connections
  const testSourceConnection = async () => {
    setTestingSource(true);
    const result = await testConnection(credentials, false);
    setSourceConnected(result.success);
    setTestingSource(false);
    
    if (result.success) {
      toast.success("Source connection successful");
    } else {
      toast.error(`Source connection failed: ${result.error}`);
    }
  };

  const testTargetConnection = async () => {
    setTestingTarget(true);
    const result = await testConnection(credentials, true);
    setTargetConnected(result.success);
    setTestingTarget(false);
    
    if (result.success) {
      toast.success("Target connection successful");
    } else {
      toast.error(`Target connection failed: ${result.error}`);
    }
  };

  // Toggle content type
  const toggleContentType = (type: GhlContentType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  // Select/deselect all
  const selectAll = () => setSelectedTypes([...ALL_GHL_CONTENT_TYPES]);
  const selectNone = () => setSelectedTypes([]);

  // Run migration
  const runMigration = async () => {
    // Validate
    const validationErrors = validateCredentials(credentials);
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join(", "));
      return;
    }

    if (selectedTypes.length === 0) {
      toast.error("Please select at least one content type to migrate");
      return;
    }

    setMigrating(true);
    setReport(null);
    setLogs([]);

    try {
      const options: MigrationOptions = {
        contentTypes: selectedTypes,
        dryRun,
        skipDuplicates,
      };

      const service = new GhlMigrationService(credentials, options);
      const migrationReport = await service.runMigration();
      
      setReport(migrationReport);
      setLogs(service.getLogs());

      if (migrationReport.summary.totalFailed === 0) {
        toast.success("Migration completed successfully!");
      } else {
        toast.warning(`Migration completed with ${migrationReport.summary.totalFailed} errors`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  // Download report
  const downloadReport = () => {
    if (!report) return;
    
    const markdown = generateMigrationReport(report);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ghl-migration-report-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Report downloaded");
  };

  // Content type categories for grouping
  const contentCategories = {
    "Core Data": ["contacts", "opportunities", "tasks"] as GhlContentType[],
    "Configuration": ["tags", "customFields", "users", "pipelines"] as GhlContentType[],
    "Marketing": ["templates", "campaigns", "forms", "surveys"] as GhlContentType[],
    "Automation": ["workflows", "calendars", "appointments"] as GhlContentType[],
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-8 w-8" />
            GoHighLevel Migration Tool
          </h1>
          <p className="text-muted-foreground mt-2">
            Migrate content from one GHL instance to another
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Source Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Source Instance
              </CardTitle>
              <CardDescription>
                Enter API credentials for the source GHL account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="source-api-key">API Key</Label>
                <Input
                  id="source-api-key"
                  type="password"
                  placeholder="Enter source API key"
                  value={credentials.sourceApiKey}
                  onChange={(e) =>
                    setCredentials({ ...credentials, sourceApiKey: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source-location-id">Location ID</Label>
                <Input
                  id="source-location-id"
                  placeholder="Enter source location ID"
                  value={credentials.sourceLocationId}
                  onChange={(e) =>
                    setCredentials({ ...credentials, sourceLocationId: e.target.value })
                  }
                />
              </div>
              <Button
                onClick={testSourceConnection}
                disabled={testingSource || !credentials.sourceApiKey}
                variant="outline"
                className="w-full"
              >
                {testingSource ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : sourceConnected === true ? (
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                ) : sourceConnected === false ? (
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                ) : null}
                Test Connection
              </Button>
            </CardContent>
          </Card>

          {/* Target Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Target Instance
              </CardTitle>
              <CardDescription>
                Enter API credentials for the target GHL account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target-api-key">API Key</Label>
                <Input
                  id="target-api-key"
                  type="password"
                  placeholder="Enter target API key"
                  value={credentials.targetApiKey}
                  onChange={(e) =>
                    setCredentials({ ...credentials, targetApiKey: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-location-id">Location ID</Label>
                <Input
                  id="target-location-id"
                  placeholder="Enter target location ID"
                  value={credentials.targetLocationId}
                  onChange={(e) =>
                    setCredentials({ ...credentials, targetLocationId: e.target.value })
                  }
                />
              </div>
              <Button
                onClick={testTargetConnection}
                disabled={testingTarget || !credentials.targetApiKey}
                variant="outline"
                className="w-full"
              >
                {testingTarget ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : targetConnected === true ? (
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                ) : targetConnected === false ? (
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                ) : null}
                Test Connection
              </Button>
            </CardContent>
          </Card>

          {/* Migration Options */}
          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dry-run"
                  checked={dryRun}
                  onCheckedChange={(checked) => setDryRun(checked as boolean)}
                />
                <Label htmlFor="dry-run" className="font-normal cursor-pointer">
                  Dry Run (preview only, no actual migration)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skip-duplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(checked) =>
                    setSkipDuplicates(checked as boolean)
                  }
                />
                <Label htmlFor="skip-duplicates" className="font-normal cursor-pointer">
                  Skip duplicates
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Content Selection */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content to Migrate</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectNone}>
                    None
                  </Button>
                </div>
              </div>
              <CardDescription>
                {selectedTypes.length} content types selected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(contentCategories).map(([category, types]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      {category}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {types.map((type) => (
                        <div
                          key={type}
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedTypes.includes(type)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                          onClick={() => toggleContentType(type)}
                        >
                          <Checkbox
                            checked={selectedTypes.includes(type)}
                            onChange={() => {}}
                          />
                          <Label className="font-normal cursor-pointer capitalize">
                            {type.replace(/([A-Z])/g, " $1").trim()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="flex gap-4">
                <Button
                  onClick={runMigration}
                  disabled={
                    migrating ||
                    selectedTypes.length === 0 ||
                    !credentials.sourceApiKey ||
                    !credentials.targetApiKey
                  }
                  className="flex-1"
                  size="lg"
                >
                  {migrating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Migrating...
                    </>
                  ) : dryRun ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Preview Migration
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Start Migration
                    </>
                  )}
                </Button>

                {report && (
                  <Button variant="outline" onClick={downloadReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Report
                  </Button>
                )}
              </div>

              {!dryRun && (
                <div className="flex items-start gap-2 mt-4 p-3 bg-sky-50 border border-sky-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-sky-800">
                    Warning: This will modify data in your target GHL instance. 
                    Consider running a dry run first to preview changes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {report && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Migration Results
                </CardTitle>
                <CardDescription>
                  Duration: {report.summary.duration}ms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {report.summary.totalSourceItems}
                    </div>
                    <div className="text-sm text-muted-foreground">Source Items</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {report.summary.totalMigrated}
                    </div>
                    <div className="text-sm text-muted-foreground">Migrated</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {report.summary.totalFailed}
                    </div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {report.results.map((result) => (
                    <div
                      key={result.contentType}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        result.success
                          ? "border-green-200 bg-green-50/50"
                          : "border-red-200 bg-red-50/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium capitalize">
                          {result.contentType.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="secondary">{result.sourceCount} source</Badge>
                        <Badge variant="outline" className="text-green-600">
                          {result.migratedCount} migrated
                        </Badge>
                        {result.failedCount > 0 && (
                          <Badge variant="outline" className="text-red-600">
                            {result.failedCount} failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Migration Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-slate-950 text-slate-50 p-4 rounded-lg overflow-auto max-h-96">
                  {logs.join("\n")}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
