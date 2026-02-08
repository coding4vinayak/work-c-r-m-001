// src/__tests__/unit/customer.controller.test.ts

import { Request, Response } from 'express';
import {
  getCustomers,
  createCustomer,
  getCustomer,
  updateCustomer,
  deleteCustomer
} from '../../../controllers/customerController';
import { pool } from '../../config/database';

// Mock the database pool
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Customer Controller Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
      query: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomers', () => {
    it('should return customers for the tenant', async () => {
      const mockCustomers = [
        { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
      ];

      (mockRequest as any).tenant = { id: 'tenant-1' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: mockCustomers });

      await getCustomers(mockRequest as Request, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM tenant_data.customers'),
        expect.arrayContaining(['tenant-1'])
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockCustomers,
        pagination: expect.any(Object)
      });
    });
  });

  describe('createCustomer', () => {
    it('should create a new customer', async () => {
      const newCustomer = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        company: 'Test Company'
      };

      const createdCustomer = {
        id: '1',
        ...newCustomer
      };

      mockRequest.body = newCustomer;
      (mockRequest as any).tenant = { id: 'tenant-1' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [createdCustomer] });

      await createCustomer(mockRequest as Request, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tenant_data.customers'),
        expect.arrayContaining(['tenant-1', 'John', 'Doe', 'john@example.com', 'Test Company'])
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(createdCustomer);
    });
  });

  describe('getCustomer', () => {
    it('should return a specific customer', async () => {
      const customer = { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' };

      mockRequest.params = { id: '1' };
      (mockRequest as any).tenant = { id: 'tenant-1' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [customer] });

      await getCustomer(mockRequest as Request, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT *, CONCAT(first_name, \' \', last_name)'),
        ['tenant-1', '1']
      );
      expect(mockResponse.json).toHaveBeenCalledWith(customer);
    });

    it('should return 404 if customer not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      (mockRequest as any).tenant = { id: 'tenant-1' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await getCustomer(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Customer not found' });
    });
  });

  describe('updateCustomer', () => {
    it('should update an existing customer', async () => {
      const updatedCustomer = { id: '1', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' };

      mockRequest.params = { id: '1' };
      mockRequest.body = { first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' };
      (mockRequest as any).tenant = { id: 'tenant-1' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [updatedCustomer] });

      await updateCustomer(mockRequest as Request, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tenant_data.customers'),
        expect.arrayContaining(['Jane', 'Smith', 'jane@example.com', 'tenant-1', '1'])
      );
      expect(mockResponse.json).toHaveBeenCalledWith(updatedCustomer);
    });
  });

  describe('deleteCustomer', () => {
    it('should delete an existing customer', async () => {
      mockRequest.params = { id: '1' };
      (mockRequest as any).tenant = { id: 'tenant-1' };
      (pool.query as jest.Mock).mockResolvedValue({ rows: [{ id: '1' }] });

      await deleteCustomer(mockRequest as Request, mockResponse as Response);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM tenant_data.customers WHERE tenant_id = $1 AND id = $2 RETURNING id',
        ['tenant-1', '1']
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Customer deleted successfully' });
    });
  });
});