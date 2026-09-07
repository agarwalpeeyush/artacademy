import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchCourses, createCourse, updateCourse, deleteCourse } from '../../store/slices/courseSlice';
import { Course } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';

const schema = yup.object({
  name: yup.string().required('Course name is required'),
  description: yup.string().required('Description is required'),
  duration: yup.number().required('Duration is required').min(1),
  monthlyFee: yup.number().required('Monthly fee is required').min(0),
  admissionFee: yup.number().required('Admission fee is required').min(0),
  maxStudents: yup.number().required('Max students is required').min(1),
});

type CourseFormData = Omit<Course, 'id' | 'active' | 'createdAt'>;

const CoursesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: courses, loading } = useSelector((state: RootState) => state.courses);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CourseFormData>({
    resolver: yupResolver(schema) as never,
  });

  useEffect(() => { dispatch(fetchCourses()); }, [dispatch]);

  const handleAdd = () => {
    setEditing(null);
    reset({ name: '', description: '', duration: 12, monthlyFee: 0, admissionFee: 0, maxStudents: 20 });
    setDialogOpen(true);
  };

  const handleEdit = (course: Course) => {
    setEditing(course);
    reset({ name: course.name, description: course.description, duration: course.duration, monthlyFee: course.monthlyFee, admissionFee: course.admissionFee, maxStudents: course.maxStudents });
    setDialogOpen(true);
  };

  const handleSubmitForm = async (data: CourseFormData) => {
    try {
      if (editing) {
        await dispatch(updateCourse({ id: editing.id, data })).unwrap();
        setSnackbar({ open: true, message: 'Course updated successfully', severity: 'success' });
      } else {
        await dispatch(createCourse({ ...data, active: true })).unwrap();
        setSnackbar({ open: true, message: 'Course created successfully', severity: 'success' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Operation failed', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteCourse(deleteTarget.id)).unwrap();
      setSnackbar({ open: true, message: 'Course deleted successfully', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Delete failed', severity: 'error' });
    }
    setDeleteTarget(null);
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'name', label: 'Course Name', minWidth: 160 },
    { id: 'description', label: 'Description', minWidth: 200 },
    { id: 'duration', label: 'Duration (Months)', minWidth: 130, align: 'center' },
    { id: 'monthlyFee', label: 'Monthly Fee', minWidth: 120, align: 'right', format: (v) => formatCurrency(v as number) },
    { id: 'admissionFee', label: 'Admission Fee', minWidth: 120, align: 'right', format: (v) => formatCurrency(v as number) },
    { id: 'maxStudents', label: 'Max Students', minWidth: 110, align: 'center' },
    { id: 'active', label: 'Status', minWidth: 80, format: (v) => <Chip label={v ? 'Active' : 'Inactive'} color={v ? 'success' : 'default'} size="small" /> },
    {
      id: 'actions', label: 'Actions', minWidth: 100, align: 'center',
      format: (_v, row) => {
        const course = row as unknown as Course;
        return (
          <Box>
            <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => handleEdit(course)}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(course)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </Box>
        );
      },
    },
  ];

  if (loading && courses.length === 0) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Courses"
        subtitle={`${courses.length} course(s) available`}
        breadcrumbs={[{ label: 'Principal' }, { label: 'Courses' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>Add Course</Button>}
      />

      <DataTable columns={columns} rows={courses as unknown as Record<string, unknown>[]} searchable searchPlaceholder="Search courses..." />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Course' : 'Add New Course'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(handleSubmitForm)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller name="name" control={control} render={({ field }) => (
                  <TextField {...field} label="Course Name" fullWidth size="small" error={!!errors.name} helperText={errors.name?.message} />
                )} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="description" control={control} render={({ field }) => (
                  <TextField {...field} label="Description" fullWidth size="small" multiline rows={3} error={!!errors.description} helperText={errors.description?.message} />
                )} />
              </Grid>
              {[
                { name: 'duration', label: 'Duration (Months)', type: 'number' },
                { name: 'monthlyFee', label: 'Monthly Fee (₹)', type: 'number' },
                { name: 'admissionFee', label: 'Admission Fee (₹)', type: 'number' },
                { name: 'maxStudents', label: 'Max Students', type: 'number' },
              ].map(f => (
                <Grid item xs={12} sm={6} key={f.name}>
                  <Controller name={f.name as keyof CourseFormData} control={control} render={({ field }) => (
                    <TextField {...field} label={f.label} type={f.type} fullWidth size="small"
                      error={!!errors[f.name as keyof CourseFormData]}
                      helperText={errors[f.name as keyof CourseFormData]?.message}
                    />
                  )} />
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained">{editing ? 'Update' : 'Create'}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Delete Course" message={`Delete course "${deleteTarget?.name}"? This cannot be undone.`} severity="error" confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CoursesPage;
