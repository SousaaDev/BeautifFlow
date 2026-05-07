import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getOverview,
  getRetention,
  getChurn,
  getTopCustomers,
  getTopServices,
} from '../controllers/analytics.controller';

const router = Router();

router.use(authenticate);

// GET /api/analytics/overview?tenantId=&startDate=&endDate=
router.get('/overview', getOverview);

// GET /api/analytics/retention?tenantId=&startDate=&endDate=
router.get('/retention', getRetention);

// GET /api/analytics/churn?tenantId=&inactiveThresholdDays=30
router.get('/churn', getChurn);

// GET /api/analytics/top-customers?tenantId=&limit=10
router.get('/top-customers', getTopCustomers);

// GET /api/analytics/top-services?tenantId=&limit=10
router.get('/top-services', getTopServices);

export default router;
