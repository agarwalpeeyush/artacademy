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
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeachers, createTeacher, updateTeacher, deleteTeacher } from '../../store/slices/teacherSlice';
import { Teacher } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LoginIdField from '../../components/common/LoginIdField';
import { formatDate } from '../../utils/formatters';

const schema = yup.object({
  loginId: yup.string().optional(),
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  employeeCode: yup.string().required('Employee code is required'),
  email: yup.string().email('Invalid email').optional(),
  phone: yup.string().optional(),
  qualification: yup.string().optional(),
  joiningDate: yup.string().optional(),
  status: yup.string().required('Status is required'),
});

type TeacherFormData = Omit<Teacher, 'id'>;

const TeachersPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { list: teachers, loading } = useSelector((state: RootState) => state.teachers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<TeacherFormData>({
    resolver: yupResolver(schema) as never,
  });

  const watchedFirstName = watch('firstName');

  useEffect(() => { dispatch(fetchTeachers()); }, [dispatch]);

  const emptyForm: TeacherFormData = {
    loginId: '', firstName: '', lastName: '', employeeCode: '',
    email: '', phone: '', qualification: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  };

  const handleAdd = () => { setEditing(null); reset(emptyForm); setDialogOpen(true); };

  const handleEdit = (teacher: Teacher) => {
    setEditing(teacher);
    reset({
      loginId: teacher.loginId || '',
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      employeeCode: teacher.employeeCode,
      email: teacher.email || '',
      phone: teacher.phone || '',
      qualification: teacher.qualification || '',
      joiningDate: teacher.joiningDate || '',
      status: teacher.status,
    });
    setDialogOpen(true);
  };

  const handleSubmitForm = async (data: TeacherFormData) => {
    try {
      if (editing) {
        await dispatch(updateTeacher({ id: editing.id, data })).unwrap();
        setSnackbar({ open: true, message: 'Teacher updated successfully', severity: 'success' });
      } else {
        await dispatch(createTeacher(data)).unwrap();
        setSnackbar({ open: true, message: 'Teacher created successfully', severity: 'success' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Operation failed', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteTeacher(deleteTarget.id)).unwrap();
      setSnackbar({ open: true, message: 'Teacher deleted successfully', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Delete failed', severity: 'error' });
    }
    setDeleteTarget(null);
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'firstName', label: 'First Name', minWidth: 120 },
    { id: 'lastName', label: 'Last Name', minWidth: 120 },
    { id: 'employeeCode', label: 'Employee Code', minWidth: 130 },
    { id: 'email', label: 'Email', minWidth: 180 },
    { id: 'phone', label: 'Phone', minWidth: 120 },
    { id: 'joiningDate', label: 'Joining Date', minWidth: 120, format: (v) => v ? formatDate(v as string) : '—' },
    {
      id: 'status', label: 'Status', minWidth: 80,
      format: (v) => <Chip label={v as string} color={v === 'ACTIVE' ? 'success' : 'default'} size="small" />,
    },
    {
      id: 'actions', label: 'Actions', minWidth: 100, align: 'center', sortable: false,
      format: (_v, row) => {
        const teacher = row as unknown as Teacher;
        return (
          <Box>
            <Tooltip title="Edit">
              <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleEdit(teacher); }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteTarget(teacher); }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  if (loading && teachers.length === 0) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Teachers"
        subtitle={`${teachers.length} teacher(s) registered`}
        breadcrumbs={[{ label: 'Principal' }, { label: 'Teachers' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
            Add Teacher
          </Button>
        }
      />

      <DataTable columns={columns} rows={teachers as unknown as Record<string, unknown>[]} searchable searchPlaceholder="Search teachers..." onRowClick={(row) => navigate(`/principal/teachers/${(row as { id: string }).id}`)} />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Teacher' : 'Add New Teacher'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(handleSubmitForm)}>
          <DialogContent>
            <Grid container spacing={2}>
              {[
                { name: 'firstName' as const, label: 'First Name' },
                { name: 'lastName' as const, label: 'Last Name' },
                { name: 'employeeCode' as const, label: 'Employee Code' },
                { name: 'email' as const, label: 'Email' },
                { name: 'phone' as const, label: 'Phone' },
                { name: 'qualification' as const, label: 'Qualification' },
              ].map(field => (
                <Grid item xs={12} sm={6} key={field.name}>
                  <Controller
                    name={field.name}
                    control={control}
                    render={({ field: f }) => (
                      <TextField {...f} label={field.label} fullWidth size="small"
                        error={!!errors[field.name]}
                        helperText={errors[field.name]?.message}
                      />
                    )}
                  />
                </Grid>
              ))}
              <Grid item xs={12} sm={6}>
                <Controller name="joiningDate" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Joining Date" type="date" fullWidth size="small"
                      InputLabelProps={{ shrink: true }} />
                  )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="status" control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Status" select fullWidth size="small"
                      error={!!errors.status} helperText={errors.status?.message}>
                      <MenuItem value="ACTIVE">Active</MenuItem>
                      <MenuItem value="INACTIVE">Inactive</MenuItem>
                    </TextField>
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
        title="Delete Teacher"
        message={`Are you sure you want to delete ${deleteTarget?.firstName} ${deleteTarget?.lastName}? This action cannot be undone.`}
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

export default TeachersPage;
