import { Router } from 'express';
import {
  getPayments,
  createPayment,
  getPayment,
  updatePayment,
  deletePayment,
  getPaymentMethods
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// Payment routes for ABETWORKS WORKCRM
router.get('/', getPayments);
router.post('/', createPayment);
router.get('/:id', getPayment);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

// Payment methods routes
router.get('/methods', getPaymentMethods);

export default router;