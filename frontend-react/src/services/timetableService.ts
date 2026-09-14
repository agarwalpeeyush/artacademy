import api from './api';
import { Timetable, TimetableConflict, UpcomingClass } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const norm = (s: any): Timetable => ({
  id: s.id,
  courseId: s.courseId,
  teacherId: s.teacherId,
  teacherName: s.teacherName ?? '',
  startTime: s.startTime,
  endTime: s.endTime,
  dayOfWeek: s.dayOfWeek,
  courseName: s.courseName ?? '',
  active: s.active ?? true,
  // Deprecated Class-model fields, retained until Step 5-7 rewrites.
  classId: s.classId ?? '',
  className: s.className ?? '',
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
    // First get the student's enrolled course IDs
    const enrollRes = await api.get(`/enrollments/student/${studentId}`);
    const enrollments = toArray(enrollRes.data?.data ?? enrollRes.data);
    const courseIds = enrollments.map((e: any) => e.courseId).filter(Boolean);
    if (courseIds.length === 0) return [];
    const response = await api.get(`/timetables/student/${studentId}?courseIds=${courseIds.join(',')}`);
    return toArray(unwrap(response)).map(norm);
  },

  getByCourse: async (courseId: string): Promise<Timetable[]> => {
    const response = await api.get(`/timetables/course/${courseId}`);
    return toArray(unwrap(response)).map(norm);
  },

  create: async (data: { courseId: string; teacherId: string; startTime: string; endTime: string; dayOfWeek: string }): Promise<Timetable> => {
    const response = await api.post('/timetables', data);
    return norm(unwrap(response));
  },

  update: async (id: string, data: { courseId?: string; teacherId?: string; startTime?: string; endTime?: string; dayOfWeek?: string }): Promise<Timetable> => {
    const response = await api.put(`/timetables/${id}`, data);
    return norm(unwrap(response));
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/timetables/${id}`);
  },

  getConflicts: async (): Promise<TimetableConflict[]> => {
    const response = await api.get('/timetables/conflicts');
    return toArray(unwrap(response)) as TimetableConflict[];
  },

  getUpcoming: async (courseIds: string[], limit = 10): Promise<UpcomingClass[]> => {
    if (!courseIds || courseIds.length === 0) return [];
    const response = await api.get(`/timetables/upcoming?courseIds=${courseIds.join(',')}&limit=${limit}`);
    return toArray(unwrap(response)) as UpcomingClass[];
  },

  getUpcomingForStudent: async (studentId: string, limit = 10): Promise<UpcomingClass[]> => {
    const enrollRes = await api.get(`/enrollments/student/${studentId}`);
    const enrollments = toArray(enrollRes.data?.data ?? enrollRes.data);
    const courseIds = enrollments.map((e: any) => e.courseId).filter(Boolean);
    if (courseIds.length === 0) return [];
    return timetableService.getUpcoming(courseIds, limit);
  },
};

export default timetableService;
