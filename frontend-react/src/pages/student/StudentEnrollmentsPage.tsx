import React, { useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Grid,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchStudentEnrollments } from '../../store/slices/enrollmentSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/formatters';
import { Enrollment } from '../../types';

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success', COMPLETED: 'default', DROPPED: 'error', SUSPENDED: 'warning',
};

const StudentEnrollmentsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { studentEnrollments, loading } = useSelector((state: RootState) => state.enrollments);

  useEffect(() => {
    if (user?.id) dispatch(fetchStudentEnrollments(user.id));
  }, [dispatch, user]);

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <PageHeader
        title="My Enrollments"
        subtitle={`${studentEnrollments.length} course enrollment(s)`}
        breadcrumbs={[{ label: 'Student' }, { label: 'Enrollments' }]}
      />

      {studentEnrollments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">You are not enrolled in any courses yet.</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {studentEnrollments.map(enrollment => (
            <Grid item xs={12} sm={6} md={4} key={enrollment.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" fontWeight={600}>{enrollment.courseName}</Typography>
                    <Chip
                      label={enrollment.status}
                      color={statusColorMap[enrollment.status] || 'default'}
                      size="small"
                    />
                  </Box>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      label={`Enrolled: ${formatDate(enrollment.enrollmentDate)}`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default StudentEnrollmentsPage;
