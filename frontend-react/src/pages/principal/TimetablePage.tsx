import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Alert, Snackbar, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTimetables, createTimetable, deleteTimetable } from '../../store/slices/timetableSlice';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import { fetchCourses } from '../../store/slices/courseSlice';
import { Timetable, CourseClass } from '../../types';
import courseService from '../../services/courseService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getDayName, formatTime } from '../../utils/formatters';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const schema = yup.object({
  classId: yup.string().required('Class is required'),
  teacherId: yup.string().required('Teacher is required'),
  daysOfWeek: yup.array(yup.string().required()).min(1, 'Select at least one day').required(),
  startTime: yup.string().required('Start time is required'),
  endTime: yup.string().required('End time is required'),
});

type TimetableFormData = {
  classId: string;
  teacherId: string;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
};

const TimetablePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: timetables, loading } = useSelector((state: RootState) => state.timetables);
  const { list: teachers } = useSelector((state: RootState) => state.teachers);
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<TimetableFormData>({
    resolver: yupResolver(schema) as never,
    defaultValues: { classId: '', teacherId: '', daysOfWeek: ['MONDAY'], startTime: '09:00', endTime: '10:00' },
  });

  useEffect(() => {
    dispatch(fetchTimetables());
    dispatch(fetchTeachers());
    dispatch(fetchCourses());
    courseService.getAllClasses().then(setClasses).catch(() => {});
  }, [dispatch]);

  const handleSubmitForm = async (data: TimetableFormData) => {
    const { daysOfWeek, ...rest } = data;
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

  const classNameById = useMemo(
    () => new Map(classes.map(c => [c.id, c.className])),
    [classes],
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Add Schedule
          </Button>
        }
      />

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
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
                  <TableCell>{s.className || classNameById.get(s.classId) || '-'}</TableCell>
                  <TableCell>{s.teacherName || teacherNameById.get(s.teacherId) || '-'}</TableCell>
                  <TableCell>{formatTime(s.startTime)} – {formatTime(s.endTime)}</TableCell>
                  <TableCell align="center">
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Timetable Entry</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(handleSubmitForm)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller name="classId" control={control} render={({ field }) => (
                  <TextField {...field} select label="Class" fullWidth size="small" error={!!errors.classId} helperText={errors.classId?.message}>
                    {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.className}</MenuItem>)}
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
            <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained">Add</Button>
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
