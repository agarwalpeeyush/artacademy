import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Grid, Paper, Typography, Chip, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Snackbar,
  Autocomplete, IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherTimetables } from '../../store/slices/timetableSlice';
import { markStudentAttendance } from '../../store/slices/attendanceSlice';
import studentService from '../../services/studentService';
import enrollmentService from '../../services/enrollmentService';
import { Student, StudentAttendance, Timetable, AttendanceStatus } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getDayName, formatTime } from '../../utils/formatters';
import { format } from 'date-fns';

interface AttendanceEntry {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  remarks: string;
  makeUp?: boolean;
}

const statusColors: Record<AttendanceStatus, 'success' | 'error' | 'warning' | 'default'> = {
  PRESENT: 'success', ABSENT: 'error', LEAVE: 'warning', HALF_DAY: 'default',
};

const AttendancePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { teacherTimetables } = useSelector((state: RootState) => state.timetables);
  const [selectedSlot, setSelectedSlot] = useState<Timetable | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [addStudent, setAddStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (user?.id) dispatch(fetchTeacherTimetables(user.id));
  }, [dispatch, user]);

  const handleSlotChange = async (slotId: string) => {
    const slot = teacherTimetables.find(s => s.id === slotId) || null;
    setSelectedSlot(slot);
    setAddStudent(null);
    if (slot) {
      setLoading(true);
      try {
        const [roster, allStudents] = await Promise.all([
          enrollmentService.getByTimetable(slot.id),
          studentService.getByCourse(slot.courseId),
        ]);
        setCourseStudents(allStudents);
        setEntries(roster.map(e => ({
          studentId: e.studentId,
          studentName: e.studentName || e.studentId,
          status: 'PRESENT',
          remarks: '',
        })));
      } catch { setCourseStudents([]); setEntries([]); }
      finally { setLoading(false); }
    } else {
      setCourseStudents([]);
      setEntries([]);
    }
  };

  const updateEntry = (studentId: string, field: keyof AttendanceEntry, value: string) => {
    setEntries(prev => prev.map(e => e.studentId === studentId ? { ...e, [field]: value } : e));
  };

  const markAll = (status: AttendanceStatus) => {
    setEntries(prev => prev.map(e => ({ ...e, status })));
  };

  // R11: add a student not on the base roster for a make-up session.
  const handleAddStudent = (student: Student | null) => {
    if (!student) return;
    if (entries.some(e => e.studentId === student.id)) {
      setSnackbar({ open: true, message: 'Student already in the list', severity: 'error' });
      setAddStudent(null);
      return;
    }
    setEntries(prev => [...prev, {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      status: 'PRESENT',
      remarks: '',
      makeUp: true,
    }]);
    setAddStudent(null);
  };

  const removeEntry = (studentId: string) => {
    setEntries(prev => prev.filter(e => e.studentId !== studentId));
  };

  const handleSave = async () => {
    if (!selectedSlot) return;
    try {
      const payload: StudentAttendance[] = entries.map(e => ({
        id: '', studentId: e.studentId, timetableId: selectedSlot.id, courseId: selectedSlot.courseId,
        date, attendanceDate: date, status: e.status, remarks: e.remarks,
      }));
      await dispatch(markStudentAttendance(payload)).unwrap();
      setSnackbar({ open: true, message: 'Attendance saved successfully', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Failed to save attendance', severity: 'error' });
    }
  };

  const addableStudents = courseStudents.filter(s => !entries.some(e => e.studentId === s.id));

  return (
    <Box>
      <PageHeader
        title="Mark Attendance"
        subtitle="Record student attendance for your timetable slots"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'Attendance' }]}
      />

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              select label="Select Timetable Slot" size="small" fullWidth
              value={selectedSlot?.id ?? ''}
              onChange={e => handleSlotChange(e.target.value)}
            >
              {teacherTimetables.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {(s.courseName || s.courseId)} – {getDayName(s.dayOfWeek)} {formatTime(s.startTime)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Date" type="date" size="small" fullWidth value={date}
              onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Autocomplete
              size="small"
              options={addableStudents}
              value={addStudent}
              onChange={(_e, v) => handleAddStudent(v)}
              getOptionLabel={(s) => `${s.firstName} ${s.lastName}`.trim()}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              disabled={!selectedSlot}
              renderInput={(params) => (
                <TextField {...params} label="Add student (make-up)" placeholder="Search…" InputProps={{
                  ...params.InputProps,
                  startAdornment: <PersonAddIcon fontSize="small" sx={{ mr: 0.5, color: 'action.active' }} />,
                }} />
              )}
            />
          </Grid>
        </Grid>
      </Paper>

      {selectedSlot && (
        <Box display="flex" gap={1} sx={{ mb: 2 }}>
          <Button size="small" variant="outlined" color="success" onClick={() => markAll('PRESENT')}>All Present</Button>
          <Button size="small" variant="outlined" color="error" onClick={() => markAll('ABSENT')}>All Absent</Button>
        </Box>
      )}

      {loading ? <LoadingSpinner /> : selectedSlot && entries.length > 0 ? (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Remarks</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry, idx) => (
                  <TableRow key={entry.studentId}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {entry.studentName}
                      {entry.makeUp && <Chip label="Make-up" color="info" size="small" variant="outlined" sx={{ ml: 1 }} />}
                    </TableCell>
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
                    <TableCell>
                      {entry.makeUp && (
                        <IconButton size="small" onClick={() => removeEntry(entry.studentId)} aria-label="remove">
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
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
      ) : selectedSlot ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No students assigned to this timetable slot. Use "Add student" for a make-up.</Typography>
        </Paper>
      ) : null}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AttendancePage;
