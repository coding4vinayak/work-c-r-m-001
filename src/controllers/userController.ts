import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { bcryptConfig } from '../config/auth';

// Get all users for the current tenant
export const getUsers = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';

    // Build search condition
    let searchCondition = '';
    const searchParams = [];
    if (search) {
      searchCondition = `AND (first_name ILIKE $3 OR last_name ILIKE $3 OR email ILIKE $3)`;
      searchParams.push(`%${search}%`);
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM public.users
       WHERE tenant_id = $1 AND is_active = true ${searchCondition}`,
      [tenantId, ...searchParams]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get users with pagination
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, phone, is_active, 
              created_at, updated_at, last_login
       FROM public.users
       WHERE tenant_id = $1 AND is_active = true ${searchCondition}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset, ...searchParams]
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
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get a specific user
export const getUser = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const userId = req.params.id;

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, phone, is_active, 
              created_at, updated_at, last_login
       FROM public.users 
       WHERE tenant_id = $1 AND id = $2 AND is_active = true`,
      [tenantId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Create a new user
export const createUser = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { email, password, firstName, lastName, role, phone } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, firstName, and lastName are required' });
    }

    // Check if user already exists
    const existingUserResult = await pool.query(
      'SELECT id FROM public.users WHERE email = $1 AND tenant_id = $2',
      [email, tenantId]
    );

    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists in this tenant' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, bcryptConfig.saltRounds);

    // Create new user
    const result = await pool.query(
      `INSERT INTO public.users 
       (email, password_hash, tenant_id, role, first_name, last_name, phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email, first_name, last_name, role, phone, created_at`,
      [email, hashedPassword, tenantId, role || 'client_user', firstName, lastName, phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update a user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const userId = req.params.id;
    const { firstName, lastName, role, phone, isActive } = req.body;

    const result = await pool.query(
      `UPDATE public.users 
       SET first_name = $1, last_name = $2, role = $3, phone = $4, 
           is_active = $5, updated_at = NOW()
       WHERE tenant_id = $6 AND id = $7
       RETURNING id, email, first_name, last_name, role, phone, is_active, updated_at`,
      [firstName, lastName, role, phone, isActive, tenantId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Update user password
export const updateUserPassword = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, bcryptConfig.saltRounds);

    const result = await pool.query(
      `UPDATE public.users 
       SET password_hash = $1, updated_at = NOW()
       WHERE tenant_id = $2 AND id = $3
       RETURNING id`,
      [hashedPassword, tenantId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating user password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

// Delete a user (soft delete by deactivation)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const userId = req.params.id;

    const result = await pool.query(
      `UPDATE public.users 
       SET is_active = false, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2 AND role != 'client_admin'
       RETURNING id`,
      [tenantId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or cannot delete admin user' });
    }

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};

// Get current user's permissions
export const getUserPermissions = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Define permissions based on user role
    const permissions: Record<string, boolean> = {
      // Customer permissions
      'customers.read': true,
      'customers.create': user.role === 'client_admin' || user.role === 'client_user',
      'customers.update': user.role === 'client_admin' || user.role === 'client_user',
      'customers.delete': user.role === 'client_admin',

      // Lead permissions
      'leads.read': true,
      'leads.create': user.role === 'client_admin' || user.role === 'client_user',
      'leads.update': user.role === 'client_admin' || user.role === 'client_user',
      'leads.delete': user.role === 'client_admin',

      // Deal permissions
      'deals.read': true,
      'deals.create': user.role === 'client_admin' || user.role === 'client_user',
      'deals.update': user.role === 'client_admin' || user.role === 'client_user',
      'deals.delete': user.role === 'client_admin',

      // Task permissions
      'tasks.read': true,
      'tasks.create': user.role === 'client_admin' || user.role === 'client_user',
      'tasks.update': user.role === 'client_admin' || user.role === 'client_user',
      'tasks.delete': user.role === 'client_admin',

      // User management permissions (admin only)
      'users.manage': user.role === 'client_admin' || user.role === 'abetworks_super_admin',

      // Settings permissions
      'settings.manage': user.role === 'client_admin' || user.role === 'abetworks_super_admin',
    };

    res.json({ role: user.role, permissions });
  } catch (error) {
    console.error('Error getting user permissions:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
};