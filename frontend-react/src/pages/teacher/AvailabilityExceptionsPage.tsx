import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField,
  FormControlLabel, Checkbox, Paper, Typography, Chip, Alert, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { TeacherAvailabilityException } from '../../types';
import teacherService from '../../services/teacherService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, formatTime } from '../../utils/formatters';
import { format } from 'date-fns';

const AvailabilityExceptionsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const teacherId = user?.id;
  const [exceptions, setExceptions] = useState<TeacherAvailabilityException[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
    unavailableAllDay: true,
    startTime: '09:00',
    endTime: '10:00',
  });

  const load = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      setExceptions(await teacherService.getAvailabilityExceptions(teacherId));
    } catch {
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!teacherId) return;
    try {
      await teacherService.addAvailabilityException(teacherId, {
        date: form.date,
        reason: form.reason || undefined,
        unavailableAllDay: form.unavailableAllDay,
        startTime: form.unavailableAllDay ? undefined : form.startTime,
        endTime: form.unavailableAllDay ? undefined : form.endTime,
      });
      setSnackbar({ open: true, message: 'Exception added', severity: 'success' });
      setDialogOpen(false);
      setForm({ date: format(new Date(), 'yyyy-MM-dd'), reason: '', unavailableAllDay: true, startTime: '09:00', endTime: '10:00' });
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Failed to add exception', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!teacherId) return;
    try {
      await teacherService.deleteAvailabilityException(teacherId, id);
      setSnackbar({ open: true, message: 'Exception removed', severity: 'success' });
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Delete failed', severity: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Availability Exceptions"
        subtitle="One-off unavailable dates (leave, sick days) outside your weekly availability"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'Availability Exceptions' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Add Exception
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : exceptions.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No availability exceptions recorded.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Scope</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exceptions.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{formatDate(e.date)}</TableCell>
                  <TableCell>
                    {e.unavailableAllDay
                      ? <Chip label="All day" size="small" color="error" />
                      : <Chip label={`${formatTime(e.startTime)} – ${formatTime(e.endTime)}`} size="small" color="warning" />}
                  </TableCell>
                  <TableCell>{e.reason || '-'}</TableCell>
                  <TableCell align="center">
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(e.id)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Availability Exception</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField label="Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Reason" fullWidth size="small"
                value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox checked={form.unavailableAllDay} onChange={e => setForm(f => ({ ...f, unavailableAllDay: e.target.checked }))} />}
                label="Unavailable all day"
              />
            </Grid>
            {!form.unavailableAllDay && (
              <>
                <Grid item xs={6}>
                  <TextField label="Start Time" type="time" fullWidth size="small" InputLabelProps={{ shrink: true }}
                    value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="End Time" type="time" fullWidth size="small" InputLabelProps={{ shrink: true }}
                    value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleAdd} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AvailabilityExceptionsPage;
