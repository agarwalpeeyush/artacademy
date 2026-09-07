import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, MenuItem, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, LinearProgress,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchRevenue, fetchDefaulters } from '../../store/slices/reportSlice';
import { fetchStudents } from '../../store/slices/studentSlice';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, getMonthName } from '../../utils/formatters';

const AnalyticsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { revenueReports, defaulters, loading } = useSelector((state: RootState) => state.reports);
  const { list: students } = useSelector((state: RootState) => state.students);
  const { list: teachers } = useSelector((state: RootState) => state.teachers);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    dispatch(fetchRevenue({ year }));
    dispatch(fetchDefaulters());
    dispatch(fetchStudents());
    dispatch(fetchTeachers());
  }, [dispatch, year]);

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const maxRevenue = Math.max(...revenueReports.map(r => r.collectedAmount), 1);

  return (
    <Box>
      <PageHeader
        title="Analytics"
        subtitle="Insights and performance metrics"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Analytics' }]}
        action={
          <TextField select label="Year" size="small" value={year} onChange={e => setYear(Number(e.target.value))} sx={{ minWidth: 100 }}>
            {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
        }
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Total Students</Typography>
              <Typography variant="h4" fontWeight={700} color="primary.main" mt={1}>{students.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Total Teachers</Typography>
              <Typography variant="h4" fontWeight={700} color="success.main" mt={1}>{teachers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Defaulters</Typography>
              <Typography variant="h4" fontWeight={700} color="error.main" mt={1}>{defaulters.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">YTD Revenue</Typography>
              <Typography variant="h5" fontWeight={700} color="primary.main" mt={1}>
                {formatCurrency(revenueReports.reduce((s, r) => s + r.collectedAmount, 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading ? <LoadingSpinner /> : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Monthly Revenue – {year}</Typography>
                {revenueReports.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2 }}>No data available for {year}</Typography>
                ) : (
                  revenueReports.map(r => (
                    <Box key={`${r.year}-${r.month}`} mb={2}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2">{getMonthName(r.month)}</Typography>
                        <Typography variant="body2" fontWeight={500}>{formatCurrency(r.collectedAmount)}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(r.collectedAmount / maxRevenue) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Top Defaulters</Typography>
                {defaulters.slice(0, 5).map(d => (
                  <Box key={d.studentId} display="flex" justifyContent="space-between" alignItems="center" py={1} borderBottom="1px solid" borderColor="divider">
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{d.studentName}</Typography>
                      <Typography variant="caption" color="text.secondary">{d.overdueMonths} month(s) overdue</Typography>
                    </Box>
                    <Typography variant="body2" color="error.main" fontWeight={600}>{formatCurrency(d.outstandingAmount)}</Typography>
                  </Box>
                ))}
                {defaulters.length === 0 && <Typography color="text.secondary" variant="body2">No defaulters</Typography>}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AnalyticsPage;
