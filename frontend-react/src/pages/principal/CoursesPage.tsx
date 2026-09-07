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
  MenuItem,
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
  courseCode: yup.string().required('Course code is required'),
  courseName: yup.string().required('Course name is required'),
  courseType: yup.string().optional(),
  description: yup.string().optional(),
  durationMonths: yup.number().required('Duration is required').min(1),
  monthlyFee: yup.number().required('Monthly fee is required').min(0),
  admissionFee: yup.number().required('Admission fee is required').min(0),
  status: yup.string().required('Status is required'),
});

type CourseFormData = Omit<Course, 'id'>;

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

  const emptyForm: CourseFormData = {
    courseCode: '', courseName: '', courseType: '', description: '',
    durationMonths: 12, monthlyFee: 0, admissionFee: 0, status: 'ACTIVE',
  };

  const handleAdd = () => {
    setEditing(null);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (course: Course) => {
    setEditing(course);
    reset({
      courseCode: course.courseCode,
      courseName: course.courseName,
      courseType: course.courseType || '',
      description: course.description || '',
      durationMonths: course.durationMonths,
      monthlyFee: course.monthlyFee,
      admissionFee: course.admissionFee,
      status: course.status,
    });
    setDialogOpen(true);
  };

  const handleSubmitForm = async (data: CourseFormData) => {
    try {
      if (editing) {
        await dispatch(updateCourse({ id: editing.id, data })).unwrap();
        setSnackbar({ open: true, message: 'Course updated successfully', severity: 'success' });
      } else {
        await dispatch(createCourse(data)).unwrap();
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
    { id: 'courseCode', label: 'Code', minWidth: 90 },
    { id: 'courseName', label: 'Course Name', minWidth: 160 },
    { id: 'courseType', label: 'Type', minWidth: 100 },
    { id: 'durationMonths', label: 'Duration (Mo)', minWidth: 110, align: 'center' },
    { id: 'monthlyFee', label: 'Monthly Fee', minWidth: 120, align: 'right', format: (v) => formatCurrency(v as number) },
    { id: 'admissionFee', label: 'Admission Fee', minWidth: 120, align: 'right', format: (v) => formatCurrency(v as number) },
    { id: 'status', label: 'Status', minWidth: 80, format: (v) => <Chip label={v as string} color={v === 'ACTIVE' ? 'success' : 'default'} size="small" /> },
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
              <Grid item xs={12} sm={6}>
                <Controller name="courseCode" control={control} render={({ field }) => (
                  <TextField {...field} label="Course Code" fullWidth size="small" error={!!errors.courseCode} helperText={errors.courseCode?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="courseName" control={control} render={({ field }) => (
                  <TextField {...field} label="Course Name" fullWidth size="small" error={!!errors.courseName} helperText={errors.courseName?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="courseType" control={control} render={({ field }) => (
                  <TextField {...field} label="Course Type (optional)" fullWidth size="small" />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="durationMonths" control={control} render={({ field }) => (
                  <TextField {...field} label="Duration (Months)" type="number" fullWidth size="small" error={!!errors.durationMonths} helperText={errors.durationMonths?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="monthlyFee" control={control} render={({ field }) => (
                  <TextField {...field} label="Monthly Fee (₹)" type="number" fullWidth size="small" error={!!errors.monthlyFee} helperText={errors.monthlyFee?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="admissionFee" control={control} render={({ field }) => (
                  <TextField {...field} label="Admission Fee (₹)" type="number" fullWidth size="small" error={!!errors.admissionFee} helperText={errors.admissionFee?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="status" control={control} render={({ field }) => (
                  <TextField {...field} label="Status" select fullWidth size="small" error={!!errors.status} helperText={errors.status?.message}>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                  </TextField>
                )} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="description" control={control} render={({ field }) => (
                  <TextField {...field} label="Description (optional)" fullWidth size="small" multiline rows={2} />
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

      <ConfirmDialog open={!!deleteTarget} title="Delete Course" message={`Delete course "${deleteTarget?.courseName}"? This cannot be undone.`} severity="error" confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CoursesPage;
