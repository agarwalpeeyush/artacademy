import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Divider, Chip, CircularProgress,
  Button, TextField, Snackbar, Alert, Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import studentService from '../../services/studentService';
import { Student } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import { formatDate } from '../../utils/formatters';

type EditableFields = Pick<
  Student,
  'firstName' | 'lastName' | 'email' | 'address'
  | 'fatherName' | 'fatherPhone' | 'motherName' | 'motherPhone'
>;

const StudentProfilePage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [profile, setProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditableFields | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>(
    { open: false, message: '', severity: 'success' },
  );

  useEffect(() => {
    studentService.getMyProfile()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : user?.username || 'Student';

  const startEdit = () => {
    if (!profile) return;
    setForm({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      email: profile.email ?? '',
      address: profile.address ?? '',
      fatherName: profile.fatherName ?? '',
      fatherPhone: profile.fatherPhone ?? '',
      motherName: profile.motherName ?? '',
      motherPhone: profile.motherPhone ?? '',
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
  };

  const setField = (key: keyof EditableFields, value: string) =>
    setForm(f => (f ? { ...f, [key]: value } : f));

  const handleSave = async () => {
    if (!form) return;
    try {
      setSaving(true);
      const updated = await studentService.updateMyProfile(form);
      setProfile(updated);
      setEditing(false);
      setForm(null);
      setSnackbar({ open: true, message: 'Profile updated successfully', severity: 'success' });
    } catch (err: unknown) {
      setSnackbar({ open: true, message: String(err) || 'Update failed', severity: 'error' });
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

  const EditField: React.FC<{ label: string; field: keyof EditableFields }> = ({ label, field }) => (
    <TextField
      label={label}
      value={form?.[field] ?? ''}
      onChange={e => setField(field, e.target.value)}
      fullWidth
      size="small"
    />
  );

  return (
    <Box>
      <PageHeader
        title="My Profile"
        subtitle="Your personal information"
        breadcrumbs={[{ label: 'Student' }, { label: 'Profile' }]}
        action={
          editing ? (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={cancelEdit} disabled={saving}>Cancel</Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </Stack>
          ) : (
            <Button variant="contained" startIcon={<EditIcon />} onClick={startEdit} disabled={!profile}>
              Edit Profile
            </Button>
          )
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
                  {(profile?.firstName?.[0] ?? user?.username?.[0] ?? 'S').toUpperCase()}
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={700}>{displayName}</Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {profile?.email || user?.email}
              </Typography>
              {profile?.loginId && (
                <Typography variant="caption" color="text.secondary" display="block">
                  ID: {profile.loginId}
                </Typography>
              )}
              <Chip
                label={profile?.status === 'ACTIVE' ? 'Active Student' : (profile?.status || 'Unknown')}
                color={profile?.status === 'ACTIVE' ? 'success' : 'default'}
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Personal Information</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  {editing
                    ? <EditField label="First Name" field="firstName" />
                    : <ProfileField label="First Name" value={profile?.firstName} />}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {editing
                    ? <EditField label="Last Name" field="lastName" />
                    : <ProfileField label="Last Name" value={profile?.lastName} />}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {editing
                    ? <EditField label="Email" field="email" />
                    : <ProfileField label="Email" value={profile?.email || user?.email} />}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ProfileField
                    label="Date of Birth"
                    value={profile?.dob ? formatDate(profile.dob) : undefined}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ProfileField
                    label="Enrollment Date"
                    value={profile?.enrollmentDate ? formatDate(profile.enrollmentDate) : undefined}
                  />
                </Grid>
                <Grid item xs={12}>
                  {editing
                    ? <EditField label="Address" field="address" />
                    : <ProfileField label="Address" value={profile?.address} />}
                </Grid>
              </Grid>

              <Typography variant="h6" mt={3} gutterBottom>Parent Information</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  {editing
                    ? <EditField label="Father Name" field="fatherName" />
                    : <ProfileField label="Father Name" value={profile?.fatherName} />}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {editing
                    ? <EditField label="Father Phone" field="fatherPhone" />
                    : <ProfileField label="Father Phone" value={profile?.fatherPhone} />}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {editing
                    ? <EditField label="Mother Name" field="motherName" />
                    : <ProfileField label="Mother Name" value={profile?.motherName} />}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {editing
                    ? <EditField label="Mother Phone" field="motherPhone" />
                    : <ProfileField label="Mother Phone" value={profile?.motherPhone} />}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

export default StudentProfilePage;
