import { Router } from 'express';
import {
  getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  deleteNotification,
  getNotificationCount
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// Notification routes for ABETWORKS WORKCRM
router.get('/', getNotifications);
router.get('/unread', getUnreadNotifications);
router.get('/count', getNotificationCount);
router.put('/:id/read', markNotificationAsRead);
router.put('/read-all', markAllNotificationsAsRead);
router.post('/', createNotification);
router.delete('/:id', deleteNotification);

export default router;