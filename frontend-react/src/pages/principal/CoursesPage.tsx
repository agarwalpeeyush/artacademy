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
  Typography,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store/store';
import { fetchCourses, createCourse, updateCourse, deleteCourse } from '../../store/slices/courseSlice';
import { Course, CourseType, FeeType, FeeCadence } from '../../types';
import courseTypeService from '../../services/courseTypeService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, feeTypeLabel } from '../../utils/formatters';

const FEE_TYPES: FeeType[] = ['ADMISSION', 'MONTHLY', 'EXAM', 'ONE_TIME_SHORT_TERM'];

// Default cadence per fee type (matches backend FeeType enum).
const DEFAULT_CADENCE: Record<FeeType, FeeCadence> = {
  ADMISSION: 'ONE_TIME',
  MONTHLY: 'RECURRING',
  EXAM: 'ONE_TIME',
  ONE_TIME_SHORT_TERM: 'ONE_TIME',
};

interface CourseFormData {
  courseCode: string;
  courseName: string;
  courseTypeCode: string;
  description: string;
  durationMonths: number;
  status: string;
  fees: { feeType: FeeType; amount: number; cadence: FeeCadence }[];
}

const emptyForm: CourseFormData = {
  courseCode: '',
  courseName: '',
  courseTypeCode: '',
  description: '',
  durationMonths: 12,
  status: 'ACTIVE',
  fees: [{ feeType: 'MONTHLY', amount: 0, cadence: 'RECURRING' }],
};

const CoursesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { list: courses, loading } = useSelector((state: RootState) => state.courses);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CourseFormData>({
    defaultValues: emptyForm,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'fees' });

  useEffect(() => { dispatch(fetchCourses()); }, [dispatch]);
  useEffect(() => {
    courseTypeService.getAll().then(setCourseTypes).catch(() => setCourseTypes([]));
  }, []);

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
      courseTypeCode: course.courseTypeCode || '',
      description: course.description || '',
      durationMonths: course.durationMonths,
      status: course.status,
      fees: course.fees.length
        ? course.fees.map(f => ({ feeType: f.feeType, amount: f.amount, cadence: f.cadence ?? DEFAULT_CADENCE[f.feeType] }))
        : [{ feeType: 'MONTHLY', amount: 0, cadence: 'RECURRING' }],
    });
    setDialogOpen(true);
  };

  const handleSubmitForm = async (data: CourseFormData) => {
    const payload = {
      ...data,
      fees: data.fees.map(f => ({
        feeType: f.feeType,
        amount: Number(f.amount),
        cadence: f.cadence ?? DEFAULT_CADENCE[f.feeType],
      })),
    } as Omit<Course, 'id'>;
    try {
      if (editing) {
        await dispatch(updateCourse({ id: editing.id, data: payload })).unwrap();
        setSnackbar({ open: true, message: 'Course updated successfully', severity: 'success' });
      } else {
        await dispatch(createCourse(payload)).unwrap();
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
    { id: 'courseTypeName', label: 'Type', minWidth: 100, format: (v) => (v as string) || '—' },
    { id: 'durationMonths', label: 'Duration (Mo)', minWidth: 110, align: 'center' },
    {
      id: 'fees', label: 'Fees', minWidth: 220, sortable: false,
      format: (_v, row) => {
        const course = row as unknown as Course;
        if (!course.fees?.length) return '—';
        return (
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {course.fees.map((f, i) => (
              <Chip
                key={f.id ?? i}
                label={`${feeTypeLabel(f.feeType)}: ${formatCurrency(f.amount)}`}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        );
      },
    },
    { id: 'status', label: 'Status', minWidth: 80, format: (v) => <Chip label={v as string} color={v === 'ACTIVE' ? 'success' : 'default'} size="small" /> },
    {
      id: 'actions', label: 'Actions', minWidth: 100, align: 'center', sortable: false,
      format: (_v, row) => {
        const course = row as unknown as Course;
        return (
          <Box>
            <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleEdit(course); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteTarget(course); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
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

      <DataTable columns={columns} rows={courses as unknown as Record<string, unknown>[]} searchable searchPlaceholder="Search courses..." onRowClick={(row) => navigate(`/principal/courses/${(row as { id: string }).id}`)} />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Course' : 'Add New Course'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(handleSubmitForm)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller name="courseCode" control={control} rules={{ required: 'Course code is required' }} render={({ field }) => (
                  <TextField {...field} label="Course Code" fullWidth size="small" error={!!errors.courseCode} helperText={errors.courseCode?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="courseName" control={control} rules={{ required: 'Course name is required' }} render={({ field }) => (
                  <TextField {...field} label="Course Name" fullWidth size="small" error={!!errors.courseName} helperText={errors.courseName?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="courseTypeCode" control={control} render={({ field }) => (
                  <TextField {...field} label="Course Type" select fullWidth size="small">
                    <MenuItem value="">— None —</MenuItem>
                    {courseTypes.map(t => (
                      <MenuItem key={t.id} value={t.code}>{t.name}</MenuItem>
                    ))}
                  </TextField>
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="durationMonths" control={control} rules={{ required: 'Duration is required', min: { value: 1, message: 'Min 1' } }} render={({ field }) => (
                  <TextField {...field} label="Duration (Months)" type="number" fullWidth size="small" error={!!errors.durationMonths} helperText={errors.durationMonths?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="status" control={control} rules={{ required: 'Status is required' }} render={({ field }) => (
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

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2">Fee Structure</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => append({ feeType: 'MONTHLY', amount: 0, cadence: 'RECURRING' })}>
                    Add Fee
                  </Button>
                </Box>
              </Grid>

              {fields.map((f, index) => (
                <React.Fragment key={f.id}>
                  <Grid item xs={5}>
                    <Controller
                      name={`fees.${index}.feeType`}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Fee Type"
                          select
                          fullWidth
                          size="small"
                        >
                          {FEE_TYPES.map(ft => <MenuItem key={ft} value={ft}>{feeTypeLabel(ft)}</MenuItem>)}
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <Controller
                      name={`fees.${index}.amount`}
                      control={control}
                      rules={{ min: { value: 0, message: 'Min 0' } }}
                      render={({ field }) => (
                        <TextField {...field} label="Amount (₹)" type="number" fullWidth size="small" />
                      )}
                    />
                  </Grid>
                  <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </React.Fragment>
              ))}
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
