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

// Set up global test configuration
jest.setTimeout(30000); // 30 seconds timeout for tests

console.log('Test environment set up');