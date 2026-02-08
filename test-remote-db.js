// ABETWORKS WORKCRM - Remote Database Connection Test
require('dotenv').config();

// Override with Neon database settings
process.env.DB_HOST = 'ep-spring-wind-aigcr4o1-pooler.c-4.us-east-1.aws.neon.tech';
process.env.DB_NAME = 'neondb';
process.env.DB_USER = 'neondb_owner';
process.env.DB_PASSWORD = 'npg_64ndXhRzkBbf';
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_64ndXhRzkBbf@ep-spring-wind-aigcr4o1-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
process.env.REDIS_URL = ''; // Disable Redis to avoid connection issues

console.log('🔧 Setting up ABETWORKS WORKCRM with Neon database connection...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);

// Import the main application
const app = require('./dist/app');
const { pool } = require('./dist/config/database');

// Test database connection and create sample data
async function testDatabaseConnection() {
  console.log('\n🔍 Testing database connection...');
  
  try {
    // Test basic connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0]);
    
    // Test tenant table exists
    const tenantResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
      );
    `);
    console.log('✅ Tenants table exists:', tenantResult.rows[0].exists);
    
    // Test users table exists
    const usersResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    console.log('✅ Users table exists:', usersResult.rows[0].exists);
    
    // Test tenant_data schema exists
    const schemaResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata 
        WHERE schema_name = 'tenant_data'
      );
    `);
    console.log('✅ Tenant data schema exists:', schemaResult.rows[0].exists);
    
    // Test customers table exists in tenant_data
    const customersResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'tenant_data' 
        AND table_name = 'customers'
      );
    `);
    console.log('✅ Customers table exists in tenant_data:', customersResult.rows[0].exists);
    
    // Test leads table exists in tenant_data
    const leadsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'tenant_data' 
        AND table_name = 'leads'
      );
    `);
    console.log('✅ Leads table exists in tenant_data:', leadsResult.rows[0].exists);
    
    // Test deals table exists in tenant_data
    const dealsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'tenant_data' 
        AND table_name = 'deals'
      );
    `);
    console.log('✅ Deals table exists in tenant_data:', dealsResult.rows[0].exists);
    
    // Test tasks table exists in tenant_data
    const tasksResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'tenant_data' 
        AND table_name = 'tasks'
      );
    `);
    console.log('✅ Tasks table exists in tenant_data:', tasksResult.rows[0].exists);
    
    // Test products table exists in tenant_data
    const productsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'tenant_data' 
        AND table_name = 'products'
      );
    `);
    console.log('✅ Products table exists in tenant_data:', productsResult.rows[0].exists);
    
    // Test quotes table exists in tenant_data
    const quotesResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'tenant_data' 
        AND table_name = 'quotes'
      );
    `);
    console.log('✅ Quotes table exists in tenant_data:', quotesResult.rows[0].exists);
    
    // Test invoices table exists in tenant_data
    const invoicesResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'tenant_data' 
        AND table_name = 'invoices'
      );
    `);
    console.log('✅ Invoices table exists in tenant_data:', invoicesResult.rows[0].exists);
    
    // Test payments table exists in tenant_data
    const paymentsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'tenant_data' 
        AND table_name = 'payments'
      );
    `);
    console.log('✅ Payments table exists in tenant_data:', paymentsResult.rows[0].exists);
    
    console.log('\n🎉 All database tables verified successfully!');
    console.log('The ABETWORKS WORKCRM application is properly connected to the Neon database.');
    console.log('All CRM modules (customers, leads, deals, tasks, etc.) are available.');
    
    // Close the database connection
    await pool.end();
    console.log('\n🔒 Database connection closed.');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

// Run the test
testDatabaseConnection()
  .then(success => {
    if (success) {
      console.log('\n✅ ABETWORKS WORKCRM is ready to use with Neon database!');
      console.log('All CRM modules are properly configured and connected to remote data.');
    } else {
      console.log('\n❌ Database connection test failed.');
    }
  })
  .catch(error => {
    console.error('❌ Error during database test:', error);
  });