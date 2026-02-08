import { Request, Response, NextFunction } from 'express';
import { redisCache, generateCacheKey } from '../utils/cache';

// Middleware to cache responses
export const cacheMiddleware = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Don't cache if this is a POST, PUT, DELETE, or PATCH request
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return next();
    }

    // Generate cache key based on URL and query parameters
    const cacheKey = generateCacheKey('response', `${req.url}_${JSON.stringify(req.query)}`);

    // Try to get cached response
    const cachedResponse = await redisCache.get(cacheKey);
    if (cachedResponse) {
      console.log(`Serving cached response for: ${req.url}`);
      return res.json(cachedResponse);
    }

    // Override res.json to capture the response for caching
    const originalJson = res.json;
    res.json = function(data: any) {
      // Cache the response
      redisCache.set(cacheKey, data, ttl)
        .then(success => {
          if (success) {
            console.log(`Cached response for: ${req.url}`);
          } else {
            console.error(`Failed to cache response for: ${req.url}`);
          }
        })
        .catch(err => {
          console.error(`Error caching response for ${req.url}:`, err);
        });

      // Send the original response
      return originalJson.call(this, data);
    };

    next();
  };
};

// Middleware to cache specific resources
export const resourceCacheMiddleware = (resourceType: string, ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Extract resource ID from params (assuming it's in req.params.id)
    const resourceId = req.params.id || req.params.resourceId;
    if (!resourceId) {
      return next(); // Skip caching if no resource ID
    }

    // Get tenant ID if available
    const tenantId = (req as any).tenant?.id || 'global';

    // Generate cache key
    const cacheKey = `tenant:${tenantId}:${resourceType}:${resourceId}`;

    // Try to get cached resource
    const cachedResource = await redisCache.get(cacheKey);
    if (cachedResource) {
      console.log(`Serving cached ${resourceType} for ID: ${resourceId}`);
      return res.json(cachedResource);
    }

    // Override res.json to capture the response for caching
    const originalJson = res.json;
    res.json = function(data: any) {
      // Cache the resource
      redisCache.set(cacheKey, data, ttl)
        .then(success => {
          if (success) {
            console.log(`Cached ${resourceType} for ID: ${resourceId}`);
          } else {
            console.error(`Failed to cache ${resourceType} for ID: ${resourceId}`);
          }
        })
        .catch(err => {
          console.error(`Error caching ${resourceType} for ID ${resourceId}:`, err);
        });

      // Send the original response
      return originalJson.call(this, data);
    };

    next();
  };
};

// Middleware to invalidate cache for a resource
export const invalidateCacheMiddleware = (resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Get tenant ID if available
    const tenantId = (req as any).tenant?.id || 'global';
    const resourceId = req.params.id || req.params.resourceId;

    if (resourceId) {
      // Invalidate specific resource cache
      const cacheKey = `tenant:${tenantId}:${resourceType}:${resourceId}`;
      await redisCache.delete(cacheKey);
      console.log(`Invalidated cache for ${resourceType} with ID: ${resourceId}`);
    } else {
      // Invalidate all resources of this type for the tenant
      const pattern = `tenant:${tenantId}:${resourceType}:*`;
      const deletedCount = await redisCache.clear(pattern);
      console.log(`Invalidated ${deletedCount} cached ${resourceType} records`);
    }

    next();
  };
};

// Function to manually clear cache for a specific resource
export const clearResourceCache = async (resourceType: string, resourceId: string, tenantId?: string) => {
  const actualTenantId = tenantId || 'global';
  const cacheKey = `tenant:${actualTenantId}:${resourceType}:${resourceId}`;
  return await redisCache.delete(cacheKey);
};

// Function to clear all cache for a tenant
export const clearTenantCache = async (tenantId: string) => {
  const pattern = `tenant:${tenantId}:*`;
  return await redisCache.clear(pattern);
};