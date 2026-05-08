import { Router } from 'express';
import { store, show, update, destroy } from '../controllers/tenant.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', store);
router.get('/:id', show);
router.put('/:id', authenticate, update);
router.delete('/:id', destroy);

export default router;