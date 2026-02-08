import { Request, Response } from 'express';
import { pool } from '../config/database';

export const healthCheck = async (req: Request, res: Response) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    
    // Additional health checks can be added here
    // For example, check Redis connection, external services, etc.
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: 'ok'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
};

export const livenessCheck = async (req: Request, res: Response) => {
  // Liveness probe indicates if the application is running
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
};

export const readinessCheck = async (req: Request, res: Response) => {
  try {
    // Readiness probe indicates if the application is ready to serve traffic
    // Check database connectivity
    await pool.query('SELECT 1');
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
};