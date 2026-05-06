import { Router } from 'express';
import * as appointmentController from '../controllers/appointment.controller';

const router = Router({ mergeParams: true });

// GET /api/tenants/:tenantId/appointments
router.get('/', appointmentController.index);

// POST /api/tenants/:tenantId/appointments
router.post('/', appointmentController.store);

// GET /api/tenants/:tenantId/appointments/:id
router.get('/:id', appointmentController.show);

// PUT /api/tenants/:tenantId/appointments/:id
router.put('/:id', appointmentController.update);

// DELETE /api/tenants/:tenantId/appointments/:id (cancel)
router.delete('/:id', appointmentController.destroy);

export default router;
