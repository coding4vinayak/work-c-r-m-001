import { Router } from 'express';
import {
  getWorkflows,
  createWorkflow,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  getWorkflowTriggers,
  getWorkflowActions,
  getWorkflowHistory
} from '../controllers/workflowController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// Workflow routes for ABETWORKS WORKCRM
router.get('/', getWorkflows);
router.post('/', createWorkflow);
router.get('/:id', getWorkflow);
router.put('/:id', updateWorkflow);
router.delete('/:id', deleteWorkflow);
router.put('/:id/activate', activateWorkflow);
router.put('/:id/deactivate', deactivateWorkflow);
router.get('/triggers', getWorkflowTriggers);
router.get('/actions', getWorkflowActions);
router.get('/:workflowId/history', getWorkflowHistory);

export default router;