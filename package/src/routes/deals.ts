import { Router } from 'express';
import { 
  getDeals, 
  createDeal, 
  getDeal, 
  updateDeal, 
  deleteDeal,
  getDealStages
} from '../controllers/dealController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// Deal routes for ABETWORKS WORKCRM
router.get('/', getDeals);
router.post('/', createDeal);
router.get('/:id', getDeal);
router.put('/:id', updateDeal);
router.delete('/:id', deleteDeal);
router.get('/stages', getDealStages);

export default router;