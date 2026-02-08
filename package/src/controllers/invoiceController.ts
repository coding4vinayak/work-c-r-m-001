import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get all invoices for the current tenant
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const customerId = req.query.customerId as string || '';

    // Build search and filter conditions
    let conditions = 'WHERE i.tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions += ` AND (i.invoice_number ILIKE $${paramIndex} OR c.company ILIKE $${paramIndex} OR CONCAT(c.first_name, ' ', c.last_name) ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (customerId) {
      conditions += ` AND i.customer_id = $${paramIndex}`;
      params.push(customerId);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.invoices i
       LEFT JOIN tenant_data.customers c ON i.customer_id = c.id
       ${conditions}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get invoices with pagination and join related data
    const result = await pool.query(
      `SELECT i.*, 
         CONCAT(c.first_name, ' ', c.last_name) as customer_name,
         c.company as customer_company,
         CONCAT(u.first_name, ' ', u.last_name) as issued_by_name
       FROM tenant_data.invoices i
       LEFT JOIN tenant_data.customers c ON i.customer_id = c.id
       LEFT JOIN public.users u ON i.issued_by = u.id
       ${conditions}
       ORDER BY i.created_at DESC 
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
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

// Create a new invoice for the current tenant
export const createInvoice = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { 
      customer_id, 
      issued_by, 
      invoice_number, 
      quote_id, 
      issue_date, 
      due_date, 
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

      // Create the invoice
      const invoiceResult = await client.query(
        `INSERT INTO tenant_data.invoices (
           tenant_id, customer_id, issued_by, invoice_number, quote_id, issue_date, 
           due_date, subtotal, tax_amount, total_amount, amount_paid, amount_due, status, 
           notes, terms_conditions
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
         RETURNING *`,
        [
          tenantId, customer_id, issued_by, invoice_number, quote_id, issue_date, 
          due_date, subtotal, tax_amount, total_amount, 0, total_amount, status, 
          notes, terms_conditions
        ]
      );

      const invoiceId = invoiceResult.rows[0].id;

      // Create invoice items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await client.query(
            `INSERT INTO tenant_data.invoice_items (
               invoice_id, product_id, description, quantity, unit_price, total_price, sort_order
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              invoiceId, 
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
      res.status(201).json(invoiceResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
};

// Get a specific invoice for the current tenant
export const getInvoice = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const invoiceId = req.params.id;

    // Get the invoice
    const invoiceResult = await pool.query(
      `SELECT i.*, 
         CONCAT(c.first_name, ' ', c.last_name) as customer_name,
         c.company as customer_company,
         CONCAT(u.first_name, ' ', u.last_name) as issued_by_name
       FROM tenant_data.invoices i
       LEFT JOIN tenant_data.customers c ON i.customer_id = c.id
       LEFT JOIN public.users u ON i.issued_by = u.id
       WHERE i.tenant_id = $1 AND i.id = $2`,
      [tenantId, invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Get invoice items
    const itemsResult = await pool.query(
      `SELECT ii.*, p.name as product_name
       FROM tenant_data.invoice_items ii
       LEFT JOIN tenant_data.products p ON ii.product_id = p.id
       WHERE ii.invoice_id = $1
       ORDER BY ii.sort_order`,
      [invoiceId]
    );

    invoice.items = itemsResult.rows;

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

// Update an invoice for the current tenant
export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const invoiceId = req.params.id;
    const { 
      customer_id, 
      issued_by, 
      invoice_number, 
      quote_id, 
      issue_date, 
      due_date, 
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

      // Update the invoice
      const invoiceResult = await client.query(
        `UPDATE tenant_data.invoices 
         SET customer_id = $1, issued_by = $2, invoice_number = $3, quote_id = $4, issue_date = $5, 
             due_date = $6, subtotal = $7, tax_amount = $8, total_amount = $9, 
             status = $10, notes = $11, terms_conditions = $12, updated_at = NOW()
         WHERE tenant_id = $13 AND id = $14 
         RETURNING *`,
        [
          customer_id, issued_by, invoice_number, quote_id, issue_date, 
          due_date, subtotal, tax_amount, total_amount, 
          status, notes, terms_conditions, tenantId, invoiceId
        ]
      );

      if (invoiceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Delete existing items
      await client.query('DELETE FROM tenant_data.invoice_items WHERE invoice_id = $1', [invoiceId]);

      // Create new items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await client.query(
            `INSERT INTO tenant_data.invoice_items (
               invoice_id, product_id, description, quantity, unit_price, total_price, sort_order
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              invoiceId, 
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
      res.json(invoiceResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
};

// Delete an invoice for the current tenant
export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const invoiceId = req.params.id;

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete invoice items first
      await client.query('DELETE FROM tenant_data.invoice_items WHERE invoice_id = $1', [invoiceId]);

      // Delete the invoice
      const result = await client.query(
        'DELETE FROM tenant_data.invoices WHERE tenant_id = $1 AND id = $2 RETURNING id',
        [tenantId, invoiceId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Invoice not found' });
      }

      await client.query('COMMIT');
      res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
};

// Update invoice status
export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const invoiceId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['draft', 'sent', 'paid', 'partial', 'overdue', 'void'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE tenant_data.invoices 
       SET status = $1, updated_at = NOW()
       WHERE tenant_id = $2 AND id = $3 
       RETURNING *`,
      [status, tenantId, invoiceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
};

// Record payment for an invoice
export const recordPayment = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const invoiceId = req.params.id;
    const { amount, payment_method, transaction_id, payment_date, notes } = req.body;

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the invoice
      const invoiceResult = await client.query(
        'SELECT * FROM tenant_data.invoices WHERE tenant_id = $1 AND id = $2',
        [tenantId, invoiceId]
      );

      if (invoiceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const invoice = invoiceResult.rows[0];
      const newAmountPaid = parseFloat(invoice.amount_paid) + parseFloat(amount);
      let newStatus = invoice.status;

      // Calculate new amount due
      const newAmountDue = parseFloat(invoice.total_amount) - newAmountPaid;

      // Determine new status based on payment
      if (newAmountDue <= 0) {
        newStatus = 'paid';
      } else if (newAmountDue < parseFloat(invoice.total_amount)) {
        newStatus = 'partial';
      } else if (new Date(invoice.due_date) < new Date() && newStatus !== 'paid') {
        newStatus = 'overdue';
      }

      // Update the invoice
      await client.query(
        `UPDATE tenant_data.invoices 
         SET amount_paid = $1, amount_due = $2, status = $3, updated_at = NOW()
         WHERE id = $4`,
        [newAmountPaid, newAmountDue, newStatus, invoiceId]
      );

      // Create payment record
      const paymentResult = await client.query(
        `INSERT INTO tenant_data.payments (
           tenant_id, invoice_id, customer_id, amount, payment_method, 
           transaction_id, payment_date, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [
          tenantId, invoiceId, invoice.customer_id, amount, payment_method, 
          transaction_id, payment_date || new Date(), notes
        ]
      );

      await client.query('COMMIT');
      res.status(201).json(paymentResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};

// Get payments for an invoice
export const getInvoicePayments = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const invoiceId = req.params.id;

    const result = await pool.query(
      `SELECT p.*, 
         CONCAT(u.first_name, ' ', u.last_name) as recorded_by_name
       FROM tenant_data.payments p
       LEFT JOIN public.users u ON p.created_by = u.id
       WHERE p.tenant_id = $1 AND p.invoice_id = $2
       ORDER BY p.payment_date DESC`,
      [tenantId, invoiceId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoice payments:', error);
    res.status(500).json({ error: 'Failed to fetch invoice payments' });
  }
};