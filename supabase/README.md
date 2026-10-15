# Supabase Database Schema

This directory contains the database schema and migrations for the Adams Electric Platform.

## Overview

The Adams Platform uses Supabase (PostgreSQL) as its database backend. This schema has been converted from the original Firestore design to take advantage of PostgreSQL's relational capabilities, ACID compliance, and advanced querying features.

## Directory Structure

```
supabase/
├── migrations/
│   └── 20250101000000_initial_schema.sql   # Initial database schema
└── README.md                                # This file
```

## Database Schema Overview

The database consists of the following main sections:

### Core Business Tables
- **users** - User accounts and profiles
- **organizations** - Client organizations
- **opportunities** - Sales pipeline
- **projects** - Active engagements
- **meetings** - Meeting records
- **action_items** - Tasks and action items
- **rocks** - 90-day goals (EOS methodology)
- **documents** - File metadata
- **activities** - Audit log
- **notes** - Entity notes

### Traction/EOS System
- **traction_team_members** - Team member profiles
- **traction_rocks** - Quarterly priorities
- **traction_scorecard_metrics** - KPI tracking
- **traction_issues** - Issue tracking (IDS)
- **traction_todos** - To-do items
- **traction_meetings** - Level 10 meetings

### Affiliate Networking
- **affiliate_biographies** - Member profiles
- **gains_profiles** - Goals, Accomplishments, Interests, Networks, Skills
- **contact_spheres** - Contact sphere planning
- **previous_customers** - Customer history
- **one_to_one_meetings** - Affiliate meetings
- **referrals** - Referral tracking
- **affiliate_stats** - Engagement metrics
- **ai_match_suggestions** - AI-powered matching

### Calendar & Scheduling
- **calendar_events** - Calendar system
- **one_to_one_queue** - Meeting queue
- **team_member_availability** - Availability settings
- **bookings** - Client bookings
- **events** - Public events/webinars
- **book_call_leads** - Lead capture

### Integrations
- **platform_settings** - System configuration
- **apollo_purchased_contacts** - Apollo.io contacts
- **apollo_saved_lists** - Saved contact lists
- **thomasnet_saved_suppliers** - ThomasNet suppliers
- **thomasnet_saved_lists** - Saved supplier lists
- **gohighlevel_integrations** - GHL integration config
- **gohighlevel_sync_logs** - Sync history
- **ghl_workflows** - AI-generated workflows
- **docuseal_templates** - Document templates
- **docuseal_submissions** - Document submissions
- **mattermost_playbooks** - Playbook definitions
- **mattermost_playbook_runs** - Playbook executions

### Licensing & Deployments
- **software_keys** - License key management
- **key_activations** - Activation tracking
- **white_label_deployments** - Multi-tenant deployments

## Key Features

### 1. Row Level Security (RLS)
All tables have RLS enabled to ensure data security. Policies control:
- User access to their own data
- Organization member access
- Admin privileges
- Affiliate permissions

### 2. Automatic Timestamps
Most tables include:
- `created_at` - Automatically set on insert
- `updated_at` - Automatically updated on modification

### 3. Comprehensive Indexing
Indexes are created for:
- Foreign key relationships
- Frequently queried fields
- Composite queries (e.g., organization + status)
- Date-based queries

### 4. Data Integrity
- Foreign key constraints ensure referential integrity
- Check constraints validate data (e.g., status values, percentages)
- NOT NULL constraints on required fields
- UNIQUE constraints on identifiers

## Migration Instructions

### Quick Start

1. **Create a Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Save your project credentials

2. **Run the Migration**
   - Open the Supabase SQL Editor
   - Copy the contents of `migrations/20250101000000_initial_schema.sql`
   - Paste and execute

3. **Verify**
   - Check the Table Editor to see all tables
   - Test a simple query

### Detailed Instructions

See the [SUPABASE_DEPLOYMENT_GUIDE.md](../SUPABASE_DEPLOYMENT_GUIDE.md) in the root directory for comprehensive deployment instructions.

## Schema Modifications

### Adding a New Table

1. Create a new migration file:
   ```bash
   supabase migration new add_new_table
   ```

2. Write your SQL:
   ```sql
   CREATE TABLE new_table (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ
   );

   -- Add indexes
   CREATE INDEX idx_new_table_name ON new_table(name);

   -- Enable RLS
   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

   -- Add policies
   CREATE POLICY "Users can view new_table"
   ON new_table FOR SELECT
   TO authenticated
   USING (true);
   ```

3. Apply the migration:
   ```bash
   supabase db push
   ```

### Modifying an Existing Table

1. Create a migration:
   ```bash
   supabase migration new modify_existing_table
   ```

2. Write your ALTER statements:
   ```sql
   -- Add a new column
   ALTER TABLE users ADD COLUMN middle_name TEXT;

   -- Modify a column
   ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);

   -- Add a constraint
   ALTER TABLE users ADD CONSTRAINT check_email_format 
     CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');
   ```

3. Apply the migration:
   ```bash
   supabase db push
   ```

## Common Queries

### Get All Opportunities for an Organization
```sql
SELECT o.*, u.name as owner_name
FROM opportunities o
LEFT JOIN users u ON o.owner_id = u.id
WHERE o.organization_id = 'org-uuid-here'
ORDER BY o.created_at DESC;
```

### Get Affiliate Stats with User Info
```sql
SELECT 
  u.name,
  u.email,
  s.profile_completion_percent,
  s.total_one_to_ones_completed,
  s.referrals_given,
  s.engagement_score
FROM affiliate_stats s
JOIN users u ON s.affiliate_id = u.id
WHERE u.role = 'affiliate'
ORDER BY s.engagement_score DESC;
```

### Get Upcoming Calendar Events
```sql
SELECT 
  ce.*,
  array_agg(u.name) as attendee_names
FROM calendar_events ce
LEFT JOIN users u ON u.id = ANY(ce.attendees)
WHERE ce.start_date >= NOW()
  AND ce.start_date <= NOW() + INTERVAL '7 days'
GROUP BY ce.id
ORDER BY ce.start_date ASC;
```

### Get Traction Rocks Progress
```sql
SELECT 
  r.title,
  r.owner_name,
  r.quarter,
  r.status,
  r.progress,
  COUNT(i.id) as related_issues,
  COUNT(t.id) as related_todos
FROM traction_rocks r
LEFT JOIN traction_issues i ON i.linked_rock_id = r.id
LEFT JOIN traction_todos t ON t.linked_rock_id = r.id
WHERE r.status != 'complete'
GROUP BY r.id
ORDER BY r.due_date ASC;
```

## Performance Optimization

### Analyzing Query Performance

Use `EXPLAIN ANALYZE` to understand query performance:

```sql
EXPLAIN ANALYZE
SELECT * FROM opportunities
WHERE organization_id = 'some-uuid'
  AND stage = 'qualified';
```

### Adding Indexes

If you notice slow queries, add indexes:

```sql
-- Single column index
CREATE INDEX idx_table_column ON table_name(column_name);

-- Composite index
CREATE INDEX idx_table_col1_col2 ON table_name(col1, col2);

-- Partial index (for specific conditions)
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';
```

### Monitoring

Use Supabase Dashboard to monitor:
- Query performance
- Table sizes
- Index usage
- Connection pool status

## Backup and Recovery

### Automated Backups

Supabase automatically backs up your database daily. You can:
- View backups in the Dashboard
- Restore from a specific point in time
- Download backup files

### Manual Backup

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Using pg_dump directly
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql
```

### Restore from Backup

```bash
# Using psql
psql -h db.your-project.supabase.co -U postgres -d postgres < backup.sql
```

## Security Best Practices

1. **Never commit credentials**
   - Keep `.env.local` in `.gitignore`
   - Use environment variables for all secrets

2. **Use RLS policies**
   - Enable RLS on all tables
   - Test policies thoroughly
   - Use service role key only server-side

3. **Validate input**
   - Use check constraints
   - Validate on client and server
   - Sanitize user input

4. **Limit permissions**
   - Grant minimum necessary permissions
   - Use anon key for client-side
   - Use service role key sparingly

5. **Monitor access**
   - Review activity logs regularly
   - Set up alerts for suspicious activity
   - Track failed authentication attempts

## Troubleshooting

### Common Issues

**Tables not visible in Table Editor**
- Ensure migration completed successfully
- Check for SQL errors in migration
- Refresh the page

**RLS blocking queries**
- Check policy definitions
- Verify user authentication
- Test with service role key

**Slow queries**
- Add appropriate indexes
- Use `EXPLAIN ANALYZE` to diagnose
- Consider query optimization

**Foreign key violations**
- Ensure referenced records exist
- Check cascade delete settings
- Verify data integrity

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## Support

For issues or questions:
1. Check the [SUPABASE_DEPLOYMENT_GUIDE.md](../SUPABASE_DEPLOYMENT_GUIDE.md)
2. Review [Supabase Documentation](https://supabase.com/docs)
3. Ask in [Supabase Discord](https://discord.supabase.com)
4. Open an issue in this repository

---

**Schema Version**: 1.0  
**Last Updated**: December 2024  
**PostgreSQL Version**: 15+  
**Supabase Version**: 2.x
