import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, MenuItem, Chip, Alert, Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchCourses } from '../../store/slices/courseSlice';
import { Exam } from '../../types';
import examService from '../../services/examService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, formatTime } from '../../utils/formatters';

const statusColor = (s: string): 'info' | 'success' | 'default' =>
  s === 'SCHEDULED' ? 'info' : s === 'COMPLETED' ? 'success' : 'default';

interface ExamFormData {
  courseId: string;
  title: string;
  examDate: string;
  startTime: string;
  endTime: string;
}

const emptyForm: ExamFormData = { courseId: '', title: '', examDate: '', startTime: '', endTime: '' };

const ExamsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: courses } = useSelector((state: RootState) => state.courses);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ExamFormData>(emptyForm);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const loadExams = () => {
    setLoading(true);
    examService.getAll()
      .then(setExams)
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    dispatch(fetchCourses());
    loadExams();
  }, [dispatch]);

  const openDialog = () => { setForm(emptyForm); setDialogOpen(true); };

  const canSubmit = form.courseId && form.examDate && form.startTime && form.endTime;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await examService.create({
        courseId: form.courseId,
        title: form.title || undefined,
        examDate: form.examDate,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      setSnackbar({ open: true, message: 'Exam scheduled successfully', severity: 'success' });
      setDialogOpen(false);
      loadExams();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Failed to schedule exam', severity: 'error' });
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'courseName', label: 'Course', minWidth: 180 },
    { id: 'title', label: 'Title', minWidth: 160, format: (v) => (v as string) || '—' },
    { id: 'examDate', label: 'Date', minWidth: 120, format: (v) => formatDate(v as string) },
    { id: 'startTime', label: 'Start', minWidth: 90, format: (v) => formatTime(v as string) },
    { id: 'endTime', label: 'End', minWidth: 90, format: (v) => formatTime(v as string) },
    { id: 'status', label: 'Status', minWidth: 110, format: (v) => <Chip label={v as string} color={statusColor(v as string)} size="small" /> },
  ];

  if (loading && exams.length === 0) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Exams"
        subtitle={`${exams.length} exam(s) scheduled`}
        breadcrumbs={[{ label: 'Principal' }, { label: 'Exams' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>Schedule Exam</Button>}
      />

      <DataTable columns={columns} rows={exams as unknown as Record<string, unknown>[]} searchable searchPlaceholder="Search exams..." emptyMessage="No exams scheduled." />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Exam</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                select label="Course" size="small" fullWidth
                value={form.courseId}
                onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))}
              >
                {courses.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.courseName} ({c.courseCode})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Title (optional)" size="small" fullWidth
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Exam Date" type="date" size="small" fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.examDate}
                onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Start Time" type="time" size="small" fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="End Time" type="time" size="small" fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!canSubmit}>Schedule</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ExamsPage;
