import React, { useEffect } from 'react';
import {
  Box, Typography, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchStudentPayments } from '../../store/slices/paymentSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';

const paymentModeColor: Record<string, 'primary' | 'secondary' | 'success' | 'info'> = {
  CASH: 'success', ONLINE: 'primary', CHEQUE: 'info', UPI: 'secondary',
};

const ReceiptsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { studentPayments, loading } = useSelector((state: RootState) => state.payments);

  useEffect(() => {
    if (user?.id) dispatch(fetchStudentPayments(user.id));
  }, [dispatch, user]);

  const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="Payment Receipts"
        subtitle={`${studentPayments.length} payment record(s) — Total: ${formatCurrency(totalPaid)}`}
        breadcrumbs={[{ label: 'Student' }, { label: 'Receipts' }]}
      />

      {studentPayments.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No payment records found.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Receipt No.</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Payment Mode</TableCell>
                <TableCell>Transaction ID</TableCell>
                <TableCell>Remarks</TableCell>
                <TableCell>Collected By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {studentPayments.map(payment => (
                <TableRow key={payment.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {payment.receiptNumber || `RCP-${payment.id.toString().padStart(5, '0')}`}
                  </TableCell>
                  <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={payment.paymentMode}
                      color={paymentModeColor[payment.paymentMode] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{payment.transactionReference ?? payment.transactionId ?? '-'}</TableCell>
                  <TableCell>{payment.remarks || '-'}</TableCell>
                  <TableCell>{payment.collectedBy || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ReceiptsPage;
