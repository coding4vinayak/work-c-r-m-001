import { BaseError } from '../middleware/errorHandler';

// Interface for error reporting configuration
interface ErrorReportingConfig {
  enabled: boolean;
  serviceName: string;
  environment: string;
  apiKey?: string;
  endpoint?: string;
}

// Default configuration
const defaultConfig: ErrorReportingConfig = {
  enabled: process.env.NODE_ENV === 'production',
  serviceName: process.env.SERVICE_NAME || 'abetworks-workcrm',
  environment: process.env.NODE_ENV || 'development',
  apiKey: process.env.ERROR_REPORTING_API_KEY,
  endpoint: process.env.ERROR_REPORTING_ENDPOINT
};

// Function to report errors to external service (e.g., Sentry, Rollbar)
export const reportError = async (
  error: Error | BaseError, 
  context?: Record<string, any>,
  config: ErrorReportingConfig = defaultConfig
) => {
  if (!config.enabled) {
    // In non-production environments, just log to console
    console.error('Error reported:', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    // Prepare error payload
    const errorPayload = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      service: config.serviceName,
      environment: config.environment,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        userAgent: context?.userAgent || 'unknown',
        url: context?.url || 'unknown',
        method: context?.method || 'unknown',
        tenantId: context?.tenantId || 'unknown',
        userId: context?.userId || 'unknown'
      }
    };

    // Send error to external reporting service
    // This is a placeholder - in a real implementation, you would send to Sentry, Rollbar, etc.
    if (config.endpoint && config.apiKey) {
      await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(errorPayload)
      });
    } else {
      // Fallback: log to console in production if no external service is configured
      console.error('External error reporting not configured, logging locally:', errorPayload);
    }
  } catch (reportingError) {
    // If error reporting fails, at least log that
    console.error('Failed to report error to external service:', reportingError);
    console.error('Original error:', error);
  }
};

// Function to create error context from request
export const createContextFromRequest = (req: any) => {
  return {
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    tenantId: req.tenant?.id,
    userId: req.user?.id,
    headers: {
      'x-forwarded-for': req.get('x-forwarded-for'),
      'x-real-ip': req.get('x-real-ip')
    }
  };
};

// Wrapper function to handle and report errors
export const handleErrorAndReport = async (
  error: Error | BaseError,
  req?: any,
  additionalContext?: Record<string, any>
) => {
  // Create context
  let context = {};
  if (req) {
    context = createContextFromRequest(req);
  }
  
  // Merge with additional context
  if (additionalContext) {
    context = { ...context, ...additionalContext };
  }

  // Report error
  await reportError(error, context);

  // Re-throw or return error for further handling
  return error;
};