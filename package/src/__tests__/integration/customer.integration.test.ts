// src/__tests__/integration/customer.integration.test.ts

import request from 'supertest';
import app from '../../app';
import { pool } from '../../config/database';

describe('Customer Controller Integration Tests', () => {
  beforeAll(async () => {
    // Set up a test tenant and user in the database
    // This would typically be done in a setup file
  });

  afterAll(async () => {
    // Clean up test data
    await pool.end();
  });

  describe('GET /api/customers', () => {
    it('should return a list of customers for the tenant', async () => {
      // Mock tenant resolution and authentication
      // This would require mocking the middleware or using a real JWT
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', 'Bearer fake-token') // This would need to be a real token in practice
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/customers', () => {
    it('should create a new customer', async () => {
      const newCustomer = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        company: 'Test Company'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', 'Bearer fake-token')
        .send(newCustomer)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.first_name).toBe('John');
      expect(response.body.last_name).toBe('Doe');
    });
  });

  describe('GET /api/customers/:id', () => {
    it('should return a specific customer', async () => {
      // This would require creating a customer first
      const response = await request(app)
        .get('/api/customers/1')
        .set('Authorization', 'Bearer fake-token')
        .expect(200);

      expect(response.body).toHaveProperty('id');
    });
  });

  describe('PUT /api/customers/:id', () => {
    it('should update an existing customer', async () => {
      const updatedCustomer = {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com'
      };

      const response = await request(app)
        .put('/api/customers/1')
        .set('Authorization', 'Bearer fake-token')
        .send(updatedCustomer)
        .expect(200);

      expect(response.body.first_name).toBe('Jane');
      expect(response.body.last_name).toBe('Smith');
    });
  });

  describe('DELETE /api/customers/:id', () => {
    it('should delete an existing customer', async () => {
      const response = await request(app)
        .delete('/api/customers/1')
        .set('Authorization', 'Bearer fake-token')
        .expect(200);

      expect(response.body.message).toBe('Customer deleted successfully');
    });
  });
});