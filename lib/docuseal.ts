/**
 * DocuSeal Integration Service
 * 
 * Provides integration with DocuSeal for electronic document signing:
 * - Template management
 * - Document submission and signing
 * - Submitter management
 * - Webhook handling for signature events
 * 
 * API Documentation: https://www.docuseal.co/docs/api
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DocuSealConfig {
  apiKey: string;
  baseUrl?: string;
}

// Template Types
export interface DocuSealTemplate {
  id: number;
  slug: string;
  name: string;
  schema: DocuSealField[];
  fields: DocuSealField[];
  submitters: DocuSealSubmitterRole[];
  author_id: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  source: string;
  folder_id: number | null;
  folder_name: string | null;
  external_id: string | null;
  preferences: Record<string, unknown>;
  documents: DocuSealDocument[];
}

export interface DocuSealField {
  name: string;
  type: 'text' | 'signature' | 'initials' | 'date' | 'checkbox' | 'radio' | 'select' | 'cells' | 'stamp' | 'image' | 'file' | 'payment';
  required?: boolean;
  readonly?: boolean;
  default_value?: string;
  validation?: {
    pattern?: string;
    message?: string;
  };
  options?: string[];
  areas?: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    page: number;
  }>;
}

export interface DocuSealSubmitterRole {
  name: string;
  uuid: string;
}

export interface DocuSealDocument {
  id: number;
  uuid: string;
  url: string;
  preview_image_url: string;
  filename: string;
}

// Submission Types
export interface DocuSealSubmission {
  id: number;
  source: string;
  submitters_order: string;
  slug: string;
  audit_log_url: string;
  combined_document_url: string | null;
  expire_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  status: 'pending' | 'completed' | 'expired' | 'archived';
  template: {
    id: number;
    name: string;
    external_id: string | null;
    folder_name: string | null;
    created_at: string;
    updated_at: string;
  };
  submitters: DocuSealSubmitter[];
  documents: DocuSealSubmissionDocument[];
}

export interface DocuSealSubmitter {
  id: number;
  submission_id: number;
  uuid: string;
  email: string;
  slug: string;
  sent_at: string | null;
  opened_at: string | null;
  completed_at: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
  name: string | null;
  phone: string | null;
  status: 'pending' | 'sent' | 'opened' | 'completed' | 'declined';
  external_id: string | null;
  metadata: Record<string, unknown>;
  preferences: Record<string, unknown>;
  role: string;
  embed_src: string;
  values: DocuSealFieldValue[];
  documents: DocuSealSubmissionDocument[];
}

export interface DocuSealFieldValue {
  field: string;
  value: string | boolean | null;
}

export interface DocuSealSubmissionDocument {
  name: string;
  url: string;
}

// Create Submission Request
export interface CreateSubmissionRequest {
  template_id: number;
  send_email?: boolean;
  send_sms?: boolean;
  order?: 'preserved' | 'random';
  completed_redirect_url?: string;
  bcc_completed?: string;
  reply_to?: string;
  expire_at?: string;
  message?: {
    subject?: string;
    body?: string;
  };
  submitters: Array<{
    role?: string;
    email: string;
    name?: string;
    phone?: string;
    external_id?: string;
    completed_redirect_url?: string;
    send_email?: boolean;
    send_sms?: boolean;
    metadata?: Record<string, unknown>;
    fields?: Array<{
      name: string;
      default_value?: string;
      readonly?: boolean;
      validation?: {
        pattern?: string;
        message?: string;
      };
    }>;
  }>;
}

// Webhook Event Types
export interface DocuSealWebhookEvent {
  event_type: 'form.viewed' | 'form.started' | 'form.completed' | 'submission.created' | 'submission.completed' | 'submission.archived';
  timestamp: string;
  data: {
    id: number;
    submission_id?: number;
    email?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    documents?: DocuSealSubmissionDocument[];
    audit_log_url?: string;
    submitters?: DocuSealSubmitter[];
  };
}

// API Response wrapper
interface DocuSealResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class DocuSealService {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: DocuSealConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.docuseal.co';
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown,
    params?: Record<string, string>
  ): Promise<DocuSealResponse<T>> {
    try {
      let url = `${this.baseUrl}${endpoint}`;
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'X-Auth-Token': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as { error?: string }).error 
          || `HTTP ${response.status}: ${response.statusText}`;
        
        console.error(`DocuSeal API Error [${method} ${endpoint}]:`, errorMessage);
        
        return { success: false, error: errorMessage };
      }

      if (response.status === 204) {
        return { success: true };
      }

      const responseData = await response.json();
      return { success: true, data: responseData as T };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`DocuSeal API Error [${method} ${endpoint}]:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  /**
   * List all templates
   */
  async getTemplates(options?: {
    limit?: number;
    offset?: number;
    q?: string;
    folder_id?: number;
    archived?: boolean;
    external_id?: string;
  }): Promise<DocuSealResponse<{ data: DocuSealTemplate[]; pagination: { count: number; next: number; prev: number } }>> {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.offset) params.offset = options.offset.toString();
    if (options?.q) params.q = options.q;
    if (options?.folder_id) params.folder_id = options.folder_id.toString();
    if (options?.archived !== undefined) params.archived = options.archived.toString();
    if (options?.external_id) params.external_id = options.external_id;

    return this.request('GET', '/templates', undefined, params);
  }

  /**
   * Get a single template
   */
  async getTemplate(id: number): Promise<DocuSealResponse<DocuSealTemplate>> {
    return this.request('GET', `/templates/${id}`);
  }

  /**
   * Create a template from PDF
   */
  async createTemplateFromPdf(
    name: string,
    documents: Array<{ name: string; file: string }>, // base64 encoded
    options?: {
      folder_id?: number;
      external_id?: string;
    }
  ): Promise<DocuSealResponse<DocuSealTemplate>> {
    return this.request('POST', '/templates/pdf', {
      name,
      documents,
      ...options,
    });
  }

  /**
   * Create a template from DOCX
   */
  async createTemplateFromDocx(
    name: string,
    documents: Array<{ name: string; file: string }>, // base64 encoded
    options?: {
      folder_id?: number;
      external_id?: string;
    }
  ): Promise<DocuSealResponse<DocuSealTemplate>> {
    return this.request('POST', '/templates/docx', {
      name,
      documents,
      ...options,
    });
  }

  /**
   * Create a template from HTML
   */
  async createTemplateFromHtml(
    name: string,
    html: string,
    options?: {
      folder_id?: number;
      external_id?: string;
    }
  ): Promise<DocuSealResponse<DocuSealTemplate>> {
    return this.request('POST', '/templates/html', {
      name,
      html,
      ...options,
    });
  }

  /**
   * Clone a template
   */
  async cloneTemplate(
    id: number,
    name?: string,
    folder_id?: number,
    external_id?: string
  ): Promise<DocuSealResponse<DocuSealTemplate>> {
    return this.request('POST', `/templates/${id}/clone`, {
      name,
      folder_id,
      external_id,
    });
  }

  /**
   * Update a template
   */
  async updateTemplate(
    id: number,
    updates: {
      name?: string;
      folder_id?: number;
      external_id?: string;
      archived_at?: string | null;
    }
  ): Promise<DocuSealResponse<DocuSealTemplate>> {
    return this.request('PUT', `/templates/${id}`, updates);
  }

  /**
   * Archive a template
   */
  async archiveTemplate(id: number): Promise<DocuSealResponse<DocuSealTemplate>> {
    return this.request('DELETE', `/templates/${id}`);
  }

  // ==========================================================================
  // SUBMISSIONS
  // ==========================================================================

  /**
   * List all submissions
   */
  async getSubmissions(options?: {
    limit?: number;
    offset?: number;
    template_id?: number;
    template_folder?: string;
    q?: string;
    status?: 'pending' | 'completed' | 'expired' | 'archived';
  }): Promise<DocuSealResponse<{ data: DocuSealSubmission[]; pagination: { count: number; next: number; prev: number } }>> {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.offset) params.offset = options.offset.toString();
    if (options?.template_id) params.template_id = options.template_id.toString();
    if (options?.template_folder) params.template_folder = options.template_folder;
    if (options?.q) params.q = options.q;
    if (options?.status) params.status = options.status;

    return this.request('GET', '/submissions', undefined, params);
  }

  /**
   * Get a single submission
   */
  async getSubmission(id: number): Promise<DocuSealResponse<DocuSealSubmission>> {
    return this.request('GET', `/submissions/${id}`);
  }

  /**
   * Create a new submission
   */
  async createSubmission(request: CreateSubmissionRequest): Promise<DocuSealResponse<DocuSealSubmitter[]>> {
    return this.request('POST', '/submissions', request);
  }

  /**
   * Create submission from email
   */
  async createSubmissionFromEmail(
    template_id: number,
    emails: string[],
    options?: {
      send_email?: boolean;
      message?: { subject?: string; body?: string };
    }
  ): Promise<DocuSealResponse<DocuSealSubmitter[]>> {
    return this.request('POST', '/submissions/emails', {
      template_id,
      emails: emails.join(', '),
      ...options,
    });
  }

  /**
   * Archive a submission
   */
  async archiveSubmission(id: number): Promise<DocuSealResponse<DocuSealSubmission>> {
    return this.request('DELETE', `/submissions/${id}`);
  }

  // ==========================================================================
  // SUBMITTERS
  // ==========================================================================

  /**
   * List all submitters
   */
  async getSubmitters(options?: {
    limit?: number;
    offset?: number;
    submission_id?: number;
    q?: string;
    completed_after?: string;
    completed_before?: string;
    external_id?: string;
  }): Promise<DocuSealResponse<{ data: DocuSealSubmitter[]; pagination: { count: number; next: number; prev: number } }>> {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = options.limit.toString();
    if (options?.offset) params.offset = options.offset.toString();
    if (options?.submission_id) params.submission_id = options.submission_id.toString();
    if (options?.q) params.q = options.q;
    if (options?.completed_after) params.completed_after = options.completed_after;
    if (options?.completed_before) params.completed_before = options.completed_before;
    if (options?.external_id) params.external_id = options.external_id;

    return this.request('GET', '/submitters', undefined, params);
  }

  /**
   * Get a single submitter
   */
  async getSubmitter(id: number): Promise<DocuSealResponse<DocuSealSubmitter>> {
    return this.request('GET', `/submitters/${id}`);
  }

  /**
   * Update a submitter
   */
  async updateSubmitter(
    id: number,
    updates: {
      email?: string;
      name?: string;
      phone?: string;
      external_id?: string;
      send_email?: boolean;
      send_sms?: boolean;
      completed_redirect_url?: string;
      metadata?: Record<string, unknown>;
      fields?: Array<{
        name: string;
        default_value?: string;
        readonly?: boolean;
      }>;
    }
  ): Promise<DocuSealResponse<DocuSealSubmitter>> {
    return this.request('PUT', `/submitters/${id}`, updates);
  }

  // ==========================================================================
  // EMBED
  // ==========================================================================

  /**
   * Get embed URL for a submitter
   */
  getEmbedUrl(submitter: DocuSealSubmitter): string {
    return submitter.embed_src;
  }

  /**
   * Generate signing link for a submitter
   */
  getSigningLink(submitterSlug: string): string {
    return `https://docuseal.co/s/${submitterSlug}`;
  }

  // ==========================================================================
  // WEBHOOKS
  // ==========================================================================

  /**
   * Verify webhook signature (if using signed webhooks)
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // DocuSeal uses HMAC-SHA256 for webhook signatures
    // Implementation depends on your crypto library
    // This is a placeholder - implement based on your needs
    console.log('Webhook verification:', { payload, signature, secret });
    return true;
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(body: unknown): DocuSealWebhookEvent | null {
    try {
      return body as DocuSealWebhookEvent;
    } catch {
      return null;
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createDocuSealService(config: DocuSealConfig): DocuSealService {
  return new DocuSealService(config);
}

let defaultService: DocuSealService | null = null;

export function getDefaultDocuSealService(): DocuSealService | null {
  if (defaultService) return defaultService;

  const apiKey = process.env.DOCUSEAL_API_KEY;
  if (!apiKey) return null;

  defaultService = new DocuSealService({ apiKey });
  return defaultService;
}

// ============================================================================
// ADAMS-SPECIFIC HELPERS
// ============================================================================

/**
 * Create a supplier qualification agreement submission
 */
export async function createSupplierQualificationSubmission(
  service: DocuSealService,
  templateId: number,
  supplier: {
    email: string;
    name: string;
    companyName: string;
    phone?: string;
  },
  adamsRepresentative: {
    email: string;
    name: string;
  }
): Promise<DocuSealResponse<DocuSealSubmitter[]>> {
  return service.createSubmission({
    template_id: templateId,
    send_email: true,
    order: 'preserved',
    message: {
      subject: `Supplier Qualification Agreement - ${supplier.companyName}`,
      body: `Dear ${supplier.name},\n\nPlease review and sign the attached Supplier Qualification Agreement for ${supplier.companyName}.\n\nIf you have any questions, please contact us.\n\nBest regards,\nAdams Electric`,
    },
    submitters: [
      {
        role: 'Supplier',
        email: supplier.email,
        name: supplier.name,
        phone: supplier.phone,
        metadata: {
          company_name: supplier.companyName,
          type: 'supplier',
        },
        fields: [
          { name: 'company_name', default_value: supplier.companyName, readonly: true },
          { name: 'supplier_name', default_value: supplier.name },
        ],
      },
      {
        role: 'Adams Representative',
        email: adamsRepresentative.email,
        name: adamsRepresentative.name,
        metadata: {
          type: 'adams_representative',
        },
      },
    ],
  });
}

/**
 * Create an OEM engagement agreement submission
 */
export async function createOEMEngagementSubmission(
  service: DocuSealService,
  templateId: number,
  oem: {
    email: string;
    name: string;
    companyName: string;
    title?: string;
  },
  adamsRepresentative: {
    email: string;
    name: string;
  },
  engagementDetails: {
    projectName: string;
    startDate: string;
    value?: number;
  }
): Promise<DocuSealResponse<DocuSealSubmitter[]>> {
  return service.createSubmission({
    template_id: templateId,
    send_email: true,
    order: 'preserved',
    message: {
      subject: `Engagement Agreement - ${engagementDetails.projectName}`,
      body: `Dear ${oem.name},\n\nPlease review and sign the attached Engagement Agreement for ${engagementDetails.projectName}.\n\nProject Start Date: ${engagementDetails.startDate}\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\nAdams Electric`,
    },
    submitters: [
      {
        role: 'Client',
        email: oem.email,
        name: oem.name,
        metadata: {
          company_name: oem.companyName,
          title: oem.title,
          project_name: engagementDetails.projectName,
          type: 'oem_client',
        },
        fields: [
          { name: 'client_company', default_value: oem.companyName, readonly: true },
          { name: 'client_name', default_value: oem.name },
          { name: 'client_title', default_value: oem.title || '' },
          { name: 'project_name', default_value: engagementDetails.projectName, readonly: true },
          { name: 'start_date', default_value: engagementDetails.startDate, readonly: true },
        ],
      },
      {
        role: 'Adams Representative',
        email: adamsRepresentative.email,
        name: adamsRepresentative.name,
        metadata: {
          type: 'adams_representative',
        },
      },
    ],
  });
}

/**
 * Create an NDA submission
 */
export async function createNDASubmission(
  service: DocuSealService,
  templateId: number,
  party: {
    email: string;
    name: string;
    companyName: string;
    title?: string;
  },
  adamsRepresentative: {
    email: string;
    name: string;
  }
): Promise<DocuSealResponse<DocuSealSubmitter[]>> {
  return service.createSubmission({
    template_id: templateId,
    send_email: true,
    order: 'preserved',
    message: {
      subject: `Non-Disclosure Agreement - ${party.companyName}`,
      body: `Dear ${party.name},\n\nPlease review and sign the attached Non-Disclosure Agreement.\n\nThis NDA protects confidential information shared between our organizations.\n\nBest regards,\nAdams Electric`,
    },
    submitters: [
      {
        role: 'Receiving Party',
        email: party.email,
        name: party.name,
        metadata: {
          company_name: party.companyName,
          title: party.title,
          type: 'receiving_party',
        },
        fields: [
          { name: 'party_company', default_value: party.companyName, readonly: true },
          { name: 'party_name', default_value: party.name },
          { name: 'party_title', default_value: party.title || '' },
        ],
      },
      {
        role: 'Disclosing Party (Adams)',
        email: adamsRepresentative.email,
        name: adamsRepresentative.name,
        metadata: {
          type: 'adams_representative',
        },
      },
    ],
  });
}
