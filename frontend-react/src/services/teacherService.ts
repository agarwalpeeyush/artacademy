import api from './api';
import { Teacher } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;

const norm = (t: any): Teacher => ({
  id: t.id,
  loginId: t.loginId ?? '',
  firstName: t.firstName ?? '',
  lastName: t.lastName ?? '',
  employeeCode: t.employeeCode ?? '',
  email: t.email ?? '',
  phone: t.phone ?? '',
  qualification: t.qualification ?? '',
  joiningDate: t.joiningDate ?? '',
  status: t.status ?? 'ACTIVE',
});

const teacherService = {
  getAll: async (): Promise<Teacher[]> => {
    const response = await api.get('/teachers');
    const data = unwrap(response);
    const arr = Array.isArray(data) ? data : data?.content ?? [];
    return arr.map(norm);
  },

  getById: async (id: string): Promise<Teacher> => {
    const response = await api.get(`/teachers/${id}`);
    return norm(unwrap(response));
  },

  create: async (data: Omit<Teacher, 'id'>): Promise<Teacher> => {
    const response = await api.post('/teachers', data);
    return norm(unwrap(response));
  },

  update: async (id: string, data: Partial<Teacher>): Promise<Teacher> => {
    const response = await api.put(`/teachers/${id}`, data);
    return norm(unwrap(response));
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/teachers/${id}`);
  },

  getSchedule: async (teacherId: string) => {
    const response = await api.get(`/scheduling/teachers/${teacherId}/schedule`);
    return response.data;
  },

  getAttendanceStats: async (teacherId: string) => {
    const response = await api.get(`/attendance/teachers/${teacherId}/stats`);
    return response.data;
  },
};

export default teacherService;
