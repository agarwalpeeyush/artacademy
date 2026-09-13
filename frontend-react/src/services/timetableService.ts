import api from './api';
import { Timetable, TimetableConflict, UpcomingClass } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const norm = (s: any): Timetable => ({
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
});

const timetableService = {
  getAll: async (): Promise<Timetable[]> => {
    const response = await api.get('/timetables');
    return toArray(unwrap(response)).map(norm);
  },

  getById: async (id: string): Promise<Timetable> => {
    const response = await api.get(`/timetables/${id}`);
    return norm(unwrap(response));
  },

  getByTeacher: async (teacherId: string): Promise<Timetable[]> => {
    const response = await api.get(`/timetables/teacher/${teacherId}`);
    return toArray(unwrap(response)).map(norm);
  },

  getByStudent: async (studentId: string): Promise<Timetable[]> => {
    // First get student's enrolled class IDs
    const enrollRes = await api.get(`/enrollments/student/${studentId}`);
    const enrollments = toArray(enrollRes.data?.data ?? enrollRes.data);
    const classIds = enrollments.map((e: any) => e.classId).filter(Boolean);
    if (classIds.length === 0) return [];
    const response = await api.get(`/timetables/student/${studentId}?classIds=${classIds.join(',')}`);
    return toArray(unwrap(response)).map(norm);
  },

  getByClass: async (classId: string): Promise<Timetable[]> => {
    const response = await api.get(`/timetables/class/${classId}`);
    return toArray(unwrap(response)).map(norm);
  },

  create: async (data: { classId: string; teacherId: string; roomId: string; startTime: string; endTime: string; dayOfWeek: string }): Promise<Timetable> => {
    const response = await api.post('/timetables', data);
    return norm(unwrap(response));
  },

  update: async (id: string, data: { classId?: string; teacherId?: string; roomId?: string; startTime?: string; endTime?: string; dayOfWeek?: string }): Promise<Timetable> => {
    const response = await api.put(`/timetables/${id}`, data);
    return norm(unwrap(response));
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/timetables/${id}`);
  },

  generateTimetable: async (data: {
    items: { classId: string; teacherId: string; preferredDayOfWeek: string; durationMinutes: number }[];
  }) => {
    const response = await api.post('/timetables/generate', data);
    return response.data;
  },

  getConflicts: async (): Promise<TimetableConflict[]> => {
    const response = await api.get('/timetables/conflicts');
    return toArray(unwrap(response)) as TimetableConflict[];
  },

  getUpcoming: async (classIds: string[], limit = 10): Promise<UpcomingClass[]> => {
    if (!classIds || classIds.length === 0) return [];
    const response = await api.get(`/timetables/upcoming?classIds=${classIds.join(',')}&limit=${limit}`);
    return toArray(unwrap(response)) as UpcomingClass[];
  },

  getUpcomingForStudent: async (studentId: string, limit = 10): Promise<UpcomingClass[]> => {
    const enrollRes = await api.get(`/enrollments/student/${studentId}`);
    const enrollments = toArray(enrollRes.data?.data ?? enrollRes.data);
    const classIds = enrollments.map((e: any) => e.classId).filter(Boolean);
    if (classIds.length === 0) return [];
    return timetableService.getUpcoming(classIds, limit);
  },
};

export default timetableService;
