import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

import { connectDB, closePool } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import { requestLogger, errorLogger, performanceMetrics } from './utils/logging';
import { metricsMiddleware, register } from './utils/metrics';
import { healthCheck, livenessCheck, readinessCheck } from './controllers/healthController';
import tracingSdk from './utils/tracing';
import { tracingMiddleware } from './middleware/tracingMiddleware';
import {
  dataPreservationMiddleware,
  softDeleteMiddleware,
  softDeleteQueryMiddleware,
  safetyNetMiddleware
} from './middleware/dataPreservationMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize tracing
tracingSdk;

// Security middleware for ABETWORKS WORKCRM
app.use(helmet());
app.use(cors());

// Safety net middleware - should be first to catch dangerous operations
app.use(safetyNetMiddleware);


// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Test route to verify routing is working
app.get('/test-route', (req, res) => {
  res.send('Route is working!');
});

// Redirect root to dashboard - this should be before static middleware
app.get('/', (req, res) => {
  res.redirect('/dashboard/index.html');
});

// Serve static files (HTML, CSS, JS, images) from the project root
app.use(express.static(path.join(__dirname, '..'), {
  fallthrough: true // Allow other routes to handle if file not found
}));

// Also serve static files from subdirectories to handle the organized structure
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));
app.use('/customer', express.static(path.join(__dirname, '../customer')));
app.use('/lead', express.static(path.join(__dirname, '../lead')));
app.use('/deal', express.static(path.join(__dirname, '../deal')));
app.use('/task', express.static(path.join(__dirname, '../task')));
app.use('/quote', express.static(path.join(__dirname, '../quote')));
app.use('/invoicing', express.static(path.join(__dirname, '../invoicing')));
app.use('/payment', express.static(path.join(__dirname, '../payment')));
app.use('/report', express.static(path.join(__dirname, '../report')));
app.use('/setting', express.static(path.join(__dirname, '../setting')));
app.use('/authentication', express.static(path.join(__dirname, '../authentication')));
app.use('/application', express.static(path.join(__dirname, '../application')));
app.use('/widget', express.static(path.join(__dirname, '../widget')));
app.use('/help', express.static(path.join(__dirname, '../help')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/partials', express.static(path.join(__dirname, '../partials')));

// Data preservation middleware
app.use(dataPreservationMiddleware);
app.use(softDeleteQueryMiddleware);

// Tracing middleware - should be early in the middleware chain
app.use(tracingMiddleware);

// Logging and performance metrics middleware
app.use(requestLogger);
app.use(performanceMetrics);

// Metrics middleware
app.use(metricsMiddleware);

// Database connection with error handling
connectDB().catch(error => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});

// Apply soft delete middleware before API routes
app.use('/api', softDeleteMiddleware);

// Routes
app.use('/api', routes);

// Health check endpoints
app.get('/health', healthCheck);           // Detailed health check
app.get('/live', livenessCheck);           // Liveness probe
app.get('/ready', readinessCheck);         // Readiness probe

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Error handling middleware
app.use(errorLogger);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`ABETWORKS WORKCRM server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    console.log('Server closed');
    await closePool();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(async () => {
    console.log('Server closed');
    await closePool();
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific cleanup, then exit
  server.close(() => {
    closePool();
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Application specific cleanup, then exit
  server.close(() => {
    closePool();
    process.exit(1);
  });
});

export default app;