export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  stripe_customer_id?: string;
  subscription_status: string; // 'trial', 'active', 'cancelled', 'past_due'
  plan_type: string; // 'basic', 'pro', 'enterprise'
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  tenant_id: string;
  role: string; // 'abetworks_super_admin', 'client_admin', 'client_user'
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}