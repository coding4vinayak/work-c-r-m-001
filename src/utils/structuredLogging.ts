import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// Define colors for log levels
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define transports for different log levels
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        let msg = `${timestamp} [${level}] ${message}`;
        if (metadata && Object.keys(metadata).length > 0) {
          msg += ` | ${JSON.stringify(metadata)}`;
        }
        return msg;
      })
    )
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
    format
  }),
  // Daily rotation transport (if needed)
  // new winston.transports.DailyRotateFile({
  //   filename: 'logs/application-%DATE%.log',
  //   datePattern: 'YYYY-MM-DD',
  //   maxSize: '20m',
  //   maxFiles: '14d',
  //   format
  // })
];

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log', format })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log', format })
  ]
});

// Ensure logs directory exists
import fs from 'fs';
import path from 'path';

const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Request logging middleware with correlation IDs
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4(); // Generate a unique request ID for correlation
  const startTime = Date.now();

  // Add request ID to the request object for use in other middleware
  (req as any).requestId = requestId;

  // Log the incoming request
  logger.http('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    headers: {
      'user-agent': req.get('User-Agent'),
      'content-type': req.get('Content-Type'),
      'x-forwarded-for': req.get('X-Forwarded-For'),
    },
    ip: req.ip,
    tenantId: (req as any).tenant?.id || 'unknown',
    userId: (req as any).user?.id || 'anonymous'
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log the outgoing response
    logger.http('Outgoing response', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      tenantId: (req as any).tenant?.id || 'unknown',
      userId: (req as any).user?.id || 'anonymous'
    });
  });

  next();
};

// Error logging middleware
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    headers: req.headers,
    ip: req.ip,
    tenantId: (req as any).tenant?.id || 'unknown',
    userId: (req as any).user?.id || 'unknown',
    requestId: (req as any).requestId || 'unknown'
  });

  next(err);
};

// Performance metrics logging
export const performanceMetrics = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.verbose('Performance metric', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      tenantId: (req as any).tenant?.id || 'unknown',
      userId: (req as any).user?.id || 'unknown',
      requestId: (req as any).requestId || 'unknown'
    });

    // Log slow requests
    if (duration > 1000) { // Log requests taking more than 1 second
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        tenantId: (req as any).tenant?.id || 'unknown',
        userId: (req as any).user?.id || 'unknown',
        requestId: (req as any).requestId || 'unknown'
      });
    }
  });

  next();
};

// Audit logging for sensitive operations
export const auditLogger = {
  userLogin: (userId: string, tenantId: string, ip: string, userAgent: string) => {
    logger.info('User login', {
      userId,
      tenantId,
      ip,
      userAgent,
      action: 'login',
      category: 'authentication'
    });
  },

  userLogout: (userId: string, tenantId: string) => {
    logger.info('User logout', {
      userId,
      tenantId,
      action: 'logout',
      category: 'authentication'
    });
  },

  dataAccess: (userId: string, tenantId: string, resourceType: string, resourceId: string, action: string) => {
    logger.verbose('Data access', {
      userId,
      tenantId,
      resourceType,
      resourceId,
      action,
      category: 'data_access'
    });
  },

  dataModification: (userId: string, tenantId: string, resourceType: string, resourceId: string, action: string, oldValue?: any, newValue?: any) => {
    logger.info('Data modification', {
      userId,
      tenantId,
      resourceType,
      resourceId,
      action,
      oldValue,
      newValue,
      category: 'data_modification'
    });
  },

  permissionDenied: (userId: string, tenantId: string, resourceType: string, resourceId: string, action: string) => {
    logger.warn('Permission denied', {
      userId,
      tenantId,
      resourceType,
      resourceId,
      action,
      category: 'security'
    });
  }
};

// Function to log custom application events
export const logEvent = (level: keyof typeof levels, message: string, meta?: any) => {
  logger.log(level, message, meta);
};

// Function to create a child logger with additional context
export const createChildLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

// Health check for logging system
export const isLoggingHealthy = (): boolean => {
  try {
    // Check if transports are functioning
    const healthyTransports = logger.transports.filter(transport => 
      transport.handleExceptions
    ).length > 0;
    
    return healthyTransports;
  } catch (error) {
    logger.error('Logging system health check failed', { error });
    return false;
  }
};