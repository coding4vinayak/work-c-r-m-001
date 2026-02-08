import { Request, Response } from 'express';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

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

    // Build query conditions
    let conditions = 'WHERE i.tenant_id = $1';
    let params: any[] = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions += ` AND (i.invoice_number ILIKE $${paramIndex} OR c.first_name ILIKE $${paramIndex} OR c.last_name ILIKE $${paramIndex} OR c.company ILIKE $${paramIndex})`;
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

    // Get invoices with pagination
    const result = await pool.query(
      `SELECT i.*, 
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as issued_by_first_name,
              u.last_name as issued_by_last_name
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
    const userId = (req as any).user.id; // The user creating the invoice
    const {
      customer_id,
      quote_id,
      issue_date,
      due_date,
      status,
      notes,
      terms_conditions,
      items
    } = req.body;

    // Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      item.total_price = item.quantity * item.unit_price;
      subtotal += item.total_price;
    }
    const taxAmount = subtotal * 0.1; // Assuming 10% tax
    const totalAmount = subtotal + taxAmount;
    const amountDue = totalAmount; // Initially, full amount is due

    // Create the invoice
    const invoiceResult = await pool.query(
      `INSERT INTO tenant_data.invoices (
         tenant_id, customer_id, issued_by, invoice_number, quote_id, issue_date, 
         due_date, subtotal, tax_amount, total_amount, amount_due, status, 
         notes, terms_conditions
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        tenantId, customer_id, userId, invoiceNumber, quote_id, issue_date,
        due_date, subtotal, taxAmount, totalAmount, amountDue, status || 'draft',
        notes, terms_conditions
      ]
    );

    const invoice = invoiceResult.rows[0];

    // Create invoice items
    if (items && items.length > 0) {
      const itemPromises = items.map((item: any) => {
        return pool.query(
          `INSERT INTO tenant_data.invoice_items (
             invoice_id, product_id, description, quantity, unit_price, total_price, sort_order
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invoice.id, item.product_id, item.description, item.quantity,
            item.unit_price, item.total_price, item.sort_order || 0
          ]
        );
      });

      await Promise.all(itemPromises);
    }

    // Fetch the complete invoice with items
    const fullInvoiceResult = await pool.query(
      `SELECT i.*, 
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as issued_by_first_name,
              u.last_name as issued_by_last_name
       FROM tenant_data.invoices i
       LEFT JOIN tenant_data.customers c ON i.customer_id = c.id
       LEFT JOIN public.users u ON i.issued_by = u.id
       WHERE i.id = $1`,
      [invoice.id]
    );

    res.status(201).json(fullInvoiceResult.rows[0]);
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

    // Get invoice details
    const invoiceResult = await pool.query(
      `SELECT i.*, 
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as issued_by_first_name,
              u.last_name as issued_by_last_name
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

    // Get associated payments
    const paymentsResult = await pool.query(
      `SELECT p.*, u.first_name as created_by_first_name, u.last_name as created_by_last_name
       FROM tenant_data.payments p
       LEFT JOIN public.users u ON p.created_by = u.id
       WHERE p.invoice_id = $1
       ORDER BY p.payment_date DESC`,
      [invoiceId]
    );

    invoice.payments = paymentsResult.rows;

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
      issue_date,
      due_date,
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
    // amount_due should be total_amount minus any payments made

    // Get existing payments to calculate amount due
    const paymentsResult = await pool.query(
      `SELECT SUM(amount) as total_paid FROM tenant_data.payments WHERE invoice_id = $1`,
      [invoiceId]
    );
    const totalPaid = parseFloat(paymentsResult.rows[0].total_paid) || 0;
    const amountDue = totalAmount - totalPaid;

    // Update the invoice
    const invoiceResult = await pool.query(
      `UPDATE tenant_data.invoices
       SET customer_id = $1, issue_date = $2, due_date = $3, 
           subtotal = $4, tax_amount = $5, total_amount = $6, amount_due = $7, status = $8,
           notes = $9, terms_conditions = $10, updated_at = NOW()
       WHERE tenant_id = $11 AND id = $12
       RETURNING *`,
      [
        customer_id, issue_date, due_date,
        subtotal, taxAmount, totalAmount, amountDue, status,
        notes, terms_conditions,
        tenantId, invoiceId
      ]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Update invoice items if provided
    if (items) {
      // First, delete existing items
      await pool.query('DELETE FROM tenant_data.invoice_items WHERE invoice_id = $1', [invoiceId]);

      // Then insert new items
      if (items.length > 0) {
        const itemPromises = items.map((item: any) => {
          return pool.query(
            `INSERT INTO tenant_data.invoice_items (
               invoice_id, product_id, description, quantity, unit_price, total_price, sort_order
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              invoice.id, item.product_id, item.description, item.quantity,
              item.unit_price, item.total_price, item.sort_order || 0
            ]
          );
        });

        await Promise.all(itemPromises);
      }
    }

    // Fetch the updated invoice with items
    const fullInvoiceResult = await pool.query(
      `SELECT i.*, 
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as issued_by_first_name,
              u.last_name as issued_by_last_name
       FROM tenant_data.invoices i
       LEFT JOIN tenant_data.customers c ON i.customer_id = c.id
       LEFT JOIN public.users u ON i.issued_by = u.id
       WHERE i.id = $1`,
      [invoice.id]
    );

    res.json(fullInvoiceResult.rows[0]);
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

    // Check if invoice has any payments
    const paymentsResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.payments WHERE invoice_id = $1`,
      [invoiceId]
    );
    const paymentCount = parseInt(paymentsResult.rows[0].count);

    if (paymentCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete invoice that has payments associated with it' 
      });
    }

    const result = await pool.query(
      'DELETE FROM tenant_data.invoices WHERE tenant_id = $1 AND id = $2 RETURNING id',
      [tenantId, invoiceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
};

// Send invoice to customer
export const sendInvoice = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const invoiceId = req.params.id;

    // In a real implementation, this would send an email to the customer
    // For now, we'll just update the status to 'sent'
    const result = await pool.query(
      `UPDATE tenant_data.invoices
       SET status = 'sent', updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2 AND status = 'draft'
       RETURNING *`,
      [tenantId, invoiceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or not in draft status' });
    }

    // TODO: Send email to customer with invoice details

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
};

// Generate invoice from quote
export const generateInvoiceFromQuote = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const quoteId = req.params.quoteId;
    const userId = (req as any).user.id; // The user creating the invoice

    // Get the quote
    const quoteResult = await pool.query(
      `SELECT * FROM tenant_data.quotes WHERE tenant_id = $1 AND id = $2 AND status = 'accepted'`,
      [tenantId, quoteId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found or not accepted' });
    }

    const quote = quoteResult.rows[0];

    // Get quote items
    const quoteItemsResult = await pool.query(
      `SELECT * FROM tenant_data.quote_items WHERE quote_id = $1 ORDER BY sort_order`,
      [quoteId]
    );

    // Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create the invoice
    const invoiceResult = await pool.query(
      `INSERT INTO tenant_data.invoices (
         tenant_id, customer_id, issued_by, invoice_number, quote_id, issue_date, 
         due_date, subtotal, tax_amount, total_amount, amount_due, status, 
         notes, terms_conditions
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        tenantId, quote.customer_id, userId, invoiceNumber, quoteId, 
        new Date(), // issue_date
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // due_date (30 days from now)
        quote.subtotal, quote.tax_amount, quote.total_amount, quote.total_amount, 
        'draft', quote.notes, quote.terms_conditions
      ]
    );

    const invoice = invoiceResult.rows[0];

    // Copy quote items to invoice items
    if (quoteItemsResult.rows.length > 0) {
      const itemPromises = quoteItemsResult.rows.map((item: any) => {
        return pool.query(
          `INSERT INTO tenant_data.invoice_items (
             invoice_id, product_id, description, quantity, unit_price, total_price, sort_order
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invoice.id, item.product_id, item.description, item.quantity,
            item.unit_price, item.total_price, item.sort_order
          ]
        );
      });

      await Promise.all(itemPromises);
    }

    // Update quote status to indicate it's been converted to an invoice
    await pool.query(
      `UPDATE tenant_data.quotes SET status = 'converted_to_invoice', updated_at = NOW() WHERE id = $1`,
      [quoteId]
    );

    // Fetch the complete invoice with items
    const fullInvoiceResult = await pool.query(
      `SELECT i.*, 
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as issued_by_first_name,
              u.last_name as issued_by_last_name
       FROM tenant_data.invoices i
       LEFT JOIN tenant_data.customers c ON i.customer_id = c.id
       LEFT JOIN public.users u ON i.issued_by = u.id
       WHERE i.id = $1`,
      [invoice.id]
    );

    res.status(201).json(fullInvoiceResult.rows[0]);
  } catch (error) {
    console.error('Error generating invoice from quote:', error);
    res.status(500).json({ error: 'Failed to generate invoice from quote' });
  }
};

// Get invoice status summary
export const getInvoiceStatusSummary = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    const result = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM tenant_data.invoices
       WHERE tenant_id = $1
       GROUP BY status`,
      [tenantId]
    );

    const summary: Record<string, number> = {};
    result.rows.forEach((row: any) => {
      summary[row.status] = parseInt(row.count);
    });

    res.json(summary);
  } catch (error) {
    console.error('Error fetching invoice status summary:', error);
    res.status(500).json({ error: 'Failed to fetch invoice status summary' });
  }
};