import { reportError, createContextFromRequest } from '../utils/errorReporting';

// Custom error classes for ABETWORKS WORKCRM
export class BaseError extends Error {
  public readonly name: string;
  public readonly status: number;
  public readonly isOperational: boolean;
  public readonly tenantId?: string;
  public readonly userId?: string;

  constructor(
    name: string,
    message: string,
    status: number,
    isOperational: boolean,
    tenantId?: string,
    userId?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = name;
    this.status = status;
    this.isOperational = isOperational;
    this.tenantId = tenantId;
    this.userId = userId;
    Error.captureStackTrace(this);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, tenantId?: string, userId?: string) {
    super('ValidationError', message, 400, true, tenantId, userId);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string, tenantId?: string, userId?: string) {
    super('NotFoundError', message, 404, true, tenantId, userId);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string, tenantId?: string, userId?: string) {
    super('UnauthorizedError', message, 401, true, tenantId, userId);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string, tenantId?: string, userId?: string) {
    super('ForbiddenError', message, 403, true, tenantId, userId);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, tenantId?: string, userId?: string) {
    super('ConflictError', message, 409, true, tenantId, userId);
  }
}

export class InternalError extends BaseError {
  constructor(message: string, tenantId?: string, userId?: string) {
    super('InternalError', message, 500, false, tenantId, userId);
  }
}

export class ServiceUnavailableError extends BaseError {
  constructor(message: string, tenantId?: string, userId?: string) {
    super('ServiceUnavailableError', message, 503, true, tenantId, userId);
  }
}

// Error handler middleware
export const errorHandler = async (err: any, req: any, res: any, next: any) => {
  // Determine if this is a known error type
  let error = err;
  
  if (!(err instanceof BaseError)) {
    // If it's not a known error, create a generic internal error
    const tenantId = (req as any).tenant?.id;
    const userId = (req as any).user?.id;
    
    error = new InternalError(
      process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message || 'Internal server error',
      tenantId,
      userId
    );
  }

  // Report error to external service
  await reportError(error, createContextFromRequest(req));

  // Log the error
  console.error({
    message: error.message,
    stack: error.stack,
    name: error.name,
    status: error.status,
    tenantId: error.tenantId,
    userId: error.userId,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Send response
  res.status(error.status).json({
    success: false,
    error: {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
};