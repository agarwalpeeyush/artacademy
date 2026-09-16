export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  bootstrap?: boolean;
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
  bootstrap?: boolean;
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
  // Confirm-and-link (OQ1): link an existing Person rather than minting a new one.
  linkPersonId?: string;
}

export interface ChildRef {
  id: string;
  name: string;
}

export interface ParentRef {
  id: string;
  name: string;
  relationship?: string;
  phone?: string;
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
  email?: string;
  address?: string;
  schoolName?: string;
  className?: string;
  enrollmentDate?: string;
  status: string;
  parents?: ParentRef[];
  // Confirm-and-link (OQ1): when the provisioner links an existing Person as a
  // parent instead of creating a fresh one, these carry that Person's id.
  motherLinkPersonId?: string;
  fatherLinkPersonId?: string;
}

export interface Parent {
  id: string;
  loginId?: string;
  firstName: string;
  lastName: string;
  parentName?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
  childStudentIds?: string[];
  children?: ChildRef[];
  otherParents?: ParentRef[];
  status: string;
  // Confirm-and-link (OQ1): link this Parent to an existing Person on create.
  linkPersonId?: string;
}

export type FeeType = 'ADMISSION' | 'MONTHLY' | 'EXAM' | 'ONE_TIME_SHORT_TERM';
export type FeeCadence = 'RECURRING' | 'ONE_TIME';
export type ShareType = 'AMOUNT' | 'PERCENTAGE';

export interface CourseFeeItem {
  id?: string;
  feeType: FeeType;
  amount: number;
  cadence?: FeeCadence;
  // Institute's cut of this fee line (F10): AMOUNT (absolute) or PERCENTAGE (0–100).
  instituteShareType?: ShareType | null;
  instituteShareValue?: number | null;
  // When this fee falls due (ISO yyyy-MM-dd). Only meaningful on enrollment fee lines; omit to let
  // the backend compute it from the cadence (ONE_TIME/first MONTHLY → enrollment date).
  dueDate?: string | null;
}

export interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  courseTypeCode?: string;
  courseTypeName?: string;
  description?: string;
  durationMonths: number;
  status: string;
  fees: CourseFeeItem[];
}

export interface CourseType {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface Exam {
  id: string;
  courseId: string;
  courseName?: string;
  title?: string;
  examDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName?: string;
  courseId: string;
  courseName?: string;
  teacherId?: string;
  teacherName?: string;
  enrollmentDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'SUSPENDED';
  fees?: CourseFeeItem[];
  // R9: the course timetable slots this child is assigned to attend.
  timetables?: Timetable[];
  timetableIds?: string[];
}

export interface TeacherAttendance {
  id: string;
  teacherId: string;
  teacherName?: string;
  courseId?: string;
  timetableId?: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HALF_DAY';

export interface StudentAttendance {
  id: string;
  studentId: string;
  studentName?: string;
  courseId?: string;
  timetableId?: string;
  date: string;
  attendanceDate?: string;
  status: AttendanceStatus;
  startTime?: string;
  endTime?: string;
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

export type AttendanceRecordType = 'STUDENT' | 'TEACHER';

/** An attendance-edit audit-log entry (R16, direct edit — no approval workflow). */
export interface AttendanceCorrection {
  id: string;
  attendanceType: AttendanceRecordType;
  attendanceId: string;
  subjectId: string;
  timetableId: string;
  attendanceDate: string;
  oldStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason?: string;
  editedByUserId: string;
  editorRole: string;
  editedAt?: string;
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

export interface Timetable {
  id: string;
  courseId: string;
  teacherId: string;
  teacherName?: string;
  courseName?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  active: boolean;
  // Deprecated (Class model) — kept required so Step 5-7 pages compile unchanged
  // until they are rewritten to the course/timetable-assignment model.
  classId: string;
  className?: string;
}

export type TimetableConflictType = 'TEACHER_DOUBLE_BOOKED' | 'COURSE_OVERLAP';

export interface TimetableConflict {
  type: TimetableConflictType;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  timetableId: string;
  otherTimetableId: string;
  teacherId: string;
  courseId: string;
  description: string;
}

export interface UpcomingClass {
  timetableId: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  courseId: string;
  teacherId: string;
  courseName?: string;
  teacherName?: string;
  // Deprecated (Class model) — retained until Step 5-7 rewrites.
  classId: string;
  className?: string;
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
  cycleKind?: 'MONTHLY' | 'ADMISSION' | 'EXAM' | 'ONE_TIME_SHORT_TERM';
  month?: number;
  year?: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount?: number;
  dueAmount?: number;
  dueDate?: string;
  generatedDate?: string;
  status: string;
  overdue?: boolean;
  displayStatus?: string;
  excessAmount?: number;
  shortAmount?: number;
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
  // Revenue share (F8/F9): teacher attribution + effective institute/teacher split.
  teacherId?: string;
  instituteShareAmount?: number;
  teacherShareAmount?: number;
  overridden?: boolean;
}

/** Per-teacher revenue rollup over fully-PAID details (F9). */
export interface TeacherRevenueSummary {
  teacherId: string;
  teacherName?: string;
  collected: number;
  instituteShare: number;
  teacherShare: number;
  paidDetailCount: number;
}

/** A name-resolved student for the scoped picker on the fee pages. */
export interface ScopedStudent {
  studentId: string;
  enrollmentId: string;
  courseId?: string;
  teacherId?: string;
  studentName?: string;
  courseName?: string;
}

/** An editable STUDENT_FEE_DETAIL catalogue line (before a bill is generated). */
export interface FeeDetailLine {
  id: string;
  enrollmentId: string;
  feeType: FeeType;
  amount: number;
  cadence?: FeeCadence;
  dueDate?: string | null;
  instituteShareType?: ShareType | null;
  instituteShareValue?: number | null;
}

/** A materialised FEE_BILLS row plus read-derived fields. */
export interface FeeBill {
  id: string;
  enrollmentId: string;
  studentId: string;
  billingMonth?: number;
  billingYear?: number;
  feeType: FeeType;
  cadence?: FeeCadence;
  amountDue: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  generatedDate?: string;
  dueDate?: string;
  paymentDate?: string;
  outstandingBill?: boolean;
  teacherId?: string;
  instituteShareAmount?: number;
  teacherShareAmount?: number;
  overridden?: boolean;
  overdue?: boolean;
  displayStatus?: string;
  excessAmount?: number;
  shortAmount?: number;
}

/** Result of a Generate-Bill action. */
export interface FeeGenerateResponse {
  generated: FeeBill[];
  alreadyBilled: string[];
  missingMonths: string[];
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
  settledBillIds?: string[];
  creditBalance?: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'ANNOUNCEMENT';
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export type AnnouncementAudience = 'ALL_STUDENTS' | 'ALL_TEACHERS' | 'TEACHER_STUDENTS';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  senderUserId?: string;
  senderRole?: string;
  recipientCount: number;
  createdAt: string;
}

export interface TeacherBroadcastPermission {
  teacherId: string;
  canBroadcast: boolean;
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
