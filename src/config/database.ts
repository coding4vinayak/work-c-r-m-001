import { Pool } from 'pg';
import dotenv from 'dotenv';
import { trackDbQuery } from '../utils/metrics';

dotenv.config();

// Enhanced database pool configuration with optimized settings
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Connection pool settings for optimal performance
  min: parseInt(process.env.DB_POOL_MIN || '2'),           // Minimum number of connections
  max: parseInt(process.env.DB_POOL_MAX || '20'),          // Maximum number of connections
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // Close idle clients after 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'), // Return an error after 2 seconds if connection could not be established
  maxUses: parseInt(process.env.DB_MAX_USES || '750'),     // Close (and replace) a connection after it has been used 750 times
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : undefined as any,
});


// Track pool events for monitoring
pool.on('connect', (client) => {
  console.log('New client connected to ABETWORKS WORKCRM database');
});

pool.on('acquire', (client) => {
  // This event is emitted when a client is acquired from the pool
  console.log('Client acquired from pool');
});

pool.on('remove', (client) => {
  // This event is emitted when a client is removed from the pool
  console.log('Client removed from pool');
});

pool.on('error', (err) => {
  console.error('Database connection error for ABETWORKS WORKCRM:', err);
});

// Function to get pool statistics for monitoring
export const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
};

export const connectDB = async () => {
  try {
    // Test the connection
    await pool.connect();
    console.log('Database connected successfully for ABETWORKS WORKCRM');
    
    // Log initial pool stats
    console.log('Initial pool stats:', getPoolStats());
  } catch (error) {
    console.error('Failed to connect to database for ABETWORKS WORKCRM:', error);
    process.exit(1);
  }
};

// Graceful shutdown function
export const closePool = async () => {
  console.log('Closing database pool...');
  await pool.end();
  console.log('Database pool closed');
};