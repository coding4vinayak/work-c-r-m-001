import request from 'supertest';
import express from 'express';
import { Request, Response } from 'express';
import { healthCheck } from '../../../controllers/healthController';
import { pool } from '../../../config/database';

// Mock the database pool
jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Health Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.get('/health', healthCheck);
    jest.clearAllMocks();
  });

  it('should return healthy status when database is accessible', async () => {
    (pool.query as jest.MockedFunction<typeof pool.query>).mockResolvedValueOnce({ rows: [{ '1': 1 }] });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.checks.database.status).toBe('ok');
  });

  it('should return degraded status when database is not accessible', async () => {
    (pool.query as jest.MockedFunction<typeof pool.query>).mockRejectedValueOnce(new Error('Connection failed'));

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.checks.database.status).toBe('error');
  });

  it('should handle unexpected errors gracefully', async () => {
    // Force an unexpected error in the health check
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock the entire healthCheck function to throw an error
    const originalHealthCheck = jest.requireActual('../../src/controllers/healthController').healthCheck;
    const mockHealthCheck = jest.fn((req: Request, res: Response) => {
      throw new Error('Unexpected error');
    });
    
    app.get('/health-mock', mockHealthCheck);
    
    const response = await request(app).get('/health-mock');

    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty('status');
    expect(response.body.status).toBe('error');
  });
});