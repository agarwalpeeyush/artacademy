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
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store/store';
import { fetchStudents, createStudent, updateStudent, deleteStudent } from '../../store/slices/studentSlice';
import { Student } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LoginIdField from '../../components/common/LoginIdField';
import { formatDate } from '../../utils/formatters';

const schema = yup.object({
  loginId: yup.string().optional(),
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().optional(),
  dob: yup.string().optional(),
  enrollmentDate: yup.string().optional(),
  fatherName: yup.string().optional(),
  fatherPhone: yup.string().optional(),
  motherName: yup.string().optional(),
  motherPhone: yup.string().optional(),
  email: yup.string().email('Invalid email').optional(),
  address: yup.string().optional(),
  status: yup.string().required('Status is required'),
});

type StudentFormData = Omit<Student, 'id'>;

const StudentsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { list: students, loading } = useSelector((state: RootState) => state.students);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<StudentFormData>({
    resolver: yupResolver(schema) as never,
  });

  const watchedFirstName = watch('firstName');

  useEffect(() => { dispatch(fetchStudents()); }, [dispatch]);

  const emptyForm: StudentFormData = {
    loginId: '', firstName: '', lastName: '', dob: '', enrollmentDate: '',
    fatherName: '', fatherPhone: '', motherName: '', motherPhone: '',
    email: '', address: '', status: 'ACTIVE',
  };

  const handleAdd = () => {
    setEditing(null);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (student: Student) => {
    setEditing(student);
    reset({
      loginId: student.loginId || '',
      firstName: student.firstName,
      lastName: student.lastName || '',
      dob: student.dob || '',
      enrollmentDate: student.enrollmentDate || '',
      fatherName: student.fatherName || '',
      fatherPhone: student.fatherPhone || '',
      motherName: student.motherName || '',
      motherPhone: student.motherPhone || '',
      email: student.email || '',
      address: student.address || '',
      status: student.status,
    });
    setDialogOpen(true);
  };

  const handleSubmitForm = async (data: StudentFormData) => {
    try {
      if (editing) {
        await dispatch(updateStudent({ id: editing.id, data })).unwrap();
        setSnackbar({ open: true, message: 'Student updated successfully', severity: 'success' });
      } else {
        await dispatch(createStudent(data)).unwrap();
        setSnackbar({ open: true, message: 'Student created successfully', severity: 'success' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Operation failed', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteStudent(deleteTarget.id)).unwrap();
      setSnackbar({ open: true, message: 'Student deleted successfully', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Delete failed', severity: 'error' });
    }
    setDeleteTarget(null);
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'firstName', label: 'First Name', minWidth: 120 },
    { id: 'lastName', label: 'Last Name', minWidth: 120 },
    { id: 'email', label: 'Email', minWidth: 180 },
    {
      id: 'parents', label: 'Parents', minWidth: 160,
      sortable: false,
      format: (_v, row) => {
        const student = row as unknown as Student;
        const names = (student.parents ?? []).map(p => p.name).filter(Boolean).join(', ');
        return names || '—';
      },
    },
    { id: 'dob', label: 'Date of Birth', minWidth: 120, format: (v) => v ? formatDate(v as string) : '—' },
    {
      id: 'status', label: 'Status', minWidth: 80,
      format: (v) => <Chip label={v as string} color={v === 'ACTIVE' ? 'success' : 'default'} size="small" />,
    },
    {
      id: 'actions', label: 'Actions', minWidth: 100, align: 'center', sortable: false,
      format: (_v, row) => {
        const student = row as unknown as Student;
        return (
          <Box>
            <Tooltip title="Edit">
              <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleEdit(student); }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteTarget(student); }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  if (loading && students.length === 0) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Students"
        subtitle={`${students.length} student(s) registered`}
        breadcrumbs={[{ label: 'Principal' }, { label: 'Students' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
            Add Student
          </Button>
        }
      />

      <DataTable columns={columns} rows={students as unknown as Record<string, unknown>[]} searchable searchPlaceholder="Search students..." onRowClick={(row) => navigate(`/principal/students/${(row as { id: string }).id}`)} />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Student' : 'Add New Student'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(handleSubmitForm)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller name="firstName" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="First Name" fullWidth size="small"
                      error={!!errors.firstName} helperText={errors.firstName?.message} />
                  )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="lastName" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Last Name" fullWidth size="small" />
                  )} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="loginId" control={control}
                  render={({ field }) => (
                    <LoginIdField
                      value={field.value || ''}
                      onChange={field.onChange}
                      firstName={watchedFirstName || ''}
                    />
                  )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="dob" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Date of Birth" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} />
                  )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="enrollmentDate" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Enrollment Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} />
                  )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="status" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Status" select fullWidth size="small"
                      error={!!errors.status} helperText={errors.status?.message}>
                      <MenuItem value="ACTIVE">Active</MenuItem>
                      <MenuItem value="INACTIVE">Inactive</MenuItem>
                      <MenuItem value="SUSPENDED">Suspended</MenuItem>
                    </TextField>
                  )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="email" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Email" fullWidth size="small"
                      error={!!errors.email} helperText={errors.email?.message} />
                  )} />
              </Grid>
              {[
                { name: 'fatherName', label: "Father's Name" },
                { name: 'fatherPhone', label: "Father's Phone" },
                { name: 'motherName', label: "Mother's Name" },
                { name: 'motherPhone', label: "Mother's Phone" },
              ].map(field => (
                <Grid item xs={12} sm={6} key={field.name}>
                  <Controller
                    name={field.name as keyof StudentFormData}
                    control={control}
                    render={({ field: f }) => (
                      <TextField {...f} label={field.label} fullWidth size="small" />
                    )}
                  />
                </Grid>
              ))}
              <Grid item xs={12}>
                <Controller name="address" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Address" fullWidth size="small" multiline rows={2} />
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Student"
        message={`Are you sure you want to delete ${deleteTarget?.firstName} ${deleteTarget?.lastName}?`}
        severity="error"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentsPage;
