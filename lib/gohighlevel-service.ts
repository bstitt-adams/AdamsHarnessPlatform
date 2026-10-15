/**
 * GoHighLevel Service Class
 * 
 * Full-featured GHL API wrapper with support for:
 * - Multi-integration management
 * - Contacts, Opportunities, Pipelines
 * - Workflows, Campaigns
 * - Conversations, Messaging
 * - Calendars
 * 
 * API Documentation: https://highlevel.stoplight.io/docs/integrations
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GHLServiceConfig {
  apiToken: string;
  locationId: string;
  agencyId?: string;
}

export interface GHLContact {
  id?: string;
  locationId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  website?: string;
  tags?: string[];
  source?: string;
  customFields?: Array<{ id: string; value: string }>;
  dnd?: boolean;
  dateOfBirth?: string;
}

export interface GHLOpportunity {
  id?: string;
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  contactId: string;
  monetaryValue?: number;
  assignedTo?: string;
  source?: string;
  customFields?: Array<{ id: string; value: string }>;
}

export interface GHLPipeline {
  id: string;
  name: string;
  stages: Array<{
    id: string;
    name: string;
    position: number;
  }>;
}

export interface GHLWorkflow {
  id: string;
  name: string;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface GHLCampaign {
  id?: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
}

export interface GHLConversation {
  id: string;
  contactId: string;
  locationId: string;
  lastMessageBody: string;
  lastMessageDate: string;
  type: string;
  unreadCount: number;
}

export interface GHLMessage {
  id?: string;
  type: 'Email' | 'SMS' | 'WhatsApp' | 'GMB' | 'IG' | 'FB' | 'Custom';
  contactId: string;
  locationId?: string;
  message?: string;
  html?: string;
  subject?: string;
  emailFrom?: string;
  attachments?: string[];
}

export interface GHLCalendar {
  id: string;
  name: string;
  description?: string;
  locationId: string;
}

export interface GHLCalendarEvent {
  id?: string;
  calendarId: string;
  locationId?: string;
  contactId?: string;
  title: string;
  appointmentStatus?: string;
  assignedUserId?: string;
  address?: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface GHLCustomField {
  id: string;
  name: string;
  fieldKey: string;
  dataType: string;
  position: number;
}

export interface GHLTag {
  id: string;
  name: string;
  locationId: string;
}

export interface GHLUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
}

// API Response wrapper
interface GHLResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class GoHighLevelService {
  private baseUrl = 'https://services.leadconnectorhq.com';
  private apiToken: string;
  private locationId: string;
  private agencyId?: string;
  private rateLimitRemaining: number = 100;
  private rateLimitReset: number = 0;

  constructor(config: GHLServiceConfig) {
    this.apiToken = config.apiToken;
    this.locationId = config.locationId;
    this.agencyId = config.agencyId;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: unknown,
    params?: Record<string, string>
  ): Promise<GHLResponse<T>> {
    try {
      // Build URL with query params
      let url = `${this.baseUrl}${endpoint}`;
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      // Track rate limits from headers
      const rateLimitHeader = response.headers.get('x-ratelimit-remaining');
      const rateLimitResetHeader = response.headers.get('x-ratelimit-reset');
      if (rateLimitHeader) this.rateLimitRemaining = parseInt(rateLimitHeader);
      if (rateLimitResetHeader) this.rateLimitReset = parseInt(rateLimitResetHeader);

      if (response.status === 429) {
        console.warn('GHL Rate limit exceeded');
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          rateLimitRemaining: this.rateLimitRemaining,
          rateLimitReset: this.rateLimitReset,
        };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as { message?: string; error?: string }).message 
          || (errorData as { message?: string; error?: string }).error 
          || `HTTP ${response.status}: ${response.statusText}`;
        
        console.error(`GHL API Error [${method} ${endpoint}]:`, errorMessage);
        
        return {
          success: false,
          error: errorMessage,
          rateLimitRemaining: this.rateLimitRemaining,
          rateLimitReset: this.rateLimitReset,
        };
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {
          success: true,
          rateLimitRemaining: this.rateLimitRemaining,
          rateLimitReset: this.rateLimitReset,
        };
      }

      const responseData = await response.json();
      return {
        success: true,
        data: responseData as T,
        rateLimitRemaining: this.rateLimitRemaining,
        rateLimitReset: this.rateLimitReset,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`GHL API Error [${method} ${endpoint}]:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
        rateLimitRemaining: this.rateLimitRemaining,
        rateLimitReset: this.rateLimitReset,
      };
    }
  }

  // ==========================================================================
  // CONNECTION TEST
  // ==========================================================================

  async testConnection(): Promise<GHLResponse<{ locationName: string; locationId: string }>> {
    const result = await this.request<{ location: { name: string; id: string } }>(
      'GET',
      `/locations/${this.locationId}`
    );

    if (result.success && result.data) {
      return {
        success: true,
        data: {
          locationName: result.data.location.name,
          locationId: result.data.location.id,
        },
      };
    }

    return { success: false, error: result.error };
  }

  // ==========================================================================
  // CONTACTS
  // ==========================================================================

  async getContacts(limit: number = 100, skip: number = 0): Promise<GHLResponse<{ contacts: GHLContact[] }>> {
    return this.request('GET', '/contacts/', undefined, {
      locationId: this.locationId,
      limit: limit.toString(),
      skip: skip.toString(),
    });
  }

  async getContact(contactId: string): Promise<GHLResponse<{ contact: GHLContact }>> {
    return this.request('GET', `/contacts/${contactId}`);
  }

  async createContact(contact: GHLContact): Promise<GHLResponse<{ contact: GHLContact }>> {
    return this.request('POST', '/contacts/', {
      ...contact,
      locationId: this.locationId,
    });
  }

  async updateContact(contactId: string, contact: Partial<GHLContact>): Promise<GHLResponse<{ contact: GHLContact }>> {
    return this.request('PUT', `/contacts/${contactId}`, contact);
  }

  async upsertContact(contact: GHLContact): Promise<GHLResponse<{ contact: GHLContact }>> {
    return this.request('POST', '/contacts/upsert', {
      ...contact,
      locationId: this.locationId,
    });
  }

  async deleteContact(contactId: string): Promise<GHLResponse<{ success: boolean }>> {
    return this.request('DELETE', `/contacts/${contactId}`);
  }

  async lookupContact(email?: string, phone?: string): Promise<GHLResponse<{ contacts: GHLContact[] }>> {
    const params: Record<string, string> = { locationId: this.locationId };
    if (email) params.email = email;
    if (phone) params.phone = phone;
    return this.request('GET', '/contacts/lookup', undefined, params);
  }

  async addTagsToContact(contactId: string, tags: string[]): Promise<GHLResponse<{ tags: string[] }>> {
    return this.request('POST', `/contacts/${contactId}/tags`, { tags });
  }

  async removeTagsFromContact(contactId: string, tags: string[]): Promise<GHLResponse<{ tags: string[] }>> {
    return this.request('DELETE', `/contacts/${contactId}/tags`, { tags });
  }

  // ==========================================================================
  // OPPORTUNITIES
  // ==========================================================================

  async getOpportunities(pipelineId?: string): Promise<GHLResponse<{ opportunities: GHLOpportunity[] }>> {
    const params: Record<string, string> = { locationId: this.locationId };
    if (pipelineId) params.pipelineId = pipelineId;
    return this.request('GET', '/opportunities/search', undefined, params);
  }

  async getOpportunity(opportunityId: string): Promise<GHLResponse<{ opportunity: GHLOpportunity }>> {
    return this.request('GET', `/opportunities/${opportunityId}`);
  }

  async createOpportunity(opportunity: GHLOpportunity): Promise<GHLResponse<{ opportunity: GHLOpportunity }>> {
    return this.request('POST', '/opportunities/', opportunity);
  }

  async updateOpportunity(opportunityId: string, opportunity: Partial<GHLOpportunity>): Promise<GHLResponse<{ opportunity: GHLOpportunity }>> {
    return this.request('PUT', `/opportunities/${opportunityId}`, opportunity);
  }

  async updateOpportunityStatus(opportunityId: string, status: GHLOpportunity['status']): Promise<GHLResponse<{ opportunity: GHLOpportunity }>> {
    return this.request('PUT', `/opportunities/${opportunityId}/status`, { status });
  }

  async deleteOpportunity(opportunityId: string): Promise<GHLResponse<{ success: boolean }>> {
    return this.request('DELETE', `/opportunities/${opportunityId}`);
  }

  // ==========================================================================
  // PIPELINES
  // ==========================================================================

  async getPipelines(): Promise<GHLResponse<{ pipelines: GHLPipeline[] }>> {
    return this.request('GET', '/opportunities/pipelines', undefined, {
      locationId: this.locationId,
    });
  }

  // ==========================================================================
  // WORKFLOWS
  // ==========================================================================

  async getWorkflows(): Promise<GHLResponse<{ workflows: GHLWorkflow[] }>> {
    return this.request('GET', '/workflows/', undefined, {
      locationId: this.locationId,
    });
  }

  async triggerWorkflow(workflowId: string, contactId: string): Promise<GHLResponse<{ success: boolean }>> {
    return this.request('POST', `/workflows/${workflowId}/trigger`, {
      contactId,
    });
  }

  // ==========================================================================
  // CAMPAIGNS
  // ==========================================================================

  async getCampaigns(): Promise<GHLResponse<{ campaigns: GHLCampaign[] }>> {
    return this.request('GET', '/campaigns/', undefined, {
      locationId: this.locationId,
    });
  }

  // ==========================================================================
  // CONVERSATIONS & MESSAGING
  // ==========================================================================

  async getConversations(limit: number = 20): Promise<GHLResponse<{ conversations: GHLConversation[] }>> {
    return this.request('GET', '/conversations/search', undefined, {
      locationId: this.locationId,
      limit: limit.toString(),
    });
  }

  async getConversation(conversationId: string): Promise<GHLResponse<{ conversation: GHLConversation }>> {
    return this.request('GET', `/conversations/${conversationId}`);
  }

  async getConversationMessages(conversationId: string): Promise<GHLResponse<{ messages: GHLMessage[] }>> {
    return this.request('GET', `/conversations/${conversationId}/messages`);
  }

  async sendMessage(message: GHLMessage): Promise<GHLResponse<{ message: GHLMessage }>> {
    return this.request('POST', '/conversations/messages', {
      ...message,
      locationId: this.locationId,
    });
  }

  async sendEmail(contactId: string, subject: string, html: string, from?: string): Promise<GHLResponse<{ message: GHLMessage }>> {
    return this.sendMessage({
      type: 'Email',
      contactId,
      subject,
      html,
      emailFrom: from || process.env.GOHIGHLEVEL_FROM_EMAIL,
    });
  }

  async sendSMS(contactId: string, message: string): Promise<GHLResponse<{ message: GHLMessage }>> {
    return this.sendMessage({
      type: 'SMS',
      contactId,
      message,
    });
  }

  // ==========================================================================
  // CALENDARS
  // ==========================================================================

  async getCalendars(): Promise<GHLResponse<{ calendars: GHLCalendar[] }>> {
    return this.request('GET', '/calendars/', undefined, {
      locationId: this.locationId,
    });
  }

  async getCalendarEvents(calendarId: string, startTime: string, endTime: string): Promise<GHLResponse<{ events: GHLCalendarEvent[] }>> {
    // GHL API v2 uses /calendars/events endpoint
    return this.request('GET', `/calendars/events`, undefined, {
      locationId: this.locationId,
      calendarId,
      startTime,
      endTime,
    });
  }

  /**
   * Get appointments for a specific contact
   */
  async getContactAppointments(contactId: string): Promise<GHLResponse<{ events: GHLCalendarEvent[] }>> {
    return this.request('GET', `/contacts/${contactId}/appointments`);
  }

  async createCalendarEvent(event: GHLCalendarEvent): Promise<GHLResponse<{ event: GHLCalendarEvent }>> {
    return this.request('POST', `/calendars/events`, {
      ...event,
      locationId: this.locationId,
    });
  }

  async updateCalendarEvent(eventId: string, event: Partial<GHLCalendarEvent>): Promise<GHLResponse<{ event: GHLCalendarEvent }>> {
    return this.request('PUT', `/calendars/events/${eventId}`, event);
  }

  async deleteCalendarEvent(eventId: string): Promise<GHLResponse<{ success: boolean }>> {
    return this.request('DELETE', `/calendars/events/${eventId}`);
  }

  // ==========================================================================
  // CUSTOM FIELDS
  // ==========================================================================

  async getCustomFields(): Promise<GHLResponse<{ customFields: GHLCustomField[] }>> {
    return this.request('GET', '/locations/customFields', undefined, {
      locationId: this.locationId,
    });
  }

  // ==========================================================================
  // TAGS
  // ==========================================================================

  async getTags(): Promise<GHLResponse<{ tags: GHLTag[] }>> {
    return this.request('GET', '/locations/tags', undefined, {
      locationId: this.locationId,
    });
  }

  async createTag(name: string): Promise<GHLResponse<{ tag: GHLTag }>> {
    return this.request('POST', '/locations/tags', {
      name,
      locationId: this.locationId,
    });
  }

  // ==========================================================================
  // USERS
  // ==========================================================================

  async getUsers(): Promise<GHLResponse<{ users: GHLUser[] }>> {
    return this.request('GET', '/users/', undefined, {
      locationId: this.locationId,
    });
  }

  // ==========================================================================
  // RATE LIMIT INFO
  // ==========================================================================

  getRateLimitInfo(): { remaining: number; resetAt: number } {
    return {
      remaining: this.rateLimitRemaining,
      resetAt: this.rateLimitReset,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createGHLService(config: GHLServiceConfig): GoHighLevelService {
  return new GoHighLevelService(config);
}

// Default instance from environment variables
let defaultService: GoHighLevelService | null = null;

export function getDefaultGHLService(): GoHighLevelService | null {
  if (defaultService) return defaultService;

  const apiToken = process.env.GOHIGHLEVEL_API_KEY;
  const locationId = process.env.GOHIGHLEVEL_LOCATION_ID;

  if (!apiToken || !locationId) {
    return null;
  }

  defaultService = new GoHighLevelService({ apiToken, locationId });
  return defaultService;
}
