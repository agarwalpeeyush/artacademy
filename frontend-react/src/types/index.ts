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

export interface StudentAttendance {
  id: string;
  studentId: string;
  studentName?: string;
  classId: string;
  className?: string;
  date: string;
  attendanceDate?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remarks?: string;
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
