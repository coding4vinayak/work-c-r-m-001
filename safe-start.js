// ABETWORKS WORKCRM - Safe Startup with Neon Database
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

// Import dependencies
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');

// Create a simple server first
const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ABETWORKS WORKCRM API',
    version: '1.0.0',
    database_connected: !!global.dbConnected
  });
});

// Create database pool with better error handling
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
  min: 2
});

// Test database connection before starting server
async function startServer() {
  try {
    console.log('\n🔍 Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0].now);
    
    // Set global flag
    global.dbConnected = true;
    
    // Add a simple test endpoint to verify the API is working
    app.get('/api/test', async (req, res) => {
      try {
        const dbResult = await pool.query('SELECT NOW() as current_time');
        res.json({
          message: 'ABETWORKS WORKCRM API is running with Neon database!',
          currentTime: dbResult.rows[0].current_time,
          databaseStatus: 'connected'
        });
      } catch (error) {
        res.status(500).json({
          message: 'API is running but database connection failed',
          error: error.message
        });
      }
    });
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`\n✅ ABETWORKS WORKCRM server running on port ${PORT}`);
      console.log('✅ Connected to Neon database successfully');
      console.log('\n📋 Available endpoints:');
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   Test API: http://localhost:${PORT}/api/test`);
      console.log('\n🎉 ABETWORKS WORKCRM is ready with remote Neon database!');
      console.log('All CRM modules can now access remote data (leads, tasks, deals, etc.)');
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('\n.SIGTERM received, shutting down gracefully');
      server.close(async () => {
        console.log('Server closed');
        await pool.end();
        console.log('Database pool closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', async () => {
      console.log('\n.SIGINT received, shutting down gracefully');
      server.close(async () => {
        console.log('Server closed');
        await pool.end();
        console.log('Database pool closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('\n❌ Database connection failed:', error.message);
    console.log('Please verify your Neon database credentials and connection settings.');
    process.exit(1);
  }
}

// Start the server
startServer();