import { Router } from 'express';
import { 
  getTasks, 
  createTask, 
  getTask, 
  updateTask, 
  deleteTask,
  getTaskCategories,
  completeTask,
  uncompleteTask
} from '../controllers/taskController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// Task routes for ABETWORKS WORKCRM
router.get('/', getTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.get('/categories', getTaskCategories);
router.put('/:id/complete', completeTask);
router.put('/:id/uncomplete', uncompleteTask);

export default router;