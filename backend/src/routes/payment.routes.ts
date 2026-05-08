import { Router } from 'express';
import {
  createCheckoutSession,
  handleStripeWebhook,
} from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

// Create checkout session (requires authentication)
router.post(
  '/checkout',
  authenticate,
  createCheckoutSession
);

export default router;

// Webhook route (no authentication needed)
export const webhookRouter = Router();
webhookRouter.post('/stripe', handleStripeWebhook);
