import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Grid, Paper, MenuItem, Chip, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherTimetables } from '../../store/slices/timetableSlice';
import { submitCorrection, fetchTeacherCorrections } from '../../store/slices/correctionSlice';
import attendanceService from '../../services/attendanceService';
import { StudentAttendance, AttendanceStatus, CorrectionStatus } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import { format } from 'date-fns';

const correctionStatusColors: Record<CorrectionStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error',
};

const STATUS_OPTIONS: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY'];

const CorrectionsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { teacherTimetables } = useSelector((state: RootState) => state.timetables);
  const { corrections } = useSelector((state: RootState) => state.corrections);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [records, setRecords] = useState<StudentAttendance[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [requestedStatus, setRequestedStatus] = useState<AttendanceStatus>('PRESENT');
  const [reason, setReason] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchTeacherTimetables(user.id));
      dispatch(fetchTeacherCorrections(user.id));
    }
  }, [dispatch, user]);

  const loadRecords = async (cid: string, d: string) => {
    if (!cid || !d) { setRecords([]); return; }
    try {
      const data = await attendanceService.getClassAttendanceForDate(cid, d);
      setRecords(data);
      setSelectedRecordId('');
    } catch {
      setRecords([]);
    }
  };

  const openDialog = () => {
    setClassId(''); setRecords([]); setSelectedRecordId(''); setReason(''); setRequestedStatus('PRESENT');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user?.id || !selectedRecordId) return;
    try {
      await dispatch(submitCorrection({
        studentAttendanceId: selectedRecordId,
        requestedStatus,
        reason,
        requestedByTeacherId: user.id,
      })).unwrap();
      setSnackbar({ open: true, message: 'Correction request submitted', severity: 'success' });
      setDialogOpen(false);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Failed to submit', severity: 'error' });
    }
  };

  const uniqueClasses = [...new Map(teacherTimetables.map(s => [s.classId, s])).values()];

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'attendanceDate', label: 'Date', minWidth: 110 },
    { id: 'studentId', label: 'Student', minWidth: 160 },
    { id: 'requestedStatus', label: 'Requested', minWidth: 110 },
    { id: 'reason', label: 'Reason', minWidth: 180 },
    {
      id: 'status', label: 'Status', minWidth: 110,
      format: (v) => <Chip label={String(v)} color={correctionStatusColors[v as CorrectionStatus] ?? 'default'} size="small" />,
    },
    { id: 'reviewNote', label: 'Review Note', minWidth: 160 },
  ];

  return (
    <Box>
      <PageHeader
        title="Attendance Corrections"
        subtitle="Request corrections to past attendance records"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'Corrections' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>New Correction</Button>}
      />

      <DataTable
        columns={columns}
        rows={corrections as unknown as Record<string, unknown>[]}
        searchable
        searchPlaceholder="Search corrections..."
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Attendance Correction</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField select label="Class" size="small" fullWidth value={classId}
                onChange={e => { setClassId(e.target.value); loadRecords(e.target.value, date); }}>
                {uniqueClasses.map(s => (
                  <MenuItem key={s.classId} value={s.classId}>{s.className} – {s.courseName}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Date" type="date" size="small" fullWidth value={date}
                onChange={e => { setDate(e.target.value); loadRecords(classId, e.target.value); }}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField select label="Attendance Record" size="small" fullWidth value={selectedRecordId}
                onChange={e => setSelectedRecordId(e.target.value)}
                helperText={records.length === 0 ? 'No records for this class/date' : 'Pick the record to correct'}>
                {records.map(r => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.studentName ?? r.studentId} — {r.status}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Requested Status" size="small" fullWidth value={requestedStatus}
                onChange={e => setRequestedStatus(e.target.value as AttendanceStatus)}>
                {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Reason" size="small" fullWidth multiline minRows={2} value={reason}
                onChange={e => setReason(e.target.value)} placeholder="Why is this correction needed?" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!selectedRecordId}>Submit</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CorrectionsPage;
