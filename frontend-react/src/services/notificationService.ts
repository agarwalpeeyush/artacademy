import api from './api';
import { Notification } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;

const toArray = (d: any): any[] => {
  if (Array.isArray(d)) return d;
  if (d?.content) return d.content;
  return [];
};

/**
 * Maps a backend notification record to the frontend Notification shape.
 * Handles both new records (title/type) and legacy ones (subject/body only).
 */
const normalize = (n: any): Notification => ({
  id: n.id,
  userId: n.userId,
  title: n.title ?? n.subject ?? 'Notification',
  message: n.message ?? n.body ?? '',
  type: n.type ?? 'INFO',
  isRead: n.isRead ?? n.read ?? false,
  createdAt: n.createdAt ?? '',
  readAt: n.readAt,
});

const notificationService = {
  getByUserId: async (userId: string, page = 0, size = 50): Promise<Notification[]> => {
    const response = await api.get(`/notifications/${userId}`, { params: { page, size } });
    return toArray(unwrap(response)).map(normalize);
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    const response = await api.get('/notifications/unread-count', { params: { userId } });
    return Number(unwrap(response) ?? 0);
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    await api.put('/notifications/read-all', null, { params: { userId } });
  },
};

export default notificationService;
