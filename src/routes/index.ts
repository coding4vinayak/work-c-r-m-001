import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import tenantRoutes from './tenants';
import customerRoutes from './customers';
import leadRoutes from './leads';
import dealRoutes from './deals';
import taskRoutes from './tasks';
import productRoutes from './products';
import quoteRoutes from './quotes';
import invoiceRoutes from './invoices';
import paymentRoutes from './payments';
import settingRoutes from './settings';
import notificationRoutes from './notifications';
import fileRoutes from './files';
import reportRoutes from './reports';
import workflowRoutes from './workflows';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tenants', tenantRoutes);
router.use('/customers', customerRoutes);
router.use('/leads', leadRoutes);
router.use('/deals', dealRoutes);
router.use('/tasks', taskRoutes);
router.use('/products', productRoutes);
router.use('/quotes', quoteRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/settings', settingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/files', fileRoutes);
router.use('/reports', reportRoutes);
router.use('/workflows', workflowRoutes);

export default router;