import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Autocomplete, TextField, Grid, Chip, Typography, Paper, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchScopedStudents, fetchStudentBills, clearBills } from '../../store/slices/feeSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDateDMY, feeTypeLabel } from '../../utils/formatters';
import { ScopedStudent } from '../../types';

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PAID: 'success', PARTIAL: 'warning', OVERDUE: 'error', UNPAID: 'default',
};

const FeeStatusPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { students, bills, loading, error } = useSelector((state: RootState) => state.fees);

  const [selected, setSelected] = useState<ScopedStudent | null>(null);

  useEffect(() => {
    if (user?.id) dispatch(fetchScopedStudents(user.id));
  }, [dispatch, user]);

  useEffect(() => {
    if (selected) dispatch(fetchStudentBills(selected.studentId));
    else dispatch(clearBills());
  }, [dispatch, selected]);

  const totals = useMemo(() => ({
    due: bills.reduce((s, b) => s + (b.amountDue ?? 0), 0),
    paid: bills.reduce((s, b) => s + (b.paidAmount ?? 0), 0),
    outstanding: bills.reduce((s, b) => s + (b.outstandingAmount ?? 0), 0),
  }), [bills]);

  return (
    <Box>
      <PageHeader
        title="Fee Status"
        subtitle="Bill status for students in your courses"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'Fee Status' }]}
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={5}>
          <Autocomplete
            options={students}
            value={selected}
            onChange={(_, v) => setSelected(v)}
            getOptionLabel={(o) => `${o.studentName ?? o.studentId}${o.courseName ? ` — ${o.courseName}` : ''}`}
            isOptionEqualToValue={(a, b) => a.enrollmentId === b.enrollmentId}
            renderInput={(params) => <TextField {...params} label="Search student" size="small" />}
          />
        </Grid>
      </Grid>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {!selected ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Select a student to view their bills.</Typography>
        </Paper>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <Box display="flex" gap={3} mb={2} flexWrap="wrap">
            <Typography variant="body2">Total due: <b>{formatCurrency(totals.due)}</b></Typography>
            <Typography variant="body2" sx={{ color: 'success.main' }}>Paid: <b>{formatCurrency(totals.paid)}</b></Typography>
            <Typography variant="body2" sx={{ color: totals.outstanding > 0 ? 'error.main' : 'inherit' }}>
              Outstanding: <b>{formatCurrency(totals.outstanding)}</b>
            </Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fee Type</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell align="right">Amount Due</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Outstanding</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">No bills generated yet.</TableCell></TableRow>
                ) : bills.map(b => {
                  const display = b.displayStatus ?? b.status;
                  return (
                    <TableRow key={b.id} hover>
                      <TableCell>{feeTypeLabel(b.feeType)}</TableCell>
                      <TableCell>{b.billingMonth ? `${b.billingMonth}/${b.billingYear}` : '-'}</TableCell>
                      <TableCell align="right">{formatCurrency(b.amountDue)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>{formatCurrency(b.paidAmount)}</TableCell>
                      <TableCell align="right" sx={{ color: b.outstandingAmount > 0 ? 'error.main' : 'inherit' }}>{formatCurrency(b.outstandingAmount)}</TableCell>
                      <TableCell>{formatDateDMY(b.dueDate)}</TableCell>
                      <TableCell align="center">
                        <Chip label={display} color={statusColorMap[display] || 'default'} size="small" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default FeeStatusPage;
