"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Sparkles,
  Building,
  Calendar,
  DollarSign,
  Users,
  Target,
  ClipboardList,
  BarChart3,
  FileSignature,
  Download,
  Eye,
  Send,
  Mail,
  Shield,
  Handshake,
  Building2,
  Scale,
  MapPin,
  FileCheck,
  Wand2,
  Copy,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Proposal,
  type CollaboratingEntity,
  type ProjectMilestone,
  PROPOSAL_TYPES,
  ENTITY_ROLES,
  MILESTONE_STATUSES,
  FUNDING_SOURCES,
} from "@/lib/types/proposal";

// ============================================
// DOCUMENT TYPE CONFIGURATION
// ============================================

export interface DocumentTypeConfig {
  type: Proposal["type"];
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  sections: DocumentSection[];
}

export interface DocumentSection {
  id: string;
  title: string;
  description: string;
  fields: SectionField[];
  boilerplate: string;
}

interface SectionField {
  id: string;
  label: string;
  type: "input" | "textarea" | "date" | "number" | "select";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  rows?: number;
}

export const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  {
    type: "statement_of_work",
    title: "Statement of Work (SOW)",
    description: "Define project scope, deliverables, milestones, acceptance criteria, and payment schedules for service engagements.",
    icon: ClipboardList,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    sections: [
      {
        id: "overview",
        title: "Project Overview",
        description: "High-level summary of the project scope and objectives",
        boilerplate: "This Statement of Work (\"SOW\") is entered into pursuant to the Master Service Agreement between the parties. This SOW defines the scope of work, deliverables, timeline, and acceptance criteria for the project described herein. The Contractor shall perform the services described in this SOW in accordance with the terms and conditions of the Agreement.",
        fields: [
          { id: "projectName", label: "Project Name", type: "input", placeholder: "Enter project name", required: true },
          { id: "projectOverview", label: "Project Overview", type: "textarea", placeholder: "Describe the project scope and objectives", rows: 4 },
        ],
      },
      {
        id: "scope",
        title: "Scope of Work",
        description: "Detailed description of work to be performed",
        boilerplate: "The Contractor shall provide the following services:\n\n1. Project Planning & Requirements Analysis\n   - Conduct stakeholder interviews and requirements gathering sessions\n   - Develop comprehensive project plan with milestones and deliverables\n   - Create detailed technical specifications\n\n2. Implementation & Development\n   - Execute project activities according to the approved project plan\n   - Provide regular status updates and progress reports\n   - Ensure quality standards are maintained throughout\n\n3. Testing & Quality Assurance\n   - Perform comprehensive testing of all deliverables\n   - Address defects and issues identified during testing\n   - Obtain client approval for each deliverable\n\n4. Training & Knowledge Transfer\n   - Provide training to designated client personnel\n   - Deliver documentation and user guides\n   - Ensure smooth transition and handoff",
        fields: [
          { id: "scopeDescription", label: "Scope Description", type: "textarea", placeholder: "Detail the scope of work", rows: 6 },
          { id: "outOfScope", label: "Out of Scope", type: "textarea", placeholder: "Items explicitly excluded from this SOW", rows: 3 },
        ],
      },
      {
        id: "deliverables",
        title: "Deliverables & Acceptance",
        description: "Specific deliverables and acceptance criteria",
        boilerplate: "The following deliverables shall be provided under this SOW:\n\n| # | Deliverable | Description | Acceptance Criteria | Due Date |\n|---|------------|-------------|--------------------|---------|\n| 1 | Project Plan | Comprehensive project plan | Approved by Project Sponsor | Week 2 |\n| 2 | Requirements Document | Detailed requirements specification | Sign-off by stakeholders | Week 4 |\n| 3 | Implementation | Completed solution per specifications | Passes acceptance testing | Week 12 |\n| 4 | Documentation | User guides and technical documentation | Review and approval | Week 14 |\n| 5 | Training | Training sessions for end users | Completion certificates | Week 15 |\n\nAcceptance Process: Client shall have 10 business days to review each deliverable. Deliverables not rejected within this period shall be deemed accepted.",
        fields: [
          { id: "deliverables", label: "Deliverables", type: "textarea", placeholder: "List all deliverables with acceptance criteria", rows: 6 },
        ],
      },
      {
        id: "timeline",
        title: "Timeline & Milestones",
        description: "Project schedule and key milestones",
        boilerplate: "The project shall be completed according to the following timeline:\n\nPhase 1: Initiation & Planning (Weeks 1-4)\n- Kickoff meeting and stakeholder alignment\n- Requirements gathering and analysis\n- Project plan development and approval\n\nPhase 2: Execution (Weeks 5-12)\n- Design and development activities\n- Regular progress reviews (bi-weekly)\n- Iterative testing and refinement\n\nPhase 3: Closure (Weeks 13-16)\n- Final testing and acceptance\n- Documentation and knowledge transfer\n- Project closure and lessons learned",
        fields: [
          { id: "startDate", label: "Start Date", type: "date", required: true },
          { id: "endDate", label: "End Date", type: "date", required: true },
          { id: "milestones", label: "Key Milestones", type: "textarea", placeholder: "Define key project milestones", rows: 4 },
        ],
      },
      {
        id: "commercial",
        title: "Commercial Terms",
        description: "Pricing, payment schedule, and budget",
        boilerplate: "Pricing Structure:\nThe total fixed price for the services described in this SOW is $[AMOUNT].\n\nPayment Schedule:\n- 20% upon SOW execution\n- 30% upon completion of Phase 1\n- 30% upon completion of Phase 2\n- 20% upon final acceptance\n\nPayment Terms: Net 30 days from invoice date.\n\nExpenses: All reasonable travel and out-of-pocket expenses shall be pre-approved by the Client and reimbursed at cost.\n\nChange Orders: Any changes to the scope, timeline, or budget must be documented in a written Change Order signed by both parties.",
        fields: [
          { id: "totalBudget", label: "Total Budget ($)", type: "number", placeholder: "0" },
          { id: "paymentTerms", label: "Payment Terms", type: "textarea", placeholder: "Define payment schedule and terms", rows: 3 },
        ],
      },
    ],
  },
  {
    type: "nda",
    title: "Non-Disclosure Agreement (NDA)",
    description: "Protect confidential information shared between parties with legally binding confidentiality terms.",
    icon: Shield,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    sections: [
      {
        id: "parties",
        title: "Parties & Purpose",
        description: "Identify the parties and the purpose of the NDA",
        boilerplate: "This Non-Disclosure Agreement (\"Agreement\") is entered into as of [DATE] by and between:\n\nDisclosing Party: [COMPANY NAME], a [STATE] [ENTITY TYPE], with its principal place of business at [ADDRESS] (\"Disclosing Party\")\n\nReceiving Party: [COMPANY NAME], a [STATE] [ENTITY TYPE], with its principal place of business at [ADDRESS] (\"Receiving Party\")\n\nPurpose: The parties wish to explore a potential business relationship concerning [DESCRIPTION OF PURPOSE] (the \"Purpose\"). In connection with the Purpose, the Disclosing Party may disclose certain confidential and proprietary information to the Receiving Party.",
        fields: [
          { id: "disclosingParty", label: "Disclosing Party", type: "input", placeholder: "Company or individual name", required: true },
          { id: "receivingParty", label: "Receiving Party", type: "input", placeholder: "Company or individual name", required: true },
          { id: "purpose", label: "Purpose", type: "textarea", placeholder: "Describe the purpose of the NDA", rows: 3 },
        ],
      },
      {
        id: "confidentialInfo",
        title: "Definition of Confidential Information",
        description: "Define what constitutes confidential information",
        boilerplate: "\"Confidential Information\" means any and all non-public information, in any form or medium, whether written, oral, electronic, or visual, that is disclosed by the Disclosing Party to the Receiving Party, including but not limited to:\n\n• Trade secrets, inventions, and intellectual property\n• Business plans, strategies, and financial information\n• Customer and supplier lists, pricing, and market data\n• Technical data, designs, algorithms, and source code\n• Employee information and organizational structures\n• Any information marked as \"Confidential\" or \"Proprietary\"\n• Information that a reasonable person would understand to be confidential\n\nExclusions: Confidential Information does not include information that:\n(a) Is or becomes publicly available through no fault of the Receiving Party\n(b) Was known to the Receiving Party prior to disclosure\n(c) Is independently developed without use of Confidential Information\n(d) Is rightfully received from a third party without restriction",
        fields: [
          { id: "confidentialInfoDef", label: "Confidential Information Definition", type: "textarea", placeholder: "Define what constitutes confidential information", rows: 5 },
        ],
      },
      {
        id: "obligations",
        title: "Obligations & Restrictions",
        description: "Define the obligations of the receiving party",
        boilerplate: "The Receiving Party agrees to:\n\n1. Use the Confidential Information solely for the Purpose described herein\n2. Not disclose Confidential Information to any third party without prior written consent\n3. Protect Confidential Information with at least the same degree of care used to protect its own confidential information, but no less than reasonable care\n4. Limit access to Confidential Information to employees and agents who have a need to know and are bound by confidentiality obligations\n5. Promptly notify the Disclosing Party of any unauthorized disclosure or use\n6. Return or destroy all Confidential Information upon request or termination of this Agreement\n\nPermitted Disclosures: The Receiving Party may disclose Confidential Information if required by law, regulation, or court order, provided that the Receiving Party gives the Disclosing Party prompt written notice and cooperates in seeking a protective order.",
        fields: [
          { id: "obligations", label: "Specific Obligations", type: "textarea", placeholder: "Additional obligations beyond standard terms", rows: 4 },
        ],
      },
      {
        id: "term",
        title: "Term & Termination",
        description: "Duration and termination conditions",
        boilerplate: "Term: This Agreement shall be effective as of the date first written above and shall remain in effect for a period of [NUMBER] years from the date of execution, unless earlier terminated.\n\nSurvival: The obligations of confidentiality shall survive termination of this Agreement for a period of [NUMBER] years following the date of termination.\n\nTermination: Either party may terminate this Agreement upon thirty (30) days' written notice to the other party.\n\nEffect of Termination: Upon termination, the Receiving Party shall promptly return or destroy all Confidential Information and certify in writing that it has done so.",
        fields: [
          { id: "termYears", label: "Agreement Term (years)", type: "number", placeholder: "2" },
          { id: "survivalYears", label: "Survival Period (years)", type: "number", placeholder: "3" },
        ],
      },
    ],
  },
  {
    type: "contract",
    title: "Service Contract",
    description: "Formalize service engagements with clear scope, deliverables, payment terms, and legal provisions.",
    icon: FileSignature,
    color: "text-green-600",
    bgColor: "bg-green-50",
    sections: [
      {
        id: "parties",
        title: "Parties & Engagement",
        description: "Identify the contracting parties and engagement overview",
        boilerplate: "This Service Contract (\"Contract\") is entered into as of [DATE] by and between:\n\nClient: [CLIENT NAME], with its principal place of business at [ADDRESS] (\"Client\")\n\nContractor: [CONTRACTOR NAME], with its principal place of business at [ADDRESS] (\"Contractor\")\n\nThe Client hereby engages the Contractor to provide the services described herein, and the Contractor accepts such engagement, subject to the terms and conditions set forth in this Contract.",
        fields: [
          { id: "clientName", label: "Client Name", type: "input", placeholder: "Client company name", required: true },
          { id: "contractorName", label: "Contractor Name", type: "input", placeholder: "Contractor company name", required: true },
          { id: "engagementOverview", label: "Engagement Overview", type: "textarea", placeholder: "Brief overview of the engagement", rows: 3 },
        ],
      },
      {
        id: "scope",
        title: "Scope of Services",
        description: "Detailed description of services to be provided",
        boilerplate: "The Contractor shall provide the following services (\"Services\"):\n\n1. [SERVICE CATEGORY 1]\n   - Detailed description of service activities\n   - Expected outputs and deliverables\n   - Performance standards and quality requirements\n\n2. [SERVICE CATEGORY 2]\n   - Detailed description of service activities\n   - Expected outputs and deliverables\n   - Performance standards and quality requirements\n\nService Standards: The Contractor shall perform the Services in a professional and workmanlike manner, consistent with industry standards and best practices.\n\nClient Responsibilities: The Client shall provide reasonable access, information, and cooperation necessary for the Contractor to perform the Services.",
        fields: [
          { id: "scopeOfServices", label: "Scope of Services", type: "textarea", placeholder: "Describe the services in detail", rows: 6 },
        ],
      },
      {
        id: "commercial",
        title: "Compensation & Payment",
        description: "Pricing, payment terms, and invoicing",
        boilerplate: "Compensation: The Client shall pay the Contractor the following fees for the Services:\n\n• Fixed Fee: $[AMOUNT] for the complete scope of Services\n  OR\n• Hourly Rate: $[RATE] per hour, not to exceed [MAX HOURS] hours\n  OR\n• Monthly Retainer: $[AMOUNT] per month\n\nPayment Terms:\n- Invoices shall be submitted [monthly/upon milestone completion]\n- Payment is due within 30 days of invoice receipt\n- Late payments shall accrue interest at 1.5% per month\n\nExpenses: Pre-approved expenses shall be reimbursed at cost with supporting documentation.",
        fields: [
          { id: "totalBudget", label: "Total Contract Value ($)", type: "number", placeholder: "0" },
          { id: "paymentTerms", label: "Payment Terms", type: "textarea", placeholder: "Define payment schedule and terms", rows: 3 },
        ],
      },
      {
        id: "terms",
        title: "Term & Termination",
        description: "Contract duration and termination provisions",
        boilerplate: "Term: This Contract shall commence on [START DATE] and continue until [END DATE], unless earlier terminated as provided herein.\n\nTermination for Convenience: Either party may terminate this Contract upon thirty (30) days' written notice.\n\nTermination for Cause: Either party may terminate this Contract immediately upon written notice if the other party:\n(a) Materially breaches this Contract and fails to cure within fifteen (15) days of notice\n(b) Becomes insolvent or files for bankruptcy\n(c) Engages in fraud or willful misconduct\n\nEffect of Termination: Upon termination, the Client shall pay for all Services performed through the termination date. The Contractor shall deliver all work product completed to date.",
        fields: [
          { id: "startDate", label: "Start Date", type: "date", required: true },
          { id: "endDate", label: "End Date", type: "date", required: true },
          { id: "terminationTerms", label: "Additional Termination Terms", type: "textarea", placeholder: "Any additional termination provisions", rows: 3 },
        ],
      },
      {
        id: "legal",
        title: "Legal Provisions",
        description: "Warranties, liability, and dispute resolution",
        boilerplate: "Warranties: The Contractor warrants that:\n(a) The Services shall be performed in a professional manner\n(b) The work product shall not infringe any third-party intellectual property rights\n(c) The Contractor has the authority to enter into this Contract\n\nLimitation of Liability: Neither party shall be liable for indirect, incidental, or consequential damages. The Contractor's total liability shall not exceed the total fees paid under this Contract.\n\nIndemnification: Each party shall indemnify the other against claims arising from its breach of this Contract or negligent acts.\n\nGoverning Law: This Contract shall be governed by the laws of [STATE/JURISDICTION].\n\nDispute Resolution: Any disputes shall first be addressed through good-faith negotiation, then mediation, and finally binding arbitration.",
        fields: [
          { id: "governingLaw", label: "Governing Law (State/Jurisdiction)", type: "input", placeholder: "e.g., State of California" },
          { id: "additionalTerms", label: "Additional Legal Terms", type: "textarea", placeholder: "Any additional legal provisions", rows: 3 },
        ],
      },
    ],
  },
  {
    type: "agreement",
    title: "General Agreement",
    description: "Establish terms and conditions between parties for collaborative efforts and partnerships.",
    icon: Handshake,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    sections: [
      {
        id: "parties",
        title: "Parties & Purpose",
        description: "Identify the parties and the purpose of the agreement",
        boilerplate: "This Agreement (\"Agreement\") is entered into as of [DATE] by and between:\n\nParty A: [NAME], with its principal place of business at [ADDRESS]\nParty B: [NAME], with its principal place of business at [ADDRESS]\n\nPurpose: The parties enter into this Agreement to establish the terms and conditions governing their collaboration on [DESCRIPTION OF PURPOSE].",
        fields: [
          { id: "partyA", label: "Party A", type: "input", placeholder: "First party name", required: true },
          { id: "partyB", label: "Party B", type: "input", placeholder: "Second party name", required: true },
          { id: "purpose", label: "Purpose", type: "textarea", placeholder: "Describe the purpose of this agreement", rows: 3 },
        ],
      },
      {
        id: "responsibilities",
        title: "Responsibilities",
        description: "Define each party's responsibilities",
        boilerplate: "Party A Responsibilities:\n• [Responsibility 1]\n• [Responsibility 2]\n• [Responsibility 3]\n\nParty B Responsibilities:\n• [Responsibility 1]\n• [Responsibility 2]\n• [Responsibility 3]\n\nShared Responsibilities:\n• Maintain open and regular communication\n• Act in good faith to achieve the objectives of this Agreement\n• Comply with all applicable laws and regulations",
        fields: [
          { id: "responsibilities", label: "Responsibilities", type: "textarea", placeholder: "Define each party's responsibilities", rows: 6 },
        ],
      },
      {
        id: "terms",
        title: "Terms & Conditions",
        description: "Duration, termination, and general terms",
        boilerplate: "Term: This Agreement shall be effective from [START DATE] and shall continue for a period of [DURATION], unless terminated earlier.\n\nTermination: Either party may terminate this Agreement with [30] days' written notice.\n\nAmendments: This Agreement may only be amended by written agreement signed by both parties.\n\nEntire Agreement: This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations and agreements.\n\nGoverning Law: This Agreement shall be governed by the laws of [JURISDICTION].",
        fields: [
          { id: "startDate", label: "Effective Date", type: "date" },
          { id: "duration", label: "Duration", type: "input", placeholder: "e.g., 12 months" },
          { id: "additionalTerms", label: "Additional Terms", type: "textarea", placeholder: "Any additional terms and conditions", rows: 4 },
        ],
      },
    ],
  },
  {
    type: "mou",
    title: "Memorandum of Understanding (MOU)",
    description: "Formalize partnerships with shared objectives, commitments, resource sharing, and governance structures.",
    icon: Building2,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    sections: [
      {
        id: "background",
        title: "Background & Context",
        description: "Establish the context and rationale for the MOU",
        boilerplate: "WHEREAS, [PARTY A] is a [DESCRIPTION] with expertise in [AREA]; and\n\nWHEREAS, [PARTY B] is a [DESCRIPTION] with expertise in [AREA]; and\n\nWHEREAS, the parties share a common interest in [SHARED INTEREST] and recognize the mutual benefits of collaboration;\n\nNOW, THEREFORE, the parties agree to the following terms of this Memorandum of Understanding to formalize their intent to collaborate on [PROJECT/INITIATIVE].",
        fields: [
          { id: "partyA", label: "Party A", type: "input", placeholder: "First organization name", required: true },
          { id: "partyB", label: "Party B", type: "input", placeholder: "Second organization name", required: true },
          { id: "background", label: "Background", type: "textarea", placeholder: "Describe the background and context", rows: 4 },
        ],
      },
      {
        id: "objectives",
        title: "Shared Objectives",
        description: "Define the shared goals and objectives",
        boilerplate: "The parties agree to collaborate toward the following shared objectives:\n\n1. [OBJECTIVE 1]: Description of the first shared objective and expected outcomes\n2. [OBJECTIVE 2]: Description of the second shared objective and expected outcomes\n3. [OBJECTIVE 3]: Description of the third shared objective and expected outcomes\n\nSuccess Metrics:\n• [Metric 1]: How success will be measured\n• [Metric 2]: How success will be measured\n• [Metric 3]: How success will be measured",
        fields: [
          { id: "objectives", label: "Objectives", type: "textarea", placeholder: "List shared objectives", rows: 5 },
        ],
      },
      {
        id: "commitments",
        title: "Commitments & Resources",
        description: "Define resource commitments from each party",
        boilerplate: "Party A Commitments:\n• Provide [RESOURCE/EXPERTISE]\n• Allocate [STAFF/BUDGET] for the collaboration\n• Share relevant data and research findings\n\nParty B Commitments:\n• Provide [RESOURCE/EXPERTISE]\n• Allocate [STAFF/BUDGET] for the collaboration\n• Facilitate access to [FACILITIES/NETWORKS]\n\nThis MOU does not create any financial obligations unless separately agreed upon in writing. Each party shall bear its own costs unless otherwise specified.",
        fields: [
          { id: "commitments", label: "Commitments", type: "textarea", placeholder: "Define each party's commitments", rows: 5 },
        ],
      },
      {
        id: "governance",
        title: "Governance & Duration",
        description: "Governance structure and MOU duration",
        boilerplate: "Governance: The parties shall establish a joint steering committee consisting of [NUMBER] representatives from each party. The committee shall meet [FREQUENCY] to review progress, address issues, and make decisions.\n\nDuration: This MOU shall be effective from [START DATE] for a period of [DURATION]. It may be renewed by mutual written agreement.\n\nTermination: Either party may terminate this MOU with [60] days' written notice.\n\nNon-Binding: This MOU is a statement of intent and does not create legally binding obligations, except for confidentiality provisions.",
        fields: [
          { id: "startDate", label: "Effective Date", type: "date" },
          { id: "duration", label: "Duration", type: "input", placeholder: "e.g., 24 months" },
          { id: "governance", label: "Governance Structure", type: "textarea", placeholder: "Describe the governance structure", rows: 3 },
        ],
      },
    ],
  },
  {
    type: "slea",
    title: "Site Level Execution Agreement (SLEA)",
    description: "Define site-specific execution terms including scope, safety requirements, performance metrics, and compliance.",
    icon: MapPin,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    sections: [
      {
        id: "siteInfo",
        title: "Site Information",
        description: "Identify the site and key contacts",
        boilerplate: "Site Name: [SITE NAME]\nSite Address: [ADDRESS]\nSite Contact: [NAME], [TITLE], [PHONE], [EMAIL]\n\nThis Site Level Execution Agreement (\"SLEA\") is entered into pursuant to the Master Service Agreement dated [DATE] between [CLIENT] and [CONTRACTOR]. This SLEA defines the specific terms for work to be performed at the above-referenced site.",
        fields: [
          { id: "siteName", label: "Site Name", type: "input", placeholder: "Enter site name", required: true },
          { id: "siteAddress", label: "Site Address", type: "input", placeholder: "Enter site address" },
          { id: "siteContact", label: "Site Contact", type: "input", placeholder: "Primary site contact name" },
          { id: "siteOverview", label: "Site Overview", type: "textarea", placeholder: "Describe the site and work context", rows: 3 },
        ],
      },
      {
        id: "scope",
        title: "Site-Specific Scope",
        description: "Define the scope of work for this specific site",
        boilerplate: "The Contractor shall perform the following services at the designated site:\n\n1. Mobilization & Setup\n   - Equipment deployment and calibration\n   - Personnel onboarding and site orientation\n   - Safety briefing and compliance verification\n\n2. Execution Activities\n   - [SPECIFIC ACTIVITY 1]\n   - [SPECIFIC ACTIVITY 2]\n   - [SPECIFIC ACTIVITY 3]\n\n3. Demobilization & Closeout\n   - Site restoration to original condition\n   - Equipment removal and inventory\n   - Final documentation and sign-off",
        fields: [
          { id: "siteScope", label: "Site-Specific Scope", type: "textarea", placeholder: "Define the scope for this site", rows: 5 },
        ],
      },
      {
        id: "safety",
        title: "Safety & Compliance",
        description: "Safety requirements and regulatory compliance",
        boilerplate: "Safety Requirements:\n• All personnel must complete site-specific safety orientation before commencing work\n• Personal Protective Equipment (PPE) requirements: [LIST PPE]\n• Daily safety briefings (toolbox talks) shall be conducted\n• All incidents must be reported within [TIMEFRAME]\n• Emergency procedures shall be reviewed with all personnel\n\nRegulatory Compliance:\n• OSHA standards and regulations\n• Site-specific environmental requirements\n• Local building codes and permits\n• [INDUSTRY-SPECIFIC REGULATIONS]\n\nSafety Performance Metrics:\n• Zero lost-time incidents\n• 100% PPE compliance\n• Weekly safety audit completion",
        fields: [
          { id: "safetyRequirements", label: "Safety Requirements", type: "textarea", placeholder: "Define safety requirements", rows: 5 },
        ],
      },
      {
        id: "performance",
        title: "Performance & Schedule",
        description: "Performance metrics and site schedule",
        boilerplate: "Performance Metrics:\n• Quality: [METRIC] - Target: [VALUE]\n• Schedule: [METRIC] - Target: [VALUE]\n• Safety: [METRIC] - Target: [VALUE]\n• Cost: [METRIC] - Target: [VALUE]\n\nSchedule:\n• Mobilization Date: [DATE]\n• Work Start Date: [DATE]\n• Estimated Completion: [DATE]\n• Demobilization: [DATE]\n\nReporting: Weekly progress reports shall be submitted every [DAY] by [TIME].",
        fields: [
          { id: "startDate", label: "Work Start Date", type: "date" },
          { id: "endDate", label: "Estimated Completion", type: "date" },
          { id: "performanceMetrics", label: "Performance Metrics", type: "textarea", placeholder: "Define performance metrics and targets", rows: 4 },
        ],
      },
    ],
  },
  {
    type: "msa",
    title: "Master Service Agreement (MSA)",
    description: "Establish overarching terms, service standards, financial provisions, and legal framework between parties.",
    icon: Scale,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    sections: [
      {
        id: "parties",
        title: "Parties & Recitals",
        description: "Identify the parties and establish the agreement context",
        boilerplate: "This Master Service Agreement (\"Agreement\") is entered into as of [DATE] by and between:\n\nClient: [CLIENT NAME], a [STATE] [ENTITY TYPE], with its principal place of business at [ADDRESS] (\"Client\")\n\nService Provider: [PROVIDER NAME], a [STATE] [ENTITY TYPE], with its principal place of business at [ADDRESS] (\"Service Provider\")\n\nRECITALS:\nWHEREAS, the Client desires to engage the Service Provider to provide certain services; and\nWHEREAS, the Service Provider has the expertise and resources to provide such services;\nNOW, THEREFORE, the parties agree to the following terms and conditions.",
        fields: [
          { id: "clientName", label: "Client Name", type: "input", placeholder: "Client company name", required: true },
          { id: "providerName", label: "Service Provider Name", type: "input", placeholder: "Service provider company name", required: true },
          { id: "effectiveDate", label: "Effective Date", type: "date" },
        ],
      },
      {
        id: "services",
        title: "Service Standards",
        description: "Define service standards and performance expectations",
        boilerplate: "Service Standards:\nThe Service Provider shall perform all services in accordance with the following standards:\n\n1. Professional Standards: Services shall be performed in a professional and workmanlike manner by qualified personnel\n2. Industry Standards: Services shall comply with applicable industry standards and best practices\n3. Response Times: [DEFINE SLA RESPONSE TIMES]\n4. Availability: [DEFINE SERVICE AVAILABILITY REQUIREMENTS]\n5. Quality Metrics: [DEFINE QUALITY KPIs]\n\nService Level Agreement (SLA):\n• Uptime: [TARGET]%\n• Response Time: [TARGET] hours\n• Resolution Time: [TARGET] hours\n• Customer Satisfaction: [TARGET] score",
        fields: [
          { id: "serviceStandards", label: "Service Standards", type: "textarea", placeholder: "Define service standards and SLAs", rows: 6 },
        ],
      },
      {
        id: "financial",
        title: "Financial Terms",
        description: "Pricing structure, payment terms, and financial provisions",
        boilerplate: "Pricing: Fees for services shall be as set forth in each Statement of Work executed under this Agreement.\n\nRate Card:\n• [ROLE 1]: $[RATE]/hour\n• [ROLE 2]: $[RATE]/hour\n• [ROLE 3]: $[RATE]/hour\n\nPayment Terms:\n• Invoices shall be submitted monthly\n• Payment is due within Net 30 days\n• Late payments accrue interest at 1.5% per month\n\nAnnual Rate Adjustments: Rates may be adjusted annually by no more than [X]% with 60 days' written notice.\n\nTaxes: Each party is responsible for its own taxes. Service Provider shall include applicable sales tax on invoices.",
        fields: [
          { id: "financialTerms", label: "Financial Terms", type: "textarea", placeholder: "Define pricing and payment terms", rows: 5 },
        ],
      },
      {
        id: "legal",
        title: "Legal Framework",
        description: "Intellectual property, liability, and dispute resolution",
        boilerplate: "Intellectual Property:\n• Work Product: All work product created under this Agreement shall be owned by [CLIENT/PROVIDER]\n• Pre-Existing IP: Each party retains ownership of its pre-existing intellectual property\n• License: [PARTY] grants [PARTY] a non-exclusive license to use [DESCRIPTION]\n\nConfidentiality: Each party shall maintain the confidentiality of the other party's proprietary information.\n\nLimitation of Liability: Neither party shall be liable for indirect, incidental, or consequential damages. Total liability shall not exceed [AMOUNT/FORMULA].\n\nIndemnification: Each party shall indemnify the other against third-party claims arising from its negligence or breach.\n\nGoverning Law: [STATE/JURISDICTION]\nDispute Resolution: Negotiation → Mediation → Binding Arbitration\n\nTerm: This Agreement shall remain in effect for [DURATION] and may be renewed by mutual agreement.\nTermination: Either party may terminate with [90] days' written notice.",
        fields: [
          { id: "governingLaw", label: "Governing Law", type: "input", placeholder: "e.g., State of California" },
          { id: "termDuration", label: "Agreement Duration", type: "input", placeholder: "e.g., 3 years" },
          { id: "additionalTerms", label: "Additional Legal Terms", type: "textarea", placeholder: "Any additional legal provisions", rows: 4 },
        ],
      },
    ],
  },
];

// ============================================
// WIZARD COMPONENT
// ============================================

interface ProposalWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (proposal: Partial<Proposal>) => void;
}

export function ProposalWizard({ open, onOpenChange, onComplete }: ProposalWizardProps) {
  const [currentStep, setCurrentStep] = useState(0); // 0 = intro, 1+ = sections
  const [selectedType, setSelectedType] = useState<Proposal["type"] | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [sectionContent, setSectionContent] = useState<Record<string, string>>({});
  const [enhancingSection, setEnhancingSection] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const docConfig = selectedType ? DOCUMENT_TYPES.find((d) => d.type === selectedType) : null;
  const totalSteps = docConfig ? docConfig.sections.length + 2 : 1; // intro + sections + export
  const isIntroStep = currentStep === 0;
  const isExportStep = docConfig && currentStep === totalSteps - 1;
  const currentSection = docConfig && !isIntroStep && !isExportStep
    ? docConfig.sections[currentStep - 1]
    : null;

  const DocIcon = docConfig?.icon || FileText;

  const resetWizard = () => {
    setCurrentStep(0);
    setSelectedType(null);
    setFormData({});
    setSectionContent({});
    setEnhancingSection(null);
    setEmailTo("");
    setEmailSubject("");
    setEmailBody("");
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const handleSelectType = (type: Proposal["type"]) => {
    setSelectedType(type);
    const config = DOCUMENT_TYPES.find((d) => d.type === type);
    if (config) {
      setEmailSubject(`${config.title} - For Your Review and Signature`);
      setEmailBody(generateEmailBody(config));
    }
    setCurrentStep(1);
  };

  const insertBoilerplate = (sectionId: string, boilerplate: string) => {
    setSectionContent((prev) => ({
      ...prev,
      [sectionId]: boilerplate,
    }));
    toast.success("Boilerplate text inserted");
  };

  const enhanceSectionWithAI = async (sectionId: string) => {
    const content = sectionContent[sectionId];
    if (!content) {
      toast.error("Please add some content first (try inserting boilerplate)");
      return;
    }
    setEnhancingSection(sectionId);
    try {
      const response = await fetch("/api/ai/enhance-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: content,
          context: {
            type: `${selectedType}_${sectionId}`,
            documentType: selectedType,
            fieldContext: sectionId,
          },
          prompt: `Enhance and professionalize this ${docConfig?.title || "document"} section (${currentSection?.title || sectionId}). Make it cohesive, legally sound, and professionally written. Incorporate the specific details provided while maintaining standard legal/business language. Return only the enhanced content.`,
        }),
      });
      const result = await response.json();
      if (result.success && result.enhancedText) {
        setSectionContent((prev) => ({ ...prev, [sectionId]: result.enhancedText }));
        toast.success("Section enhanced with AI");
      } else {
        toast.error("Failed to enhance section");
      }
    } catch (error) {
      console.error("Error enhancing section:", error);
      toast.error("Error enhancing section");
    } finally {
      setEnhancingSection(null);
    }
  };

  const handleSave = () => {
    if (!docConfig) return;
    const proposal: Partial<Proposal> = {
      name: formData.projectName || formData.siteName || formData.clientName || `${docConfig.title} - ${new Date().toLocaleDateString()}`,
      description: sectionContent[docConfig.sections[0]?.id] || formData.projectOverview || formData.purpose || formData.engagementOverview || "",
      type: selectedType!,
      startDate: formData.startDate || formData.effectiveDate || "",
      endDate: formData.endDate || "",
      totalBudget: parseFloat(formData.totalBudget) || 0,
      status: "draft",
      fundingSource: formData.fundingSource || "",
      referenceNumber: formData.referenceNumber || "",
      sectionContent: { ...sectionContent },
      formData: { ...formData },
    };
    onComplete(proposal);
    handleClose();
    toast.success("Document created successfully!");
  };

  const handleEmailSend = () => {
    if (!emailTo) {
      toast.error("Please enter a recipient email address");
      return;
    }
    // In a real app, this would call an API to send the email
    const mailtoLink = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink, "_blank");
    toast.success("Email client opened with pre-filled content");
  };

  const handleExportPDF = () => {
    toast.info("PDF export coming soon - document saved as draft");
    handleSave();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="!max-w-[90vw] !w-[1100px] max-h-[90vh] overflow-hidden flex flex-col p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", docConfig?.bgColor || "bg-primary/10")}>
                <DocIcon className={cn("h-5 w-5", docConfig?.color || "text-primary")} />
              </div>
              {isIntroStep ? "Create New Document" : docConfig?.title || "Document Wizard"}
            </DialogTitle>
            <DialogDescription>
              {isIntroStep
                ? "Select a document type to begin the guided creation process"
                : isExportStep
                  ? "Review, export, and send your document"
                  : `Step ${currentStep} of ${totalSteps - 2}: ${currentSection?.title || ""}`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar (only show after intro) */}
          {!isIntroStep && docConfig && (
            <div className="flex items-center gap-1 mt-4">
              {Array.from({ length: totalSteps - 1 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i < currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: "calc(90vh - 220px)" }}>
          <div className="px-6 py-6">
            {/* Step 0: Document Type Selection */}
            {isIntroStep && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">AI-Powered Document Creator</h2>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    Choose a document type below. Our guided wizard will walk you through each section
                    with professional boilerplate language that you can customize and enhance with AI.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {DOCUMENT_TYPES.map((doc) => {
                    const Icon = doc.icon;
                    return (
                      <Card
                        key={doc.type}
                        className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
                        onClick={() => handleSelectType(doc.type)}
                      >
                        <CardHeader className="pb-2">
                          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-3", doc.bgColor)}>
                            <Icon className={cn("h-6 w-6", doc.color)} />
                          </div>
                          <CardTitle className="text-base group-hover:text-primary transition-colors">
                            {doc.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm leading-relaxed">
                            {doc.description}
                          </CardDescription>
                          <div className="mt-3 flex items-center text-xs text-muted-foreground">
                            <FileCheck className="h-3 w-3 mr-1" />
                            {doc.sections.length} guided sections
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Document Section Steps */}
            {currentSection && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <DocIcon className={cn("h-5 w-5", docConfig?.color)} />
                    {currentSection.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{currentSection.description}</p>
                </div>

                {/* Boilerplate Insert Button */}
                <Card className="border-dashed border-primary/30 bg-primary/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Copy className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Insert Boilerplate Language</p>
                          <p className="text-xs text-muted-foreground">
                            Start with professional template language, then customize
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => insertBoilerplate(currentSection.id, currentSection.boilerplate)}
                        >
                          <Copy className="mr-2 h-3 w-3" />
                          Insert Template
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => enhanceSectionWithAI(currentSection.id)}
                          disabled={enhancingSection === currentSection.id || !sectionContent[currentSection.id]}
                        >
                          {enhancingSection === currentSection.id ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <Wand2 className="mr-2 h-3 w-3" />
                          )}
                          Enhance with AI
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section Content Editor */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Section Content</Label>
                  <Textarea
                    value={sectionContent[currentSection.id] || ""}
                    onChange={(e) => setSectionContent((prev) => ({ ...prev, [currentSection.id]: e.target.value }))}
                    placeholder={`Enter or paste content for "${currentSection.title}"...`}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>

                <Separator />

                {/* Section-Specific Fields */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Section Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {currentSection.fields.map((field) => (
                      <div
                        key={field.id}
                        className={cn("space-y-2", field.type === "textarea" && "col-span-2")}
                      >
                        <Label className="flex items-center gap-1">
                          {field.label}
                          {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        {field.type === "textarea" ? (
                          <Textarea
                            value={formData[field.id] || ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
                            placeholder={field.placeholder}
                            rows={field.rows || 3}
                          />
                        ) : field.type === "select" && field.options ? (
                          <Select
                            value={formData[field.id] || ""}
                            onValueChange={(v) => setFormData((prev) => ({ ...prev, [field.id]: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={field.type}
                            value={formData[field.id] || ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
                            placeholder={field.placeholder}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Export & Send Step */}
            {isExportStep && docConfig && (
              <div className="space-y-6">
                {/* Document Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DocIcon className={cn("h-5 w-5", docConfig.color)} />
                      Document Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Document Type</Label>
                        <p className="font-medium">{docConfig.title}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Sections Completed</Label>
                        <p className="font-medium">
                          {Object.keys(sectionContent).filter((k) => sectionContent[k]).length} of {docConfig.sections.length}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      {docConfig.sections.map((section) => (
                        <div key={section.id} className="flex items-center justify-between py-1">
                          <span className="text-sm">{section.title}</span>
                          {sectionContent[section.id] ? (
                            <Badge className="bg-green-100 text-green-700">
                              <Check className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Empty</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Export Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Export Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" className="h-20 flex-col gap-2" onClick={handleExportPDF}>
                        <Download className="h-6 w-6" />
                        <span>Export as PDF</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col gap-2" onClick={handleSave}>
                        <FileText className="h-6 w-6" />
                        <span>Save as Draft</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Email & Send */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Document
                    </CardTitle>
                    <CardDescription>
                      Send the document via email with signing instructions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Recipient Email</Label>
                      <Input
                        type="email"
                        placeholder="recipient@example.com"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Email Body</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (docConfig) setEmailBody(generateEmailBody(docConfig));
                            toast.success("Email body regenerated");
                          }}
                        >
                          <Wand2 className="mr-1 h-3 w-3" />
                          Reset Template
                        </Button>
                      </div>
                      <Textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        rows={8}
                      />
                    </div>
                    <Button onClick={handleEmailSend} className="w-full">
                      <Send className="mr-2 h-4 w-4" />
                      Open Email Client
                    </Button>
                  </CardContent>
                </Card>

                {/* Digital Signature */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileSignature className="h-5 w-5" />
                      Digital Signature
                    </CardTitle>
                    <CardDescription>Send for electronic signature via DocuSeal</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Configure DocuSeal integration in Settings to enable digital signatures.
                        Once configured, you can send documents for electronic signature directly from here.
                      </p>
                    </div>
                    <Button disabled className="mt-4">
                      <FileSignature className="mr-2 h-4 w-4" />
                      Send for Signature
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep === 1) {
                setSelectedType(null);
                setCurrentStep(0);
              } else if (currentStep > 0) {
                setCurrentStep((prev) => prev - 1);
              }
            }}
            disabled={isIntroStep}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {currentStep === 1 ? "Back to Types" : "Previous"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {!isIntroStep && (
              isExportStep ? (
                <Button onClick={handleSave}>
                  <Check className="mr-2 h-4 w-4" />
                  Save Document
                </Button>
              ) : (
                <Button onClick={() => setCurrentStep((prev) => prev + 1)}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateEmailBody(docConfig: DocumentTypeConfig): string {
  const typeInstructions: Record<string, string> = {
    statement_of_work: `Please find attached the Statement of Work (SOW) for your review. This document outlines the project scope, deliverables, timeline, and commercial terms for our engagement.

Instructions:
1. Please review all sections carefully, paying particular attention to the scope of work and deliverables
2. If you have any questions or require modifications, please respond to this email with your comments
3. Once approved, please sign the document and return a copy for our records
4. Both parties should retain a signed copy for their files

The SOW will become effective upon execution by both parties.`,

    nda: `Please find attached the Non-Disclosure Agreement (NDA) for your review and signature. This agreement establishes the terms for protecting confidential information shared between our organizations.

Instructions:
1. Review the definition of Confidential Information to ensure it covers the intended scope
2. Note the term and survival period of the confidentiality obligations
3. Sign and date the agreement on the signature page
4. Return a signed copy via email or secure document sharing
5. Store the executed agreement in a secure location for future reference

This NDA must be executed before any confidential information is exchanged.`,

    contract: `Please find attached the Service Contract for your review and execution. This contract formalizes our service engagement and outlines the terms, scope, compensation, and legal provisions.

Instructions:
1. Review all sections, especially the scope of services and compensation terms
2. Verify the contract dates and termination provisions
3. Have authorized signatories execute the agreement
4. Return a fully executed copy for our records
5. File the executed contract per your organization's document retention policy

Services will commence upon full execution of this contract.`,

    agreement: `Please find attached the Agreement for your review and signature. This document establishes the terms and conditions for our collaboration.

Instructions:
1. Review the purpose, responsibilities, and terms carefully
2. Ensure all party information is accurate
3. Sign and date the agreement
4. Return a signed copy and retain one for your records`,

    mou: `Please find attached the Memorandum of Understanding (MOU) for your review. This document formalizes our intent to collaborate and outlines shared objectives and commitments.

Instructions:
1. Review the shared objectives and commitments for accuracy
2. Confirm the governance structure and meeting schedule
3. Note that this MOU is a statement of intent (non-binding unless specified)
4. Sign and return a copy to formalize the partnership
5. Schedule an initial steering committee meeting upon execution`,

    slea: `Please find attached the Site Level Execution Agreement (SLEA) for your review. This agreement defines the specific terms for work to be performed at the designated site.

Instructions:
1. Review the site-specific scope and safety requirements carefully
2. Ensure all site contacts and access information is accurate
3. Verify the performance metrics and schedule
4. Have the site manager and authorized signatory execute the agreement
5. Distribute copies to all relevant site personnel
6. Complete required safety orientations before work commences`,

    msa: `Please find attached the Master Service Agreement (MSA) for your review and execution. This agreement establishes the overarching terms and conditions that will govern our service relationship.

Instructions:
1. Review all terms, especially service standards and financial provisions
2. Note that individual Statements of Work (SOWs) will be executed under this MSA
3. Have your legal team review the liability and indemnification provisions
4. Execute the agreement and return a signed copy
5. File the MSA as the governing document for all future SOWs`,
  };

  return `Dear [Recipient Name],

${typeInstructions[docConfig.type] || `Please find attached the ${docConfig.title} for your review and signature.

Instructions:
1. Review all sections carefully
2. Sign and date the document
3. Return a signed copy for our records`}

Please do not hesitate to reach out if you have any questions or need clarification on any provisions.

Best regards,
[Your Name]
[Your Title]
[Your Organization]`;
}
