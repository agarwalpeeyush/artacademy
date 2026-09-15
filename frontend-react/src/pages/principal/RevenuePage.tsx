import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Grid, Paper, Typography, Chip, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Card, CardContent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchRevenue } from '../../store/slices/reportSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, getMonthName } from '../../utils/formatters';
import feeService from '../../services/feeService';
import teacherService from '../../services/teacherService';
import { TeacherRevenueSummary, Teacher } from '../../types';

const RevenuePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { revenueReports, loading } = useSelector((state: RootState) => state.reports);
  const [year, setYear] = useState(new Date().getFullYear());
  const [teacherSummaries, setTeacherSummaries] = useState<TeacherRevenueSummary[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    dispatch(fetchRevenue({ year }));
  }, [dispatch, year]);

  useEffect(() => {
    Promise.all([feeService.getTeacherSummaries(), teacherService.getAll()])
      .then(([summaries, ts]) => { setTeacherSummaries(summaries); setTeachers(ts); })
      .catch(() => { setTeacherSummaries([]); setTeachers([]); });
  }, []);

  const teacherName = (id: string): string => {
    const t = teachers.find(x => x.id === id);
    return t ? `${t.firstName} ${t.lastName}`.trim() : id;
  };

  const totalRevenue = revenueReports.reduce((sum, r) => sum + r.totalRevenue, 0);
  const totalCollected = revenueReports.reduce((sum, r) => sum + r.collectedAmount, 0);
  const totalPending = revenueReports.reduce((sum, r) => sum + r.pendingAmount, 0);

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Box>
      <PageHeader
        title="Revenue Report"
        subtitle="Monthly fee collection summary"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Revenue' }]}
        action={
          <TextField select label="Year" size="small" value={year} onChange={e => setYear(Number(e.target.value))} sx={{ minWidth: 100 }}>
            {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
        }
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Billed', value: formatCurrency(totalRevenue), color: '#1565C0' },
          { label: 'Collected', value: formatCurrency(totalCollected), color: '#2E7D32' },
          { label: 'Pending', value: formatCurrency(totalPending), color: '#B71C1C' },
        ].map(stat => (
          <Grid item xs={12} sm={4} key={stat.label}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                <Typography variant="h5" fontWeight={700} color={stat.color} mt={1}>{stat.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell align="right">Total Billed</TableCell>
                <TableCell align="right">Collected</TableCell>
                <TableCell align="right">Pending</TableCell>
                <TableCell align="center">Students</TableCell>
                <TableCell align="center">Paid Students</TableCell>
                <TableCell align="center">Collection Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {revenueReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No revenue data found for {year}</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                revenueReports.map(r => {
                  const collectionRate = r.totalRevenue > 0 ? (r.collectedAmount / r.totalRevenue) * 100 : 0;
                  return (
                    <TableRow key={`${r.year}-${r.month}`} hover>
                      <TableCell>{getMonthName(r.month)} {r.year}</TableCell>
                      <TableCell align="right">{formatCurrency(r.totalRevenue)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 500 }}>{formatCurrency(r.collectedAmount)}</TableCell>
                      <TableCell align="right" sx={{ color: r.pendingAmount > 0 ? 'error.main' : 'inherit', fontWeight: r.pendingAmount > 0 ? 500 : 400 }}>{formatCurrency(r.pendingAmount)}</TableCell>
                      <TableCell align="center">{r.totalStudents}</TableCell>
                      <TableCell align="center">{r.paidStudents}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${collectionRate.toFixed(0)}%`}
                          color={collectionRate >= 80 ? 'success' : collectionRate >= 50 ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>Revenue by Teacher</Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          Institute commission and teacher share over fully-paid fee details.
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Teacher</TableCell>
                <TableCell align="right">Collected</TableCell>
                <TableCell align="right">Institute Commission</TableCell>
                <TableCell align="right">Teacher Share</TableCell>
                <TableCell align="center">Paid Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teacherSummaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No paid fee details with teacher attribution yet.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                teacherSummaries.map(s => (
                  <TableRow key={s.teacherId} hover>
                    <TableCell>{s.teacherName || teacherName(s.teacherId)}</TableCell>
                    <TableCell align="right">{formatCurrency(s.collected)}</TableCell>
                    <TableCell align="right" sx={{ color: 'primary.main' }}>{formatCurrency(s.instituteShare)}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>{formatCurrency(s.teacherShare)}</TableCell>
                    <TableCell align="center">{s.paidDetailCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default RevenuePage;
