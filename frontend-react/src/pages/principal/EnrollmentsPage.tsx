import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Chip, Alert, Snackbar, MenuItem, Typography,
  IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchStudents } from '../../store/slices/studentSlice';
import { fetchCourses } from '../../store/slices/courseSlice';
import { fetchEnrollments, createEnrollment, updateEnrollmentStatus, deleteEnrollment } from '../../store/slices/enrollmentSlice';
import { Enrollment } from '../../types';
import courseService from '../../services/courseService';
import { CourseClass } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';

const schema = yup.object({
  studentId: yup.string().required('Student is required'),
  courseId: yup.string().required('Course is required'),
  classId: yup.string().optional(),
  enrollmentDate: yup.string().required('Enrollment date is required'),
  admissionFeePaid: yup.boolean().required(),
});

type EnrollmentFormData = {
  studentId: string;
  courseId: string;
  classId?: string;
  enrollmentDate: string;
  admissionFeePaid: boolean;
};

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success', COMPLETED: 'default', DROPPED: 'error', SUSPENDED: 'warning',
};

const EnrollmentsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: enrollments, loading } = useSelector((state: RootState) => state.enrollments);
  const { list: students } = useSelector((state: RootState) => state.students);
  const { list: courses } = useSelector((state: RootState) => state.courses);
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<EnrollmentFormData>({
    resolver: yupResolver(schema) as never,
    defaultValues: { studentId: '', courseId: '', enrollmentDate: new Date().toISOString().split('T')[0], admissionFeePaid: false },
  });

  const selectedCourseId = watch('courseId');

  useEffect(() => {
    dispatch(fetchStudents());
    dispatch(fetchCourses());
    dispatch(fetchEnrollments());
  }, [dispatch]);

  useEffect(() => {
    if (selectedCourseId) {
      courseService.getClassesByCourse(selectedCourseId).then(setClasses).catch(() => setClasses([]));
    } else {
      setClasses([]);
    }
  }, [selectedCourseId]);

  const handleSubmitForm = async (data: EnrollmentFormData) => {
    try {
      await dispatch(createEnrollment({
        ...data, status: 'ACTIVE',
        studentName: students.find(s => s.id === data.studentId)?.firstName || '',
        courseName: courses.find(c => c.id === data.courseId)?.courseName || "",
      })).unwrap();
      setSnackbar({ open: true, message: 'Student enrolled successfully', severity: 'success' });
      setDialogOpen(false);
      reset();
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Enrollment failed', severity: 'error' });
    }
  };

  const handleStatusChange = async (enrollmentId: string, status: string) => {
    try {
      await dispatch(updateEnrollmentStatus({ id: enrollmentId, status })).unwrap();
      setSnackbar({ open: true, message: `Status updated to ${status}`, severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Update failed', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteEnrollment(deleteTarget.id)).unwrap();
      setSnackbar({ open: true, message: 'Enrollment cancelled', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Cancel failed', severity: 'error' });
    }
    setDeleteTarget(null);
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'studentName', label: 'Student', minWidth: 150 },
    { id: 'courseName', label: 'Course', minWidth: 150 },
    { id: 'className', label: 'Class', minWidth: 130 },
    { id: 'enrollmentDate', label: 'Enrolled On', minWidth: 120, format: (v) => formatDate(v as string) },
    {
      id: 'admissionFeePaid', label: 'Admission Fee', minWidth: 120,
      format: (v) => <Chip label={v ? 'Paid' : 'Pending'} color={v ? 'success' : 'warning'} size="small" />,
    },
    {
      id: 'status', label: 'Status', minWidth: 100,
      format: (v, row) => {
        const enrollment = row as unknown as Enrollment;
        return (
          <TextField
            select value={v as string} size="small" variant="standard"
            onChange={(e) => handleStatusChange(enrollment.id, e.target.value)}
            sx={{ minWidth: 110 }}
          >
            {['ACTIVE', 'COMPLETED', 'DROPPED', 'SUSPENDED'].map(s => (
              <MenuItem key={s} value={s}>
                <Chip label={s} color={statusColorMap[s]} size="small" />
              </MenuItem>
            ))}
          </TextField>
        );
      },
    },
    {
      id: 'actions', label: 'Actions', minWidth: 90, align: 'center',
      format: (_v, row) => {
        const enrollment = row as unknown as Enrollment;
        return (
          <Tooltip title="Cancel enrollment">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(enrollment)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      },
    },
  ];

  if (loading && enrollments.length === 0) return <LoadingSpinner />;

  const rows = enrollments.map((e) => {
    const student = students.find(s => s.id === e.studentId);
    return {
      ...e,
      studentName: e.studentName || (student ? `${student.firstName} ${student.lastName}`.trim() : ''),
      courseName: e.courseName || courses.find(c => c.id === e.courseId)?.courseName || '',
    };
  });

  return (
    <Box>
      <PageHeader
        title="Enrollments"
        subtitle={`${enrollments.length} enrollment(s)`}
        breadcrumbs={[{ label: 'Principal' }, { label: 'Enrollments' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>Enroll Student</Button>}
      />

      <DataTable columns={columns} rows={rows as unknown as Record<string, unknown>[]} searchable searchPlaceholder="Search enrollments..." />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enroll Student</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(handleSubmitForm)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller name="studentId" control={control} render={({ field }) => (
                  <TextField {...field} select label="Student" fullWidth size="small" error={!!errors.studentId} helperText={errors.studentId?.message}>
                    {students.map(s => <MenuItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="courseId" control={control} render={({ field }) => (
                  <TextField {...field} select label="Course" fullWidth size="small" error={!!errors.courseId} helperText={errors.courseId?.message}>
                    {courses.map(c => <MenuItem key={c.id} value={c.id}>{c.courseName}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              {classes.length > 0 && (
                <Grid item xs={12}>
                  <Controller name="classId" control={control} render={({ field }) => (
                    <TextField {...field} select label="Class (Optional)" fullWidth size="small">
                      <MenuItem value="">None</MenuItem>
                      {classes.map(cl => <MenuItem key={cl.id} value={cl.id}>{cl.className}</MenuItem>)}
                    </TextField>
                  )} />
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Controller name="enrollmentDate" control={control} render={({ field }) => (
                  <TextField {...field} label="Enrollment Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} error={!!errors.enrollmentDate} helperText={errors.enrollmentDate?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="admissionFeePaid" control={control} render={({ field }) => (
                  <TextField {...field} select label="Admission Fee Status" fullWidth size="small">
                    <MenuItem value="true">Paid</MenuItem>
                    <MenuItem value="false">Pending</MenuItem>
                  </TextField>
                )} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained">Enroll</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Cancel Enrollment"
        message={`Cancel enrollment of "${deleteTarget?.studentName || 'this student'}" in "${deleteTarget?.courseName || 'this course'}"? This cannot be undone.`}
        severity="error"
        confirmLabel="Cancel Enrollment"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default EnrollmentsPage;
