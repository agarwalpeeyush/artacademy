import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, IconButton, Tooltip, Alert, Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Room } from '../../types';
import roomService from '../../services/roomService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const schema = yup.object({
  roomName: yup.string().required('Room name is required'),
  capacity: yup.number().required('Capacity is required').min(1, 'Capacity must be at least 1'),
});

type RoomFormData = Omit<Room, 'id'>;

const RoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<RoomFormData>({
    resolver: yupResolver(schema) as never,
  });

  useEffect(() => { loadRooms(); }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await roomService.getAll();
      setRooms(data);
    } catch { setRooms([]); }
    finally { setLoading(false); }
  };

  const emptyForm: RoomFormData = { roomName: '', capacity: 20 };

  const handleAdd = () => {
    setEditing(null);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (room: Room) => {
    setEditing(room);
    reset({ roomName: room.roomName, capacity: room.capacity });
    setDialogOpen(true);
  };

  const handleSubmitForm = async (data: RoomFormData) => {
    try {
      if (editing) {
        await roomService.update(editing.id, data);
        setSnackbar({ open: true, message: 'Room updated successfully', severity: 'success' });
      } else {
        await roomService.create(data);
        setSnackbar({ open: true, message: 'Room created successfully', severity: 'success' });
      }
      setDialogOpen(false);
      await loadRooms();
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Operation failed', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await roomService.delete(deleteTarget.id);
      setSnackbar({ open: true, message: 'Room deleted', severity: 'success' });
      await loadRooms();
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Delete failed', severity: 'error' });
    }
    setDeleteTarget(null);
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'roomName', label: 'Room Name', minWidth: 200 },
    { id: 'capacity', label: 'Capacity', minWidth: 100, align: 'center' },
    {
      id: 'actions', label: 'Actions', minWidth: 100, align: 'center',
      format: (_v, row) => {
        const room = row as unknown as Room;
        return (
          <Box>
            <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => handleEdit(room)}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(room)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </Box>
        );
      },
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Rooms"
        subtitle={`${rooms.length} room(s) available`}
        breadcrumbs={[{ label: 'Principal' }, { label: 'Rooms' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>Add Room</Button>}
      />
      <DataTable columns={columns} rows={rooms as unknown as Record<string, unknown>[]} searchable searchPlaceholder="Search rooms..." />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Room' : 'Add New Room'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(handleSubmitForm)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller name="roomName" control={control} render={({ field }) => (
                  <TextField {...field} label="Room Name" fullWidth size="small" error={!!errors.roomName} helperText={errors.roomName?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="capacity" control={control} render={({ field }) => (
                  <TextField {...field} label="Capacity" type="number" fullWidth size="small" error={!!errors.capacity} helperText={errors.capacity?.message} />
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

      <ConfirmDialog open={!!deleteTarget} title="Delete Room" message={`Delete room "${deleteTarget?.roomName}"?`} severity="error" confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default RoomsPage;
