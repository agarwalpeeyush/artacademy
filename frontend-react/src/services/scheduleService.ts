import api from './api';
import { Schedule } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const norm = (s: any): Schedule => ({
  id: s.id,
  classId: s.classId,
  className: s.className ?? '',
  teacherId: s.teacherId,
  teacherName: s.teacherName ?? '',
  room: s.roomName ?? s.room ?? '',
  roomName: s.roomName ?? s.room ?? '',
  startTime: s.startTime,
  endTime: s.endTime,
  dayOfWeek: s.dayOfWeek,
  courseName: s.courseName ?? '',
  active: s.active ?? true,
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

  create: async (data: Omit<Schedule, 'id'>): Promise<Schedule> => {
    const response = await api.post('/schedules', data);
    return norm(unwrap(response));
  },

  update: async (id: string, data: Partial<Schedule>): Promise<Schedule> => {
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
};

export default scheduleService;
