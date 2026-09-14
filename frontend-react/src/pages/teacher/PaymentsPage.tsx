import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Chip, TextField, MenuItem, Button, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherTimetables } from '../../store/slices/timetableSlice';
import { fetchFeeCycles } from '../../store/slices/feeSlice';
import { recordPayment, fetchPaymentsByFeeCycle } from '../../store/slices/paymentSlice';
import studentService from '../../services/studentService';
import paymentService from '../../services/paymentService';
import { Student, FeeCycle, Payment } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDateDMY, parseDMYtoISO, todayDMY, cycleKindLabel, cycleKindColor } from '../../utils/formatters';

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PAID: 'success', PARTIAL: 'warning', OVERDUE: 'error', UNPAID: 'default', PENDING: 'default',
};

const paymentModes = ['CASH', 'ONLINE', 'CHEQUE', 'UPI'];

interface PayForm {
  amount: string;
  paymentMode: string;
  transactionReference: string;
  paymentDate: string;
  remarks: string;
}

const emptyForm = (outstanding: number): PayForm => ({
  amount: outstanding > 0 ? String(outstanding) : '',
  paymentMode: 'CASH',
  transactionReference: '',
  paymentDate: todayDMY(),
  remarks: '',
});

const PaymentsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { teacherTimetables } = useSelector((state: RootState) => state.timetables);
  const { feeCycles } = useSelector((state: RootState) => state.fees);
  const { cyclePayments } = useSelector((state: RootState) => state.payments);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [payCycle, setPayCycle] = useState<FeeCycle | null>(null);
  const [payStudentId, setPayStudentId] = useState<string>('');
  const [form, setForm] = useState<PayForm>(emptyForm(0));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) dispatch(fetchTeacherTimetables(user.id));
  }, [dispatch, user]);

  useEffect(() => {
    if (selectedCourseId) {
      setLoading(true);
      studentService.getByCourse(selectedCourseId)
        .then(data => {
          setStudents(data);
          data.forEach(s => dispatch(fetchFeeCycles({ studentId: s.id })));
        })
        .catch(() => setStudents([]))
        .finally(() => setLoading(false));
    } else {
      setStudents([]);
    }
  }, [selectedCourseId, dispatch]);

  const uniqueCourses = useMemo(
    () => [...new Map(teacherTimetables.map(s => [s.courseId, s])).values()],
    [teacherTimetables],
  );

  const filteredStudents = useMemo(
    () => students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(nameFilter.toLowerCase())),
    [students, nameFilter],
  );

  const latestCycle = (studentId: string): FeeCycle | undefined =>
    feeCycles.filter(f => f.studentId === studentId)
      .sort((a, b) => ((b.year ?? 0) - (a.year ?? 0)) || ((b.month ?? 0) - (a.month ?? 0)))[0];

  const openPayDialog = (cycle: FeeCycle, studentId: string) => {
    const outstanding = cycle.dueAmount ?? cycle.outstandingAmount ?? 0;
    setPayCycle(cycle);
    setPayStudentId(studentId);
    setForm(emptyForm(outstanding));
    setFormError(null);
    dispatch(fetchPaymentsByFeeCycle(cycle.id));
  };

  const handleSubmit = async () => {
    if (!payCycle || !payStudentId) return;
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { setFormError('Enter a valid amount'); return; }
    const isoDate = parseDMYtoISO(form.paymentDate);
    if (!isoDate) { setFormError('Payment date must be dd/MM/yyyy'); return; }
    setSubmitting(true);
    try {
      await dispatch(recordPayment({
        feeCycleId: payCycle.id,
        studentId: payStudentId,
        amount,
        paymentDate: isoDate,
        paymentMode: form.paymentMode as Payment['paymentMode'],
        transactionReference: form.transactionReference || undefined,
        remarks: form.remarks || undefined,
      } as Omit<Payment, 'id'>)).unwrap();
      setPayCycle(null);
      dispatch(fetchFeeCycles({ studentId: payStudentId }));
    } catch (e) {
      setFormError(typeof e === 'string' ? e : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Payments"
        subtitle="View students in your courses and record fee payments"
        breadcrumbs={[{ label: 'Teacher' }, { label: 'Payments' }]}
      />

      <Box mb={3} display="flex" gap={2} flexWrap="wrap">
        <TextField select label="Select Course" size="small" sx={{ minWidth: 260 }}
          value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}>
          <MenuItem value="">-- Select a course --</MenuItem>
          {uniqueCourses.map(s => <MenuItem key={s.courseId} value={s.courseId}>{s.courseName}</MenuItem>)}
        </TextField>
        <TextField label="Search student by name" size="small" sx={{ minWidth: 260 }}
          value={nameFilter} onChange={e => setNameFilter(e.target.value)} />
      </Box>

      {loading ? (
        <LoadingSpinner />
      ) : selectedCourseId && filteredStudents.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
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
              {filteredStudents.map(student => {
                const cycle = latestCycle(student.id);
                const outstanding = cycle ? (cycle.dueAmount ?? cycle.outstandingAmount ?? 0) : 0;
                const excess = cycle?.excessAmount ?? 0;
                const short = cycle?.shortAmount ?? 0;
                const display = cycle ? (cycle.displayStatus ?? cycle.status) : 'No Data';
                return (
                  <TableRow key={student.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{student.firstName} {student.lastName}</TableCell>
                    <TableCell>
                      {cycle ? `${cycle.month ?? cycle.billingMonth}/${cycle.year ?? cycle.billingYear}` : '-'}
                      {cycle?.cycleKind && cycle.cycleKind !== 'MONTHLY' && (
                        <Chip label={cycleKindLabel(cycle.cycleKind)} color={cycleKindColor(cycle.cycleKind)} size="small" variant="outlined" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell align="right">{cycle ? formatCurrency(cycle.totalAmount) : '-'}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>{cycle ? formatCurrency(cycle.paidAmount) : '-'}</TableCell>
                    <TableCell align="right" sx={{ color: outstanding > 0 ? 'error.main' : 'inherit' }}>{cycle ? formatCurrency(outstanding) : '-'}</TableCell>
                    <TableCell align="right">
                      {excess > 0 ? (
                        <Typography variant="body2" color="success.main">+{formatCurrency(excess)}</Typography>
                      ) : short > 0 ? (
                        <Typography variant="body2" color="error.main">-{formatCurrency(short)}</Typography>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{cycle ? formatDateDMY(cycle.dueDate) : '-'}</TableCell>
                    <TableCell align="center">
                      <Chip label={display} color={statusColorMap[display] || 'default'} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        <Button size="small" variant="outlined" disabled={!cycle || display === 'PAID'}
                          onClick={() => cycle && openPayDialog(cycle, student.id)}>
                          Record Payment
                        </Button>
                        <Tooltip title="Online payment coming soon">
                          <span><Button size="small" variant="contained" disabled>Pay Now</Button></span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : selectedCourseId ? (
        <Typography color="text.secondary">No students found in this course.</Typography>
      ) : (
        <Typography color="text.secondary">Select a course to view students.</Typography>
      )}

      <Dialog open={!!payCycle} onClose={() => setPayCycle(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          {payCycle && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Outstanding: {formatCurrency(payCycle.dueAmount ?? payCycle.outstandingAmount ?? 0)}
                </Typography>
              </Grid>
              {cyclePayments.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Payment History</Typography>
                  {cyclePayments.map(p => (
                    <Box key={p.id} display="flex" alignItems="center" justifyContent="space-between" py={0.5}>
                      <Typography variant="body2">
                        {formatDateDMY(p.paymentDate)} — {formatCurrency(p.amount)} ({p.paymentMode})
                      </Typography>
                      <Button size="small" startIcon={<DownloadIcon />}
                        onClick={() => paymentService.downloadReceipt(p.id)}>Receipt</Button>
                    </Box>
                  ))}
                </Grid>
              )}
              <Grid item xs={6}>
                <TextField label="Amount" type="number" fullWidth size="small"
                  value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Payment Mode" fullWidth size="small"
                  value={form.paymentMode} onChange={e => setForm({ ...form, paymentMode: e.target.value })}>
                  {paymentModes.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Payment Date (dd/MM/yyyy)" fullWidth size="small"
                  value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Transaction Reference" fullWidth size="small"
                  value={form.transactionReference} onChange={e => setForm({ ...form, transactionReference: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Remarks" fullWidth size="small" multiline rows={2}
                  value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </Grid>
              {formError && (
                <Grid item xs={12}><Typography color="error" variant="body2">{formError}</Typography></Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayCycle(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>Record Payment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentsPage;
