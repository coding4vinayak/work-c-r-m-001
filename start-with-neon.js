// Simple server startup script for ABETWORKS WORKCRM with Neon database
require('dotenv').config();

// Override environment variables with Neon database settings
process.env.DB_HOST = 'ep-spring-wind-aigcr4o1-pooler.c-4.us-east-1.aws.neon.tech';
process.env.DB_NAME = 'neondb';
process.env.DB_USER = 'neondb_owner';
process.env.DB_PASSWORD = 'npg_64ndXhRzkBbf';
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_64ndXhRzkBbf@ep-spring-wind-aigcr4o1-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
process.env.REDIS_URL = ''; // Disable Redis to avoid connection errors

console.log('🔧 Setting up ABETWORKS WORKCRM with Neon database connection...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);

// Start the application
const app = require('./dist/app');
const PORT = process.env.PORT || 3000;

console.log(`🚀 Starting ABETWORKS WORKCRM server on port ${PORT}...`);
console.log('🔗 Connecting to Neon database...');

// The server will start automatically since app.js runs the server