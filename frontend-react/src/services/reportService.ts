import api from './api';
import { RevenueReport, DefaulterStudent, AttendanceReport, AttendanceException, CourseAttendanceSummary } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;
const toArray = (d: any): any[] => (Array.isArray(d) ? d : d?.content ?? []);

const normAttendanceReport = (r: any): AttendanceReport => {
  const total = r.totalDays ?? r.totalClasses ?? 0;
  const present = r.presentDays ?? r.presentCount ?? 0;
  const pct = r.attendancePercentage ?? (total > 0 ? (present / total) * 100 : 0);
  const isTeacher = String(r.subjectType).toUpperCase() === 'TEACHER';
  return {
    studentId: isTeacher ? undefined : r.subjectId,
    teacherId: isTeacher ? r.subjectId : undefined,
    name: r.subjectName ?? r.name ?? '',
    totalClasses: total,
    presentCount: present,
    absentCount: r.absentDays ?? r.absentCount ?? 0,
    lateCount: 0,
    attendancePercentage: pct,
  };
};

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
    const query: Record<string, unknown> = { subjectType };
    if (params.startDate && params.endDate) {
      query.startDate = params.startDate;
      query.endDate = params.endDate;
    } else {
      query.month = params.month;
      query.year = params.year;
    }
    const response = await api.get('/reports/attendance', { params: query });
    return toArray(unwrap(response)).map(normAttendanceReport);
  },

  getFeeReport: async (month: number, year: number) => {
    const response = await api.get('/reports/fees', { params: { month, year } });
    return unwrap(response);
  },

  getAttendanceExceptions: async (params: {
    threshold?: number;
    type?: string;
    month?: number;
    year?: number;
  }): Promise<AttendanceException[]> => {
    const response = await api.get('/reports/attendance/exceptions', {
      params: { threshold: params.threshold, type: params.type, month: params.month, year: params.year },
    });
    return toArray(unwrap(response));
  },

  getMonthlyCourseSummary: async (params: { month: number; year: number }): Promise<CourseAttendanceSummary[]> => {
    const response = await api.get('/reports/attendance/monthly', {
      params: { month: params.month, year: params.year },
    });
    return toArray(unwrap(response));
  },

  exportAttendanceCsv: async (params: {
    subjectType: string;
    month?: number;
    year?: number;
  }): Promise<Blob> => {
    const response = await api.get('/reports/attendance/export', {
      params: { subjectType: params.subjectType, month: params.month, year: params.year },
      responseType: 'blob',
    });
    return response.data as Blob;
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
