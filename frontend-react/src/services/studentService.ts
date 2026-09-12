import api from './api';
import { Student } from '../types';
import enrollmentService from './enrollmentService';

const unwrap = (r: any) => r.data?.data ?? r.data;

const norm = (s: any): Student => ({
  id: s.id,
  loginId: s.loginId ?? '',
  firstName: s.firstName ?? '',
  lastName: s.lastName ?? '',
  dob: s.dob ?? '',
  fatherName: s.fatherName ?? '',
  fatherPhone: s.fatherPhone ?? '',
  motherName: s.motherName ?? '',
  motherPhone: s.motherPhone ?? '',
  email: s.email ?? '',
  address: s.address ?? '',
  enrollmentDate: s.enrollmentDate ?? '',
  status: s.status ?? 'ACTIVE',
  parents: Array.isArray(s.parents) ? s.parents : [],
});

const studentService = {
  getAll: async (): Promise<Student[]> => {
    const response = await api.get('/students');
    const data = unwrap(response);
    const arr = Array.isArray(data) ? data : data?.content ?? [];
    return arr.map(norm);
  },

  getById: async (id: string): Promise<Student> => {
    const response = await api.get(`/students/${id}`);
    return norm(unwrap(response));
  },

  getMyProfile: async (): Promise<Student> => {
    const response = await api.get('/students/me');
    return norm(unwrap(response));
  },

  updateMyProfile: async (data: Partial<Student>): Promise<Student> => {
    const response = await api.put('/students/me', data);
    return norm(unwrap(response));
  },

  create: async (data: Omit<Student, 'id'>): Promise<Student> => {
    const response = await api.post('/students', data);
    return norm(unwrap(response));
  },

  update: async (id: string, data: Partial<Student>): Promise<Student> => {
    const response = await api.put(`/students/${id}`, data);
    return norm(unwrap(response));
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}`);
  },

  getByClass: async (classId: string): Promise<Student[]> => {
    const enrollments = await enrollmentService.getByClass(classId);
    const enrolledIds = new Set(
      enrollments.filter(e => e.status === 'ACTIVE').map(e => e.studentId),
    );
    if (enrolledIds.size === 0) return [];
    const students = await studentService.getAll();
    return students.filter(s => enrolledIds.has(s.id));
  },
};

export default studentService;
