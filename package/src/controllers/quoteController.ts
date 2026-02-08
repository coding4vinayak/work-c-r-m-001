import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get all quotes for the current tenant
export const getQuotes = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const customerId = req.query.customerId as string || '';

    // Build search and filter conditions
    let conditions = 'WHERE q.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions += ` AND (q.quote_number ILIKE $${paramIndex} OR c.company ILIKE $${paramIndex} OR CONCAT(c.first_name, ' ', c.last_name) ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions += ` AND q.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (customerId) {
      conditions += ` AND q.customer_id = $${paramIndex}`;
      params.push(customerId);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.quotes q
       LEFT JOIN tenant_data.customers c ON q.customer_id = c.id
       ${conditions}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get quotes with pagination and join related data
    const result = await pool.query(
      `SELECT q.*, 
         CONCAT(c.first_name, ' ', c.last_name) as customer_name,
         c.company as customer_company,
         CONCAT(u.first_name, ' ', u.last_name) as issued_by_name
       FROM tenant_data.quotes q
       LEFT JOIN tenant_data.customers c ON q.customer_id = c.id
       LEFT JOIN public.users u ON q.issued_by = u.id
       ${conditions}
       ORDER BY q.created_at DESC 
       LIMIT $${paramIndex-1} OFFSET $${paramIndex}`,
      [...params, limit, offset]
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
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
};

// Create a new quote for the current tenant
export const createQuote = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { 
      customer_id, 
      issued_by, 
      quote_number, 
      issue_date, 
      expiry_date, 
      subtotal, 
      tax_amount, 
      total_amount, 
      status, 
      notes, 
      terms_conditions,
      items
    } = req.body;

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create the quote
      const quoteResult = await client.query(
        `INSERT INTO tenant_data.quotes (
           tenant_id, customer_id, issued_by, quote_number, issue_date, 
           expiry_date, subtotal, tax_amount, total_amount, status, 
           notes, terms_conditions
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
         RETURNING *`,
        [
          tenantId, customer_id, issued_by, quote_number, issue_date, 
          expiry_date, subtotal, tax_amount, total_amount, status, 
          notes, terms_conditions
        ]
      );

      const quoteId = quoteResult.rows[0].id;

      // Create quote items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await client.query(
            `INSERT INTO tenant_data.quote_items (
               quote_id, product_id, description, quantity, unit_price, total_price, sort_order
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              quoteId, 
              item.product_id, 
              item.description, 
              item.quantity, 
              item.unit_price, 
              item.total_price, 
              item.sort_order || 0
            ]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json(quoteResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
};

// Get a specific quote for the current tenant
export const getQuote = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const quoteId = req.params.id;

    // Get the quote
    const quoteResult = await pool.query(
      `SELECT q.*, 
         CONCAT(c.first_name, ' ', c.last_name) as customer_name,
         c.company as customer_company,
         CONCAT(u.first_name, ' ', u.last_name) as issued_by_name
       FROM tenant_data.quotes q
       LEFT JOIN tenant_data.customers c ON q.customer_id = c.id
       LEFT JOIN public.users u ON q.issued_by = u.id
       WHERE q.tenant_id = $1 AND q.id = $2`,
      [tenantId, quoteId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = quoteResult.rows[0];

    // Get quote items
    const itemsResult = await pool.query(
      `SELECT qi.*, p.name as product_name
       FROM tenant_data.quote_items qi
       LEFT JOIN tenant_data.products p ON qi.product_id = p.id
       WHERE qi.quote_id = $1
       ORDER BY qi.sort_order`,
      [quoteId]
    );

    quote.items = itemsResult.rows;

    res.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
};

// Update a quote for the current tenant
export const updateQuote = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const quoteId = req.params.id;
    const { 
      customer_id, 
      issued_by, 
      quote_number, 
      issue_date, 
      expiry_date, 
      subtotal, 
      tax_amount, 
      total_amount, 
      status, 
      notes, 
      terms_conditions,
      items
    } = req.body;

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update the quote
      const quoteResult = await client.query(
        `UPDATE tenant_data.quotes 
         SET customer_id = $1, issued_by = $2, quote_number = $3, issue_date = $4, 
             expiry_date = $5, subtotal = $6, tax_amount = $7, total_amount = $8, 
             status = $9, notes = $10, terms_conditions = $11, updated_at = NOW()
         WHERE tenant_id = $12 AND id = $13 
         RETURNING *`,
        [
          customer_id, issued_by, quote_number, issue_date, 
          expiry_date, subtotal, tax_amount, total_amount, 
          status, notes, terms_conditions, tenantId, quoteId
        ]
      );

      if (quoteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Quote not found' });
      }

      // Delete existing items
      await client.query('DELETE FROM tenant_data.quote_items WHERE quote_id = $1', [quoteId]);

      // Create new items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await client.query(
            `INSERT INTO tenant_data.quote_items (
               quote_id, product_id, description, quantity, unit_price, total_price, sort_order
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              quoteId, 
              item.product_id, 
              item.description, 
              item.quantity, 
              item.unit_price, 
              item.total_price, 
              item.sort_order || 0
            ]
          );
        }
      }

      await client.query('COMMIT');
      res.json(quoteResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({ error: 'Failed to update quote' });
  }
};

// Delete a quote for the current tenant
export const deleteQuote = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const quoteId = req.params.id;

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete quote items first
      await client.query('DELETE FROM tenant_data.quote_items WHERE quote_id = $1', [quoteId]);

      // Delete the quote
      const result = await client.query(
        'DELETE FROM tenant_data.quotes WHERE tenant_id = $1 AND id = $2 RETURNING id',
        [tenantId, quoteId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Quote not found' });
      }

      await client.query('COMMIT');
      res.json({ message: 'Quote deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
};

// Get products for the current tenant
export const getProducts = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    const result = await pool.query(
      'SELECT * FROM tenant_data.products WHERE tenant_id = $1 AND is_active = true ORDER BY name',
      [tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Update quote status
export const updateQuoteStatus = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const quoteId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE tenant_data.quotes 
       SET status = $1, updated_at = NOW()
       WHERE tenant_id = $2 AND id = $3 
       RETURNING *`,
      [status, tenantId, quoteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating quote status:', error);
    res.status(500).json({ error: 'Failed to update quote status' });
  }
};