/**
 * GoHighLevel Integration Service
 * 
 * Provides integration with GoHighLevel CRM for:
 * - Syncing Traction Rocks to GHL campaigns/opportunities
 * - Creating tasks from To-Dos
 * - Triggering workflows based on Traction events
 * - Syncing team members as users/contacts
 * 
 * API Documentation: https://highlevel.stoplight.io/docs/integrations
 */

// GHL API Types
export interface GHLConfig {
  apiKey: string;
  locationId: string;
  baseUrl?: string;
}

export interface GHLContact {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, string>;
  source?: string;
}

export interface GHLOpportunity {
  id?: string;
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  status: "open" | "won" | "lost" | "abandoned";
  contactId?: string;
  monetaryValue?: number;
  assignedTo?: string;
  customFields?: Record<string, string>;
}

export interface GHLTask {
  id?: string;
  title: string;
  body?: string;
  dueDate: string;
  assignedTo?: string;
  contactId?: string;
  completed?: boolean;
}

export interface GHLWorkflowTrigger {
  workflowId: string;
  contactId?: string;
  customData?: Record<string, unknown>;
}

export interface GHLCalendarEvent {
  calendarId: string;
  title: string;
  startTime: string;
  endTime: string;
  contactId?: string;
  assignedUserId?: string;
  notes?: string;
}

// API Response types
interface GHLApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * GoHighLevel API Client
 */
export class GoHighLevelClient {
  private apiKey: string;
  private locationId: string;
  private baseUrl: string;

  constructor(config: GHLConfig) {
    this.apiKey = config.apiKey;
    this.locationId = config.locationId;
    this.baseUrl = config.baseUrl || "https://services.leadconnectorhq.com";
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: unknown
  ): Promise<GHLApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Version": "2021-07-28",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `API Error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // =========================================================================
  // CONTACTS
  // =========================================================================

  async createContact(contact: GHLContact): Promise<GHLApiResponse<GHLContact>> {
    return this.request<GHLContact>(`/contacts/`, "POST", {
      ...contact,
      locationId: this.locationId,
    });
  }

  async updateContact(id: string, contact: Partial<GHLContact>): Promise<GHLApiResponse<GHLContact>> {
    return this.request<GHLContact>(`/contacts/${id}`, "PUT", contact);
  }

  async getContact(id: string): Promise<GHLApiResponse<GHLContact>> {
    return this.request<GHLContact>(`/contacts/${id}`);
  }

  async searchContacts(query: string): Promise<GHLApiResponse<GHLContact[]>> {
    return this.request<GHLContact[]>(
      `/contacts/search?locationId=${this.locationId}&query=${encodeURIComponent(query)}`
    );
  }

  async addTagToContact(contactId: string, tags: string[]): Promise<GHLApiResponse<void>> {
    return this.request<void>(`/contacts/${contactId}/tags`, "POST", { tags });
  }

  // =========================================================================
  // OPPORTUNITIES
  // =========================================================================

  async createOpportunity(opportunity: GHLOpportunity): Promise<GHLApiResponse<GHLOpportunity>> {
    return this.request<GHLOpportunity>(`/opportunities/`, "POST", opportunity);
  }

  async updateOpportunity(id: string, opportunity: Partial<GHLOpportunity>): Promise<GHLApiResponse<GHLOpportunity>> {
    return this.request<GHLOpportunity>(`/opportunities/${id}`, "PUT", opportunity);
  }

  async getOpportunity(id: string): Promise<GHLApiResponse<GHLOpportunity>> {
    return this.request<GHLOpportunity>(`/opportunities/${id}`);
  }

  async updateOpportunityStatus(
    id: string,
    status: GHLOpportunity["status"]
  ): Promise<GHLApiResponse<GHLOpportunity>> {
    return this.request<GHLOpportunity>(`/opportunities/${id}/status`, "PUT", { status });
  }

  // =========================================================================
  // TASKS
  // =========================================================================

  async createTask(task: GHLTask): Promise<GHLApiResponse<GHLTask>> {
    return this.request<GHLTask>(`/contacts/${task.contactId}/tasks`, "POST", task);
  }

  async updateTask(contactId: string, taskId: string, task: Partial<GHLTask>): Promise<GHLApiResponse<GHLTask>> {
    return this.request<GHLTask>(`/contacts/${contactId}/tasks/${taskId}`, "PUT", task);
  }

  async completeTask(contactId: string, taskId: string): Promise<GHLApiResponse<GHLTask>> {
    return this.request<GHLTask>(`/contacts/${contactId}/tasks/${taskId}`, "PUT", { completed: true });
  }

  // =========================================================================
  // WORKFLOWS
  // =========================================================================

  async triggerWorkflow(trigger: GHLWorkflowTrigger): Promise<GHLApiResponse<void>> {
    return this.request<void>(
      `/workflows/${trigger.workflowId}/trigger`,
      "POST",
      {
        contactId: trigger.contactId,
        customData: trigger.customData,
      }
    );
  }

  // =========================================================================
  // CALENDAR
  // =========================================================================

  async createCalendarEvent(event: GHLCalendarEvent): Promise<GHLApiResponse<GHLCalendarEvent>> {
    return this.request<GHLCalendarEvent>(
      `/calendars/${event.calendarId}/events`,
      "POST",
      event
    );
  }

  async getCalendars(): Promise<GHLApiResponse<{ id: string; name: string }[]>> {
    return this.request<{ id: string; name: string }[]>(
      `/calendars/?locationId=${this.locationId}`
    );
  }
}

// ============================================================================
// TRACTION-TO-GHL SYNC FUNCTIONS
// ============================================================================

export interface TractionGHLMapping {
  rockPipelineId?: string;
  rockPipelineStages?: {
    onTrack: string;
    atRisk: string;
    offTrack: string;
    complete: string;
  };
  todoWorkflowId?: string;
  issueWorkflowId?: string;
  level10CalendarId?: string;
}

/**
 * Sync a Traction Rock to GHL as an Opportunity
 */
export async function syncRockToGHL(
  client: GoHighLevelClient,
  mapping: TractionGHLMapping,
  rock: {
    id: string;
    description: string;
    owner: string;
    status: string;
    progress: number;
    quarter: string;
    dueDate: string;
  }
): Promise<GHLApiResponse<GHLOpportunity>> {
  if (!mapping.rockPipelineId || !mapping.rockPipelineStages) {
    return { success: false, error: "Rock pipeline not configured" };
  }

  const stageId = mapping.rockPipelineStages[rock.status as keyof typeof mapping.rockPipelineStages];
  if (!stageId) {
    return { success: false, error: `Unknown rock status: ${rock.status}` };
  }

  const opportunity: GHLOpportunity = {
    name: `🏔️ ${rock.quarter} Rock: ${rock.description.substring(0, 100)}`,
    pipelineId: mapping.rockPipelineId,
    pipelineStageId: stageId,
    status: rock.status === "complete" ? "won" : "open",
    customFields: {
      rock_id: rock.id,
      owner: rock.owner,
      progress: rock.progress.toString(),
      quarter: rock.quarter,
      due_date: rock.dueDate,
    },
  };

  return client.createOpportunity(opportunity);
}

/**
 * Sync a Traction To-Do to GHL as a Task
 */
export async function syncTodoToGHL(
  client: GoHighLevelClient,
  contactId: string,
  todo: {
    id: string;
    description: string;
    owner: string;
    dueDate: string;
    status: string;
  }
): Promise<GHLApiResponse<GHLTask>> {
  const task: GHLTask = {
    title: `☑️ ${todo.description.substring(0, 100)}`,
    body: `Traction To-Do\nOwner: ${todo.owner}\nStatus: ${todo.status}`,
    dueDate: todo.dueDate,
    contactId,
    completed: todo.status === "complete",
  };

  return client.createTask(task);
}

/**
 * Trigger a GHL workflow when a Traction Issue is created
 */
export async function triggerIssueWorkflow(
  client: GoHighLevelClient,
  mapping: TractionGHLMapping,
  issue: {
    id: string;
    description: string;
    owner: string;
    priority: string;
    identifiedDate: string;
  }
): Promise<GHLApiResponse<void>> {
  if (!mapping.issueWorkflowId) {
    return { success: false, error: "Issue workflow not configured" };
  }

  return client.triggerWorkflow({
    workflowId: mapping.issueWorkflowId,
    customData: {
      issue_id: issue.id,
      description: issue.description,
      owner: issue.owner,
      priority: issue.priority,
      identified_date: issue.identifiedDate,
      source: "traction_dashboard",
    },
  });
}

/**
 * Create a Level 10 Meeting in GHL Calendar
 */
export async function createLevel10InGHL(
  client: GoHighLevelClient,
  mapping: TractionGHLMapping,
  meeting: {
    date: string;
    startTime: string;
    endTime: string;
    attendees: string[];
  }
): Promise<GHLApiResponse<GHLCalendarEvent>> {
  if (!mapping.level10CalendarId) {
    return { success: false, error: "Level 10 calendar not configured" };
  }

  const startDateTime = `${meeting.date}T${meeting.startTime}:00`;
  const endDateTime = `${meeting.date}T${meeting.endTime}:00`;

  const event: GHLCalendarEvent = {
    calendarId: mapping.level10CalendarId,
    title: "Level 10 Meeting",
    startTime: startDateTime,
    endTime: endDateTime,
    notes: `Weekly Level 10 Meeting\nAttendees: ${meeting.attendees.join(", ")}`,
  };

  return client.createCalendarEvent(event);
}

/**
 * Sync a Traction Team Member to GHL as a Contact
 */
export async function syncTeamMemberToGHL(
  client: GoHighLevelClient,
  member: {
    id: string;
    name: string;
    role: string;
    category: string;
    email?: string;
    phone?: string;
  }
): Promise<GHLApiResponse<GHLContact>> {
  const nameParts = member.name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const contact: GHLContact = {
    firstName,
    lastName,
    email: member.email,
    phone: member.phone,
    tags: ["traction_team", member.category],
    customFields: {
      team_member_id: member.id,
      role: member.role,
      category: member.category,
    },
    source: "Adams Traction Dashboard",
  };

  return client.createContact(contact);
}

/**
 * Get GHL client from platform settings
 */
export async function getGHLClientFromSettings(): Promise<GoHighLevelClient | null> {
  // This would typically fetch from Firestore settings
  // For now, return null if not configured
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    return null;
  }

  return new GoHighLevelClient({ apiKey, locationId });
}
