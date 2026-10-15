/**
 * Proposal & Agreement Management System - Type Definitions
 * Based on GRANT_SYSTEM_DEPLOYMENT_PROMPT.md specification
 */

// ============================================
// PROPOSAL TYPES
// ============================================

export type ProposalType = 'nda' | 'contract' | 'agreement' | 'mou' | 'statement_of_work' | 'slea' | 'msa';
export type ProposalStatus = 'draft' | 'pending_signature' | 'active' | 'inactive' | 'completed';
export type SignatureStatus = 'not_sent' | 'pending' | 'partially_signed' | 'completed' | 'declined';

export interface Proposal {
  id: string;
  name: string;
  description: string;
  type: ProposalType;
  startDate: string;
  endDate: string;
  fundingSource: string;
  referenceNumber: string;
  totalBudget: number;
  status: ProposalStatus;
  organizationId?: string;
  
  // Nested data
  collaboratingEntities: CollaboratingEntity[];
  dataCollectionMethods: DataCollectionMethod[];
  projectMilestones: ProjectMilestone[];
  analysisRecommendations: AnalysisRecommendation[];
  formTemplates: FormTemplate[];
  datasets: Dataset[];
  dashboardMetrics: DashboardMetric[];
  
  // Metadata
  documents: ProposalDocument[];
  entityRelationshipNotes: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Document Content (from wizard)
  sectionContent?: Record<string, string>;
  formData?: Record<string, string>;

  // Digital Signature Integration
  docuSealSubmissionId?: string;
  signatureStatus?: SignatureStatus;
  signedDocumentUrl?: string;
  signedAt?: Date;
}

// ============================================
// AGREEMENT TYPES
// ============================================

export type AgreementType = 'service_agreement' | 'partnership_mou' | 'subcontract' | 'vendor_agreement' | 'employment' | 'nda' | 'other';
export type AgreementStatus = 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated';
export type PartyRole = 'primary' | 'secondary' | 'witness';
export type SignerStatus = 'pending' | 'signed' | 'declined';

export interface Agreement {
  id: string;
  name: string;
  type: AgreementType;
  description: string;
  parties: AgreementParty[];
  effectiveDate: string;
  expirationDate?: string;
  terms: string;
  totalValue?: number;
  status: AgreementStatus;
  linkedProposalId?: string;
  
  // Digital Signature
  docuSealSubmissionId?: string;
  signatureStatus: SignatureStatus;
  signers: Signer[];
  
  // Document Storage
  draftDocumentUrl?: string;
  signedDocumentUrl?: string;
  filedLocation?: string;
  filedUnderPersonId?: string;
  
  createdAt: Date;
  updatedAt: Date;
  signedAt?: Date;
}

export interface AgreementParty {
  id: string;
  name: string;
  role: PartyRole;
  organizationName?: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
  order?: number;
  signedAt?: Date;
  status: SignerStatus;
}

// ============================================
// COLLABORATING ENTITY
// ============================================

export type EntityRole = 'lead' | 'partner' | 'evaluator' | 'stakeholder' | 'funder' | 'other';

export interface CollaboratingEntity {
  id: string;
  name: string;
  role: EntityRole;
  description: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  responsibilities: string[];
}

// ============================================
// DATA COLLECTION
// ============================================

export type CollectionFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';

export interface DataCollectionMethod {
  id: string;
  name: string;
  description: string;
  frequency: CollectionFrequency;
  responsibleEntity: string;
  dataPoints: string[];
  tools: string[];
}

// ============================================
// PROJECT MILESTONES
// ============================================

export type MilestoneStatus = 'not_started' | 'in_progress' | 'delayed' | 'completed';

export interface ProjectMilestone {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  status: MilestoneStatus;
  responsibleParties: string[];
  dependencies: string[];
}

// ============================================
// FORM TEMPLATES
// ============================================

export type FormPurpose = 'intake' | 'progress' | 'assessment' | 'feedback' | 'reporting' | 'data';

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  purpose: FormPurpose;
  sections: FormSection[];
  entityResponsible: string;
  frequency?: string;
  datasetId?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  validation?: FieldValidation;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customMessage?: string;
}

// ============================================
// DATASETS
// ============================================

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  fields: DatasetField[];
  linkedFormId?: string;
}

export interface DatasetField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array';
  required: boolean;
}

// ============================================
// DASHBOARD METRICS
// ============================================

export type MetricVisualization = 'number' | 'percentage' | 'currency' | 'ratio';
export type MetricStatus = 'success' | 'warning' | 'danger' | 'info';
export type MetricTrend = 'up' | 'down' | 'flat';

export interface DashboardMetric {
  id: string;
  name: string;
  description?: string;
  value: number | string;
  target?: number | string;
  unit?: string;
  status?: MetricStatus;
  trend?: MetricTrend;
  linkedForm: string;
  datasetField: string;
  visualization: MetricVisualization;
}

// ============================================
// ANALYSIS & RECOMMENDATIONS
// ============================================

export interface AnalysisRecommendation {
  id: string;
  category: 'risk' | 'opportunity' | 'compliance' | 'improvement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
}

// ============================================
// DOCUMENTS
// ============================================

export interface ProposalDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
  size: number;
}

// ============================================
// AI ANALYSIS TYPES
// ============================================

export interface DocumentAnalysisRequest {
  file: File;
  documentType?: 'grant' | 'rfp' | 'rfi' | 'contract' | 'agreement' | 'auto';
}

export interface DocumentAnalysisResult {
  success: boolean;
  detectedType: string;
  data: {
    title: string;
    description: string;
    fundingSource: string;
    referenceNumber: string;
    startDate: string;
    endDate: string;
    totalBudget: number;
    entities: Array<{
      name: string;
      role: string;
      responsibilities: string;
      contactInfo: string;
    }>;
    dataCollectionMethods: Array<{
      name: string;
      description: string;
      frequency: string;
      responsibleEntity: string;
      dataPoints: string[];
      tools: string;
    }>;
    milestones: Array<{
      name: string;
      description: string;
      dueDate: string;
      responsibleParties: string[];
      dependencies: string[];
    }>;
    forms: Array<{
      name: string;
      description: string;
      category: string;
      linkedDataCollectionMethod: string;
      fields: FormField[];
      datasetFields: string[];
    }>;
    dashboard: {
      title: string;
      description: string;
      metrics: DashboardMetric[];
      charts: ChartConfig[];
      kpis: KPIConfig[];
      tables: TableConfig[];
    };
    specialRequirements: string;
  };
  extractedText?: string;
  extractedTextLength?: number;
}

export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'gauge';
  title: string;
  dataSource: string;
  xAxis?: string;
  yAxis?: string;
}

export interface KPIConfig {
  id: string;
  name: string;
  value: string;
  target?: string;
  trend?: MetricTrend;
}

export interface TableConfig {
  id: string;
  title: string;
  dataSource: string;
  columns: string[];
}

// ============================================
// WIZARD STATE
// ============================================

export interface ProposalWizardState {
  currentStep: number;
  proposalData: Partial<Proposal>;
  analysisResult?: DocumentAnalysisResult;
  isAnalyzing: boolean;
  isSaving: boolean;
  errors: Record<string, string>;
}

export interface AgreementWizardState {
  currentStep: number;
  agreementData: Partial<Agreement>;
  isSaving: boolean;
  errors: Record<string, string>;
}

// ============================================
// CONSTANTS
// ============================================

export const PROPOSAL_TYPES: { value: ProposalType; label: string }[] = [
  { value: 'statement_of_work', label: 'Statement of Work' },
  { value: 'slea', label: 'Site Level Execution Agreement (SLEA)' },
  { value: 'msa', label: 'Master Service Agreement (MSA)' },
  { value: 'contract', label: 'Contract' },
  { value: 'nda', label: 'Non-Disclosure Agreement (NDA)' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'mou', label: 'Memorandum of Understanding' },
];

export const AGREEMENT_TYPES: { value: AgreementType; label: string }[] = [
  { value: 'service_agreement', label: 'Service Agreement' },
  { value: 'partnership_mou', label: 'Partnership MOU' },
  { value: 'subcontract', label: 'Subcontract' },
  { value: 'vendor_agreement', label: 'Vendor Agreement' },
  { value: 'employment', label: 'Employment Agreement' },
  { value: 'nda', label: 'Non-Disclosure Agreement' },
  { value: 'other', label: 'Other' },
];

export const ENTITY_ROLES: { value: EntityRole; label: string }[] = [
  { value: 'lead', label: 'Lead Organization' },
  { value: 'partner', label: 'Partner' },
  { value: 'evaluator', label: 'Evaluator' },
  { value: 'stakeholder', label: 'Stakeholder' },
  { value: 'funder', label: 'Funder' },
  { value: 'other', label: 'Other' },
];

export const COLLECTION_FREQUENCIES: { value: CollectionFrequency; label: string }[] = [
  { value: 'once', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export const MILESTONE_STATUSES: { value: MilestoneStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'completed', label: 'Completed' },
];

export const FORM_PURPOSES: { value: FormPurpose; label: string }[] = [
  { value: 'intake', label: 'Intake Form' },
  { value: 'progress', label: 'Progress Report' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'data', label: 'Data Collection' },
];

export const FUNDING_SOURCES = [
  'Federal Government',
  'State Government',
  'Local Government',
  'Private Foundation',
  'Corporate Sponsor',
  'Individual Donor',
  'Self-Funded',
  'Other',
];

export const FIELD_TYPES = [
  // Text Entry
  { value: 'text', label: 'Single Line Text', category: 'text' },
  { value: 'textarea', label: 'Multi-line Text', category: 'text' },
  { value: 'email', label: 'Email', category: 'text' },
  { value: 'phone', label: 'Phone Number', category: 'text' },
  { value: 'url', label: 'Website URL', category: 'text' },
  { value: 'password', label: 'Password', category: 'text' },
  
  // Multiple Choice
  { value: 'radio', label: 'Radio Buttons', category: 'choice' },
  { value: 'checkbox', label: 'Checkboxes', category: 'choice' },
  { value: 'select', label: 'Dropdown', category: 'choice' },
  { value: 'multi-select', label: 'Multi-Select', category: 'choice' },
  
  // Scale & Rating
  { value: 'likert', label: 'Likert Scale', category: 'scale' },
  { value: 'rating', label: 'Star Rating', category: 'scale' },
  { value: 'nps', label: 'Net Promoter Score', category: 'scale' },
  { value: 'slider', label: 'Slider', category: 'scale' },
  
  // Date & Time
  { value: 'date', label: 'Date', category: 'datetime' },
  { value: 'time', label: 'Time', category: 'datetime' },
  { value: 'datetime', label: 'Date & Time', category: 'datetime' },
  { value: 'date-range', label: 'Date Range', category: 'datetime' },
  
  // Numeric
  { value: 'number', label: 'Number', category: 'numeric' },
  { value: 'currency', label: 'Currency', category: 'numeric' },
  { value: 'percentage', label: 'Percentage', category: 'numeric' },
  
  // File & Media
  { value: 'file', label: 'File Upload', category: 'file' },
  { value: 'image', label: 'Image Upload', category: 'file' },
  { value: 'signature', label: 'Signature', category: 'file' },
  
  // Contact Info
  { value: 'full-name', label: 'Full Name', category: 'contact' },
  { value: 'address', label: 'Address', category: 'contact' },
  
  // Specialized
  { value: 'consent', label: 'Consent Checkbox', category: 'special' },
  { value: 'hidden', label: 'Hidden Field', category: 'special' },
];
