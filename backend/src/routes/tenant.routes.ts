import { Router } from 'express';
import { store, show, update, destroy } from '../controllers/tenant.controller';

const router = Router();

router.post('/', store);
router.get('/:id', show);
router.put('/:id', update);
router.delete('/:id', destroy);

export default router;