import React, { useEffect } from 'react';
import {
  Box, Chip, Typography, Button, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchDefaulters } from '../../store/slices/reportSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';

const DefaultersPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { defaulters, loading } = useSelector((state: RootState) => state.reports);

  useEffect(() => { dispatch(fetchDefaulters()); }, [dispatch]);

  const totalOutstanding = defaulters.reduce((sum, d) => sum + d.outstandingAmount, 0);

  return (
    <Box>
      <PageHeader
        title="Fee Defaulters"
        subtitle="Students with outstanding balances"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Defaulters' }]}
        action={<Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => dispatch(fetchDefaulters())}>Refresh</Button>}
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Total Defaulters</Typography>
              <Typography variant="h5" fontWeight={700} color="error.main" mt={1}>{defaulters.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Total Outstanding</Typography>
              <Typography variant="h5" fontWeight={700} color="error.main" mt={1}>{formatCurrency(totalOutstanding)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Avg Per Defaulter</Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main" mt={1}>
                {defaulters.length > 0 ? formatCurrency(totalOutstanding / defaulters.length) : '₹0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Student Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Enrolled Courses</TableCell>
                <TableCell align="center">Overdue Months</TableCell>
                <TableCell>Last Payment</TableCell>
                <TableCell align="right">Outstanding Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {defaulters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <WarningAmberIcon sx={{ fontSize: 48, color: 'success.main' }} />
                      <Typography color="text.secondary">No defaulters found. All fees are up to date!</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                defaulters.map(d => (
                  <TableRow key={d.studentId} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{d.studentName}</TableCell>
                    <TableCell>{d.email}</TableCell>
                    <TableCell>{d.phone}</TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {d.enrolledCourses.map(course => (
                          <Chip key={course} label={course} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={d.overdueMonths} color={d.overdueMonths > 2 ? 'error' : 'warning'} size="small" />
                    </TableCell>
                    <TableCell>{d.lastPaymentDate ? formatDate(d.lastPaymentDate) : 'Never'}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>
                      {formatCurrency(d.outstandingAmount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default DefaultersPage;
