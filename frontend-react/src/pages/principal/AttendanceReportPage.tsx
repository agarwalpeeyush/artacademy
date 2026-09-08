import React, { useState } from 'react';
import {
  Box, Button, TextField, Grid, Chip, MenuItem, Paper, Typography,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchAttendanceReport } from '../../store/slices/reportSlice';
import reportService from '../../services/reportService';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { AttendanceException, CourseAttendanceSummary } from '../../types';
import { downloadBlob } from '../../utils/download';
import { format, subDays } from 'date-fns';

type Mode = 'summary' | 'exceptions' | 'monthly';

const AttendanceReportPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { attendanceReports, loading } = useSelector((state: RootState) => state.reports);
  const [mode, setMode] = useState<Mode>('summary');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<'student' | 'teacher'>('student');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [threshold, setThreshold] = useState(75);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exceptions, setExceptions] = useState<AttendanceException[]>([]);
  const [courseSummary, setCourseSummary] = useState<CourseAttendanceSummary[]>([]);

  const getAttendanceColor = (percentage: number): 'success' | 'warning' | 'error' => {
    if (percentage >= 75) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const pctChip = (v: unknown) => {
    const pct = v as number;
    return <Chip label={`${pct.toFixed(1)}%`} color={getAttendanceColor(pct)} size="small" />;
  };

  const handleSearch = async () => {
    setSearched(true);
    if (mode === 'summary') {
      dispatch(fetchAttendanceReport({ startDate, endDate, type }));
    } else if (mode === 'exceptions') {
      setBusy(true);
      try {
        const data = await reportService.getAttendanceExceptions({ threshold, type: type.toUpperCase(), month, year });
        setExceptions(data);
      } finally { setBusy(false); }
    } else {
      setBusy(true);
      try {
        const data = await reportService.getMonthlyCourseSummary({ month, year });
        setCourseSummary(data);
      } finally { setBusy(false); }
    }
  };

  const handleExport = async () => {
    const blob = await reportService.exportAttendanceCsv({ subjectType: type.toUpperCase(), month, year });
    downloadBlob(blob, `attendance-report-${year}-${month}.csv`);
  };

  const summaryColumns: Column<Record<string, unknown>>[] = [
    { id: 'name', label: 'Name', minWidth: 180 },
    { id: 'totalClasses', label: 'Total Classes', minWidth: 120, align: 'center' },
    { id: 'presentCount', label: 'Present', minWidth: 100, align: 'center' },
    { id: 'absentCount', label: 'Absent', minWidth: 100, align: 'center' },
    { id: 'lateCount', label: 'Late', minWidth: 100, align: 'center' },
    { id: 'attendancePercentage', label: 'Attendance %', minWidth: 130, align: 'center', format: pctChip },
  ];

  const exceptionColumns: Column<Record<string, unknown>>[] = [
    { id: 'subjectName', label: 'Name', minWidth: 180 },
    { id: 'subjectType', label: 'Type', minWidth: 100 },
    { id: 'totalDays', label: 'Total Days', minWidth: 110, align: 'center' },
    { id: 'presentDays', label: 'Present', minWidth: 100, align: 'center' },
    { id: 'attendancePercentage', label: 'Attendance %', minWidth: 130, align: 'center', format: pctChip },
  ];

  const courseColumns: Column<Record<string, unknown>>[] = [
    { id: 'courseName', label: 'Course', minWidth: 180 },
    { id: 'studentCount', label: 'Students', minWidth: 100, align: 'center' },
    { id: 'totalDays', label: 'Total Days', minWidth: 110, align: 'center' },
    { id: 'presentDays', label: 'Present', minWidth: 100, align: 'center' },
    { id: 'attendancePercentage', label: 'Attendance %', minWidth: 130, align: 'center', format: pctChip },
  ];

  const busyOrLoading = loading || busy;
  const rows: Record<string, unknown>[] =
    mode === 'summary' ? (attendanceReports as unknown as Record<string, unknown>[])
      : mode === 'exceptions' ? (exceptions as unknown as Record<string, unknown>[])
        : (courseSummary as unknown as Record<string, unknown>[]);
  const columns = mode === 'summary' ? summaryColumns : mode === 'exceptions' ? exceptionColumns : courseColumns;

  return (
    <Box>
      <PageHeader
        title="Attendance Report"
        subtitle="View attendance statistics, exceptions, and course summaries"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Attendance Report' }]}
      />

      <ToggleButtonGroup
        exclusive size="small" value={mode} sx={{ mb: 2 }}
        onChange={(_e, v) => { if (v) { setMode(v); setSearched(false); } }}
      >
        <ToggleButton value="summary">Summary</ToggleButton>
        <ToggleButton value="exceptions">Exceptions</ToggleButton>
        <ToggleButton value="monthly">Monthly by Course</ToggleButton>
      </ToggleButtonGroup>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          {mode === 'summary' && (
            <>
              <Grid item xs={12} sm={3}>
                <TextField label="Start Date" type="date" size="small" fullWidth value={startDate}
                  onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField label="End Date" type="date" size="small" fullWidth value={endDate}
                  onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
            </>
          )}
          {mode !== 'summary' && (
            <>
              <Grid item xs={6} sm={2}>
                <TextField label="Month" type="number" size="small" fullWidth value={month}
                  onChange={e => setMonth(Number(e.target.value))} inputProps={{ min: 1, max: 12 }} />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField label="Year" type="number" size="small" fullWidth value={year}
                  onChange={e => setYear(Number(e.target.value))} />
              </Grid>
            </>
          )}
          {mode === 'exceptions' && (
            <Grid item xs={6} sm={2}>
              <TextField label="Threshold %" type="number" size="small" fullWidth value={threshold}
                onChange={e => setThreshold(Number(e.target.value))} inputProps={{ min: 0, max: 100 }} />
            </Grid>
          )}
          {mode !== 'monthly' && (
            <Grid item xs={12} sm={3}>
              <TextField select label="Type" size="small" fullWidth value={type}
                onChange={e => setType(e.target.value as 'student' | 'teacher')}>
                <MenuItem value="student">Student Attendance</MenuItem>
                <MenuItem value="teacher">Teacher Attendance</MenuItem>
              </TextField>
            </Grid>
          )}
          <Grid item xs={12} sm={3}>
            <Button variant="contained" fullWidth startIcon={<SearchIcon />} onClick={handleSearch}>
              Generate Report
            </Button>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button variant="outlined" fullWidth startIcon={<DownloadIcon />} onClick={handleExport}>
              Export CSV
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {busyOrLoading ? (
        <LoadingSpinner message="Generating report..." />
      ) : searched && rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No attendance data found for the selected criteria.</Typography>
        </Paper>
      ) : searched ? (
        <DataTable columns={columns} rows={rows} searchable searchPlaceholder="Search..." />
      ) : null}
    </Box>
  );
};

export default AttendanceReportPage;
