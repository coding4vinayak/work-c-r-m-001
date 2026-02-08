import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Create a Registry which registers the metrics
export const register = new client.Registry();

// Add default metrics
register.setDefaultLabels({
  app: 'abetworks-workcrm'
});

// Enable collection of default metrics
client.collectDefaultMetrics({ register });

// Define custom metrics for ABETWORKS WORKCRM
export const httpRequestDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // 0.1 to 10 seconds
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'tenant_id']
});

export const activeConnectionsGauge = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

export const dbQueryDurationHistogram = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table', 'tenant_id'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5] // 10ms to 5 seconds
});

export const errorCounter = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'service', 'tenant_id']
});

// Register custom metrics
register.registerMetric(httpRequestDurationHistogram);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnectionsGauge);
register.registerMetric(dbQueryDurationHistogram);
register.registerMetric(errorCounter);

// Middleware to track HTTP request metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Increment active connections
  activeConnectionsGauge.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const tenantId = (req as any).tenant?.id || 'unknown';
    
    // Track request duration
    httpRequestDurationHistogram
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString(), tenantId)
      .observe(duration);
      
    // Track total requests
    httpRequestTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString(), tenantId)
      .inc();
      
    // Decrement active connections
    activeConnectionsGauge.dec();
  });
  
  next();
};

// Function to track database query duration
export const trackDbQuery = (operation: string, table: string, tenantId: string, duration: number) => {
  dbQueryDurationHistogram
    .labels(operation, table, tenantId)
    .observe(duration);
};

// Function to track errors
export const trackError = (type: string, service: string, tenantId: string) => {
  errorCounter
    .labels(type, service, tenantId)
    .inc();
};