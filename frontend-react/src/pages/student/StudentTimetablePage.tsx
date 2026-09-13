import React, { useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchStudentTimetables } from '../../store/slices/timetableSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getDayName, formatTime } from '../../utils/formatters';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const StudentTimetablePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { studentTimetables, loading } = useSelector((state: RootState) => state.timetables);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  useEffect(() => {
    if (user?.id) dispatch(fetchStudentTimetables(user.id));
  }, [dispatch, user]);

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Class Timetable"
        subtitle="Your weekly class timetable"
        breadcrumbs={[{ label: 'Student' }, { label: 'Timetable' }]}
      />

      {studentTimetables.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No timetable available. Please contact administration.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Course</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DAYS.flatMap(day => {
                const dayTimetables = studentTimetables.filter(s => s.dayOfWeek.toUpperCase() === day);
                return dayTimetables.map((s, idx) => (
                  <TableRow key={s.id} sx={day === today ? { bgcolor: '#E3F2FD' } : {}}>
                    {idx === 0 && (
                      <TableCell
                        rowSpan={dayTimetables.length}
                        sx={{ fontWeight: day === today ? 700 : 400, color: day === today ? 'primary.main' : 'inherit', verticalAlign: 'middle' }}
                      >
                        {getDayName(day)}
                        {day === today && <Chip label="Today" color="primary" size="small" sx={{ ml: 1, display: 'block', mt: 0.5 }} />}
                      </TableCell>
                    )}
                    <TableCell>{s.className}</TableCell>
                    <TableCell>{s.courseName || '-'}</TableCell>
                    <TableCell>{s.teacherName}</TableCell>
                    <TableCell><strong>{formatTime(s.startTime)}</strong> – {formatTime(s.endTime)}</TableCell>
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default StudentTimetablePage;
