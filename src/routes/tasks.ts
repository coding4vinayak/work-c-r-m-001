import { Router } from 'express';
import {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  updateTaskCompletion,
  getTaskCategories,
  getUserTasks,
  getOverdueTasks
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

// Task completion routes
router.put('/:id/completion', updateTaskCompletion);

// Task categories routes
router.get('/categories', getTaskCategories);

// Special task views
router.get('/my-tasks', getUserTasks);
router.get('/overdue', getOverdueTasks);

export default router;