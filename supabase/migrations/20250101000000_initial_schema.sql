-- ============================================================================
-- Adams Platform - Supabase Schema Migration
-- ============================================================================
-- This migration creates the complete database schema for the Adams Platform
-- Converted from Firestore schema to PostgreSQL for Supabase
-- ============================================================================

-- Create Adams schema
CREATE SCHEMA IF NOT EXISTS adams;

-- Set search path to Adams schema
SET search_path TO adams, public;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'team', 'affiliate', 'consultant')),
    avatar TEXT,
    phone TEXT,
    title TEXT,
    company TEXT,
    location TEXT,
    bio TEXT,
    linked_in TEXT,
    website TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    capabilities TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    industry TEXT,
    size TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'USA',
    phone TEXT,
    email TEXT,
    description TEXT,
    logo_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
    contact_ids UUID[],
    capability_ids UUID[],
    certification_ids UUID[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Opportunities table
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    stage TEXT NOT NULL CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    value DECIMAL(12, 2),
    probability INTEGER CHECK (probability >= 0 AND probability <= 100),
    expected_close_date TIMESTAMPTZ,
    assigned_affiliate_ids UUID[],
    service_ids UUID[],
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    team_ids UUID[],
    budget DECIMAL(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meetings table
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    duration INTEGER, -- minutes
    location TEXT,
    meeting_type TEXT CHECK (meeting_type IN ('virtual', 'in-person', 'hybrid')),
    attendee_ids UUID[],
    agenda TEXT,
    notes TEXT,
    recording_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Action Items table
CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    entity_type TEXT,
    entity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rocks (90-day goals) table
CREATE TABLE rocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'on-track' CHECK (status IN ('on-track', 'at-risk', 'off-track', 'complete')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    quarter TEXT NOT NULL,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    file_type TEXT,
    file_size BIGINT,
    storage_path TEXT NOT NULL,
    download_url TEXT,
    uploaded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type TEXT,
    entity_id UUID,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Activities (audit log) table
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    entity_name TEXT,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Milestones table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
    due_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Rock Milestones table
CREATE TABLE rock_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rock_id UUID REFERENCES rocks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Certifications table
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    issuing_body TEXT,
    certification_number TEXT,
    date_obtained TIMESTAMPTZ,
    expiration_date TIMESTAMPTZ,
    status TEXT CHECK (status IN ('active', 'expired', 'pending')),
    document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Capabilities table
CREATE TABLE capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    proficiency_level TEXT CHECK (proficiency_level IN ('basic', 'intermediate', 'advanced', 'expert')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ============================================================================
-- TRACTION/EOS SYSTEM TABLES
-- ============================================================================

-- Traction Team Members table
CREATE TABLE traction_team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('team', 'contractor', 'advisor', 'other')),
    gets_it BOOLEAN,
    wants_it BOOLEAN,
    capacity_to_do_it BOOLEAN,
    right_seat BOOLEAN,
    email TEXT,
    phone TEXT,
    avatar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Traction Rocks table
CREATE TABLE traction_rocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES traction_team_members(id) ON DELETE SET NULL,
    owner_name TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'on-track' CHECK (status IN ('on-track', 'at-risk', 'off-track', 'complete')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    quarter TEXT NOT NULL,
    milestones JSONB,
    linked_issue_ids UUID[],
    linked_todo_ids UUID[],
    linked_metric_ids UUID[],
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Traction Scorecard Metrics table
CREATE TABLE traction_scorecard_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    goal DECIMAL(12, 2) NOT NULL,
    actual DECIMAL(12, 2) NOT NULL,
    owner_id UUID REFERENCES traction_team_members(id) ON DELETE SET NULL,
    owner_name TEXT NOT NULL,
    trend TEXT CHECK (trend IN ('up', 'down', 'flat')),
    unit TEXT,
    week_number INTEGER,
    year INTEGER,
    linked_rock_ids UUID[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Traction Issues table
CREATE TABLE traction_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    identified_date TIMESTAMPTZ NOT NULL,
    owner_id UUID REFERENCES traction_team_members(id) ON DELETE SET NULL,
    owner_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'solved')),
    solved_date TIMESTAMPTZ,
    linked_rock_id UUID,
    linked_todo_ids UUID[],
    meeting_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Traction Todos table
CREATE TABLE traction_todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES traction_team_members(id) ON DELETE SET NULL,
    owner_name TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'complete')),
    completed_date TIMESTAMPTZ,
    linked_rock_id UUID,
    linked_issue_id UUID,
    meeting_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Traction Meetings (Level 10) table
CREATE TABLE traction_meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    date TIMESTAMPTZ NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    attendee_ids UUID[],
    attendee_names TEXT[],
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    issues_solved INTEGER DEFAULT 0,
    rocks_reviewed BOOLEAN DEFAULT false,
    scorecard_reviewed BOOLEAN DEFAULT false,
    todo_completion_rate INTEGER CHECK (todo_completion_rate >= 0 AND todo_completion_rate <= 100),
    reviewed_rock_ids UUID[],
    solved_issue_ids UUID[],
    created_todo_ids UUID[],
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AFFILIATE NETWORKING SYSTEM TABLES
-- ============================================================================

-- Affiliate Biographies table
CREATE TABLE affiliate_biographies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    profession TEXT NOT NULL,
    location TEXT NOT NULL,
    years_in_business INTEGER,
    previous_jobs TEXT[],
    spouse TEXT,
    children TEXT,
    pets TEXT,
    hobbies TEXT[],
    activities_of_interest TEXT[],
    city_of_residence TEXT NOT NULL,
    years_in_city INTEGER,
    burning_desire TEXT,
    unique_fact TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GAINS Profiles table
CREATE TABLE gains_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID REFERENCES users(id) ON DELETE CASCADE,
    goals TEXT,
    accomplishments TEXT,
    interests TEXT,
    networks TEXT,
    skills TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact Spheres table
CREATE TABLE contact_spheres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sphere_name TEXT NOT NULL,
    members JSONB,
    top_professions_needed JSONB,
    commitment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Previous Customers table
CREATE TABLE previous_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID REFERENCES users(id) ON DELETE CASCADE,
    customers JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One-to-One Meetings table
CREATE TABLE one_to_one_meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initiator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scheduled_date TIMESTAMPTZ NOT NULL,
    scheduled_time TEXT NOT NULL,
    duration INTEGER DEFAULT 60,
    meeting_type TEXT NOT NULL CHECK (meeting_type IN ('virtual', 'in-person')),
    location TEXT,
    virtual_platform TEXT CHECK (virtual_platform IN ('zoom', 'teams', 'google-meet', 'other')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
    agenda_items TEXT[],
    worksheets_shared BOOLEAN DEFAULT false,
    meeting_notes TEXT,
    short_term_referral_commitment TEXT,
    long_term_referral_commitment TEXT,
    adams_referral_discussed BOOLEAN DEFAULT false,
    adams_referral_details TEXT,
    follow_up_date TIMESTAMPTZ,
    follow_up_completed BOOLEAN DEFAULT false,
    follow_up_notes TEXT,
    next_meeting_scheduled BOOLEAN DEFAULT false,
    next_meeting_date TIMESTAMPTZ,
    match_score INTEGER,
    match_reasons TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referrals table
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    one_to_one_meeting_id UUID REFERENCES one_to_one_meetings(id) ON DELETE SET NULL,
    referral_type TEXT NOT NULL CHECK (referral_type IN ('short-term', 'long-term')),
    prospect_name TEXT NOT NULL,
    prospect_company TEXT,
    prospect_email TEXT,
    prospect_phone TEXT,
    prospect_title TEXT,
    description TEXT,
    why_good_fit TEXT,
    is_adams_referral BOOLEAN DEFAULT false,
    adams_service_interest TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'contacted', 'meeting-scheduled', 'proposal', 'negotiation', 'won', 'lost')),
    deal_value DECIMAL(12, 2),
    deal_closed_date TIMESTAMPTZ,
    lost_reason TEXT,
    last_contact_date TIMESTAMPTZ,
    contact_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Affiliate Stats table
CREATE TABLE affiliate_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    biography_complete BOOLEAN DEFAULT false,
    gains_profile_complete BOOLEAN DEFAULT false,
    contact_sphere_complete BOOLEAN DEFAULT false,
    customers_list_complete BOOLEAN DEFAULT false,
    profile_completion_percent INTEGER DEFAULT 0,
    total_one_to_ones_scheduled INTEGER DEFAULT 0,
    total_one_to_ones_completed INTEGER DEFAULT 0,
    one_to_ones_this_month INTEGER DEFAULT 0,
    one_to_ones_this_quarter INTEGER DEFAULT 0,
    last_one_to_one_date TIMESTAMPTZ,
    referrals_given INTEGER DEFAULT 0,
    referrals_received INTEGER DEFAULT 0,
    referrals_given_this_month INTEGER DEFAULT 0,
    referrals_received_this_month INTEGER DEFAULT 0,
    deals_closed_from_referrals_given INTEGER DEFAULT 0,
    deals_closed_from_referrals_received INTEGER DEFAULT 0,
    total_revenue_generated DECIMAL(12, 2) DEFAULT 0,
    total_revenue_received DECIMAL(12, 2) DEFAULT 0,
    adams_referrals_given INTEGER DEFAULT 0,
    adams_referrals_closed INTEGER DEFAULT 0,
    adams_revenue_generated DECIMAL(12, 2) DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    current_one_to_one_streak INTEGER DEFAULT 0,
    longest_one_to_one_streak INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Match Suggestions table
CREATE TABLE ai_match_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID REFERENCES users(id) ON DELETE CASCADE,
    suggested_partner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    reasons JSONB,
    talking_points TEXT[],
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    last_meeting_date TIMESTAMPTZ,
    days_since_last_meeting INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- ============================================================================
-- STRATEGIC PARTNERS & TEAM MEMBERS
-- ============================================================================

-- Strategic Partners table
CREATE TABLE strategic_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    company TEXT NOT NULL,
    website TEXT NOT NULL,
    expertise TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    linked_in TEXT,
    logo TEXT,
    notes TEXT,
    zoom_recordings JSONB,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    is_client BOOLEAN DEFAULT false,
    client_since TIMESTAMPTZ,
    client_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team Members table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email_primary TEXT UNIQUE NOT NULL,
    email_secondary TEXT,
    mobile TEXT,
    expertise TEXT NOT NULL,
    title TEXT,
    company TEXT,
    location TEXT,
    bio TEXT,
    avatar TEXT,
    linked_in TEXT,
    website TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'team', 'affiliate', 'consultant')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    is_ceo BOOLEAN DEFAULT false,
    is_coo BOOLEAN DEFAULT false,
    is_cto BOOLEAN DEFAULT false,
    is_cro BOOLEAN DEFAULT false,
    is_client BOOLEAN DEFAULT false,
    client_since TIMESTAMPTZ,
    client_notes TEXT,
    mattermost_user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CALENDAR & SCHEDULING
-- ============================================================================

-- Calendar Events table
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT false,
    type TEXT NOT NULL CHECK (type IN ('meeting', 'rock', 'todo', 'issue', 'custom', 'one-to-one')),
    color TEXT,
    attendees UUID[],
    location TEXT,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly')),
    recurring_until TIMESTAMPTZ,
    recurring_parent_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    ghl_event_id TEXT,
    synced_to_ghl BOOLEAN DEFAULT false,
    rock_id UUID,
    todo_id UUID,
    issue_id UUID,
    meeting_id UUID,
    one_to_one_queue_item_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One-to-One Queue table
CREATE TABLE one_to_one_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
    team_member_name TEXT NOT NULL,
    team_member_email TEXT NOT NULL,
    team_member_expertise TEXT,
    team_member_avatar TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'scheduled', 'completed', 'cancelled')),
    scheduled_date TIMESTAMPTZ,
    scheduled_time TEXT,
    duration INTEGER,
    location TEXT,
    meeting_type TEXT CHECK (meeting_type IN ('virtual', 'in-person')),
    calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
    notes TEXT,
    priority INTEGER DEFAULT 0,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    added_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Team Member Availability table
CREATE TABLE team_member_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE UNIQUE,
    team_member_name TEXT NOT NULL,
    team_member_email TEXT NOT NULL,
    booking_slug TEXT UNIQUE NOT NULL,
    booking_title TEXT,
    booking_description TEXT,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    weekly_availability JSONB,
    default_meeting_duration INTEGER DEFAULT 60,
    allowed_durations INTEGER[],
    buffer_between_meetings INTEGER DEFAULT 0,
    max_advance_booking_days INTEGER DEFAULT 30,
    min_advance_booking_hours INTEGER DEFAULT 24,
    meeting_types JSONB,
    blocked_dates JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
    team_member_name TEXT NOT NULL,
    team_member_email TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    client_company TEXT,
    client_notes TEXT,
    meeting_type_id TEXT,
    meeting_type_name TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration INTEGER NOT NULL,
    timezone TEXT NOT NULL,
    is_virtual BOOLEAN DEFAULT true,
    location TEXT,
    video_link TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no-show')),
    calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
    confirmation_email_sent BOOLEAN DEFAULT false,
    reminder_email_sent BOOLEAN DEFAULT false,
    booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events table (public events/webinars)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    timezone TEXT,
    is_all_day BOOLEAN DEFAULT false,
    location_type TEXT NOT NULL CHECK (location_type IN ('virtual', 'in-person', 'hybrid')),
    location TEXT,
    virtual_link TEXT,
    registration_url TEXT,
    registration_deadline TIMESTAMPTZ,
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    image_url TEXT,
    category TEXT CHECK (category IN ('webinar', 'workshop', 'conference', 'networking', 'training', 'other')),
    tags TEXT[],
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
    is_featured BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Book Call Leads table
CREATE TABLE book_call_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    job_title TEXT,
    preferred_date TEXT,
    preferred_time TEXT,
    timezone TEXT,
    message TEXT,
    source TEXT NOT NULL CHECK (source IN ('contact-page', 'cta', 'popup', 'other')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'cancelled')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name TEXT,
    notes TEXT,
    scheduled_call_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INTEGRATION TABLES
-- ============================================================================

-- Platform Settings table
CREATE TABLE platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    social_links JSONB,
    integrations JSONB,
    llm_config JSONB,
    webhook_events JSONB,
    notification_settings JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Apollo Purchased Contacts table
CREATE TABLE apollo_purchased_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apollo_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    company_id TEXT,
    location TEXT,
    industry TEXT,
    company_size TEXT,
    email TEXT,
    phone TEXT,
    linked_in TEXT,
    email_purchased BOOLEAN DEFAULT false,
    phone_purchased BOOLEAN DEFAULT false,
    email_purchased_at TIMESTAMPTZ,
    phone_purchased_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apollo Saved Lists table
CREATE TABLE apollo_saved_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    contacts JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ThomasNet Saved Suppliers table
CREATE TABLE thomasnet_saved_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thomasnet_id TEXT,
    company_name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    phone TEXT,
    website TEXT,
    categories TEXT[],
    certifications TEXT[],
    annual_revenue TEXT,
    employee_count TEXT,
    year_founded TEXT,
    thomasnet_url TEXT,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- ThomasNet Saved Lists table
CREATE TABLE thomasnet_saved_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    suppliers JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GoHighLevel Integrations table
CREATE TABLE gohighlevel_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_token TEXT NOT NULL,
    location_id TEXT NOT NULL,
    agency_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sync_contacts BOOLEAN DEFAULT true,
    sync_opportunities BOOLEAN DEFAULT true,
    sync_calendars BOOLEAN DEFAULT true,
    sync_pipelines BOOLEAN DEFAULT true,
    sync_campaigns BOOLEAN DEFAULT true,
    contact_mapping JSONB,
    default_pipeline_id TEXT,
    default_stage_id TEXT,
    webhook_url TEXT,
    webhook_secret TEXT,
    enable_webhooks BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error', 'pending', 'never')),
    last_sync_error TEXT,
    total_contacts_synced INTEGER DEFAULT 0,
    total_opportunities_synced INTEGER DEFAULT 0,
    rate_limit_remaining INTEGER,
    rate_limit_reset TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GoHighLevel Sync Logs table
CREATE TABLE gohighlevel_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID REFERENCES gohighlevel_integrations(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('contacts', 'opportunities', 'calendars', 'pipelines', 'campaigns', 'full')),
    status TEXT NOT NULL CHECK (status IN ('started', 'in_progress', 'completed', 'failed')),
    records_processed INTEGER DEFAULT 0,
    records_successful INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration INTEGER,
    errors JSONB,
    summary JSONB,
    triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'event')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GoHighLevel Workflows table
CREATE TABLE ghl_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    workflow JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'deployed', 'archived')),
    ghl_workflow_id TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deployed_at TIMESTAMPTZ
);

-- GoHighLevel Imported Workflows table
CREATE TABLE ghl_imported_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ghl_workflow_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT,
    original_format JSONB,
    trigger JSONB,
    actions JSONB,
    plain_language_prompt TEXT,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    location_id TEXT NOT NULL
);

-- DocuSeal Templates table
CREATE TABLE docuseal_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    docuseal_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('nda', 'engagement', 'supplier_qualification', 'msa', 'sow', 'other')),
    fields JSONB,
    submitter_roles TEXT[],
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DocuSeal Submissions table
CREATE TABLE docuseal_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    docuseal_submission_id INTEGER UNIQUE NOT NULL,
    template_id UUID REFERENCES docuseal_templates(id) ON DELETE SET NULL,
    template_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'viewed', 'completed', 'declined', 'expired')),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    organization_name TEXT,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    submitters JSONB,
    combined_document_url TEXT,
    audit_log_url TEXT,
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mattermost Playbooks table
CREATE TABLE mattermost_playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mattermost_playbook_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    team_id TEXT NOT NULL,
    team_name TEXT,
    type TEXT NOT NULL CHECK (type IN ('reminder', 'rock', 'level10', 'recurring', 'custom')),
    recurrence TEXT CHECK (recurrence IN ('daily', 'weekly', 'biweekly', 'monthly')),
    assigned_member_ids UUID[],
    mattermost_member_ids TEXT[],
    checklists JSONB,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
    notifications_enabled BOOLEAN DEFAULT true,
    broadcast_channel_id TEXT,
    reminder_interval_seconds INTEGER,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_deployed_at TIMESTAMPTZ
);

-- Mattermost Playbook Runs table
CREATE TABLE mattermost_playbook_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mattermost_run_id TEXT UNIQUE NOT NULL,
    playbook_id UUID REFERENCES mattermost_playbooks(id) ON DELETE SET NULL,
    mattermost_playbook_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    team_id TEXT NOT NULL,
    channel_id TEXT,
    owner_user_id TEXT NOT NULL,
    owner_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'finished', 'archived')),
    current_status TEXT,
    checklist_progress JSONB,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0,
    assigned_member_ids UUID[],
    mattermost_member_ids TEXT[],
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_status_update TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SOFTWARE LICENSING & WHITE-LABEL DEPLOYMENTS
-- ============================================================================

-- Software Keys table
CREATE TABLE software_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    tools TEXT[],
    assigned_to TEXT,
    assigned_to_name TEXT,
    assigned_to_email TEXT,
    assignment_type TEXT CHECK (assignment_type IN ('user', 'organization', 'affiliate')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'revoked')),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    max_activations INTEGER,
    current_activations INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- Key Activations table
CREATE TABLE key_activations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id UUID REFERENCES software_keys(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- White-Label Deployments table
CREATE TABLE white_label_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'provisioning', 'active', 'suspended', 'terminated')),
    branding JSONB NOT NULL,
    domains JSONB NOT NULL,
    infrastructure JSONB NOT NULL,
    license JSONB NOT NULL,
    features JSONB NOT NULL,
    owner JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    provisioned_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    notes TEXT
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Organizations indexes
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_name ON organizations(name);

-- Opportunities indexes
CREATE INDEX idx_opportunities_organization_id ON opportunities(organization_id);
CREATE INDEX idx_opportunities_owner_id ON opportunities(owner_id);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_org_stage ON opportunities(organization_id, stage);
CREATE INDEX idx_opportunities_owner_close_date ON opportunities(owner_id, expected_close_date);

-- Projects indexes
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_org_status ON projects(organization_id, status);

-- Meetings indexes
CREATE INDEX idx_meetings_date ON meetings(date);

-- Action Items indexes
CREATE INDEX idx_action_items_assignee_id ON action_items(assignee_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_assignee_status_due ON action_items(assignee_id, status, due_date);

-- Rocks indexes
CREATE INDEX idx_rocks_owner_id ON rocks(owner_id);
CREATE INDEX idx_rocks_quarter ON rocks(quarter);
CREATE INDEX idx_rocks_owner_quarter ON rocks(owner_id, quarter);

-- Activities indexes
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_entity_created ON activities(entity_type, entity_id, created_at);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);

-- Notes indexes
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX idx_notes_author_id ON notes(author_id);

-- Milestones indexes
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_milestones_status ON milestones(status);

-- Rock Milestones indexes
CREATE INDEX idx_rock_milestones_rock_id ON rock_milestones(rock_id);

-- Certifications indexes
CREATE INDEX idx_certifications_organization_id ON certifications(organization_id);

-- Capabilities indexes
CREATE INDEX idx_capabilities_organization_id ON capabilities(organization_id);

-- Traction indexes
CREATE INDEX idx_traction_rocks_owner_id ON traction_rocks(owner_id);
CREATE INDEX idx_traction_rocks_quarter ON traction_rocks(quarter);
CREATE INDEX idx_traction_issues_status ON traction_issues(status);
CREATE INDEX idx_traction_todos_owner_id ON traction_todos(owner_id);
CREATE INDEX idx_traction_todos_status ON traction_todos(status);

-- Affiliate indexes
CREATE INDEX idx_affiliate_biographies_affiliate_id ON affiliate_biographies(affiliate_id);
CREATE INDEX idx_gains_profiles_affiliate_id ON gains_profiles(affiliate_id);
CREATE INDEX idx_contact_spheres_affiliate_id ON contact_spheres(affiliate_id);
CREATE INDEX idx_one_to_one_meetings_initiator ON one_to_one_meetings(initiator_id);
CREATE INDEX idx_one_to_one_meetings_partner ON one_to_one_meetings(partner_id);
CREATE INDEX idx_one_to_one_meetings_status ON one_to_one_meetings(status);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_recipient_id ON referrals(recipient_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- Calendar indexes
CREATE INDEX idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX idx_calendar_events_type ON calendar_events(type);

-- Team Member Availability indexes
CREATE INDEX idx_team_member_availability_slug ON team_member_availability(booking_slug);

-- Bookings indexes
CREATE INDEX idx_bookings_team_member_id ON bookings(team_member_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(date);

-- Integration indexes
CREATE INDEX idx_apollo_contacts_apollo_id ON apollo_purchased_contacts(apollo_id);
CREATE INDEX idx_ghl_integrations_active ON gohighlevel_integrations(is_active);
CREATE INDEX idx_ghl_sync_logs_integration_id ON gohighlevel_sync_logs(integration_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (customize based on your authentication setup)
-- Note: These policies are commented out by default since auth.uid() requires Supabase Auth
-- Uncomment and customize after setting up authentication

-- Users can read their own data
-- CREATE POLICY "Users can view own data" ON users
--     FOR SELECT USING (auth.uid()::text = firebase_uid);

-- Users can update their own data
-- CREATE POLICY "Users can update own data" ON users
--     FOR UPDATE USING (auth.uid()::text = firebase_uid);

-- Admin users can view all data (you'll need to implement admin check)
-- CREATE POLICY "Admins can view all users" ON users
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM users 
--             WHERE firebase_uid = auth.uid()::text 
--             AND role = 'admin'
--         )
--     );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_items_updated_at BEFORE UPDATE ON action_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rocks_updated_at BEFORE UPDATE ON rocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_traction_rocks_updated_at BEFORE UPDATE ON traction_rocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_traction_team_members_updated_at BEFORE UPDATE ON traction_team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_biographies_updated_at BEFORE UPDATE ON affiliate_biographies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- Insert default platform settings
INSERT INTO platform_settings (id, social_links, integrations, notification_settings)
VALUES (
    uuid_generate_v4(),
    '{"linkedin": {"url": "", "visible": true}}'::jsonb,
    '{}'::jsonb,
    '{"syncWithMattermost": false, "inAppEnabled": true, "browserEnabled": true, "soundEnabled": true}'::jsonb
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration creates the complete database schema for the Adams Platform
-- Next steps:
-- 1. Review and customize RLS policies based on your authentication setup
-- 2. Add any additional custom functions or triggers
-- 3. Migrate existing data from Firestore (if applicable)
-- 4. Test all queries and relationships
-- ============================================================================
