import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Chip, Alert, Snackbar, MenuItem, Autocomplete,
  IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchStudents } from '../../store/slices/studentSlice';
import { fetchCourses } from '../../store/slices/courseSlice';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import { fetchEnrollments, createEnrollment, updateEnrollmentStatus, deleteEnrollment } from '../../store/slices/enrollmentSlice';
import { Enrollment, Course, Teacher } from '../../types';
import courseService from '../../services/courseService';
import timetableService from '../../services/timetableService';
import { CourseClass, Timetable } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';
import { buildClassMap, resolveTeacherName, filterEnrollments, formatClassTimetable } from '../../utils/enrollmentHelpers';

const schema = yup.object({
  studentId: yup.string().required('Student is required'),
  courseId: yup.string().required('Course is required'),
  classId: yup.string().required('Class is required'),
  enrollmentDate: yup.string().required('Enrollment date is required'),
  admissionFeePaid: yup.boolean().required(),
});

type EnrollmentFormData = {
  studentId: string;
  courseId: string;
  classId: string;
  enrollmentDate: string;
  admissionFeePaid: boolean;
};

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success', COMPLETED: 'default', DROPPED: 'error', SUSPENDED: 'warning',
};

const EnrollmentsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: enrollments, loading } = useSelector((state: RootState) => state.enrollments);
  const { list: students } = useSelector((state: RootState) => state.students);
  const { list: courses } = useSelector((state: RootState) => state.courses);
  const { list: teachers } = useSelector((state: RootState) => state.teachers);
  const [allClasses, setAllClasses] = useState<CourseClass[]>([]);
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [timetablesByClass, setTimetablesByClass] = useState<Map<string, Timetable[]>>(new Map());
  const [searchCourse, setSearchCourse] = useState<Course | null>(null);
  const [searchTeacher, setSearchTeacher] = useState<Teacher | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<EnrollmentFormData>({
    resolver: yupResolver(schema) as never,
    defaultValues: { studentId: '', courseId: '', classId: '', enrollmentDate: new Date().toISOString().split('T')[0], admissionFeePaid: false },
  });

  const selectedCourseId = watch('courseId');
  const classMap = useMemo(() => buildClassMap(allClasses), [allClasses]);

  useEffect(() => {
    dispatch(fetchStudents());
    dispatch(fetchCourses());
    dispatch(fetchTeachers());
    dispatch(fetchEnrollments());
    courseService.getAllClasses().then(setAllClasses).catch(() => setAllClasses([]));
    timetableService.getAll()
      .then((all) => {
        const map = new Map<string, Timetable[]>();
        all.forEach((s) => {
          const arr = map.get(s.classId) ?? [];
          arr.push(s);
          map.set(s.classId, arr);
        });
        setTimetablesByClass(map);
      })
      .catch(() => setTimetablesByClass(new Map()));
  }, [dispatch]);

  useEffect(() => {
    if (selectedCourseId) {
      courseService.getClassesByCourse(selectedCourseId).then(setClasses).catch(() => setClasses([]));
    } else {
      setClasses([]);
    }
  }, [selectedCourseId]);

  const openCreate = () => {
    reset({
      studentId: '',
      courseId: searchCourse?.id || '',
      classId: '',
      enrollmentDate: new Date().toISOString().split('T')[0],
      admissionFeePaid: false,
    });
    setDialogOpen(true);
  };

  const handleSubmitForm = async (data: EnrollmentFormData) => {
    try {
      await dispatch(createEnrollment({
        ...data, status: 'ACTIVE',
        studentName: students.find(s => s.id === data.studentId)?.firstName || '',
        courseName: courses.find(c => c.id === data.courseId)?.courseName || '',
      })).unwrap();
      setSnackbar({ open: true, message: 'Student enrolled successfully', severity: 'success' });
      setDialogOpen(false);
      reset();
      courseService.getAllClasses().then(setAllClasses).catch(() => { /* keep existing */ });
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

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'studentName', label: 'Student', minWidth: 150 },
    { id: 'courseName', label: 'Course', minWidth: 150 },
    { id: 'teacherName', label: 'Teacher', minWidth: 150 },
    { id: 'className', label: 'Class', minWidth: 130 },
    {
      id: 'timetable', label: 'Timetable', minWidth: 200, sortable: false,
      format: (_v, row) => {
        const enrollment = row as unknown as Enrollment;
        const summary = formatClassTimetable(timetablesByClass.get(enrollment.classId ?? '') ?? []);
        return summary || <span style={{ color: '#9e9e9e' }}>Not scheduled</span>;
      },
    },
    { id: 'enrollmentDate', label: 'Enrolled On', minWidth: 120, format: (v) => formatDate(v as string) },
    {
      id: 'admissionFeePaid', label: 'Admission Fee', minWidth: 120,
      format: (v) => <Chip label={v ? 'Paid' : 'Pending'} color={v ? 'success' : 'warning'} size="small" />,
    },
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
      id: 'actions', label: 'Actions', minWidth: 90, align: 'center',
      format: (_v, row) => {
        const enrollment = row as unknown as Enrollment;
        return (
          <Tooltip title="Cancel enrollment">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(enrollment)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      },
    },
  ];

  if (loading && enrollments.length === 0) return <LoadingSpinner />;

  const filtered = filterEnrollments(
    enrollments,
    { courseId: searchCourse?.id, teacherId: searchTeacher?.id },
    classMap,
  );

  const rows = filtered.map((e) => {
    const student = students.find(s => s.id === e.studentId);
    return {
      ...e,
      studentName: e.studentName || (student ? `${student.firstName} ${student.lastName}`.trim() : ''),
      courseName: e.courseName || courses.find(c => c.id === e.courseId)?.courseName || '',
      teacherName: resolveTeacherName(e, classMap, teachers),
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

      <DataTable columns={columns} rows={rows as unknown as Record<string, unknown>[]} searchable searchKeys={['studentName']} searchPlaceholder="Search by student..." />

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
                <Controller name="classId" control={control} render={({ field }) => (
                  <TextField {...field} select label="Class" fullWidth size="small" error={!!errors.classId} helperText={errors.classId?.message || (selectedCourseId ? '' : 'Select a course first')}>
                    {classes.map(cl => {
                      const t = teachers.find(tt => tt.id === cl.teacherId);
                      const tName = t ? ` — ${t.firstName} ${t.lastName}`.trimEnd() : '';
                      return <MenuItem key={cl.id} value={cl.id}>{cl.className}{tName}</MenuItem>;
                    })}
                  </TextField>
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="enrollmentDate" control={control} render={({ field }) => (
                  <TextField {...field} label="Enrollment Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} error={!!errors.enrollmentDate} helperText={errors.enrollmentDate?.message} />
                )} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="admissionFeePaid" control={control} render={({ field }) => (
                  <TextField {...field} select label="Admission Fee Status" fullWidth size="small">
                    <MenuItem value="true">Paid</MenuItem>
                    <MenuItem value="false">Pending</MenuItem>
                  </TextField>
                )} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined">Cancel</Button>
            <Button type="submit" variant="contained">Enroll</Button>
          </DialogActions>
        </Box>
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
