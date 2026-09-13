import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Grid, Paper, Typography, Chip, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherTimetables } from '../../store/slices/timetableSlice';
import { markStudentAttendance } from '../../store/slices/attendanceSlice';
import studentService from '../../services/studentService';
import attendanceService, { CoverUpStudentEntry } from '../../services/attendanceService';
import { Student, StudentAttendance, Timetable, AttendanceStatus } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';

interface AttendanceEntry {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  remarks: string;
}

interface CoverUpRow {
  studentId: string;
  studentName: string;
  selected: boolean;
  status: AttendanceStatus;
}

const AttendancePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { teacherTimetables } = useSelector((state: RootState) => state.timetables);
  const [selectedClass, setSelectedClass] = useState<Timetable | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const [coverUpOpen, setCoverUpOpen] = useState(false);
  const [coverUpClass, setCoverUpClass] = useState<Timetable | null>(null);
  const [coverUpDate, setCoverUpDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [coverUpStart, setCoverUpStart] = useState('');
  const [coverUpEnd, setCoverUpEnd] = useState('');
  const [coverUpRows, setCoverUpRows] = useState<CoverUpRow[]>([]);
  const [coverUpLoading, setCoverUpLoading] = useState(false);
  const [coverUpSaving, setCoverUpSaving] = useState(false);

  const uniqueClasses = [...new Map(teacherTimetables.map(s => [s.classId, s])).values()];

  useEffect(() => {
    if (user?.id) dispatch(fetchTeacherTimetables(user.id));
  }, [dispatch, user]);

  const handleClassChange = async (classId: string) => {
    const timetable = teacherTimetables.find(s => s.classId === classId) || null;
    setSelectedClass(timetable);
    if (timetable) {
      setLoading(true);
      try {
        const data = await studentService.getByClass(timetable.classId);
        setStudents(data);
        setEntries(data.map(s => ({ studentId: s.id, studentName: `${s.firstName} ${s.lastName}`, status: 'PRESENT', remarks: '' })));
      } catch { setStudents([]); setEntries([]); }
      finally { setLoading(false); }
    }
  };

  const updateEntry = (studentId: string, field: keyof AttendanceEntry, value: string) => {
    setEntries(prev => prev.map(e => e.studentId === studentId ? { ...e, [field]: value } : e));
  };

  const markAll = (status: AttendanceStatus) => {
    setEntries(prev => prev.map(e => ({ ...e, status })));
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    try {
      const payload: StudentAttendance[] = entries.map(e => ({
        id: '', studentId: e.studentId, classId: selectedClass.classId, date, status: e.status, remarks: e.remarks,
      }));
      await dispatch(markStudentAttendance(payload)).unwrap();
      setSnackbar({ open: true, message: 'Attendance saved successfully', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Failed to save attendance', severity: 'error' });
    }
  };

  const statusColors: Record<AttendanceStatus, 'success' | 'error' | 'warning' | 'default'> = {
    PRESENT: 'success', ABSENT: 'error', LEAVE: 'warning', HALF_DAY: 'default',
  };

  const openCoverUp = () => {
    setCoverUpClass(selectedClass);
    setCoverUpRows([]);
    setCoverUpStart('');
    setCoverUpEnd('');
    setCoverUpDate(format(new Date(), 'yyyy-MM-dd'));
    setCoverUpOpen(true);
    if (selectedClass) loadCoverUpRoster(selectedClass.classId);
  };

  const loadCoverUpRoster = async (classId: string) => {
    setCoverUpLoading(true);
    try {
      const data = await studentService.getByClass(classId);
      setCoverUpRows(data.map(s => ({
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        selected: false,
        status: 'PRESENT' as AttendanceStatus,
      })));
    } catch {
      setCoverUpRows([]);
    } finally {
      setCoverUpLoading(false);
    }
  };

  const handleCoverUpClassChange = (classId: string) => {
    const cls = uniqueClasses.find(c => c.classId === classId) || null;
    setCoverUpClass(cls);
    if (cls) loadCoverUpRoster(cls.classId);
    else setCoverUpRows([]);
  };

  const toggleCoverUpRow = (studentId: string, field: 'selected' | 'status', value: boolean | AttendanceStatus) => {
    setCoverUpRows(prev => prev.map(r => r.studentId === studentId ? { ...r, [field]: value } : r));
  };

  const handleCoverUpSave = async () => {
    if (!coverUpClass) {
      setSnackbar({ open: true, message: 'Please select a class', severity: 'error' });
      return;
    }
    const students: CoverUpStudentEntry[] = coverUpRows
      .filter(r => r.selected)
      .map(r => ({ studentId: r.studentId, status: r.status }));
    if (students.length === 0) {
      setSnackbar({ open: true, message: 'Select at least one student', severity: 'error' });
      return;
    }
    setCoverUpSaving(true);
    try {
      await attendanceService.markCoverUp({
        classId: coverUpClass.classId,
        courseId: coverUpClass.courseId,
        sessionDate: coverUpDate,
        startTime: coverUpStart || undefined,
        endTime: coverUpEnd || undefined,
        students,
      });
      setSnackbar({ open: true, message: `Cover-up class recorded for ${students.length} student(s)`, severity: 'success' });
      setCoverUpOpen(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Failed to record cover-up class', severity: 'error' });
    } finally {
      setCoverUpSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Mark Attendance"
        subtitle="Record student attendance for your classes"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'Attendance' }]}
      />

      <Box display="flex" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="outlined" startIcon={<EventRepeatIcon />} onClick={openCoverUp}>
          Add Extra / Cover-up Class
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              select label="Select Class" size="small" fullWidth
              onChange={e => handleClassChange(e.target.value)}
            >
              {uniqueClasses.map(s => (
                <MenuItem key={s.classId} value={s.classId}>{s.className} – {s.courseName}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Date" type="date" size="small" fullWidth value={date}
              onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box display="flex" gap={1}>
              <Button size="small" variant="outlined" color="success" onClick={() => markAll('PRESENT')}>All Present</Button>
              <Button size="small" variant="outlined" color="error" onClick={() => markAll('ABSENT')}>All Absent</Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading ? <LoadingSpinner /> : selectedClass && entries.length > 0 ? (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry, idx) => (
                  <TableRow key={entry.studentId}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{entry.studentName}</TableCell>
                    <TableCell>
                      <TextField
                        select size="small" value={entry.status}
                        onChange={e => updateEntry(entry.studentId, 'status', e.target.value)}
                        sx={{ minWidth: 120 }}
                      >
                        {(['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY'] as AttendanceStatus[]).map(s => (
                          <MenuItem key={s} value={s}>
                            <Chip label={s} color={statusColors[s]} size="small" />
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small" placeholder="Optional remarks" value={entry.remarks}
                        onChange={e => updateEntry(entry.studentId, 'remarks', e.target.value)}
                        sx={{ minWidth: 180 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box display="flex" justifyContent="flex-end">
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} size="large">
              Save Attendance ({entries.length} students)
            </Button>
          </Box>
        </>
      ) : selectedClass ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No students enrolled in this class.</Typography>
        </Paper>
      ) : null}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>

      <Dialog open={coverUpOpen} onClose={() => setCoverUpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Extra / Cover-up Class</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12}>
              <TextField
                select label="Class" size="small" fullWidth
                value={coverUpClass?.classId ?? ''}
                onChange={e => handleCoverUpClassChange(e.target.value)}
              >
                {uniqueClasses.map(s => (
                  <MenuItem key={s.classId} value={s.classId}>{s.className} – {s.courseName}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Date" type="date" size="small" fullWidth value={coverUpDate}
                onChange={e => setCoverUpDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField label="Start" type="time" size="small" fullWidth value={coverUpStart}
                onChange={e => setCoverUpStart(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField label="End" type="time" size="small" fullWidth value={coverUpEnd}
                onChange={e => setCoverUpEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>Attendees</Typography>
          {coverUpLoading ? (
            <LoadingSpinner />
          ) : coverUpRows.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              {coverUpClass ? 'No students enrolled in this class.' : 'Select a class to load its roster.'}
            </Typography>
          ) : (
            coverUpRows.map(r => (
              <Box key={r.studentId} display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
                <FormControlLabel
                  sx={{ flex: 1, mr: 0 }}
                  control={
                    <Checkbox
                      checked={r.selected}
                      onChange={e => toggleCoverUpRow(r.studentId, 'selected', e.target.checked)}
                    />
                  }
                  label={r.studentName}
                />
                <TextField
                  select size="small" label="Status" sx={{ minWidth: 140 }}
                  value={r.status} disabled={!r.selected}
                  onChange={e => toggleCoverUpRow(r.studentId, 'status', e.target.value as AttendanceStatus)}
                >
                  {(['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY'] as AttendanceStatus[]).map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCoverUpOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleCoverUpSave} disabled={coverUpSaving}>
            Record Cover-up
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendancePage;
