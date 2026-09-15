import React, { useState } from 'react';
import {
  Box, Button, Card, CardContent, Grid, TextField, Typography, Alert, CircularProgress,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../../services/api';
import LoginIdField from '../../components/common/LoginIdField';

const schema = yup.object({
  loginId: yup.string().optional(),
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  employeeCode: yup.string().required('Employee code is required'),
  email: yup.string().email('Invalid email').optional(),
  phone: yup.string().optional(),
  joiningDate: yup.string().optional(),
});

interface CreatePrincipalForm {
  loginId?: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email?: string;
  phone?: string;
  joiningDate?: string;
}

const CreatePrincipalPage: React.FC = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<CreatePrincipalForm>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      loginId: '', firstName: '', lastName: '', employeeCode: '',
      email: '', phone: '',
      joiningDate: new Date().toISOString().split('T')[0],
    },
  });

  const watchedFirstName = watch('firstName');

  const onSubmit = async (data: CreatePrincipalForm) => {
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/principals', {
        ...data,
        status: 'ACTIVE',
      });
      setDone(true);
      reset();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to create Principal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', mt: 2 }}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <PersonAddIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>Create a Principal</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Provision a Principal account (a staff member with the PRINCIPAL role). They receive a
            temporary password and are prompted to change it on first login.
          </Typography>

          {done ? (
            <Alert severity="success">
              Principal created. You can create another or navigate away.
            </Alert>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <Grid container spacing={2}>
                  {[
                    { name: 'firstName' as const, label: 'First Name' },
                    { name: 'lastName' as const, label: 'Last Name' },
                    { name: 'employeeCode' as const, label: 'Employee Code' },
                    { name: 'email' as const, label: 'Email' },
                    { name: 'phone' as const, label: 'Phone' },
                  ].map(field => (
                    <Grid item xs={12} sm={6} key={field.name}>
                      <Controller
                        name={field.name}
                        control={control}
                        render={({ field: f }) => (
                          <TextField {...f} label={field.label} fullWidth size="small"
                            error={!!errors[field.name]}
                            helperText={errors[field.name]?.message}
                          />
                        )}
                      />
                    </Grid>
                  ))}
                  <Grid item xs={12} sm={6}>
                    <Controller name="joiningDate" control={control}
                      render={({ field }) => (
                        <TextField {...field} label="Joining Date" type="date" fullWidth size="small"
                          InputLabelProps={{ shrink: true }} />
                      )} />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller name="loginId" control={control}
                      render={({ field }) => (
                        <LoginIdField
                          value={field.value || ''}
                          onChange={field.onChange}
                          firstName={watchedFirstName || ''}
                        />
                      )} />
                  </Grid>
                </Grid>
                <Box mt={3}>
                  <Button type="submit" variant="contained" size="large" disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <PersonAddIcon />}>
                    {submitting ? 'Creating…' : 'Create Principal'}
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreatePrincipalPage;
