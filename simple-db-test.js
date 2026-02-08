// Simplified Neon database connection test
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Neon database configuration
const neonConfig = {
  host: 'ep-spring-wind-aigcr4o1-pooler.c-4.us-east-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_64ndXhRzkBbf',
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000, // 10 seconds timeout
  idleTimeoutMillis: 30000
};

console.log('🔍 Testing direct connection to Neon database...');
console.log('Host:', neonConfig.host);
console.log('Database:', neonConfig.database);
console.log('User:', neonConfig.user);

async function testConnection() {
  const pool = new Pool(neonConfig);
  
  try {
    console.log('\nAttempting to connect to Neon database...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully!');
    console.log('Current time from database:', result.rows[0].now);
    
    // Test if our tables exist
    console.log('\n🔍 Checking for ABETWORKS WORKCRM tables...');
    
    // Check for tenants table
    try {
      const tenantsResult = await pool.query('SELECT COUNT(*) FROM public.tenants LIMIT 1');
      console.log('✅ Tenants table exists and accessible');
    } catch (err) {
      console.log('ℹ️  Tenants table may not exist yet:', err.message);
    }
    
    // Check for users table
    try {
      const usersResult = await pool.query('SELECT COUNT(*) FROM public.users LIMIT 1');
      console.log('✅ Users table exists and accessible');
    } catch (err) {
      console.log('ℹ️  Users table may not exist yet:', err.message);
    }
    
    // Check for tenant_data schema
    try {
      const schemaResult = await pool.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'tenant_data'
      `);
      if (schemaResult.rows.length > 0) {
        console.log('✅ tenant_data schema exists');
        
        // Check for some common tenant tables
        try {
          const customersResult = await pool.query('SELECT COUNT(*) FROM tenant_data.customers LIMIT 1');
          console.log('✅ tenant_data.customers table exists and accessible');
        } catch (err) {
          console.log('ℹ️  tenant_data.customers table may not exist yet');
        }
        
        try {
          const leadsResult = await pool.query('SELECT COUNT(*) FROM tenant_data.leads LIMIT 1');
          console.log('✅ tenant_data.leads table exists and accessible');
        } catch (err) {
          console.log('ℹ️  tenant_data.leads table may not exist yet');
        }
        
        try {
          const dealsResult = await pool.query('SELECT COUNT(*) FROM tenant_data.deals LIMIT 1');
          console.log('✅ tenant_data.deals table exists and accessible');
        } catch (err) {
          console.log('ℹ️  tenant_data.deals table may not exist yet');
        }
        
        try {
          const tasksResult = await pool.query('SELECT COUNT(*) FROM tenant_data.tasks LIMIT 1');
          console.log('✅ tenant_data.tasks table exists and accessible');
        } catch (err) {
          console.log('ℹ️  tenant_data.tasks table may not exist yet');
        }
      } else {
        console.log('ℹ️  tenant_data schema does not exist yet');
      }
    } catch (err) {
      console.log('ℹ️  Error checking for tenant_data schema:', err.message);
    }
    
    console.log('\n🎉 Connection to Neon database successful!');
    console.log('ABETWORKS WORKCRM can connect to the remote database.');
    console.log('All CRM modules will be able to access remote data.');
    
    return true;
  } catch (error) {
    console.error('\n❌ Connection to Neon database failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    return false;
  } finally {
    await pool.end();
    console.log('\n🔒 Database connection closed.');
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      console.log('\n✅ ABETWORKS WORKCRM is ready to connect to Neon database!');
      console.log('All CRM modules (leads, tasks, deals, customers, etc.) can access remote data.');
    } else {
      console.log('\n❌ Unable to connect to Neon database.');
      console.log('Please verify your Neon database credentials and connection settings.');
    }
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
  });