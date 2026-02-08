import { Router } from 'express';
import {
  getFiles,
  uploadFile,
  downloadFile,
  getFile,
  deleteFile,
  getFilesByEntity
} from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';
import { upload } from '../controllers/fileController';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// File routes for ABETWORKS WORKCRM
router.get('/', getFiles);
router.get('/:id', getFile);
router.get('/:id/download', downloadFile);
router.get('/entity/:entityType/:entityId', getFilesByEntity);
router.post('/', upload.single('file'), uploadFile);
router.delete('/:id', deleteFile);

export default router;