import { Router } from 'express';
import {
  store,
  index,
  show,
  update,
  destroy,
  softDelete,
  restore,
  getDeleted,
} from '../controllers/customer.controller';

const router = Router();

router.post('/', store);
router.get('/', index);
router.get('/:id', show);
router.put('/:id', update);
router.delete('/:id', destroy);

// Soft delete routes for LGPD compliance
router.delete('/:id/soft', softDelete);
router.post('/:id/restore', restore);
router.get('/deleted/list', getDeleted);

export default router;
