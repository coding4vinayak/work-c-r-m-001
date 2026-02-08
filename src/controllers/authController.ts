import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { jwtConfig, bcryptConfig } from '../config/auth';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// JWT helper functions to handle typing issues
const signToken = (payload: any, secret: string, options: any = {}): string => {
  return jwt.sign(payload, secret, options);
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const userResult = await pool.query(
      `SELECT u.*, t.name as tenant_name, t.subdomain as tenant_subdomain 
       FROM public.users u 
       JOIN public.tenants t ON u.tenant_id = t.id 
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (userResult.rows.length === 0) {
      // Wait to prevent timing attacks
      await bcrypt.hash(password, 1);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE public.users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT tokens
    const accessToken = signToken(
      { userId: user.id, tenantId: user.tenant_id, role: user.role },
      jwtConfig.secret as string,
      { expiresIn: jwtConfig.expiresIn }
    );

    const refreshToken = signToken(
      { userId: user.id },
      jwtConfig.secret as string,
      { expiresIn: jwtConfig.refreshExpiresIn }
    );

    // Return user info with tokens
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        tenant: {
          id: user.tenant_id,
          name: user.tenant_name,
          subdomain: user.tenant_subdomain
        }
      },
      accessToken,
      refreshToken,
      expiresIn: jwtConfig.expiresIn
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, tenantId, role } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName || !tenantId) {
      return res.status(400).json({ error: 'All fields are required: email, password, firstName, lastName, tenantId' });
    }

    // Check if user already exists
    const existingUserResult = await pool.query(
      'SELECT id FROM public.users WHERE email = $1',
      [email]
    );

    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, bcryptConfig.saltRounds);

    // Create new user
    const result = await pool.query(
      `INSERT INTO public.users 
       (email, password_hash, tenant_id, role, first_name, last_name) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, first_name, last_name, role, tenant_id, created_at`,
      [email, hashedPassword, tenantId, role || 'client_user', firstName, lastName]
    );

    const newUser = result.rows[0];

    // Generate JWT tokens
    const accessToken = signToken(
      { userId: newUser.id, tenantId: newUser.tenant_id, role: newUser.role },
      jwtConfig.secret as string,
      { expiresIn: jwtConfig.expiresIn }
    );

    const refreshToken = signToken(
      { userId: newUser.id },
      jwtConfig.secret as string,
      { expiresIn: jwtConfig.refreshExpiresIn }
    );

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
        tenantId: newUser.tenant_id
      },
      accessToken,
      refreshToken,
      expiresIn: jwtConfig.expiresIn
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, jwtConfig.secret) as { userId: string };
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    // Check if user still exists and is active
    const userResult = await pool.query(
      'SELECT id, email, role, tenant_id FROM public.users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User no longer exists or is inactive' });
    }

    const user = userResult.rows[0];

    // Generate new access token
    const newAccessToken = signToken(
      { userId: user.id, tenantId: user.tenant_id, role: user.role },
      jwtConfig.secret as string,
      { expiresIn: jwtConfig.expiresIn }
    );

    // Generate new refresh token
    const newRefreshToken = signToken(
      { userId: user.id },
      jwtConfig.secret as string,
      { expiresIn: jwtConfig.refreshExpiresIn }
    );

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: jwtConfig.expiresIn
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

// Forgot password functionality
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email FROM public.users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists to prevent enumeration
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent' });
    }

    const user = userResult.rows[0];
    
    // Generate password reset token
    const resetToken = signToken(
      { userId: user.id, type: 'password_reset' },
      jwtConfig.secret as string,
      { expiresIn: '1h' } // 1 hour expiration
    );

    // In a real implementation, you would store the token in a database
    // and send an email with the reset link
    
    // TODO: Send email with reset token
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({ message: 'If an account with that email exists, a password reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
};

// Reset password functionality
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtConfig.secret) as { userId: string, type: string };
      
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({ error: 'Invalid token type' });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, bcryptConfig.saltRounds);

    // Update user's password
    const result = await pool.query(
      'UPDATE public.users SET password_hash = $1 WHERE id = $2 RETURNING id',
      [hashedPassword, decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role, 
             u.created_at, u.updated_at, u.last_login,
             t.name as tenant_name, t.subdomain as tenant_subdomain
      FROM public.users u
      JOIN public.tenants t ON u.tenant_id = t.id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { firstName, lastName, phone } = req.body;

    const result = await pool.query(`
      UPDATE public.users 
      SET first_name = $1, last_name = $2, phone = $3, updated_at = NOW()
      WHERE id = $4 
      RETURNING id, email, first_name, last_name, phone, role, updated_at
    `, [firstName, lastName, phone, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};