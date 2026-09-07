import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Divider, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchFeeCycles, fetchFeeDetails } from '../../store/slices/feeSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate, formatMonthYear } from '../../utils/formatters';
import { FeeCycle } from '../../types';

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PAID: 'success', PARTIAL: 'warning', OVERDUE: 'error', PENDING: 'default',
};

const FeesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { feeCycles, feeDetails, loading } = useSelector((state: RootState) => state.fees);
  const [selectedCycle, setSelectedCycle] = useState<FeeCycle | null>(null);

  useEffect(() => {
    if (user?.id) dispatch(fetchFeeCycles({ studentId: user.id }));
  }, [dispatch, user]);

  const handleViewDetails = (cycle: FeeCycle) => {
    setSelectedCycle(cycle);
    dispatch(fetchFeeDetails(cycle.id));
  };

  const totalDue = feeCycles.reduce((sum, f) => sum + (f.dueAmount ?? 0), 0);
  const totalPaid = feeCycles.reduce((sum, f) => sum + f.paidAmount, 0);

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="My Fees"
        subtitle="Monthly fee cycles and payment status"
        breadcrumbs={[{ label: 'Student' }, { label: 'Fees' }]}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Total Paid</Typography>
              <Typography variant="h5" fontWeight={700} color="success.main" mt={0.5}>{formatCurrency(totalPaid)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Outstanding</Typography>
              <Typography variant="h5" fontWeight={700} color={totalDue > 0 ? 'error.main' : 'success.main'} mt={0.5}>{formatCurrency(totalDue)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Total Cycles</Typography>
              <Typography variant="h5" fontWeight={700} color="primary.main" mt={0.5}>{feeCycles.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={selectedCycle ? 6 : 12}>
          {feeCycles.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No fee cycles generated yet.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Due</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {feeCycles.map(cycle => (
                    <TableRow
                      key={cycle.id}
                      hover
                      selected={selectedCycle?.id === cycle.id}
                    >
                      <TableCell>{formatMonthYear(cycle.month ?? 0, cycle.year ?? 0)}</TableCell>
                      <TableCell align="right">{formatCurrency(cycle.totalAmount)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>{formatCurrency(cycle.paidAmount)}</TableCell>
                      <TableCell align="right" sx={{ color: (cycle.dueAmount ?? 0) > 0 ? 'error.main' : 'inherit', fontWeight: (cycle.dueAmount ?? 0) > 0 ? 600 : 400 }}>
                        {formatCurrency(cycle.dueAmount ?? 0)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={cycle.status} color={statusColorMap[cycle.status] || 'default'} size="small" />
                      </TableCell>
                      <TableCell>{formatDate(cycle.dueDate)}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleViewDetails(cycle)}>Details</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>

        {selectedCycle && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Fee Breakdown</Typography>
                  <Button size="small" onClick={() => setSelectedCycle(null)}>Close</Button>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {formatMonthYear(selectedCycle.month ?? 0, selectedCycle.year ?? 0)}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {feeDetails.filter(d => d.feeCycleId === selectedCycle.id).map(detail => (
                  <Box key={detail.id} display="flex" justifyContent="space-between" py={1} borderBottom="1px solid" borderColor="divider">
                    <Typography variant="body2">{detail.courseName || detail.description || 'Course Fee'}</Typography>
                    <Typography variant="body2" fontWeight={500}>{formatCurrency(detail.amount ?? 0)}</Typography>
                  </Box>
                ))}
                <Box display="flex" justifyContent="space-between" pt={2} mt={1}>
                  <Typography variant="body1" fontWeight={700}>Total</Typography>
                  <Typography variant="body1" fontWeight={700} color="primary.main">
                    {formatCurrency(selectedCycle.totalAmount)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default FeesPage;
