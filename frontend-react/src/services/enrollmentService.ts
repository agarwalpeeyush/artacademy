import api from './api';
import { Enrollment, CourseFeeItem, Timetable } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const normTimetable = (t: any): Timetable => ({
  id: t.id,
  courseId: t.courseId,
  teacherId: t.teacherId,
  teacherName: t.teacherName ?? '',
  courseName: t.courseName ?? '',
  dayOfWeek: t.dayOfWeek,
  startTime: t.startTime,
  endTime: t.endTime,
  active: t.active ?? true,
  classId: t.classId ?? '',
  className: t.className ?? '',
});

const norm = (e: any): Enrollment => ({
  id: e.id,
  studentId: e.studentId,
  studentName: e.studentName ?? '',
  courseId: e.courseId,
  courseName: e.courseName ?? '',
  teacherId: e.teacherId ?? undefined,
  teacherName: e.teacherName ?? '',
  enrollmentDate: e.enrollmentDate,
  status: e.status,
  fees: (e.fees ?? []).map((f: any) => ({
    id: f.id,
    feeType: f.feeType,
    amount: Number(f.amount),
    cadence: f.cadence,
    instituteShareType: f.instituteShareType ?? null,
    instituteShareValue: f.instituteShareValue != null ? Number(f.instituteShareValue) : null,
    dueDate: f.dueDate ?? null,
  })),
  timetables: (e.timetables ?? []).map(normTimetable),
  timetableIds: (e.timetables ?? []).map((t: any) => t.id),
});

const enrollmentService = {
  getAll: async (): Promise<Enrollment[]> => {
    const response = await api.get('/enrollments');
    return toArray(unwrap(response)).map(norm);
  },

  getById: async (id: string): Promise<Enrollment> => {
    const response = await api.get(`/enrollments/${id}`);
    return norm(unwrap(response));
  },

  getByStudent: async (studentId: string): Promise<Enrollment[]> => {
    const response = await api.get(`/enrollments/student/${studentId}`);
    return toArray(unwrap(response)).map(norm);
  },

  getByCourse: async (courseId: string): Promise<Enrollment[]> => {
    const response = await api.get(`/enrollments/course/${courseId}`);
    return toArray(unwrap(response)).map(norm);
  },

  // R10: the ACTIVE roster assigned to a timetable slot (base roster for attendance marking).
  getByTimetable: async (timetableId: string): Promise<Enrollment[]> => {
    const response = await api.get(`/enrollments/timetable/${timetableId}`);
    return toArray(unwrap(response)).map(norm);
  },

  create: async (data: Omit<Enrollment, 'id'>): Promise<Enrollment> => {
    const response = await api.post('/enrollments', data);
    return norm(unwrap(response));
  },

  updateStatus: async (id: string, status: string): Promise<Enrollment> => {
    const response = await api.put(`/enrollments/${id}/status`, { status });
    return norm(unwrap(response));
  },

  updateFees: async (id: string, fees: CourseFeeItem[]): Promise<Enrollment> => {
    const response = await api.put(`/enrollments/${id}/fees`, { fees });
    return norm(unwrap(response));
  },

  updateTimetables: async (id: string, timetableIds: string[]): Promise<Enrollment> => {
    const response = await api.put(`/enrollments/${id}/timetables`, { timetableIds });
    return norm(unwrap(response));
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/enrollments/${id}`);
  },
};

export default enrollmentService;
