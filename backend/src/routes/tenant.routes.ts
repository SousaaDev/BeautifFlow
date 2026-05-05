import { Router } from 'express';
import { createTenant, getTenant, updateTenant } from '../controllers/tenant.controller';

const router = Router();

router.post('/', createTenant);
router.get('/:id', getTenant);
router.put('/:id', updateTenant);

export default router;