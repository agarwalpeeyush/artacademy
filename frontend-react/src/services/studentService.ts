import api from './api';
import { Student } from '../types';

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
  guardianName: s.guardianName ?? '',
  guardianPhone: s.guardianPhone ?? '',
  email: s.email ?? '',
  address: s.address ?? '',
  enrollmentDate: s.enrollmentDate ?? '',
  status: s.status ?? 'ACTIVE',
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
    const response = await api.get(`/students/class/${classId}`);
    const data = unwrap(response);
    const arr = Array.isArray(data) ? data : data?.content ?? [];
    return arr.map(norm);
  },
};

export default studentService;
