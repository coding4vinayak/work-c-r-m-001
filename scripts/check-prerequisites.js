#!/usr/bin/env node

/**
 * Prerequisite checker for ABETWORKS WORKCRM
 * Checks if required services are available before starting the application
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('🔍 Checking ABETWORKS WORKCRM prerequisites...\n');

let allChecksPassed = true;

// Check 1: Node.js version
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
  const versionNum = nodeVersion.replace('v', '');
  const [major] = versionNum.split('.').map(Number);
  
  if (major >= 18) {
    console.log(`✅ Node.js version: ${nodeVersion} (>=18.x required)`);
  } else {
    console.log(`❌ Node.js version: ${nodeVersion} (requires >=18.x)`);
    allChecksPassed = false;
  }
} catch (error) {
  console.log('❌ Node.js is not installed or not in PATH');
  allChecksPassed = false;
}

// Check 2: npm availability
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  console.log(`✅ npm version: ${npmVersion}`);
} catch (error) {
  console.log('❌ npm is not installed or not in PATH');
  allChecksPassed = false;
}

// Check 3: PostgreSQL installation (optional - we'll check connection instead)
console.log('\n📋 Checking database configuration...');
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'abetworks_workcrm';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD;

if (dbHost && dbPort && dbName && dbUser) {
  console.log(`✅ Database configuration found:`);
  console.log(`   Host: ${dbHost}:${dbPort}`);
  console.log(`   Database: ${dbName}`);
  console.log(`   User: ${dbUser}`);
  console.log(`   Password: ${dbPassword ? '***configured***' : 'not set'}`);
} else {
  console.log('❌ Missing database configuration in environment variables');
  allChecksPassed = false;
}

// Check 4: Required environment variables
console.log('\n🔐 Checking required environment variables...');
const requiredEnvVars = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET'
];

let missingEnvVars = [];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingEnvVars.push(envVar);
  }
}

if (missingEnvVars.length === 0) {
  console.log('✅ All required environment variables are set');
} else {
  console.log(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  allChecksPassed = false;
}

// Check 5: Package.json exists and dependencies installed
console.log('\n📦 Checking project dependencies...');
if (fs.existsSync('./package.json')) {
  console.log('✅ package.json found');
  
  if (fs.existsSync('./node_modules')) {
    console.log('✅ node_modules directory exists');
  } else {
    console.log('⚠️  node_modules directory not found - run npm install');
  }
} else {
  console.log('❌ package.json not found');
  allChecksPassed = false;
}

// Check 6: Logs directory
console.log('\n📝 Checking logs directory...');
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('✅ Created logs directory');
  } catch (error) {
    console.log('❌ Failed to create logs directory');
    allChecksPassed = false;
  }
} else {
  console.log('✅ Logs directory exists');
}

// Check 7: Database connectivity (attempt to ping)
console.log('\n🔌 Testing database connectivity...');
if (dbHost && dbPort && dbName && dbUser && dbPassword) {
  // Try to connect using psql command if available
  try {
    // Using pg client programmatically instead of psql command
    console.log('ℹ️  Skipping direct database connection test (would require pg module)');
    console.log('   Database connection will be tested when the app starts');
  } catch (error) {
    console.log('⚠️  Could not test database connection directly');
  }
} else {
  console.log('⚠️  Cannot test database connection - missing configuration');
}

// Summary
console.log('\n' + '='.repeat(50));
if (allChecksPassed) {
  console.log('🎉 All prerequisites check passed!');
  console.log('🚀 You can now start the ABETWORKS WORKCRM application');
  process.exit(0);
} else {
  console.log('❌ Some prerequisites checks failed!');
  console.log('💡 Please fix the issues above before starting the application');
  process.exit(1);
}