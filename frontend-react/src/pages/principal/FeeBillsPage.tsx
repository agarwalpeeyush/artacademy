import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Autocomplete, TextField, Grid, Chip, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, IconButton, Button, Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchScopedStudents, fetchStudentBills, clearBills } from '../../store/slices/feeSlice';
import feeService from '../../services/feeService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDateDMY, parseDMYtoISO, feeTypeLabel } from '../../utils/formatters';
import { ScopedStudent, FeeBill } from '../../types';

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PAID: 'success', PARTIAL: 'warning', OVERDUE: 'error', UNPAID: 'default',
};

const statusOptions = ['UNPAID', 'PARTIAL', 'PAID'];

const FeeBillsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { students, bills, loading, error } = useSelector((state: RootState) => state.fees);

  const [selected, setSelected] = useState<ScopedStudent | null>(null);

  const [editBill, setEditBill] = useState<FeeBill | null>(null);
  const [editForm, setEditForm] = useState({ amountDue: '', dueDate: '', status: '', instituteShare: '', teacherShare: '' });
  const [editErr, setEditErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchScopedStudents(undefined));
  }, [dispatch]);

  useEffect(() => {
    if (selected) {
      dispatch(fetchStudentBills(selected.studentId));
    } else {
      dispatch(clearBills());
    }
  }, [dispatch, selected]);

  const refresh = () => {
    if (selected) dispatch(fetchStudentBills(selected.studentId));
  };

  const totals = useMemo(() => ({
    due: bills.reduce((s, b) => s + (b.amountDue ?? 0), 0),
    paid: bills.reduce((s, b) => s + (b.paidAmount ?? 0), 0),
    outstanding: bills.reduce((s, b) => s + (b.outstandingAmount ?? 0), 0),
  }), [bills]);

  const openEdit = (b: FeeBill) => {
    setEditBill(b);
    setEditForm({
      amountDue: String(b.amountDue ?? ''),
      dueDate: b.dueDate ? formatDateDMY(b.dueDate) : '',
      status: b.status ?? 'UNPAID',
      instituteShare: b.instituteShareAmount != null ? String(b.instituteShareAmount) : '',
      teacherShare: b.teacherShareAmount != null ? String(b.teacherShareAmount) : '',
    });
    setEditErr(null);
  };

  const saveEdit = async () => {
    if (!editBill) return;
    const amountDue = Number(editForm.amountDue);
    if (!(amountDue >= 0)) { setEditErr('Enter a valid amount due'); return; }
    let dueDate: string | null = null;
    if (editForm.dueDate) {
      const iso = parseDMYtoISO(editForm.dueDate);
      if (!iso) { setEditErr('Due date must be dd/MM/yyyy'); return; }
      dueDate = `${iso}T23:59:59`;
    }
    setSaving(true);
    try {
      await feeService.updateBill(editBill.id, {
        amountDue,
        dueDate,
        status: editForm.status || undefined,
        instituteShare: editForm.instituteShare ? Number(editForm.instituteShare) : null,
        teacherShare: editForm.teacherShare ? Number(editForm.teacherShare) : null,
        overriddenBy: user?.id ?? null,
      });
      setEditBill(null);
      refresh();
    } catch (e) {
      setEditErr(typeof e === 'string' ? e : 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Fee Bills"
        subtitle="Review and adjust generated bills, including revenue-share overrides"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Fee Bills' }]}
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
          <Typography color="text.secondary">Select a student to view generated bills.</Typography>
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
                  <TableCell align="right">Institute Share</TableCell>
                  <TableCell align="right">Teacher Share</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Edit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow><TableCell colSpan={10} align="center">No bills generated yet.</TableCell></TableRow>
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
                      <TableCell align="right">
                        {b.instituteShareAmount != null ? formatCurrency(b.instituteShareAmount) : '-'}
                        {b.overridden && <Chip label="override" size="small" color="info" sx={{ ml: 0.5 }} />}
                      </TableCell>
                      <TableCell align="right">{b.teacherShareAmount != null ? formatCurrency(b.teacherShareAmount) : '-'}</TableCell>
                      <TableCell align="center">
                        <Chip label={display} color={statusColorMap[display] || 'default'} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => openEdit(b)}><EditIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={!!editBill} onClose={() => setEditBill(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Bill — {editBill && feeTypeLabel(editBill.feeType)}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField label="Amount Due" type="number" fullWidth size="small"
                value={editForm.amountDue} onChange={e => setEditForm({ ...editForm, amountDue: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Due Date (dd/MM/yyyy)" fullWidth size="small"
                value={editForm.dueDate} onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField select label="Status" fullWidth size="small"
                value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                {statusOptions.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Revenue-share override (leave blank to keep the frozen split):
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Institute Share" type="number" fullWidth size="small"
                value={editForm.instituteShare} onChange={e => setEditForm({ ...editForm, instituteShare: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Teacher Share" type="number" fullWidth size="small"
                value={editForm.teacherShare} onChange={e => setEditForm({ ...editForm, teacherShare: e.target.value })} />
            </Grid>
            {editErr && <Grid item xs={12}><Typography color="error" variant="body2">{editErr}</Typography></Grid>}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditBill(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FeeBillsPage;
