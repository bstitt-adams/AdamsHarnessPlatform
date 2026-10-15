/**
 * GoHighLevel Migration Utility
 * 
 * Provides comprehensive migration capabilities to transfer content
 * from one GoHighLevel instance to another.
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GhlCredentials {
  sourceApiKey: string;
  sourceLocationId: string;
  targetApiKey: string;
  targetLocationId: string;
}

export interface MigrationOptions {
  contentTypes: GhlContentType[];
  dryRun?: boolean;
  preserveIds?: boolean;
  skipDuplicates?: boolean;
  transformData?: boolean;
}

export type GhlContentType = 
  | 'contacts'
  | 'opportunities'
  | 'pipelines'
  | 'workflows'
  | 'campaigns'
  | 'templates'
  | 'forms'
  | 'surveys'
  | 'calendars'
  | 'users'
  | 'tags'
  | 'customFields'
  | 'tasks'
  | 'appointments'
  | 'conversations';

export interface MigrationResult {
  success: boolean;
  contentType: GhlContentType;
  sourceCount: number;
  migratedCount: number;
  failedCount: number;
  errors: MigrationError[];
  idMappings: Record<string, string>; // sourceId -> targetId
}

export interface MigrationError {
  itemId: string;
  itemName: string;
  error: string;
  context?: Record<string, unknown>;
}

export interface MigrationReport {
  timestamp: string;
  credentials: Omit<GhlCredentials, 'sourceApiKey' | 'targetApiKey'>;
  options: MigrationOptions;
  results: MigrationResult[];
  summary: {
    totalSourceItems: number;
    totalMigrated: number;
    totalFailed: number;
    duration: number;
  };
}

// ============================================================================
// API CONFIGURATION
// ============================================================================

const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';
const GHL_API_V2_BASE = 'https://api.msgsndr.com';

function createHeaders(apiKey: string, locationId: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(locationId && { 'Location-Id': locationId }),
  };
}

// ============================================================================
// CORE MIGRATION CLASS
// ============================================================================

export class GhlMigrationService {
  private credentials: GhlCredentials;
  private options: MigrationOptions;
  private logs: string[] = [];

  constructor(credentials: GhlCredentials, options: MigrationOptions) {
    this.credentials = credentials;
    this.options = {
      dryRun: false,
      preserveIds: false,
      skipDuplicates: true,
      transformData: true,
      ...options,
    };
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown,
    useV2 = false,
    isTarget = false
  ): Promise<unknown> {
    const baseUrl = useV2 ? GHL_API_V2_BASE : GHL_API_BASE;
    const apiKey = isTarget ? this.credentials.targetApiKey : this.credentials.sourceApiKey;
    const locationId = isTarget ? this.credentials.targetLocationId : this.credentials.sourceLocationId;

    const url = `${baseUrl}${endpoint}`;
    
    this.log(`API ${method}: ${url}`);

    const requestInit: RequestInit = {
      method,
      headers: createHeaders(apiKey, locationId),
    };
    
    if (body) {
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestInit);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    
    return response.text();
  }

  // ============================================================================
  // CONTACTS MIGRATION
  // ============================================================================

  async migrateContacts(): Promise<MigrationResult> {
    this.log('Starting Contacts migration...');
    
    const result: MigrationResult = {
      success: true,
      contentType: 'contacts',
      sourceCount: 0,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      idMappings: {},
    };

    try {
      // Fetch contacts from source
      const contactsResponse = await this.makeRequest('/contacts?limit=100') as { contacts: GhlContact[] };
      const contacts = contactsResponse.contacts || [];
      
      result.sourceCount = contacts.length;
      this.log(`Found ${contacts.length} contacts to migrate`);

      if (this.options.dryRun) {
        this.log(`[DRY RUN] Would migrate ${contacts.length} contacts`);
        return result;
      }

      // Migrate each contact
      for (const contact of contacts) {
        try {
          const migratedContact = await this.migrateSingleContact(contact);
          result.migratedCount++;
          result.idMappings[contact.id] = migratedContact.id;
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            itemId: contact.id,
            itemName: `${contact.firstName} ${contact.lastName}`.trim() || 'Unnamed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.log(`Contacts migration complete: ${result.migratedCount} migrated, ${result.failedCount} failed`);
    } catch (error) {
      result.success = false;
      result.errors.push({
        itemId: 'fetch',
        itemName: 'Fetch Contacts',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  private async migrateSingleContact(contact: GhlContact): Promise<GhlContact> {
    // Transform contact data for target
    const contactData = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      address1: contact.address1,
      city: contact.city,
      state: contact.state,
      country: contact.country,
      postalCode: contact.postalCode,
      companyName: contact.companyName,
      website: contact.website,
      tags: contact.tags,
      customField: contact.customField,
      // Don't migrate: id, locationId, dateAdded, dateUpdated, assignedTo
    };

    const response = await this.makeRequest(
      '/contacts/',
      'POST',
      contactData,
      false,
      true
    ) as { contact: GhlContact };

    return response.contact;
  }

  // ============================================================================
  // PIPELINES & OPPORTUNITIES MIGRATION
  // ============================================================================

  async migratePipelines(): Promise<MigrationResult> {
    this.log('Starting Pipelines migration...');
    
    const result: MigrationResult = {
      success: true,
      contentType: 'pipelines',
      sourceCount: 0,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      idMappings: {},
    };

    try {
      // Fetch pipelines
      const pipelinesResponse = await this.makeRequest('/pipelines/') as { pipelines: GhlPipeline[] };
      const pipelines = pipelinesResponse.pipelines || [];
      
      result.sourceCount = pipelines.length;
      this.log(`Found ${pipelines.length} pipelines to migrate`);

      if (this.options.dryRun) {
        return result;
      }

      for (const pipeline of pipelines) {
        try {
          const migratedPipeline = await this.migrateSinglePipeline(pipeline);
          result.migratedCount++;
          result.idMappings[pipeline.id] = migratedPipeline.id;
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            itemId: pipeline.id,
            itemName: pipeline.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        itemId: 'fetch',
        itemName: 'Fetch Pipelines',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  private async migrateSinglePipeline(pipeline: GhlPipeline): Promise<GhlPipeline> {
    const pipelineData = {
      name: pipeline.name,
      stages: pipeline.stages.map(stage => ({
        name: stage.name,
        showInFunnel: stage.showInFunnel,
        showInPieChart: stage.showInPieChart,
      })),
    };

    const response = await this.makeRequest(
      '/pipelines/',
      'POST',
      pipelineData,
      false,
      true
    ) as { pipeline: GhlPipeline };

    return response.pipeline;
  }

  // ============================================================================
  // WORKFLOWS MIGRATION
  // ============================================================================

  async migrateWorkflows(): Promise<MigrationResult> {
    this.log('Starting Workflows migration...');
    
    const result: MigrationResult = {
      success: true,
      contentType: 'workflows',
      sourceCount: 0,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      idMappings: {},
    };

    try {
      // Fetch workflows
      const workflowsResponse = await this.makeRequest('/workflows/') as { workflows: GhlWorkflow[] };
      const workflows = workflowsResponse.workflows || [];
      
      result.sourceCount = workflows.length;
      this.log(`Found ${workflows.length} workflows to migrate`);

      if (this.options.dryRun) {
        return result;
      }

      for (const workflow of workflows) {
        try {
          const migratedWorkflow = await this.migrateSingleWorkflow(workflow);
          result.migratedCount++;
          result.idMappings[workflow.id] = migratedWorkflow.id;
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            itemId: workflow.id,
            itemName: workflow.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        itemId: 'fetch',
        itemName: 'Fetch Workflows',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  private async migrateSingleWorkflow(workflow: GhlWorkflow): Promise<GhlWorkflow> {
    // Note: This is a simplified version. Real workflow migration is complex
    // due to internal references that need to be remapped.
    const workflowData = {
      name: workflow.name,
      status: 'draft', // Always start as draft for safety
      type: workflow.type,
    };

    const response = await this.makeRequest(
      '/workflows/',
      'POST',
      workflowData,
      false,
      true
    ) as { workflow: GhlWorkflow };

    return response.workflow;
  }

  // ============================================================================
  // TEMPLATES MIGRATION
  // ============================================================================

  async migrateTemplates(): Promise<MigrationResult> {
    this.log('Starting Templates migration...');
    
    const result: MigrationResult = {
      success: true,
      contentType: 'templates',
      sourceCount: 0,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      idMappings: {},
    };

    const templateTypes = ['email', 'sms', 'call'];

    for (const type of templateTypes) {
      try {
        const templatesResponse = await this.makeRequest(`/templates/?type=${type}`) as { templates: GhlTemplate[] };
        const templates = templatesResponse.templates || [];
        
        result.sourceCount += templates.length;
        this.log(`Found ${templates.length} ${type} templates`);

        if (this.options.dryRun) continue;

        for (const template of templates) {
          try {
            const migratedTemplate = await this.migrateSingleTemplate(template);
            result.migratedCount++;
            result.idMappings[template.id] = migratedTemplate.id;
          } catch (error) {
            result.failedCount++;
            result.errors.push({
              itemId: template.id,
              itemName: template.name,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      } catch (error) {
        result.errors.push({
          itemId: `fetch-${type}`,
          itemName: `Fetch ${type} Templates`,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  private async migrateSingleTemplate(template: GhlTemplate): Promise<GhlTemplate> {
    const templateData = {
      name: template.name,
      type: template.type,
      html: template.html,
      text: template.text,
      subject: template.subject,
      attachments: template.attachments,
    };

    const response = await this.makeRequest(
      '/templates/',
      'POST',
      templateData,
      false,
      true
    ) as { template: GhlTemplate };

    return response.template;
  }

  // ============================================================================
  // CUSTOM FIELDS MIGRATION
  // ============================================================================

  async migrateCustomFields(): Promise<MigrationResult> {
    this.log('Starting Custom Fields migration...');
    
    const result: MigrationResult = {
      success: true,
      contentType: 'customFields',
      sourceCount: 0,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      idMappings: {},
    };

    try {
      // Fetch custom fields
      const fieldsResponse = await this.makeRequest('/custom-fields/') as { customFields: GhlCustomField[] };
      const fields = fieldsResponse.customFields || [];
      
      result.sourceCount = fields.length;
      this.log(`Found ${fields.length} custom fields to migrate`);

      if (this.options.dryRun) {
        return result;
      }

      for (const field of fields) {
        try {
          const migratedField = await this.migrateSingleCustomField(field);
          result.migratedCount++;
          result.idMappings[field.id] = migratedField.id;
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            itemId: field.id,
            itemName: field.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        itemId: 'fetch',
        itemName: 'Fetch Custom Fields',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  private async migrateSingleCustomField(field: GhlCustomField): Promise<GhlCustomField> {
    const fieldData = {
      name: field.name,
      fieldKey: field.fieldKey,
      placeholder: field.placeholder,
      dataType: field.dataType,
      picklistOptions: field.picklistOptions,
    };

    const response = await this.makeRequest(
      '/custom-fields/',
      'POST',
      fieldData,
      false,
      true
    ) as { customField: GhlCustomField };

    return response.customField;
  }

  // ============================================================================
  // TAGS MIGRATION
  // ============================================================================

  async migrateTags(): Promise<MigrationResult> {
    this.log('Starting Tags migration...');
    
    const result: MigrationResult = {
      success: true,
      contentType: 'tags',
      sourceCount: 0,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      idMappings: {},
    };

    try {
      // Fetch tags
      const tagsResponse = await this.makeRequest('/tags/') as { tags: GhlTag[] };
      const tags = tagsResponse.tags || [];
      
      result.sourceCount = tags.length;
      this.log(`Found ${tags.length} tags to migrate`);

      if (this.options.dryRun) {
        return result;
      }

      for (const tag of tags) {
        try {
          const migratedTag = await this.migrateSingleTag(tag);
          result.migratedCount++;
          result.idMappings[tag.id] = migratedTag.id;
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            itemId: tag.id,
            itemName: tag.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        itemId: 'fetch',
        itemName: 'Fetch Tags',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  private async migrateSingleTag(tag: GhlTag): Promise<GhlTag> {
    const tagData = {
      name: tag.name,
      description: tag.description,
      color: tag.color,
    };

    const response = await this.makeRequest(
      '/tags/',
      'POST',
      tagData,
      false,
      true
    ) as { tag: GhlTag };

    return response.tag;
  }

  // ============================================================================
  // MAIN MIGRATION RUNNER
  // ============================================================================

  async runMigration(): Promise<MigrationReport> {
    const startTime = Date.now();
    this.log('=== Starting GoHighLevel Migration ===');
    this.log(`Content types: ${this.options.contentTypes.join(', ')}`);
    this.log(`Dry run: ${this.options.dryRun}`);

    const results: MigrationResult[] = [];

    // Run migrations in order of dependencies
    const migrationOrder: GhlContentType[] = [
      'tags',
      'customFields',
      'users',
      'pipelines',
      'templates',
      'contacts',
      'opportunities',
      'workflows',
      'forms',
      'calendars',
      'tasks',
    ];

    for (const contentType of migrationOrder) {
      if (!this.options.contentTypes.includes(contentType)) {
        continue;
      }

      let result: MigrationResult;

      switch (contentType) {
        case 'contacts':
          result = await this.migrateContacts();
          break;
        case 'pipelines':
          result = await this.migratePipelines();
          break;
        case 'workflows':
          result = await this.migrateWorkflows();
          break;
        case 'templates':
          result = await this.migrateTemplates();
          break;
        case 'customFields':
          result = await this.migrateCustomFields();
          break;
        case 'tags':
          result = await this.migrateTags();
          break;
        default:
          result = {
            success: false,
            contentType,
            sourceCount: 0,
            migratedCount: 0,
            failedCount: 0,
            errors: [{
              itemId: 'not-implemented',
              itemName: contentType,
              error: 'Migration not yet implemented for this content type',
            }],
            idMappings: {},
          };
      }

      results.push(result);
    }

    const duration = Date.now() - startTime;
    const summary = {
      totalSourceItems: results.reduce((sum, r) => sum + r.sourceCount, 0),
      totalMigrated: results.reduce((sum, r) => sum + r.migratedCount, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failedCount, 0),
      duration,
    };

    this.log('=== Migration Complete ===');
    this.log(`Total: ${summary.totalSourceItems} source items`);
    this.log(`Migrated: ${summary.totalMigrated}`);
    this.log(`Failed: ${summary.totalFailed}`);
    this.log(`Duration: ${duration}ms`);

    return {
      timestamp: new Date().toISOString(),
      credentials: {
        sourceLocationId: this.credentials.sourceLocationId,
        targetLocationId: this.credentials.targetLocationId,
      },
      options: this.options,
      results,
      summary,
    };
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  exportLogs(): string {
    return this.logs.join('\n');
  }
}

// ============================================================================
// GHL DATA TYPES (simplified)
// ============================================================================

interface GhlContact {
  id: string;
  locationId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  companyName?: string;
  website?: string;
  tags?: string[];
  customField?: Record<string, unknown>;
  dateAdded?: string;
  dateUpdated?: string;
  assignedTo?: string;
}

interface GhlPipeline {
  id: string;
  name: string;
  stages: {
    id: string;
    name: string;
    showInFunnel: boolean;
    showInPieChart: boolean;
  }[];
}

interface GhlWorkflow {
  id: string;
  name: string;
  status: string;
  type: string;
}

interface GhlTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'call';
  html?: string;
  text?: string;
  subject?: string;
  attachments?: unknown[];
}

interface GhlCustomField {
  id: string;
  name: string;
  fieldKey: string;
  placeholder?: string;
  dataType: string;
  picklistOptions?: string[];
}

interface GhlTag {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function validateCredentials(credentials: GhlCredentials): string[] {
  const errors: string[] = [];

  if (!credentials.sourceApiKey) errors.push('Source API key is required');
  if (!credentials.sourceLocationId) errors.push('Source Location ID is required');
  if (!credentials.targetApiKey) errors.push('Target API key is required');
  if (!credentials.targetLocationId) errors.push('Target Location ID is required');

  if (credentials.sourceApiKey === credentials.targetApiKey) {
    errors.push('Source and target API keys should be different');
  }

  return errors;
}

export async function testConnection(credentials: GhlCredentials, isTarget = false): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = GHL_API_BASE;
    const apiKey = isTarget ? credentials.targetApiKey : credentials.sourceApiKey;
    const locationId = isTarget ? credentials.targetLocationId : credentials.sourceLocationId;

    const response = await fetch(`${baseUrl}/contacts?limit=1`, {
      headers: createHeaders(apiKey, locationId),
    });

    if (response.ok) {
      return { success: true };
    }

    const errorText = await response.text();
    return { success: false, error: `HTTP ${response.status}: ${errorText}` };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export function generateMigrationReport(report: MigrationReport): string {
  const lines = [
    '# GoHighLevel Migration Report',
    '',
    `**Generated:** ${report.timestamp}`,
    `**Duration:** ${report.summary.duration}ms`,
    '',
    '## Summary',
    '',
    `- **Total Source Items:** ${report.summary.totalSourceItems}`,
    `- **Successfully Migrated:** ${report.summary.totalMigrated}`,
    `- **Failed:** ${report.summary.totalFailed}`,
    '',
    '## Results by Content Type',
    '',
  ];

  for (const result of report.results) {
    const status = result.success ? '✅' : '❌';
    lines.push(`### ${status} ${result.contentType}`);
    lines.push(`- Source: ${result.sourceCount}`);
    lines.push(`- Migrated: ${result.migratedCount}`);
    lines.push(`- Failed: ${result.failedCount}`);
    
    if (result.errors.length > 0) {
      lines.push('');
      lines.push('**Errors:**');
      for (const error of result.errors.slice(0, 5)) {
        lines.push(`- ${error.itemName}: ${error.error}`);
      }
      if (result.errors.length > 5) {
        lines.push(`- ... and ${result.errors.length - 5} more errors`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

// Export all content types for easy reference
export const ALL_GHL_CONTENT_TYPES: GhlContentType[] = [
  'contacts',
  'opportunities',
  'pipelines',
  'workflows',
  'campaigns',
  'templates',
  'forms',
  'surveys',
  'calendars',
  'users',
  'tags',
  'customFields',
  'tasks',
  'appointments',
];
