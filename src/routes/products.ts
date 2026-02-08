import { Router } from 'express';
import {
  getProducts,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductCategories
} from '../controllers/productController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenantResolver';

const router = Router();

// Apply tenant resolution and authentication middleware to all routes
router.use(resolveTenant);
router.use(authenticate);

// Product routes for ABETWORKS WORKCRM
router.get('/', getProducts);
router.post('/', createProduct);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Product categories routes
router.get('/categories', getProductCategories);

export default router;