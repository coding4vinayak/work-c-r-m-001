-- Initialize ABETWORKS WORKCRM Database with Super Admin

-- Create the database schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS tenant_data;

-- Create the tenants table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'active',
  plan_type VARCHAR(50) DEFAULT 'enterprise',
  max_users INTEGER DEFAULT 100,
  max_storage_mb INTEGER DEFAULT 1000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the users table if it doesn't exist
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

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a default tenant for ABETWORKS (the platform owner)
INSERT INTO public.tenants (name, subdomain, subscription_status, plan_type)
VALUES ('ABETWORKS', 'abetworks', 'active', 'enterprise')
ON CONFLICT (subdomain) DO NOTHING;

-- Get the tenant ID for ABETWORKS
DO $$
DECLARE
  abetworks_tenant_id UUID;
  super_admin_password TEXT := '$2b$12$LQv2BMcOhTAP4j4tVHvYF.6Gk44qNDQ.YqN6.wO5q.Px.zGqY5p7m'; -- bcrypt hash of 'SuperAdmin2023!'
BEGIN
  -- Get the tenant ID for ABETWORKS
  SELECT id INTO abetworks_tenant_id FROM public.tenants WHERE subdomain = 'abetworks';

  -- Create the super admin user if it doesn't exist
  INSERT INTO public.users (
    email, 
    password_hash, 
    tenant_id, 
    role, 
    first_name, 
    last_name, 
    is_active, 
    email_verified
  )
  VALUES (
    'superadmin@abetworks.com',
    super_admin_password,
    abetworks_tenant_id,
    'abetworks_super_admin',
    'Super',
    'Admin',
    true,
    true
  )
  ON CONFLICT (email) DO NOTHING;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Setup row-level security if not already done
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON SCHEMA tenant_data TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant_data TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA tenant_data TO postgres;

-- Insert default deal stages for new tenants (function remains the same)
CREATE OR REPLACE FUNCTION create_default_deal_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tenant_data.deal_stages (tenant_id, name, order_number, probability) VALUES
    (NEW.id, 'Prospecting', 1, 10),
    (NEW.id, 'Qualification', 2, 25),
    (NEW.id, 'Needs Analysis', 3, 40),
    (NEW.id, 'Solution/Proposal', 4, 65),
    (NEW.id, 'Negotiation', 5, 80),
    (NEW.id, 'Closed Won', 6, 100),
    (NEW.id, 'Closed Lost', 7, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                 WHERE trigger_name = 'trigger_create_default_deal_stages') THEN
    CREATE TRIGGER trigger_create_default_deal_stages
      AFTER INSERT ON public.tenants
      FOR EACH ROW EXECUTE FUNCTION create_default_deal_stages();
  END IF;
END $$;

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

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                 WHERE trigger_name = 'trigger_create_default_customer_categories') THEN
    CREATE TRIGGER trigger_create_default_customer_categories
      AFTER INSERT ON public.tenants
      FOR EACH ROW EXECUTE FUNCTION create_default_customer_categories();
  END IF;
END $$;

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

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                 WHERE trigger_name = 'trigger_create_default_task_categories') THEN
    CREATE TRIGGER trigger_create_default_task_categories
      AFTER INSERT ON public.tenants
      FOR EACH ROW EXECUTE FUNCTION create_default_task_categories();
  END IF;
END $$;

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

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                 WHERE trigger_name = 'trigger_create_default_settings') THEN
    CREATE TRIGGER trigger_create_default_settings
      AFTER INSERT ON public.tenants
      FOR EACH ROW EXECUTE FUNCTION create_default_settings();
  END IF;
END $$;

-- Function to set current tenant for RLS
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id_input UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant', tenant_id_input::TEXT, false);
END;
$$ LANGUAGE plpgsql;