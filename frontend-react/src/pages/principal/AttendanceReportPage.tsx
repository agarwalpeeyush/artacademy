import React, { useState } from 'react';
import {
  Box, Button, TextField, Grid, Chip, Alert, MenuItem, Paper, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchAttendanceReport } from '../../store/slices/reportSlice';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { AttendanceReport } from '../../types';
import { format, subDays } from 'date-fns';

const AttendanceReportPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { attendanceReports, loading } = useSelector((state: RootState) => state.reports);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<'student' | 'teacher'>('student');
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    dispatch(fetchAttendanceReport({ startDate, endDate, type }));
    setSearched(true);
  };

  const getAttendanceColor = (percentage: number): 'success' | 'warning' | 'error' => {
    if (percentage >= 75) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'name', label: 'Name', minWidth: 180 },
    { id: 'totalClasses', label: 'Total Classes', minWidth: 120, align: 'center' },
    { id: 'presentCount', label: 'Present', minWidth: 100, align: 'center' },
    { id: 'absentCount', label: 'Absent', minWidth: 100, align: 'center' },
    { id: 'lateCount', label: 'Late', minWidth: 100, align: 'center' },
    {
      id: 'attendancePercentage', label: 'Attendance %', minWidth: 130, align: 'center',
      format: (v) => {
        const pct = v as number;
        return <Chip label={`${pct.toFixed(1)}%`} color={getAttendanceColor(pct)} size="small" />;
      },
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Attendance Report"
        subtitle="View attendance statistics by date range"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Attendance Report' }]}
      />

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={3}>
            <TextField
              label="Start Date" type="date" size="small" fullWidth value={startDate}
              onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="End Date" type="date" size="small" fullWidth value={endDate}
              onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField select label="Type" size="small" fullWidth value={type} onChange={e => setType(e.target.value as 'student' | 'teacher')}>
              <MenuItem value="student">Student Attendance</MenuItem>
              <MenuItem value="teacher">Teacher Attendance</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button variant="contained" fullWidth startIcon={<SearchIcon />} onClick={handleSearch}>
              Generate Report
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <LoadingSpinner message="Generating report..." />
      ) : searched && attendanceReports.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No attendance data found for the selected period.</Typography>
        </Paper>
      ) : searched ? (
        <DataTable
          columns={columns}
          rows={attendanceReports as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Search by name..."
        />
      ) : null}
    </Box>
  );
};

export default AttendanceReportPage;
