import api from './api';
import { Enrollment } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const norm = (e: any): Enrollment => ({
  id: e.id,
  studentId: e.studentId,
  courseId: e.courseId,
  classId: e.classId,
  courseName: e.courseName ?? '',
  className: e.className ?? '',
  enrollmentDate: e.enrollmentDate,
  status: e.status,
  admissionFeePaid: e.admissionFeePaid ?? false,
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

  getByClass: async (classId: string): Promise<Enrollment[]> => {
    const response = await api.get(`/enrollments/class/${classId}`);
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

  delete: async (id: string): Promise<void> => {
    await api.delete(`/enrollments/${id}`);
  },
};

export default enrollmentService;
