import { Router } from 'express';
import {
  getInvoices,
  createInvoice,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  generateInvoiceFromQuote,
  getInvoiceStatusSummary
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

// Invoice action routes
router.post('/:id/send', sendInvoice);
router.get('/summary/status', getInvoiceStatusSummary);

// Generate invoice from quote
router.post('/from-quote/:quoteId', generateInvoiceFromQuote);

export default router;