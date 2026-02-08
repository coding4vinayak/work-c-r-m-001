import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get all automation workflows for the current tenant
export const getWorkflows = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';

    // Build query conditions
    let conditions = 'WHERE w.tenant_id = $1';
    let params: any[] = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions += ` AND (w.name ILIKE $${paramIndex} OR w.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions += ` AND w.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.workflows w
       ${conditions}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get workflows with pagination
    const result = await pool.query(
      `SELECT *
       FROM tenant_data.workflows w
       ${conditions}
       ORDER BY w.created_at DESC
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
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
};

// Create a new automation workflow for the current tenant
export const createWorkflow = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const userId = (req as any).user.id; // The user creating the workflow
    const {
      name,
      description,
      trigger_entity,
      trigger_event,
      conditions,
      actions,
      is_active
    } = req.body;

    // Create the workflow
    const result = await pool.query(
      `INSERT INTO tenant_data.workflows (
         tenant_id, created_by, name, description, trigger_entity, 
         trigger_event, conditions, actions, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        tenantId, userId, name, description, trigger_entity,
        trigger_event, JSON.stringify(conditions), JSON.stringify(actions), 
        is_active !== undefined ? is_active : true
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
};

// Get a specific workflow for the current tenant
export const getWorkflow = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const workflowId = req.params.id;

    const result = await pool.query(
      `SELECT *
       FROM tenant_data.workflows
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, workflowId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Parse JSON fields
    const workflow = result.rows[0];
    workflow.conditions = JSON.parse(workflow.conditions);
    workflow.actions = JSON.parse(workflow.actions);

    res.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
};

// Update a workflow for the current tenant
export const updateWorkflow = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const workflowId = req.params.id;
    const {
      name,
      description,
      trigger_entity,
      trigger_event,
      conditions,
      actions,
      is_active
    } = req.body;

    const result = await pool.query(
      `UPDATE tenant_data.workflows
       SET name = $1, description = $2, trigger_entity = $3, 
           trigger_event = $4, conditions = $5, actions = $6, 
           is_active = $7, updated_at = NOW()
       WHERE tenant_id = $8 AND id = $9
       RETURNING *`,
      [
        name, description, trigger_entity,
        trigger_event, JSON.stringify(conditions), JSON.stringify(actions),
        is_active,
        tenantId, workflowId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Parse JSON fields
    const workflow = result.rows[0];
    workflow.conditions = JSON.parse(workflow.conditions);
    workflow.actions = JSON.parse(workflow.actions);

    res.json(workflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
};

// Delete a workflow for the current tenant
export const deleteWorkflow = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const workflowId = req.params.id;

    const result = await pool.query(
      'DELETE FROM tenant_data.workflows WHERE tenant_id = $1 AND id = $2 RETURNING id',
      [tenantId, workflowId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
};

// Activate a workflow
export const activateWorkflow = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const workflowId = req.params.id;

    const result = await pool.query(
      `UPDATE tenant_data.workflows
       SET is_active = true, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING *`,
      [tenantId, workflowId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error activating workflow:', error);
    res.status(500).json({ error: 'Failed to activate workflow' });
  }
};

// Deactivate a workflow
export const deactivateWorkflow = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const workflowId = req.params.id;

    const result = await pool.query(
      `UPDATE tenant_data.workflows
       SET is_active = false, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING *`,
      [tenantId, workflowId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error deactivating workflow:', error);
    res.status(500).json({ error: 'Failed to deactivate workflow' });
  }
};

// Get workflow triggers for the current tenant
export const getWorkflowTriggers = async (req: Request, res: Response) => {
  try {
    // Return predefined list of possible triggers
    const triggers = [
      { entity: 'lead', event: 'created', description: 'When a new lead is created' },
      { entity: 'lead', event: 'updated', description: 'When a lead is updated' },
      { entity: 'lead', event: 'status_changed', description: 'When a lead status changes' },
      { entity: 'deal', event: 'created', description: 'When a new deal is created' },
      { entity: 'deal', event: 'updated', description: 'When a deal is updated' },
      { entity: 'deal', event: 'stage_changed', description: 'When a deal stage changes' },
      { entity: 'customer', event: 'created', description: 'When a new customer is created' },
      { entity: 'customer', event: 'updated', description: 'When a customer is updated' },
      { entity: 'task', event: 'created', description: 'When a new task is created' },
      { entity: 'task', event: 'completed', description: 'When a task is marked as completed' },
      { entity: 'invoice', event: 'created', description: 'When a new invoice is created' },
      { entity: 'invoice', event: 'paid', description: 'When an invoice is paid' },
      { entity: 'invoice', event: 'overdue', description: 'When an invoice becomes overdue' }
    ];

    res.json(triggers);
  } catch (error) {
    console.error('Error fetching workflow triggers:', error);
    res.status(500).json({ error: 'Failed to fetch workflow triggers' });
  }
};

// Get workflow actions for the current tenant
export const getWorkflowActions = async (req: Request, res: Response) => {
  try {
    // Return predefined list of possible actions
    const actions = [
      { type: 'create_task', description: 'Create a new task' },
      { type: 'send_email', description: 'Send an email' },
      { type: 'update_field', description: 'Update a field value' },
      { type: 'create_notification', description: 'Create a notification' },
      { type: 'update_status', description: 'Update status of entity' },
      { type: 'assign_user', description: 'Assign to a user' },
      { type: 'send_sms', description: 'Send an SMS message' },
      { type: 'create_activity', description: 'Log an activity' }
    ];

    res.json(actions);
  } catch (error) {
    console.error('Error fetching workflow actions:', error);
    res.status(500).json({ error: 'Failed to fetch workflow actions' });
  }
};

// Get workflow execution history
export const getWorkflowHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const workflowId = req.params.workflowId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Build query conditions
    let conditions = 'WHERE wh.tenant_id = $1';
    let params: any[] = [tenantId];
    let paramIndex = 2;

    if (workflowId) {
      conditions += ` AND wh.workflow_id = $${paramIndex}`;
      params.push(workflowId);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.workflow_history wh
       ${conditions}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get workflow history with pagination
    const result = await pool.query(
      `SELECT wh.*, w.name as workflow_name
       FROM tenant_data.workflow_history wh
       LEFT JOIN tenant_data.workflows w ON wh.workflow_id = w.id
       ${conditions}
       ORDER BY wh.executed_at DESC
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
    console.error('Error fetching workflow history:', error);
    res.status(500).json({ error: 'Failed to fetch workflow history' });
  }
};