import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Chip, IconButton, Tooltip, Alert, Snackbar, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { CourseType } from '../../types';
import courseTypeService from '../../services/courseTypeService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface CourseTypeFormData {
  code: string;
  name: string;
  status: string;
}

const emptyForm: CourseTypeFormData = { code: '', name: '', status: 'ACTIVE' };

const CourseTypesPage: React.FC = () => {
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CourseType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseType | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CourseTypeFormData>({
    defaultValues: emptyForm,
  });

  const load = () => {
    setLoading(true);
    courseTypeService.getAll()
      .then(setCourseTypes)
      .catch(() => setCourseTypes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = () => {
    setEditing(null);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (type: CourseType) => {
    setEditing(type);
    reset({ code: type.code, name: type.name, status: type.status });
    setDialogOpen(true);
  };

  const handleSubmitForm = async (data: CourseTypeFormData) => {
    try {
      if (editing) {
        await courseTypeService.update(editing.id, data);
        setSnackbar({ open: true, message: 'Course type updated successfully', severity: 'success' });
      } else {
        await courseTypeService.create(data);
        setSnackbar({ open: true, message: 'Course type created successfully', severity: 'success' });
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Operation failed', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await courseTypeService.remove(deleteTarget.id);
      setSnackbar({ open: true, message: 'Course type deleted successfully', severity: 'success' });
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSnackbar({ open: true, message: e.response?.data?.message || 'Delete failed', severity: 'error' });
    }
    setDeleteTarget(null);
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'code', label: 'Code', minWidth: 120 },
    { id: 'name', label: 'Name', minWidth: 200 },
    { id: 'status', label: 'Status', minWidth: 100, format: (v) => <Chip label={v as string} color={v === 'ACTIVE' ? 'success' : 'default'} size="small" /> },
    {
      id: 'actions', label: 'Actions', minWidth: 100, align: 'center', sortable: false,
      format: (_v, row) => {
        const type = row as unknown as CourseType;
        return (
          <Box>
            <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => handleEdit(type)}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(type)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </Box>
        );
      },
    },
  ];

  if (loading && courseTypes.length === 0) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Course Types"
        subtitle={`${courseTypes.length} course type(s)`}
        breadcrumbs={[{ label: 'Principal' }, { label: 'Course Types' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>Add Course Type</Button>}
      />

      <DataTable columns={columns} rows={courseTypes as unknown as Record<string, unknown>[]} searchable searchPlaceholder="Search course types..." />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Course Type' : 'Add Course Type'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(handleSubmitForm)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller name="code" control={control} rules={{ required: 'Code is required' }} render={({ field }) => (
                  <TextField {...field} label="Code" fullWidth size="small" error={!!errors.code} helperText={errors.code?.message} />
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
                <Controller name="name" control={control} rules={{ required: 'Name is required' }} render={({ field }) => (
                  <TextField {...field} label="Name" fullWidth size="small" error={!!errors.name} helperText={errors.name?.message} />
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
        title="Delete Course Type"
        message={`Delete course type "${deleteTarget?.name}"? This cannot be undone.`}
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

export default CourseTypesPage;
