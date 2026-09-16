import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PageHeader from '../../components/common/PageHeader';

const ParentFeesPage: React.FC = () => (
  <Box>
    <PageHeader
      title="Fees"
      subtitle="Fee and payment information"
      breadcrumbs={[{ label: 'Parent' }, { label: 'Fees' }]}
    />
    <Paper variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
      <InfoOutlinedIcon color="action" sx={{ fontSize: 40, mb: 1 }} />
      <Typography variant="h6" gutterBottom>Fees are managed at the front office</Typography>
      <Typography color="text.secondary">
        Your child's fee bills and payments are recorded by academy staff. Please contact the
        office for the current balance, a payment receipt, or any fee-related query.
      </Typography>
    </Paper>
  </Box>
);

export default ParentFeesPage;
