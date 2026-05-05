import { Express } from 'express';
import authRoutes from './auth.routes';
import tenantRoutes from './tenant.routes';
import customerRoutes from './customer.routes';

export const setupRoutes = (app: Express) => {
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'BarberFlow API', version: '1.0.0' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/tenants', tenantRoutes);
  app.use('/api/customers', customerRoutes);
};