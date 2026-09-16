import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, LinearProgress,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchStudentEnrollments } from '../../store/slices/enrollmentSlice';
import { fetchStudentTimetables } from '../../store/slices/timetableSlice';
import attendanceService from '../../services/attendanceService';
import PageHeader from '../../components/common/PageHeader';
import { getDayName, formatTime } from '../../utils/formatters';

const StudentDashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { studentEnrollments } = useSelector((state: RootState) => state.enrollments);
  const { studentTimetables } = useSelector((state: RootState) => state.timetables);
  const [attendancePct, setAttendancePct] = useState<number | null>(null);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentEnrollments(user.id));
      dispatch(fetchStudentTimetables(user.id));
      attendanceService.getStudentStats(user.id).then((stats: { attendancePercentage?: number }) => {
        if (stats?.attendancePercentage != null) setAttendancePct(stats.attendancePercentage);
      }).catch(() => {});
    }
  }, [dispatch, user]);

  const activeEnrollments = studentEnrollments.filter(e => e.status === 'ACTIVE');
  const todayClasses = studentTimetables.filter(s => s.dayOfWeek.toUpperCase() === today);

  return (
    <Box>
      <PageHeader
        title={`Hello, ${user?.username || 'Student'}!`}
        subtitle="Your learning overview"
        breadcrumbs={[{ label: 'Student' }, { label: 'Dashboard' }]}
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Active Enrollments</Typography>
              <Typography variant="h4" fontWeight={700} color="primary.main" mt={1}>{activeEnrollments.length}</Typography>
              <Typography variant="caption" color="text.secondary">courses enrolled</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" mb={1}>Attendance Rate</Typography>
              {attendancePct !== null ? (
                <>
                  <Typography variant="h4" fontWeight={700} color={attendancePct >= 75 ? 'success.main' : 'warning.main'}>
                    {attendancePct.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={attendancePct}
                    color={attendancePct >= 75 ? 'success' : 'warning'}
                    sx={{ mt: 1, borderRadius: 4, height: 8 }}
                  />
                </>
              ) : (
                <Typography variant="h4" fontWeight={700} color="text.secondary">N/A</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Today's Classes</Typography>
              {todayClasses.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No classes today.</Typography>
              ) : (
                todayClasses.map(s => (
                  <Box key={s.id} display="flex" alignItems="center" justifyContent="space-between" py={1.5} borderBottom="1px solid" borderColor="divider">
                    <Box>
                      <Typography variant="body1" fontWeight={500}>{s.className}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.teacherName}</Typography>
                    </Box>
                    <Chip label={`${formatTime(s.startTime)} – ${formatTime(s.endTime)}`} color="primary" size="small" />
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>My Courses</Typography>
              {activeEnrollments.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No active enrollments.</Typography>
              ) : (
                activeEnrollments.map(e => (
                  <Box key={e.id} display="flex" alignItems="center" justifyContent="space-between" py={1.5} borderBottom="1px solid" borderColor="divider">
                    <Typography variant="body1" fontWeight={500}>{e.courseName}</Typography>
                    <Chip label={e.status} color="success" size="small" />
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentDashboardPage;
