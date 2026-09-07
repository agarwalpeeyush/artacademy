import api from './api';
import { RevenueReport, DefaulterStudent, AttendanceReport } from '../types';

const reportService = {
  getRevenue: async (year: number): Promise<RevenueReport[]> => {
    const response = await api.get<RevenueReport[]>('/api/reporting/revenue', { params: { year } });
    return response.data;
  },

  getRevenueByMonth: async (month: number, year: number): Promise<RevenueReport> => {
    const response = await api.get<RevenueReport>('/api/reporting/revenue/monthly', { params: { month, year } });
    return response.data;
  },

  getDefaulters: async (): Promise<DefaulterStudent[]> => {
    const response = await api.get<DefaulterStudent[]>('/api/reporting/defaulters');
    return response.data;
  },

  getAttendanceReport: async (params: {
    startDate: string;
    endDate: string;
    type?: 'student' | 'teacher';
  }): Promise<AttendanceReport[]> => {
    const response = await api.get<AttendanceReport[]>('/api/reporting/attendance', { params });
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/api/reporting/dashboard');
    return response.data;
  },

  getAnalytics: async (year: number) => {
    const response = await api.get('/api/reporting/analytics', { params: { year } });
    return response.data;
  },
};

export default reportService;
