import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get all products for the current tenant
export const getProducts = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const category = req.query.category as string || '';
    const isActive = req.query.isActive as string;

    // Build query conditions
    let conditions = 'WHERE p.tenant_id = $1';
    let params: any[] = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      conditions += ` AND p.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (isActive !== undefined) {
      conditions += ` AND p.is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.products p
       ${conditions}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get products with pagination
    const result = await pool.query(
      `SELECT *
       FROM tenant_data.products p
       ${conditions}
       ORDER BY p.created_at DESC
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
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Create a new product for the current tenant
export const createProduct = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const {
      name,
      description,
      sku,
      price,
      cost,
      currency,
      category,
      is_active
    } = req.body;

    const result = await pool.query(
      `INSERT INTO tenant_data.products (
         tenant_id, name, description, sku, price, cost, currency, category, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        tenantId, name, description, sku, price, cost, currency, category, 
        is_active !== undefined ? is_active : true
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

// Get a specific product for the current tenant
export const getProduct = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const productId = req.params.id;

    const result = await pool.query(
      `SELECT *
       FROM tenant_data.products
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// Update a product for the current tenant
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const productId = req.params.id;
    const {
      name,
      description,
      sku,
      price,
      cost,
      currency,
      category,
      is_active
    } = req.body;

    const result = await pool.query(
      `UPDATE tenant_data.products
       SET name = $1, description = $2, sku = $3, price = $4, cost = $5,
           currency = $6, category = $7, is_active = $8, updated_at = NOW()
       WHERE tenant_id = $9 AND id = $10
       RETURNING *`,
      [
        name, description, sku, price, cost,
        currency, category, is_active,
        tenantId, productId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// Delete a product for the current tenant
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const productId = req.params.id;

    // Check if product is used in any quotes or invoices
    const quoteItemResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.quote_items qi
       JOIN tenant_data.quotes q ON qi.quote_id = q.id
       WHERE qi.product_id = $1 AND q.tenant_id = $2`,
      [productId, tenantId]
    );

    const invoiceItemResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.invoice_items ii
       JOIN tenant_data.invoices i ON ii.invoice_id = i.id
       WHERE ii.product_id = $1 AND i.tenant_id = $2`,
      [productId, tenantId]
    );

    const quoteItemCount = parseInt(quoteItemResult.rows[0].count);
    const invoiceItemCount = parseInt(invoiceItemResult.rows[0].count);

    if (quoteItemCount > 0 || invoiceItemCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product that is used in existing quotes or invoices' 
      });
    }

    const result = await pool.query(
      'DELETE FROM tenant_data.products WHERE tenant_id = $1 AND id = $2 RETURNING id',
      [tenantId, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// Get product categories for the current tenant
export const getProductCategories = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    // Get distinct categories from products
    const result = await pool.query(
      `SELECT DISTINCT category
       FROM tenant_data.products
       WHERE tenant_id = $1 AND category IS NOT NULL
       ORDER BY category`,
      [tenantId]
    );

    const categories = result.rows.map(row => row.category);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({ error: 'Failed to fetch product categories' });
  }
};