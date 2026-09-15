import api from './api';
import { FeeCycle, FeeDetail, TeacherRevenueSummary } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;

const normCycle = (c: any): FeeCycle => ({
  id: c.id,
  studentId: c.studentId,
  studentName: c.studentName,
  billingMonth: c.billingMonth,
  billingYear: c.billingYear,
  cycleKind: c.cycleKind ?? 'MONTHLY',
  month: c.billingMonth ?? c.month,
  year: c.billingYear ?? c.year,
  totalAmount: Number(c.totalAmount ?? 0),
  paidAmount: Number(c.paidAmount ?? 0),
  outstandingAmount: Number(c.outstandingAmount ?? c.dueAmount ?? 0),
  dueAmount: Number(c.outstandingAmount ?? c.dueAmount ?? 0),
  dueDate: c.dueDate,
  generatedDate: c.generatedDate,
  status: c.status ?? 'UNPAID',
  overdue: Boolean(c.overdue),
  displayStatus: c.displayStatus ?? c.status ?? 'UNPAID',
  excessAmount: Number(c.excessAmount ?? 0),
  shortAmount: Number(c.shortAmount ?? 0),
});

const normDetail = (d: any): FeeDetail => ({
  id: d.id,
  feeCycleId: d.feeCycleId,
  enrollmentId: d.enrollmentId,
  courseId: d.courseId,
  courseFee: Number(d.courseFee ?? d.amount ?? 0),
  amount: Number(d.courseFee ?? d.amount ?? 0),
  allocatedPaidAmount: Number(d.allocatedPaidAmount ?? 0),
  outstandingAmount: Number(d.outstandingAmount ?? 0),
  status: d.status,
  teacherId: d.teacherId ?? undefined,
  instituteShareAmount: d.instituteShareAmount != null ? Number(d.instituteShareAmount) : undefined,
  teacherShareAmount: d.teacherShareAmount != null ? Number(d.teacherShareAmount) : undefined,
  overridden: Boolean(d.overridden),
});

const normTeacherSummary = (s: any): TeacherRevenueSummary => ({
  teacherId: s.teacherId,
  collected: Number(s.collected ?? 0),
  instituteShare: Number(s.instituteShare ?? 0),
  teacherShare: Number(s.teacherShare ?? 0),
  paidDetailCount: Number(s.paidDetailCount ?? 0),
});

const toArray = (d: any): any[] => {
  if (Array.isArray(d)) return d;
  if (d?.content) return d.content;
  return [];
};

const feeService = {
  getFeeCycles: async (params: { studentId?: string; month?: number; year?: number }): Promise<FeeCycle[]> => {
    const { studentId, ...rest } = params;
    if (studentId) {
      const response = await api.get(`/fees/student/${studentId}`, { params: rest });
      return toArray(unwrap(response)).map(normCycle);
    }
    const response = await api.get('/fees/outstanding', { params: rest });
    return toArray(unwrap(response)).map(normCycle);
  },

  getFeeCycleById: async (id: string): Promise<FeeCycle> => {
    const response = await api.get(`/fees/cycle/${id}`);
    return normCycle(unwrap(response));
  },

  getFeeDetails: async (feeCycleId: string): Promise<FeeDetail[]> => {
    const response = await api.get(`/fees/cycle/${feeCycleId}/details`);
    return toArray(unwrap(response)).map(normDetail);
  },

  getOutstanding: async (): Promise<FeeCycle[]> => {
    const response = await api.get('/fees/defaulters');
    return toArray(unwrap(response)).map(normCycle);
  },

  getStudentOutstanding: async (studentId: string): Promise<FeeCycle[]> => {
    const response = await api.get(`/fees/outstanding/${studentId}`);
    return toArray(unwrap(response)).map(normCycle);
  },

  generateFees: async (month: number, year: number): Promise<FeeCycle[]> => {
    const response = await api.post('/fees/generate', { billingMonth: month, billingYear: year });
    return toArray(unwrap(response)).map(normCycle);
  },

  updateFeeCycle: async (id: string, data: Partial<FeeCycle>): Promise<FeeCycle> => {
    const response = await api.put(`/fees/${id}`, data);
    return normCycle(unwrap(response));
  },

  // F9: per-teacher revenue rollup (principal dashboard).
  getTeacherSummaries: async (): Promise<TeacherRevenueSummary[]> => {
    const response = await api.get('/fees/teachers/summary');
    return toArray(unwrap(response)).map(normTeacherSummary);
  },

  getTeacherSummary: async (teacherId: string): Promise<TeacherRevenueSummary> => {
    const response = await api.get(`/fees/teacher/${teacherId}/summary`);
    return normTeacherSummary(unwrap(response));
  },

  // F8/F12: principal override of the institute/teacher split on a single detail.
  overrideShare: async (
    feeDetailId: string,
    payload: { instituteShare: number; teacherShare: number; overriddenBy: string }
  ): Promise<FeeDetail> => {
    const response = await api.put(`/fees/fee-details/${feeDetailId}/share-override`, payload);
    return normDetail(unwrap(response));
  },
};

export default feeService;
