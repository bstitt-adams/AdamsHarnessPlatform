#!/usr/bin/env node

/**
 * Automated Schema Deployment Script for EasyPanel Supabase
 * 
 * This script automatically deploys the database schema to your
 * Supabase instance running on EasyPanel.
 * 
 * Usage: node scripts/deploy-schema.js
 * Or: npm run deploy:schema
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

async function deploySchema() {
  logSection('🚀 Adams Platform - Schema Deployment to EasyPanel Supabase');

  // Validate environment variables
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    log('❌ ERROR: DATABASE_URL not found in .env.local', 'red');
    log('\nPlease add your database connection string:', 'yellow');
    log('DATABASE_URL=postgresql://postgres:password@host:5432/postgres', 'cyan');
    process.exit(1);
  }

  log('📋 Configuration:', 'blue');
  console.log(`   Database: ${databaseUrl.replace(/:[^:]*@/, ':****@')}`);

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250101000000_initial_schema.sql');
  
  if (!fs.existsSync(migrationPath)) {
    log(`❌ ERROR: Migration file not found at ${migrationPath}`, 'red');
    process.exit(1);
  }

  log('\n📂 Reading migration file...', 'blue');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  log(`   ✓ Loaded ${migrationSQL.length.toLocaleString()} characters`, 'green');

  // Connect to database
  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    logSection('🔌 Connecting to Database');
    await client.connect();
    log('✅ Connected successfully!', 'green');

    // Check PostgreSQL version
    const versionResult = await client.query('SELECT version()');
    log(`\n📊 PostgreSQL Version:`, 'blue');
    console.log(`   ${versionResult.rows[0].version.split(',')[0]}`);

    // Check if schema already exists
    logSection('🔍 Checking Existing Schema');
    const tableCheckResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const existingTableCount = parseInt(tableCheckResult.rows[0].count);
    
    if (existingTableCount > 0) {
      log(`⚠️  Warning: Found ${existingTableCount} existing tables`, 'yellow');
      log('\nOptions:', 'yellow');
      log('1. Continue anyway (may cause errors if tables exist)', 'yellow');
      log('2. Drop all tables first (DESTRUCTIVE - will delete all data)', 'yellow');
      log('3. Cancel deployment', 'yellow');
      
      // For automated deployment, we'll continue with CREATE IF NOT EXISTS logic
      log('\n▶️  Continuing with deployment (using IF NOT EXISTS clauses)...', 'cyan');
    } else {
      log('✓ No existing tables found - clean slate', 'green');
    }

    // Execute migration
    logSection('⚡ Executing Migration');
    log('This may take 30-60 seconds...', 'cyan');
    
    const startTime = Date.now();
    
    try {
      await client.query(migrationSQL);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      log(`\n✅ Migration completed successfully in ${duration}s!`, 'green');
    } catch (error) {
      log('\n❌ Migration failed!', 'red');
      log(`\nError: ${error.message}`, 'red');
      
      if (error.message.includes('already exists')) {
        log('\n💡 Tip: Some objects already exist. This might be okay.', 'yellow');
        log('   Check the Table Editor to verify your schema.', 'yellow');
      }
      
      throw error;
    }

    // Verify deployment
    logSection('✓ Verifying Deployment');
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(r => r.table_name);
    log(`📊 Total tables created: ${tables.length}`, 'green');
    
    // Show sample of tables
    log('\n📋 Sample of created tables:', 'blue');
    tables.slice(0, 10).forEach(table => {
      console.log(`   • ${table}`);
    });
    if (tables.length > 10) {
      console.log(`   ... and ${tables.length - 10} more`);
    }

    // Check indexes
    const indexResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    log(`\n🔍 Total indexes created: ${indexResult.rows[0].count}`, 'green');

    // Check functions
    const functionResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
    `);
    log(`⚙️  Total functions created: ${functionResult.rows[0].count}`, 'green');

    // Verify critical tables
    logSection('🔐 Verifying Critical Tables');
    const criticalTables = [
      'users',
      'organizations',
      'opportunities',
      'projects',
      'traction_rocks',
      'affiliate_biographies',
      'calendar_events'
    ];

    for (const tableName of criticalTables) {
      const result = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tableName]);
      
      const columnCount = parseInt(result.rows[0].count);
      if (columnCount > 0) {
        log(`✓ ${tableName.padEnd(25)} (${columnCount} columns)`, 'green');
      } else {
        log(`✗ ${tableName.padEnd(25)} NOT FOUND!`, 'red');
      }
    }

    // Test data insertion
    logSection('🧪 Testing Database Operations');
    
    try {
      // Test insert
      await client.query(`
        INSERT INTO platform_settings (id, social_links, integrations, notification_settings)
        VALUES (
          gen_random_uuid(),
          '{"linkedin": {"url": "", "visible": true}}'::jsonb,
          '{}'::jsonb,
          '{"syncWithMattermost": false, "inAppEnabled": true}'::jsonb
        )
        ON CONFLICT DO NOTHING
      `);
      log('✓ Insert test passed', 'green');

      // Test select
      const selectResult = await client.query('SELECT COUNT(*) FROM platform_settings');
      log(`✓ Select test passed (${selectResult.rows[0].count} rows)`, 'green');
      
    } catch (error) {
      log(`⚠️  Warning: Test operations failed: ${error.message}`, 'yellow');
    }

    // Final summary
    logSection('🎉 Deployment Complete!');
    log('Your Supabase database is ready to use.', 'green');
    log('\nNext steps:', 'cyan');
    console.log('  1. Verify tables in Supabase Table Editor');
    console.log('  2. Test connection: npm run test:db');
    console.log('  3. Configure authentication in Supabase dashboard');
    console.log('  4. Set up storage buckets');
    console.log('  5. Start your application: npm run dev');
    
    log('\n📚 Documentation:', 'blue');
    console.log('  • EasyPanel Setup: EASYPANEL_SUPABASE_SETUP.md');
    console.log('  • Full Guide: SUPABASE_DEPLOYMENT_GUIDE.md');
    console.log('  • Quick Start: SUPABASE_QUICK_START.md');

  } catch (error) {
    logSection('❌ Deployment Failed');
    log(`Error: ${error.message}`, 'red');
    
    if (error.code) {
      log(`\nError Code: ${error.code}`, 'red');
    }
    
    log('\n🔧 Troubleshooting:', 'yellow');
    console.log('  • Check your DATABASE_URL in .env.local');
    console.log('  • Verify Supabase is running in EasyPanel');
    console.log('  • Check database credentials');
    console.log('  • Review PostgreSQL logs in EasyPanel');
    
    process.exit(1);
  } finally {
    await client.end();
    log('\n🔌 Database connection closed', 'blue');
  }
}

// Run deployment
deploySchema().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
