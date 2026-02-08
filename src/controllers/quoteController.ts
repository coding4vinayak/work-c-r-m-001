import { Request, Response } from 'express';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

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

    // Build query conditions
    let conditions = 'WHERE q.tenant_id = $1';
    let params: any[] = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions += ` AND (q.quote_number ILIKE $${paramIndex} OR c.first_name ILIKE $${paramIndex} OR c.last_name ILIKE $${paramIndex} OR c.company ILIKE $${paramIndex})`;
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

    // Get quotes with pagination
    const result = await pool.query(
      `SELECT q.*, 
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as issued_by_first_name,
              u.last_name as issued_by_last_name
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
    const userId = (req as any).user.id; // The user creating the quote
    const {
      customer_id,
      issue_date,
      expiry_date,
      status,
      notes,
      terms_conditions,
      items
    } = req.body;

    // Generate unique quote number
    const quoteNumber = `Q-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      item.total_price = item.quantity * item.unit_price;
      subtotal += item.total_price;
    }
    const taxAmount = subtotal * 0.1; // Assuming 10% tax
    const totalAmount = subtotal + taxAmount;

    // Create the quote
    const quoteResult = await pool.query(
      `INSERT INTO tenant_data.quotes (
         tenant_id, customer_id, issued_by, quote_number, issue_date, 
         expiry_date, subtotal, tax_amount, total_amount, status, 
         notes, terms_conditions
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        tenantId, customer_id, userId, quoteNumber, issue_date,
        expiry_date, subtotal, taxAmount, totalAmount, status || 'draft',
        notes, terms_conditions
      ]
    );

    const quote = quoteResult.rows[0];

    // Create quote items
    if (items && items.length > 0) {
      const itemPromises = items.map((item: any) => {
        return pool.query(
          `INSERT INTO tenant_data.quote_items (
             quote_id, product_id, description, quantity, unit_price, total_price, sort_order
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            quote.id, item.product_id, item.description, item.quantity,
            item.unit_price, item.total_price, item.sort_order || 0
          ]
        );
      });

      await Promise.all(itemPromises);
    }

    // Fetch the complete quote with items
    const fullQuoteResult = await pool.query(
      `SELECT q.*, 
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as issued_by_first_name,
              u.last_name as issued_by_last_name,
              qi.*
       FROM tenant_data.quotes q
       LEFT JOIN tenant_data.customers c ON q.customer_id = c.id
       LEFT JOIN public.users u ON q.issued_by = u.id
       LEFT JOIN tenant_data.quote_items qi ON q.id = qi.quote_id
       WHERE q.id = $1`,
      [quote.id]
    );

    res.status(201).json(quote);
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

    // Get quote details
    const quoteResult = await pool.query(
      `SELECT q.*, 
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as issued_by_first_name,
              u.last_name as issued_by_last_name
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
      issue_date,
      expiry_date,
      status,
      notes,
      terms_conditions,
      items
    } = req.body;

    // Calculate totals
    let subtotal = 0;
    if (items) {
      for (const item of items) {
        item.total_price = item.quantity * item.unit_price;
        subtotal += item.total_price;
      }
    }
    const taxAmount = subtotal * 0.1; // Assuming 10% tax
    const totalAmount = subtotal + taxAmount;

    // Update the quote
    const quoteResult = await pool.query(
      `UPDATE tenant_data.quotes
       SET customer_id = $1, issue_date = $2, expiry_date = $3, 
           subtotal = $4, tax_amount = $5, total_amount = $6, status = $7,
           notes = $8, terms_conditions = $9, updated_at = NOW()
       WHERE tenant_id = $10 AND id = $11
       RETURNING *`,
      [
        customer_id, issue_date, expiry_date,
        subtotal, taxAmount, totalAmount, status,
        notes, terms_conditions,
        tenantId, quoteId
      ]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = quoteResult.rows[0];

    // Update quote items if provided
    if (items) {
      // First, delete existing items
      await pool.query('DELETE FROM tenant_data.quote_items WHERE quote_id = $1', [quoteId]);

      // Then insert new items
      if (items.length > 0) {
        const itemPromises = items.map((item: any) => {
          return pool.query(
            `INSERT INTO tenant_data.quote_items (
               quote_id, product_id, description, quantity, unit_price, total_price, sort_order
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              quote.id, item.product_id, item.description, item.quantity,
              item.unit_price, item.total_price, item.sort_order || 0
            ]
          );
        });

        await Promise.all(itemPromises);
      }
    }

    // Fetch the updated quote with items
    const fullQuoteResult = await pool.query(
      `SELECT q.*, 
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as issued_by_first_name,
              u.last_name as issued_by_last_name
       FROM tenant_data.quotes q
       LEFT JOIN tenant_data.customers c ON q.customer_id = c.id
       LEFT JOIN public.users u ON q.issued_by = u.id
       WHERE q.id = $1`,
      [quote.id]
    );

    res.json(fullQuoteResult.rows[0]);
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

    const result = await pool.query(
      'DELETE FROM tenant_data.quotes WHERE tenant_id = $1 AND id = $2 RETURNING id',
      [tenantId, quoteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json({ message: 'Quote deleted successfully' });
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
};

// Send quote to customer
export const sendQuote = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const quoteId = req.params.id;

    // In a real implementation, this would send an email to the customer
    // For now, we'll just update the status to 'sent'
    const result = await pool.query(
      `UPDATE tenant_data.quotes
       SET status = 'sent', updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2 AND status = 'draft'
       RETURNING *`,
      [tenantId, quoteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found or not in draft status' });
    }

    // TODO: Send email to customer with quote details

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error sending quote:', error);
    res.status(500).json({ error: 'Failed to send quote' });
  }
};

// Accept quote
export const acceptQuote = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const quoteId = req.params.id;

    const result = await pool.query(
      `UPDATE tenant_data.quotes
       SET status = 'accepted', updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2 AND status IN ('draft', 'sent')
       RETURNING *`,
      [tenantId, quoteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found or already processed' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error accepting quote:', error);
    res.status(500).json({ error: 'Failed to accept quote' });
  }
};

// Reject quote
export const rejectQuote = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const quoteId = req.params.id;

    const result = await pool.query(
      `UPDATE tenant_data.quotes
       SET status = 'rejected', updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2 AND status IN ('draft', 'sent')
       RETURNING *`,
      [tenantId, quoteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found or already processed' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rejecting quote:', error);
    res.status(500).json({ error: 'Failed to reject quote' });
  }
};