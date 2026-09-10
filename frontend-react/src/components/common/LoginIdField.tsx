import React, { useState } from 'react';
import { Box, TextField, Button, InputAdornment, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import userService from '../../services/userService';

type AvailabilityState = 'unknown' | 'checking' | 'available' | 'taken';

interface LoginIdFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Used to build a suggestion, e.g. the first name. */
  firstName: string;
  disabled?: boolean;
}

/** Builds a suggestion: sanitized first name + a random 1-2 digit number, e.g. "aditya7". */
const buildSuggestion = (firstName: string): string => {
  const base = (firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const num = Math.floor(Math.random() * 99) + 1; // 1..99
  return `${base}${num}`;
};

const LoginIdField: React.FC<LoginIdFieldProps> = ({ value, onChange, firstName, disabled }) => {
  const [status, setStatus] = useState<AvailabilityState>('unknown');

  const handleSuggest = () => {
    onChange(buildSuggestion(firstName));
    setStatus('unknown');
  };

  const handleCheck = async () => {
    if (!value) return;
    setStatus('checking');
    try {
      const available = await userService.checkLoginId(value);
      setStatus(available ? 'available' : 'taken');
    } catch {
      setStatus('unknown');
    }
  };

  const adornment =
    status === 'available' ? (
      <InputAdornment position="end"><CheckCircleIcon color="success" fontSize="small" /></InputAdornment>
    ) : status === 'taken' ? (
      <InputAdornment position="end"><CancelIcon color="error" fontSize="small" /></InputAdornment>
    ) : undefined;

  const helperText =
    status === 'available' ? 'Login ID is available' :
    status === 'taken' ? 'Login ID is already taken' :
    'Shown to the user for login. Suggest one, then check availability.';

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          label="Login ID"
          value={value}
          onChange={(e) => { onChange(e.target.value); setStatus('unknown'); }}
          fullWidth
          size="small"
          disabled={disabled}
          error={status === 'taken'}
          helperText={helperText}
          InputProps={{ endAdornment: adornment }}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 0.25 }}>
          <Button size="small" variant="outlined" onClick={handleSuggest}
            disabled={disabled || !firstName}>
            Suggest
          </Button>
          <Button size="small" variant="outlined" onClick={handleCheck}
            disabled={disabled || !value || status === 'checking'}>
            {status === 'checking' ? 'Checking…' : 'Check'}
          </Button>
        </Box>
      </Box>
      {value && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Login ID for this account: <strong>{value}</strong>
        </Typography>
      )}
    </Box>
  );
};

export default LoginIdField;
