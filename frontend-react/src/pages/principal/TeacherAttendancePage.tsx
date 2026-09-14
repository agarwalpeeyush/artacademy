import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Grid, Paper, MenuItem, Chip, Alert, Snackbar, Autocomplete,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import attendanceService from '../../services/attendanceService';
import timetableService from '../../services/timetableService';
import { Teacher, TeacherAttendance, Timetable } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import { getDayName, formatTime } from '../../utils/formatters';
import { format } from 'date-fns';

type TeacherStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';

const statusColors: Record<TeacherStatus, 'success' | 'error' | 'warning' | 'default'> = {
  PRESENT: 'success', ABSENT: 'error', HALF_DAY: 'warning', LEAVE: 'default',
};

const TeacherAttendancePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: teachers } = useSelector((state: RootState) => state.teachers);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [slots, setSlots] = useState<Timetable[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Timetable | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<TeacherStatus>('PRESENT');
  const [remarks, setRemarks] = useState('');
  const [records, setRecords] = useState<TeacherAttendance[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    dispatch(fetchTeachers());
  }, [dispatch]);

  const loadRecords = async (teacherId: string) => {
    try {
      const rows = await attendanceService.getTeacherAttendance({ teacherId });
      setRecords(rows);
    } catch {
      setRecords([]);
    }
  };

  const handleTeacherChange = (t: Teacher | null) => {
    setTeacher(t);
    setSelectedSlot(null);
    if (t?.id) {
      loadRecords(t.id);
      timetableService.getByTeacher(t.id).then(setSlots).catch(() => setSlots([]));
    } else {
      setRecords([]);
      setSlots([]);
    }
  };

  const handleSave = async () => {
    if (!teacher?.id) {
      setSnackbar({ open: true, message: 'Please select a teacher', severity: 'error' });
      return;
    }
    if (!selectedSlot) {
      setSnackbar({ open: true, message: 'Please select a timetable slot', severity: 'error' });
      return;
    }
    try {
      await attendanceService.markTeacherAttendance({
        teacherId: teacher.id, timetableId: selectedSlot.id, courseId: selectedSlot.courseId,
        date, status, remarks,
      });
      setSnackbar({ open: true, message: 'Teacher attendance saved successfully', severity: 'success' });
      loadRecords(teacher.id);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Failed to save attendance', severity: 'error' });
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
        title="Teacher Attendance"
        subtitle="Mark or override attendance for teaching staff"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Teacher Attendance' }]}
      />

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={3}>
            <Autocomplete
              size="small"
              options={teachers}
              value={teacher}
              onChange={(_e, v) => handleTeacherChange(v)}
              getOptionLabel={(t) => `${t.firstName} ${t.lastName}`.trim() || t.loginId || ''}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => <TextField {...params} label="Teacher" />}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select label="Timetable Slot" size="small" fullWidth
              value={selectedSlot?.id ?? ''}
              onChange={e => setSelectedSlot(slots.find(s => s.id === e.target.value) || null)}
              disabled={!teacher}
            >
              {slots.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {(s.courseName || s.courseId)} – {getDayName(s.dayOfWeek)} {formatTime(s.startTime)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label="Date" type="date" size="small" fullWidth value={date}
              onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField select label="Status" size="small" fullWidth value={status}
              onChange={e => setStatus(e.target.value as TeacherStatus)}>
              {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] as TeacherStatus[]).map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={12}>
            <Box display="flex" gap={2} alignItems="flex-end">
              <TextField label="Remarks" size="small" fullWidth value={remarks}
                onChange={e => setRemarks(e.target.value)} placeholder="Optional" />
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={{ whiteSpace: 'nowrap' }}>
                Save
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <DataTable
        columns={columns}
        rows={records as unknown as Record<string, unknown>[]}
        searchable={false}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TeacherAttendancePage;
