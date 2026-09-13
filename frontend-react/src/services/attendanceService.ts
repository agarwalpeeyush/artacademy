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
  classId: a.classId,
  courseId: a.courseId,
  sessionId: a.sessionId,
  date: a.attendanceDate ?? a.date ?? '',
  attendanceDate: a.attendanceDate ?? a.date ?? '',
  status: a.status,
  remarks: a.remarks,
  sessionKind: a.sessionKind ?? 'REGULAR',
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

export interface CoverUpStudentEntry {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

const attendanceService = {
  // ---- Student attendance ----
  getStudentAttendance: async (params: {
    studentId?: string;
    classId?: string;
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

  // R9 bulk range: POST /attendance/students/class/{classId}/bulk-range
  markStudentBulkRange: async (data: {
    classId: string;
    courseId?: string;
    fromDate: string;
    toDate: string;
    status: AttendanceStatus;
    studentIds?: string[];
  }): Promise<StudentAttendance[]> => {
    const response = await api.post(
      `/attendance/students/class/${data.classId}/bulk-range`,
      data
    );
    return toArray(unwrap(response)).map(normStudentAttendance);
  },

  // R18 cover-up / extra class: POST /attendance/students/cover-up
  markCoverUp: async (data: {
    classId: string;
    courseId?: string;
    sessionDate: string;
    startTime?: string;
    endTime?: string;
    originalSessionId?: string;
    students: CoverUpStudentEntry[];
  }): Promise<StudentAttendance[]> => {
    const response = await api.post('/attendance/students/cover-up', data);
    return toArray(unwrap(response)).map(normStudentAttendance);
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

  // ---- Teacher attendance (per class, R11) ----
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
    data: Omit<TeacherAttendance, 'id'> & { classId: string; courseId?: string }
  ): Promise<TeacherAttendance> => {
    const { date, ...rest } = data as Omit<TeacherAttendance, 'id'> & {
      date?: string;
      classId: string;
      courseId?: string;
    };
    const response = await api.post('/attendance/teachers', { ...rest, attendanceDate: date });
    return normTeacherAttendance(unwrap(response));
  },

  // GET /attendance/teachers/class/{classId}/date
  getTeacherClassAttendanceForDate: async (
    classId: string,
    date: string
  ): Promise<TeacherAttendance[]> => {
    const response = await api.get(`/attendance/teachers/class/${classId}/date`, { params: { date } });
    return toArray(unwrap(response)).map(normTeacherAttendance);
  },

  // POST /attendance/teachers/class/{classId}/bulk-range
  markTeacherBulkRange: async (data: {
    classId: string;
    courseId?: string;
    fromDate: string;
    toDate: string;
    status: AttendanceStatus;
    teacherId?: string;
  }): Promise<TeacherAttendance[]> => {
    const response = await api.post(
      `/attendance/teachers/class/${data.classId}/bulk-range`,
      data
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
