import { Router } from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  getUserPermissions
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// User routes for ABETWORKS WORKCRM
router.get('/', getUsers);
router.get('/permissions', getUserPermissions);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/password', updateUserPassword);
router.delete('/:id', deleteUser);

export default router;