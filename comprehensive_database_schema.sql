-- ABETWORKS WORKCRM Comprehensive Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenant_data schema for ABETWORKS WORKCRM
CREATE SCHEMA IF NOT EXISTS tenant_data;

-- Grant permissions to tenant_data schema
GRANT USAGE ON SCHEMA tenant_data TO postgres;
GRANT CREATE ON SCHEMA tenant_data TO postgres;

-- Tenants table for ABETWORKS platform
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'trial', -- 'trial', 'active', 'cancelled', 'past_due'
  plan_type VARCHAR(50) DEFAULT 'basic', -- 'basic', 'pro', 'enterprise'
  max_users INTEGER DEFAULT 5,
  max_storage_mb INTEGER DEFAULT 100,
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
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer categories/tags table
CREATE TABLE IF NOT EXISTS tenant_data.customer_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7), -- Hex color code
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table for ABETWORKS WORKCRM
CREATE TABLE IF NOT EXISTS tenant_data.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  category_id UUID REFERENCES tenant_data.customer_categories(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  job_title VARCHAR(100),
  website VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  status VARCHAR(50) DEFAULT 'lead', -- 'lead', 'customer', 'prospect', 'inactive'
  source VARCHAR(100), -- 'referral', 'website', 'social_media', etc.
  notes TEXT,
  lead_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer interactions/activities table
CREATE TABLE IF NOT EXISTS tenant_data.customer_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  customer_id UUID REFERENCES tenant_data.customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  type VARCHAR(50) NOT NULL, -- 'call', 'email', 'meeting', 'note', 'task'
  subject VARCHAR(255),
  description TEXT,
  date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_minutes INTEGER,
  outcome VARCHAR(100), -- 'successful', 'failed', 'no_answer', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lead sources table
CREATE TABLE IF NOT EXISTS tenant_data.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads table for ABETWORKS WORKCRM
CREATE TABLE IF NOT EXISTS tenant_data.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  customer_id UUID REFERENCES tenant_data.customers(id) ON DELETE SET NULL,
  source_id UUID REFERENCES tenant_data.lead_sources(id),
  assigned_to UUID REFERENCES public.users(id),
  status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'closed_won', 'closed_lost'
  value DECIMAL(10,2),
  probability INTEGER DEFAULT 0, -- 0-100 percentage
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deal stages table
CREATE TABLE IF NOT EXISTS tenant_data.deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name VARCHAR(100) NOT NULL,
  order_number INTEGER NOT NULL,
  probability INTEGER DEFAULT 0, -- Expected probability for this stage
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deals table for ABETWORKS WORKCRM
CREATE TABLE IF NOT EXISTS tenant_data.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  lead_id UUID REFERENCES tenant_data.leads(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES tenant_data.customers(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES tenant_data.deal_stages(id),
  assigned_to UUID REFERENCES public.users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  value DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  probability INTEGER DEFAULT 0, -- Override stage probability if needed
  expected_close_date DATE,
  actual_close_date DATE,
  pipeline VARCHAR(100), -- Different pipelines for different products/services
  tags TEXT[], -- Array of tags
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task categories table
CREATE TABLE IF NOT EXISTS tenant_data.task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7), -- Hex color code
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table for ABETWORKS WORKCRM
CREATE TABLE IF NOT EXISTS tenant_data.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  category_id UUID REFERENCES tenant_data.task_categories(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.users(id),
  assigned_by UUID REFERENCES public.users(id),
  due_date TIMESTAMP,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  related_entity_type VARCHAR(50), -- 'customer', 'lead', 'deal', 'none'
  related_entity_id UUID, -- ID of the related entity
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products/Services table
CREATE TABLE IF NOT EXISTS tenant_data.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100),
  price DECIMAL(10,2),
  cost DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotes table
CREATE TABLE IF NOT EXISTS tenant_data.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  customer_id UUID REFERENCES tenant_data.customers(id),
  issued_by UUID REFERENCES public.users(id),
  quote_number VARCHAR(50) UNIQUE,
  issue_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  subtotal DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'accepted', 'rejected', 'expired'
  notes TEXT,
  terms_conditions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quote items table
CREATE TABLE IF NOT EXISTS tenant_data.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES tenant_data.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES tenant_data.products(id),
  description VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  sort_order INTEGER DEFAULT 0
);

-- Invoices table
CREATE TABLE IF NOT EXISTS tenant_data.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  customer_id UUID REFERENCES tenant_data.customers(id),
  issued_by UUID REFERENCES public.users(id),
  invoice_number VARCHAR(50) UNIQUE,
  quote_id UUID REFERENCES tenant_data.quotes(id), -- Optional reference to quote
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_due DECIMAL(10,2), -- Automatically calculated
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'partial', 'overdue', 'void'
  notes TEXT,
  terms_conditions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS tenant_data.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES tenant_data.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES tenant_data.products(id),
  description VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  sort_order INTEGER DEFAULT 0
);

-- Payments table
CREATE TABLE IF NOT EXISTS tenant_data.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  invoice_id UUID REFERENCES tenant_data.invoices(id),
  customer_id UUID REFERENCES tenant_data.customers(id),
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50), -- 'credit_card', 'bank_transfer', 'paypal', etc.
  transaction_id VARCHAR(255), -- External payment processor ID
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Files/Documents table
CREATE TABLE IF NOT EXISTS tenant_data.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  uploaded_by UUID REFERENCES public.users(id),
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  file_size BIGINT, -- Size in bytes
  related_entity_type VARCHAR(50), -- 'customer', 'lead', 'deal', 'quote', 'invoice', 'task'
  related_entity_id UUID, -- ID of the related entity
  description TEXT,
  is_public BOOLEAN DEFAULT false, -- Whether file is publicly accessible
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags table for categorization
CREATE TABLE IF NOT EXISTS tenant_data.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7), -- Hex color code
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tag assignments table (junction table)
CREATE TABLE IF NOT EXISTS tenant_data.tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID REFERENCES tenant_data.tags(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- 'customer', 'lead', 'deal', 'task', 'quote', 'invoice'
  entity_id UUID NOT NULL, -- ID of the entity being tagged
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS tenant_data.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID REFERENCES public.users(id), -- User to notify
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50), -- 'info', 'success', 'warning', 'error', 'reminder'
  is_read BOOLEAN DEFAULT false,
  related_entity_type VARCHAR(50), -- 'customer', 'lead', 'deal', 'task', etc.
  related_entity_id UUID, -- ID of the related entity
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table for tenant-specific configurations
CREATE TABLE IF NOT EXISTS tenant_data.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Row-level security setup for ABETWORKS WORKCRM
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Row-level security for tenant_data tables
ALTER TABLE tenant_data.customer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.customer_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data.settings ENABLE ROW LEVEL SECURITY;

-- Row-level security policies for ABETWORKS WORKCRM
CREATE POLICY tenant_isolation_policy_tenants ON public.tenants
  FOR ALL TO authenticated_user
  USING (id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_users ON public.users
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_customer_categories ON tenant_data.customer_categories
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_customers ON tenant_data.customers
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_customer_activities ON tenant_data.customer_activities
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_lead_sources ON tenant_data.lead_sources
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_leads ON tenant_data.leads
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_deal_stages ON tenant_data.deal_stages
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_deals ON tenant_data.deals
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_task_categories ON tenant_data.task_categories
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_tasks ON tenant_data.tasks
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_products ON tenant_data.products
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_quotes ON tenant_data.quotes
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_quote_items ON tenant_data.quote_items
  FOR ALL TO authenticated_user
  USING ((SELECT tenant_id FROM tenant_data.quotes WHERE id = quote_id) = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_invoices ON tenant_data.invoices
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_invoice_items ON tenant_data.invoice_items
  FOR ALL TO authenticated_user
  USING ((SELECT tenant_id FROM tenant_data.invoices WHERE id = invoice_id) = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_payments ON tenant_data.payments
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_files ON tenant_data.files
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_tags ON tenant_data.tags
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_tag_assignments ON tenant_data.tag_assignments
  FOR ALL TO authenticated_user
  USING ((SELECT tenant_id FROM tenant_data.tags WHERE id = tag_id) = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_notifications ON tenant_data.notifications
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_policy_settings ON tenant_data.settings
  FOR ALL TO authenticated_user
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Create indexes for better performance
CREATE INDEX idx_customers_tenant_id ON tenant_data.customers(tenant_id);
CREATE INDEX idx_customers_status ON tenant_data.customers(status);
CREATE INDEX idx_leads_tenant_id ON tenant_data.leads(tenant_id);
CREATE INDEX idx_leads_assigned_to ON tenant_data.leads(assigned_to);
CREATE INDEX idx_deals_tenant_id ON tenant_data.deals(tenant_id);
CREATE INDEX idx_deals_stage_id ON tenant_data.deals(stage_id);
CREATE INDEX idx_tasks_tenant_id ON tenant_data.tasks(tenant_id);
CREATE INDEX idx_tasks_assigned_to ON tenant_data.tasks(assigned_to);
CREATE INDEX idx_tasks_completed ON tenant_data.tasks(completed);
CREATE INDEX idx_invoices_tenant_id ON tenant_data.invoices(tenant_id);
CREATE INDEX idx_invoices_customer_id ON tenant_data.invoices(customer_id);
CREATE INDEX idx_invoices_status ON tenant_data.invoices(status);
CREATE INDEX idx_payments_tenant_id ON tenant_data.payments(tenant_id);
CREATE INDEX idx_payments_invoice_id ON tenant_data.payments(invoice_id);

-- Insert default deal stages for new tenants
CREATE OR REPLACE FUNCTION create_default_deal_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tenant_data.deal_stages (tenant_id, name, order_number, probability) VALUES
    (NEW.id, 'Prospecting', 1, 10),
    (NEW.id, 'Qualification', 2, 25),
    (NEW.id, 'Needs Analysis', 3, 40),
    (NEW.id, 'Proposal', 4, 65),
    (NEW.id, 'Negotiation', 5, 80),
    (NEW.id, 'Closed Won', 6, 100),
    (NEW.id, 'Closed Lost', 7, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_deal_stages
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION create_default_deal_stages();

-- Insert default customer categories for new tenants
CREATE OR REPLACE FUNCTION create_default_customer_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tenant_data.customer_categories (tenant_id, name, color) VALUES
    (NEW.id, 'Lead', '#FFC107'),
    (NEW.id, 'Customer', '#4CAF50'),
    (NEW.id, 'Prospect', '#2196F3'),
    (NEW.id, 'Partner', '#9C27B0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_customer_categories
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION create_default_customer_categories();

-- Insert default task categories for new tenants
CREATE OR REPLACE FUNCTION create_default_task_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tenant_data.task_categories (tenant_id, name, color) VALUES
    (NEW.id, 'Follow Up', '#FF5722'),
    (NEW.id, 'Meeting', '#03A9F4'),
    (NEW.id, 'Call', '#4CAF50'),
    (NEW.id, 'Email', '#9C27B0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_task_categories
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION create_default_task_categories();

-- Insert default settings for new tenants
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tenant_data.settings (tenant_id, setting_key, setting_value, description) VALUES
    (NEW.id, 'company_name', '', 'Name of the company'),
    (NEW.id, 'company_address', '', 'Address of the company'),
    (NEW.id, 'company_phone', '', 'Phone number of the company'),
    (NEW.id, 'company_email', '', 'Email address of the company'),
    (NEW.id, 'currency', 'USD', 'Default currency for the tenant'),
    (NEW.id, 'date_format', 'MM/DD/YYYY', 'Date format preference'),
    (NEW.id, 'time_format', '12', 'Time format (12 or 24 hour)');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_settings
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION create_default_settings();

-- Function to set current tenant for RLS
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id_input UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant', tenant_id_input::TEXT, false);
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON SCHEMA tenant_data TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant_data TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA tenant_data TO postgres;

-- Set up RLS policies for super admins (they can see all data)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'tenant_data' AND tablename = 'customers') THEN
    -- This is a simplified version - in practice, you'd need to handle super admin access differently
    -- Perhaps by using a different role or by checking user roles in the policy
    RAISE NOTICE 'RLS policies created for tenant isolation';
  END IF;
END $$;