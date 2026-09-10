import React, { useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherTimetables } from '../../store/slices/timetableSlice';
import PageHeader from '../../components/common/PageHeader';
import { formatTime, getDayName } from '../../utils/formatters';

const TeacherDashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { teacherTimetables } = useSelector((state: RootState) => state.timetables);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  useEffect(() => {
    if (user?.id) dispatch(fetchTeacherTimetables(user.id));
  }, [dispatch, user]);

  const todayTimetable = teacherTimetables.filter(s => s.dayOfWeek.toUpperCase() === today);

  return (
    <Box>
      <PageHeader
        title={`Welcome, ${user?.username || 'Teacher'}!`}
        subtitle="Here's your teaching overview for today"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'Dashboard' }]}
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Weekly Classes</Typography>
              <Typography variant="h4" fontWeight={700} color="primary.main" mt={1}>{teacherTimetables.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Classes Today</Typography>
              <Typography variant="h4" fontWeight={700} color={todayTimetable.length > 0 ? 'success.main' : 'text.secondary'} mt={1}>
                {todayTimetable.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Today</Typography>
              <Typography variant="h6" fontWeight={600} color="primary.main" mt={1}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Today's Timetable</Typography>
              {todayTimetable.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No classes scheduled for today.</Typography>
              ) : (
                todayTimetable.map(s => (
                  <Box key={s.id} display="flex" alignItems="center" justifyContent="space-between" py={1.5} borderBottom="1px solid" borderColor="divider">
                    <Box>
                      <Typography variant="body1" fontWeight={500}>{s.className}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.courseName} • Room {s.roomName || 'TBD'}</Typography>
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
              <Typography variant="h6" gutterBottom>Weekly Timetable</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Day</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teacherTimetables.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No timetable assigned</TableCell>
                      </TableRow>
                    ) : (
                      teacherTimetables.map(s => (
                        <TableRow key={s.id} sx={s.dayOfWeek.toUpperCase() === today ? { bgcolor: '#E3F2FD' } : {}}>
                          <TableCell>{getDayName(s.dayOfWeek)}</TableCell>
                          <TableCell>{s.className}</TableCell>
                          <TableCell>{formatTime(s.startTime)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeacherDashboardPage;
