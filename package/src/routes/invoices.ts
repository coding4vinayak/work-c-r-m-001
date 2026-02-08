import { Router } from 'express';
import { 
  getInvoices, 
  createInvoice, 
  getInvoice, 
  updateInvoice, 
  deleteInvoice,
  updateInvoiceStatus,
  recordPayment,
  getInvoicePayments
} from '../controllers/invoiceController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// Invoice routes for ABETWORKS WORKCRM
router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);
router.put('/:id/status', updateInvoiceStatus);
router.post('/:id/payments', recordPayment);
router.get('/:id/payments', getInvoicePayments);

export default router;