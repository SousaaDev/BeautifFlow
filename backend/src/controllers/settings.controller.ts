import { Request, Response } from 'express';
import { TenantRepository } from '../models/TenantRepository';

export class SettingsController {
  constructor(private tenantRepository: TenantRepository) {}

  async getNotificationSettings(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant not found' });
      }

      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const settings = tenant.settings || {};
      const notifications = settings.notifications || {
        newAppointments: true,
        cancellations: true,
        weeklyReports: false,
      };

      res.json({ notifications });
    } catch (error) {
      console.error('Error getting notification settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateNotificationSettings(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant not found' });
      }

      const { notifications } = req.body;
      if (!notifications || typeof notifications !== 'object') {
        return res.status(400).json({ error: 'Invalid notification settings' });
      }

      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const updatedSettings = {
        ...tenant.settings,
        notifications,
      };

      await this.tenantRepository.update(tenantId, {
        settings: updatedSettings,
      });

      res.json({ notifications });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPendingNotifications(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant not found' });
      }

      const { pool } = await import('../database/connection');
      const result = await pool.query(
        `SELECT id, content, created_at, metadata
         FROM messages
         WHERE tenant_id = $1 AND channel = 'notification' AND status = 'pending'
         ORDER BY created_at DESC
         LIMIT 50`,
        [tenantId]
      );

      const notifications = result.rows.map(row => ({
        id: row.id,
        message: row.content,
        createdAt: row.created_at,
        type: row.metadata?.type || 'general',
      }));

      res.json({ notifications });
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async markNotificationAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant not found' });
      }

      const { pool } = await import('../database/connection');
      await pool.query(
        `UPDATE messages
         SET status = 'read'
         WHERE id = $1 AND tenant_id = $2 AND channel = 'notification'`,
        [id, tenantId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}