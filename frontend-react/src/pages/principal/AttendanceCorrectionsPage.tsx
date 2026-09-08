import React, { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Alert, Snackbar, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchCorrections, approveCorrection, rejectCorrection } from '../../store/slices/correctionSlice';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import { AttendanceCorrection, CorrectionStatus } from '../../types';

const correctionStatusColors: Record<CorrectionStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'error',
};

const AttendanceCorrectionsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { corrections, loading } = useSelector((state: RootState) => state.corrections);
  const [note, setNote] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; action: 'approve' | 'reject'; target: AttendanceCorrection | null }>({ open: false, action: 'approve', target: null });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    dispatch(fetchCorrections({ status: 'PENDING' }));
  }, [dispatch]);

  const openDialog = (action: 'approve' | 'reject', target: AttendanceCorrection) => {
    setNote('');
    setDialog({ open: true, action, target });
  };

  const closeDialog = () => setDialog({ open: false, action: 'approve', target: null });

  const handleConfirm = async () => {
    if (!dialog.target || !user?.id) return;
    const args = { id: dialog.target.id, reviewedByPrincipalId: user.id, reviewNote: note };
    try {
      if (dialog.action === 'approve') await dispatch(approveCorrection(args)).unwrap();
      else await dispatch(rejectCorrection(args)).unwrap();
      setSnackbar({ open: true, message: `Correction ${dialog.action}d`, severity: 'success' });
      dispatch(fetchCorrections({ status: 'PENDING' }));
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Action failed', severity: 'error' });
    } finally {
      closeDialog();
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    { id: 'attendanceDate', label: 'Date', minWidth: 110 },
    { id: 'studentId', label: 'Student', minWidth: 160 },
    { id: 'requestedStatus', label: 'Requested', minWidth: 110 },
    { id: 'reason', label: 'Reason', minWidth: 200 },
    {
      id: 'status', label: 'Status', minWidth: 110,
      format: (v) => <Chip label={String(v)} color={correctionStatusColors[v as CorrectionStatus] ?? 'default'} size="small" />,
    },
    {
      id: 'actions', label: 'Actions', minWidth: 200, sortable: false,
      format: (_v, row) => {
        const c = row as unknown as AttendanceCorrection;
        if (c.status !== 'PENDING') return '-';
        return (
          <Box display="flex" gap={1}>
            <Button size="small" variant="outlined" color="success" startIcon={<CheckIcon />} onClick={() => openDialog('approve', c)}>Approve</Button>
            <Button size="small" variant="outlined" color="error" startIcon={<CloseIcon />} onClick={() => openDialog('reject', c)}>Reject</Button>
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Attendance Corrections"
        subtitle="Review and act on teacher correction requests"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Attendance Corrections' }]}
      />

      <DataTable
        columns={columns}
        rows={corrections as unknown as Record<string, unknown>[]}
        searchable
        searchPlaceholder="Search corrections..."
        emptyMessage={loading ? 'Loading...' : 'No pending corrections.'}
      />

      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.action === 'approve' ? 'Approve Correction' : 'Reject Correction'}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {dialog.action === 'approve'
              ? 'Approving will update the target attendance record to the requested status.'
              : 'Rejecting will leave the attendance record unchanged.'}
          </DialogContentText>
          <TextField label="Review Note (optional)" size="small" fullWidth multiline minRows={2}
            value={note} onChange={e => setNote(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={closeDialog} variant="outlined" color="inherit">Cancel</Button>
          <Button onClick={handleConfirm} variant="contained" color={dialog.action === 'approve' ? 'success' : 'error'}>
            {dialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AttendanceCorrectionsPage;
