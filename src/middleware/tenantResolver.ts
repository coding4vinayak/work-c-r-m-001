import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract tenant from subdomain for ABETWORKS WORKCRM
    const host = req.get('Host');
    let subdomain = '';
    
    if (host) {
      const parts = host.split('.');
      if (parts.length >= 3) {
        subdomain = parts[0]; // e.g., client1 from client1.workcrm.abetworks.com
      }
    }

    // For development, allow specifying tenant via header
    if (!subdomain && req.headers['x-tenant-id']) {
      subdomain = req.headers['x-tenant-id'] as string;
    }

    if (!subdomain) {
      return res.status(400).json({ 
        error: 'Invalid tenant identifier for ABETWORKS WORKCRM' 
      });
    }

    // Find tenant by subdomain in ABETWORKS platform
    const tenantResult = await pool.query(
      'SELECT * FROM public.tenants WHERE subdomain = $1', 
      [subdomain]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Tenant not found in ABETWORKS WORKCRM' 
      });
    }

    const tenant = tenantResult.rows[0];

    // Check subscription status for ABETWORKS platform
    if (tenant.subscription_status !== 'active' && tenant.subscription_status !== 'trial') {
      return res.status(402).json({ 
        error: 'ABETWORKS WORKCRM subscription inactive' 
      });
    }

    // Attach tenant to request for ABETWORKS WORKCRM
    (req as any).tenant = tenant;

    // Set tenant context for database queries in ABETWORKS platform
    await pool.query(
      'SELECT set_config($1, $2, false)', 
      ['app.current_tenant', tenant.id]
    );

    next();
  } catch (error) {
    console.error('Tenant resolution error in ABETWORKS WORKCRM:', error);
    res.status(500).json({ error: 'Internal server error in ABETWORKS WORKCRM' });
  }
};