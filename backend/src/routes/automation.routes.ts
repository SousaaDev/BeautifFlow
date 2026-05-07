import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { index, store, update, execute } from '../controllers/automation.controller';

const router = Router();

router.use(authenticate);
router.get('/', index);
router.post('/', store);
router.put('/:id', update);
router.post('/execute', execute);

export default router;
