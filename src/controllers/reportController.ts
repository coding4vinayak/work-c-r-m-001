import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get sales report for the current tenant
export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { startDate, endDate, groupBy = 'month' } = req.query;

    // Build date filters
    let dateFilter = '';
    const params: any[] = [tenantId];
    
    if (startDate) {
      dateFilter += ` AND i.issue_date >= $${params.length + 1}`;
      params.push(new Date(startDate as string));
    }
    
    if (endDate) {
      dateFilter += ` AND i.issue_date <= $${params.length + 1}`;
      params.push(new Date(endDate as string));
    }

    // Query to get sales data grouped by period
    let groupClause = '';
    if (groupBy === 'day') {
      groupClause = "TO_CHAR(i.issue_date, 'YYYY-MM-DD')";
    } else if (groupBy === 'week') {
      groupClause = "TO_CHAR(DATE_TRUNC('week', i.issue_date), 'YYYY-WW')";
    } else if (groupBy === 'month') {
      groupClause = "TO_CHAR(i.issue_date, 'YYYY-MM')";
    } else if (groupBy === 'quarter') {
      groupClause = "CONCAT(EXTRACT(YEAR FROM i.issue_date), '-Q', EXTRACT(QUARTER FROM i.issue_date))";
    } else { // year
      groupClause = "EXTRACT(YEAR FROM i.issue_date)";
    }

    const query = `
      SELECT 
        ${groupClause} as period,
        COUNT(i.id) as invoice_count,
        SUM(i.total_amount) as total_sales,
        SUM(i.amount_due) as outstanding_amount,
        AVG(i.total_amount) as average_sale
      FROM tenant_data.invoices i
      WHERE i.tenant_id = $1 AND i.status IN ('paid', 'partial', 'sent')
      ${dateFilter}
      GROUP BY ${groupClause}
      ORDER BY ${groupClause}
    `;

    const result = await pool.query(query, params);

    res.json({
      reportType: 'sales',
      groupBy,
      dateRange: { startDate, endDate },
      data: result.rows
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
};

// Get leads report for the current tenant
export const getLeadsReport = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { startDate, endDate, groupBy = 'month' } = req.query;

    // Build date filters
    let dateFilter = '';
    const params: any[] = [tenantId];
    
    if (startDate) {
      dateFilter += ` AND l.created_at >= $${params.length + 1}`;
      params.push(new Date(startDate as string));
    }
    
    if (endDate) {
      dateFilter += ` AND l.created_at <= $${params.length + 1}`;
      params.push(new Date(endDate as string));
    }

    // Query to get leads data grouped by period
    let groupClause = '';
    if (groupBy === 'day') {
      groupClause = "TO_CHAR(l.created_at, 'YYYY-MM-DD')";
    } else if (groupBy === 'week') {
      groupClause = "TO_CHAR(DATE_TRUNC('week', l.created_at), 'YYYY-WW')";
    } else if (groupBy === 'month') {
      groupClause = "TO_CHAR(l.created_at, 'YYYY-MM')";
    } else if (groupBy === 'quarter') {
      groupClause = "CONCAT(EXTRACT(YEAR FROM l.created_at), '-Q', EXTRACT(QUARTER FROM l.created_at))";
    } else { // year
      groupClause = "EXTRACT(YEAR FROM l.created_at)";
    }

    const query = `
      SELECT 
        ${groupClause} as period,
        COUNT(l.id) as total_leads,
        COUNT(CASE WHEN l.status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN l.status = 'contacted' THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN l.status = 'qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN l.status = 'closed_won' THEN 1 END) as won_leads,
        COUNT(CASE WHEN l.status = 'closed_lost' THEN 1 END) as lost_leads,
        ROUND(COUNT(CASE WHEN l.status = 'closed_won' THEN 1 END) * 100.0 / NULLIF(COUNT(l.id), 0), 2) as conversion_rate
      FROM tenant_data.leads l
      WHERE l.tenant_id = $1
      ${dateFilter}
      GROUP BY ${groupClause}
      ORDER BY ${groupClause}
    `;

    const result = await pool.query(query, params);

    res.json({
      reportType: 'leads',
      groupBy,
      dateRange: { startDate, endDate },
      data: result.rows
    });
  } catch (error) {
    console.error('Error generating leads report:', error);
    res.status(500).json({ error: 'Failed to generate leads report' });
  }
};

// Get deals report for the current tenant
export const getDealsReport = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { startDate, endDate, groupBy = 'month' } = req.query;

    // Build date filters
    let dateFilter = '';
    const params: any[] = [tenantId];
    
    if (startDate) {
      dateFilter += ` AND d.created_at >= $${params.length + 1}`;
      params.push(new Date(startDate as string));
    }
    
    if (endDate) {
      dateFilter += ` AND d.created_at <= $${params.length + 1}`;
      params.push(new Date(endDate as string));
    }

    // Query to get deals data grouped by period
    let groupClause = '';
    if (groupBy === 'day') {
      groupClause = "TO_CHAR(d.created_at, 'YYYY-MM-DD')";
    } else if (groupBy === 'week') {
      groupClause = "TO_CHAR(DATE_TRUNC('week', d.created_at), 'YYYY-WW')";
    } else if (groupBy === 'month') {
      groupClause = "TO_CHAR(d.created_at, 'YYYY-MM')";
    } else if (groupBy === 'quarter') {
      groupClause = "CONCAT(EXTRACT(YEAR FROM d.created_at), '-Q', EXTRACT(QUARTER FROM d.created_at))";
    } else { // year
      groupClause = "EXTRACT(YEAR FROM d.created_at)";
    }

    const query = `
      SELECT 
        ${groupClause} as period,
        COUNT(d.id) as total_deals,
        COUNT(CASE WHEN ds.name = 'Closed Won' THEN 1 END) as won_deals,
        COUNT(CASE WHEN ds.name = 'Closed Lost' THEN 1 END) as lost_deals,
        SUM(CASE WHEN ds.name = 'Closed Won' THEN d.value ELSE 0 END) as won_value,
        SUM(CASE WHEN ds.name = 'Closed Lost' THEN d.value ELSE 0 END) as lost_value,
        ROUND(COUNT(CASE WHEN ds.name = 'Closed Won' THEN 1 END) * 100.0 / NULLIF(COUNT(d.id), 0), 2) as win_rate,
        AVG(d.value) as average_deal_value
      FROM tenant_data.deals d
      LEFT JOIN tenant_data.deal_stages ds ON d.stage_id = ds.id
      WHERE d.tenant_id = $1
      ${dateFilter}
      GROUP BY ${groupClause}
      ORDER BY ${groupClause}
    `;

    const result = await pool.query(query, params);

    res.json({
      reportType: 'deals',
      groupBy,
      dateRange: { startDate, endDate },
      data: result.rows
    });
  } catch (error) {
    console.error('Error generating deals report:', error);
    res.status(500).json({ error: 'Failed to generate deals report' });
  }
};

// Get customer report for the current tenant
export const getCustomerReport = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { startDate, endDate } = req.query;

    // Build date filters
    let dateFilter = '';
    const params: any[] = [tenantId];
    
    if (startDate) {
      dateFilter += ` AND c.created_at >= $${params.length + 1}`;
      params.push(new Date(startDate as string));
    }
    
    if (endDate) {
      dateFilter += ` AND c.created_at <= $${params.length + 1}`;
      params.push(new Date(endDate as string));
    }

    // Query to get customer data
    const query = `
      SELECT 
        COUNT(c.id) as total_customers,
        COUNT(CASE WHEN c.status = 'lead' THEN 1 END) as leads,
        COUNT(CASE WHEN c.status = 'prospect' THEN 1 END) as prospects,
        COUNT(CASE WHEN c.status = 'customer' THEN 1 END) as customers,
        COUNT(CASE WHEN c.status = 'inactive' THEN 1 END) as inactive_customers,
        AVG(c.lead_score) as average_lead_score,
        COUNT(DISTINCT c.company) as unique_companies
      FROM tenant_data.customers c
      WHERE c.tenant_id = $1
      ${dateFilter}
    `;

    const result = await pool.query(query, params);

    res.json({
      reportType: 'customers',
      dateRange: { startDate, endDate },
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error generating customer report:', error);
    res.status(500).json({ error: 'Failed to generate customer report' });
  }
};

// Get dashboard analytics for the current tenant
export const getDashboardAnalytics = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;

    // Get key metrics
    const metricsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM tenant_data.customers WHERE tenant_id = $1) as total_customers,
        (SELECT COUNT(*) FROM tenant_data.leads WHERE tenant_id = $1) as total_leads,
        (SELECT COUNT(*) FROM tenant_data.deals WHERE tenant_id = $1) as total_deals,
        (SELECT COUNT(*) FROM tenant_data.tasks WHERE tenant_id = $1 AND completed = false) as total_open_tasks,
        (SELECT COUNT(*) FROM tenant_data.invoices WHERE tenant_id = $1 AND status = 'paid') as total_paid_invoices,
        (SELECT SUM(total_amount) FROM tenant_data.invoices WHERE tenant_id = $1 AND status = 'paid') as total_revenue,
        (SELECT COUNT(*) FROM tenant_data.invoices WHERE tenant_id = $1 AND status = 'sent' AND amount_due > 0) as total_outstanding_invoices,
        (SELECT SUM(amount_due) FROM tenant_data.invoices WHERE tenant_id = $1 AND status = 'sent' AND amount_due > 0) as total_outstanding_amount
    `;

    const metricsResult = await pool.query(metricsQuery, [tenantId]);

    // Get recent activities
    const recentActivitiesQuery = `
      SELECT 
        'customer' as entity_type,
        id,
        CONCAT(first_name, ' ', last_name) as name,
        created_at as date
      FROM tenant_data.customers
      WHERE tenant_id = $1
      UNION ALL
      SELECT 
        'lead' as entity_type,
        id,
        CONCAT(first_name, ' ', last_name) as name,
        created_at as date
      FROM tenant_data.leads
      WHERE tenant_id = $1
      UNION ALL
      SELECT 
        'deal' as entity_type,
        id,
        title as name,
        created_at as date
      FROM tenant_data.deals
      WHERE tenant_id = $1
      ORDER BY date DESC
      LIMIT 10
    `;

    const recentActivitiesResult = await pool.query(recentActivitiesQuery, [tenantId]);

    res.json({
      metrics: metricsResult.rows[0],
      recentActivities: recentActivitiesResult.rows
    });
  } catch (error) {
    console.error('Error generating dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to generate dashboard analytics' });
  }
};

// Get top performing deals for the current tenant
export const getTopPerformingDeals = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT 
        d.title,
        d.value,
        d.probability,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        ds.name as stage_name,
        u.first_name as assigned_to_first_name,
        u.last_name as assigned_to_last_name
      FROM tenant_data.deals d
      LEFT JOIN tenant_data.customers c ON d.customer_id = c.id
      LEFT JOIN tenant_data.deal_stages ds ON d.stage_id = ds.id
      LEFT JOIN public.users u ON d.assigned_to = u.id
      WHERE d.tenant_id = $1 AND d.status != 'closed_lost'
      ORDER BY d.value DESC
      LIMIT $2
    `, [tenantId, parseInt(limit as string)]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting top performing deals:', error);
    res.status(500).json({ error: 'Failed to get top performing deals' });
  }
};