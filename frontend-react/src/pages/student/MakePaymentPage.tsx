import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PageHeader from '../../components/common/PageHeader';

const MakePaymentPage: React.FC = () => (
  <Box>
    <PageHeader
      title="Make Payment"
      subtitle="Fee and payment information"
      breadcrumbs={[{ label: 'Student' }, { label: 'Make Payment' }]}
    />
    <Paper variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
      <InfoOutlinedIcon color="action" sx={{ fontSize: 40, mb: 1 }} />
      <Typography variant="h6" gutterBottom>Payments are handled at the front office</Typography>
      <Typography color="text.secondary">
        Payments are recorded by academy staff. Please visit or contact the office to pay your fees
        and collect a receipt.
      </Typography>
    </Paper>
  </Box>
);

export default MakePaymentPage;
