import { Router } from 'express';
import * as profController from '../controllers/professional.controller';

const router = Router({ mergeParams: true });

// GET /api/tenants/:tenantId/professionals
router.get('/', profController.index);

// POST /api/tenants/:tenantId/professionals
router.post('/', profController.store);

// PUT /api/tenants/:tenantId/professionals/:id/services
router.put('/:id/services', profController.updateServices);

// GET /api/tenants/:tenantId/professionals/:id
router.get('/:id', profController.show);

// PUT /api/tenants/:tenantId/professionals/:id
router.put('/:id', profController.update);

// DELETE /api/tenants/:tenantId/professionals/:id
router.delete('/:id', profController.destroy);

export default router;
