import Redis from 'redis';

// Redis connection configuration
export const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
};

// Create Redis client
export const redisClient = Redis.createClient({
  socket: {
    host: redisConnection.host,
    port: redisConnection.port,
  },
  password: redisConnection.password,
  database: redisConnection.db,
});

// Connect to Redis with fallback
export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('Could not connect to Redis:', errorMessage);
    console.log('Running in Redis-less mode - some features may be limited');
    return false;
  }
};

// Initialize Redis connection
connectRedis().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.warn('Redis initialization failed:', errorMessage);
});

export default redisClient;