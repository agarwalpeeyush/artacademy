import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, TextField, MenuItem,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMyChildren } from '../../store/slices/parentSlice';
import { fetchStudentAttendance } from '../../store/slices/attendanceSlice';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';
import { format, subDays } from 'date-fns';

const ParentAttendancePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { children } = useSelector((state: RootState) => state.parents);
  const { studentAttendance, loading } = useSelector((state: RootState) => state.attendance);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    dispatch(fetchMyChildren());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedStudent && children.length > 0) {
      setSelectedStudent(children[0].studentId);
    }
  }, [children, selectedStudent]);

  useEffect(() => {
    if (selectedStudent) {
      dispatch(fetchStudentAttendance({ studentId: selectedStudent, startDate, endDate }));
    }
  }, [dispatch, selectedStudent, startDate, endDate]);

  const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    PRESENT: 'success', ABSENT: 'error', LATE: 'warning', EXCUSED: 'default',
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'date', label: 'Date', minWidth: 120, format: (v) => formatDate(v as string) },
    { id: 'className', label: 'Class', minWidth: 150 },
    {
      id: 'status', label: 'Status', minWidth: 100,
      format: (v) => <Chip label={v as string} color={statusColorMap[v as string] || 'default'} size="small" />,
    },
    { id: 'remarks', label: 'Remarks', minWidth: 200, format: (v) => (v as string) || '-' },
  ];

  return (
    <Box>
      <PageHeader
        title="Attendance"
        subtitle="Your child's attendance history"
        breadcrumbs={[{ label: 'Parent' }, { label: 'Attendance' }]}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <TextField select label="Child" size="small" fullWidth value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}>
            {children.map(c => (
              <MenuItem key={c.studentId} value={c.studentId}>{c.studentName || c.studentId}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField label="From" type="date" size="small" fullWidth value={startDate}
            onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField label="To" type="date" size="small" fullWidth value={endDate}
            onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
      </Grid>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          columns={columns}
          rows={studentAttendance as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search attendance records..."
          emptyMessage="No attendance records found for the selected period."
        />
      )}
    </Box>
  );
};

export default ParentAttendancePage;
