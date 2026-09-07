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

const schema = yup.object({
  courseId: yup.string().required('Course is required'),
  teacherId: yup.string().optional(),
  className: yup.string().required('Class name is required'),
  roomNumber: yup.string().optional(),
  capacity: yup.number().required('Capacity is required').min(1),
  status: yup.string().required('Status is required'),
});

type ClassFormData = Omit<CourseClass, 'id' | 'courseName' | 'teacherName'>;

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

  const emptyForm: ClassFormData = {
    courseId: '', teacherId: '', className: '', roomNumber: '', capacity: 20, status: 'ACTIVE',
  };

  const handleAdd = () => {
    setEditing(null);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (cls: CourseClass) => {
    setEditing(cls);
    reset({
      courseId: cls.courseId,
      teacherId: cls.teacherId || '',
      className: cls.className,
      roomNumber: cls.roomNumber || '',
      capacity: cls.capacity,
      status: cls.status,
    });
    setDialogOpen(true);
  };

  const handleSubmitForm = async (data: ClassFormData) => {
    try {
      if (editing) {
        await courseService.updateClass(editing.id, data);
        setSnackbar({ open: true, message: 'Class updated successfully', severity: 'success' });
      } else {
        await courseService.createClass(data);
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
    {
      id: 'courseId', label: 'Course', minWidth: 150,
      format: (v) => courses.find(c => c.id === v)?.courseName || (v as string),
    },
    {
      id: 'teacherId', label: 'Teacher', minWidth: 150,
      format: (v) => {
        const t = teachers.find(t => t.id === v);
        return t ? `${t.firstName} ${t.lastName}` : '—';
      },
    },
    { id: 'roomNumber', label: 'Room', minWidth: 80 },
    { id: 'capacity', label: 'Capacity', minWidth: 80, align: 'center' },
    { id: 'status', label: 'Status', minWidth: 80, format: (v) => <Chip label={v as string} color={v === 'ACTIVE' ? 'success' : 'default'} size="small" /> },
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
                    {courses.map(c => <MenuItem key={c.id} value={c.id}>{c.courseName}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="teacherId" control={control} render={({ field }) => (
                  <TextField {...field} select label="Teacher (optional)" fullWidth size="small">
                    <MenuItem value="">— None —</MenuItem>
                    {teachers.map(t => <MenuItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="roomNumber" control={control} render={({ field }) => (
                  <TextField {...field} label="Room Number (optional)" fullWidth size="small" />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="capacity" control={control} render={({ field }) => (
                  <TextField {...field} label="Capacity" type="number" fullWidth size="small" error={!!errors.capacity} helperText={errors.capacity?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="status" control={control} render={({ field }) => (
                  <TextField {...field} select label="Status" fullWidth size="small" error={!!errors.status} helperText={errors.status?.message}>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                  </TextField>
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
