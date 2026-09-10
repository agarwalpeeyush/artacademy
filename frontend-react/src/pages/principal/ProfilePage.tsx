import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Divider, Chip, Stack,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Snackbar, Alert,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import authService from '../../services/authService';
import PageHeader from '../../components/common/PageHeader';

const ProfilePage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>(
    { open: false, message: '', severity: 'success' },
  );

  const displayName = user?.username || 'Principal';
  const roles = (user?.roles ?? []).map(r => r.replace(/^ROLE_/, ''));

  const closeDialog = () => {
    setPwOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setSnackbar({ open: true, message: 'New password and confirmation do not match', severity: 'error' });
      return;
    }
    try {
      setSaving(true);
      await authService.changePassword(currentPassword, newPassword);
      closeDialog();
      setSnackbar({ open: true, message: 'Password changed successfully', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Password change failed', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const ProfileField: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <Box mb={2}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body1">{value || '-'}</Typography>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="My Profile"
        subtitle="Your account information"
        breadcrumbs={[{ label: 'Principal' }, { label: 'Profile' }]}
        action={
          <Button variant="contained" startIcon={<LockResetIcon />} onClick={() => setPwOpen(true)}>
            Change Password
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Box
                sx={{
                  width: 100, height: 100, borderRadius: '50%', bgcolor: 'primary.main',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mx: 'auto', mb: 2,
                }}
              >
                <Typography variant="h3" color="white">
                  {displayName[0]?.toUpperCase() ?? 'P'}
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={700}>{displayName}</Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {user?.email}
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2, flexWrap: 'wrap' }}>
                {roles.map(r => <Chip key={r} label={r} color="primary" size="small" />)}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Account Information</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <ProfileField label="Username" value={user?.username} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ProfileField label="Email" value={user?.email} />
                </Grid>
                <Grid item xs={12}>
                  <ProfileField label="Roles" value={roles.join(', ')} />
                </Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary">
                Contact your administrator to change your username, email, or roles.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={pwOpen} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Current Password" type="password" fullWidth size="small"
              value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
            />
            <TextField
              label="New Password" type="password" fullWidth size="small"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
            />
            <TextField
              label="Confirm New Password" type="password" fullWidth size="small"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialog} variant="outlined" disabled={saving}>Cancel</Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={saving || !currentPassword || !newPassword}
          >
            {saving ? 'Saving…' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfilePage;
