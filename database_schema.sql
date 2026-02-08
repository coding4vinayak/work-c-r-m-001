-- ABETWORKS WORKCRM Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create public schema tables for ABETWORKS platform

-- Tenants table for ABETWORKS platform
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

-- Users table for ABETWORKS WORKCRM
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

-- Customers table for ABETWORKS WORKCRM
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

-- Leads table for ABETWORKS WORKCRM
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

-- Deals table for ABETWORKS WORKCRM
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

-- Tasks table for ABETWORKS WORKCRM
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

-- Row-level security setup for ABETWORKS WORKCRM
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create tenant_data schema for ABETWORKS WORKCRM
CREATE SCHEMA IF NOT EXISTS tenant_data;

-- Grant permissions to tenant_data schema
GRANT USAGE ON SCHEMA tenant_data TO postgres;
GRANT CREATE ON SCHEMA tenant_data TO postgres;

-- Row-level security for tenant_data tables
ALTER TABLE tenant_data.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.tasks ENABLE ROW LEVEL SECURITY;

-- Row-level security policies for ABETWORKS WORKCRM
CREATE POLICY tenant_isolation_policy_customers ON tenant_data.customers
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_leads ON tenant_data.leads
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_deals ON tenant_data.deals
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_tasks ON tenant_data.tasks
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);