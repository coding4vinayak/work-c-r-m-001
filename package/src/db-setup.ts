import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Using your NeonDB connection string
const connectionString = 'postgresql://neondb_owner:npg_64ndXhRzkBbf@ep-spring-wind-aigcr4o1-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

export const pool = new Pool({
  connectionString: connectionString,
});

pool.on('connect', () => {
  console.log('Connected to NeonDB for ABETWORKS WORKCRM');
});

pool.on('error', (err) => {
  console.error('NeonDB connection error for ABETWORKS WORKCRM:', err);
});

export const connectDB = async () => {
  try {
    await pool.connect();
    console.log('NeonDB connected successfully for ABETWORKS WORKCRM');
  } catch (error) {
    console.error('Failed to connect to NeonDB for ABETWORKS WORKCRM:', error);
    process.exit(1);
  }
};

// Function to create the schema
export const createSchema = async () => {
  try {
    console.log('Creating ABETWORKS WORKCRM schema...');
    
    // Create tenant_data schema
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS tenant_data;
    `);
    console.log('Created tenant_data schema');

    // Create tenants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(255) UNIQUE NOT NULL,
        stripe_customer_id VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'trial',
        plan_type VARCHAR(50) DEFAULT 'basic',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created tenants table');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        tenant_id UUID REFERENCES public.tenants(id),
        role VARCHAR(50) DEFAULT 'user', -- 'abetworks_super_admin', 'client_admin', 'client_user'
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created users table');

    // Create customers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_data.customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES public.tenants(id),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(50),
        company VARCHAR(255),
        status VARCHAR(50) DEFAULT 'lead', -- 'lead', 'customer', 'prospect'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created customers table');

    // Create leads table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_data.leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES public.tenants(id),
        customer_id UUID REFERENCES tenant_data.customers(id),
        source VARCHAR(100),
        status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'closed_won', 'closed_lost'
        value DECIMAL(10,2),
        assigned_to UUID REFERENCES public.users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created leads table');

    // Create deals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_data.deals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES public.tenants(id),
        lead_id UUID REFERENCES tenant_data.leads(id),
        stage VARCHAR(50) DEFAULT 'prospecting', -- 'prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
        value DECIMAL(10,2),
        probability INTEGER DEFAULT 0, -- 0-100 percentage
        close_date DATE,
        assigned_to UUID REFERENCES public.users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created deals table');

    // Create tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_data.tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES public.tenants(id),
        title VARCHAR(255),
        description TEXT,
        assigned_to UUID REFERENCES public.users(id),
        due_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
        priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
        created_by UUID REFERENCES public.users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created tasks table');

    // Enable UUID extension if not already enabled
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);
    console.log('Enabled UUID extension');

    console.log('ABETWORKS WORKCRM schema created successfully!');
  } catch (error) {
    console.error('Error creating ABETWORKS WORKCRM schema:', error);
    throw error;
  }
};

// Function to insert a super admin user
export const createSuperAdmin = async () => {
  try {
    console.log('Creating ABETWORKS super admin...');
    
    // First create a tenant for ABETWORKS itself
    const tenantResult = await pool.query(`
      INSERT INTO public.tenants (name, subdomain, subscription_status, plan_type)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['ABETWORKS', 'abetworks', 'active', 'enterprise']);
    
    const tenantId = tenantResult.rows[0].id;
    console.log('Created ABETWORKS tenant with ID:', tenantId);
    
    // Hash the default password (in a real app, this should be more secure)
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash('AbetworksAdmin123!', 12);
    
    // Create super admin user
    await pool.query(`
      INSERT INTO public.users (email, password_hash, tenant_id, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
    `, ['admin@abetworks.com', hashedPassword, tenantId, 'abetworks_super_admin', true]);
    
    console.log('Created ABETWORKS super admin user');
  } catch (error) {
    console.error('Error creating super admin:', error);
    throw error;
  }
};

// Main function to set up the database
export const setupDatabase = async () => {
  try {
    await connectDB();
    await createSchema();
    await createSuperAdmin();
    console.log('ABETWORKS WORKCRM database setup completed successfully!');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  setupDatabase();
}