import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get all leads for the current tenant
export const getLeads = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const assignedTo = req.query.assignedTo as string || '';

    // Build query conditions
    let conditions = 'WHERE l.tenant_id = $1';
    let params: any[] = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions += ` AND (c.first_name ILIKE $${paramIndex} OR c.last_name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.company ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions += ` AND l.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (assignedTo) {
      conditions += ` AND l.assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.leads l
       LEFT JOIN tenant_data.customers c ON l.customer_id = c.id
       ${conditions}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get leads with pagination
    const result = await pool.query(
      `SELECT l.*, 
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.email as customer_email,
              c.company as customer_company,
              u.first_name as assigned_first_name,
              u.last_name as assigned_last_name
       FROM tenant_data.leads l
       LEFT JOIN tenant_data.customers c ON l.customer_id = c.id
       LEFT JOIN public.users u ON l.assigned_to = u.id
       ${conditions}
       ORDER BY l.created_at DESC
       LIMIT $${paramIndex-1} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalRecords: totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

// Create a new lead for the current tenant
export const createLead = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const {
      customer_id,
      source_id,
      assigned_to,
      status,
      value,
      probability,
      expected_close_date,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO tenant_data.leads (
         tenant_id, customer_id, source_id, assigned_to, status, 
         value, probability, expected_close_date, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        tenantId, customer_id, source_id, assigned_to, status,
        value, probability, expected_close_date, notes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
};

// Get a specific lead for the current tenant
export const getLead = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const leadId = req.params.id;

    const result = await pool.query(
      `SELECT l.*, 
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.email as customer_email,
              c.company as customer_company,
              u.first_name as assigned_first_name,
              u.last_name as assigned_last_name
       FROM tenant_data.leads l
       LEFT JOIN tenant_data.customers c ON l.customer_id = c.id
       LEFT JOIN public.users u ON l.assigned_to = u.id
       WHERE l.tenant_id = $1 AND l.id = $2`,
      [tenantId, leadId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
};

// Update a lead for the current tenant
export const updateLead = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const leadId = req.params.id;
    const {
      customer_id,
      source_id,
      assigned_to,
      status,
      value,
      probability,
      expected_close_date,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE tenant_data.leads
       SET customer_id = $1, source_id = $2, assigned_to = $3, status = $4,
           value = $5, probability = $6, expected_close_date = $7, notes = $8, updated_at = NOW()
       WHERE tenant_id = $9 AND id = $10
       RETURNING *`,
      [
        customer_id, source_id, assigned_to, status,
        value, probability, expected_close_date, notes,
        tenantId, leadId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

// Delete a lead for the current tenant
export const deleteLead = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const leadId = req.params.id;

    const result = await pool.query(
      'DELETE FROM tenant_data.leads WHERE tenant_id = $1 AND id = $2 RETURNING id',
      [tenantId, leadId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
};

// Get lead sources for the current tenant
export const getLeadSources = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    const result = await pool.query(
      'SELECT * FROM tenant_data.lead_sources WHERE tenant_id = $1 ORDER BY name',
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching lead sources:', error);
    res.status(500).json({ error: 'Failed to fetch lead sources' });
  }
};

// Create lead source for the current tenant
export const createLeadSource = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { name, description } = req.body;

    const result = await pool.query(
      `INSERT INTO tenant_data.lead_sources (tenant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [tenantId, name, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating lead source:', error);
    res.status(500).json({ error: 'Failed to create lead source' });
  }
};