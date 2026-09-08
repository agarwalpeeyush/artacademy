import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Grid, Paper, MenuItem, Chip, Alert, Snackbar,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherAttendance } from '../../store/slices/attendanceSlice';
import attendanceService from '../../services/attendanceService';
import { TeacherAttendance } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import { format } from 'date-fns';

type TeacherStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';

const statusColors: Record<TeacherStatus, 'success' | 'error' | 'warning' | 'default'> = {
  PRESENT: 'success', ABSENT: 'error', LATE: 'warning', LEAVE: 'default',
};

const MyAttendancePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { teacherAttendance } = useSelector((state: RootState) => state.attendance);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<TeacherStatus>('PRESENT');
  const [remarks, setRemarks] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (user?.id) dispatch(fetchTeacherAttendance({ teacherId: user.id }));
  }, [dispatch, user]);

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      await attendanceService.markTeacherAttendance({ teacherId: user.id, date, status, remarks } as Omit<TeacherAttendance, 'id'>);
      setSnackbar({ open: true, message: 'Attendance marked successfully', severity: 'success' });
      dispatch(fetchTeacherAttendance({ teacherId: user.id }));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Failed to mark attendance', severity: 'error' });
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'date', label: 'Date', minWidth: 120 },
    {
      id: 'status', label: 'Status', minWidth: 120,
      format: (v) => <Chip label={String(v)} color={statusColors[v as TeacherStatus] ?? 'default'} size="small" />,
    },
    { id: 'remarks', label: 'Remarks', minWidth: 200 },
  ];

  return (
    <Box>
      <PageHeader
        title="My Attendance"
        subtitle="Mark and review your own attendance"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'My Attendance' }]}
      />

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={3}>
            <TextField
              label="Date" type="date" size="small" fullWidth value={date}
              onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField select label="Status" size="small" fullWidth value={status}
              onChange={e => setStatus(e.target.value as TeacherStatus)}>
              {(['PRESENT', 'ABSENT', 'LATE', 'LEAVE'] as TeacherStatus[]).map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField label="Remarks" size="small" fullWidth value={remarks}
              onChange={e => setRemarks(e.target.value)} placeholder="Optional" />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button variant="contained" fullWidth startIcon={<SaveIcon />} onClick={handleSave}>
              Mark Attendance
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <DataTable
        columns={columns}
        rows={teacherAttendance as unknown as Record<string, unknown>[]}
        searchable={false}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default MyAttendancePage;
