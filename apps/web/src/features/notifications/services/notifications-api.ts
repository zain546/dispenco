import { apiClient } from '@/lib/api';

export interface NotificationItem {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: NotificationItem[];
  unreadCount: number;
}

export const notificationsApi = {
  getNotifications: async (unreadOnly?: boolean): Promise<NotificationsResponse> => {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unreadOnly', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get(`/notifications${query}`);
    return res.data;
  },

  markAsRead: async (id: string) => {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await apiClient.patch('/notifications/read-all');
    return res.data;
  },

  triggerLowStockScan: async () => {
    const res = await apiClient.post('/notifications/scan-low-stock');
    return res.data;
  },

  triggerExpiryScan: async () => {
    const res = await apiClient.post('/notifications/scan-expiry');
    return res.data;
  },
};
