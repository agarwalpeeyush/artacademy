import React, { useEffect, useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTimetables } from '../../store/slices/timetableSlice';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import { fetchCourses } from '../../store/slices/courseSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import WeeklyTimetable, { CalendarBlock } from '../../components/timetable/WeeklyTimetable';
import { slotToIso, colorForCourse, timeBounds, ANCHOR_ISO } from '../../components/timetable/weekAdapter';

const TimetableViewPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: timetables, loading } = useSelector((state: RootState) => state.timetables);
  const { list: teachers } = useSelector((state: RootState) => state.teachers);
  const { list: courses } = useSelector((state: RootState) => state.courses);

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

  const bounds = useMemo(() => timeBounds(timetables), [timetables]);

  if (loading && timetables.length === 0) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Weekly Schedule"
        subtitle="Read-only view of the weekly class schedule"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Schedule View' }]}
      />

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        {timetables.length === 0 ? (
          <Typography color="text.secondary">
            No classes scheduled yet.
          </Typography>
        ) : (
          <WeeklyTimetable
            events={blocks}
            initialDate={ANCHOR_ISO}
            readOnly
            slotMinTime={bounds.min}
            slotMaxTime={bounds.max}
          />
        )}
      </Paper>
    </Box>
  );
};

export default TimetableViewPage;
