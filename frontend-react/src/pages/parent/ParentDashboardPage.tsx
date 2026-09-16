import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMyChildren, fetchMyProfile } from '../../store/slices/parentSlice';
import attendanceService from '../../services/attendanceService';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ParentDashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { children, profile, loading } = useSelector((state: RootState) => state.parents);
  const [avgAttendance, setAvgAttendance] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchMyChildren());
    dispatch(fetchMyProfile());
  }, [dispatch]);

  useEffect(() => {
    if (children.length === 0) return;
    Promise.all(
      children.map(c =>
        attendanceService.getStudentStats(c.id)
          .then((s: { attendancePercentage?: number }) => s?.attendancePercentage ?? null)
          .catch(() => null)
      )
    ).then(pcts => {
      const valid = pcts.filter((p): p is number => p != null);
      setAvgAttendance(valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null);
    });
  }, [children]);

  return (
    <Box>
      <PageHeader
        title={`Hello, ${user?.username || 'Parent'}!`}
        subtitle="Overview of your children"
        breadcrumbs={[{ label: 'Parent' }, { label: 'Dashboard' }]}
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Children</Typography>
                  <Typography variant="h4" fontWeight={700} color="primary.main" mt={1}>{children.length}</Typography>
                  <Typography variant="caption" color="text.secondary">linked to your account</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Avg Attendance</Typography>
                  <Typography variant="h4" fontWeight={700}
                    color={avgAttendance == null ? 'text.secondary' : avgAttendance >= 75 ? 'success.main' : 'warning.main'} mt={1}>
                    {avgAttendance == null ? 'N/A' : `${avgAttendance.toFixed(1)}%`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">across all children</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>My Children</Typography>
              {children.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No children linked to your account.</Typography>
              ) : (
                children.map(c => (
                  <Box key={c.id} display="flex" alignItems="center" justifyContent="space-between" py={1.5}
                    borderBottom="1px solid" borderColor="divider">
                    <Box>
                      <Typography variant="body1" fontWeight={500}>{c.name || '(unnamed student)'}</Typography>
                      <Typography variant="caption" color="text.secondary">{profile?.relationship || 'Parent'}</Typography>
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default ParentDashboardPage;
