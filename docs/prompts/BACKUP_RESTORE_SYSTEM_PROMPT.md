# Backup & Restore System - Development Prompt

## Overview

Create a comprehensive backup and restore system for the Adams Electric platform admin section. The system should be enterprise-grade, user-friendly, and support multiple storage backends with scheduled automation.

---

## Core Requirements

### 1. Admin UI Dashboard (`/portal/admin/backups`)

Create a modern, intuitive backup management interface with:

#### Main Dashboard View
- **Backup Status Card**: Show last backup time, status (success/failed), size, and duration
- **Quick Actions**: One-click buttons for "Backup Now", "Restore", "Download Latest"
- **Storage Usage**: Visual progress bar showing storage consumption per provider
- **Backup History Table**: Sortable/filterable list of all backups with:
  - Timestamp
  - Type (full/incremental/collections-only)
  - Size
  - Storage location
  - Status
  - Actions (download, restore, delete)

#### Schedule Configuration Panel
- **Frequency Options**:
  - Hourly (for critical data)
  - Daily (recommended)
  - Weekly
  - Custom cron expression
- **Time Selection**: Timezone-aware time picker
- **Retention Policy**:
  - Keep last N backups
  - Keep daily for X days
  - Keep weekly for X weeks
  - Keep monthly for X months
- **Auto-cleanup Toggle**: Automatically delete old backups per retention policy

#### Storage Configuration
- **Multi-provider Support** with easy toggle/configuration:
  - Local filesystem (development/small deployments)
  - AWS S3 / S3-compatible (Backblaze B2, MinIO, DigitalOcean Spaces)
  - Google Cloud Storage
  - Azure Blob Storage
  - Firebase Storage (native integration)
- **Per-provider Settings**:
  - Credentials (securely stored)
  - Bucket/container name
  - Path prefix
  - Encryption settings
  - Region selection

---

### 2. Node.js Backend Services

#### Backup Service (`/lib/services/backup-service.ts`)

```typescript
interface BackupConfig {
  type: 'full' | 'incremental' | 'collections';
  collections?: string[]; // Specific collections to backup
  compression: 'gzip' | 'zip' | 'none';
  encryption: boolean;
  encryptionKey?: string;
}

interface BackupResult {
  id: string;
  timestamp: Date;
  type: string;
  size: number;
  duration: number;
  collections: string[];
  storageLocations: string[];
  checksum: string;
  status: 'success' | 'failed' | 'partial';
  error?: string;
}

class BackupService {
  // Core backup methods
  async createBackup(config: BackupConfig): Promise<BackupResult>;
  async restoreBackup(backupId: string, options: RestoreOptions): Promise<RestoreResult>;
  
  // Collection-level operations
  async exportCollection(collectionName: string): Promise<Buffer>;
  async importCollection(collectionName: string, data: Buffer): Promise<void>;
  
  // Storage operations
  async uploadToStorage(provider: StorageProvider, data: Buffer): Promise<string>;
  async downloadFromStorage(provider: StorageProvider, path: string): Promise<Buffer>;
  
  // Scheduling
  async scheduleBackup(schedule: BackupSchedule): Promise<void>;
  async cancelScheduledBackup(scheduleId: string): Promise<void>;
  
  // Utilities
  async listBackups(filters?: BackupFilters): Promise<BackupMetadata[]>;
  async deleteBackup(backupId: string): Promise<void>;
  async verifyBackup(backupId: string): Promise<VerificationResult>;
}
```

#### Storage Providers (`/lib/services/storage-providers/`)

Create modular storage provider implementations:

```typescript
interface StorageProvider {
  name: string;
  upload(data: Buffer, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  list(prefix?: string): Promise<StorageObject[]>;
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
}

// Implementations
class LocalStorageProvider implements StorageProvider { }
class S3StorageProvider implements StorageProvider { }
class GCSStorageProvider implements StorageProvider { }
class AzureBlobProvider implements StorageProvider { }
class FirebaseStorageProvider implements StorageProvider { }
```

#### Scheduler Service (`/lib/services/backup-scheduler.ts`)

```typescript
interface BackupSchedule {
  id: string;
  name: string;
  cronExpression: string;
  timezone: string;
  backupConfig: BackupConfig;
  storageProviders: string[];
  enabled: boolean;
  retentionPolicy: RetentionPolicy;
  notifications: NotificationConfig;
}

class BackupScheduler {
  async createSchedule(schedule: BackupSchedule): Promise<void>;
  async updateSchedule(id: string, updates: Partial<BackupSchedule>): Promise<void>;
  async deleteSchedule(id: string): Promise<void>;
  async listSchedules(): Promise<BackupSchedule[]>;
  async runScheduledBackup(scheduleId: string): Promise<BackupResult>;
  async applyRetentionPolicy(scheduleId: string): Promise<void>;
}
```

---

### 3. API Endpoints

#### Backup Operations
```
POST   /api/admin/backups              - Create new backup
GET    /api/admin/backups              - List all backups
GET    /api/admin/backups/:id          - Get backup details
DELETE /api/admin/backups/:id          - Delete backup
POST   /api/admin/backups/:id/restore  - Restore from backup
GET    /api/admin/backups/:id/download - Download backup file
POST   /api/admin/backups/:id/verify   - Verify backup integrity
```

#### Schedule Management
```
POST   /api/admin/backup-schedules           - Create schedule
GET    /api/admin/backup-schedules           - List schedules
PUT    /api/admin/backup-schedules/:id       - Update schedule
DELETE /api/admin/backup-schedules/:id       - Delete schedule
POST   /api/admin/backup-schedules/:id/run   - Manually trigger scheduled backup
```

#### Storage Configuration
```
GET    /api/admin/backup-storage             - List configured providers
POST   /api/admin/backup-storage             - Add storage provider
PUT    /api/admin/backup-storage/:id         - Update provider config
DELETE /api/admin/backup-storage/:id         - Remove provider
POST   /api/admin/backup-storage/:id/test    - Test provider connection
```

---

### 4. Data Models (Firestore Schema)

```typescript
// Collection: backupMetadata
interface BackupMetadataDoc {
  id: string;
  createdAt: Timestamp;
  completedAt: Timestamp;
  type: 'full' | 'incremental' | 'collections';
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'partial';
  size: number; // bytes
  compressedSize: number;
  duration: number; // milliseconds
  collections: string[];
  documentCounts: Record<string, number>;
  storageLocations: {
    provider: string;
    path: string;
    url?: string;
  }[];
  checksum: string;
  encryptionEnabled: boolean;
  triggeredBy: 'manual' | 'scheduled';
  scheduleId?: string;
  error?: string;
  metadata: Record<string, any>;
}

// Collection: backupSchedules
interface BackupScheduleDoc {
  id: string;
  name: string;
  description?: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  backupType: 'full' | 'incremental' | 'collections';
  collections?: string[];
  storageProviders: string[];
  compression: 'gzip' | 'zip' | 'none';
  encryption: boolean;
  retentionPolicy: {
    keepLast: number;
    keepDailyFor: number; // days
    keepWeeklyFor: number; // weeks
    keepMonthlyFor: number; // months
  };
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    emails: string[];
  };
  lastRunAt?: Timestamp;
  nextRunAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// Collection: storageProviders
interface StorageProviderDoc {
  id: string;
  name: string;
  type: 'local' | 's3' | 'gcs' | 'azure' | 'firebase';
  enabled: boolean;
  isDefault: boolean;
  config: {
    // S3
    bucket?: string;
    region?: string;
    accessKeyId?: string; // encrypted
    secretAccessKey?: string; // encrypted
    endpoint?: string; // for S3-compatible
    
    // GCS
    projectId?: string;
    keyFile?: string; // encrypted JSON
    
    // Azure
    connectionString?: string; // encrypted
    containerName?: string;
    
    // Local
    basePath?: string;
    
    // Firebase
    storageBucket?: string;
  };
  pathPrefix: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### 5. Security Requirements

- **Encryption at Rest**: AES-256 encryption for backup files
- **Encryption in Transit**: TLS for all storage provider communications
- **Access Control**: Admin-only access with audit logging
- **Credential Storage**: Use environment variables or secure vault for provider credentials
- **Backup Verification**: SHA-256 checksums for integrity verification
- **Audit Trail**: Log all backup/restore operations with user, timestamp, and details

---

### 6. UI Components Needed

```
/components/admin/backups/
├── BackupDashboard.tsx          - Main dashboard layout
├── BackupStatusCard.tsx         - Current backup status widget
├── BackupHistoryTable.tsx       - List of past backups
├── BackupScheduleForm.tsx       - Create/edit schedule form
├── StorageProviderCard.tsx      - Storage provider configuration
├── RestoreDialog.tsx            - Restore confirmation dialog
├── BackupProgressIndicator.tsx  - Real-time backup progress
├── RetentionPolicyForm.tsx      - Retention settings form
└── StorageUsageChart.tsx        - Visual storage consumption
```

---

### 7. Notifications & Alerts

- **Email Notifications**: On backup success/failure (configurable)
- **In-App Notifications**: Toast notifications for manual operations
- **Dashboard Alerts**: Warning when storage is running low
- **Failure Alerts**: Immediate notification on backup failure

---

### 8. Implementation Phases

#### Phase 1: Core Infrastructure
- [ ] Backup service with Firestore export
- [ ] Local storage provider
- [ ] Basic admin UI with manual backup/restore
- [ ] Backup history and metadata storage

#### Phase 2: Cloud Storage
- [ ] S3 storage provider
- [ ] Firebase Storage provider
- [ ] Storage provider configuration UI
- [ ] Multi-provider backup support

#### Phase 3: Scheduling & Automation
- [ ] Cron-based scheduler (node-cron or similar)
- [ ] Schedule management UI
- [ ] Retention policy enforcement
- [ ] Automated cleanup

#### Phase 4: Advanced Features
- [ ] Incremental backups
- [ ] Point-in-time restore
- [ ] Backup encryption
- [ ] Email notifications
- [ ] Backup verification/integrity checks

---

### 9. Dependencies

```json
{
  "dependencies": {
    "node-cron": "^3.0.0",
    "@aws-sdk/client-s3": "^3.0.0",
    "@google-cloud/storage": "^7.0.0",
    "@azure/storage-blob": "^12.0.0",
    "archiver": "^6.0.0",
    "unzipper": "^0.10.0",
    "crypto-js": "^4.0.0"
  }
}
```

---

### 10. Example Usage Flow

#### Manual Backup
1. Admin navigates to `/portal/admin/backups`
2. Clicks "Create Backup" button
3. Selects backup type (full/incremental/specific collections)
4. Chooses storage destination(s)
5. Optionally enables encryption
6. Clicks "Start Backup"
7. Progress indicator shows real-time status
8. On completion, backup appears in history table

#### Scheduled Backup
1. Admin goes to "Schedules" tab
2. Clicks "New Schedule"
3. Configures:
   - Name: "Daily Full Backup"
   - Schedule: Daily at 2:00 AM EST
   - Type: Full backup
   - Storage: S3 + Firebase Storage
   - Retention: Keep 7 daily, 4 weekly, 3 monthly
   - Notifications: Email on failure
4. Saves schedule
5. System automatically runs backups per schedule

#### Restore Process
1. Admin selects backup from history
2. Clicks "Restore" button
3. Confirmation dialog shows:
   - Backup details (date, size, collections)
   - Warning about data overwrite
   - Option for selective restore (specific collections)
4. Admin confirms with password/2FA
5. System performs restore with progress indicator
6. Success notification with summary

---

### 11. Error Handling

- **Retry Logic**: Automatic retry (3x) for transient failures
- **Partial Backup Handling**: Continue with remaining collections if one fails
- **Rollback on Restore Failure**: Automatic rollback if restore fails mid-process
- **Detailed Error Logging**: Full stack traces in logs, user-friendly messages in UI

---

### 12. Testing Requirements

- Unit tests for backup/restore logic
- Integration tests for each storage provider
- E2E tests for UI workflows
- Load testing for large dataset backups
- Recovery testing (simulate failures and verify restore)

---

## Success Criteria

1. ✅ Admin can create manual backups with one click
2. ✅ Backups can be scheduled with flexible cron expressions
3. ✅ Multiple storage providers can be configured and used simultaneously
4. ✅ Restore process is straightforward with clear confirmation steps
5. ✅ Retention policies automatically clean up old backups
6. ✅ All operations are logged for audit purposes
7. ✅ System handles failures gracefully with notifications
8. ✅ Backup integrity can be verified at any time

---

## Notes for Implementation

- Use Firebase Admin SDK for server-side Firestore operations
- Consider using a job queue (Bull/BullMQ) for long-running backup operations
- Implement progress streaming via Server-Sent Events or WebSockets
- Store sensitive credentials encrypted, never in plain text
- Add rate limiting to prevent abuse of backup endpoints
- Consider backup size limits based on plan/tier
