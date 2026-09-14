import api from './api';
import {
  StudentAttendance,
  TeacherAttendance,
  AttendanceCorrection,
  AttendanceStats,
  AttendanceStatus,
} from '../types';

const unwrap = (r: any) => r.data?.data ?? r.data;

const normStudentAttendance = (a: any): StudentAttendance => ({
  id: a.id,
  studentId: a.studentId,
  studentName: a.studentName,
  courseId: a.courseId,
  timetableId: a.timetableId,
  date: a.attendanceDate ?? a.date ?? '',
  attendanceDate: a.attendanceDate ?? a.date ?? '',
  status: a.status,
  startTime: a.startTime,
  endTime: a.endTime,
  remarks: a.remarks,
});

const normTeacherAttendance = (a: any): TeacherAttendance => ({
  id: a.id,
  teacherId: a.teacherId,
  teacherName: a.teacherName,
  date: a.attendanceDate ?? a.date ?? '',
  status: a.status,
  checkIn: a.checkIn,
  checkOut: a.checkOut,
  remarks: a.remarks,
});

const normCorrection = (c: any): AttendanceCorrection => ({
  id: c.id,
  attendanceType: c.attendanceType,
  attendanceId: c.attendanceId,
  subjectId: c.subjectId,
  classId: c.classId,
  attendanceDate: c.attendanceDate,
  oldStatus: c.oldStatus,
  newStatus: c.newStatus,
  reason: c.reason,
  editedByUserId: c.editedByUserId,
  editorRole: c.editorRole,
  editedAt: c.editedAt,
});

const toArray = (d: any): any[] => {
  if (Array.isArray(d)) return d;
  if (d?.content) return d.content;
  return [];
};

export interface AttendanceEdit {
  attendanceId: string;
  newStatus: AttendanceStatus;
}

const attendanceService = {
  // ---- Student attendance ----
  getStudentAttendance: async (params: {
    studentId?: string;
    timetableId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StudentAttendance[]> => {
    const response = await api.get('/attendance/students', { params });
    return toArray(unwrap(response)).map(normStudentAttendance);
  },

  // R13/R15 self-view: GET /attendance/students/{studentId}?from&to
  getStudentAttendanceById: async (
    studentId: string,
    from?: string,
    to?: string
  ): Promise<StudentAttendance[]> => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await api.get(`/attendance/students/${studentId}`, { params });
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

  // R10 bulk range: POST /attendance/students/timetable/{timetableId}/bulk-range
  markStudentBulkRange: async (data: {
    timetableId: string;
    courseId: string;
    sessionDates: string[];
    status: AttendanceStatus;
    studentIds: string[];
    startTime?: string;
    endTime?: string;
    remarks?: string;
  }): Promise<StudentAttendance[]> => {
    const { timetableId, status, ...rest } = data;
    const response = await api.post(
      `/attendance/students/timetable/${timetableId}/bulk-range`,
      { ...rest, defaultStatus: status }
    );
    return toArray(unwrap(response)).map(normStudentAttendance);
  },

  getStudentStats: async (studentId: string, courseId?: string): Promise<AttendanceStats> => {
    const params = courseId ? { courseId } : {};
    const response = await api.get(`/attendance/students/${studentId}/stats`, { params });
    return unwrap(response);
  },

  getTimetableAttendanceForDate: async (timetableId: string, date: string): Promise<StudentAttendance[]> => {
    const response = await api.get(`/attendance/students/timetable/${timetableId}/date`, { params: { date } });
    return toArray(unwrap(response)).map(normStudentAttendance);
  },

  // ---- Teacher attendance (per timetable slot, R12) ----
  getTeacherAttendance: async (params: {
    teacherId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TeacherAttendance[]> => {
    const response = await api.get('/attendance/teachers', { params });
    return toArray(unwrap(response)).map(normTeacherAttendance);
  },

  // GET /attendance/teachers/{teacherId}?from&to
  getTeacherAttendanceById: async (
    teacherId: string,
    from?: string,
    to?: string
  ): Promise<TeacherAttendance[]> => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await api.get(`/attendance/teachers/${teacherId}`, { params });
    return toArray(unwrap(response)).map(normTeacherAttendance);
  },

  markTeacherAttendance: async (
    data: Omit<TeacherAttendance, 'id'> & { timetableId: string; courseId: string }
  ): Promise<TeacherAttendance> => {
    const { date, ...rest } = data as Omit<TeacherAttendance, 'id'> & {
      date?: string;
      timetableId: string;
      courseId: string;
    };
    const response = await api.post('/attendance/teachers', { ...rest, attendanceDate: date });
    return normTeacherAttendance(unwrap(response));
  },

  // GET /attendance/teachers/timetable/{timetableId}/date
  getTeacherTimetableAttendanceForDate: async (
    timetableId: string,
    date: string
  ): Promise<TeacherAttendance[]> => {
    const response = await api.get(`/attendance/teachers/timetable/${timetableId}/date`, { params: { date } });
    return toArray(unwrap(response)).map(normTeacherAttendance);
  },

  // POST /attendance/teachers/timetable/{timetableId}/bulk-range
  markTeacherBulkRange: async (data: {
    timetableId: string;
    courseId: string;
    sessionDates: string[];
    status: AttendanceStatus;
    teacherIds: string[];
    remarks?: string;
  }): Promise<TeacherAttendance[]> => {
    const { timetableId, status, ...rest } = data;
    const response = await api.post(
      `/attendance/teachers/timetable/${timetableId}/bulk-range`,
      { ...rest, defaultStatus: status }
    );
    return toArray(unwrap(response)).map(normTeacherAttendance);
  },

  // ---- Corrections (R16 direct bulk edit — no approval workflow) ----
  editStudentAttendance: async (data: {
    editedByUserId: string;
    editorRole: string;
    reason?: string;
    edits: AttendanceEdit[];
  }): Promise<AttendanceCorrection[]> => {
    const response = await api.post('/attendance/corrections/students', data);
    return toArray(unwrap(response)).map(normCorrection);
  },

  editTeacherAttendance: async (data: {
    editedByUserId: string;
    editorRole: string;
    reason?: string;
    edits: AttendanceEdit[];
  }): Promise<AttendanceCorrection[]> => {
    const response = await api.post('/attendance/corrections/teachers', data);
    return toArray(unwrap(response)).map(normCorrection);
  },

  // Audit log for a single attendance record
  getCorrectionsForAttendance: async (attendanceId: string): Promise<AttendanceCorrection[]> => {
    const response = await api.get(`/attendance/corrections/attendance/${attendanceId}`);
    return toArray(unwrap(response)).map(normCorrection);
  },

  // Audit log for a subject (student or teacher)
  getCorrectionsForSubject: async (subjectId: string): Promise<AttendanceCorrection[]> => {
    const response = await api.get(`/attendance/corrections/subject/${subjectId}`);
    return toArray(unwrap(response)).map(normCorrection);
  },
};

export default attendanceService;
