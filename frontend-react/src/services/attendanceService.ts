import api from './api';
import { StudentAttendance, TeacherAttendance, AttendanceCorrection, AttendanceStats } from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;

const normStudentAttendance = (a: any): StudentAttendance => ({
  id: a.id,
  studentId: a.studentId,
  classId: a.classId,
  date: a.attendanceDate ?? a.date ?? '',
  attendanceDate: a.attendanceDate ?? a.date ?? '',
  status: a.status,
  remarks: a.remarks,
});

const normTeacherAttendance = (a: any): TeacherAttendance => ({
  id: a.id,
  teacherId: a.teacherId,
  date: a.attendanceDate ?? a.date ?? '',
  status: a.status,
  remarks: a.remarks,
});

const toArray = (d: any): any[] => {
  if (Array.isArray(d)) return d;
  if (d?.content) return d.content;
  return [];
};

const attendanceService = {
  getStudentAttendance: async (params: {
    studentId?: string;
    classId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StudentAttendance[]> => {
    const response = await api.get('/attendance/students', { params });
    return toArray(unwrap(response)).map(normStudentAttendance);
  },

  markStudentAttendance: async (data: StudentAttendance[]): Promise<StudentAttendance[]> => {
    const payload = data.map(({ id, ...rest }) => ({
      ...rest,
      attendanceDate: rest.attendanceDate ?? rest.date,
    }));
    const response = await api.post('/attendance/students/bulk', payload);
    return toArray(unwrap(response)).map(normStudentAttendance);
  },

  updateStudentAttendance: async (id: string, data: Partial<StudentAttendance>): Promise<StudentAttendance> => {
    const response = await api.put(`/attendance/students/${id}`, data);
    return normStudentAttendance(unwrap(response));
  },

  getTeacherAttendance: async (params: {
    teacherId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TeacherAttendance[]> => {
    const response = await api.get('/attendance/teachers', { params });
    return toArray(unwrap(response)).map(normTeacherAttendance);
  },

  markTeacherAttendance: async (data: Omit<TeacherAttendance, 'id'>): Promise<TeacherAttendance> => {
    const { date, ...rest } = data as Omit<TeacherAttendance, 'id'> & { date?: string };
    const response = await api.post('/attendance/teachers', { ...rest, attendanceDate: date });
    return normTeacherAttendance(unwrap(response));
  },

  getStudentStats: async (studentId: string, classId?: string): Promise<AttendanceStats> => {
    const params = classId ? { classId } : {};
    const response = await api.get(`/attendance/students/${studentId}/stats`, { params });
    return unwrap(response);
  },

  getClassAttendanceForDate: async (classId: string, date: string): Promise<StudentAttendance[]> => {
    const response = await api.get(`/attendance/students/class/${classId}/date`, { params: { date } });
    return toArray(unwrap(response)).map(normStudentAttendance);
  },

  submitCorrection: async (data: {
    studentAttendanceId: string;
    requestedStatus: string;
    reason?: string;
    requestedByTeacherId: string;
  }): Promise<AttendanceCorrection> => {
    const response = await api.post('/attendance/corrections', data);
    return unwrap(response);
  },

  getCorrections: async (params: { status?: string }): Promise<AttendanceCorrection[]> => {
    const response = await api.get('/attendance/corrections', { params });
    return toArray(unwrap(response));
  },

  getTeacherCorrections: async (teacherId: string): Promise<AttendanceCorrection[]> => {
    const response = await api.get(`/attendance/corrections/teacher/${teacherId}`);
    return toArray(unwrap(response));
  },

  approveCorrection: async (id: string, reviewedByPrincipalId: string, reviewNote?: string): Promise<AttendanceCorrection> => {
    const response = await api.patch(`/attendance/corrections/${id}/approve`, { reviewedByPrincipalId, reviewNote });
    return unwrap(response);
  },

  rejectCorrection: async (id: string, reviewedByPrincipalId: string, reviewNote?: string): Promise<AttendanceCorrection> => {
    const response = await api.patch(`/attendance/corrections/${id}/reject`, { reviewedByPrincipalId, reviewNote });
    return unwrap(response);
  },
};

export default attendanceService;
