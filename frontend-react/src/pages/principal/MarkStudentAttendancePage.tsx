import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Grid, Paper, Typography, Chip, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Snackbar,
  Tabs, Tab,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import courseService from '../../services/courseService';
import studentService from '../../services/studentService';
import attendanceService from '../../services/attendanceService';
import { Student, StudentAttendance, CourseClass, AttendanceStatus } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { format } from 'date-fns';

interface AttendanceEntry {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  remarks: string;
}

const statusColors: Record<AttendanceStatus, 'success' | 'error' | 'warning' | 'default'> = {
  PRESENT: 'success', ABSENT: 'error', LEAVE: 'warning', HALF_DAY: 'default',
};

const MarkStudentAttendancePage: React.FC = () => {
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<CourseClass | null>(null);
  const [tab, setTab] = useState(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rangeStatus, setRangeStatus] = useState<AttendanceStatus>('PRESENT');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    courseService.getAllClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  const handleClassChange = async (classId: string) => {
    const cls = classes.find(c => c.id === classId) || null;
    setSelectedClass(cls);
    if (cls) {
      setLoading(true);
      try {
        const data = await studentService.getByClass(cls.id);
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
        id: '', studentId: e.studentId, classId: selectedClass.id, courseId: selectedClass.courseId,
        date, status: e.status, remarks: e.remarks,
      }));
      await attendanceService.markStudentAttendance(payload);
      setSnackbar({ open: true, message: 'Attendance saved successfully', severity: 'success' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Failed to save attendance', severity: 'error' });
    }
  };

  const handleBulkRange = async () => {
    if (!selectedClass) return;
    try {
      await attendanceService.markStudentBulkRange({
        classId: selectedClass.id, courseId: selectedClass.courseId, fromDate, toDate, status: rangeStatus,
      });
      setSnackbar({ open: true, message: 'Bulk attendance applied successfully', severity: 'success' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Failed to apply bulk attendance', severity: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Mark Student Attendance"
        subtitle="Record student attendance for any class"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Mark Student Attendance' }]}
      />

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              select label="Select Class" size="small" fullWidth
              value={selectedClass?.id ?? ''}
              onChange={e => handleClassChange(e.target.value)}
            >
              {classes.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.className} – {c.courseName}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {selectedClass && (
        <Paper variant="outlined" sx={{ mb: 3 }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Single Day" />
            <Tab label="Bulk Range" />
          </Tabs>

          {tab === 0 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Date" type="date" size="small" fullWidth value={date}
                    onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <Box display="flex" gap={1}>
                    <Button size="small" variant="outlined" color="success" onClick={() => markAll('PRESENT')}>All Present</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => markAll('ABSENT')}>All Absent</Button>
                  </Box>
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
              ) : (
                <Typography color="text.secondary">No students enrolled in this class.</Typography>
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
                    {(['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY'] as AttendanceStatus[]).map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Button variant="contained" fullWidth startIcon={<SaveIcon />} onClick={handleBulkRange}>
                    Apply to whole class
                  </Button>
                </Grid>
              </Grid>
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
