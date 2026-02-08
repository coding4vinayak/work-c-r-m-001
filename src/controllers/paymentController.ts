import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get all payments for the current tenant
export const getPayments = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const invoiceId = req.query.invoiceId as string || '';
    const paymentMethod = req.query.paymentMethod as string || '';

    // Build query conditions
    let conditions = 'WHERE p.tenant_id = $1';
    let params: any[] = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions += ` AND (c.first_name ILIKE $${paramIndex} OR c.last_name ILIKE $${paramIndex} OR c.company ILIKE $${paramIndex} OR p.transaction_id ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (invoiceId) {
      conditions += ` AND p.invoice_id = $${paramIndex}`;
      params.push(invoiceId);
      paramIndex++;
    }

    if (paymentMethod) {
      conditions += ` AND p.payment_method = $${paramIndex}`;
      params.push(paymentMethod);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.payments p
       LEFT JOIN tenant_data.invoices i ON p.invoice_id = i.id
       LEFT JOIN tenant_data.customers c ON p.customer_id = c.id
       ${conditions}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get payments with pagination
    const result = await pool.query(
      `SELECT p.*, 
              i.invoice_number,
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as created_by_first_name,
              u.last_name as created_by_last_name
       FROM tenant_data.payments p
       LEFT JOIN tenant_data.invoices i ON p.invoice_id = i.id
       LEFT JOIN tenant_data.customers c ON p.customer_id = c.id
       LEFT JOIN public.users u ON p.created_by = u.id
       ${conditions}
       ORDER BY p.payment_date DESC
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
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// Create a new payment for the current tenant
export const createPayment = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const userId = (req as any).user.id; // The user creating the payment
    const {
      invoice_id,
      customer_id,
      amount,
      currency,
      payment_method,
      transaction_id,
      payment_date,
      notes
    } = req.body;

    // Verify the invoice belongs to the current tenant
    const invoiceResult = await pool.query(
      `SELECT id, total_amount, amount_due FROM tenant_data.invoices 
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, invoice_id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or does not belong to this tenant' });
    }

    const invoice = invoiceResult.rows[0];

    // Check if payment amount exceeds amount due
    if (amount > invoice.amount_due) {
      return res.status(400).json({ 
        error: `Payment amount exceeds amount due. Amount due: ${invoice.amount_due}` 
      });
    }

    // Create the payment
    const paymentResult = await pool.query(
      `INSERT INTO tenant_data.payments (
         tenant_id, invoice_id, customer_id, amount, currency, 
         payment_method, transaction_id, payment_date, notes, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        tenantId, invoice_id, customer_id, amount, currency,
        payment_method, transaction_id, payment_date || new Date(), notes, userId
      ]
    );

    const payment = paymentResult.rows[0];

    // Update the invoice's amount_due
    const newAmountDue = invoice.amount_due - amount;
    let newStatus = 'paid';
    
    if (newAmountDue > 0) {
      newStatus = 'partial';
    } else if (newAmountDue < 0) {
      // This shouldn't happen with our validation, but just in case
      return res.status(500).json({ error: 'Payment processing error' });
    }

    await pool.query(
      `UPDATE tenant_data.invoices 
       SET amount_due = $1, status = $2, updated_at = NOW()
       WHERE id = $3`,
      [newAmountDue, newStatus, invoice_id]
    );

    // Fetch the complete payment with related info
    const fullPaymentResult = await pool.query(
      `SELECT p.*, 
              i.invoice_number,
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as created_by_first_name,
              u.last_name as created_by_last_name
       FROM tenant_data.payments p
       LEFT JOIN tenant_data.invoices i ON p.invoice_id = i.id
       LEFT JOIN tenant_data.customers c ON p.customer_id = c.id
       LEFT JOIN public.users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [payment.id]
    );

    res.status(201).json(fullPaymentResult.rows[0]);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

// Get a specific payment for the current tenant
export const getPayment = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const paymentId = req.params.id;

    const result = await pool.query(
      `SELECT p.*, 
              i.invoice_number,
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as created_by_first_name,
              u.last_name as created_by_last_name
       FROM tenant_data.payments p
       LEFT JOIN tenant_data.invoices i ON p.invoice_id = i.id
       LEFT JOIN tenant_data.customers c ON p.customer_id = c.id
       LEFT JOIN public.users u ON p.created_by = u.id
       WHERE p.tenant_id = $1 AND p.id = $2`,
      [tenantId, paymentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

// Update a payment for the current tenant
export const updatePayment = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const paymentId = req.params.id;
    const {
      amount,
      currency,
      payment_method,
      transaction_id,
      payment_date,
      notes
    } = req.body;

    // Get the current payment to calculate the difference
    const currentPaymentResult = await pool.query(
      `SELECT p.*, i.amount_due as invoice_amount_due, i.total_amount as invoice_total
       FROM tenant_data.payments p
       JOIN tenant_data.invoices i ON p.invoice_id = i.id
       WHERE p.tenant_id = $1 AND p.id = $2`,
      [tenantId, paymentId]
    );

    if (currentPaymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const currentPayment = currentPaymentResult.rows[0];

    // Calculate the difference between old and new amounts
    const amountDifference = amount - parseFloat(currentPayment.amount);

    // Check if the new amount would exceed the invoice amount due
    const newInvoiceAmountDue = currentPayment.invoice_amount_due - amountDifference;
    if (newInvoiceAmountDue < 0) {
      return res.status(400).json({ 
        error: `Updated payment amount would exceed invoice total. Invoice total: ${currentPayment.invoice_total}` 
      });
    }

    // Update the payment
    const paymentResult = await pool.query(
      `UPDATE tenant_data.payments
       SET amount = $1, currency = $2, payment_method = $3, 
           transaction_id = $4, payment_date = $5, notes = $6, updated_at = NOW()
       WHERE tenant_id = $7 AND id = $8
       RETURNING *`,
      [
        amount, currency, payment_method,
        transaction_id, payment_date, notes,
        tenantId, paymentId
      ]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update the invoice's amount_due based on the difference
    await pool.query(
      `UPDATE tenant_data.invoices 
       SET amount_due = amount_due - $1, 
           status = CASE 
                     WHEN amount_due - $1 = 0 THEN 'paid'
                     WHEN amount_due - $1 > 0 AND amount_due - $1 < total_amount THEN 'partial'
                     ELSE 'sent'
                   END,
           updated_at = NOW()
       WHERE id = $2`,
      [amountDifference, currentPayment.invoice_id]
    );

    // Fetch the updated payment with related info
    const fullPaymentResult = await pool.query(
      `SELECT p.*, 
              i.invoice_number,
              CONCAT(c.first_name, ' ', c.last_name) as customer_name,
              c.company as customer_company,
              u.first_name as created_by_first_name,
              u.last_name as created_by_last_name
       FROM tenant_data.payments p
       LEFT JOIN tenant_data.invoices i ON p.invoice_id = i.id
       LEFT JOIN tenant_data.customers c ON p.customer_id = c.id
       LEFT JOIN public.users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [paymentId]
    );

    res.json(fullPaymentResult.rows[0]);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
};

// Delete a payment for the current tenant
export const deletePayment = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const paymentId = req.params.id;

    // Get the payment to retrieve the amount and invoice ID
    const paymentResult = await pool.query(
      `SELECT p.*, i.amount_due as invoice_amount_due
       FROM tenant_data.payments p
       JOIN tenant_data.invoices i ON p.invoice_id = i.id
       WHERE p.tenant_id = $1 AND p.id = $2`,
      [tenantId, paymentId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // Delete the payment
    const result = await pool.query(
      'DELETE FROM tenant_data.payments WHERE tenant_id = $1 AND id = $2 RETURNING id',
      [tenantId, paymentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update the invoice's amount_due by adding back the payment amount
    const newAmountDue = payment.invoice_amount_due + parseFloat(payment.amount);
    let newStatus = 'sent'; // Default to sent
    
    if (newAmountDue === payment.invoice_total) {
      newStatus = 'sent'; // If we're adding back the full payment, it goes back to sent
    } else if (newAmountDue < payment.invoice_total) {
      newStatus = 'partial';
    }

    await pool.query(
      `UPDATE tenant_data.invoices 
       SET amount_due = $1, status = $2, updated_at = NOW()
       WHERE id = $3`,
      [newAmountDue, newStatus, payment.invoice_id]
    );

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
};

// Get payment methods for the current tenant
export const getPaymentMethods = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    // Get distinct payment methods from payments
    const result = await pool.query(
      `SELECT DISTINCT payment_method
       FROM tenant_data.payments
       WHERE tenant_id = $1 AND payment_method IS NOT NULL
       ORDER BY payment_method`,
      [tenantId]
    );

    const paymentMethods = result.rows.map(row => row.payment_method);
    res.json(paymentMethods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
};