import rateLimit from 'express-rate-limit';

// Global rate limiter for all requests
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for certain paths or conditions
    if (req.path.startsWith('/health') || req.path.startsWith('/metrics')) {
      return true;
    }
    return false;
  }
});

// API-specific rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs to the API
  message: {
    error: 'Too many API requests from this IP, please try again later.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use tenant ID as part of the key if available, otherwise use IP
    const tenantId = (req as any).tenant?.id;
    return tenantId ? `${req.ip}-${tenantId}` : req.ip || 'unknown';
  }
});

// Auth-specific rate limiter (stricter limits for auth endpoints)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts from this IP, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Only count failed requests
});

// Specific endpoint rate limiters
export const createEndpointRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message || 'Too many requests, please try again later.',
      code: 'ENDPOINT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Tenant-aware rate limiting
export const tenantRateLimiter = (req: any, res: any, next: any) => {
  // Get tenant-specific rate limits
  const tenantId = req.tenant?.id;
  const tenantLimits = getTenantRateLimits(tenantId);

  const limiter = rateLimit({
    windowMs: tenantLimits.windowMs,
    max: tenantLimits.max,
    message: {
      error: `Tenant ${tenantId} has exceeded rate limit.`,
      code: 'TENANT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: () => tenantId // Use tenant ID as the key
  });

  limiter(req, res, next);
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
  res.on('finish', () => {
    // Track rate limiting metrics
    if (res.statusCode === 429) {
      // Increment rate limit exceeded counter
      console.log(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      // In a real implementation, this would increment a Prometheus counter
    }
  });

  next();
};