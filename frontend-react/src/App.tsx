import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import PrincipalSidebar from './components/layout/PrincipalSidebar';
import TeacherSidebar from './components/layout/TeacherSidebar';
import StudentSidebar from './components/layout/StudentSidebar';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Principal
import DashboardPage from './pages/principal/DashboardPage';
import TeachersPage from './pages/principal/TeachersPage';
import StudentsPage from './pages/principal/StudentsPage';
import CoursesPage from './pages/principal/CoursesPage';
import ClassesPage from './pages/principal/ClassesPage';
import EnrollmentsPage from './pages/principal/EnrollmentsPage';
import TimetablePage from './pages/principal/TimetablePage';
import AttendanceReportPage from './pages/principal/AttendanceReportPage';
import RevenuePage from './pages/principal/RevenuePage';
import DefaultersPage from './pages/principal/DefaultersPage';
import AnalyticsPage from './pages/principal/AnalyticsPage';

// Teacher
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage';
import AttendancePage from './pages/teacher/AttendancePage';
import AssignedStudentsPage from './pages/teacher/AssignedStudentsPage';
import FeeStatusPage from './pages/teacher/FeeStatusPage';
import TeacherSchedulePage from './pages/teacher/TeacherSchedulePage';

// Student
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import StudentProfilePage from './pages/student/StudentProfilePage';
import StudentAttendancePage from './pages/student/StudentAttendancePage';
import StudentSchedulePage from './pages/student/StudentSchedulePage';
import StudentEnrollmentsPage from './pages/student/StudentEnrollmentsPage';
import FeesPage from './pages/student/FeesPage';
import ReceiptsPage from './pages/student/ReceiptsPage';

const PrincipalLayout: React.FC = () => (
  <MainLayout sidebar={<PrincipalSidebar />} title="Art Academy — Principal" />
);

const TeacherLayout: React.FC = () => (
  <MainLayout sidebar={<TeacherSidebar />} title="Art Academy — Teacher" />
);

const StudentLayout: React.FC = () => (
  <MainLayout sidebar={<StudentSidebar />} title="Art Academy — Student" />
);

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

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
        <Route path="students" element={<StudentsPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="enrollments" element={<EnrollmentsPage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="attendance" element={<AttendanceReportPage />} />
        <Route path="revenue" element={<RevenuePage />} />
        <Route path="defaulters" element={<DefaultersPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
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
        <Route path="students" element={<AssignedStudentsPage />} />
        <Route path="fee-status" element={<FeeStatusPage />} />
        <Route path="schedule" element={<TeacherSchedulePage />} />
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
        <Route path="enrollments" element={<StudentEnrollmentsPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="receipts" element={<ReceiptsPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
