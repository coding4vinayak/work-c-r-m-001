import { Router } from 'express';
import { 
  getCustomers, 
  createCustomer, 
  getCustomer, 
  updateCustomer, 
  deleteCustomer 
} from '../controllers/customerController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// Customer routes for ABETWORKS WORKCRM
router.get('/', getCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;