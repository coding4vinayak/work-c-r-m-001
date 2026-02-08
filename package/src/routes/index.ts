import { Router } from 'express';
import authRoutes from './auth';
import tenantRoutes from './tenants';
import customerRoutes from './customers';
import leadRoutes from './leads';
import dealRoutes from './deals';
import taskRoutes from './tasks';
import quoteRoutes from './quotes';
import invoiceRoutes from './invoices';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/customers', customerRoutes);
router.use('/leads', leadRoutes);
router.use('/deals', dealRoutes);
router.use('/tasks', taskRoutes);
router.use('/quotes', quoteRoutes);
router.use('/invoices', invoiceRoutes);

export default router;