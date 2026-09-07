import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Grid, Paper, Typography, Chip, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Snackbar,
  FormControl, InputLabel, Select,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherSchedules } from '../../store/slices/scheduleSlice';
import { markStudentAttendance, fetchStudentAttendance } from '../../store/slices/attendanceSlice';
import studentService from '../../services/studentService';
import { Student, StudentAttendance, Schedule } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

interface AttendanceEntry {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  remarks: string;
}

const AttendancePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { teacherSchedules } = useSelector((state: RootState) => state.schedules);
  const [selectedClass, setSelectedClass] = useState<Schedule | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (user?.id) dispatch(fetchTeacherSchedules(user.id));
  }, [dispatch, user]);

  const handleClassChange = async (classId: string) => {
    const schedule = teacherSchedules.find(s => s.classId === classId) || null;
    setSelectedClass(schedule);
    if (schedule) {
      setLoading(true);
      try {
        const data = await studentService.getByClass(schedule.classId);
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
    PRESENT: 'success', ABSENT: 'error', LATE: 'warning', EXCUSED: 'default',
  };

  return (
    <Box>
      <PageHeader
        title="Mark Attendance"
        subtitle="Record student attendance for your classes"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'Attendance' }]}
      />

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              select label="Select Class" size="small" fullWidth
              onChange={e => handleClassChange(e.target.value)}
            >
              {[...new Map(teacherSchedules.map(s => [s.classId, s])).values()].map(s => (
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
                        {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as AttendanceStatus[]).map(s => (
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
    </Box>
  );
};

export default AttendancePage;
