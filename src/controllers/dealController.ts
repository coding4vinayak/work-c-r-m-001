import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get all deals for the current tenant
export const getDeals = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const stage = req.query.stage as string || '';
    const assignedTo = req.query.assignedTo as string || '';
    const pipeline = req.query.pipeline as string || '';

    // Build query conditions
    let conditions = 'WHERE d.tenant_id = $1';
    let params: any[] = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions += ` AND (d.title ILIKE $${paramIndex} OR c.first_name ILIKE $${paramIndex} OR c.last_name ILIKE $${paramIndex} OR c.company ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (stage) {
      conditions += ` AND d.stage_id = $${paramIndex}`;
      params.push(stage);
      paramIndex++;
    }

    if (assignedTo) {
      conditions += ` AND d.assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    if (pipeline) {
      conditions += ` AND d.pipeline = $${paramIndex}`;
      params.push(pipeline);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.deals d
       LEFT JOIN tenant_data.customers c ON d.customer_id = c.id
       LEFT JOIN tenant_data.deal_stages ds ON d.stage_id = ds.id
       ${conditions}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get deals with pagination
    const result = await pool.query(
      `SELECT d.*, 
              ds.name as stage_name,
              ds.probability as stage_probability,
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as assigned_first_name,
              u.last_name as assigned_last_name
       FROM tenant_data.deals d
       LEFT JOIN tenant_data.customers c ON d.customer_id = c.id
       LEFT JOIN tenant_data.deal_stages ds ON d.stage_id = ds.id
       LEFT JOIN public.users u ON d.assigned_to = u.id
       ${conditions}
       ORDER BY d.created_at DESC
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
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
};

// Create a new deal for the current tenant
export const createDeal = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const {
      lead_id,
      customer_id,
      stage_id,
      assigned_to,
      title,
      description,
      value,
      currency,
      probability,
      expected_close_date,
      actual_close_date,
      pipeline,
      tags
    } = req.body;

    const result = await pool.query(
      `INSERT INTO tenant_data.deals (
         tenant_id, lead_id, customer_id, stage_id, assigned_to, title, 
         description, value, currency, probability, expected_close_date, 
         actual_close_date, pipeline, tags
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        tenantId, lead_id, customer_id, stage_id, assigned_to, title,
        description, value, currency, probability, expected_close_date,
        actual_close_date, pipeline, tags
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
};

// Get a specific deal for the current tenant
export const getDeal = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const dealId = req.params.id;

    const result = await pool.query(
      `SELECT d.*, 
              ds.name as stage_name,
              ds.probability as stage_probability,
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as assigned_first_name,
              u.last_name as assigned_last_name
       FROM tenant_data.deals d
       LEFT JOIN tenant_data.deal_stages ds ON d.stage_id = ds.id
       LEFT JOIN tenant_data.customers c ON d.customer_id = c.id
       LEFT JOIN public.users u ON d.assigned_to = u.id
       WHERE d.tenant_id = $1 AND d.id = $2`,
      [tenantId, dealId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
};

// Update a deal for the current tenant
export const updateDeal = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const dealId = req.params.id;
    const {
      lead_id,
      customer_id,
      stage_id,
      assigned_to,
      title,
      description,
      value,
      currency,
      probability,
      expected_close_date,
      actual_close_date,
      pipeline,
      tags
    } = req.body;

    const result = await pool.query(
      `UPDATE tenant_data.deals
       SET lead_id = $1, customer_id = $2, stage_id = $3, assigned_to = $4, 
           title = $5, description = $6, value = $7, currency = $8, 
           probability = $9, expected_close_date = $10, actual_close_date = $11, 
           pipeline = $12, tags = $13, updated_at = NOW()
       WHERE tenant_id = $14 AND id = $15
       RETURNING *`,
      [
        lead_id, customer_id, stage_id, assigned_to,
        title, description, value, currency,
        probability, expected_close_date, actual_close_date,
        pipeline, tags,
        tenantId, dealId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
};

// Delete a deal for the current tenant
export const deleteDeal = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const dealId = req.params.id;

    const result = await pool.query(
      'DELETE FROM tenant_data.deals WHERE tenant_id = $1 AND id = $2 RETURNING id',
      [tenantId, dealId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
};

// Get deal stages for the current tenant
export const getDealStages = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    const result = await pool.query(
      'SELECT * FROM tenant_data.deal_stages WHERE tenant_id = $1 ORDER BY order_number',
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deal stages:', error);
    res.status(500).json({ error: 'Failed to fetch deal stages' });
  }
};

// Update deal stage
export const updateDealStage = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const dealId = req.params.id;
    const { stage_id, probability } = req.body;

    const result = await pool.query(
      `UPDATE tenant_data.deals
       SET stage_id = $1, probability = $2, updated_at = NOW()
       WHERE tenant_id = $3 AND id = $4
       RETURNING *`,
      [stage_id, probability, tenantId, dealId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating deal stage:', error);
    res.status(500).json({ error: 'Failed to update deal stage' });
  }
};