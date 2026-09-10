import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Divider, Button, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchFeeCycles, fetchFeeDetails } from '../../store/slices/feeSlice';
import { fetchStudentPayments } from '../../store/slices/paymentSlice';
import paymentService from '../../services/paymentService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDateDMY } from '../../utils/formatters';
import { FeeCycle } from '../../types';

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PAID: 'success', PARTIAL: 'warning', OVERDUE: 'error', UNPAID: 'default', PENDING: 'default',
};

const MakePaymentPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { feeCycles, feeDetails, loading } = useSelector((state: RootState) => state.fees);
  const { studentPayments } = useSelector((state: RootState) => state.payments);
  const [selectedCycle, setSelectedCycle] = useState<FeeCycle | null>(null);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchFeeCycles({ studentId: user.id }));
      dispatch(fetchStudentPayments(user.id));
    }
  }, [dispatch, user]);

  const handleViewDetails = (cycle: FeeCycle) => {
    setSelectedCycle(cycle);
    dispatch(fetchFeeDetails(cycle.id));
  };

  const overdueCycles = feeCycles.filter(c => c.overdue);

  const renderTable = (cycles: FeeCycle[]) => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Period</TableCell>
            <TableCell align="right">Amount Due</TableCell>
            <TableCell align="right">Paid</TableCell>
            <TableCell align="right">Outstanding</TableCell>
            <TableCell align="right">Excess / Short</TableCell>
            <TableCell>Fee Paid Date</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cycles.map(cycle => {
            const outstanding = cycle.dueAmount ?? cycle.outstandingAmount ?? 0;
            const excess = cycle.excessAmount ?? 0;
            const short = cycle.shortAmount ?? 0;
            const display = cycle.displayStatus ?? cycle.status;
            return (
              <TableRow key={cycle.id} hover selected={selectedCycle?.id === cycle.id}>
                <TableCell>{`${cycle.month ?? cycle.billingMonth}/${cycle.year ?? cycle.billingYear}`}</TableCell>
                <TableCell align="right">{formatCurrency(cycle.totalAmount)}</TableCell>
                <TableCell align="right" sx={{ color: 'success.main' }}>{formatCurrency(cycle.paidAmount)}</TableCell>
                <TableCell align="right" sx={{ color: outstanding > 0 ? 'error.main' : 'inherit' }}>{formatCurrency(outstanding)}</TableCell>
                <TableCell align="right">
                  {excess > 0 ? (
                    <Typography variant="body2" color="success.main">+{formatCurrency(excess)}</Typography>
                  ) : short > 0 ? (
                    <Typography variant="body2" color="error.main">-{formatCurrency(short)}</Typography>
                  ) : '-'}
                </TableCell>
                <TableCell>{formatDateDMY(cycle.dueDate)}</TableCell>
                <TableCell align="center">
                  <Chip label={display} color={statusColorMap[display] || 'default'} size="small" />
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" gap={1} justifyContent="center">
                    <Button size="small" onClick={() => handleViewDetails(cycle)}>Details</Button>
                    <Tooltip title="Online payment coming soon">
                      <span>
                        <Button size="small" variant="contained" disabled={display === 'PAID'}>Pay Now</Button>
                      </span>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Make Payment"
        subtitle="View your fee cycles and download receipts"
        breadcrumbs={[{ label: 'Student' }, { label: 'Make Payment' }]}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={selectedCycle ? 7 : 12}>
          {feeCycles.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No fee cycles generated yet.</Typography>
            </Paper>
          ) : (
            renderTable(feeCycles)
          )}

          {overdueCycles.length > 0 && (
            <Box mt={4}>
              <Typography variant="h6" color="error.main" gutterBottom>Overdue Fees</Typography>
              {renderTable(overdueCycles)}
            </Box>
          )}

          {studentPayments.length > 0 && (
            <Box mt={4}>
              <Typography variant="h6" gutterBottom>My Payments</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Mode</TableCell>
                      <TableCell align="center">Receipt</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {studentPayments.map(p => (
                      <TableRow key={p.id} hover>
                        <TableCell>{formatDateDMY(p.paymentDate)}</TableCell>
                        <TableCell align="right">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{p.paymentMode}</TableCell>
                        <TableCell align="center">
                          <Button size="small" startIcon={<DownloadIcon />}
                            onClick={() => paymentService.downloadReceipt(p.id)}>Download</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Grid>

        {selectedCycle && (
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Fee Breakdown</Typography>
                  <Button size="small" onClick={() => setSelectedCycle(null)}>Close</Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {feeDetails.filter(d => d.feeCycleId === selectedCycle.id).map(detail => (
                  <Box key={detail.id} display="flex" justifyContent="space-between" py={1} borderBottom="1px solid" borderColor="divider">
                    <Typography variant="body2">{detail.courseName || detail.description || 'Course Fee'}</Typography>
                    <Typography variant="body2" fontWeight={500}>{formatCurrency(detail.amount ?? detail.courseFee ?? 0)}</Typography>
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

export default MakePaymentPage;
