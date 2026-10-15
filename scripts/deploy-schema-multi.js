#!/usr/bin/env node

/**
 * Multi-Schema Deployment Script for Adams Platform
 * 
 * Supports deploying the same schema structure to multiple PostgreSQL schemas
 * for multi-tenant or multi-instance deployments.
 * 
 * Usage:
 *   node scripts/deploy-schema-multi.js adams
 *   node scripts/deploy-schema-multi.js adams_platform
 *   node scripts/deploy-schema-multi.js client_alpha
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
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

async function deploySchemaToNamespace(schemaName) {
  logSection(`🚀 Adams Platform - Multi-Schema Deployment`);
  
  log(`Target Schema: ${schemaName}`, 'cyan');
  log(`Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Unknown'}`, 'cyan');

  // Validate environment variables
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    log('❌ ERROR: DATABASE_URL not found in .env.local', 'red');
    log('\nPlease add your database connection string:', 'yellow');
    log('DATABASE_URL=postgresql://postgres:password@host:5432/postgres', 'cyan');
    process.exit(1);
  }

  // Validate schema name
  if (!schemaName || !/^[a-z0-9_]+$/i.test(schemaName)) {
    log('❌ ERROR: Invalid schema name', 'red');
    log('\nSchema name must contain only letters, numbers, and underscores', 'yellow');
    log('Examples: adams, adams_platform, client_alpha', 'cyan');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    // Connect to database
    logSection('📡 Connecting to Database');
    await client.connect();
    log('✅ Connected successfully', 'green');

    // Create schema if it doesn't exist
    logSection(`🏗️  Creating Schema: ${schemaName}`);
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    log(`✅ Schema "${schemaName}" ready`, 'green');

    // Set search path to new schema
    await client.query(`SET search_path TO ${schemaName}, public`);
    log(`✅ Search path set to "${schemaName}"`, 'green');

    // Read migration file
    logSection('📄 Reading Migration File');
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250101000000_initial_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    log(`✅ Loaded migration file (${migrationSQL.length} characters)`, 'green');

    // Execute migration
    logSection(`🔨 Deploying Schema to "${schemaName}"`);
    log('This may take a minute...', 'yellow');
    
    await client.query(migrationSQL);
    log('✅ Migration executed successfully', 'green');

    // Verify deployment
    logSection('🔍 Verifying Deployment');
    
    // Check tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [schemaName]);
    
    log(`✅ Created ${tablesResult.rows.length} tables`, 'green');
    
    // Show table list
    log('\nTables created:', 'cyan');
    tablesResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });

    // Check indexes
    const indexesResult = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE schemaname = $1
    `, [schemaName]);
    
    log(`\n✅ Created ${indexesResult.rows[0].count} indexes`, 'green');

    // Check functions
    const functionsResult = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = $1
    `, [schemaName]);
    
    log(`✅ Created ${functionsResult.rows[0].count} functions`, 'green');

    // Test basic operations
    logSection('🧪 Testing Basic Operations');
    
    // Test insert
    const testUserId = '00000000-0000-0000-0000-000000000001';
    await client.query(`
      INSERT INTO ${schemaName}.users (id, email, name, role)
      VALUES ($1, 'test@example.com', 'Test User', 'admin')
      ON CONFLICT (id) DO NOTHING
    `, [testUserId]);
    log('✅ Insert operation successful', 'green');

    // Test select
    const selectResult = await client.query(`
      SELECT * FROM ${schemaName}.users WHERE id = $1
    `, [testUserId]);
    log('✅ Select operation successful', 'green');

    // Clean up test data
    await client.query(`DELETE FROM ${schemaName}.users WHERE id = $1`, [testUserId]);
    log('✅ Delete operation successful', 'green');

    // Success summary
    logSection('✅ Deployment Complete!');
    log(`Schema "${schemaName}" is ready to use`, 'green');
    log('\nNext steps:', 'cyan');
    log('1. Update your application to use this schema:', 'yellow');
    log(`   SET search_path TO ${schemaName};`, 'cyan');
    log('2. Configure RLS policies for your authentication setup', 'yellow');
    log('3. Test your application with this deployment', 'yellow');
    
    log('\nTo deploy another instance:', 'cyan');
    log(`   node scripts/deploy-schema-multi.js another_schema_name`, 'yellow');

  } catch (error) {
    logSection('❌ Deployment Failed');
    log(`Error: ${error.message}`, 'red');
    
    if (error.message.includes('already exists')) {
      log('\n💡 Tip: Tables already exist in this schema', 'yellow');
      log('Options:', 'cyan');
      log('1. Use a different schema name', 'yellow');
      log('2. Drop existing schema: DROP SCHEMA schema_name CASCADE;', 'yellow');
      log('3. Skip if this is intentional', 'yellow');
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get schema name from command line argument
const schemaName = process.argv[2];

if (!schemaName) {
  log('❌ ERROR: Schema name required', 'red');
  log('\nUsage:', 'yellow');
  log('  node scripts/deploy-schema-multi.js <schema_name>', 'cyan');
  log('\nExamples:', 'yellow');
  log('  node scripts/deploy-schema-multi.js adams', 'cyan');
  log('  node scripts/deploy-schema-multi.js adams_platform', 'cyan');
  log('  node scripts/deploy-schema-multi.js client_alpha', 'cyan');
  process.exit(1);
}

// Run deployment
deploySchemaToNamespace(schemaName);
