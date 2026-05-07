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

// Stock Management Routes
// POST /api/tenants/:tenantId/products/:id/adjust-stock
router.post('/:id/adjust-stock', productController.adjustStock);

// GET /api/tenants/:tenantId/products/:id/stock-movements
router.get('/:id/stock-movements', productController.getStockMovements);

// GET /api/tenants/:tenantId/products/stock-alerts
router.get('/stock-alerts', productController.getStockAlerts);

// GET /api/tenants/:tenantId/products/stock-movements/all
router.get('/stock-movements/all', productController.getAllStockMovements);

export default router;
