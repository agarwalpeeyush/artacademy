import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { UpcomingClass } from '../../types';
import timetableService from '../../services/timetableService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, formatTime, getDayName } from '../../utils/formatters';

const UpcomingClassesPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [upcoming, setUpcoming] = useState<UpcomingClass[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    timetableService.getUpcomingForStudent(user.id, 10)
      .then(setUpcoming)
      .catch(() => setUpcoming([]))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <Box>
      <PageHeader
        title="Upcoming Classes"
        subtitle="Your next scheduled sessions"
        breadcrumbs={[{ label: 'Student' }, { label: 'Upcoming Classes' }]}
      />

      {loading ? (
        <LoadingSpinner />
      ) : upcoming.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No upcoming classes scheduled.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Room</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {upcoming.map((u, i) => (
                <TableRow key={`${u.timetableId}-${u.date}-${i}`}>
                  <TableCell><strong>{formatDate(u.date)}</strong></TableCell>
                  <TableCell>{getDayName(u.dayOfWeek)}</TableCell>
                  <TableCell>{formatTime(u.startTime)} – {formatTime(u.endTime)}</TableCell>
                  <TableCell>{u.className || '-'}</TableCell>
                  <TableCell>{u.teacherName || '-'}</TableCell>
                  <TableCell>{u.roomName || 'TBD'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default UpcomingClassesPage;
