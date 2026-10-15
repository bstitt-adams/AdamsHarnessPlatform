-- ============================================================================
-- Adams Platform - Target Companies Database Migration
-- ============================================================================
-- This migration creates the target companies table for Adams Electric
-- prospect management and outreach tracking
-- ============================================================================

-- Set search path to Adams schema
SET search_path TO adams, public;

-- ============================================================================
-- TARGET COMPANIES TABLE
-- ============================================================================

-- Target Companies table for prospect management
CREATE TABLE IF NOT EXISTS target_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Company Information
    company_name TEXT NOT NULL,
    industry TEXT NOT NULL,
    sub_industry TEXT,
    
    -- Location
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT,
    address TEXT,
    
    -- Company Size
    employee_count INTEGER,
    employee_range TEXT, -- e.g., "25-50", "50-100"
    estimated_revenue DECIMAL(12, 2),
    revenue_range TEXT, -- e.g., "$1M-$5M"
    
    -- Contact Information
    primary_contact_name TEXT,
    primary_contact_title TEXT,
    primary_contact_email TEXT,
    primary_contact_phone TEXT,
    primary_contact_linkedin TEXT,
    
    secondary_contact_name TEXT,
    secondary_contact_title TEXT,
    secondary_contact_email TEXT,
    secondary_contact_phone TEXT,
    
    -- Decision Maker
    decision_maker_name TEXT,
    decision_maker_title TEXT,
    decision_maker_email TEXT,
    decision_maker_phone TEXT,
    
    -- Company Details
    website TEXT,
    linkedin_url TEXT,
    year_founded INTEGER,
    company_description TEXT,
    
    -- Pain Points & Needs
    pain_points TEXT[], -- Array of identified pain points
    trigger_events TEXT[], -- Events that might trigger need for services
    service_interests TEXT[], -- Which Adams Electric services they might need
    
    -- Prioritization
    tier INTEGER NOT NULL DEFAULT 3 CHECK (tier >= 1 AND tier <= 3), -- 1=Immediate, 2=Follow-up, 3=Nurture
    priority_score INTEGER DEFAULT 0 CHECK (priority_score >= 0 AND priority_score <= 100),
    ideal_customer_fit BOOLEAN DEFAULT false,
    
    -- Owner/Founder Details
    owner_name TEXT,
    owner_age_range TEXT, -- e.g., "50-55", "55-60", "60+"
    growth_need_level TEXT CHECK (growth_need_level IN ('high', 'medium', 'low', 'unknown')),
    project_timeline_years INTEGER,
    
    -- Outreach Status
    outreach_status TEXT NOT NULL DEFAULT 'not_started' CHECK (outreach_status IN (
        'not_started', 
        'researching', 
        'initial_contact', 
        'follow_up', 
        'meeting_scheduled', 
        'meeting_completed', 
        'proposal_sent', 
        'negotiating', 
        'won', 
        'lost', 
        'nurturing',
        'not_interested',
        'bad_timing'
    )),
    
    -- Outreach Tracking
    first_contact_date TIMESTAMPTZ,
    last_contact_date TIMESTAMPTZ,
    next_follow_up_date TIMESTAMPTZ,
    contact_attempts INTEGER DEFAULT 0,
    
    -- Engagement
    quiz_completed BOOLEAN DEFAULT false,
    quiz_completed_date TIMESTAMPTZ,
    quiz_score INTEGER,
    
    strategy_call_scheduled BOOLEAN DEFAULT false,
    strategy_call_date TIMESTAMPTZ,
    strategy_call_notes TEXT,
    
    -- Deal Information
    deal_value DECIMAL(12, 2),
    deal_closed_date TIMESTAMPTZ,
    lost_reason TEXT,
    
    -- Source & Attribution
    lead_source TEXT, -- How we found them
    referral_source TEXT, -- Who referred them
    campaign_source TEXT, -- Which campaign
    
    -- Notes & Activity
    notes TEXT,
    internal_notes TEXT, -- Private notes not shared with client
    tags TEXT[],
    
    -- Assignment
    assigned_to UUID,
    assigned_to_name TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    last_modified_by UUID
);

-- ============================================================================
-- OUTREACH ACTIVITIES TABLE
-- ============================================================================

-- Track all outreach activities for target companies
CREATE TABLE IF NOT EXISTS target_company_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_company_id UUID REFERENCES target_companies(id) ON DELETE CASCADE,
    
    -- Activity Details
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'email_sent',
        'email_received',
        'phone_call',
        'voicemail',
        'linkedin_message',
        'linkedin_connection',
        'meeting',
        'strategy_call',
        'proposal_sent',
        'contract_sent',
        'note',
        'status_change',
        'quiz_completed',
        'website_visit',
        'content_download',
        'event_attended',
        'referral_received',
        'other'
    )),
    
    subject TEXT,
    description TEXT,
    outcome TEXT,
    
    -- Contact involved
    contact_name TEXT,
    contact_email TEXT,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date TIMESTAMPTZ,
    follow_up_completed BOOLEAN DEFAULT false,
    
    -- Metadata
    performed_by UUID,
    performed_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Target Companies indexes
CREATE INDEX IF NOT EXISTS idx_target_companies_tier ON target_companies(tier);
CREATE INDEX IF NOT EXISTS idx_target_companies_industry ON target_companies(industry);
CREATE INDEX IF NOT EXISTS idx_target_companies_state ON target_companies(state);
CREATE INDEX IF NOT EXISTS idx_target_companies_city ON target_companies(city);
CREATE INDEX IF NOT EXISTS idx_target_companies_outreach_status ON target_companies(outreach_status);
CREATE INDEX IF NOT EXISTS idx_target_companies_next_follow_up ON target_companies(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_target_companies_assigned_to ON target_companies(assigned_to);
CREATE INDEX IF NOT EXISTS idx_target_companies_growth_need ON target_companies(growth_need_level);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_target_company_activities_company ON target_company_activities(target_company_id);
CREATE INDEX IF NOT EXISTS idx_target_company_activities_type ON target_company_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_target_company_activities_date ON target_company_activities(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_target_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_target_companies_updated_at
    BEFORE UPDATE ON target_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_target_companies_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE target_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_company_activities ENABLE ROW LEVEL SECURITY;

-- Policies (adjust based on your auth setup)
-- For now, allow all authenticated users to read/write
CREATE POLICY "Allow all operations for authenticated users" ON target_companies
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON target_company_activities
    FOR ALL USING (true);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Summary view for dashboard
CREATE OR REPLACE VIEW target_companies_summary AS
SELECT 
    tier,
    outreach_status,
    industry,
    state,
    COUNT(*) as company_count,
    SUM(CASE WHEN quiz_completed THEN 1 ELSE 0 END) as quiz_completed_count,
    SUM(CASE WHEN strategy_call_scheduled THEN 1 ELSE 0 END) as calls_scheduled_count,
    SUM(COALESCE(deal_value, 0)) as total_deal_value
FROM target_companies
GROUP BY tier, outreach_status, industry, state;

-- Pipeline view
CREATE OR REPLACE VIEW target_companies_pipeline AS
SELECT 
    outreach_status,
    COUNT(*) as count,
    SUM(COALESCE(deal_value, 0)) as total_value,
    AVG(priority_score) as avg_priority
FROM target_companies
WHERE outreach_status NOT IN ('lost', 'not_interested')
GROUP BY outreach_status
ORDER BY 
    CASE outreach_status
        WHEN 'not_started' THEN 1
        WHEN 'researching' THEN 2
        WHEN 'initial_contact' THEN 3
        WHEN 'follow_up' THEN 4
        WHEN 'meeting_scheduled' THEN 5
        WHEN 'meeting_completed' THEN 6
        WHEN 'proposal_sent' THEN 7
        WHEN 'negotiating' THEN 8
        WHEN 'won' THEN 9
        ELSE 10
    END;

-- Follow-up due view
CREATE OR REPLACE VIEW target_companies_follow_up_due AS
SELECT *
FROM target_companies
WHERE next_follow_up_date <= NOW() + INTERVAL '7 days'
  AND outreach_status NOT IN ('won', 'lost', 'not_interested')
ORDER BY next_follow_up_date ASC;
