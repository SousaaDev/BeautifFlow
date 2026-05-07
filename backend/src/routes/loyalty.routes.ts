import { Router } from 'express';
import * as loyaltyController from '../controllers/loyalty.controller';

const router = Router({ mergeParams: true });

// GET /api/tenants/:tenantId/customers/:customerId/loyalty
router.get('/customers/:customerId/loyalty', loyaltyController.getPoints);

// POST /api/tenants/:tenantId/customers/:customerId/loyalty/add
router.post('/customers/:customerId/loyalty/add', loyaltyController.addPoints);

// POST /api/tenants/:tenantId/customers/:customerId/loyalty/redeem
router.post('/customers/:customerId/loyalty/redeem', loyaltyController.redeemPoints);

// GET /api/tenants/:tenantId/customers/:customerId/loyalty/history
router.get('/customers/:customerId/loyalty/history', loyaltyController.getTransactionHistory);

// GET /api/tenants/:tenantId/loyalty/top-customers
router.get('/loyalty/top-customers', loyaltyController.getTopCustomers);

export default router;