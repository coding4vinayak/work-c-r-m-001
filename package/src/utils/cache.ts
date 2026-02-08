import { createClient, RedisClientType } from 'redis';
import { z } from 'zod';

// Define schema for cache entry
const CacheEntrySchema = z.object({
  data: z.any(),
  ttl: z.number().optional(), // Time to live in seconds
  createdAt: z.number(), // Timestamp when cached
  expiresAt: z.number(), // Timestamp when it expires
});

type CacheEntry<T = any> = z.infer<typeof CacheEntrySchema>;

class RedisCache {
  private client: RedisClientType | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected) return;

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    // redisUrl will never be falsy since we provide a default, so no need to check
    
    try {
      this.client = createClient({ url: redisUrl });
      
      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('Connected to Redis');
      });

      await this.client.connect();
      this.isConnected = true;
      console.log('Redis cache initialized successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('Disconnected from Redis');
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const cacheEntry: CacheEntry<T> = {
        data: value,
        ttl,
        createdAt: Date.now(),
        expiresAt: ttl ? Date.now() + (ttl * 1000) : Number.MAX_SAFE_INTEGER,
      };

      const serializedValue = JSON.stringify(cacheEntry);
      
      if (ttl) {
        await this.client?.setEx(key, ttl, serializedValue);
      } else {
        await this.client?.set(key, serializedValue);
      }

      return true;
    } catch (error) {
      console.error(`Error setting cache for key ${key}:`, error);
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const value = await this.client?.get(key);
      
      if (value === null || value === undefined) {
        return null;
      }

      const parsedValue = JSON.parse(value as string);
      const result = CacheEntrySchema.safeParse(parsedValue);
      
      if (!result.success) {
        console.error(`Invalid cache entry for key ${key}:`, result.error);
        return null;
      }

      const cacheEntry = result.data as CacheEntry<T>;
      
      // Check if the entry has expired
      if (cacheEntry.expiresAt < Date.now()) {
        // Entry has expired, remove it
        await this.delete(key);
        return null;
      }

      return cacheEntry.data as T;
    } catch (error) {
      console.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const deleted = await this.client?.del(key);
      return (deleted ?? 0) > 0;
    } catch (error) {
      console.error(`Error deleting cache for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const exists = await this.client?.exists(key);
      return (exists ?? 0) > 0;
    } catch (error) {
      console.error(`Error checking existence of cache for key ${key}:`, error);
      return false;
    }
  }

  async clear(pattern: string = '*'): Promise<number> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const keys = await this.client?.keys(pattern);
      if (keys && keys.length > 0) {
        const deleted = await this.client?.del(keys);
        return deleted ? deleted : 0;
      }
      return 0;
    } catch (error) {
      console.error(`Error clearing cache with pattern ${pattern}:`, error);
      return 0;
    }
  }

  async getKeys(pattern: string = '*'): Promise<string[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      return await this.client?.keys(pattern) || [];
    } catch (error) {
      console.error(`Error getting keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  // Method to get cache statistics
  async getStats(): Promise<{ connected: boolean; keysCount: number; memoryUsage: string }> {
    if (!this.isConnected) {
      return { connected: false, keysCount: 0, memoryUsage: 'N/A' };
    }

    try {
      const info = await this.client?.info('memory');
      const keyspaceInfo = await this.client?.info('keyspace');
      
      // Parse memory usage from info
      let memoryUsage = 'N/A';
      if (info) {
        const memoryMatch = info.match(/used_memory_human:(.+)/);
        if (memoryMatch) {
          memoryUsage = memoryMatch[1].trim();
        }
      }
      
      // Parse keys count from keyspace info
      let keysCount = 0;
      if (keyspaceInfo) {
        const keysMatch = keyspaceInfo.match(/keys=(\d+)/);
        if (keysMatch) {
          keysCount = parseInt(keysMatch[1], 10);
        }
      }
      
      return {
        connected: this.isConnected,
        keysCount,
        memoryUsage
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { connected: this.isConnected, keysCount: 0, memoryUsage: 'N/A' };
    }
  }
}

// Singleton instance
export const redisCache = new RedisCache();

// Tenant-aware cache key generator
export const generateTenantCacheKey = (tenantId: string, resourceType: string, resourceId: string): string => {
  return `tenant:${tenantId}:${resourceType}:${resourceId}`;
};

// Standard cache key generator
export const generateCacheKey = (prefix: string, id: string): string => {
  return `${prefix}:${id}`;
};

// Cache decorator for methods
export const Cacheable = (ttl: number = 300) => {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      // Generate cache key based on method name and arguments
      const cacheKey = `method:${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      // Try to get from cache first
      const cachedResult = await redisCache.get(cacheKey);
      if (cachedResult !== null) {
        console.log(`Cache hit for key: ${cacheKey}`);
        return cachedResult;
      }
      
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Store in cache
      await redisCache.set(cacheKey, result, ttl);
      
      return result;
    };
  };
};

// Cache utility for tenant-specific data
export const tenantCache = {
  // Cache tenant-specific customer data
  async setCustomer(tenantId: string, customerId: string, data: any, ttl?: number) {
    const key = generateTenantCacheKey(tenantId, 'customer', customerId);
    return await redisCache.set(key, data, ttl);
  },

  async getCustomer(tenantId: string, customerId: string) {
    const key = generateTenantCacheKey(tenantId, 'customer', customerId);
    return await redisCache.get(key);
  },

  // Cache tenant-specific lead data
  async setLead(tenantId: string, leadId: string, data: any, ttl?: number) {
    const key = generateTenantCacheKey(tenantId, 'lead', leadId);
    return await redisCache.set(key, data, ttl);
  },

  async getLead(tenantId: string, leadId: string) {
    const key = generateTenantCacheKey(tenantId, 'lead', leadId);
    return await redisCache.get(key);
  },

  // Cache tenant-specific deal data
  async setDeal(tenantId: string, dealId: string, data: any, ttl?: number) {
    const key = generateTenantCacheKey(tenantId, 'deal', dealId);
    return await redisCache.set(key, data, ttl);
  },

  async getDeal(tenantId: string, dealId: string) {
    const key = generateTenantCacheKey(tenantId, 'deal', dealId);
    return await redisCache.get(key);
  },

  // Clear all cache for a tenant
  async clearTenant(tenantId: string) {
    const pattern = `tenant:${tenantId}:*`;
    return await redisCache.clear(pattern);
  }
};