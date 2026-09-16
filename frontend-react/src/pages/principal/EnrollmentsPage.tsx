import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Chip, Alert, Snackbar, MenuItem, Autocomplete,
  IconButton, Tooltip, Checkbox, ListItemText, OutlinedInput, InputLabel,
  FormControl, Select, Typography, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentsIcon from '@mui/icons-material/Payments';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchStudents } from '../../store/slices/studentSlice';
import { fetchCourses } from '../../store/slices/courseSlice';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import { fetchEnrollments, createEnrollment, updateEnrollmentStatus, updateEnrollmentFees, updateEnrollmentTimetables, deleteEnrollment } from '../../store/slices/enrollmentSlice';
import { Enrollment, Course, Teacher, Timetable, CourseFeeItem, FeeType, FeeCadence, ShareType } from '../../types';
import timetableService from '../../services/timetableService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, formatCurrency, feeTypeLabel, instituteShare, teacherShare } from '../../utils/formatters';
import { buildCourseTeacherMap, resolveTeacherNames, filterEnrollments, formatTimetableSummary, formatSlotLabel } from '../../utils/enrollmentHelpers';

const schema = yup.object({
  studentId: yup.string().required('Student is required'),
  courseId: yup.string().required('Course is required'),
  teacherId: yup.string().required('Teacher is required'),
  enrollmentDate: yup.string().required('Enrollment date is required'),
  timetableIds: yup.array().of(yup.string().required()).required(),
});

type EnrollmentFormData = {
  studentId: string;
  courseId: string;
  teacherId: string;
  enrollmentDate: string;
  timetableIds: string[];
};

// A row in a fee editor: a fee type with its per-child amount and institute-share rule.
type FeeLine = {
  feeType: FeeType;
  amount: number;
  cadence: FeeCadence;
  instituteShareType: ShareType | null;
  instituteShareValue: number | null;
  // Optional per-line due-date override as ISO yyyy-MM-dd (native date input); empty lets the
  // backend compute the default.
  dueDate: string;
};

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success', COMPLETED: 'default', DROPPED: 'error', SUSPENDED: 'warning',
};

// Each fee type has an intrinsic cadence (mirrors the backend FeeType enum). Used when adding a
// fee line that isn't already on the enrollment.
const FEE_CADENCE: Record<FeeType, FeeCadence> = {
  ADMISSION: 'ONE_TIME', MONTHLY: 'RECURRING', EXAM: 'ONE_TIME', ONE_TIME_SHORT_TERM: 'ONE_TIME',
};

const FEE_TYPES: FeeType[] = ['ADMISSION', 'MONTHLY', 'EXAM', 'ONE_TIME_SHORT_TERM'];

const EnrollmentsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: enrollments, loading } = useSelector((state: RootState) => state.enrollments);
  const { list: students } = useSelector((state: RootState) => state.students);
  const { list: courses } = useSelector((state: RootState) => state.courses);
  const { list: teachers } = useSelector((state: RootState) => state.teachers);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [searchCourse, setSearchCourse] = useState<Course | null>(null);
  const [searchTeacher, setSearchTeacher] = useState<Teacher | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [enrollFeeLines, setEnrollFeeLines] = useState<FeeLine[]>([]);
  const [editFeesTarget, setEditFeesTarget] = useState<Enrollment | null>(null);
  const [editFeeLines, setEditFeeLines] = useState<FeeLine[]>([]);
  const [savingFees, setSavingFees] = useState(false);
  const [editSlotsTarget, setEditSlotsTarget] = useState<Enrollment | null>(null);
  const [editSlotIds, setEditSlotIds] = useState<string[]>([]);
  const [savingSlots, setSavingSlots] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<EnrollmentFormData>({
    resolver: yupResolver(schema) as never,
    defaultValues: { studentId: '', courseId: '', teacherId: '', enrollmentDate: new Date().toISOString().split('T')[0], timetableIds: [] },
  });

  const selectedCourseId = useWatch({ control, name: 'courseId' });

  // Pre-fill the enroll dialog's fee lines from the selected course's template (F3 defaults).
  const seedFeeLinesFromCourse = (courseId: string): FeeLine[] => {
    const courseFees = courses.find((c) => c.id === courseId)?.fees ?? [];
    return courseFees.map((f) => ({
      feeType: f.feeType,
      amount: f.amount,
      cadence: FEE_CADENCE[f.feeType],
      instituteShareType: f.instituteShareType ?? null,
      instituteShareValue: f.instituteShareValue ?? null,
      dueDate: '',
    }));
  };

  const courseTeacherMap = useMemo(() => buildCourseTeacherMap(timetables), [timetables]);
  const timetablesByCourse = useMemo(() => {
    const map = new Map<string, Timetable[]>();
    timetables.forEach((t) => {
      const arr = map.get(t.courseId) ?? [];
      arr.push(t);
      map.set(t.courseId, arr);
    });
    return map;
  }, [timetables]);

  const courseSlots = useMemo(
    () => timetablesByCourse.get(selectedCourseId) ?? [],
    [timetablesByCourse, selectedCourseId],
  );

  useEffect(() => {
    dispatch(fetchStudents());
    dispatch(fetchCourses());
    dispatch(fetchTeachers());
    dispatch(fetchEnrollments());
    timetableService.getAll().then(setTimetables).catch(() => setTimetables([]));
  }, [dispatch]);

  const openCreate = () => {
    reset({
      studentId: '',
      courseId: searchCourse?.id || '',
      teacherId: searchTeacher?.id || '',
      enrollmentDate: new Date().toISOString().split('T')[0],
      timetableIds: [],
    });
    setEnrollFeeLines(searchCourse?.id ? seedFeeLinesFromCourse(searchCourse.id) : []);
    setDialogOpen(true);
  };

  // Re-seed the enroll dialog's fee lines whenever the chosen course changes.
  useEffect(() => {
    if (dialogOpen) {
      setEnrollFeeLines(selectedCourseId ? seedFeeLinesFromCourse(selectedCourseId) : []);
    }
  }, [selectedCourseId, dialogOpen]);

  const handleSubmitForm = async (data: EnrollmentFormData) => {
    if (enrollFeeLines.length === 0) {
      setSnackbar({ open: true, message: 'Add at least one fee line', severity: 'error' });
      return;
    }
    const fees: CourseFeeItem[] = enrollFeeLines.map((f) => ({
      feeType: f.feeType,
      amount: f.amount,
      cadence: f.cadence,
      instituteShareType: f.instituteShareType,
      instituteShareValue: f.instituteShareType ? f.instituteShareValue : null,
      dueDate: f.dueDate || null,
    }));
    try {
      await dispatch(createEnrollment({
        ...data, status: 'ACTIVE', fees,
        studentName: students.find(s => s.id === data.studentId)?.firstName || '',
        courseName: courses.find(c => c.id === data.courseId)?.courseName || '',
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

  const openEditFees = (enrollment: Enrollment) => {
    setEditFeesTarget(enrollment);
    const existing = enrollment.fees ?? [];
    const courseFees = courses.find(c => c.id === enrollment.courseId)?.fees ?? [];
    // Seed from the union of the enrollment's current fee lines and the course's current catalog.
    // Enrollment amounts + share rules win for fee types on both; fee types that exist only on the
    // course appear by default with the course amount/rule. The principal can delete any line.
    const lines: FeeLine[] = [];
    const seen = new Set<string>();
    existing.forEach(f => {
      seen.add(f.feeType);
      lines.push({
        feeType: f.feeType, amount: f.amount, cadence: FEE_CADENCE[f.feeType],
        instituteShareType: f.instituteShareType ?? null,
        instituteShareValue: f.instituteShareValue ?? null,
        dueDate: f.dueDate ? f.dueDate.slice(0, 10) : '',
      });
    });
    courseFees.forEach(f => {
      if (seen.has(f.feeType)) return;
      seen.add(f.feeType);
      lines.push({
        feeType: f.feeType, amount: f.amount, cadence: FEE_CADENCE[f.feeType],
        instituteShareType: f.instituteShareType ?? null,
        instituteShareValue: f.instituteShareValue ?? null,
        dueDate: '',
      });
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
      return [...prev, { feeType: next, amount: 0, cadence: FEE_CADENCE[next], instituteShareType: null, instituteShareValue: null, dueDate: '' }];
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
      if (f.instituteShareType === 'PERCENTAGE' && (f.instituteShareValue ?? 0) > 100) {
        setSnackbar({ open: true, message: `Share % for ${feeTypeLabel(f.feeType)} must be 0–100`, severity: 'error' });
        return;
      }
    }
    if (editFeeLines.length === 0) {
      setSnackbar({ open: true, message: 'Add at least one fee type', severity: 'error' });
      return;
    }
    const fees: CourseFeeItem[] = editFeeLines.map(f => ({
      feeType: f.feeType, amount: f.amount, cadence: f.cadence,
      instituteShareType: f.instituteShareType,
      instituteShareValue: f.instituteShareType ? f.instituteShareValue : null,
      dueDate: f.dueDate || null,
    }));
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

  // Shared fee-line editors for both the enroll dialog (enrollFeeLines) and the Edit Fees dialog
  // (editFeeLines), parameterized by which state setter to mutate.
  type FeeLineSetter = React.Dispatch<React.SetStateAction<FeeLine[]>>;

  const mutateLine = (setter: FeeLineSetter, idx: number, patch: Partial<FeeLine>) =>
    setter(prev => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

  const addLine = (setter: FeeLineSetter) =>
    setter(prev => {
      const used = new Set(prev.map(f => f.feeType));
      const next = FEE_TYPES.find(t => !used.has(t)) ?? FEE_TYPES[0];
      return [...prev, { feeType: next, amount: 0, cadence: FEE_CADENCE[next], instituteShareType: null, instituteShareValue: null, dueDate: '' }];
    });

  const removeLine = (setter: FeeLineSetter, idx: number) =>
    setter(prev => prev.filter((_, i) => i !== idx));

  // Renders the shared editable fee/share rows with a live institute/teacher preview per line.
  const renderFeeLineEditor = (lines: FeeLine[], setter: FeeLineSetter) => (
    lines.length === 0 ? (
      <Typography variant="body2" color="text.secondary">No fee lines. Use "Add Fee" to add one.</Typography>
    ) : (
      lines.map((f, idx) => {
        const usedElsewhere = new Set(lines.filter((_, i) => i !== idx).map(l => l.feeType));
        const inst = instituteShare(f.instituteShareType, f.instituteShareValue, f.amount);
        const teach = teacherShare(f.amount, inst);
        return (
          <Box key={idx} sx={{ mb: 1.5, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <TextField
                select size="small" label="Fee Type" sx={{ flex: 1 }}
                value={f.feeType}
                onChange={e => mutateLine(setter, idx, { feeType: e.target.value as FeeType, cadence: FEE_CADENCE[e.target.value as FeeType] })}
              >
                {FEE_TYPES.map(ft => (
                  <MenuItem key={ft} value={ft} disabled={ft !== f.feeType && usedElsewhere.has(ft)}>
                    {feeTypeLabel(ft)}{FEE_CADENCE[ft] === 'RECURRING' ? ' (monthly)' : ''}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="number" size="small" label="Amount" sx={{ width: 110 }}
                value={f.amount}
                onChange={e => mutateLine(setter, idx, { amount: Number(e.target.value) })}
              />
              <IconButton size="small" color="error" onClick={() => removeLine(setter, idx)} aria-label="remove fee">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
              <TextField
                select size="small" label="Institute Share" sx={{ width: 150 }}
                value={f.instituteShareType ?? 'NONE'}
                onChange={e => {
                  const v = e.target.value;
                  mutateLine(setter, idx, {
                    instituteShareType: v === 'NONE' ? null : (v as ShareType),
                    instituteShareValue: v === 'NONE' ? null : (f.instituteShareValue ?? 0),
                  });
                }}
              >
                <MenuItem value="NONE">None</MenuItem>
                <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                <MenuItem value="AMOUNT">Amount</MenuItem>
              </TextField>
              <TextField
                type="number" size="small" label={f.instituteShareType === 'PERCENTAGE' ? '%' : 'Value'} sx={{ width: 100 }}
                value={f.instituteShareValue ?? ''}
                disabled={!f.instituteShareType}
                onChange={e => mutateLine(setter, idx, { instituteShareValue: e.target.value === '' ? null : Number(e.target.value) })}
              />
              <TextField
                type="date" size="small" label="Due Date" sx={{ width: 160 }}
                InputLabelProps={{ shrink: true }}
                value={f.dueDate}
                onChange={e => mutateLine(setter, idx, { dueDate: e.target.value })}
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                Institute {formatCurrency(inst)} · Teacher {formatCurrency(teach)}
              </Typography>
            </Box>
          </Box>
        );
      })
    )
  );

  const openEditSlots = (enrollment: Enrollment) => {
    setEditSlotsTarget(enrollment);
    setEditSlotIds((enrollment.timetables ?? []).map(t => t.id));
  };

  const handleSaveSlots = async () => {
    if (!editSlotsTarget) return;
    setSavingSlots(true);
    try {
      await dispatch(updateEnrollmentTimetables({ id: editSlotsTarget.id, timetableIds: editSlotIds })).unwrap();
      setSnackbar({ open: true, message: 'Timetable slots updated successfully', severity: 'success' });
      setEditSlotsTarget(null);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Failed to update slots', severity: 'error' });
    } finally {
      setSavingSlots(false);
    }
  };

  const editSlotOptions = useMemo(
    () => (editSlotsTarget ? (timetablesByCourse.get(editSlotsTarget.courseId) ?? []) : []),
    [editSlotsTarget, timetablesByCourse],
  );

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'studentName', label: 'Student', minWidth: 150 },
    { id: 'courseName', label: 'Course', minWidth: 150 },
    { id: 'teacherName', label: 'Teacher', minWidth: 150 },
    {
      id: 'timetable', label: 'Timetable', minWidth: 200, sortable: false,
      format: (_v, row) => {
        const enrollment = row as unknown as Enrollment;
        const assigned = enrollment.timetables ?? [];
        const summary = formatTimetableSummary(assigned);
        return summary || <span style={{ color: '#9e9e9e' }}>Not assigned</span>;
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
      id: 'actions', label: 'Actions', minWidth: 140, align: 'center',
      format: (_v, row) => {
        const enrollment = row as unknown as Enrollment;
        return (
          <Box display="flex" gap={0.5} justifyContent="center">
            <Tooltip title="Edit fees">
              <IconButton size="small" color="primary" onClick={() => openEditFees(enrollment)}>
                <PaymentsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit timetable slots">
              <IconButton size="small" color="primary" onClick={() => openEditSlots(enrollment)}>
                <ScheduleIcon fontSize="small" />
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

  const filtered = filterEnrollments(
    enrollments,
    { courseId: searchCourse?.id, teacherId: searchTeacher?.id },
    courseTeacherMap,
  );

  const rows = filtered.map((e) => {
    const student = students.find(s => s.id === e.studentId);
    return {
      ...e,
      studentName: e.studentName || (student ? `${student.firstName} ${student.lastName}`.trim() : ''),
      courseName: e.courseName || courses.find(c => c.id === e.courseId)?.courseName || '',
      teacherName: resolveTeacherNames(e, courseTeacherMap, teachers),
    };
  });

  return (
    <Box>
      <PageHeader
        title="Enrollments"
        subtitle={`${filtered.length} of ${enrollments.length} enrollment(s)`}
        breadcrumbs={[{ label: 'Principal' }, { label: 'Enrollments' }]}
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Enroll Student</Button>}
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Autocomplete
            options={courses}
            getOptionLabel={(o) => o.courseName}
            value={searchCourse}
            onChange={(_e, val) => setSearchCourse(val)}
            renderInput={(params) => <TextField {...params} label="Filter by Course" size="small" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Autocomplete
            options={teachers}
            getOptionLabel={(o) => `${o.firstName} ${o.lastName}`.trim()}
            value={searchTeacher}
            onChange={(_e, val) => setSearchTeacher(val)}
            renderInput={(params) => <TextField {...params} label="Filter by Teacher" size="small" />}
          />
        </Grid>
      </Grid>

      <DataTable columns={columns} rows={rows as unknown as Record<string, unknown>[]} searchable searchKeys={['studentName', 'courseName']} searchPlaceholder="Search by student..." />

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
                  <TextField {...field} select label="Course" fullWidth size="small" disabled={!!searchCourse} error={!!errors.courseId} helperText={searchCourse ? 'Prefilled from filter' : errors.courseId?.message}>
                    {courses.map(c => <MenuItem key={c.id} value={c.id}>{c.courseName}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="teacherId" control={control} render={({ field }) => (
                  <TextField {...field} select label="Teacher" fullWidth size="small" error={!!errors.teacherId} helperText={errors.teacherId?.message}>
                    {teachers.map(t => <MenuItem key={t.id} value={t.id}>{`${t.firstName} ${t.lastName}`.trim()}</MenuItem>)}
                  </TextField>
                )} />
              </Grid>
              <Grid item xs={12}>
                <Controller name="timetableIds" control={control} render={({ field }) => {
                  const validIds = (field.value ?? []).filter((id) => courseSlots.some((s) => s.id === id));
                  return (
                    <FormControl fullWidth size="small" disabled={!selectedCourseId || courseSlots.length === 0}>
                      <InputLabel id="timetable-slots-label">Timetable Slots</InputLabel>
                      <Select
                        labelId="timetable-slots-label"
                        multiple
                        value={validIds}
                        onChange={(e) => field.onChange(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                        input={<OutlinedInput label="Timetable Slots" />}
                        renderValue={(selected) => (selected as string[])
                          .map((id) => { const s = courseSlots.find((c) => c.id === id); return s ? formatSlotLabel(s) : id; })
                          .join(', ')}
                      >
                        {courseSlots.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            <Checkbox checked={validIds.includes(s.id)} />
                            <ListItemText primary={formatSlotLabel(s)} secondary={s.teacherName || undefined} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  );
                }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="enrollmentDate" control={control} render={({ field }) => (
                  <TextField {...field} label="Enrollment Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} error={!!errors.enrollmentDate} helperText={errors.enrollmentDate?.message} />
                )} />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Fees &amp; Institute Share</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => addLine(setEnrollFeeLines)} disabled={enrollFeeLines.length >= FEE_TYPES.length}>
                    Add Fee
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Pre-filled from the course. Edit the per-child amount and institute share; the teacher share updates live.
                </Typography>
                <Box sx={{ mt: 1 }}>{renderFeeLineEditor(enrollFeeLines, setEnrollFeeLines)}</Box>
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
              Add or remove fee types and set the institute share for this child. Saved fees are final for this enrollment.
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => addLine(setEditFeeLines)} disabled={editFeeLines.length >= FEE_TYPES.length}>
              Add Fee
            </Button>
          </Box>
          <Divider sx={{ my: 1 }} />
          {renderFeeLineEditor(editFeeLines, setEditFeeLines)}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditFeesTarget(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleSaveFees} variant="contained" disabled={savingFees}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editSlotsTarget} onClose={() => setEditSlotsTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Timetable Slots</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {editSlotsTarget?.studentName || 'Student'} — {editSlotsTarget?.courseName || 'Course'}
          </Typography>
          <Divider sx={{ my: 1 }} />
          {editSlotOptions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No timetable slots exist for this course.</Typography>
          ) : (
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel id="edit-slots-label">Timetable Slots</InputLabel>
              <Select
                labelId="edit-slots-label"
                multiple
                value={editSlotIds}
                onChange={(e) => setEditSlotIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                input={<OutlinedInput label="Timetable Slots" />}
                renderValue={(selected) => (selected as string[])
                  .map((id) => { const s = editSlotOptions.find((c) => c.id === id); return s ? formatSlotLabel(s) : id; })
                  .join(', ')}
              >
                {editSlotOptions.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    <Checkbox checked={editSlotIds.includes(s.id)} />
                    <ListItemText primary={formatSlotLabel(s)} secondary={s.teacherName || undefined} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditSlotsTarget(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleSaveSlots} variant="contained" disabled={savingSlots || editSlotOptions.length === 0}>Save</Button>
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

export default EnrollmentsPage;
