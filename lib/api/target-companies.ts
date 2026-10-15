/**
 * Target Companies API Client
 * 
 * API functions for managing target companies in Adams Electric
 */

import { createClient } from '@supabase/supabase-js';
import type { 
  TargetCompany, 
  TargetCompanyActivity, 
  TargetCompanyFilters,
  OutreachStatus,
  CompanyTier 
} from '@/types/target-company';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to convert snake_case to camelCase
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

// Helper to convert camelCase to snake_case
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

/**
 * Get all target companies with optional filters
 */
export async function getTargetCompanies(
  filters?: TargetCompanyFilters
): Promise<TargetCompany[]> {
  let query = supabase
    .from('target_companies')
    .select('*')
    .order('tier', { ascending: true })
    .order('priority_score', { ascending: false });

  if (filters) {
    if (filters.tier?.length) {
      query = query.in('tier', filters.tier);
    }
    if (filters.industry?.length) {
      query = query.in('industry', filters.industry);
    }
    if (filters.state?.length) {
      query = query.in('state', filters.state);
    }
    if (filters.city?.length) {
      query = query.in('city', filters.city);
    }
    if (filters.outreachStatus?.length) {
      query = query.in('outreach_status', filters.outreachStatus);
    }
    if (filters.growthNeedLevel?.length) {
      query = query.in('growth_need_level', filters.growthNeedLevel);
    }
    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }
    if (filters.quizCompleted !== undefined) {
      query = query.eq('quiz_completed', filters.quizCompleted);
    }
    if (filters.strategyCallScheduled !== undefined) {
      query = query.eq('strategy_call_scheduled', filters.strategyCallScheduled);
    }
    if (filters.hasFollowUpDue) {
      query = query.lte('next_follow_up_date', new Date().toISOString());
    }
    if (filters.searchQuery) {
      query = query.or(
        `company_name.ilike.%${filters.searchQuery}%,` +
        `primary_contact_name.ilike.%${filters.searchQuery}%,` +
        `decision_maker_name.ilike.%${filters.searchQuery}%`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching target companies:', error);
    throw error;
  }

  return (data || []).map(row => toCamelCase(row) as unknown as TargetCompany);
}

/**
 * Get a single target company by ID
 */
export async function getTargetCompany(id: string): Promise<TargetCompany | null> {
  const { data, error } = await supabase
    .from('target_companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching target company:', error);
    throw error;
  }

  return toCamelCase(data) as unknown as TargetCompany;
}

/**
 * Create a new target company
 */
export async function createTargetCompany(
  company: Omit<TargetCompany, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TargetCompany> {
  const snakeCaseData = toSnakeCase(company as unknown as Record<string, unknown>);

  const { data, error } = await supabase
    .from('target_companies')
    .insert(snakeCaseData)
    .select()
    .single();

  if (error) {
    console.error('Error creating target company:', error);
    throw error;
  }

  return toCamelCase(data) as unknown as TargetCompany;
}

/**
 * Update a target company
 */
export async function updateTargetCompany(
  id: string,
  updates: Partial<TargetCompany>
): Promise<TargetCompany> {
  const snakeCaseData = toSnakeCase(updates as unknown as Record<string, unknown>);

  const { data, error } = await supabase
    .from('target_companies')
    .update(snakeCaseData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating target company:', error);
    throw error;
  }

  return toCamelCase(data) as unknown as TargetCompany;
}

/**
 * Delete a target company
 */
export async function deleteTargetCompany(id: string): Promise<void> {
  const { error } = await supabase
    .from('target_companies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting target company:', error);
    throw error;
  }
}

/**
 * Update outreach status
 */
export async function updateOutreachStatus(
  id: string,
  status: OutreachStatus,
  notes?: string
): Promise<TargetCompany> {
  const updates: Partial<TargetCompany> = {
    outreachStatus: status,
    lastContactDate: new Date(),
  };

  if (notes) {
    updates.notes = notes;
  }

  // Update contact attempts for certain statuses
  if (['initial_contact', 'follow_up'].includes(status)) {
    const company = await getTargetCompany(id);
    if (company) {
      updates.contactAttempts = (company.contactAttempts || 0) + 1;
    }
  }

  // Set first contact date if this is initial contact
  if (status === 'initial_contact') {
    const company = await getTargetCompany(id);
    if (company && !company.firstContactDate) {
      updates.firstContactDate = new Date();
    }
  }

  return updateTargetCompany(id, updates);
}

/**
 * Schedule a follow-up
 */
export async function scheduleFollowUp(
  id: string,
  followUpDate: Date
): Promise<TargetCompany> {
  return updateTargetCompany(id, {
    nextFollowUpDate: followUpDate,
  });
}

/**
 * Mark quiz as completed
 */
export async function markQuizCompleted(
  id: string,
  score?: number
): Promise<TargetCompany> {
  return updateTargetCompany(id, {
    quizCompleted: true,
    quizCompletedDate: new Date(),
    quizScore: score,
  });
}

/**
 * Schedule a strategy call
 */
export async function scheduleStrategyCall(
  id: string,
  callDate: Date
): Promise<TargetCompany> {
  return updateTargetCompany(id, {
    strategyCallScheduled: true,
    strategyCallDate: callDate,
    outreachStatus: 'meeting_scheduled',
  });
}

/**
 * Get activities for a target company
 */
export async function getTargetCompanyActivities(
  targetCompanyId: string
): Promise<TargetCompanyActivity[]> {
  const { data, error } = await supabase
    .from('target_company_activities')
    .select('*')
    .eq('target_company_id', targetCompanyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching activities:', error);
    throw error;
  }

  return (data || []).map(row => toCamelCase(row) as unknown as TargetCompanyActivity);
}

/**
 * Log an activity for a target company
 */
export async function logActivity(
  activity: Omit<TargetCompanyActivity, 'id' | 'createdAt'>
): Promise<TargetCompanyActivity> {
  const snakeCaseData = toSnakeCase(activity as unknown as Record<string, unknown>);

  const { data, error } = await supabase
    .from('target_company_activities')
    .insert(snakeCaseData)
    .select()
    .single();

  if (error) {
    console.error('Error logging activity:', error);
    throw error;
  }

  // Update last contact date on the company
  await updateTargetCompany(activity.targetCompanyId, {
    lastContactDate: new Date(),
  });

  return toCamelCase(data) as unknown as TargetCompanyActivity;
}

/**
 * Get pipeline summary
 */
export async function getPipelineSummary(): Promise<{
  status: OutreachStatus;
  count: number;
  totalValue: number;
}[]> {
  const { data, error } = await supabase
    .from('target_companies_pipeline')
    .select('*');

  if (error) {
    console.error('Error fetching pipeline:', error);
    throw error;
  }

  return (data || []).map(row => ({
    status: row.outreach_status as OutreachStatus,
    count: row.count,
    totalValue: row.total_value || 0,
  }));
}

/**
 * Get companies with follow-ups due
 */
export async function getFollowUpsDue(): Promise<TargetCompany[]> {
  const { data, error } = await supabase
    .from('target_companies_follow_up_due')
    .select('*');

  if (error) {
    console.error('Error fetching follow-ups:', error);
    throw error;
  }

  return (data || []).map(row => toCamelCase(row) as unknown as TargetCompany);
}

/**
 * Get companies by tier
 */
export async function getCompaniesByTier(tier: CompanyTier): Promise<TargetCompany[]> {
  return getTargetCompanies({ tier: [tier] });
}

/**
 * Bulk import target companies
 */
export async function bulkImportCompanies(
  companies: Omit<TargetCompany, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const company of companies) {
    try {
      await createTargetCompany(company);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to import ${company.companyName}: ${error}`);
    }
  }

  return results;
}

/**
 * Export target companies to CSV format
 */
export function exportToCSV(companies: TargetCompany[]): string {
  const headers = [
    'Company Name',
    'Industry',
    'City',
    'State',
    'Employees',
    'Revenue',
    'Primary Contact',
    'Contact Email',
    'Contact Phone',
    'Decision Maker',
    'Tier',
    'Status',
    'Pain Points',
    'Notes',
  ];

  const rows = companies.map(c => [
    c.companyName,
    c.industry,
    c.city,
    c.state,
    c.employeeCount || c.employeeRange || '',
    c.estimatedRevenue || c.revenueRange || '',
    c.primaryContactName || '',
    c.primaryContactEmail || '',
    c.primaryContactPhone || '',
    c.decisionMakerName || '',
    c.tier,
    c.outreachStatus,
    (c.painPoints || []).join('; '),
    c.notes || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}
