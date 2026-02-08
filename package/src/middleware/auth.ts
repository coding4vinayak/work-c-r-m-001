import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/auth';
import { pool } from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: any;
  tenant?: any;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided for ABETWORKS WORKCRM.' 
      });
    }

    // Verify JWT token for ABETWORKS WORKCRM
    const decoded = jwt.verify(token, jwtConfig.secret) as { userId: string };
    
    // Get user with tenant association for ABETWORKS WORKCRM
    const userResult = await pool.query(
      'SELECT * FROM public.users WHERE id = $1 AND is_active = true', 
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid token or user inactive in ABETWORKS WORKCRM.' 
      });
    }

    const user = userResult.rows[0];

    // Verify user belongs to current tenant (for non-super admins) in ABETWORKS platform
    if (user.role !== 'abetworks_super_admin' && req.tenant && user.tenant_id !== req.tenant.id) {
      return res.status(403).json({ 
        error: 'Access forbidden in ABETWORKS WORKCRM' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ 
        error: 'Invalid token for ABETWORKS WORKCRM.' 
      });
    }
    
    console.error('Authentication error in ABETWORKS WORKCRM:', error);
    res.status(500).json({ error: 'Internal server error in ABETWORKS WORKCRM' });
  }
};