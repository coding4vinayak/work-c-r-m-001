import { Router } from 'express';
import {
  getSalesReport,
  getLeadsReport,
  getDealsReport,
  getCustomerReport,
  getDashboardAnalytics,
  getTopPerformingDeals
} from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// Report routes for ABETWORKS WORKCRM
router.get('/sales', getSalesReport);
router.get('/leads', getLeadsReport);
router.get('/deals', getDealsReport);
router.get('/customers', getCustomerReport);
router.get('/dashboard', getDashboardAnalytics);
router.get('/top-deals', getTopPerformingDeals);

export default router;