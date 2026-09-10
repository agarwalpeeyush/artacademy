import React, { useEffect, useState } from 'react';
import {
  Box, Grid, TextField, MenuItem, Paper, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMyChildren } from '../../store/slices/parentSlice';
import { UpcomingClass } from '../../types';
import timetableService from '../../services/timetableService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, formatTime, getDayName } from '../../utils/formatters';

const UpcomingClassesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { children } = useSelector((state: RootState) => state.parents);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [upcoming, setUpcoming] = useState<UpcomingClass[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchMyChildren());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedStudent && children.length > 0) {
      setSelectedStudent(children[0].studentId);
    }
  }, [children, selectedStudent]);

  useEffect(() => {
    if (!selectedStudent) return;
    setLoading(true);
    timetableService.getUpcomingForStudent(selectedStudent, 10)
      .then(setUpcoming)
      .catch(() => setUpcoming([]))
      .finally(() => setLoading(false));
  }, [selectedStudent]);

  return (
    <Box>
      <PageHeader
        title="Upcoming Classes"
        subtitle="Your child's next scheduled sessions"
        breadcrumbs={[{ label: 'Parent' }, { label: 'Upcoming Classes' }]}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <TextField select label="Child" size="small" fullWidth value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}>
            {children.map(c => (
              <MenuItem key={c.studentId} value={c.studentId}>{c.studentName || c.studentId}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

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
