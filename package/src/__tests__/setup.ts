// Test setup file
import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.JWT_SECRET = 'test_secret';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.STRIPE_SECRET_KEY = 'sk_test_123456789';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318/v1/traces';

// Mock the database connection to prevent actual connections during tests
jest.mock('../src/config/database', () => {
  const mockPool = {
    query: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
    connect: jest.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0
  };
  
  return {
    pool: mockPool,
    connectDB: jest.fn(),
    closePool: jest.fn(),
    getPoolStats: jest.fn(() => ({ totalCount: 10, idleCount: 5, waitingCount: 0 }))
  };
});

// Set up global test configuration
jest.setTimeout(30000); // 30 seconds timeout for tests

console.log('Test environment set up');