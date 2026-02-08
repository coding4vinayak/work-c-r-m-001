import request from 'supertest';
import app from '../../../src/app';

describe('Health Check Endpoints', () => {
  test('GET /health should return health status', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('checks');
  });

  test('GET /live should return liveness status', async () => {
    const response = await request(app).get('/live');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body.status).toBe('alive');
  });

  test('GET /ready should return readiness status', async () => {
    const response = await request(app).get('/ready');
    
    // The readiness check depends on database connectivity
    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /metrics should return prometheus metrics', async () => {
    const response = await request(app).get('/metrics');
    
    expect(response.status).toBe(200);
    expect(response.header['content-type']).toMatch(/text\/plain/);
  });
});