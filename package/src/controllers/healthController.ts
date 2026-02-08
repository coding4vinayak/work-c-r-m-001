import { Request, Response } from 'express';
import { pool } from '../config/database';

// Detailed health check endpoint
export const healthCheck = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const dbStartTime = Date.now();
    let dbStatus = 'unknown';
    let dbResponseTime = 0;
    
    try {
      await pool.query('SELECT 1');
      dbStatus = 'ok';
      dbResponseTime = Date.now() - dbStartTime;
    } catch (dbError) {
      dbStatus = 'error';
      console.error('Database health check failed:', dbError);
    }
    
    // Check Redis connectivity if available
    let redisStatus = 'disabled'; // Assuming Redis isn't integrated yet
    let redisResponseTime = 0;
    
    // Calculate total response time
    const totalResponseTime = Date.now() - startTime;
    
    // Prepare health check response
    const healthStatus = {
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: totalResponseTime,
      checks: {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime
        },
        redis: {
          status: redisStatus,
          responseTime: redisResponseTime
        }
      }
    };
    
    // Return appropriate status code
    const statusCode = dbStatus === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

// Liveness probe - checks if the application is running
export const livenessCheck = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// Readiness probe - checks if the application is ready to serve traffic
export const readinessCheck = async (req: Request, res: Response) => {
  try {
    // Check if database is accessible
    await pool.query('SELECT 1');
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Database not accessible'
    });
  }
};