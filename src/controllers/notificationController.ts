import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get all notifications for the current user
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tenantId = (req as any).tenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const isRead = req.query.isRead as string;

    // Build query conditions
    let conditions = 'WHERE n.tenant_id = $1 AND n.user_id = $2';
    let params: any[] = [tenantId, userId];
    let paramIndex = 3;

    if (isRead !== undefined) {
      conditions += ` AND n.is_read = $${paramIndex}`;
      params.push(isRead === 'true');
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.notifications n
       ${conditions}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get notifications with pagination
    const result = await pool.query(
      `SELECT *
       FROM tenant_data.notifications n
       ${conditions}
       ORDER BY n.created_at DESC
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
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Get unread notifications for the current user
export const getUnreadNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tenantId = (req as any).tenant.id;

    const result = await pool.query(
      `SELECT *
       FROM tenant_data.notifications
       WHERE tenant_id = $1 AND user_id = $2 AND is_read = false
       ORDER BY created_at DESC`,
      [tenantId, userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tenantId = (req as any).tenant.id;
    const notificationId = req.params.id;

    const result = await pool.query(
      `UPDATE tenant_data.notifications
       SET is_read = true, updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND id = $3
       RETURNING *`,
      [tenantId, userId, notificationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read for the current user
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tenantId = (req as any).tenant.id;

    await pool.query(
      `UPDATE tenant_data.notifications
       SET is_read = true, updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND is_read = false`,
      [tenantId, userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

// Create a notification (for internal use)
export const createNotification = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { userId, title, message, type, relatedEntityType, relatedEntityId } = req.body;

    // Verify that the user belongs to the current tenant
    const userResult = await pool.query(
      `SELECT id FROM public.users WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in this tenant' });
    }

    const result = await pool.query(
      `INSERT INTO tenant_data.notifications (
         tenant_id, user_id, title, message, type, related_entity_type, related_entity_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [tenantId, userId, title, message, type, relatedEntityType, relatedEntityId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
};

// Delete a notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tenantId = (req as any).tenant.id;
    const notificationId = req.params.id;

    const result = await pool.query(
      'DELETE FROM tenant_data.notifications WHERE tenant_id = $1 AND user_id = $2 AND id = $3 RETURNING id',
      [tenantId, userId, notificationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Get notification count for the current user
export const getNotificationCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tenantId = (req as any).tenant.id;

    const result = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN is_read = false THEN 1 END) as unread
       FROM tenant_data.notifications
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );

    const { total, unread } = result.rows[0];
    res.json({ total: parseInt(total), unread: parseInt(unread) });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({ error: 'Failed to fetch notification count' });
  }
};