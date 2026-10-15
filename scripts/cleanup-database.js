#!/usr/bin/env node

/**
 * Database Cleanup Script for Adams Platform
 * 
 * This script helps you clean up existing tables before redeploying.
 * 
 * CAUTION: This will DELETE ALL DATA in the specified schema!
 * 
 * Usage:
 *   node scripts/cleanup-database.js              # Drop all tables in public schema
 *   node scripts/cleanup-database.js adams     # Drop entire adams schema
 *   node scripts/cleanup-database.js --schema adams  # Drop all tables in adams schema
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const readline = require('readline');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
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

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function cleanupDatabase(schemaName = 'public', dropSchema = false) {
  logSection('🗑️  Database Cleanup Script');
  
  log(`Target: ${schemaName} schema`, 'cyan');
  log(`Action: ${dropSchema ? 'DROP ENTIRE SCHEMA' : 'DROP ALL TABLES'}`, 'yellow');

  // Validate environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('❌ ERROR: DATABASE_URL not found in .env.local', 'red');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    // Connect
    await client.connect();
    log('✅ Connected to database', 'green');

    // Get list of tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [schemaName]);

    const tableCount = tablesResult.rows.length;

    if (tableCount === 0) {
      log(`\n✅ No tables found in "${schemaName}" schema`, 'green');
      await client.end();
      return;
    }

    // Show what will be deleted
    logSection('⚠️  WARNING: The following will be DELETED');
    
    if (dropSchema) {
      log(`ENTIRE SCHEMA: ${schemaName}`, 'red');
      log(`This includes:`, 'yellow');
    }
    
    log(`${tableCount} tables:`, 'yellow');
    tablesResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });

    // Confirm
    log('\n⚠️  THIS ACTION CANNOT BE UNDONE!', 'red');
    const answer = await askQuestion('\nType "DELETE" to confirm (or anything else to cancel): ');

    if (answer !== 'DELETE') {
      log('\n✅ Cleanup cancelled - no changes made', 'green');
      await client.end();
      return;
    }

    // Perform cleanup
    logSection('🗑️  Cleaning up database...');

    if (dropSchema) {
      // Drop entire schema
      log(`Dropping schema "${schemaName}"...`, 'yellow');
      await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
      log(`✅ Schema "${schemaName}" dropped`, 'green');
    } else {
      // Drop tables individually
      log('Dropping tables...', 'yellow');
      
      // Disable foreign key checks temporarily
      await client.query('SET session_replication_role = replica;');
      
      for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        await client.query(`DROP TABLE IF EXISTS ${schemaName}.${tableName} CASCADE`);
        log(`  ✓ Dropped ${tableName}`, 'green');
      }
      
      // Re-enable foreign key checks
      await client.query('SET session_replication_role = DEFAULT;');
      
      log(`\n✅ Dropped ${tableCount} tables`, 'green');
    }

    // Verify cleanup
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = $1 
      AND table_type = 'BASE TABLE'
    `, [schemaName]);

    const remainingTables = parseInt(verifyResult.rows[0].count);
    
    if (remainingTables === 0) {
      logSection('✅ Cleanup Complete!');
      log('Database is clean and ready for fresh deployment', 'green');
      log('\nNext steps:', 'cyan');
      log('1. Deploy schema: npm run deploy:schema', 'yellow');
      log('2. Or deploy to specific schema: npm run deploy:schema:multi <name>', 'yellow');
    } else {
      log(`\n⚠️  Warning: ${remainingTables} tables still remain`, 'yellow');
    }

  } catch (error) {
    logSection('❌ Cleanup Failed');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let schemaName = 'public';
let dropSchema = false;

if (args.length > 0) {
  if (args[0] === '--schema' && args[1]) {
    schemaName = args[1];
    dropSchema = false;
  } else {
    schemaName = args[0];
    dropSchema = true; // If schema name provided without --schema flag, drop entire schema
  }
}

// Show usage if help requested
if (args.includes('--help') || args.includes('-h')) {
  log('Database Cleanup Script', 'bright');
  log('\nUsage:', 'cyan');
  log('  node scripts/cleanup-database.js                    # Drop all tables in public schema', 'yellow');
  log('  node scripts/cleanup-database.js adams           # Drop entire adams schema', 'yellow');
  log('  node scripts/cleanup-database.js --schema adams  # Drop tables in adams schema (keep schema)', 'yellow');
  log('\nOptions:', 'cyan');
  log('  --schema <name>  Drop tables but keep the schema', 'yellow');
  log('  --help, -h       Show this help message', 'yellow');
  process.exit(0);
}

// Run cleanup
cleanupDatabase(schemaName, dropSchema);
