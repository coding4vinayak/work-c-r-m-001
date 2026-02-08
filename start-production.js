// ABETWORKS WORKCRM - Production Startup with Neon Database
require('dotenv').config();

// Set environment variables for Neon database
process.env.DB_HOST = 'ep-spring-wind-aigcr4o1-pooler.c-4.us-east-1.aws.neon.tech';
process.env.DB_NAME = 'neondb';
process.env.DB_USER = 'neondb_owner';
process.env.DB_PASSWORD = 'npg_64ndXhRzkBbf';
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_64ndXhRzkBbf@ep-spring-wind-aigcr4o1-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
process.env.REDIS_URL = ''; // Disable Redis for this test
process.env.NODE_ENV = 'production';

console.log('🚀 Starting ABETWORKS WORKCRM with Neon database connection...');
console.log('Database Host:', process.env.DB_HOST);
console.log('Database Name:', process.env.DB_NAME);
console.log('Database User:', process.env.DB_USER);

// Import and start the application
const app = require('./dist/app');

// Export for potential use in other modules
module.exports = app;