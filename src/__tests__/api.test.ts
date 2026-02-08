import request from 'supertest';
import app from '../app';
import { pool } from '../config/database';

describe('API Endpoints Test', () => {
  beforeAll(async () => {
    // Setup database connection
    await pool.connect();
  });

  afterAll(async () => {
    // Close database connection
    await pool.end();
  });

  describe('Auth Endpoints', () => {
    it('should return 400 for login without credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .expect(400);
        
      expect(response.body.error).toBe('Email and password are required');
    });

    it('should return 401 for invalid login credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'invalidpassword'
        })
        .expect(401);
        
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('Customer Endpoints', () => {
    it('should require authentication for customer endpoints', async () => {
      const response = await request(app)
        .get('/api/customers')
        .expect(401);
        
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Lead Endpoints', () => {
    it('should require authentication for lead endpoints', async () => {
      const response = await request(app)
        .get('/api/leads')
        .expect(401);
        
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Deal Endpoints', () => {
    it('should require authentication for deal endpoints', async () => {
      const response = await request(app)
        .get('/api/deals')
        .expect(401);
        
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Task Endpoints', () => {
    it('should require authentication for task endpoints', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(401);
        
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
        
      expect(response.body.status).toBe('healthy');
    });
  });
});