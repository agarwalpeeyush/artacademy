import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, LinearProgress, TextField, MenuItem,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchStudentAttendance } from '../../store/slices/attendanceSlice';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';
import { format, subMonths } from 'date-fns';

const StudentAttendancePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { studentAttendance, loading } = useSelector((state: RootState) => state.attendance);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchStudentAttendance({ studentId: user.id, startDate, endDate }));
    }
  }, [dispatch, user, startDate, endDate]);

  const presentCount = studentAttendance.filter(a => a.status === 'PRESENT').length;
  const absentCount = studentAttendance.filter(a => a.status === 'ABSENT').length;
  const leaveCount = studentAttendance.filter(a => a.status === 'LEAVE').length;
  const total = studentAttendance.length;
  const attendancePct = total > 0 ? (presentCount / total) * 100 : 0;

  const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    PRESENT: 'success', ABSENT: 'error', LEAVE: 'warning', HALF_DAY: 'default',
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'date', label: 'Date', minWidth: 120, format: (v) => formatDate(v as string) },
    {
      id: 'status', label: 'Status', minWidth: 100,
      format: (v) => <Chip label={v as string} color={statusColorMap[v as string] || 'default'} size="small" />,
    },
    { id: 'remarks', label: 'Remarks', minWidth: 200, format: (v) => v as string || '-' },
  ];

  return (
    <Box>
      <PageHeader
        title="My Attendance"
        subtitle="Track your attendance history"
        breadcrumbs={[{ label: 'Student' }, { label: 'Attendance' }]}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <TextField label="From" type="date" size="small" fullWidth value={startDate}
            onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField label="To" type="date" size="small" fullWidth value={endDate}
            onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Sessions', value: total, color: 'primary.main' },
          { label: 'Present', value: presentCount, color: 'success.main' },
          { label: 'Absent', value: absentCount, color: 'error.main' },
          { label: 'Leave', value: leaveCount, color: 'warning.main' },
        ].map(stat => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                <Typography variant="h5" fontWeight={700} color={stat.color} mt={0.5}>{stat.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Overall Attendance Rate</Typography>
            <Typography variant="body2" fontWeight={600} color={attendancePct >= 75 ? 'success.main' : 'warning.main'}>
              {attendancePct.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={attendancePct}
            color={attendancePct >= 75 ? 'success' : attendancePct >= 50 ? 'warning' : 'error'}
            sx={{ height: 10, borderRadius: 5 }}
          />
          {attendancePct < 75 && (
            <Typography variant="caption" color="warning.main" mt={1} display="block">
              Warning: Attendance below 75%. Minimum required is 75%.
            </Typography>
          )}
        </CardContent>
      </Card>

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

export default StudentAttendancePage;
