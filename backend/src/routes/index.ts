import { Express } from 'express';
import authRoutes from './auth.routes';
import tenantRoutes from './tenant.routes';
// Add other routes as needed

export const setupRoutes = (app: Express) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/tenants', tenantRoutes);
  // Add other route groups
};