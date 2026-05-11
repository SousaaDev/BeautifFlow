import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { TenantRepositoryImpl } from '../models/TenantRepositoryImpl';
import { pool } from '../database/connection';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const tenantRepository = new TenantRepositoryImpl(pool);
const settingsController = new SettingsController(tenantRepository);

// Get notification settings
router.get('/notifications', authenticate, settingsController.getNotificationSettings.bind(settingsController));

// Update notification settings
router.put('/notifications', authenticate, settingsController.updateNotificationSettings.bind(settingsController));

// Get pending notifications
router.get('/notifications/pending', authenticate, settingsController.getPendingNotifications.bind(settingsController));

// Mark notification as read
router.put('/notifications/:id/read', authenticate, settingsController.markNotificationAsRead.bind(settingsController));

export default router;