import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Alert, Snackbar, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTimetables, createTimetable, updateTimetable, deleteTimetable } from '../../store/slices/timetableSlice';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import { fetchCourses } from '../../store/slices/courseSlice';
import { Timetable } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getDayName, formatTime } from '../../utils/formatters';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const schema = yup.object({
  courseId: yup.string().required('Course is required'),
  teacherId: yup.string().required('Teacher is required'),
  daysOfWeek: yup.array(yup.string().required()).min(1, 'Select at least one day').required(),
  startTime: yup.string().required('Start time is required'),
  endTime: yup.string().required('End time is required'),
});

type TimetableFormData = {
  courseId: string;
  teacherId: string;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
};

const TimetablePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: timetables, loading } = useSelector((state: RootState) => state.timetables);
  const { list: teachers } = useSelector((state: RootState) => state.teachers);
  const { list: courses } = useSelector((state: RootState) => state.courses);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Timetable | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<TimetableFormData>({
    resolver: yupResolver(schema) as never,
    defaultValues: { courseId: '', teacherId: '', daysOfWeek: ['MONDAY'], startTime: '09:00', endTime: '10:00' },
  });

  useEffect(() => {
    dispatch(fetchTimetables());
    dispatch(fetchTeachers());
    dispatch(fetchCourses());
  }, [dispatch]);

  const handleAdd = () => {
    setEditing(null);
    reset({ courseId: '', teacherId: '', daysOfWeek: ['MONDAY'], startTime: '09:00', endTime: '10:00' });
    setDialogOpen(true);
  };

  const handleEdit = (s: Timetable) => {
    setEditing(s);
    reset({
      courseId: s.courseId,
      teacherId: s.teacherId,
      daysOfWeek: [s.dayOfWeek.toUpperCase()],
      startTime: s.startTime.slice(0, 5),
      endTime: s.endTime.slice(0, 5),
    });
    setDialogOpen(true);
  };

  const handleSubmitForm = async (data: TimetableFormData) => {
    const { daysOfWeek, ...rest } = data;

    if (editing) {
      try {
        await dispatch(updateTimetable({ id: editing.id, ...rest, dayOfWeek: daysOfWeek[0] })).unwrap();
        setSnackbar({ open: true, message: 'Timetable entry updated', severity: 'success' });
        setDialogOpen(false);
        setEditing(null);
        reset();
      } catch (err: unknown) {
        setSnackbar({ open: true, message: String(err) || 'Update failed', severity: 'error' });
      }
      return;
    }

    const failures: string[] = [];
    let successCount = 0;
    for (const day of daysOfWeek) {
      try {
        await dispatch(createTimetable({ ...rest, dayOfWeek: day })).unwrap();
        successCount += 1;
      } catch (err: unknown) {
        failures.push(`${getDayName(day)}: ${String(err)}`);
      }
    }
    if (failures.length === 0) {
      setSnackbar({ open: true, message: `Added ${successCount} timetable entr(ies)`, severity: 'success' });
      setDialogOpen(false);
      reset();
    } else {
      setSnackbar({
        open: true,
        message: `Added ${successCount}, failed: ${failures.join('; ')}`,
        severity: 'error',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteTimetable(id)).unwrap();
      setSnackbar({ open: true, message: 'Timetable entry deleted', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Delete failed', severity: 'error' });
    }
  };

  const courseNameById = useMemo(
    () => new Map(courses.map(c => [c.id, c.courseName])),
    [courses],
  );
  const teacherNameById = useMemo(
    () => new Map(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`.trim()])),
    [teachers],
  );

  const groupedByDay = DAYS.reduce<Record<string, Timetable[]>>((acc, day) => {
    acc[day] = timetables.filter(s => s.dayOfWeek.toUpperCase() === day);
    return acc;
  }, {});

  if (loading && timetables.length === 0) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Timetable"
        subtitle="Weekly class timetable"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Timetable' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
            Add Schedule
          </Button>
        }
      />

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Course</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {DAYS.flatMap(day => {
              const dayTimetables = groupedByDay[day];
              if (dayTimetables.length === 0) return [];
              return dayTimetables.map((s, idx) => (
                <TableRow key={s.id} sx={{ bgcolor: idx === 0 ? '#f8f9ff' : 'inherit' }}>
                  {idx === 0 && (
                    <TableCell rowSpan={dayTimetables.length} sx={{ fontWeight: 600, bgcolor: '#E3F2FD', verticalAlign: 'top', pt: 2 }}>
                      {getDayName(day)}
                    </TableCell>
                  )}
                  <TableCell>{s.courseName || courseNameById.get(s.courseId) || '-'}</TableCell>
                  <TableCell>{s.teacherName || teacherNameById.get(s.teacherId) || '-'}</TableCell>
                  <TableCell>{formatTime(s.startTime)} – {formatTime(s.endTime)}</TableCell>
                  <TableCell align="center">
                    <Button size="small" startIcon={<EditIcon />} onClick={() => handleEdit(s)}>
                      Edit
                    </Button>
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(s.id)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ));
            })}
            {timetables.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No timetables found. Add a schedule to get started.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(handleSubmitForm)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller name="courseId" control={control} render={({ field }) => (
                  <TextField {...field} select label="Course" fullWidth size="small" error={!!errors.courseId} helperText={errors.courseId?.message}>
                    {courses.map(c => <MenuItem key={c.id} value={c.id}>{c.courseName}</MenuItem>)}
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
              <Grid item xs={12} sm={6}>
                <Controller name="daysOfWeek" control={control} render={({ field }) => (
                  editing ? (
                    <TextField
                      select
                      value={field.value[0] ?? ''}
                      onChange={(e) => field.onChange([e.target.value])}
                      label="Day of Week"
                      fullWidth
                      size="small"
                      error={!!errors.daysOfWeek}
                      helperText={errors.daysOfWeek?.message as string | undefined}
                    >
                      {DAYS.map(d => <MenuItem key={d} value={d}>{getDayName(d)}</MenuItem>)}
                    </TextField>
                  ) : (
                    <TextField
                      {...field}
                      select
                      SelectProps={{ multiple: true, renderValue: (sel) => (sel as string[]).map(getDayName).join(', ') }}
                      label="Days of Week"
                      fullWidth
                      size="small"
                      error={!!errors.daysOfWeek}
                      helperText={errors.daysOfWeek?.message as string | undefined}
                    >
                      {DAYS.map(d => <MenuItem key={d} value={d}>{getDayName(d)}</MenuItem>)}
                    </TextField>
                  )
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="startTime" control={control} render={({ field }) => (
                  <TextField {...field} label="Start Time" type="time" fullWidth size="small" InputLabelProps={{ shrink: true }} error={!!errors.startTime} helperText={errors.startTime?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="endTime" control={control} render={({ field }) => (
                  <TextField {...field} label="End Time" type="time" fullWidth size="small" InputLabelProps={{ shrink: true }} error={!!errors.endTime} helperText={errors.endTime?.message} />
                )} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => { setDialogOpen(false); setEditing(null); }} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained">{editing ? 'Update' : 'Add'}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TimetablePage;
