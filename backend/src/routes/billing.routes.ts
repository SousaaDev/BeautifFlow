import { Router } from 'express';
import {
  listBillingPlans,
  createBillingCheckout,
  verifyBillingPayment,
  createBillingPortal,
} from '../controllers/billing.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/plans', authenticate, listBillingPlans);
router.post('/checkout', authenticate, createBillingCheckout);
router.get('/verify', verifyBillingPayment);
router.post('/portal', authenticate, createBillingPortal);

export default router;
