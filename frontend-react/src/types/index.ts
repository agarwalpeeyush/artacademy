export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  roles: string[];
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  id: string;
  username: string;
  email: string;
  roles: string[];
}

export interface Teacher {
  id: string;
  loginId?: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email?: string;
  phone?: string;
  qualification?: string;
  joiningDate?: string;
  status: string;
}

export interface Student {
  id: string;
  loginId?: string;
  firstName: string;
  lastName: string;
  dob?: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  guardianName?: string;
  guardianPhone?: string;
  email?: string;
  address?: string;
  enrollmentDate?: string;
  status: string;
}

export interface Parent {
  id: string;
  loginId?: string;
  firstName: string;
  lastName: string;
  relationship?: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
  studentId: string;
  studentName?: string;
  status: string;
}

export interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  courseType?: string;
  description?: string;
  monthlyFee: number;
  admissionFee: number;
  durationMonths: number;
  status: string;
}

export interface CourseClass {
  id: string;
  courseId: string;
  courseName?: string;
  teacherId?: string;
  teacherName?: string;
  className: string;
  roomNumber?: string;
  capacity: number;
  status: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName?: string;
  courseId: string;
  courseName?: string;
  classId?: string;
  className?: string;
  enrollmentDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'SUSPENDED';
  admissionFeePaid: boolean;
}

export interface TeacherAttendance {
  id: string;
  teacherId: string;
  teacherName?: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HALF_DAY';

export interface StudentAttendance {
  id: string;
  studentId: string;
  studentName?: string;
  classId: string;
  className?: string;
  courseId?: string;
  sessionId?: string;
  date: string;
  attendanceDate?: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface AttendanceStats {
  studentId: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  halfDays: number;
  attendancePercentage: number;
}

export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceCorrection {
  id: string;
  studentAttendanceId: string;
  studentId: string;
  classId: string;
  attendanceDate: string;
  requestedStatus: AttendanceStatus;
  reason?: string;
  requestedByTeacherId: string;
  status: CorrectionStatus;
  reviewedByPrincipalId?: string;
  reviewNote?: string;
  createdAt?: string;
  reviewedAt?: string;
}

export interface CourseAttendanceSummary {
  courseId?: string;
  courseName: string;
  attendanceMonth: number;
  attendanceYear: number;
  studentCount: number;
  totalDays: number;
  presentDays: number;
  attendancePercentage: number;
}

export interface AttendanceException {
  subjectId: string;
  subjectName: string;
  subjectType: string;
  attendanceMonth?: number;
  attendanceYear?: number;
  totalDays: number;
  presentDays: number;
  attendancePercentage: number;
}

export interface Room {
  id: string;
  roomName: string;
  capacity: number;
}

export interface Schedule {
  id: string;
  classId: string;
  className?: string;
  teacherId: string;
  teacherName?: string;
  courseId?: string;
  courseName?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomId?: string;
  roomName?: string;
  active: boolean;
  status?: 'DRAFT' | 'PUBLISHED';
  publishedAt?: string;
}

export interface RoomAvailabilitySlot {
  startTime: string;
  endTime: string;
  scheduleId?: string;
  classId?: string;
}

export interface RoomAvailability {
  roomId: string;
  roomName: string;
  dayOfWeek: string;
  occupied: RoomAvailabilitySlot[];
  free: RoomAvailabilitySlot[];
}

export type ScheduleConflictType = 'TEACHER_DOUBLE_BOOKED' | 'ROOM_DOUBLE_BOOKED' | 'CLASS_OVERLAP';

export interface ScheduleConflict {
  type: ScheduleConflictType;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  scheduleId: string;
  otherScheduleId: string;
  teacherId: string;
  roomId: string;
  classId: string;
  description: string;
}

export interface ScheduleVersionEntry {
  scheduleId: string;
  classId: string;
  teacherId: string;
  roomId: string;
  roomName?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleVersion {
  id: string;
  versionNumber: number;
  publishedAt: string;
  publishedBy?: string;
  entryCount: number;
  entries?: ScheduleVersionEntry[];
}

export interface UpcomingClass {
  scheduleId: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  classId: string;
  teacherId: string;
  roomId?: string;
  roomName?: string;
  className?: string;
  courseName?: string;
  teacherName?: string;
}

export interface TeacherAvailabilityException {
  id: string;
  teacherId: string;
  date: string;
  reason?: string;
  unavailableAllDay: boolean;
  startTime?: string;
  endTime?: string;
}

export interface FeeCycle {
  id: string;
  studentId: string;
  studentName?: string;
  billingMonth?: number;
  billingYear?: number;
  month?: number;
  year?: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount?: number;
  dueAmount?: number;
  dueDate?: string;
  generatedDate?: string;
  status: string;
}

export interface FeeDetail {
  id: string;
  feeCycleId: string;
  enrollmentId: string;
  courseId?: string;
  courseName?: string;
  courseFee?: number;
  amount?: number;
  description?: string;
  outstandingAmount?: number;
  allocatedPaidAmount?: number;
  status?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName?: string;
  feeCycleId?: string;
  amount: number;
  paymentDate: string;
  paymentMode: 'CASH' | 'ONLINE' | 'CHEQUE' | 'UPI';
  transactionId?: string;
  transactionReference?: string;
  receiptNumber?: string;
  remarks?: string;
  collectedBy?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface RevenueReport {
  month: number;
  year: number;
  totalRevenue: number;
  collectedAmount: number;
  pendingAmount: number;
  totalStudents: number;
  paidStudents: number;
}

export interface DefaulterStudent {
  studentId: string;
  studentName: string;
  email: string;
  phone: string;
  outstandingAmount: number;
  overdueMonths: number;
  lastPaymentDate?: string;
  enrolledCourses: string[];
}

export interface AttendanceReport {
  studentId?: string;
  teacherId?: string;
  name: string;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendancePercentage: number;
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalClasses: number;
  revenueThisMonth: number;
  pendingFeesThisMonth: number;
  activeEnrollments: number;
  todayAttendance?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
