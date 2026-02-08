import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get all customers for the current tenant
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';

    // Build search condition
    let searchCondition = '';
    const searchParams = [];
    if (search) {
      searchCondition = `AND (first_name ILIKE $3 OR last_name ILIKE $3 OR email ILIKE $3 OR company ILIKE $3)`;
      searchParams.push(`%${search}%`);
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.customers 
       WHERE tenant_id = $1 ${searchCondition}`,
      [tenantId, ...searchParams]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get customers with pagination
    const result = await pool.query(
      `SELECT *, 
        CONCAT(first_name, ' ', last_name) as full_name
       FROM tenant_data.customers 
       WHERE tenant_id = $1 ${searchCondition}
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset, ...searchParams]
    );

    res.json({
      data: result.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalRecords: totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

// Create a new customer for the current tenant
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      company, 
      job_title,
      website,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      status,
      source,
      notes,
      lead_score,
      category_id
    } = req.body;

    const result = await pool.query(
      `INSERT INTO tenant_data.customers (
         tenant_id, first_name, last_name, email, phone, company, job_title,
         website, address_line1, address_line2, city, state, postal_code, country,
         status, source, notes, lead_score, category_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
       RETURNING *`,
      [
        tenantId, first_name, last_name, email, phone, company, job_title,
        website, address_line1, address_line2, city, state, postal_code, country,
        status, source, notes, lead_score, category_id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

// Get a specific customer for the current tenant
export const getCustomer = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const customerId = req.params.id;

    const result = await pool.query(
      `SELECT *, CONCAT(first_name, ' ', last_name) as full_name FROM tenant_data.customers WHERE tenant_id = $1 AND id = $2`,
      [tenantId, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

// Update a customer for the current tenant
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const customerId = req.params.id;
    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      company, 
      job_title,
      website,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      status,
      source,
      notes,
      lead_score,
      category_id
    } = req.body;

    const result = await pool.query(
      `UPDATE tenant_data.customers 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, company = $5, 
           job_title = $6, website = $7, address_line1 = $8, address_line2 = $9, 
           city = $10, state = $11, postal_code = $12, country = $13, 
           status = $14, source = $15, notes = $16, lead_score = $17, 
           category_id = $18, updated_at = NOW()
       WHERE tenant_id = $19 AND id = $20 
       RETURNING *`,
      [
        first_name, last_name, email, phone, company, job_title,
        website, address_line1, address_line2, city, state, postal_code, country,
        status, source, notes, lead_score, category_id, tenantId, customerId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

// Delete a customer for the current tenant
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const customerId = req.params.id;

    const result = await pool.query(
      'DELETE FROM tenant_data.customers WHERE tenant_id = $1 AND id = $2 RETURNING id',
      [tenantId, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

// Get customer categories for the current tenant
export const getCustomerCategories = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    const result = await pool.query(
      'SELECT * FROM tenant_data.customer_categories WHERE tenant_id = $1 ORDER BY name',
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customer categories:', error);
    res.status(500).json({ error: 'Failed to fetch customer categories' });
  }
};