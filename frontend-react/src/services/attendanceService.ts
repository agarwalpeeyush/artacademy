import api from './api';
import { StudentAttendance, TeacherAttendance } from '../types';

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
    const response = await api.post('/attendance/students/bulk', data);
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
    return toArray(unwrap(response));
  },

  markTeacherAttendance: async (data: Omit<TeacherAttendance, 'id'>): Promise<TeacherAttendance> => {
    const response = await api.post('/attendance/teachers', data);
    return unwrap(response);
  },

  getStudentStats: async (studentId: string, classId?: string) => {
    const params = classId ? { classId } : {};
    const response = await api.get(`/attendance/students/${studentId}/stats`, { params });
    return unwrap(response);
  },

  getClassAttendanceForDate: async (classId: string, date: string): Promise<StudentAttendance[]> => {
    const response = await api.get(`/attendance/class/${classId}/date`, { params: { date } });
    return toArray(unwrap(response)).map(normStudentAttendance);
  },
};

export default attendanceService;
