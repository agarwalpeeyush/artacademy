import api from './api';
import { RevenueReport, DefaulterStudent } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const normRevenue = (r: any): RevenueReport => {
  const totalRevenue = Number(r.totalRevenue ?? r.totalBilled ?? 0);
  const collectedAmount = Number(r.collectedAmount ?? r.totalCollected ?? 0);
  return {
    month: r.month ?? r.billingMonth ?? 0,
    year: r.year ?? r.billingYear ?? 0,
    totalRevenue,
    collectedAmount,
    pendingAmount: Number(r.pendingAmount ?? r.outstanding ?? (totalRevenue - collectedAmount)),
    totalStudents: r.totalStudents ?? r.studentCount ?? 0,
    paidStudents: r.paidStudents ?? 0,
  };
};

const reportService = {
  getRevenue: async (_year?: number): Promise<RevenueReport[]> => {
    const response = await api.get('/reports/revenue');
    return toArray(unwrap(response)).map(normRevenue);
  },

  getDefaulters: async (): Promise<DefaulterStudent[]> => {
    const response = await api.get('/reports/defaulters');
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
