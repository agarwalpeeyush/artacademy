import React, { useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Divider,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMyChildren, fetchMyProfile } from '../../store/slices/parentSlice';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const MyChildrenPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { children, profile, loading } = useSelector((state: RootState) => state.parents);

  useEffect(() => {
    dispatch(fetchMyChildren());
    dispatch(fetchMyProfile());
  }, [dispatch]);

  return (
    <Box>
      <PageHeader
        title="My Children"
        subtitle="Students linked to your account"
        breadcrumbs={[{ label: 'Parent' }, { label: 'My Children' }]}
      />

      {loading ? (
        <LoadingSpinner />
      ) : children.length === 0 ? (
        <Card><CardContent><Typography color="text.secondary">No children linked to your account.</Typography></CardContent></Card>
      ) : (
        <Grid container spacing={3}>
          {children.map(c => (
            <Grid item xs={12} sm={6} md={4} key={c.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" mb={1}>{c.name || '(unnamed student)'}</Typography>
                  <Divider sx={{ mb: 1.5 }} />
                  <Typography variant="body2" color="text.secondary">Relationship</Typography>
                  <Typography variant="body1" mb={1}>{profile?.relationship || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Contact Phone</Typography>
                  <Typography variant="body1" mb={1}>{profile?.phone || '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Contact Email</Typography>
                  <Typography variant="body1">{profile?.email || '-'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MyChildrenPage;
