import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Grid, Paper, MenuItem, Chip, Alert, Snackbar, Typography,
  Tabs, Tab,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import courseService from '../../services/courseService';
import attendanceService from '../../services/attendanceService';
import { CourseClass, TeacherAttendance, AttendanceStatus } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import { format } from 'date-fns';

const statusColors: Record<AttendanceStatus, 'success' | 'error' | 'warning' | 'default'> = {
  PRESENT: 'success', ABSENT: 'error', HALF_DAY: 'warning', LEAVE: 'default',
};

const MarkTeacherAttendancePage: React.FC = () => {
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<CourseClass | null>(null);
  const [tab, setTab] = useState(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<AttendanceStatus>('PRESENT');
  const [remarks, setRemarks] = useState('');
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rangeStatus, setRangeStatus] = useState<AttendanceStatus>('PRESENT');
  const [records, setRecords] = useState<TeacherAttendance[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    courseService.getAllClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  const loadRecords = async (classId: string, forDate: string) => {
    try {
      const rows = await attendanceService.getTeacherClassAttendanceForDate(classId, forDate);
      setRecords(rows);
    } catch {
      setRecords([]);
    }
  };

  const handleClassChange = (classId: string) => {
    const cls = classes.find(c => c.id === classId) || null;
    setSelectedClass(cls);
    if (cls) loadRecords(cls.id, date);
    else setRecords([]);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    if (selectedClass) loadRecords(selectedClass.id, value);
  };

  const hasTeacher = Boolean(selectedClass?.teacherId);

  const handleSave = async () => {
    if (!selectedClass?.teacherId) return;
    try {
      await attendanceService.markTeacherAttendance({
        teacherId: selectedClass.teacherId, classId: selectedClass.id, courseId: selectedClass.courseId,
        date, status, remarks,
      });
      setSnackbar({ open: true, message: 'Teacher attendance saved successfully', severity: 'success' });
      loadRecords(selectedClass.id, date);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Failed to save attendance', severity: 'error' });
    }
  };

  const handleBulkRange = async () => {
    if (!selectedClass?.teacherId) return;
    try {
      await attendanceService.markTeacherBulkRange({
        classId: selectedClass.id, courseId: selectedClass.courseId, teacherId: selectedClass.teacherId,
        fromDate, toDate, status: rangeStatus,
      });
      setSnackbar({ open: true, message: 'Bulk attendance applied successfully', severity: 'success' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Failed to apply bulk attendance', severity: 'error' });
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'teacherName', label: 'Teacher', minWidth: 160 },
    { id: 'date', label: 'Date', minWidth: 120 },
    {
      id: 'status', label: 'Status', minWidth: 120,
      format: (v) => <Chip label={String(v)} color={statusColors[v as AttendanceStatus] ?? 'default'} size="small" />,
    },
    { id: 'remarks', label: 'Remarks', minWidth: 200 },
  ];

  return (
    <Box>
      <PageHeader
        title="Mark Teacher Attendance"
        subtitle="Record attendance for the teacher assigned to a class"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Mark Teacher Attendance' }]}
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
          {selectedClass && (
            <Grid item xs={12} sm={6}>
              {hasTeacher ? (
                <Typography>Teacher: <strong>{selectedClass?.teacherName || selectedClass?.teacherId}</strong></Typography>
              ) : (
                <Typography color="error">No teacher assigned to this class.</Typography>
              )}
            </Grid>
          )}
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
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Date" type="date" size="small" fullWidth value={date}
                    onChange={e => handleDateChange(e.target.value)} InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField select label="Status" size="small" fullWidth value={status}
                    onChange={e => setStatus(e.target.value as AttendanceStatus)}>
                    {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] as AttendanceStatus[]).map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Remarks" size="small" fullWidth value={remarks}
                    onChange={e => setRemarks(e.target.value)} placeholder="Optional" />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button variant="contained" fullWidth startIcon={<SaveIcon />} onClick={handleSave} disabled={!hasTeacher}>
                    Save
                  </Button>
                </Grid>
              </Grid>
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
                    {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] as AttendanceStatus[]).map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Button variant="contained" fullWidth startIcon={<SaveIcon />} onClick={handleBulkRange} disabled={!hasTeacher}>
                    Apply to range
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>
      )}

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

export default MarkTeacherAttendancePage;
