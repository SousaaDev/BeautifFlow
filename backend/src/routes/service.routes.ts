import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';

const router = Router({ mergeParams: true });

// GET /api/tenants/:tenantId/services
router.get('/', serviceController.index);

// POST /api/tenants/:tenantId/services
router.post('/', serviceController.store);

// GET /api/tenants/:tenantId/services/:id
router.get('/:id', serviceController.show);

// PUT /api/tenants/:tenantId/services/:id
router.put('/:id', serviceController.update);

// DELETE /api/tenants/:tenantId/services/:id
router.delete('/:id', serviceController.destroy);

export default router;
