"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CloudUpload, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Database
} from "lucide-react";
import { useFirebaseMigration } from "@/lib/hooks/use-firebase-migration";

interface DataMigrationBannerProps {
  userId: string;
  onDismiss?: () => void;
}

export function DataMigrationBanner({ userId, onDismiss }: DataMigrationBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { 
    isLoading, 
    hasPendingData, 
    summary, 
    lastMigrationResult, 
    migrate,
    clearLocalData 
  } = useFirebaseMigration();

  // Don't show if no pending data or dismissed
  if (!hasPendingData || dismissed) {
    return null;
  }

  const handleMigrate = async () => {
    await migrate(userId, true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const totalItems = summary.aiEmployees + summary.aiChats + (summary.hasNotificationSettings ? 1 : 0);

  // Show success message after migration
  if (lastMigrationResult?.success) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Migration Complete!</AlertTitle>
        <AlertDescription className="text-green-700">
          Successfully migrated {lastMigrationResult.migratedItems.aiEmployees} AI employees, {" "}
          {lastMigrationResult.migratedItems.aiChats} chat histories
          {lastMigrationResult.migratedItems.notificationSettings && ", and notification settings"} to Firebase.
        </AlertDescription>
      </Alert>
    );
  }

  // Show error message if migration failed
  if (lastMigrationResult && !lastMigrationResult.success) {
    return (
      <Alert className="mb-4 border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">Migration Failed</AlertTitle>
        <AlertDescription className="text-red-700">
          {lastMigrationResult.errors.join(", ")}
          <Button 
            variant="link" 
            className="p-0 h-auto text-red-700 underline ml-2"
            onClick={handleMigrate}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium text-blue-900">
                Sync Your Data to the Cloud
              </h4>
              <p className="text-sm text-blue-700">
                You have {totalItems} item{totalItems !== 1 ? "s" : ""} stored locally that can be synced to Firebase for access across all your devices.
              </p>
              <ul className="text-xs text-blue-600 mt-2 space-y-0.5">
                {summary.aiEmployees > 0 && (
                  <li>• {summary.aiEmployees} AI employee{summary.aiEmployees !== 1 ? "s" : ""}</li>
                )}
                {summary.aiChats > 0 && (
                  <li>• {summary.aiChats} chat histor{summary.aiChats !== 1 ? "ies" : "y"}</li>
                )}
                {summary.hasNotificationSettings && (
                  <li>• Notification settings</li>
                )}
              </ul>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleMigrate}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
