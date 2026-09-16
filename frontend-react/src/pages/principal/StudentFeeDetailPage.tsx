import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Autocomplete, TextField, Button, Grid, Chip, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, IconButton, Tooltip, Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PaymentIcon from '@mui/icons-material/Payment';
import DownloadIcon from '@mui/icons-material/Download';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import {
  fetchScopedStudents, fetchFeeDetails, fetchStudentBills, generateBills, clearDetails, clearBills,
} from '../../store/slices/feeSlice';
import { fetchStudentPayments, recordPayment } from '../../store/slices/paymentSlice';
import feeService from '../../services/feeService';
import paymentService from '../../services/paymentService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  formatCurrency, formatDateDMY, parseDMYtoISO, todayDMY, feeTypeLabel,
} from '../../utils/formatters';
import { ScopedStudent, FeeDetailLine } from '../../types';

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PAID: 'success', PARTIAL: 'warning', OVERDUE: 'error', UNPAID: 'default',
};

const paymentModes = ['CASH', 'ONLINE', 'CHEQUE', 'UPI'];

const StudentFeeDetailPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { students, details, bills, loading, error } = useSelector((state: RootState) => state.fees);
  const { studentPayments } = useSelector((state: RootState) => state.payments);

  const [selected, setSelected] = useState<ScopedStudent | null>(null);

  // Edit fee line dialog
  const [editLine, setEditLine] = useState<FeeDetailLine | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', dueDate: '', instituteShareType: '', instituteShareValue: '' });
  const [editErr, setEditErr] = useState<string | null>(null);
  const [savingLine, setSavingLine] = useState(false);

  // Generate-bill missing-month prompt
  const [missingPrompt, setMissingPrompt] = useState<string[] | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [genNotice, setGenNotice] = useState<string | null>(null);

  // Record-payment dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', paymentMode: 'CASH', transactionReference: '', paymentDate: todayDMY(), remarks: '' });
  const [payErr, setPayErr] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    dispatch(fetchScopedStudents(undefined));
  }, [dispatch]);

  useEffect(() => {
    if (selected) {
      dispatch(fetchFeeDetails(selected.enrollmentId));
      dispatch(fetchStudentBills(selected.studentId));
      dispatch(fetchStudentPayments(selected.studentId));
    } else {
      dispatch(clearDetails());
      dispatch(clearBills());
    }
  }, [dispatch, selected]);

  const refresh = () => {
    if (!selected) return;
    dispatch(fetchFeeDetails(selected.enrollmentId));
    dispatch(fetchStudentBills(selected.studentId));
    dispatch(fetchStudentPayments(selected.studentId));
  };

  const totalOutstanding = useMemo(
    () => bills.reduce((s, b) => s + (b.outstandingAmount ?? 0), 0),
    [bills],
  );

  const openEdit = (line: FeeDetailLine) => {
    setEditLine(line);
    setEditForm({
      amount: String(line.amount ?? ''),
      dueDate: line.dueDate ? formatDateDMY(line.dueDate) : '',
      instituteShareType: line.instituteShareType ?? '',
      instituteShareValue: line.instituteShareValue != null ? String(line.instituteShareValue) : '',
    });
    setEditErr(null);
  };

  const saveEdit = async () => {
    if (!editLine) return;
    const amount = Number(editForm.amount);
    if (!(amount >= 0)) { setEditErr('Enter a valid amount'); return; }
    let dueDate: string | null = null;
    if (editForm.dueDate) {
      dueDate = parseDMYtoISO(editForm.dueDate);
      if (!dueDate) { setEditErr('Due date must be dd/MM/yyyy'); return; }
    }
    setSavingLine(true);
    try {
      await feeService.updateDetail(editLine.id, {
        amount,
        dueDate,
        instituteShareType: editForm.instituteShareType || null,
        instituteShareValue: editForm.instituteShareValue ? Number(editForm.instituteShareValue) : null,
      });
      setEditLine(null);
      refresh();
    } catch (e) {
      setEditErr(typeof e === 'string' ? e : 'Failed to save fee line');
    } finally {
      setSavingLine(false);
    }
  };

  const runGenerate = async (generateMissing: boolean) => {
    if (!selected) return;
    setGenBusy(true);
    setGenNotice(null);
    try {
      const res = await dispatch(generateBills({ enrollmentId: selected.enrollmentId, generateMissing })).unwrap();
      const parts: string[] = [];
      if (res.generated.length) parts.push(`${res.generated.length} bill(s) generated`);
      if (res.alreadyBilled.length) parts.push(`already billed: ${res.alreadyBilled.join(', ')}`);
      setGenNotice(parts.length ? parts.join(' · ') : 'Nothing new to generate');
      if (!generateMissing && res.missingMonths.length > 0) {
        setMissingPrompt(res.missingMonths);
      } else {
        setMissingPrompt(null);
      }
      refresh();
    } catch (e) {
      setGenNotice(typeof e === 'string' ? e : 'Failed to generate bills');
    } finally {
      setGenBusy(false);
    }
  };

  const submitPayment = async () => {
    if (!selected) return;
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) { setPayErr('Enter a valid amount'); return; }
    const isoDate = parseDMYtoISO(payForm.paymentDate);
    if (!isoDate) { setPayErr('Payment date must be dd/MM/yyyy'); return; }
    setPaying(true);
    setPayErr(null);
    try {
      await dispatch(recordPayment({
        studentId: selected.studentId,
        amount,
        paymentMode: payForm.paymentMode,
        transactionReference: payForm.transactionReference || undefined,
        remarks: payForm.remarks || undefined,
        paymentDate: isoDate,
      })).unwrap();
      setPayOpen(false);
      setPayForm({ amount: '', paymentMode: 'CASH', transactionReference: '', paymentDate: todayDMY(), remarks: '' });
      refresh();
    } catch (e) {
      setPayErr(typeof e === 'string' ? e : 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Student Fee Detail"
        subtitle="Fee catalogue, bill generation, and payment for a student"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Student Fee Detail' }]}
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
      {genNotice && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setGenNotice(null)}>{genNotice}</Alert>}

      {!selected ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Select a student to view fee lines and bills.</Typography>
        </Paper>
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <Box display="flex" gap={2} mb={2} flexWrap="wrap">
            <Button variant="contained" onClick={() => runGenerate(false)} disabled={genBusy}>
              Generate Bill
            </Button>
            <Tooltip title={bills.length === 0 ? 'Generate at least one bill before recording a payment' : ''}>
              <span>
                <Button
                  variant="outlined"
                  startIcon={<PaymentIcon />}
                  disabled={bills.length === 0}
                  onClick={() => { setPayForm(f => ({ ...f, amount: String(totalOutstanding || '') })); setPayOpen(true); }}
                >
                  Record Payment
                </Button>
              </span>
            </Tooltip>
          </Box>

          <Typography variant="h6" gutterBottom>Fee Lines</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fee Type</TableCell>
                  <TableCell>Cadence</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Institute Share</TableCell>
                  <TableCell align="center">Edit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {details.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center">No fee lines.</TableCell></TableRow>
                ) : details.map(d => (
                  <TableRow key={d.id} hover>
                    <TableCell>{feeTypeLabel(d.feeType)}</TableCell>
                    <TableCell>{d.cadence ?? '-'}</TableCell>
                    <TableCell align="right">{formatCurrency(d.amount)}</TableCell>
                    <TableCell>{formatDateDMY(d.dueDate)}</TableCell>
                    <TableCell>
                      {d.instituteShareType
                        ? (d.instituteShareType === 'PERCENTAGE' ? `${d.instituteShareValue}%` : formatCurrency(d.instituteShareValue ?? 0))
                        : 'No cut'}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => openEdit(d)}><EditIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>Bills</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fee Type</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell align="right">Amount Due</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Outstanding</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Paid Date</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center">No bills generated yet.</TableCell></TableRow>
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
                      <TableCell>{formatDateDMY(b.paymentDate)}</TableCell>
                      <TableCell align="center">
                        <Chip label={display} color={statusColorMap[display] || 'default'} size="small" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {studentPayments.length > 0 && (
            <>
              <Typography variant="h6" gutterBottom>Payments</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Mode</TableCell>
                      <TableCell>Reference</TableCell>
                      <TableCell align="center">Receipt</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {studentPayments.map(p => (
                      <TableRow key={p.id} hover>
                        <TableCell>{formatDateDMY(p.paymentDate)}</TableCell>
                        <TableCell align="right">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{p.paymentMode}</TableCell>
                        <TableCell>{p.transactionReference || '-'}</TableCell>
                        <TableCell align="center">
                          <Button size="small" startIcon={<DownloadIcon />} onClick={() => paymentService.downloadReceipt(p.id)}>Receipt</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </>
      )}

      {/* Missing-month prompt */}
      <Dialog open={!!missingPrompt} onClose={() => setMissingPrompt(null)}>
        <DialogTitle>Back-fill missing months?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            These earlier months are not yet billed: {missingPrompt?.join(', ')}. Generate bills for them too?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMissingPrompt(null)}>No</Button>
          <Button variant="contained" disabled={genBusy} onClick={() => { setMissingPrompt(null); runGenerate(true); }}>Yes, back-fill</Button>
        </DialogActions>
      </Dialog>

      {/* Edit fee line */}
      <Dialog open={!!editLine} onClose={() => setEditLine(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Fee Line — {editLine && feeTypeLabel(editLine.feeType)}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField label="Amount" type="number" fullWidth size="small"
                value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Due Date (dd/MM/yyyy)" fullWidth size="small"
                value={editForm.dueDate} onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField select label="Institute Share Type" fullWidth size="small"
                value={editForm.instituteShareType} onChange={e => setEditForm({ ...editForm, instituteShareType: e.target.value })}>
                <MenuItem value="">No cut</MenuItem>
                <MenuItem value="AMOUNT">Amount</MenuItem>
                <MenuItem value="PERCENTAGE">Percentage</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Institute Share Value" type="number" fullWidth size="small"
                disabled={!editForm.instituteShareType}
                value={editForm.instituteShareValue} onChange={e => setEditForm({ ...editForm, instituteShareValue: e.target.value })} />
            </Grid>
            {editErr && <Grid item xs={12}><Typography color="error" variant="body2">{editErr}</Typography></Grid>}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditLine(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={savingLine}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Record payment */}
      <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">Total outstanding: {formatCurrency(totalOutstanding)}</Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Amount" type="number" fullWidth size="small"
                value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField select label="Payment Mode" fullWidth size="small"
                value={payForm.paymentMode} onChange={e => setPayForm({ ...payForm, paymentMode: e.target.value })}>
                {paymentModes.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Payment Date (dd/MM/yyyy)" fullWidth size="small"
                value={payForm.paymentDate} onChange={e => setPayForm({ ...payForm, paymentDate: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Transaction Reference" fullWidth size="small"
                value={payForm.transactionReference} onChange={e => setPayForm({ ...payForm, transactionReference: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Remarks" fullWidth size="small" multiline rows={2}
                value={payForm.remarks} onChange={e => setPayForm({ ...payForm, remarks: e.target.value })} />
            </Grid>
            {payErr && <Grid item xs={12}><Typography color="error" variant="body2">{payErr}</Typography></Grid>}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitPayment} disabled={paying}>Record Payment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentFeeDetailPage;
