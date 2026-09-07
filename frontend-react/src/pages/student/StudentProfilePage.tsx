import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Divider, Chip, CircularProgress,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import studentService from '../../services/studentService';
import { Student } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import { formatDate } from '../../utils/formatters';

const StudentProfilePage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [profile, setProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

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
        subtitle="Your personal information"
        breadcrumbs={[{ label: 'Student' }, { label: 'Profile' }]}
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
                  <ProfileField label="First Name" value={profile?.firstName} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ProfileField label="Last Name" value={profile?.lastName} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ProfileField label="Email" value={profile?.email || user?.email} />
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
                  <ProfileField label="Address" value={profile?.address} />
                </Grid>
              </Grid>

              <Typography variant="h6" mt={3} gutterBottom>Guardian Information</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <ProfileField label="Father Name" value={profile?.fatherName} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ProfileField label="Father Phone" value={profile?.fatherPhone} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ProfileField label="Mother Name" value={profile?.motherName} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ProfileField label="Mother Phone" value={profile?.motherPhone} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ProfileField label="Guardian Name" value={profile?.guardianName} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ProfileField label="Guardian Phone" value={profile?.guardianPhone} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentProfilePage;
