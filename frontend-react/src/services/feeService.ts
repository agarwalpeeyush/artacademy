import api from './api';
import {
  FeeBill,
  FeeDetailLine,
  FeeGenerateResponse,
  ScopedStudent,
  TeacherRevenueSummary,
} from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;

const toArray = (d: any): any[] => {
  if (Array.isArray(d)) return d;
  if (d?.content) return d.content;
  return [];
};

const normScopedStudent = (s: any): ScopedStudent => ({
  studentId: s.studentId,
  enrollmentId: s.enrollmentId,
  courseId: s.courseId ?? undefined,
  teacherId: s.teacherId ?? undefined,
  studentName: s.studentName ?? undefined,
  courseName: s.courseName ?? undefined,
});

const normDetail = (d: any): FeeDetailLine => ({
  id: d.id,
  enrollmentId: d.enrollmentId,
  feeType: d.feeType,
  amount: Number(d.amount ?? 0),
  cadence: d.cadence ?? undefined,
  dueDate: d.dueDate ?? null,
  instituteShareType: d.instituteShareType ?? null,
  instituteShareValue: d.instituteShareValue != null ? Number(d.instituteShareValue) : null,
});

const normBill = (b: any): FeeBill => ({
  id: b.id,
  enrollmentId: b.enrollmentId,
  studentId: b.studentId,
  billingMonth: b.billingMonth ?? undefined,
  billingYear: b.billingYear ?? undefined,
  feeType: b.feeType,
  cadence: b.cadence ?? undefined,
  amountDue: Number(b.amountDue ?? 0),
  paidAmount: Number(b.paidAmount ?? 0),
  outstandingAmount: Number(b.outstandingAmount ?? 0),
  status: b.status ?? 'UNPAID',
  generatedDate: b.generatedDate,
  dueDate: b.dueDate,
  paymentDate: b.paymentDate ?? undefined,
  outstandingBill: Boolean(b.outstandingBill),
  teacherId: b.teacherId ?? undefined,
  instituteShareAmount: b.instituteShareAmount != null ? Number(b.instituteShareAmount) : undefined,
  teacherShareAmount: b.teacherShareAmount != null ? Number(b.teacherShareAmount) : undefined,
  overridden: Boolean(b.overridden),
  overdue: Boolean(b.overdue),
  displayStatus: b.displayStatus ?? b.status ?? 'UNPAID',
  excessAmount: Number(b.excessAmount ?? 0),
  shortAmount: Number(b.shortAmount ?? 0),
});

const normGenerate = (g: any): FeeGenerateResponse => ({
  generated: toArray(g?.generated).map(normBill),
  alreadyBilled: Array.isArray(g?.alreadyBilled) ? g.alreadyBilled : [],
  missingMonths: Array.isArray(g?.missingMonths) ? g.missingMonths : [],
});

const normTeacherSummary = (s: any): TeacherRevenueSummary => ({
  teacherId: s.teacherId,
  teacherName: s.teacherName ?? undefined,
  collected: Number(s.collected ?? 0),
  instituteShare: Number(s.instituteShare ?? 0),
  teacherShare: Number(s.teacherShare ?? 0),
  paidDetailCount: Number(s.paidDetailCount ?? 0),
});

const feeService = {
  // Scoped, name-resolved student picker (optionally filtered to a teacher).
  getStudents: async (teacherId?: string): Promise<ScopedStudent[]> => {
    const response = await api.get('/fees/students', { params: teacherId ? { teacherId } : {} });
    return toArray(unwrap(response)).map(normScopedStudent);
  },

  // Editable fee catalogue lines for an enrollment.
  getDetails: async (enrollmentId: string): Promise<FeeDetailLine[]> => {
    const response = await api.get(`/fees/detail/enrollment/${enrollmentId}`);
    return toArray(unwrap(response)).map(normDetail);
  },

  updateDetail: async (
    id: string,
    payload: { amount: number; dueDate?: string | null; instituteShareType?: string | null; instituteShareValue?: number | null }
  ): Promise<FeeDetailLine> => {
    const response = await api.put(`/fees/detail/${id}`, payload);
    return normDetail(unwrap(response));
  },

  // Generate bills for an enrollment (current month + optional missing back-fill).
  generate: async (enrollmentId: string, generateMissing: boolean): Promise<FeeGenerateResponse> => {
    const response = await api.post(`/fees/generate/${enrollmentId}`, null, { params: { generateMissing } });
    return normGenerate(unwrap(response));
  },

  // Batch-bill the EXAM cohort of a course (principal only).
  generateExam: async (courseId: string): Promise<FeeBill[]> => {
    const response = await api.post('/fees/generate/exam', null, { params: { courseId } });
    return toArray(unwrap(response)).map(normBill);
  },

  getBills: async (studentId: string): Promise<FeeBill[]> => {
    const response = await api.get(`/fees/bills/student/${studentId}`);
    return toArray(unwrap(response)).map(normBill);
  },

  updateBill: async (
    id: string,
    payload: {
      amountDue?: number;
      dueDate?: string | null;
      status?: string;
      instituteShare?: number | null;
      teacherShare?: number | null;
      overriddenBy?: string | null;
    }
  ): Promise<FeeBill> => {
    const response = await api.put(`/fees/bill/${id}`, payload);
    return normBill(unwrap(response));
  },

  getTeacherSummaries: async (): Promise<TeacherRevenueSummary[]> => {
    const response = await api.get('/fees/teachers/summary');
    return toArray(unwrap(response)).map(normTeacherSummary);
  },

  getTeacherSummary: async (teacherId: string): Promise<TeacherRevenueSummary> => {
    const response = await api.get(`/fees/teacher/${teacherId}/summary`);
    return normTeacherSummary(unwrap(response));
  },
};

export default feeService;
