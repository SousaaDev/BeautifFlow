import { Router } from 'express';
import * as publicController from '../controllers/public.controller';

const router = Router();

router.post('/customers/register', publicController.registerCustomer);
router.post('/customers/login', publicController.loginCustomer);
router.get('/:slug/available-slots', publicController.getAvailableSlots);
router.post('/:slug/appointments', publicController.createPublicAppointment);
router.get('/:slug', publicController.getSalonData);

export default router;
