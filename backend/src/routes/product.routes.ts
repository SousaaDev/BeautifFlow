import { Router } from 'express';
import * as productController from '../controllers/product.controller';

const router = Router({ mergeParams: true });

// GET /api/tenants/:tenantId/products
router.get('/', productController.index);

// POST /api/tenants/:tenantId/products
router.post('/', productController.store);

// GET /api/tenants/:tenantId/products/:id
router.get('/:id', productController.show);

// PUT /api/tenants/:tenantId/products/:id
router.put('/:id', productController.update);

// DELETE /api/tenants/:tenantId/products/:id
router.delete('/:id', productController.destroy);

export default router;
