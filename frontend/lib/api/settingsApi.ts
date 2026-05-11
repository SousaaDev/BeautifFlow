const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    const response = await fetch(`${API_BASE_URL}/api/settings/notifications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notification settings');
    }

    const data = await response.json();
    return data.notifications;
  },

  async updateNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    const response = await fetch(`${API_BASE_URL}/api/settings/notifications`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ notifications: settings }),
    });

    if (!response.ok) {
      throw new Error('Failed to update notification settings');
    }

    const data = await response.json();
    return data.notifications;
  },

  async getPendingNotifications(): Promise<PendingNotification[]> {
    const response = await fetch(`${API_BASE_URL}/api/settings/notifications/pending`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pending notifications');
    }

    const data = await response.json();
    return data.notifications;
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/settings/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }
  },
};