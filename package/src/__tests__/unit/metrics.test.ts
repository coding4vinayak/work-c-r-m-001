import { 
  httpRequestDurationHistogram, 
  httpRequestTotal, 
  activeConnectionsGauge, 
  dbQueryDurationHistogram, 
  errorCounter,
  trackDbQuery,
  trackError
} from '../../utils/metrics';

describe('Metrics Utility', () => {
  beforeEach(() => {
    // Reset all metrics before each test
    httpRequestDurationHistogram.reset();
    httpRequestTotal.reset();
    activeConnectionsGauge.reset();
    dbQueryDurationHistogram.reset();
    errorCounter.reset();
  });

  test('should track HTTP request duration', () => {
    const labels = {
      method: 'GET',
      route: '/test',
      status_code: '200',
      tenant_id: 'test-tenant'
    };
    
    httpRequestDurationHistogram.labels(labels).observe(0.5);
    
    expect(typeof httpRequestDurationHistogram.get()).toBe('object');
  });

  test('should track HTTP request count', async () => {
    const labels = {
      method: 'POST',
      route: '/api/test',
      status_code: '201',
      tenant_id: 'test-tenant'
    };
    
    httpRequestTotal.labels(labels).inc();
    
    const metrics = await httpRequestTotal.get();
    expect(metrics.values[0].value).toBe(1);
  });

  test('should track active connections', async () => {
    activeConnectionsGauge.inc();
    const gaugeMetrics = await activeConnectionsGauge.get();
    expect(gaugeMetrics.values[0].value).toBe(1);
    
    activeConnectionsGauge.dec();
    const updatedGaugeMetrics = await activeConnectionsGauge.get();
    expect(updatedGaugeMetrics.values[0].value).toBe(0);
  });

  test('should track database query duration', async () => {
    trackDbQuery('SELECT', 'users', 'test-tenant', 0.1);
    
    const metrics = await dbQueryDurationHistogram.get();
    expect(metrics.values.length).toBeGreaterThan(0);
  });

  test('should track errors', async () => {
    trackError('validation', 'auth-service', 'test-tenant');
    
    const metrics = await errorCounter.get();
    expect(metrics.values.length).toBeGreaterThan(0);
  });
});