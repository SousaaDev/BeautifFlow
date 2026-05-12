import { Router } from 'express';
import * as publicController from '../controllers/public.controller';

const router = Router();

router.get('/:slug/available-slots', publicController.getAvailableSlots);
router.post('/:slug/appointments', publicController.createPublicAppointment);
router.get('/:slug', publicController.getSalonData);

export default router;
