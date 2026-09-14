import React, { useEffect } from 'react';
import {
  Box, Paper, Typography, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchConflicts } from '../../store/slices/timetableSlice';
import { TimetableConflictType } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatTime, getDayName } from '../../utils/formatters';

const typeLabel: Record<TimetableConflictType, string> = {
  TEACHER_DOUBLE_BOOKED: 'Teacher Double-Booked',
  COURSE_OVERLAP: 'Course Overlap',
};

const typeColor: Record<TimetableConflictType, 'error' | 'warning' | 'info'> = {
  TEACHER_DOUBLE_BOOKED: 'error',
  COURSE_OVERLAP: 'info',
};

const ScheduleConflictsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { conflicts, loading } = useSelector((state: RootState) => state.timetables);

  useEffect(() => {
    dispatch(fetchConflicts());
  }, [dispatch]);

  return (
    <Box>
      <PageHeader
        title="Schedule Conflicts"
        subtitle="Teacher double-bookings and course slot overlaps"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Conflicts' }]}
      />

      {loading ? (
        <LoadingSpinner />
      ) : conflicts.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="success.main" fontWeight={600}>No conflicts detected.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {conflicts.map((c, i) => (
                <TableRow key={`${c.timetableId}-${c.otherTimetableId}-${i}`}>
                  <TableCell><Chip label={typeLabel[c.type]} color={typeColor[c.type]} size="small" /></TableCell>
                  <TableCell>{getDayName(c.dayOfWeek)}</TableCell>
                  <TableCell>{formatTime(c.startTime)} – {formatTime(c.endTime)}</TableCell>
                  <TableCell>{c.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ScheduleConflictsPage;
