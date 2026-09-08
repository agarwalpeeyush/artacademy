import api from './api';
import { Schedule, RoomAvailability, ScheduleConflict, ScheduleVersion, UpcomingClass } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const norm = (s: any): Schedule => ({
  id: s.id,
  classId: s.classId,
  className: s.className ?? '',
  teacherId: s.teacherId,
  teacherName: s.teacherName ?? '',
  roomId: s.roomId,
  roomName: s.roomName ?? '',
  startTime: s.startTime,
  endTime: s.endTime,
  dayOfWeek: s.dayOfWeek,
  courseName: s.courseName ?? '',
  active: s.active ?? true,
  status: s.status,
  publishedAt: s.publishedAt,
});

const scheduleService = {
  getAll: async (): Promise<Schedule[]> => {
    const response = await api.get('/schedules');
    return toArray(unwrap(response)).map(norm);
  },

  getById: async (id: string): Promise<Schedule> => {
    const response = await api.get(`/schedules/${id}`);
    return norm(unwrap(response));
  },

  getByTeacher: async (teacherId: string): Promise<Schedule[]> => {
    const response = await api.get(`/schedules/teacher/${teacherId}`);
    return toArray(unwrap(response)).map(norm);
  },

  getByStudent: async (studentId: string): Promise<Schedule[]> => {
    // First get student's enrolled class IDs
    const enrollRes = await api.get(`/enrollments/student/${studentId}`);
    const enrollments = toArray(enrollRes.data?.data ?? enrollRes.data);
    const classIds = enrollments.map((e: any) => e.classId).filter(Boolean);
    if (classIds.length === 0) return [];
    const response = await api.get(`/schedules/student/${studentId}?classIds=${classIds.join(',')}`);
    return toArray(unwrap(response)).map(norm);
  },

  getByClass: async (classId: string): Promise<Schedule[]> => {
    const response = await api.get(`/schedules/class/${classId}`);
    return toArray(unwrap(response)).map(norm);
  },

  create: async (data: { classId: string; teacherId: string; roomId: string; startTime: string; endTime: string; dayOfWeek: string }): Promise<Schedule> => {
    const response = await api.post('/schedules', data);
    return norm(unwrap(response));
  },

  update: async (id: string, data: { classId?: string; teacherId?: string; roomId?: string; startTime?: string; endTime?: string; dayOfWeek?: string }): Promise<Schedule> => {
    const response = await api.put(`/schedules/${id}`, data);
    return norm(unwrap(response));
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/schedules/${id}`);
  },

  generateTimetable: async (data: { classId?: string; teacherId?: string }) => {
    const response = await api.post('/schedules/generate', data);
    return response.data;
  },

  publishAll: async (): Promise<ScheduleVersion> => {
    const response = await api.post('/schedules/publish');
    return unwrap(response) as ScheduleVersion;
  },

  publish: async (id: string): Promise<Schedule> => {
    const response = await api.post(`/schedules/${id}/publish`);
    return norm(unwrap(response));
  },

  unpublish: async (id: string): Promise<Schedule> => {
    const response = await api.post(`/schedules/${id}/unpublish`);
    return norm(unwrap(response));
  },

  getConflicts: async (): Promise<ScheduleConflict[]> => {
    const response = await api.get('/schedules/conflicts');
    return toArray(unwrap(response)) as ScheduleConflict[];
  },

  getRoomAvailability: async (roomId: string, date: string): Promise<RoomAvailability> => {
    const response = await api.get(`/rooms/${roomId}/availability?date=${date}`);
    return unwrap(response) as RoomAvailability;
  },

  getHistory: async (): Promise<ScheduleVersion[]> => {
    const response = await api.get('/schedules/history');
    return toArray(unwrap(response)) as ScheduleVersion[];
  },

  getHistoryVersion: async (versionId: string): Promise<ScheduleVersion> => {
    const response = await api.get(`/schedules/history/${versionId}`);
    return unwrap(response) as ScheduleVersion;
  },

  getUpcoming: async (classIds: string[], limit = 10): Promise<UpcomingClass[]> => {
    if (!classIds || classIds.length === 0) return [];
    const response = await api.get(`/schedules/upcoming?classIds=${classIds.join(',')}&limit=${limit}`);
    return toArray(unwrap(response)) as UpcomingClass[];
  },

  getUpcomingForStudent: async (studentId: string, limit = 10): Promise<UpcomingClass[]> => {
    const enrollRes = await api.get(`/enrollments/student/${studentId}`);
    const enrollments = toArray(enrollRes.data?.data ?? enrollRes.data);
    const classIds = enrollments.map((e: any) => e.classId).filter(Boolean);
    if (classIds.length === 0) return [];
    return scheduleService.getUpcoming(classIds, limit);
  },
};

export default scheduleService;
