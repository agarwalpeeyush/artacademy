import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Chip, Alert, Snackbar, MenuItem, Autocomplete,
  IconButton, Tooltip, Typography, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchStudents } from '../../store/slices/studentSlice';
import { fetchCourses } from '../../store/slices/courseSlice';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import { fetchEnrollments, createEnrollment, updateEnrollmentStatus, updateEnrollmentFees, deleteEnrollment } from '../../store/slices/enrollmentSlice';
import { Enrollment, Course, Timetable, CourseFeeItem, FeeType, FeeCadence } from '../../types';
import timetableService from '../../services/timetableService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, feeTypeLabel } from '../../utils/formatters';
import { teacherCoursesFromTimetables, formatTimetableSummary } from '../../utils/enrollmentHelpers';

const schema = yup.object({
  studentId: yup.string().required('Student is required'),
  courseId: yup.string().required('Course is required'),
  enrollmentDate: yup.string().required('Enrollment date is required'),
});

type EnrollmentFormData = {
  studentId: string;
  courseId: string;
  enrollmentDate: string;
};

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success', COMPLETED: 'default', DROPPED: 'error', SUSPENDED: 'warning',
};

// Each fee type has an intrinsic cadence (mirrors the backend FeeType enum).
const FEE_CADENCE: Record<FeeType, FeeCadence> = {
  ADMISSION: 'ONE_TIME', MONTHLY: 'RECURRING', EXAM: 'ONE_TIME', ONE_TIME_SHORT_TERM: 'ONE_TIME',
};

const FEE_TYPES: FeeType[] = ['ADMISSION', 'MONTHLY', 'EXAM', 'ONE_TIME_SHORT_TERM'];

// A row in the Edit Fees dialog: a fee type on this enrollment with its amount.
type FeeLine = {
  feeType: FeeType;
  amount: number;
  cadence: FeeCadence;
};

const TeacherEnrollmentsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { list: enrollments, loading } = useSelector((state: RootState) => state.enrollments);
  const { list: students } = useSelector((state: RootState) => state.students);
  const { list: courses } = useSelector((state: RootState) => state.courses);
  const { list: teachers } = useSelector((state: RootState) => state.teachers);

  const teacherId = user?.id || '';
  const [myTimetables, setMyTimetables] = useState<Timetable[]>([]);
  const [searchCourse, setSearchCourse] = useState<Course | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feeLines, setFeeLines] = useState<CourseFeeItem[]>([]);
  const [editFeesTarget, setEditFeesTarget] = useState<Enrollment | null>(null);
  const [editFeeLines, setEditFeeLines] = useState<FeeLine[]>([]);
  const [savingFees, setSavingFees] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<EnrollmentFormData>({
    resolver: yupResolver(schema) as never,
    defaultValues: { studentId: '', courseId: '', enrollmentDate: new Date().toISOString().split('T')[0] },
  });

  const teacherName = useMemo(() => {
    const t = teachers.find(tt => tt.id === teacherId);
    return t ? `${t.firstName} ${t.lastName}`.trim() : (user?.username || '');
  }, [teachers, teacherId, user]);

  const myCourses = useMemo(
    () => teacherCoursesFromTimetables(myTimetables, teacherId, courses),
    [myTimetables, teacherId, courses],
  );
  const myCourseIds = useMemo(() => new Set(myCourses.map(c => c.id)), [myCourses]);

  const timetablesByCourse = useMemo(() => {
    const map = new Map<string, Timetable[]>();
    myTimetables.forEach((t) => {
      const arr = map.get(t.courseId) ?? [];
      arr.push(t);
      map.set(t.courseId, arr);
    });
    return map;
  }, [myTimetables]);

  useEffect(() => {
    dispatch(fetchStudents());
    dispatch(fetchCourses());
    dispatch(fetchTeachers());
    dispatch(fetchEnrollments());
    if (teacherId) {
      timetableService.getByTeacher(teacherId).then(setMyTimetables).catch(() => setMyTimetables([]));
    }
  }, [dispatch, teacherId]);

  // Auto-select the only course when the teacher teaches exactly one
  useEffect(() => {
    if (!searchCourse && myCourses.length === 1) {
      setSearchCourse(myCourses[0]);
    }
  }, [myCourses, searchCourse]);

  const feesForCourse = (courseId: string): CourseFeeItem[] => {
    const course = courses.find(c => c.id === courseId);
    return (course?.fees ?? []).map(f => ({
      feeType: f.feeType,
      amount: f.amount,
      cadence: f.cadence,
    }));
  };

  const openCreate = () => {
    const courseId = searchCourse?.id || (myCourses.length === 1 ? myCourses[0].id : '');
    reset({
      studentId: '',
      courseId,
      enrollmentDate: new Date().toISOString().split('T')[0],
    });
    setFeeLines(courseId ? feesForCourse(courseId) : []);
    setDialogOpen(true);
  };

  const updateFeeLine = (idx: number, amount: string) => {
    setFeeLines(prev => prev.map((f, i) => i === idx ? { ...f, amount: Number(amount) } : f));
  };

  const handleSubmitForm = async (data: EnrollmentFormData) => {
    try {
      await dispatch(createEnrollment({
        ...data, status: 'ACTIVE',
        studentName: students.find(s => s.id === data.studentId)?.firstName || '',
        courseName: courses.find(c => c.id === data.courseId)?.courseName || '',
        fees: feeLines,
      })).unwrap();
      setSnackbar({ open: true, message: 'Student enrolled successfully', severity: 'success' });
      setDialogOpen(false);
      reset();
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Enrollment failed', severity: 'error' });
    }
  };

  const openEditFees = (enrollment: Enrollment) => {
    setEditFeesTarget(enrollment);
    const existing = enrollment.fees ?? [];
    const courseFees = courses.find(c => c.id === enrollment.courseId)?.fees ?? [];
    // Seed from the union of the enrollment's current fees and the course's current catalog.
    // Enrollment amounts win for shared types; course-only types (e.g. one added after enrollment)
    // appear by default with the course amount. Any line can be removed before saving.
    const lines: FeeLine[] = [];
    const seen = new Set<string>();
    existing.forEach(f => {
      seen.add(f.feeType);
      lines.push({ feeType: f.feeType, amount: f.amount, cadence: FEE_CADENCE[f.feeType] });
    });
    courseFees.forEach(f => {
      if (seen.has(f.feeType)) return;
      seen.add(f.feeType);
      lines.push({ feeType: f.feeType, amount: f.amount, cadence: FEE_CADENCE[f.feeType] });
    });
    setEditFeeLines(lines);
  };

  const updateEditFeeLine = (idx: number, amount: string) => {
    setEditFeeLines(prev => prev.map((f, i) => i === idx ? { ...f, amount: Number(amount) } : f));
  };

  const changeFeeType = (idx: number, feeType: FeeType) => {
    setEditFeeLines(prev => prev.map((f, i) => i === idx ? { ...f, feeType, cadence: FEE_CADENCE[feeType] } : f));
  };

  const addFeeLine = () => {
    setEditFeeLines(prev => {
      const used = new Set(prev.map(f => f.feeType));
      const next = FEE_TYPES.find(t => !used.has(t)) ?? FEE_TYPES[0];
      return [...prev, { feeType: next, amount: 0, cadence: FEE_CADENCE[next] }];
    });
  };

  const removeFeeLine = (idx: number) => {
    setEditFeeLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveFees = async () => {
    if (!editFeesTarget) return;
    const seen = new Set<string>();
    for (const f of editFeeLines) {
      if (seen.has(f.feeType)) {
        setSnackbar({ open: true, message: `Duplicate fee type: ${feeTypeLabel(f.feeType)}`, severity: 'error' });
        return;
      }
      seen.add(f.feeType);
    }
    if (editFeeLines.length === 0) {
      setSnackbar({ open: true, message: 'Add at least one fee type', severity: 'error' });
      return;
    }
    const fees: CourseFeeItem[] = editFeeLines.map(f => ({ feeType: f.feeType, amount: f.amount, cadence: f.cadence }));
    setSavingFees(true);
    try {
      await dispatch(updateEnrollmentFees({ id: editFeesTarget.id, fees })).unwrap();
      setSnackbar({ open: true, message: 'Fees updated successfully', severity: 'success' });
      setEditFeesTarget(null);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Failed to update fees', severity: 'error' });
    } finally {
      setSavingFees(false);
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
    {
      id: 'timetable', label: 'Timetable', minWidth: 200, sortable: false,
      format: (_v, row) => {
        const enrollment = row as unknown as Enrollment;
        const summary = formatTimetableSummary(timetablesByCourse.get(enrollment.courseId) ?? []);
        return summary || <span style={{ color: '#9e9e9e' }}>Not scheduled</span>;
      },
    },
    { id: 'enrollmentDate', label: 'Enrolled On', minWidth: 120, format: (v) => formatDate(v as string) },
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
      id: 'actions', label: 'Actions', minWidth: 120, align: 'center',
      format: (_v, row) => {
        const enrollment = row as unknown as Enrollment;
        return (
          <Box display="flex" gap={0.5} justifyContent="center">
            <Tooltip title="Edit fees">
              <IconButton size="small" color="primary" onClick={() => openEditFees(enrollment)}>
                <PaymentsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancel enrollment">
              <IconButton size="small" color="error" onClick={() => setDeleteTarget(enrollment)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  if (loading && enrollments.length === 0) return <LoadingSpinner />;

  // Scope table to this teacher's courses, then optional course filter
  const mine = enrollments.filter((e) => myCourseIds.has(e.courseId));
  const filtered = searchCourse ? mine.filter((e) => e.courseId === searchCourse.id) : mine;

  const rows = filtered.map((e) => {
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
        subtitle={`${filtered.length} of ${mine.length} enrollment(s)`}
        breadcrumbs={[{ label: 'Teacher' }, { label: 'Enrollments' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={myCourses.length === 0}>Enroll Student</Button>}
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField label="Teacher" value={teacherName} size="small" fullWidth disabled />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Autocomplete
            options={myCourses}
            getOptionLabel={(o) => o.courseName}
            value={searchCourse}
            onChange={(_e, val) => setSearchCourse(val)}
            renderInput={(params) => <TextField {...params} label="Filter by Course" size="small" />}
          />
        </Grid>
      </Grid>

      <DataTable columns={columns} rows={rows as unknown as Record<string, unknown>[]} searchable searchKeys={['studentName']} searchPlaceholder="Search by student..." />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enroll Student</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(handleSubmitForm)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField label="Teacher" value={teacherName} size="small" fullWidth disabled helperText="Your enrollments" />
              </Grid>
              <Grid item xs={12}>
                <Controller name="studentId" control={control} render={({ field }) => (
                  <TextField {...field} select label="Student" fullWidth size="small" error={!!errors.studentId} helperText={errors.studentId?.message}>
                    {students.map(s => <MenuItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="courseId" control={control} render={({ field }) => (
                  <TextField {...field} select label="Course" fullWidth size="small"
                    disabled={myCourses.length <= 1 || !!searchCourse} error={!!errors.courseId} helperText={errors.courseId?.message}
                    onChange={(e) => { field.onChange(e); setFeeLines(feesForCourse(e.target.value)); }}>
                    {myCourses.map(c => <MenuItem key={c.id} value={c.id}>{c.courseName}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="enrollmentDate" control={control} render={({ field }) => (
                  <TextField {...field} label="Enrollment Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} error={!!errors.enrollmentDate} helperText={errors.enrollmentDate?.message} />
                )} />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" gutterBottom>Fees</Typography>
                {feeLines.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Select a course to load its fees. Amounts can be overridden for this student.
                  </Typography>
                ) : (
                  feeLines.map((f, idx) => (
                    <Box key={`${f.feeType}-${idx}`} display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {feeTypeLabel(f.feeType)}{f.cadence === 'RECURRING' ? ' (monthly)' : ''}
                      </Typography>
                      <TextField
                        type="number" size="small" label="Amount" sx={{ width: 140 }}
                        value={f.amount}
                        onChange={e => updateFeeLine(idx, e.target.value)}
                      />
                    </Box>
                  ))
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained">Enroll</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!editFeesTarget} onClose={() => setEditFeesTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Fees</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {editFeesTarget?.studentName || 'Student'} — {editFeesTarget?.courseName || 'Course'}
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Add or remove fee types for this child. The saved fees are final for this enrollment.
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addFeeLine} disabled={editFeeLines.length >= FEE_TYPES.length}>
              Add Fee
            </Button>
          </Box>
          <Divider sx={{ my: 1 }} />
          {editFeeLines.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No fee lines. Use "Add Fee" to add one.</Typography>
          ) : (
            editFeeLines.map((f, idx) => {
              const usedElsewhere = new Set(editFeeLines.filter((_, i) => i !== idx).map(l => l.feeType));
              return (
                <Box key={idx} display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <TextField
                    select size="small" label="Fee Type" sx={{ flex: 1 }}
                    value={f.feeType}
                    onChange={e => changeFeeType(idx, e.target.value as FeeType)}
                  >
                    {FEE_TYPES.map(ft => (
                      <MenuItem key={ft} value={ft} disabled={ft !== f.feeType && usedElsewhere.has(ft)}>
                        {feeTypeLabel(ft)}{FEE_CADENCE[ft] === 'RECURRING' ? ' (monthly)' : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    type="number" size="small" label="Amount" sx={{ width: 130 }}
                    value={f.amount}
                    onChange={e => updateEditFeeLine(idx, e.target.value)}
                  />
                  <IconButton size="small" color="error" onClick={() => removeFeeLine(idx)} aria-label="remove fee">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditFeesTarget(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleSaveFees} variant="contained" disabled={savingFees}>Save</Button>
        </DialogActions>
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

export default TeacherEnrollmentsPage;
