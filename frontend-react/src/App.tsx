import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import PrincipalSidebar from './components/layout/PrincipalSidebar';
import TeacherSidebar from './components/layout/TeacherSidebar';
import StudentSidebar from './components/layout/StudentSidebar';
import ParentSidebar from './components/layout/ParentSidebar';

// Auth
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Principal
import DashboardPage from './pages/principal/DashboardPage';
import TeachersPage from './pages/principal/TeachersPage';
import StudentsPage from './pages/principal/StudentsPage';
import StudentDetailPage from './pages/principal/StudentDetailPage';
import TeacherDetailPage from './pages/principal/TeacherDetailPage';
import CourseDetailPage from './pages/principal/CourseDetailPage';
import CoursesPage from './pages/principal/CoursesPage';
import ClassesPage from './pages/principal/ClassesPage';
import RoomsPage from './pages/principal/RoomsPage';
import EnrollmentsPage from './pages/principal/EnrollmentsPage';
import TimetablePage from './pages/principal/TimetablePage';
import RoomAvailabilityPage from './pages/principal/RoomAvailabilityPage';
import ScheduleConflictsPage from './pages/principal/ScheduleConflictsPage';
import SchedulePublishPage from './pages/principal/SchedulePublishPage';
import AttendanceReportPage from './pages/principal/AttendanceReportPage';
import AttendanceCorrectionsPage from './pages/principal/AttendanceCorrectionsPage';
import TeacherAttendancePage from './pages/principal/TeacherAttendancePage';
import RevenuePage from './pages/principal/RevenuePage';
import DefaultersPage from './pages/principal/DefaultersPage';
import AnalyticsPage from './pages/principal/AnalyticsPage';
import AuditLogsPage from './pages/principal/AuditLogsPage';
import UserManagementPage from './pages/principal/UserManagementPage';

// Teacher
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage';
import AttendancePage from './pages/teacher/AttendancePage';
import MyAttendancePage from './pages/teacher/MyAttendancePage';
import CorrectionsPage from './pages/teacher/CorrectionsPage';
import AssignedStudentsPage from './pages/teacher/AssignedStudentsPage';
import FeeStatusPage from './pages/teacher/FeeStatusPage';
import TeacherSchedulePage from './pages/teacher/TeacherSchedulePage';
import AvailabilityExceptionsPage from './pages/teacher/AvailabilityExceptionsPage';
import TeacherEnrollmentsPage from './pages/teacher/TeacherEnrollmentsPage';

// Student
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import StudentProfilePage from './pages/student/StudentProfilePage';
import StudentAttendancePage from './pages/student/StudentAttendancePage';
import StudentSchedulePage from './pages/student/StudentSchedulePage';
import StudentUpcomingClassesPage from './pages/student/UpcomingClassesPage';
import StudentEnrollmentsPage from './pages/student/StudentEnrollmentsPage';
import FeesPage from './pages/student/FeesPage';
import ReceiptsPage from './pages/student/ReceiptsPage';

// Parent
import ParentDashboardPage from './pages/parent/ParentDashboardPage';
import MyChildrenPage from './pages/parent/MyChildrenPage';
import ParentAttendancePage from './pages/parent/ParentAttendancePage';
import ParentFeesPage from './pages/parent/ParentFeesPage';
import ParentNotificationsPage from './pages/parent/ParentNotificationsPage';
import ParentUpcomingClassesPage from './pages/parent/UpcomingClassesPage';

const PrincipalLayout: React.FC = () => (
  <MainLayout sidebar={<PrincipalSidebar />} title="Art Academy — Principal" />
);

const TeacherLayout: React.FC = () => (
  <MainLayout sidebar={<TeacherSidebar />} title="Art Academy — Teacher" />
);

const StudentLayout: React.FC = () => (
  <MainLayout sidebar={<StudentSidebar />} title="Art Academy — Student" />
);

const ParentLayout: React.FC = () => (
  <MainLayout sidebar={<ParentSidebar />} title="Art Academy — Parent" />
);

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Principal Routes */}
      <Route
        path="/principal"
        element={
          <ProtectedRoute requiredRole="ROLE_PRINCIPAL">
            <PrincipalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route path="teachers/:id" element={<TeacherDetailPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:id" element={<StudentDetailPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:id" element={<CourseDetailPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="enrollments" element={<EnrollmentsPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="room-availability" element={<RoomAvailabilityPage />} />
        <Route path="conflicts" element={<ScheduleConflictsPage />} />
        <Route path="schedule-publish" element={<SchedulePublishPage />} />
        <Route path="attendance" element={<AttendanceReportPage />} />
        <Route path="teacher-attendance" element={<TeacherAttendancePage />} />
        <Route path="attendance-corrections" element={<AttendanceCorrectionsPage />} />
        <Route path="revenue" element={<RevenuePage />} />
        <Route path="defaulters" element={<DefaultersPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="users" element={<UserManagementPage />} />
      </Route>

      {/* Teacher Routes */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute requiredRole="ROLE_TEACHER">
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboardPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="my-attendance" element={<MyAttendancePage />} />
        <Route path="corrections" element={<CorrectionsPage />} />
        <Route path="students" element={<AssignedStudentsPage />} />
        <Route path="enrollments" element={<TeacherEnrollmentsPage />} />
        <Route path="fee-status" element={<FeeStatusPage />} />
        <Route path="schedule" element={<TeacherSchedulePage />} />
        <Route path="availability-exceptions" element={<AvailabilityExceptionsPage />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute requiredRole="ROLE_STUDENT">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboardPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="attendance" element={<StudentAttendancePage />} />
        <Route path="schedule" element={<StudentSchedulePage />} />
        <Route path="upcoming" element={<StudentUpcomingClassesPage />} />
        <Route path="enrollments" element={<StudentEnrollmentsPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="receipts" element={<ReceiptsPage />} />
      </Route>

      {/* Parent Routes */}
      <Route
        path="/parent"
        element={
          <ProtectedRoute requiredRole="ROLE_PARENT">
            <ParentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ParentDashboardPage />} />
        <Route path="children" element={<MyChildrenPage />} />
        <Route path="attendance" element={<ParentAttendancePage />} />
        <Route path="upcoming" element={<ParentUpcomingClassesPage />} />
        <Route path="fees" element={<ParentFeesPage />} />
        <Route path="notifications" element={<ParentNotificationsPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
