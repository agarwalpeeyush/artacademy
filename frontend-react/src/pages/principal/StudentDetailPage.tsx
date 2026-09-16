import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AppDispatch, RootState } from '../../store/store';
import { fetchStudentById } from '../../store/slices/studentSlice';
import { Enrollment, FeeBill, StudentAttendance } from '../../types';
import enrollmentService from '../../services/enrollmentService';
import attendanceService from '../../services/attendanceService';
import feeService from '../../services/feeService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate, feeTypeLabel } from '../../utils/formatters';

interface AttendanceStats {
  totalDays?: number;
  presentDays?: number;
  absentDays?: number;
  leaveDays?: number;
  halfDays?: number;
  attendancePercentage?: number;
}

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Grid item xs={12} sm={6} md={4}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2">{value ?? '-'}</Typography>
  </Grid>
);

const StudentDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { selected: student, loading } = useSelector((state: RootState) => state.students);

  const [tab, setTab] = useState(0);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [fees, setFees] = useState<FeeBill[]>([]);

  useEffect(() => {
    if (id) dispatch(fetchStudentById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (!id) return;
    enrollmentService.getByStudent(id).then(setEnrollments).catch(() => setEnrollments([]));
    attendanceService.getStudentAttendance({ studentId: id }).then(setAttendance).catch(() => setAttendance([]));
    attendanceService.getStudentStats(id).then(setStats).catch(() => setStats(null));
    feeService.getBills(id).then(setFees).catch(() => setFees([]));
  }, [id]);

  const enrollmentCols: Column<Record<string, unknown>>[] = [
    { id: 'courseName', label: 'Course', minWidth: 160 },
    { id: 'className', label: 'Class', minWidth: 140 },
    { id: 'enrollmentDate', label: 'Enrolled On', minWidth: 120, format: (v) => formatDate(v as string) },
    { id: 'status', label: 'Status', minWidth: 100, format: (v) => <Chip label={v as string} size="small" color={v === 'ACTIVE' ? 'success' : 'default'} /> },
  ];

  const attendanceCols: Column<Record<string, unknown>>[] = [
    { id: 'attendanceDate', label: 'Date', minWidth: 120, format: (v) => formatDate(v as string) },
    { id: 'className', label: 'Class', minWidth: 140 },
    { id: 'status', label: 'Status', minWidth: 100, format: (v) => <Chip label={v as string} size="small" color={v === 'PRESENT' ? 'success' : v === 'ABSENT' ? 'error' : 'warning'} /> },
    { id: 'remarks', label: 'Remarks', minWidth: 160 },
  ];

  const feeCols: Column<Record<string, unknown>>[] = [
    { id: 'feeType', label: 'Fee Type', minWidth: 130, format: (v) => feeTypeLabel(v as string) },
    { id: 'billingMonth', label: 'Period', minWidth: 90, align: 'center', format: (v, row) => (v ? `${v}/${(row as Record<string, unknown>).billingYear}` : '-') },
    { id: 'amountDue', label: 'Amount Due', minWidth: 110, align: 'right', format: (v) => formatCurrency(v as number) },
    { id: 'paidAmount', label: 'Paid', minWidth: 110, align: 'right', format: (v) => formatCurrency(v as number) },
    { id: 'outstandingAmount', label: 'Outstanding', minWidth: 120, align: 'right', format: (v) => formatCurrency(v as number) },
    { id: 'status', label: 'Status', minWidth: 100, format: (v) => <Chip label={v as string} size="small" color={v === 'PAID' ? 'success' : 'warning'} /> },
  ];

  const timetableCols: Column<Record<string, unknown>>[] = [
    { id: 'courseName', label: 'Course', minWidth: 160 },
    { id: 'className', label: 'Class', minWidth: 160 },
    { id: 'status', label: 'Status', minWidth: 100 },
  ];

  if (loading && !student) return <LoadingSpinner />;

  const fullName = student ? `${student.firstName} ${student.lastName}` : 'Student';

  return (
    <Box>
      <PageHeader
        title={fullName}
        subtitle="Student details"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Students', href: '/principal/students' }, { label: fullName }]}
        action={<Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/principal/students')}>Back</Button>}
      />

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Typography variant="h6">{fullName}</Typography>
            {student && <Chip label={student.status} size="small" color={student.status === 'ACTIVE' ? 'success' : 'default'} />}
          </Box>
          <Grid container spacing={2}>
            <Info label="Login ID" value={student?.loginId} />
            <Info label="Date of Birth" value={student?.dob ? formatDate(student.dob) : '-'} />
            <Info label="Email" value={student?.email} />
            <Info label="School Name" value={student?.schoolName} />
            <Info label="Class / Grade" value={student?.className} />
            <Info label="Address" value={student?.address} />
            <Info label="Father" value={student?.fatherName ? `${student.fatherName}${student.fatherPhone ? ` (${student.fatherPhone})` : ''}` : '-'} />
            <Info label="Mother" value={student?.motherName ? `${student.motherName}${student.motherPhone ? ` (${student.motherPhone})` : ''}` : '-'} />
            <Info label="Linked Parents" value={
              (student?.parents ?? []).length
                ? (student!.parents!).map(p =>
                    `${p.name}${p.relationship ? ` — ${p.relationship}` : ''}${p.phone ? ` (${p.phone})` : ''}`
                  ).join(', ')
                : '-'
            } />
            <Info label="Enrolled On" value={student?.enrollmentDate ? formatDate(student.enrollmentDate) : '-'} />
          </Grid>
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Enrollments" />
        <Tab label="Attendance" />
        <Tab label="Fees" />
        <Tab label="Timetable" />
      </Tabs>

      {tab === 0 && (
        <DataTable columns={enrollmentCols} rows={enrollments as unknown as Record<string, unknown>[]} emptyMessage="No enrollments." />
      )}

      {tab === 1 && (
        <Box>
          {stats && (
            <Grid container spacing={2} mb={2}>
              <Info label="Total Days" value={stats.totalDays ?? '-'} />
              <Info label="Present" value={stats.presentDays ?? '-'} />
              <Info label="Absent" value={stats.absentDays ?? '-'} />
              <Info label="Attendance %" value={stats.attendancePercentage != null ? `${stats.attendancePercentage}%` : '-'} />
            </Grid>
          )}
          <DataTable columns={attendanceCols} rows={attendance as unknown as Record<string, unknown>[]} emptyMessage="No attendance records." />
        </Box>
      )}

      {tab === 2 && (
        <DataTable columns={feeCols} rows={fees as unknown as Record<string, unknown>[]} emptyMessage="No fee records." />
      )}

      {tab === 3 && (
        <DataTable columns={timetableCols} rows={enrollments as unknown as Record<string, unknown>[]} emptyMessage="No scheduled classes." />
      )}
    </Box>
  );
};

export default StudentDetailPage;
