import api from './api';
import { RevenueReport, DefaulterStudent, AttendanceReport } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const reportService = {
  getRevenue: async (_year?: number): Promise<RevenueReport[]> => {
    const response = await api.get('/reports/revenue');
    return toArray(unwrap(response));
  },

  getDefaulters: async (): Promise<DefaulterStudent[]> => {
    const response = await api.get('/reports/defaulters');
    return toArray(unwrap(response));
  },

  getAttendanceReport: async (params: {
    startDate?: string;
    endDate?: string;
    type?: 'student' | 'teacher';
    subjectType?: string;
    month?: number;
    year?: number;
  }): Promise<AttendanceReport[]> => {
    const subjectType = params.subjectType ?? (params.type === 'teacher' ? 'TEACHER' : 'STUDENT');
    const response = await api.get('/reports/attendance', {
      params: { subjectType, month: params.month, year: params.year },
    });
    return toArray(unwrap(response));
  },

  getFeeReport: async (month: number, year: number) => {
    const response = await api.get('/reports/fees', { params: { month, year } });
    return unwrap(response);
  },

  getStudentReports: async () => {
    const response = await api.get('/reports/students');
    return unwrap(response);
  },

  getTeacherReports: async () => {
    const response = await api.get('/reports/teachers');
    return toArray(unwrap(response));
  },

  getDashboardStats: async () => {
    const response = await api.get('/reports/students');
    return unwrap(response);
  },
};

export default reportService;
