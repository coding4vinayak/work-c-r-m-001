import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection configuration for ABETWORKS WORKCRM
export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || process.env.REDIS_URL?.split(':')[1]?.replace('//', '') || 'localhost',
  port: parseInt(process.env.REDIS_PORT || process.env.REDIS_URL?.split(':')[2] || '6379'),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  // Connection options for optimal performance
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '30000'), // 30 seconds
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '20000'), // 20 seconds
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
  enableReadyCheck: true,
  lazyConnect: true, // Don't connect immediately
  // Removed unsupported options
  // retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'), // 100ms
  // maxLoadingTimeout: parseInt(process.env.REDIS_MAX_LOADING_TIMEOUT || '2000'), // 2 seconds
  readOnly: false,
  // TLS configuration (if needed)
  tls: process.env.REDIS_TLS === 'true' ? {
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false'
  } : undefined,
});

// Test Redis connection
export const connectRedis = async () => {
  try {
    await redisConnection.connect();
    console.log('Redis connected successfully for ABETWORKS WORKCRM');
    
    // Test the connection
    await redisConnection.ping();
    console.log('Redis ping successful');
  } catch (error) {
    console.error('Failed to connect to Redis for ABETWORKS WORKCRM:', error);
    process.exit(1);
  }
};

// Function to close Redis connection
export const closeRedis = async () => {
  console.log('Closing Redis connection...');
  await redisConnection.quit();
  console.log('Redis connection closed');
};

// Export for use in other modules
export default redisConnection;