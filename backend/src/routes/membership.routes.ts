import { Router } from 'express';
import {
  createMembershipPlan,
  listMembershipPlans,
  listSubscriptions,
  createSubscription,
  updateSubscription,
} from '../controllers/membership.controller';

const router = Router({ mergeParams: true });

router.get('/membership-plans', listMembershipPlans);
router.post('/membership-plans', createMembershipPlan);
router.get('/subscriptions', listSubscriptions);
router.post('/subscriptions', createSubscription);
router.put('/subscriptions/:id', updateSubscription);

export default router;
