import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AppDispatch, RootState } from '../../store/store';
import { fetchCourseById } from '../../store/slices/courseSlice';
import { CourseClass, Enrollment } from '../../types';
import courseService from '../../services/courseService';
import enrollmentService from '../../services/enrollmentService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Grid item xs={12} sm={6} md={4}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2">{value ?? '-'}</Typography>
  </Grid>
);

const CourseDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { selected: course, loading } = useSelector((state: RootState) => state.courses);

  const [tab, setTab] = useState(0);
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    if (id) dispatch(fetchCourseById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (!id) return;
    courseService.getClassesByCourse(id).then(setClasses).catch(() => setClasses([]));
    enrollmentService.getByCourse(id).then(setEnrollments).catch(() => setEnrollments([]));
  }, [id]);

  const teachers = useMemo(() => {
    const map = new Map<string, { teacherId: string; teacherName: string; className: string }>();
    classes.forEach((c) => {
      if (c.teacherId && !map.has(c.teacherId)) {
        map.set(c.teacherId, {
          teacherId: c.teacherId,
          teacherName: c.teacherName ?? c.teacherId,
          className: c.className,
        });
      }
    });
    return Array.from(map.values());
  }, [classes]);

  const classCols: Column<Record<string, unknown>>[] = [
    { id: 'className', label: 'Class', minWidth: 160 },
    { id: 'teacherName', label: 'Teacher', minWidth: 160 },
    { id: 'roomNumber', label: 'Room', minWidth: 100 },
    { id: 'capacity', label: 'Capacity', minWidth: 90, align: 'center' },
    { id: 'status', label: 'Status', minWidth: 100, format: (v) => <Chip label={v as string} size="small" color={v === 'ACTIVE' ? 'success' : 'default'} /> },
  ];

  const studentCols: Column<Record<string, unknown>>[] = [
    { id: 'studentName', label: 'Student', minWidth: 160 },
    { id: 'className', label: 'Class', minWidth: 140 },
    { id: 'enrollmentDate', label: 'Enrolled On', minWidth: 120, format: (v) => formatDate(v as string) },
    { id: 'status', label: 'Status', minWidth: 100, format: (v) => <Chip label={v as string} size="small" color={v === 'ACTIVE' ? 'success' : 'default'} /> },
  ];

  const teacherCols: Column<Record<string, unknown>>[] = [
    { id: 'teacherName', label: 'Teacher', minWidth: 200 },
    { id: 'className', label: 'Class', minWidth: 160 },
  ];

  if (loading && !course) return <LoadingSpinner />;

  const title = course?.courseName ?? 'Course';

  return (
    <Box>
      <PageHeader
        title={title}
        subtitle="Course details"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Courses', href: '/principal/courses' }, { label: title }]}
        action={<Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/principal/courses')}>Back</Button>}
      />

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Typography variant="h6">{title}</Typography>
            {course && <Chip label={course.status} size="small" color={course.status === 'ACTIVE' ? 'success' : 'default'} />}
          </Box>
          <Grid container spacing={2}>
            <Info label="Course Code" value={course?.courseCode} />
            <Info label="Type" value={course?.courseType} />
            <Info label="Duration (Months)" value={course?.durationMonths} />
            <Info label="Monthly Fee" value={course != null ? formatCurrency(course.monthlyFee) : '-'} />
            <Info label="Admission Fee" value={course != null ? formatCurrency(course.admissionFee) : '-'} />
            <Info label="Description" value={course?.description} />
          </Grid>
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Classes (${classes.length})`} />
        <Tab label={`Enrolled Students (${enrollments.length})`} />
        <Tab label={`Teachers (${teachers.length})`} />
      </Tabs>

      {tab === 0 && (
        <DataTable columns={classCols} rows={classes as unknown as Record<string, unknown>[]} emptyMessage="No classes for this course." />
      )}

      {tab === 1 && (
        <DataTable columns={studentCols} rows={enrollments as unknown as Record<string, unknown>[]} searchable searchPlaceholder="Search students..." emptyMessage="No enrolled students." />
      )}

      {tab === 2 && (
        <DataTable columns={teacherCols} rows={teachers as unknown as Record<string, unknown>[]} emptyMessage="No teachers assigned." />
      )}
    </Box>
  );
};

export default CourseDetailPage;
