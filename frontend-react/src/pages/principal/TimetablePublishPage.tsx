import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Paper, Typography, Chip, Alert, Snackbar, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import PublishIcon from '@mui/icons-material/Publish';
import UndoIcon from '@mui/icons-material/Undo';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTimetables, publishTimetable, unpublishTimetable } from '../../store/slices/timetableSlice';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import courseService from '../../services/courseService';
import { CourseClass } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatTime, getDayName } from '../../utils/formatters';

const TimetablePublishPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: timetables, loading } = useSelector((state: RootState) => state.timetables);
  const { list: teachers } = useSelector((state: RootState) => state.teachers);
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    dispatch(fetchTimetables());
    dispatch(fetchTeachers());
    courseService.getAllClasses().then(setClasses).catch(() => setClasses([]));
  }, [dispatch]);

  const classNameById = useMemo(
    () => new Map(classes.map(c => [c.id, c.className])),
    [classes],
  );
  const teacherNameById = useMemo(
    () => new Map(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`.trim()])),
    [teachers],
  );

  const draftCount = timetables.filter(s => s.status === 'DRAFT').length;
  const publishedCount = timetables.filter(s => s.status === 'PUBLISHED').length;

  const handleToggle = async (id: string, currentStatus?: string) => {
    try {
      if (currentStatus === 'PUBLISHED') {
        await dispatch(unpublishTimetable(id)).unwrap();
        setSnackbar({ open: true, message: 'Timetable entry moved to draft', severity: 'success' });
      } else {
        await dispatch(publishTimetable(id)).unwrap();
        setSnackbar({ open: true, message: 'Timetable entry published', severity: 'success' });
      }
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err), severity: 'error' });
    }
  };

  if (loading && timetables.length === 0) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Publish Timetable"
        subtitle="Publish draft timetable entries to make them visible to teachers and students"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Publish Timetable' }]}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined"><CardContent>
            <Typography variant="h4" fontWeight={700} color="warning.main">{draftCount}</Typography>
            <Typography color="text.secondary">Draft</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined"><CardContent>
            <Typography variant="h4" fontWeight={700} color="success.main">{publishedCount}</Typography>
            <Typography color="text.secondary">Published</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Room</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {timetables.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">No timetables found.</Typography>
              </TableCell></TableRow>
            ) : timetables.map(s => (
              <TableRow key={s.id}>
                <TableCell>{getDayName(s.dayOfWeek)}</TableCell>
                <TableCell>{s.className || classNameById.get(s.classId) || '-'}</TableCell>
                <TableCell>{s.teacherName || teacherNameById.get(s.teacherId) || '-'}</TableCell>
                <TableCell>{formatTime(s.startTime)} – {formatTime(s.endTime)}</TableCell>
                <TableCell>{s.roomName || '-'}</TableCell>
                <TableCell>
                  <Chip label={s.status || 'DRAFT'} size="small" color={s.status === 'PUBLISHED' ? 'success' : 'warning'} />
                </TableCell>
                <TableCell align="center">
                  {s.status === 'PUBLISHED' ? (
                    <Button size="small" startIcon={<UndoIcon />} onClick={() => handleToggle(s.id, s.status)}>Unpublish</Button>
                  ) : (
                    <Button size="small" startIcon={<PublishIcon />} onClick={() => handleToggle(s.id, s.status)}>Publish</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TimetablePublishPage;
