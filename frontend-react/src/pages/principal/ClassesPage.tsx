import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Chip, IconButton, Tooltip, Alert, Snackbar, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchCourses } from '../../store/slices/courseSlice';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import { CourseClass } from '../../types';
import courseService from '../../services/courseService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';

const schema = yup.object({
  courseId: yup.string().required('Course is required'),
  teacherId: yup.string().required('Teacher is required'),
  className: yup.string().required('Class name is required'),
  schedule: yup.string().required('Schedule description is required'),
  startDate: yup.string().required('Start date is required'),
});

type ClassFormData = Omit<CourseClass, 'id' | 'active' | 'courseName' | 'teacherName' | 'currentEnrollments'>;

const ClassesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: courses } = useSelector((state: RootState) => state.courses);
  const { list: teachers } = useSelector((state: RootState) => state.teachers);
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CourseClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseClass | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ClassFormData>({
    resolver: yupResolver(schema) as never,
  });

  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchTeachers());
    loadClasses();
  }, [dispatch]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getAllClasses();
      setClasses(data);
    } catch { setClasses([]); }
    finally { setLoading(false); }
  };

  const handleAdd = () => {
    setEditing(null);
    reset({ courseId: '', teacherId: '', className: '', schedule: '', startDate: new Date().toISOString().split('T')[0] });
    setDialogOpen(true);
  };

  const handleEdit = (cls: CourseClass) => {
    setEditing(cls);
    reset({ courseId: cls.courseId, teacherId: cls.teacherId, className: cls.className, schedule: cls.schedule, startDate: cls.startDate, endDate: cls.endDate || '' });
    setDialogOpen(true);
  };

  const handleSubmitForm = async (data: ClassFormData) => {
    try {
      if (editing) {
        await courseService.updateClass(editing.id, data);
        setSnackbar({ open: true, message: 'Class updated successfully', severity: 'success' });
      } else {
        await courseService.createClass({ ...data, active: true });
        setSnackbar({ open: true, message: 'Class created successfully', severity: 'success' });
      }
      setDialogOpen(false);
      await loadClasses();
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Operation failed', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await courseService.deleteClass(deleteTarget.id);
      setSnackbar({ open: true, message: 'Class deleted', severity: 'success' });
      await loadClasses();
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Delete failed', severity: 'error' });
    }
    setDeleteTarget(null);
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'className', label: 'Class Name', minWidth: 150 },
    { id: 'courseName', label: 'Course', minWidth: 150 },
    { id: 'teacherName', label: 'Teacher', minWidth: 150 },
    { id: 'schedule', label: 'Schedule', minWidth: 160 },
    { id: 'startDate', label: 'Start Date', minWidth: 120, format: (v) => formatDate(v as string) },
    { id: 'currentEnrollments', label: 'Enrollments', minWidth: 100, align: 'center' },
    { id: 'active', label: 'Status', minWidth: 80, format: (v) => <Chip label={v ? 'Active' : 'Inactive'} color={v ? 'success' : 'default'} size="small" /> },
    {
      id: 'actions', label: 'Actions', minWidth: 100, align: 'center',
      format: (_v, row) => {
        const cls = row as unknown as CourseClass;
        return (
          <Box>
            <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => handleEdit(cls)}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(cls)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </Box>
        );
      },
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Classes"
        subtitle={`${classes.length} class(es) available`}
        breadcrumbs={[{ label: 'Principal' }, { label: 'Classes' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>Add Class</Button>}
      />
      <DataTable columns={columns} rows={classes as unknown as Record<string, unknown>[]} searchable searchPlaceholder="Search classes..." />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Class' : 'Add New Class'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(handleSubmitForm)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller name="className" control={control} render={({ field }) => (
                  <TextField {...field} label="Class Name" fullWidth size="small" error={!!errors.className} helperText={errors.className?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="courseId" control={control} render={({ field }) => (
                  <TextField {...field} select label="Course" fullWidth size="small" error={!!errors.courseId} helperText={errors.courseId?.message}>
                    {courses.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="teacherId" control={control} render={({ field }) => (
                  <TextField {...field} select label="Teacher" fullWidth size="small" error={!!errors.teacherId} helperText={errors.teacherId?.message}>
                    {teachers.map(t => <MenuItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="schedule" control={control} render={({ field }) => (
                  <TextField {...field} label="Schedule Description" fullWidth size="small" placeholder="e.g. Mon/Wed/Fri 10:00-11:00 AM" error={!!errors.schedule} helperText={errors.schedule?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="startDate" control={control} render={({ field }) => (
                  <TextField {...field} label="Start Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} error={!!errors.startDate} helperText={errors.startDate?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="endDate" control={control} render={({ field }) => (
                  <TextField {...field} label="End Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} />
                )} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained">{editing ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Delete Class" message={`Delete class "${deleteTarget?.className}"?`} severity="error" confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ClassesPage;
