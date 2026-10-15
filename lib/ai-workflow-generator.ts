/**
 * AI Workflow Generator for GoHighLevel
 * 
 * Converts plain language descriptions into GHL workflow structures
 * using OpenAI GPT-4 for intelligent workflow generation.
 * 
 * Features:
 * - Template-based generation (welcome, nurture, event reminder, etc.)
 * - Free-form description to workflow conversion
 * - Workflow to plain language conversion (reverse)
 * - Conversational workflow building
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowRequest {
  description: string;
  type: 'email' | 'sms' | 'mixed' | 'nurture' | 'automation';
  industry?: string;
  customization?: string;
}

export interface WorkflowStep {
  type: 'email' | 'sms' | 'wait' | 'condition' | 'tag' | 'webhook' | 'internal_notification';
  delay?: number; // hours
  delayUnit?: 'minutes' | 'hours' | 'days';
  subject?: string; // for email
  content: string;
  condition?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: string;
  };
  tags?: string[];
  webhookUrl?: string;
  notifyEmail?: string;
}

export interface GeneratedWorkflow {
  name: string;
  description: string;
  trigger: {
    type: 'manual' | 'form_submission' | 'tag_added' | 'tag_removed' | 'opportunity_created' | 'opportunity_status_changed' | 'contact_created' | 'appointment_booked' | 'invoice_paid';
    config?: {
      formId?: string;
      tagName?: string;
      pipelineId?: string;
      stageId?: string;
    };
  };
  steps: WorkflowStep[];
  estimatedDuration?: string;
  tags?: string[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'onboarding' | 'nurture' | 'sales' | 'support' | 'event' | 'reengagement';
  defaultPrompt: string;
  suggestedType: WorkflowRequest['type'];
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ============================================================================
// TEMPLATES
// ============================================================================

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Series',
    description: 'Onboard new contacts with a warm welcome sequence',
    category: 'onboarding',
    defaultPrompt: 'Create a welcome series for new contacts with 3 emails over 5 days introducing our company and services',
    suggestedType: 'email',
  },
  {
    id: 'lead_nurture',
    name: 'Lead Nurture',
    description: '7-day sequence to nurture leads toward conversion',
    category: 'nurture',
    defaultPrompt: 'Create a 7-day lead nurturing sequence with educational content and soft CTAs',
    suggestedType: 'mixed',
  },
  {
    id: 'abandoned_cart',
    name: 'Abandoned Cart Recovery',
    description: 'Recover abandoned carts with timely reminders',
    category: 'sales',
    defaultPrompt: 'Create an abandoned cart recovery sequence with 3 reminders over 48 hours',
    suggestedType: 'mixed',
  },
  {
    id: 'event_reminder',
    name: 'Event Reminder',
    description: 'Remind attendees about upcoming events',
    category: 'event',
    defaultPrompt: 'Create an event reminder sequence with confirmations 1 week before, 1 day before, and 1 hour before',
    suggestedType: 'mixed',
  },
  {
    id: 'appointment_followup',
    name: 'Appointment Follow-up',
    description: 'Follow up after appointments with next steps',
    category: 'sales',
    defaultPrompt: 'Create a post-appointment follow-up sequence with thank you, recap, and next steps',
    suggestedType: 'email',
  },
  {
    id: 'onboarding',
    name: 'Customer Onboarding',
    description: 'Guide new customers through getting started',
    category: 'onboarding',
    defaultPrompt: 'Create a customer onboarding sequence over 14 days with setup guides and check-ins',
    suggestedType: 'email',
  },
  {
    id: 're_engagement',
    name: 'Re-engagement Campaign',
    description: 'Win back inactive contacts',
    category: 'reengagement',
    defaultPrompt: 'Create a re-engagement campaign for contacts inactive for 90 days with special offers',
    suggestedType: 'mixed',
  },
  {
    id: 'review_request',
    name: 'Review Request',
    description: 'Request reviews from satisfied customers',
    category: 'support',
    defaultPrompt: 'Create a review request sequence sent 7 days after purchase with follow-up reminder',
    suggestedType: 'email',
  },
  // ADAMS-Specific Templates
  {
    id: 'supplier_qualification',
    name: 'Supplier Qualification',
    description: 'Guide suppliers through the qualification process',
    category: 'onboarding',
    defaultPrompt: 'Create a supplier qualification workflow with document requests, assessment scheduling, and status updates over 30 days',
    suggestedType: 'email',
  },
  {
    id: 'oem_prospect',
    name: 'OEM Prospect Nurture',
    description: 'Nurture OEM decision makers through the sales cycle',
    category: 'nurture',
    defaultPrompt: 'Create an OEM prospect nurture sequence for supply chain leaders with case studies, ROI calculators, and discovery call invitations over 21 days',
    suggestedType: 'email',
  },
  {
    id: 'certification_reminder',
    name: 'Certification Reminder',
    description: 'Remind about upcoming certification deadlines',
    category: 'event',
    defaultPrompt: 'Create a certification deadline reminder sequence starting 90 days before expiration with escalating urgency',
    suggestedType: 'mixed',
  },
];

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const WORKFLOW_GENERATION_PROMPT = `You are an expert marketing automation specialist for GoHighLevel (GHL). Your task is to convert plain language descriptions into structured workflow configurations.

IMPORTANT RULES:
1. Always return valid JSON matching the GeneratedWorkflow interface
2. Include personalization tokens like {{contact.first_name}}, {{contact.email}}, {{contact.company}}
3. Use realistic delays between steps (not too aggressive)
4. Include appropriate subject lines for emails
5. Make content professional but personable
6. Add relevant tags for segmentation
7. Consider the industry context if provided

WORKFLOW STRUCTURE:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "trigger": {
    "type": "manual|form_submission|tag_added|contact_created|etc",
    "config": { optional trigger configuration }
  },
  "steps": [
    {
      "type": "email|sms|wait|condition|tag|webhook|internal_notification",
      "delay": number (optional, in hours),
      "delayUnit": "minutes|hours|days" (optional),
      "subject": "Email subject" (for emails),
      "content": "Message content with {{personalization}}",
      "condition": { optional condition object },
      "tags": ["tag1", "tag2"] (for tag steps)
    }
  ],
  "estimatedDuration": "e.g., 7 days",
  "tags": ["workflow-tag"]
}

STEP TYPES:
- email: Send an email (requires subject and content)
- sms: Send SMS (requires content, keep under 160 chars)
- wait: Delay before next step (requires delay and delayUnit)
- condition: Branch based on contact data
- tag: Add or remove tags
- webhook: Call external URL
- internal_notification: Notify team member`;

const WORKFLOW_CONVERSION_PROMPT = `You are an expert at analyzing GoHighLevel workflows and converting them to plain language descriptions.

Given a GHL workflow JSON structure, provide:
1. A clear, concise summary of what the workflow does
2. The trigger that starts the workflow
3. A step-by-step breakdown of the automation
4. The estimated duration from start to finish
5. Suggestions for improvement

Format your response as a readable explanation that a non-technical person could understand.`;

// ============================================================================
// AI WORKFLOW GENERATOR CLASS
// ============================================================================

export class AIWorkflowGenerator {
  private openAIKey: string;
  private model: string;

  constructor(openAIKey?: string, model: string = 'gpt-4') {
    this.openAIKey = openAIKey || process.env.OPENAI_API_KEY || '';
    this.model = model;
  }

  /**
   * Generate a workflow from a plain language description
   */
  async generateWorkflow(request: WorkflowRequest): Promise<GeneratedWorkflow> {
    if (!this.openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    const industryContext = request.industry 
      ? `Industry context: ${request.industry}. ` 
      : '';
    
    const customization = request.customization 
      ? `Additional requirements: ${request.customization}. ` 
      : '';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: WORKFLOW_GENERATION_PROMPT,
          },
          {
            role: 'user',
            content: `Create a ${request.type} workflow: "${request.description}". ${industryContext}${customization}`,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content) as GeneratedWorkflow;
  }

  /**
   * Generate a workflow from a predefined template
   */
  async generateFromTemplate(
    templateId: string,
    customization?: string
  ): Promise<GeneratedWorkflow> {
    const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const description = customization
      ? `${template.defaultPrompt}. Additional: ${customization}`
      : template.defaultPrompt;

    return this.generateWorkflow({
      description,
      type: template.suggestedType,
    });
  }

  /**
   * Convert an existing GHL workflow to plain language description
   */
  async convertToPlainLanguage(workflowJson: object): Promise<string> {
    if (!this.openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: WORKFLOW_CONVERSION_PROMPT,
          },
          {
            role: 'user',
            content: `Analyze this GoHighLevel workflow and explain it in plain language:\n\n${JSON.stringify(workflowJson, null, 2)}`,
          },
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Unable to analyze workflow';
  }

  /**
   * Conversational workflow builder - maintains context across messages
   */
  async conversationalBuild(
    messages: ConversationMessage[],
    currentWorkflow?: GeneratedWorkflow
  ): Promise<{ response: string; workflow?: GeneratedWorkflow }> {
    if (!this.openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemMessage = `${WORKFLOW_GENERATION_PROMPT}

You are having a conversation to help build a workflow. The user may ask questions, request changes, or provide additional details.

Current workflow state:
${currentWorkflow ? JSON.stringify(currentWorkflow, null, 2) : 'No workflow created yet'}

If the user's message results in a workflow update, include the updated workflow JSON in your response wrapped in <workflow> tags like:
<workflow>
{...workflow JSON...}
</workflow>

Otherwise, just respond conversationally to help them refine their requirements.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemMessage },
          ...messages,
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Extract workflow if present
    const workflowMatch = content.match(/<workflow>([\s\S]*?)<\/workflow>/);
    let workflow: GeneratedWorkflow | undefined;
    let responseText = content;

    if (workflowMatch) {
      try {
        workflow = JSON.parse(workflowMatch[1].trim());
        responseText = content.replace(/<workflow>[\s\S]*?<\/workflow>/, '').trim();
      } catch {
        // Failed to parse workflow, just return the text
      }
    }

    return { response: responseText, workflow };
  }

  /**
   * Suggest improvements for an existing workflow
   */
  async suggestImprovements(workflow: GeneratedWorkflow): Promise<string[]> {
    if (!this.openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a marketing automation expert. Analyze the workflow and suggest 3-5 specific improvements. Return as a JSON array of strings.',
          },
          {
            role: 'user',
            content: `Suggest improvements for this workflow:\n\n${JSON.stringify(workflow, null, 2)}`,
          },
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return [];
    }

    const parsed = JSON.parse(content);
    return parsed.suggestions || parsed.improvements || [];
  }
}

// ============================================================================
// FACTORY & DEFAULT INSTANCE
// ============================================================================

export function createAIWorkflowGenerator(openAIKey?: string): AIWorkflowGenerator {
  return new AIWorkflowGenerator(openAIKey);
}

// Default instance
let defaultGenerator: AIWorkflowGenerator | null = null;

export function getDefaultAIWorkflowGenerator(): AIWorkflowGenerator {
  if (!defaultGenerator) {
    defaultGenerator = new AIWorkflowGenerator();
  }
  return defaultGenerator;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert GeneratedWorkflow to GHL-compatible format
 */
export function convertToGHLFormat(workflow: GeneratedWorkflow): object {
  return {
    name: workflow.name,
    description: workflow.description,
    status: 'draft',
    trigger: {
      type: workflow.trigger.type,
      ...workflow.trigger.config,
    },
    actions: workflow.steps.map((step, index) => ({
      id: `step_${index + 1}`,
      type: step.type,
      delay: step.delay ? {
        value: step.delay,
        unit: step.delayUnit || 'hours',
      } : undefined,
      config: {
        subject: step.subject,
        body: step.content,
        tags: step.tags,
        condition: step.condition,
        webhookUrl: step.webhookUrl,
        notifyEmail: step.notifyEmail,
      },
    })),
  };
}

/**
 * Validate a generated workflow structure
 */
export function validateWorkflow(workflow: GeneratedWorkflow): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!workflow.name) errors.push('Workflow name is required');
  if (!workflow.trigger?.type) errors.push('Trigger type is required');
  if (!workflow.steps || workflow.steps.length === 0) errors.push('At least one step is required');

  workflow.steps?.forEach((step, index) => {
    if (!step.type) errors.push(`Step ${index + 1}: type is required`);
    if (step.type === 'email' && !step.subject) errors.push(`Step ${index + 1}: email requires subject`);
    if ((step.type === 'email' || step.type === 'sms') && !step.content) {
      errors.push(`Step ${index + 1}: content is required`);
    }
  });

  return { valid: errors.length === 0, errors };
}
