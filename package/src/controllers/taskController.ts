import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get all tasks for the current tenant
export const getTasks = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const priority = req.query.priority as string || '';
    const assignedTo = req.query.assignedTo as string || '';

    // Build search and filter conditions
    let conditions = 'WHERE t.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions += ` AND t.completed = ${status === 'completed' ? 'true' : 'false'}`;
    }

    if (priority) {
      conditions += ` AND t.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (assignedTo) {
      conditions += ` AND t.assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.tasks t
       LEFT JOIN public.users u ON t.assigned_to = u.id
       LEFT JOIN public.users creator ON t.assigned_by = creator.id
       ${conditions}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get tasks with pagination and join related data
    const result = await pool.query(
      `SELECT t.*, 
         CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name,
         CONCAT(creator.first_name, ' ', creator.last_name) as assigned_by_name
       FROM tenant_data.tasks t
       LEFT JOIN public.users u ON t.assigned_to = u.id
       LEFT JOIN public.users creator ON t.assigned_by = creator.id
       ${conditions}
       ORDER BY t.created_at DESC 
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
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// Create a new task for the current tenant
export const createTask = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { 
      category_id, 
      title, 
      description, 
      assigned_to, 
      assigned_by, 
      due_date, 
      priority, 
      related_entity_type, 
      related_entity_id 
    } = req.body;

    const result = await pool.query(
      `INSERT INTO tenant_data.tasks (
         tenant_id, category_id, title, description, assigned_to, assigned_by, 
         due_date, priority, related_entity_type, related_entity_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [
        tenantId, category_id, title, description, assigned_to, assigned_by, 
        due_date, priority, related_entity_type, related_entity_id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

// Get a specific task for the current tenant
export const getTask = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const taskId = req.params.id;

    const result = await pool.query(
      `SELECT t.*, 
         CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name,
         CONCAT(creator.first_name, ' ', creator.last_name) as assigned_by_name
       FROM tenant_data.tasks t
       LEFT JOIN public.users u ON t.assigned_to = u.id
       LEFT JOIN public.users creator ON t.assigned_by = creator.id
       WHERE t.tenant_id = $1 AND t.id = $2`,
      [tenantId, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

// Update a task for the current tenant
export const updateTask = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const taskId = req.params.id;
    const { 
      category_id, 
      title, 
      description, 
      assigned_to, 
      assigned_by, 
      due_date, 
      completed, 
      completed_at, 
      priority, 
      related_entity_type, 
      related_entity_id 
    } = req.body;

    const result = await pool.query(
      `UPDATE tenant_data.tasks 
       SET category_id = $1, title = $2, description = $3, assigned_to = $4, 
           assigned_by = $5, due_date = $6, completed = $7, completed_at = $8, 
           priority = $9, related_entity_type = $10, related_entity_id = $11, 
           updated_at = NOW()
       WHERE tenant_id = $12 AND id = $13 
       RETURNING *`,
      [
        category_id, title, description, assigned_to, 
        assigned_by, due_date, completed, completed_at, 
        priority, related_entity_type, related_entity_id, 
        tenantId, taskId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// Delete a task for the current tenant
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const taskId = req.params.id;

    const result = await pool.query(
      'DELETE FROM tenant_data.tasks WHERE tenant_id = $1 AND id = $2 RETURNING id',
      [tenantId, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// Get task categories for the current tenant
export const getTaskCategories = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    const result = await pool.query(
      'SELECT * FROM tenant_data.task_categories WHERE tenant_id = $1 ORDER BY name',
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching task categories:', error);
    res.status(500).json({ error: 'Failed to fetch task categories' });
  }
};

// Mark task as completed
export const completeTask = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const taskId = req.params.id;

    const result = await pool.query(
      `UPDATE tenant_data.tasks 
       SET completed = true, completed_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2 AND completed = false
       RETURNING *`,
      [tenantId, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or already completed' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
};

// Mark task as incomplete
export const uncompleteTask = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const taskId = req.params.id;

    const result = await pool.query(
      `UPDATE tenant_data.tasks 
       SET completed = false, completed_at = NULL, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2 AND completed = true
       RETURNING *`,
      [tenantId, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or already incomplete' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error uncompleting task:', error);
    res.status(500).json({ error: 'Failed to uncomplete task' });
  }
};