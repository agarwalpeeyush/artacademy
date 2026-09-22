import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Alert, Snackbar, MenuItem, Paper, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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
import { getDayName } from '../../utils/formatters';
import WeeklyTimetable, { CalendarBlock } from '../../components/timetable/WeeklyTimetable';
import { DAYS, slotToIso, isoToSlot, hhmm, colorForCourse, ANCHOR_ISO } from '../../components/timetable/weekAdapter';

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

  const courseNameById = useMemo(
    () => new Map(courses.map(c => [c.id, c.courseName])),
    [courses],
  );
  const teacherNameById = useMemo(
    () => new Map(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`.trim()])),
    [teachers],
  );

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  const handleAdd = () => {
    setEditing(null);
    reset({ courseId: '', teacherId: '', daysOfWeek: ['MONDAY'], startTime: '09:00', endTime: '10:00' });
    setDialogOpen(true);
  };

  // Click / drag on an empty slot: open the add dialog prefilled with that day + time range.
  const handleSelectRange = (startIso: string, endIso: string) => {
    const s = isoToSlot(startIso);
    const e = isoToSlot(endIso);
    setEditing(null);
    reset({ courseId: '', teacherId: '', daysOfWeek: [s.dayOfWeek], startTime: s.time, endTime: e.time });
    setDialogOpen(true);
  };

  const handleEditById = (id: string) => {
    const s = timetables.find(t => t.id === id);
    if (!s) return;
    setEditing(s);
    reset({
      courseId: s.courseId,
      teacherId: s.teacherId,
      daysOfWeek: [s.dayOfWeek.toUpperCase()],
      startTime: hhmm(s.startTime),
      endTime: hhmm(s.endTime),
    });
    setDialogOpen(true);
  };

  // Drag or resize an existing block: persist the new day/time via update.
  const handleReschedule = async (id: string, startIso: string, endIso: string) => {
    const slot = timetables.find(t => t.id === id);
    if (!slot) return;
    const s = isoToSlot(startIso);
    const e = isoToSlot(endIso);
    try {
      await dispatch(updateTimetable({
        id,
        courseId: slot.courseId,
        teacherId: slot.teacherId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.time,
        endTime: e.time,
      })).unwrap();
      notify('Class rescheduled');
    } catch (err: unknown) {
      notify(String(err) || 'Reschedule failed', 'error');
      dispatch(fetchTimetables()); // revert optimistic drag
    }
  };

  const handleSubmitForm = async (data: TimetableFormData) => {
    const { daysOfWeek, ...rest } = data;

    if (editing) {
      try {
        await dispatch(updateTimetable({ id: editing.id, ...rest, dayOfWeek: daysOfWeek[0] })).unwrap();
        notify('Timetable entry updated');
        setDialogOpen(false);
        setEditing(null);
        reset();
      } catch (err: unknown) {
        notify(String(err) || 'Update failed', 'error');
      }
      return;
    }

    // Bulk weekly creation: one class per selected day in a single workflow.
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
      notify(`Added ${successCount} class${successCount === 1 ? '' : 'es'} to the weekly schedule`);
      setDialogOpen(false);
      reset();
    } else {
      notify(`Added ${successCount}, failed: ${failures.join('; ')}`, 'error');
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await dispatch(deleteTimetable(editing.id)).unwrap();
      notify('Timetable entry deleted');
      setDialogOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      notify(String(err) || 'Delete failed', 'error');
    }
  };

  const blocks: CalendarBlock[] = useMemo(
    () => timetables.map(s => ({
      id: s.id,
      start: slotToIso(s.dayOfWeek, s.startTime),
      end: slotToIso(s.dayOfWeek, s.endTime),
      color: colorForCourse(s.courseId),
      title: s.courseName || courseNameById.get(s.courseId) || 'Course',
      subtitle: s.teacherName || teacherNameById.get(s.teacherId) || 'Unassigned',
    })),
    [timetables, courseNameById, teacherNameById],
  );

  if (loading && timetables.length === 0) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Weekly Schedule"
        subtitle="Drag on the grid to add a class, drag a block to reschedule, click to edit"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Weekly Schedule' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
            Create Weekly Schedule
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        {timetables.length === 0 && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No classes scheduled yet. Drag on the grid or use “Create Weekly Schedule” to add classes.
          </Typography>
        )}
        <WeeklyTimetable
          events={blocks}
          initialDate={ANCHOR_ISO}
          onSelectRange={handleSelectRange}
          onEventClick={handleEditById}
          onEventDrop={handleReschedule}
          onEventResize={handleReschedule}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Class' : 'Create Weekly Schedule'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(handleSubmitForm)}>
          <DialogContent>
            {!editing && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select one or more days to schedule this class across the week in a single step.
              </Typography>
            )}
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
              <Grid item xs={12} sm={3}>
                <Controller name="startTime" control={control} render={({ field }) => (
                  <TextField {...field} label="Start Time" type="time" fullWidth size="small" InputLabelProps={{ shrink: true }} error={!!errors.startTime} helperText={errors.startTime?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Controller name="endTime" control={control} render={({ field }) => (
                  <TextField {...field} label="End Time" type="time" fullWidth size="small" InputLabelProps={{ shrink: true }} error={!!errors.endTime} helperText={errors.endTime?.message} />
                )} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
            <Box>
              {editing && (
                <Button color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
                  Delete
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button onClick={() => { setDialogOpen(false); setEditing(null); }} variant="outlined">Cancel</Button>
              <Button type="submit" variant="contained">{editing ? 'Save' : 'Add to Schedule'}</Button>
            </Box>
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
