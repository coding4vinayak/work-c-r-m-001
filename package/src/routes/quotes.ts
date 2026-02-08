import { Router } from 'express';
import { 
  getQuotes, 
  createQuote, 
  getQuote, 
  updateQuote, 
  deleteQuote,
  getProducts,
  updateQuoteStatus
} from '../controllers/quoteController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// Quote routes for ABETWORKS WORKCRM
router.get('/', getQuotes);
router.post('/', createQuote);
router.get('/:id', getQuote);
router.put('/:id', updateQuote);
router.delete('/:id', deleteQuote);
router.get('/products', getProducts);
router.put('/:id/status', updateQuoteStatus);

export default router;