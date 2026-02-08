import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createTenant, getTenant, updateTenant } from '../controllers/tenantController';

const router = Router();

// Super admin routes for ABETWORKS platform
router.post('/', authenticate, createTenant); // Only super admin
router.get('/:id', authenticate, getTenant);
router.put('/:id', authenticate, updateTenant);

export default router;