import { Router } from 'express';
import {
  getLeads,
  createLead,
  getLead,
  updateLead,
  deleteLead,
  getLeadSources,
  createLeadSource
} from '../controllers/leadController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// Lead routes for ABETWORKS WORKCRM
router.get('/', getLeads);
router.post('/', createLead);
router.get('/:id', getLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

// Lead sources routes
router.get('/sources', getLeadSources);
router.post('/sources', createLeadSource);

export default router;