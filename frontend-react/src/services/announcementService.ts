import api from './api';
import { Announcement, TeacherBroadcastPermission } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;

const toArray = (d: any): any[] => {
  if (Array.isArray(d)) return d;
  if (d?.content) return d.content;
  return [];
};

const normAnnouncement = (a: any): Announcement => ({
  id: a.id,
  title: a.title ?? '',
  body: a.body ?? '',
  audience: a.audience,
  senderUserId: a.senderUserId,
  senderRole: a.senderRole,
  recipientCount: Number(a.recipientCount ?? 0),
  createdAt: a.createdAt ?? '',
});

const normPermission = (p: any): TeacherBroadcastPermission => ({
  teacherId: p.teacherId,
  canBroadcast: p.canBroadcast ?? false,
});

export interface BroadcastRequest {
  title: string;
  body: string;
  audience: 'ALL_STUDENTS' | 'ALL_TEACHERS' | 'TEACHER_STUDENTS';
  senderUserId?: string;
  senderRole?: string;
  recipientUserIds: string[];
}

const announcementService = {
  broadcast: async (req: BroadcastRequest): Promise<Announcement> => {
    const response = await api.post('/notifications/announcements', req);
    return normAnnouncement(unwrap(response));
  },

  list: async (page = 0, size = 20): Promise<Announcement[]> => {
    const response = await api.get('/notifications/announcements', { params: { page, size } });
    return toArray(unwrap(response)).map(normAnnouncement);
  },

  getPermissions: async (): Promise<TeacherBroadcastPermission[]> => {
    const response = await api.get('/notifications/announcements/permissions');
    return toArray(unwrap(response)).map(normPermission);
  },

  getPermission: async (teacherId: string): Promise<TeacherBroadcastPermission> => {
    const response = await api.get(`/notifications/announcements/permissions/${teacherId}`);
    return normPermission(unwrap(response));
  },

  setPermission: async (teacherId: string, canBroadcast: boolean): Promise<TeacherBroadcastPermission> => {
    const response = await api.put(`/notifications/announcements/permissions/${teacherId}`, { canBroadcast });
    return normPermission(unwrap(response));
  },
};

export default announcementService;
