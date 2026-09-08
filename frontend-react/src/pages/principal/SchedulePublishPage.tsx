import React, { useEffect, useState } from 'react';
import {
  Box, Button, Paper, Typography, Chip, Alert, Snackbar, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import PublishIcon from '@mui/icons-material/Publish';
import UndoIcon from '@mui/icons-material/Undo';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchSchedules, publishAllSchedules, publishSchedule, unpublishSchedule } from '../../store/slices/scheduleSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatTime, getDayName } from '../../utils/formatters';

const SchedulePublishPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: schedules, loading } = useSelector((state: RootState) => state.schedules);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    dispatch(fetchSchedules());
  }, [dispatch]);

  const draftCount = schedules.filter(s => s.status === 'DRAFT').length;
  const publishedCount = schedules.filter(s => s.status === 'PUBLISHED').length;

  const handlePublishAll = async () => {
    try {
      const version = await dispatch(publishAllSchedules()).unwrap();
      setSnackbar({ open: true, message: `Published timetable v${version.versionNumber} (${version.entryCount} entries)`, severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Publish failed', severity: 'error' });
    }
  };

  const handleToggle = async (id: string, currentStatus?: string) => {
    try {
      if (currentStatus === 'PUBLISHED') {
        await dispatch(unpublishSchedule(id)).unwrap();
        setSnackbar({ open: true, message: 'Schedule moved to draft', severity: 'success' });
      } else {
        await dispatch(publishSchedule(id)).unwrap();
        setSnackbar({ open: true, message: 'Schedule published', severity: 'success' });
      }
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err), severity: 'error' });
    }
  };

  if (loading && schedules.length === 0) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Publish Schedule"
        subtitle="Publish draft timetable entries to make them visible to teachers and students"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Publish Schedule' }]}
        action={
          <Button variant="contained" startIcon={<PublishIcon />} disabled={draftCount === 0} onClick={handlePublishAll}>
            Publish All Drafts
          </Button>
        }
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
            {schedules.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">No schedules found.</Typography>
              </TableCell></TableRow>
            ) : schedules.map(s => (
              <TableRow key={s.id}>
                <TableCell>{getDayName(s.dayOfWeek)}</TableCell>
                <TableCell>{s.className}</TableCell>
                <TableCell>{s.teacherName}</TableCell>
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

export default SchedulePublishPage;
