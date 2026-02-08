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
    const assignedTo = req.query.assignedTo as string || '';
    const priority = req.query.priority as string || '';
    const completed = req.query.completed as string;

    // Build query conditions
    let conditions = 'WHERE t.tenant_id = $1';
    let params: any[] = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (assignedTo) {
      conditions += ` AND t.assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    if (priority) {
      conditions += ` AND t.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (completed !== undefined) {
      conditions += ` AND t.completed = $${paramIndex}`;
      params.push(completed === 'true');
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.tasks t
       LEFT JOIN tenant_data.task_categories tc ON t.category_id = tc.id
       LEFT JOIN public.users ua ON t.assigned_to = ua.id
       LEFT JOIN public.users ub ON t.assigned_by = ub.id
       ${conditions}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get tasks with pagination
    const result = await pool.query(
      `SELECT t.*, 
              tc.name as category_name,
              tc.color as category_color,
              ua.first_name as assigned_first_name,
              ua.last_name as assigned_last_name,
              ub.first_name as assigned_by_first_name,
              ub.last_name as assigned_by_last_name
       FROM tenant_data.tasks t
       LEFT JOIN tenant_data.task_categories tc ON t.category_id = tc.id
       LEFT JOIN public.users ua ON t.assigned_to = ua.id
       LEFT JOIN public.users ub ON t.assigned_by = ub.id
       ${conditions}
       ORDER BY t.due_date ASC, t.created_at DESC
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
    const userId = (req as any).user.id; // The user creating the task
    const {
      category_id,
      title,
      description,
      assigned_to,
      due_date,
      priority,
      related_entity_type,
      related_entity_id
    } = req.body;

    const result = await pool.query(
      `INSERT INTO tenant_data.tasks (
         tenant_id, category_id, title, description, assigned_to, 
         assigned_by, due_date, priority, related_entity_type, 
         related_entity_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        tenantId, category_id, title, description, assigned_to,
        userId, due_date, priority, related_entity_type,
        related_entity_id
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
              tc.name as category_name,
              tc.color as category_color,
              ua.first_name as assigned_first_name,
              ua.last_name as assigned_last_name,
              ub.first_name as assigned_by_first_name,
              ub.last_name as assigned_by_last_name
       FROM tenant_data.tasks t
       LEFT JOIN tenant_data.task_categories tc ON t.category_id = tc.id
       LEFT JOIN public.users ua ON t.assigned_to = ua.id
       LEFT JOIN public.users ub ON t.assigned_by = ub.id
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
      due_date,
      priority,
      related_entity_type,
      related_entity_id
    } = req.body;

    const result = await pool.query(
      `UPDATE tenant_data.tasks
       SET category_id = $1, title = $2, description = $3, assigned_to = $4,
           due_date = $5, priority = $6, related_entity_type = $7, 
           related_entity_id = $8, updated_at = NOW()
       WHERE tenant_id = $9 AND id = $10
       RETURNING *`,
      [
        category_id, title, description, assigned_to,
        due_date, priority, related_entity_type,
        related_entity_id,
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

// Update task completion status
export const updateTaskCompletion = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const taskId = req.params.id;
    const { completed } = req.body;

    const result = await pool.query(
      `UPDATE tenant_data.tasks
       SET completed = $1, completed_at = CASE WHEN $1 THEN NOW() ELSE NULL END, updated_at = NOW()
       WHERE tenant_id = $2 AND id = $3
       RETURNING *`,
      [completed, tenantId, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task completion:', error);
    res.status(500).json({ error: 'Failed to update task completion' });
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

// Get user's tasks
export const getUserTasks = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const userId = (req as any).user.id;

    const result = await pool.query(
      `SELECT t.*, 
              tc.name as category_name,
              tc.color as category_color,
              ua.first_name as assigned_first_name,
              ua.last_name as assigned_last_name,
              ub.first_name as assigned_by_first_name,
              ub.last_name as assigned_by_last_name
       FROM tenant_data.tasks t
       LEFT JOIN tenant_data.task_categories tc ON t.category_id = tc.id
       LEFT JOIN public.users ua ON t.assigned_to = ua.id
       LEFT JOIN public.users ub ON t.assigned_by = ub.id
       WHERE t.tenant_id = $1 AND t.assigned_to = $2
       ORDER BY t.due_date ASC, t.created_at DESC`,
      [tenantId, userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ error: 'Failed to fetch user tasks' });
  }
};

// Get overdue tasks
export const getOverdueTasks = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    const result = await pool.query(
      `SELECT t.*, 
              tc.name as category_name,
              tc.color as category_color,
              ua.first_name as assigned_first_name,
              ua.last_name as assigned_last_name,
              ub.first_name as assigned_by_first_name,
              ub.last_name as assigned_by_last_name
       FROM tenant_data.tasks t
       LEFT JOIN tenant_data.task_categories tc ON t.category_id = tc.id
       LEFT JOIN public.users ua ON t.assigned_to = ua.id
       LEFT JOIN public.users ub ON t.assigned_by = ub.id
       WHERE t.tenant_id = $1 
         AND t.completed = false 
         AND t.due_date < NOW()
       ORDER BY t.due_date ASC`,
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    res.status(500).json({ error: 'Failed to fetch overdue tasks' });
  }
};