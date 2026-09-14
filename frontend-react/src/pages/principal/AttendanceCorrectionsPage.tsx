import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Grid, Paper, MenuItem, Chip, Alert, Snackbar,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { editStudentAttendance, editTeacherAttendance } from '../../store/slices/correctionSlice';
import attendanceService, { AttendanceEdit } from '../../services/attendanceService';
import timetableService from '../../services/timetableService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import { StudentAttendance, TeacherAttendance, AttendanceStatus, Timetable } from '../../types';
import { formatDateTime, getDayName, formatTime } from '../../utils/formatters';
import { format } from 'date-fns';

const STATUS_OPTIONS: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY'];

const statusColors: Record<AttendanceStatus, 'success' | 'error' | 'warning' | 'default'> = {
  PRESENT: 'success', ABSENT: 'error', LEAVE: 'warning', HALF_DAY: 'default',
};

type CorrectionMode = 'STUDENT' | 'TEACHER';

interface EditableRow {
  id: string;
  label: string;
  status: AttendanceStatus;
}

const AttendanceCorrectionsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { corrections, loading } = useSelector((state: RootState) => state.corrections);

  const [mode, setMode] = useState<CorrectionMode>('STUDENT');
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [edited, setEdited] = useState<Record<string, AttendanceStatus>>({});
  const [reason, setReason] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    timetableService.getAll().then(setTimetables).catch(() => setTimetables([]));
  }, []);

  const toRows = (
    m: CorrectionMode,
    student: StudentAttendance[],
    teacher: TeacherAttendance[]
  ): EditableRow[] =>
    m === 'STUDENT'
      ? student.map(r => ({ id: r.id, label: r.studentName ?? r.studentId, status: r.status }))
      : teacher.map(r => ({ id: r.id, label: r.teacherName ?? r.teacherId, status: r.status as AttendanceStatus }));

  const loadRecords = async (m: CorrectionMode, cid: string, d: string) => {
    if (!cid || !d) { setRows([]); setEdited({}); return; }
    try {
      const data = m === 'STUDENT'
        ? toRows(m, await attendanceService.getTimetableAttendanceForDate(cid, d), [])
        : toRows(m, [], await attendanceService.getTeacherTimetableAttendanceForDate(cid, d));
      setRows(data);
      setEdited(Object.fromEntries(data.map(r => [r.id, r.status])));
    } catch {
      setRows([]);
      setEdited({});
    }
  };

  const handleModeChange = (_e: React.MouseEvent<HTMLElement>, next: CorrectionMode | null) => {
    if (!next) return;
    setMode(next);
    loadRecords(next, classId, date);
  };

  const handleStatusChange = (recordId: string, newStatus: AttendanceStatus) => {
    setEdited(prev => ({ ...prev, [recordId]: newStatus }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    const edits: AttendanceEdit[] = rows
      .filter(r => edited[r.id] && edited[r.id] !== r.status)
      .map(r => ({ attendanceId: r.id, newStatus: edited[r.id] }));

    if (edits.length === 0) {
      setSnackbar({ open: true, message: 'No changes to save', severity: 'error' });
      return;
    }

    try {
      const thunk = mode === 'STUDENT' ? editStudentAttendance : editTeacherAttendance;
      await dispatch(thunk({
        editedByUserId: user.id,
        editorRole: 'PRINCIPAL',
        reason,
        edits,
      })).unwrap();
      setSnackbar({ open: true, message: `${edits.length} attendance edit(s) saved`, severity: 'success' });
      await loadRecords(mode, classId, date);
      setReason('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || String(err) || 'Failed to save', severity: 'error' });
    }
  };

  const historyColumns: Column<Record<string, unknown>>[] = [
    { id: 'attendanceDate', label: 'Date', minWidth: 110 },
    { id: 'attendanceType', label: 'Type', minWidth: 100 },
    {
      id: 'newStatus', label: 'Change', minWidth: 160,
      format: (_v, row) => {
        const c = row as unknown as { oldStatus: string; newStatus: string };
        return `${c.oldStatus} → ${c.newStatus}`;
      },
    },
    { id: 'reason', label: 'Reason', minWidth: 180, format: (v) => (v as string) || '-' },
    { id: 'editorRole', label: 'Editor', minWidth: 110 },
    { id: 'editedAt', label: 'Edited At', minWidth: 160, format: (v) => formatDateTime(v as string) },
  ];

  return (
    <Box>
      <PageHeader
        title="Attendance Corrections"
        subtitle="Directly edit past student or teacher attendance records"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Attendance Corrections' }]}
      />

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={handleModeChange}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="STUDENT">Student</ToggleButton>
          <ToggleButton value="TEACHER">Teacher</ToggleButton>
        </ToggleButtonGroup>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={4}>
            <TextField select label="Timetable Slot" size="small" fullWidth value={classId}
              onChange={e => { setClassId(e.target.value); loadRecords(mode, e.target.value, date); }}>
              {timetables.map(t => (
                <MenuItem key={t.id} value={t.id}>
                  {(t.courseName || t.courseId)} – {getDayName(t.dayOfWeek)} {formatTime(t.startTime)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Date" type="date" size="small" fullWidth value={date}
              onChange={e => { setDate(e.target.value); loadRecords(mode, classId, e.target.value); }}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Reason" size="small" fullWidth value={reason}
              onChange={e => setReason(e.target.value)} placeholder="Reason for corrections (optional)" />
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        {rows.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
            No {mode === 'STUDENT' ? 'student' : 'teacher'} attendance records for this slot/date.
          </Box>
        ) : (
          <Grid container spacing={2}>
            {rows.map(r => (
              <Grid item xs={12} key={r.id}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box sx={{ flex: 1 }}>{r.label}</Box>
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
        disabled={loading || rows.length === 0} sx={{ mb: 3 }}>
        Save Changes
      </Button>

      <DataTable
        columns={historyColumns}
        rows={corrections as unknown as Record<string, unknown>[]}
        searchable
        searchPlaceholder="Search correction history..."
        emptyMessage="No corrections recorded yet."
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AttendanceCorrectionsPage;
