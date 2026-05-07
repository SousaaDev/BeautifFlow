import { Express } from 'express';
import authRoutes from './auth.routes';
import tenantRoutes from './tenant.routes';
import customerRoutes from './customer.routes';
import professionalRoutes from './professional.routes';
import serviceRoutes from './service.routes';
import productRoutes from './product.routes';
import appointmentRoutes from './appointment.routes';
import saleRoutes from './sale.routes';
import automationRoutes from './automation.routes';
import analyticsRoutes from './analytics.routes';

export const setupRoutes = (app: Express) => {
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'BarberFlow API', version: '1.0.0' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/tenants', tenantRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/tenants/:tenantId/professionals', professionalRoutes);
  app.use('/api/tenants/:tenantId/services', serviceRoutes);
  app.use('/api/tenants/:tenantId/products', productRoutes);
  app.use('/api/tenants/:tenantId/appointments', appointmentRoutes);
  app.use('/api/tenants/:tenantId/sales', saleRoutes);
  app.use('/api/automations', automationRoutes);
  app.use('/api/analytics', analyticsRoutes);
};