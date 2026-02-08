import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get all settings for the current tenant
export const getSettings = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    const result = await pool.query(
      `SELECT setting_key, setting_value, setting_type, description
       FROM tenant_data.settings
       WHERE tenant_id = $1
       ORDER BY setting_key`,
      [tenantId]
    );

    // Convert setting values based on their type
    const settings: Record<string, any> = {};
    result.rows.forEach((row: any) => {
      let value = row.setting_value;
      
      if (row.setting_type === 'number') {
        value = Number(value);
      } else if (row.setting_type === 'boolean') {
        value = value === 'true';
      } else if (row.setting_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error(`Error parsing JSON setting ${row.setting_key}:`, e);
          value = null;
        }
      }
      
      settings[row.setting_key] = {
        value,
        type: row.setting_type,
        description: row.description
      };
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// Update settings for the current tenant
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const settings = req.body;

    // Validate input
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings must be an object' });
    }

    // Update each setting
    for (const [key, valueObj] of Object.entries(settings)) {
      const value = (valueObj as any).value;
      const type = (valueObj as any).type || 'string';
      const description = (valueObj as any).description || '';

      // Validate type
      if (!['string', 'number', 'boolean', 'json'].includes(type)) {
        return res.status(400).json({ error: `Invalid setting type for ${key}: ${type}` });
      }

      // Convert value to string for storage
      let stringValue = value;
      if (type === 'json') {
        stringValue = JSON.stringify(value);
      } else if (type === 'boolean') {
        stringValue = value ? 'true' : 'false';
      } else if (type === 'number') {
        stringValue = String(value);
      }

      // Upsert the setting
      await pool.query(`
        INSERT INTO tenant_data.settings (tenant_id, setting_key, setting_value, setting_type, description)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET setting_value = $3, setting_type = $4, description = $5, updated_at = NOW()
      `, [tenantId, key, stringValue, type, description]);
    }

    // Return updated settings
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Get a specific setting for the current tenant
export const getSetting = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const settingKey = req.params.key;

    const result = await pool.query(
      `SELECT setting_key, setting_value, setting_type, description
       FROM tenant_data.settings
       WHERE tenant_id = $1 AND setting_key = $2`,
      [tenantId, settingKey]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    const row = result.rows[0];
    let value = row.setting_value;
    
    if (row.setting_type === 'number') {
      value = Number(value);
    } else if (row.setting_type === 'boolean') {
      value = value === 'true';
    } else if (row.setting_type === 'json') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        console.error(`Error parsing JSON setting ${row.setting_key}:`, e);
        value = null;
      }
    }

    res.json({
      key: row.setting_key,
      value,
      type: row.setting_type,
      description: row.description
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
};

// Update a specific setting for the current tenant
export const updateSetting = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const settingKey = req.params.key;
    const { value, type = 'string', description = '' } = req.body;

    // Validate type
    if (!['string', 'number', 'boolean', 'json'].includes(type)) {
      return res.status(400).json({ error: `Invalid setting type: ${type}` });
    }

    // Convert value to string for storage
    let stringValue = value;
    if (type === 'json') {
      stringValue = JSON.stringify(value);
    } else if (type === 'boolean') {
      stringValue = value ? 'true' : 'false';
    } else if (type === 'number') {
      stringValue = String(value);
    }

    // Upsert the setting
    const result = await pool.query(`
      INSERT INTO tenant_data.settings (tenant_id, setting_key, setting_value, setting_type, description)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tenant_id, setting_key)
      DO UPDATE SET setting_value = $3, setting_type = $4, description = $5, updated_at = NOW()
      RETURNING *
    `, [tenantId, settingKey, stringValue, type, description]);

    const row = result.rows[0];
    let returnValue = row.setting_value;
    
    if (row.setting_type === 'number') {
      returnValue = Number(row.setting_value);
    } else if (row.setting_type === 'boolean') {
      returnValue = row.setting_value === 'true';
    } else if (row.setting_type === 'json') {
      try {
        returnValue = JSON.parse(row.setting_value);
      } catch (e) {
        console.error(`Error parsing JSON setting ${row.setting_key}:`, e);
        returnValue = null;
      }
    }

    res.json({
      key: row.setting_key,
      value: returnValue,
      type: row.setting_type,
      description: row.description
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

// Get company profile settings
export const getCompanyProfile = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    const result = await pool.query(
      `SELECT setting_key, setting_value
       FROM tenant_data.settings
       WHERE tenant_id = $1 
         AND setting_key IN ('company_name', 'company_address', 'company_phone', 'company_email')
       ORDER BY setting_key`,
      [tenantId]
    );

    const profile: Record<string, string> = {};
    result.rows.forEach((row: any) => {
      profile[row.setting_key] = row.setting_value || '';
    });

    res.json(profile);
  } catch (error) {
    console.error('Error fetching company profile:', error);
    res.status(500).json({ error: 'Failed to fetch company profile' });
  }
};

// Update company profile settings
export const updateCompanyProfile = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { company_name, company_address, company_phone, company_email } = req.body;

    // Update each setting
    const updates = [
      { key: 'company_name', value: company_name, type: 'string' },
      { key: 'company_address', value: company_address, type: 'string' },
      { key: 'company_phone', value: company_phone, type: 'string' },
      { key: 'company_email', value: company_email, type: 'string' }
    ];

    for (const update of updates) {
      await pool.query(`
        INSERT INTO tenant_data.settings (tenant_id, setting_key, setting_value, setting_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET setting_value = $3, setting_type = $4, updated_at = NOW()
      `, [tenantId, update.key, update.value, update.type]);
    }

    // Return updated profile
    res.json({ message: 'Company profile updated successfully' });
  } catch (error) {
    console.error('Error updating company profile:', error);
    res.status(500).json({ error: 'Failed to update company profile' });
  }
};

// Get finance settings
export const getFinanceSettings = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    const result = await pool.query(
      `SELECT setting_key, setting_value
       FROM tenant_data.settings
       WHERE tenant_id = $1 
         AND setting_key IN ('currency', 'tax_rate', 'payment_terms', 'invoice_prefix')
       ORDER BY setting_key`,
      [tenantId]
    );

    const settings: Record<string, string | number> = {};
    result.rows.forEach((row: any) => {
      // Convert numeric values
      if (['tax_rate'].includes(row.setting_key)) {
        settings[row.setting_key] = parseFloat(row.setting_value) || 0;
      } else {
        settings[row.setting_key] = row.setting_value || '';
      }
    });

    // Set defaults if not found
    if (!settings.currency) settings.currency = 'USD';
    if (!settings.tax_rate) settings.tax_rate = 0;
    if (!settings.payment_terms) settings.payment_terms = 'Net 30';
    if (!settings.invoice_prefix) settings.invoice_prefix = 'INV';

    res.json(settings);
  } catch (error) {
    console.error('Error fetching finance settings:', error);
    res.status(500).json({ error: 'Failed to fetch finance settings' });
  }
};

// Update finance settings
export const updateFinanceSettings = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { currency, tax_rate, payment_terms, invoice_prefix } = req.body;

    // Update each setting
    const updates = [
      { key: 'currency', value: currency || 'USD', type: 'string' },
      { key: 'tax_rate', value: tax_rate || 0, type: 'number' },
      { key: 'payment_terms', value: payment_terms || 'Net 30', type: 'string' },
      { key: 'invoice_prefix', value: invoice_prefix || 'INV', type: 'string' }
    ];

    for (const update of updates) {
      await pool.query(`
        INSERT INTO tenant_data.settings (tenant_id, setting_key, setting_value, setting_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, setting_key)
        DO UPDATE SET setting_value = $3, setting_type = $4, updated_at = NOW()
      `, [tenantId, update.key, update.value, update.type]);
    }

    // Return updated settings
    res.json({ message: 'Finance settings updated successfully' });
  } catch (error) {
    console.error('Error updating finance settings:', error);
    res.status(500).json({ error: 'Failed to update finance settings' });
  }
};