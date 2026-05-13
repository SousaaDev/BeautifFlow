import api from './client'

export interface NotificationSettings {
  newAppointments: boolean;
  cancellations: boolean;
  weeklyReports: boolean;
}

export interface PendingNotification {
  id: string;
  message: string;
  createdAt: string;
  type: string;
}

export const settingsApi = {
  async getNotificationSettings(): Promise<NotificationSettings> {
    const data = await api.get<{ notifications: NotificationSettings }>('/api/settings/notifications')
    return data.notifications
  },

  async updateNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    const data = await api.put<{ notifications: NotificationSettings }>('/api/settings/notifications', {
      notifications: settings,
    })
    return data.notifications
  },

  async getPendingNotifications(): Promise<PendingNotification[]> {
    const data = await api.get<{ notifications: PendingNotification[] }>('/api/settings/notifications/pending')
    return data.notifications
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await api.put(`/api/settings/notifications/${notificationId}/read`)
  },
}