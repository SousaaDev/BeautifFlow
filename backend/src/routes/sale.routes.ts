import { Router } from 'express';
import * as saleController from '../controllers/sale.controller';

const router = Router({ mergeParams: true });

// GET /api/tenants/:tenantId/sales
router.get('/', saleController.index);

// POST /api/tenants/:tenantId/sales
router.post('/', saleController.store);

// GET /api/tenants/:tenantId/sales/:id
router.get('/:id', saleController.show);

export default router;
