import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, MenuItem, TextField, Grid,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherTimetables } from '../../store/slices/timetableSlice';
import studentService from '../../services/studentService';
import { Student } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';

const AssignedStudentsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { teacherTimetables } = useSelector((state: RootState) => state.timetables);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) dispatch(fetchTeacherTimetables(user.id));
  }, [dispatch, user]);

  useEffect(() => {
      if (selectedClassId) {
      setLoading(true);
      studentService.getByClass(selectedClassId)
        .then(setStudents)
        .catch(() => setStudents([]))
        .finally(() => setLoading(false));
    } else {
      setStudents([]);
    }
  }, [selectedClassId]);

  const uniqueClasses = [...new Map(teacherTimetables.map(s => [s.classId, s])).values()];

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'firstName', label: 'First Name', minWidth: 120 },
    { id: 'lastName', label: 'Last Name', minWidth: 120 },
    { id: 'email', label: 'Email', minWidth: 180 },
    {
      id: 'parents', label: 'Parents', minWidth: 160, sortable: false,
      format: (_v, row) => {
        const student = row as unknown as Student;
        return (student.parents ?? []).map(p => p.name).filter(Boolean).join(', ') || '—';
      },
    },
    { id: 'enrollmentDate', label: 'Enrolled', minWidth: 120, format: (v) => formatDate(v as string) },
    { id: 'status', label: 'Status', minWidth: 80, format: (v) => <Chip label={v as string} color={v === 'ACTIVE' ? 'success' : 'default'} size="small" /> },
  ];

  return (
    <Box>
      <PageHeader
        title="My Students"
        subtitle="Students enrolled in your classes"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'My Students' }]}
      />

      <Box mb={3}>
        <TextField
          select label="Select Class" size="small" sx={{ minWidth: 300 }}
          value={selectedClassId}
          onChange={e => setSelectedClassId(e.target.value)}
        >
          <MenuItem value="">-- Select a class --</MenuItem>
          {uniqueClasses.map(s => (
            <MenuItem key={s.classId} value={s.classId}>{s.className} – {s.courseName}</MenuItem>
          ))}
        </TextField>
      </Box>

      {loading ? (
        <LoadingSpinner />
      ) : selectedClassId ? (
        <>
          <Typography variant="body2" color="text.secondary" mb={1}>{students.length} student(s) in this class</Typography>
          <DataTable columns={columns} rows={students as unknown as Record<string, unknown>[]} searchable searchPlaceholder="Search students..." />
        </>
      ) : (
        <Typography color="text.secondary">Select a class to view its students.</Typography>
      )}
    </Box>
  );
};

export default AssignedStudentsPage;
