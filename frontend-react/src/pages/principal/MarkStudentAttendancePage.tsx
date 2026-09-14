import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, TextField, Grid, Paper, Typography, Chip, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Snackbar,
  Tabs, Tab, Autocomplete, IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchCourses } from '../../store/slices/courseSlice';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import timetableService from '../../services/timetableService';
import studentService from '../../services/studentService';
import enrollmentService from '../../services/enrollmentService';
import attendanceService from '../../services/attendanceService';
import { Student, StudentAttendance, Timetable, Course, Teacher, AttendanceStatus } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatSlotLabel, buildCourseTeacherMap, teacherCoursesFromTimetables } from '../../utils/enrollmentHelpers';
import { format } from 'date-fns';

interface AttendanceEntry {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  remarks: string;
  makeUp?: boolean;
}

// Student marking is restricted to PRESENT / ABSENT (spec §4).
const STUDENT_STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT'];

const statusColors: Record<AttendanceStatus, 'success' | 'error' | 'warning' | 'default'> = {
  PRESENT: 'success', ABSENT: 'error', LEAVE: 'warning', HALF_DAY: 'default',
};

const teacherLabel = (t?: Teacher): string =>
  t ? `${t.firstName} ${t.lastName}`.trim() : '';

const MarkStudentAttendancePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, roles } = useSelector((state: RootState) => state.auth);
  const { list: courses } = useSelector((state: RootState) => state.courses);
  const { list: teachers } = useSelector((state: RootState) => state.teachers);

  // A principal marks on behalf of any teacher; only treat the user as a plain teacher
  // when they are NOT also a principal (principal role takes precedence, per the app's routing).
  const isTeacher = roles.includes('ROLE_TEACHER') && !roles.includes('ROLE_PRINCIPAL');

  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [slots, setSlots] = useState<Timetable[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Timetable | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [tab, setTab] = useState(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [addStudent, setAddStudent] = useState<Student | null>(null);
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rangeStatus, setRangeStatus] = useState<AttendanceStatus>('PRESENT');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchTeachers());
    timetableService.getAll().then(setTimetables).catch(() => setTimetables([]));
  }, [dispatch]);

  // Teacher login marks only their own classes: pin the teacher to the logged-in user.
  useEffect(() => {
    if (isTeacher && user?.id) setSelectedTeacherId(user.id);
  }, [isTeacher, user?.id]);

  const courseTeacherMap = useMemo(() => buildCourseTeacherMap(timetables), [timetables]);

  // Course options: a teacher sees only the courses they teach; a principal sees all.
  const courseOptions = useMemo(() => {
    if (isTeacher && user?.id) return teacherCoursesFromTimetables(timetables, user.id, courses);
    return courses;
  }, [isTeacher, user?.id, timetables, courses]);

  // Principal teacher options: narrowed to the teachers who teach the selected course.
  const teacherOptions = useMemo(() => {
    if (!selectedCourse) return [] as Teacher[];
    const ids = courseTeacherMap.get(selectedCourse.id);
    if (!ids) return [] as Teacher[];
    return teachers.filter(t => ids.has(t.id));
  }, [selectedCourse, courseTeacherMap, teachers]);

  const resetRoster = () => {
    setSelectedSlot(null);
    setStartTime('');
    setEndTime('');
    setCourseStudents([]);
    setEntries([]);
    setAddStudent(null);
  };

  // (Re)build the batch list whenever the course or teacher changes; auto-select a lone slot.
  useEffect(() => {
    if (!selectedCourse || !selectedTeacherId) {
      setSlots([]);
      resetRoster();
      return;
    }
    let cancelled = false;
    timetableService.getByCourse(selectedCourse.id)
      .then(all => {
        if (cancelled) return;
        const mine = all.filter(t => t.teacherId === selectedTeacherId);
        setSlots(mine);
        resetRoster();
        if (mine.length === 1) loadSlot(mine[0]);
      })
      .catch(() => { if (!cancelled) { setSlots([]); resetRoster(); } });
    return () => { cancelled = true; };
  }, [selectedCourse, selectedTeacherId]);

  const loadSlot = async (slot: Timetable) => {
    setSelectedSlot(slot);
    setStartTime((slot.startTime || '').slice(0, 5));
    setEndTime((slot.endTime || '').slice(0, 5));
    setAddStudent(null);
    setLoading(true);
    try {
      // Base roster: the ACTIVE enrollments assigned to this timetable slot (studentName populated).
      const [roster, allStudents] = await Promise.all([
        enrollmentService.getByTimetable(slot.id),
        studentService.getByCourse(slot.courseId),
      ]);
      setCourseStudents(allStudents);
      setEntries(roster.map(e => ({
        studentId: e.studentId,
        studentName: e.studentName || 'Unknown student',
        status: 'PRESENT',
        remarks: '',
      })));
    } catch { setCourseStudents([]); setEntries([]); }
    finally { setLoading(false); }
  };

  const handleSlotChange = (slotId: string) => {
    const slot = slots.find(t => t.id === slotId) || null;
    if (slot) loadSlot(slot);
    else resetRoster();
  };

  const updateEntry = (studentId: string, field: keyof AttendanceEntry, value: string) => {
    setEntries(prev => prev.map(e => e.studentId === studentId ? { ...e, [field]: value } : e));
  };

  const markAll = (status: AttendanceStatus) => {
    setEntries(prev => prev.map(e => ({ ...e, status })));
  };

  // Add a student not on the base roster (make-up / other-batch attendee) — any student, no filter.
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
        startTime: startTime || undefined, endTime: endTime || undefined,
      }));
      await attendanceService.markStudentAttendance(payload);
      setSnackbar({ open: true, message: 'Attendance saved successfully', severity: 'success' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Failed to save attendance', severity: 'error' });
    }
  };

  // Collect the session dates between from/to (inclusive) for the bulk-range call.
  const sessionDatesBetween = (start: string, end: string): string[] => {
    const out: string[] = [];
    const s = new Date(start);
    const e = new Date(end);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      out.push(format(d, 'yyyy-MM-dd'));
    }
    return out;
  };

  const handleBulkRange = async () => {
    if (!selectedSlot) return;
    const sessionDates = sessionDatesBetween(fromDate, toDate);
    if (sessionDates.length === 0) {
      setSnackbar({ open: true, message: 'Invalid date range', severity: 'error' });
      return;
    }
    const studentIds = entries.map(e => e.studentId);
    if (studentIds.length === 0) {
      setSnackbar({ open: true, message: 'No students on the roster to apply to', severity: 'error' });
      return;
    }
    try {
      await attendanceService.markStudentBulkRange({
        timetableId: selectedSlot.id, courseId: selectedSlot.courseId,
        sessionDates, status: rangeStatus, studentIds,
        startTime: startTime || undefined, endTime: endTime || undefined,
      });
      setSnackbar({ open: true, message: 'Bulk attendance applied successfully', severity: 'success' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Failed to apply bulk attendance', severity: 'error' });
    }
  };

  const addableStudents = courseStudents.filter(s => !entries.some(e => e.studentId === s.id));
  const hasSelection = Boolean(selectedCourse && selectedTeacherId);
  const noSlots = hasSelection && slots.length === 0;

  return (
    <Box>
      <PageHeader
        title="Mark Student Attendance"
        subtitle="Select course, teacher, batch and date, then mark the roster"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Mark Student Attendance' }]}
      />

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              size="small"
              options={courseOptions}
              value={selectedCourse}
              onChange={(_e, v) => {
                setSelectedCourse(v);
                if (!isTeacher) setSelectedTeacherId('');
              }}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              getOptionLabel={(c) => c.courseName || c.courseCode || c.id}
              renderInput={(params) => <TextField {...params} label="Course" placeholder="Search course…" />}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            {isTeacher ? (
              <Box>
                <Typography variant="caption" color="text.secondary">Teacher</Typography>
                <Box><Chip label={teacherLabel(teachers.find(t => t.id === user?.id)) || 'You'} color="primary" variant="outlined" /></Box>
              </Box>
            ) : (
              <Autocomplete
                size="small"
                options={teacherOptions}
                value={teachers.find(t => t.id === selectedTeacherId) || null}
                onChange={(_e, v) => setSelectedTeacherId(v?.id ?? '')}
                disabled={!selectedCourse}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                getOptionLabel={teacherLabel}
                renderInput={(params) => <TextField {...params} label="Teacher" placeholder="Select teacher…" />}
              />
            )}
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select size="small" fullWidth label="Batch (timetable slot)"
              value={selectedSlot?.id ?? ''}
              onChange={e => handleSlotChange(e.target.value)}
              disabled={!hasSelection || slots.length === 0}
            >
              {slots.map(s => (
                <MenuItem key={s.id} value={s.id}>{formatSlotLabel(s)}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Date" type="date" size="small" fullWidth value={date}
              onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {selectedSlot && (
            <>
              <Grid item xs={6} sm={3} md={2}>
                <TextField
                  label="Start time" type="time" size="small" fullWidth value={startTime}
                  onChange={e => setStartTime(e.target.value)} InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <TextField
                  label="End time" type="time" size="small" fullWidth value={endTime}
                  onChange={e => setEndTime(e.target.value)} InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}
        </Grid>

        {noSlots && (
          <Alert severity="info" sx={{ mt: 2 }}>No timetable entry for this course and teacher.</Alert>
        )}
      </Paper>

      {selectedSlot && (
        <Paper variant="outlined" sx={{ mb: 3 }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Single Day" />
            <Tab label="Bulk Range" />
          </Tabs>

          {tab === 0 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1}>
                    <Button size="small" variant="outlined" color="success" onClick={() => markAll('PRESENT')}>All Present</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => markAll('ABSENT')}>All Absent</Button>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    size="small"
                    options={addableStudents}
                    value={addStudent}
                    onChange={(_e, v) => handleAddStudent(v)}
                    getOptionLabel={(s) => `${s.firstName} ${s.lastName}`.trim()}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderInput={(params) => (
                      <TextField {...params} label="Add student (make-up)" placeholder="Search…" InputProps={{
                        ...params.InputProps,
                        startAdornment: <PersonAddIcon fontSize="small" sx={{ mr: 0.5, color: 'action.active' }} />,
                      }} />
                    )}
                  />
                </Grid>
              </Grid>

              {loading ? <LoadingSpinner /> : entries.length > 0 ? (
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
                                {STUDENT_STATUSES.map(s => (
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
              ) : (
                <Typography color="text.secondary">No students assigned to this timetable slot. Use "Add student" for a make-up.</Typography>
              )}
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="From Date" type="date" size="small" fullWidth value={fromDate}
                    onChange={e => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="To Date" type="date" size="small" fullWidth value={toDate}
                    onChange={e => setToDate(e.target.value)} InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField select label="Status" size="small" fullWidth value={rangeStatus}
                    onChange={e => setRangeStatus(e.target.value as AttendanceStatus)}>
                    {STUDENT_STATUSES.map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Button variant="contained" fullWidth startIcon={<SaveIcon />} onClick={handleBulkRange}>
                    Apply to roster ({entries.length})
                  </Button>
                </Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Applies to the {entries.length} student(s) currently on the roster for every day in the range, at the session times above.
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default MarkStudentAttendancePage;
