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
import { Timetable, TeacherAttendance } from '../../types';
import timetableService from '../../services/timetableService';
import teacherService from '../../services/teacherService';
import attendanceService from '../../services/attendanceService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, getDayName, formatTime } from '../../utils/formatters';

/** ISO yyyy-MM-dd range covering the last 3 months up to today. */
const lastThreeMonths = (): { from: string; to: string } => {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 3);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
};

const slotLabel = (t: { dayOfWeek?: string; startTime?: string; endTime?: string }): string =>
  `${t.dayOfWeek ? getDayName(t.dayOfWeek) : ''} ${formatTime(t.startTime)}–${formatTime(t.endTime)}`.trim();

interface CourseRow {
  courseId: string;
  courseName: string;
  slots: string;
}

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
  const [attendance, setAttendance] = useState<TeacherAttendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);

  useEffect(() => {
    if (id) dispatch(fetchTeacherById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (!id) return;
    const { from, to } = lastThreeMonths();
    timetableService.getByTeacher(id).then(setTimetables).catch(() => setTimetables([]));
    attendanceService.getTeacherAttendanceById(id, from, to).then(setAttendance).catch(() => setAttendance([]));
    teacherService.getAttendanceStats(id)
      .then((d) => setStats(d?.data ?? d))
      .catch(() => setStats(null));
  }, [id]);

  // Courses the teacher takes, each with its timetable slots (grouped from the timetable rows).
  const courses = useMemo<CourseRow[]>(() => {
    const map = new Map<string, { courseName: string; slots: string[] }>();
    timetables.forEach((t) => {
      if (!t.courseId) return;
      const entry = map.get(t.courseId) ?? { courseName: t.courseName ?? t.courseId, slots: [] };
      entry.slots.push(slotLabel(t));
      map.set(t.courseId, entry);
    });
    return Array.from(map.entries()).map(([courseId, { courseName, slots }]) => ({
      courseId,
      courseName,
      slots: slots.join(', '),
    }));
  }, [timetables]);

  // Resolve a teacher-attendance row's timetableId to its day/time slot label.
  const slotById = useMemo(() => {
    const m = new Map<string, Timetable>();
    timetables.forEach((t) => m.set(t.id, t));
    return m;
  }, [timetables]);

  const courseCols: Column<Record<string, unknown>>[] = [
    { id: 'courseName', label: 'Course', minWidth: 200 },
    { id: 'slots', label: 'Timetable Slots', minWidth: 260, format: (v) => (v as string) || '-' },
  ];

  const attendanceCols: Column<Record<string, unknown>>[] = [
    { id: 'date', label: 'Date', minWidth: 120, format: (v) => formatDate(v as string) },
    {
      id: 'timetableId', label: 'Time Slot', minWidth: 200,
      format: (v) => {
        const slot = v ? slotById.get(v as string) : undefined;
        return slot ? slotLabel(slot) : '-';
      },
    },
    { id: 'status', label: 'Status', minWidth: 100, format: (v) => <Chip label={v as string} size="small" color={v === 'PRESENT' ? 'success' : v === 'ABSENT' ? 'error' : 'warning'} /> },
    { id: 'remarks', label: 'Remarks', minWidth: 160 },
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
        <Tab label="Attendance" />
      </Tabs>

      {tab === 0 && (
        <DataTable columns={courseCols} rows={courses as unknown as Record<string, unknown>[]} emptyMessage="No assigned courses." />
      )}

      {tab === 1 && (
        <Box>
          {stats && (
            <Grid container spacing={2} mb={2}>
              <Info label="Total Days" value={stats.totalDays ?? '-'} />
              <Info label="Present" value={stats.presentCount ?? '-'} />
              <Info label="Absent" value={stats.absentCount ?? '-'} />
              <Info label="Attendance %" value={stats.attendancePercentage != null ? `${stats.attendancePercentage}%` : '-'} />
            </Grid>
          )}
          <DataTable columns={attendanceCols} rows={attendance as unknown as Record<string, unknown>[]} emptyMessage="No attendance records in the last 3 months." />
        </Box>
      )}
    </Box>
  );
};

export default TeacherDetailPage;
