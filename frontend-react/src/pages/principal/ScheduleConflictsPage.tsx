import React, { useEffect } from 'react';
import {
  Box, Paper, Typography, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchConflicts } from '../../store/slices/scheduleSlice';
import { ScheduleConflictType } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatTime, getDayName } from '../../utils/formatters';

const typeLabel: Record<ScheduleConflictType, string> = {
  TEACHER_DOUBLE_BOOKED: 'Teacher Double-Booked',
  ROOM_DOUBLE_BOOKED: 'Room Double-Booked',
  CLASS_OVERLAP: 'Class Overlap',
};

const typeColor: Record<ScheduleConflictType, 'error' | 'warning' | 'info'> = {
  TEACHER_DOUBLE_BOOKED: 'error',
  ROOM_DOUBLE_BOOKED: 'warning',
  CLASS_OVERLAP: 'info',
};

const ScheduleConflictsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { conflicts, loading } = useSelector((state: RootState) => state.schedules);

  useEffect(() => {
    dispatch(fetchConflicts());
  }, [dispatch]);

  return (
    <Box>
      <PageHeader
        title="Schedule Conflicts"
        subtitle="Teacher/room double-bookings and class overlaps"
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
                <TableRow key={`${c.scheduleId}-${c.otherScheduleId}-${i}`}>
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
