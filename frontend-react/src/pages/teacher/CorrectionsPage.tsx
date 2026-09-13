import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Grid, Paper, MenuItem, Chip, Alert, Snackbar,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherTimetables } from '../../store/slices/timetableSlice';
import { editStudentAttendance } from '../../store/slices/correctionSlice';
import attendanceService, { AttendanceEdit } from '../../services/attendanceService';
import { StudentAttendance, AttendanceStatus } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import { format } from 'date-fns';

const STATUS_OPTIONS: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY'];

const statusColors: Record<AttendanceStatus, 'success' | 'error' | 'warning' | 'default'> = {
  PRESENT: 'success', ABSENT: 'error', LEAVE: 'warning', HALF_DAY: 'default',
};

const CorrectionsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { teacherTimetables } = useSelector((state: RootState) => state.timetables);
  const { loading } = useSelector((state: RootState) => state.corrections);

  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [records, setRecords] = useState<StudentAttendance[]>([]);
  const [edited, setEdited] = useState<Record<string, AttendanceStatus>>({});
  const [reason, setReason] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchTeacherTimetables(user.id));
    }
  }, [dispatch, user]);

  const loadRecords = async (cid: string, d: string) => {
    if (!cid || !d) { setRecords([]); setEdited({}); return; }
    try {
      const data = await attendanceService.getClassAttendanceForDate(cid, d);
      setRecords(data);
      setEdited(Object.fromEntries(data.map(r => [r.id, r.status])));
    } catch {
      setRecords([]);
      setEdited({});
    }
  };

  const handleStatusChange = (recordId: string, newStatus: AttendanceStatus) => {
    setEdited(prev => ({ ...prev, [recordId]: newStatus }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    const edits: AttendanceEdit[] = records
      .filter(r => edited[r.id] && edited[r.id] !== r.status)
      .map(r => ({ attendanceId: r.id, newStatus: edited[r.id] }));

    if (edits.length === 0) {
      setSnackbar({ open: true, message: 'No changes to save', severity: 'error' });
      return;
    }

    try {
      await dispatch(editStudentAttendance({
        editedByUserId: user.id,
        editorRole: 'TEACHER',
        reason,
        edits,
      })).unwrap();
      setSnackbar({ open: true, message: `${edits.length} attendance edit(s) saved`, severity: 'success' });
      await loadRecords(classId, date);
      setReason('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || String(err) || 'Failed to save', severity: 'error' });
    }
  };

  const uniqueClasses = [...new Map(teacherTimetables.map(s => [s.classId, s])).values()];

  return (
    <Box>
      <PageHeader
        title="Attendance Corrections"
        subtitle="Directly edit past attendance records for your classes"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'Corrections' }]}
      />

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={4}>
            <TextField select label="Class" size="small" fullWidth value={classId}
              onChange={e => { setClassId(e.target.value); loadRecords(e.target.value, date); }}>
              {uniqueClasses.map(s => (
                <MenuItem key={s.classId} value={s.classId}>{s.className} – {s.courseName}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Date" type="date" size="small" fullWidth value={date}
              onChange={e => { setDate(e.target.value); loadRecords(classId, e.target.value); }}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Reason" size="small" fullWidth value={reason}
              onChange={e => setReason(e.target.value)} placeholder="Reason for corrections (optional)" />
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        {records.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
            No attendance records for this class/date.
          </Box>
        ) : (
          <Grid container spacing={2}>
            {records.map(r => (
              <Grid item xs={12} key={r.id}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box sx={{ flex: 1 }}>{r.studentName ?? r.studentId}</Box>
                  <Chip label={r.status} color={statusColors[r.status] ?? 'default'} size="small" />
                  <TextField select label="New Status" size="small" sx={{ minWidth: 160 }}
                    value={edited[r.id] ?? r.status}
                    onChange={e => handleStatusChange(r.id, e.target.value as AttendanceStatus)}>
                    {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}
        disabled={loading || records.length === 0}>
        Save Changes
      </Button>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CorrectionsPage;
