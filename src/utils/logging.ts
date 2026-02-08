import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

// Import structured logging utilities
import {
  logger as structuredLogger,
  requestLogger as structuredRequestLogger,
  errorLogger as structuredErrorLogger,
  performanceMetrics as structuredPerformanceMetrics
} from './structuredLogging';

// Export the structured logger as the main logger
export const logger = structuredLogger;

// Export the structured middleware functions
export const requestLogger = structuredRequestLogger;
export const errorLogger = structuredErrorLogger;
export const performanceMetrics = structuredPerformanceMetrics;

// Ensure logs directory exists
import fs from 'fs';
import path from 'path';

const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}