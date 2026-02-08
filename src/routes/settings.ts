import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getSetting,
  updateSetting,
  getCompanyProfile,
  updateCompanyProfile,
  getFinanceSettings,
  updateFinanceSettings
} from '../controllers/settingController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// Settings routes for ABETWORKS WORKCRM
router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/:key', getSetting);
router.put('/:key', updateSetting);

// Specific settings routes
router.get('/profile/company', getCompanyProfile);
router.put('/profile/company', updateCompanyProfile);
router.get('/finance', getFinanceSettings);
router.put('/finance', updateFinanceSettings);

export default router;