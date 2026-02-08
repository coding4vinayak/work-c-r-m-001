// No rate limiting - completely disabled
export const globalRateLimiter = (req: any, res: any, next: any) => next();

// API-specific rate limiter
export const apiRateLimiter = (req: any, res: any, next: any) => next();

// Auth-specific rate limiter (stricter limits for auth endpoints)
export const authRateLimiter = (req: any, res: any, next: any) => next();

// Specific endpoint rate limiters
export const createEndpointRateLimiter = (windowMs: number, max: number, message?: string) => {
  // No rate limiting - return middleware that just calls next()
  return (req: any, res: any, next: any) => next();
};

// Tenant-aware rate limiting
export const tenantRateLimiter = (req: any, res: any, next: any) => {
  // No rate limiting - just call next()
  return next();
};

// Function to get tenant-specific rate limits
const getTenantRateLimits = (tenantId: string) => {
  // In a real implementation, this would come from a database or configuration
  // For now, we'll use a simple mapping based on tenant plan
  const planLimits: Record<string, { windowMs: number; max: number }> = {
    'free': { windowMs: 15 * 60 * 1000, max: 100 },      // 100 requests per 15 min
    'basic': { windowMs: 15 * 60 * 1000, max: 500 },     // 500 requests per 15 min
    'premium': { windowMs: 15 * 60 * 1000, max: 2000 },  // 2000 requests per 15 min
    'enterprise': { windowMs: 15 * 60 * 1000, max: 10000 } // 10000 requests per 15 min
  };

  // Default to basic plan if no tenant ID or plan is found
  return planLimits[tenantId] || planLimits['basic'];
};

// Rate limiting metrics middleware
export const rateLimitMetrics = (req: any, res: any, next: any) => {
  // No rate limiting metrics - just call next()
  next();
};