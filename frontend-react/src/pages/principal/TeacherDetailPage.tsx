import React, { useEffect, useMemo, useState } from 'react';
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
import { fetchTeacherById } from '../../store/slices/teacherSlice';
import { Timetable } from '../../types';
import timetableService from '../../services/timetableService';
import teacherService from '../../services/teacherService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, getDayName, formatTime } from '../../utils/formatters';

interface AttendanceStats {
  totalDays?: number;
  presentCount?: number;
  absentCount?: number;
  attendancePercentage?: number;
}

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Grid item xs={12} sm={6} md={4}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2">{value ?? '-'}</Typography>
  </Grid>
);

const TeacherDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { selected: teacher, loading } = useSelector((state: RootState) => state.teachers);

  const [tab, setTab] = useState(0);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [availability, setAvailability] = useState<Record<string, unknown>[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);

  useEffect(() => {
    if (id) dispatch(fetchTeacherById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (!id) return;
    timetableService.getByTeacher(id).then(setTimetables).catch(() => setTimetables([]));
    teacherService.getAvailability(id)
      .then((d) => setAvailability(Array.isArray(d) ? d : d?.content ?? []))
      .catch(() => setAvailability([]));
    teacherService.getAttendanceStats(id)
      .then((d) => setStats(d?.data ?? d))
      .catch(() => setStats(null));
  }, [id]);

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    timetables.forEach((t) => {
      if (t.courseId && !map.has(t.courseId)) {
        map.set(t.courseId, t.courseName ?? t.courseId);
      }
    });
    return Array.from(map.entries()).map(([courseId, courseName]) => ({ courseId, courseName }));
  }, [timetables]);

  const scheduleCols: Column<Record<string, unknown>>[] = [
    { id: 'dayOfWeek', label: 'Day', minWidth: 120, format: (v) => getDayName(v as string) },
    { id: 'courseName', label: 'Course', minWidth: 160, format: (v) => (v as string) || '—' },
    { id: 'startTime', label: 'Start', minWidth: 100, format: (v) => formatTime(v as string) },
    { id: 'endTime', label: 'End', minWidth: 100, format: (v) => formatTime(v as string) },
  ];

  const courseCols: Column<Record<string, unknown>>[] = [
    { id: 'courseName', label: 'Course', minWidth: 200 },
  ];

  const availabilityCols: Column<Record<string, unknown>>[] = [
    { id: 'dayOfWeek', label: 'Day', minWidth: 120, format: (v) => (v ? getDayName(String(v)) : '-') },
    { id: 'startTime', label: 'From', minWidth: 100, format: (v) => (v ? formatTime(String(v)) : '-') },
    { id: 'endTime', label: 'To', minWidth: 100, format: (v) => (v ? formatTime(String(v)) : '-') },
  ];

  if (loading && !teacher) return <LoadingSpinner />;

  const fullName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Teacher';

  return (
    <Box>
      <PageHeader
        title={fullName}
        subtitle="Teacher details"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Teachers', href: '/principal/teachers' }, { label: fullName }]}
        action={<Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/principal/teachers')}>Back</Button>}
      />

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Typography variant="h6">{fullName}</Typography>
            {teacher && <Chip label={teacher.status} size="small" color={teacher.status === 'ACTIVE' ? 'success' : 'default'} />}
          </Box>
          <Grid container spacing={2}>
            <Info label="Employee Code" value={teacher?.employeeCode} />
            <Info label="Login ID" value={teacher?.loginId} />
            <Info label="Email" value={teacher?.email} />
            <Info label="Phone" value={teacher?.phone} />
            <Info label="Qualification" value={teacher?.qualification} />
            <Info label="Joined On" value={teacher?.joiningDate ? formatDate(teacher.joiningDate) : '-'} />
          </Grid>
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Courses (${courses.length})`} />
        <Tab label={`Schedule (${timetables.length})`} />
        <Tab label="Availability" />
        <Tab label="Attendance" />
      </Tabs>

      {tab === 0 && (
        <DataTable columns={courseCols} rows={courses as unknown as Record<string, unknown>[]} emptyMessage="No assigned courses." />
      )}

      {tab === 1 && (
        <DataTable columns={scheduleCols} rows={timetables as unknown as Record<string, unknown>[]} emptyMessage="No scheduled timetable slots." />
      )}

      {tab === 2 && (
        <DataTable columns={availabilityCols} rows={availability} emptyMessage="No availability configured." />
      )}

      {tab === 3 && (
        <Box>
          {stats ? (
            <Grid container spacing={2}>
              <Info label="Total Days" value={stats.totalDays ?? '-'} />
              <Info label="Present" value={stats.presentCount ?? '-'} />
              <Info label="Absent" value={stats.absentCount ?? '-'} />
              <Info label="Attendance %" value={stats.attendancePercentage != null ? `${stats.attendancePercentage}%` : '-'} />
            </Grid>
          ) : (
            <Typography color="text.secondary">No attendance data.</Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default TeacherDetailPage;
